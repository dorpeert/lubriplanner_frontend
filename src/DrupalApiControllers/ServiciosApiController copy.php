<?php

namespace Drupal\lubriplanner_servicios_api_v2\Controller;

use Drupal\Core\Controller\ControllerBase;
use Drupal\node\Entity\Node;
use Drupal\user\Entity\User;

use Drupal\file\Entity\File;
use Drupal\Core\File\FileSystemInterface;
use Symfony\Component\HttpFoundation\File\UploadedFile;

use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
use Symfony\Component\HttpFoundation\ResponseHeaderBag;

use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Symfony\Component\HttpKernel\Exception\BadRequestHttpException;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;

class ServiciosApiController extends ControllerBase
{
    private const BUNDLE = 'servicios';
    private const COMPONENT_BUNDLE = 'componentes';

    // ==========================
    // Colección: GET lista / POST crear
    // ==========================
    public function collection(Request $request)
    {
        $method = $this->getRealMethod($request);
        switch ($method) {
            case 'GET':
                return $this->getAll();
            case 'POST':
                return $this->createServicio($request);
            default:
                return new JsonResponse(['error' => 'Método no permitido'], 405);
        }
    }

    // ==========================
    // Ítem: GET uno / PATCH / DELETE
    // ==========================
    public function item($nid, Request $request)
    {
        $method = $this->getRealMethod($request);

        $node = Node::load($nid);
        if (!$node || $node->bundle() !== self::BUNDLE) {
            throw new NotFoundHttpException("Servicio $nid no encontrado.");
        }

        switch ($method) {
            case 'GET':
                return new JsonResponse($this->formatServicio($node));
            case 'PATCH':
                return $this->updateServicio($node, $request);
            case 'DELETE':
                return $this->deleteServicio($node);
            default:
                return new JsonResponse(['error' => 'Método no permitido'], 405);
        }
    }

    // ==========================
    // GET servicios por componente
    // ==========================
    public function getByComponente($componente)
    {
        if (!is_numeric($componente)) {
            return new JsonResponse(['error' => 'ID de componente inválido'], 400);
        }

        try {
            $nids = \Drupal::entityQuery('node')
                ->accessCheck(TRUE)
                ->condition('type', self::BUNDLE)
                ->condition('status', 1)
                ->condition('field_componente.target_id', (int) $componente)
                ->sort('created', 'DESC')
                ->execute();

            $nodes = Node::loadMultiple($nids);
            $data = array_map([$this, 'formatServicio'], $nodes);

            return new JsonResponse(array_values($data));
        } catch (\Throwable $e) {
            \Drupal::logger('lubriplanner_servicios_api_v2')->error('getByComponente(@id) error: @m', [
                '@id' => $componente,
                '@m' => $e->getMessage(),
            ]);
            return new JsonResponse(['error' => 'Error interno cargando servicios por componente'], 500);
        }
    }

    // ==========================
    // Acción: Recalcular (en_espera)
    // POST /api/servicios/{nid}/recalcular
    // Body: { trabajo_real: number }
    // ==========================
    public function recalcular($nid, Request $request)
    {
        $this->requirePermission('administer lubriplanner servicios api');

        $serv = Node::load($nid);
        if (!$serv || $serv->bundle() !== self::BUNDLE) {
            throw new NotFoundHttpException("Servicio $nid no encontrado.");
        }

        $estado = (string) ($this->getFieldValue($serv, 'field_estado') ?? '');
        if ($estado !== 'en_espera') {
            return new JsonResponse([
                'error' => 'Solo se puede recalcular mientras el servicio esté en espera.',
                'code' => 'INVALID_STATE',
                'estado' => $estado,
            ], 400);
        }


        $data = $this->validateJson($request, ['trabajo_real']);
        $trabajo_real = (float) $data['trabajo_real'];

        // Tomar datos del componente para recalcular
        $comp_id = $this->getTargetId($serv, 'field_componente');
        $comp = $comp_id ? Node::load($comp_id) : null;
        //---------------------

        // ✅ Fecha base: fecha_ultimo_servicio (si existe), si no hoy
        $fecha_ultimo = (string) ($this->getFieldValue($serv, 'field_fecha_ultimo_servicio') ?? '');
        $fecha_ultimo = trim($fecha_ultimo) ?: date('Y-m-d');

        $base_ts = strtotime($fecha_ultimo);
        if (!$base_ts) {
            $fecha_ultimo = date('Y-m-d');
            $base_ts = strtotime($fecha_ultimo);
        }


        //---------------------
        // ✅ tipo de servicio: leer del campo real
        $tipo_raw = '';
        if ($serv->hasField('field_tipo_de_servicio') && !$serv->get('field_tipo_de_servicio')->isEmpty()) {
            $tipo_raw = (string) $serv->get('field_tipo_de_servicio')->value;
        }

        $tipo = strtolower(trim($tipo_raw));
        $tipo = str_replace(['ó', ' '], ['o', ''], $tipo); // "lubricación" -> "lubricacion"

        if (!in_array($tipo, ['lubricacion', 'muestreo'], true)) {
            // fallback seguro: si algo raro llega, asumir lubricación
            $tipo = 'lubricacion';
        }

        // ✅ frecuencia según tipo
        $frecuencia_horas = 0.0;
        if ($comp) {
            if ($tipo === 'muestreo') {
                $frecuencia_horas = (float) ($comp->get('field_frecuencia_de_muestreo')->value ?? 0);
            } else {
                $frecuencia_horas = (float) ($comp->get('field_frecuencia_de_cambio')->value ?? 0);
            }
        }

        // Fórmula nueva:
        // proximo = fecha_ultimo + (frecuencia - trabajo_real)
        $delta_horas = max(0.0, $frecuencia_horas - $trabajo_real);
        $next_ts = $base_ts + (int) round($delta_horas * 3600);

        $this->setIfHasField($serv, 'field_trabajo_real', $trabajo_real);
        $this->setIfHasField($serv, 'field_fecha_proximo_servicio', date('Y-m-d', $next_ts));

        $serv->save();

        return new JsonResponse([
            'message' => 'Servicio recalculado',
            'id' => $serv->id(),
            'estado' => $estado,
            'fecha_proximo_servicio' => date('Y-m-d', $next_ts),
        ]);
    }

    // ==========================
    // Acción: Agendar (en espera -> agendado)
    // POST /api/servicios/{nid}/agendar
    // ==========================
    public function agendar($nid, Request $request)
    {
        $this->requirePermission('administer lubriplanner servicios api');

        $serv = Node::load($nid);
        if (!$serv || $serv->bundle() !== self::BUNDLE) {
            throw new NotFoundHttpException("Servicio $nid no encontrado.");
        }

        $estado = (string) ($this->getFieldValue($serv, 'field_estado') ?? '');

        // Solo agendar desde en_espera
        if ($estado !== 'en_espera') {
            return new JsonResponse([
                'error' => 'Solo se puede agendar cuando el servicio esté en espera.',
                'code' => 'INVALID_STATE',
                'estado' => $estado,
            ], 400);
        }

        $hoy = date('Y-m-d');
        $this->setIfHasField($serv, 'field_fecha_agendado', $hoy);
        $this->setIfHasField($serv, 'field_estado', 'agendado');
        $serv->save();

        return new JsonResponse([
            'message' => 'Servicio agendado',
            'id' => $serv->id(),
            'estado' => 'agendado',
            'fecha_agendado' => $hoy,
        ]);
    }


    // ==========================
    // Acción: Notificar (agendado -> notificado)
    // POST /api/servicios/{nid}/notificar
    // ==========================

    public function notificar($nid, Request $request)
    {
        $this->requirePermission('administer lubriplanner servicios api');

        $serv = Node::load($nid);
        if (!$serv || $serv->bundle() !== self::BUNDLE) {
            throw new NotFoundHttpException("Servicio $nid no encontrado.");
        }

        // ✅ Si ya está notificado/cerrado, no reenviar
        $estado = (string) ($this->getFieldValue($serv, 'field_estado') ?? '');
        if (in_array($estado, ['completado', 'finalizado'], true)) {
            return new JsonResponse([
                'message' => 'Servicio ya notificado o cerrado, no se envió nuevamente.',
                'id' => $serv->id(),
                'estado' => $estado,
                'notify_result' => [
                    'ok' => true,
                    'code' => 'SKIP_CLOSED',
                    'message' => 'El servicio ya estaba notificado o cerrado.',
                ],
            ], 200);
        }
        $notify_result = $this->sendProximoServicioEmail($serv);

        if (empty($notify_result['ok'])) {
            return new JsonResponse([
                'error' => 'No se pudo notificar.',
                'id' => $serv->id(),
                'notify_result' => $notify,
            ], 400);
        }

        // Si éxito: fecha_notificado + estado notificado
        $hoy = date('Y-m-d');
        $this->setIfHasField($serv, 'field_fecha_notificado', $hoy);
        $this->setIfHasField($serv, 'field_estado', 'notificado');
        $serv->save();

        return new JsonResponse([
            'message' => 'Servicio notificado (manual)',
            'id' => $serv->id(),
            'notify_result' => $notify_result,
        ]);
    }


    // ==========================
    // Acción: Completar (notificado -> completado)
    // POST /api/servicios/{nid}/completar
    // Body: { responsable, notificar_al_cliente, observaciones, firma_fid?, soporte_fid? }
    // ==========================
    public function completar($nid, Request $request)
    {
        $this->requirePermission('administer lubriplanner servicios api');

        $serv = Node::load($nid);
        if (!$serv || $serv->bundle() !== self::BUNDLE) {
            throw new NotFoundHttpException("Servicio $nid no encontrado.");
        }

        $data = $this->validateJson($request, ['responsable']);

        $hoy = date('Y-m-d');

        // Campos ingresados por usuario
        $this->setIfHasField($serv, 'field_responsable', (string) $data['responsable']);
        if (array_key_exists('observaciones', $data)) {
            $this->setIfHasField($serv, 'field_observaciones', (string) $data['observaciones']);
        }
        if (array_key_exists('notificar_al_cliente', $data)) {
            $this->setIfHasField($serv, 'field_notificar_al_cliente', (int) !!$data['notificar_al_cliente']);
        }

        // Automáticos
        $this->setIfHasField($serv, 'field_fecha_completado', $hoy);
        $this->setIfHasField($serv, 'field_atendido_por', (int) $this->currentUser()->id());
        $this->setIfHasField($serv, 'field_estado', 'completado');

        // Adjuntos por FID (opcionales)
        if (!empty($data['firma_fid'])) {
            $this->setIfHasField($serv, 'field_firma_del_responsable', (int) $data['firma_fid']);
        }
        if (!empty($data['soporte_fid'])) {
            $this->setIfHasField($serv, 'field_soporte', (int) $data['soporte_fid']);
        }

        $serv->save();


        // ✅ Notificación de "servicio completado" si el usuario lo solicitó
        $notify_result = null;
        $notificar = !empty($data['notificar_al_cliente']);
        if ($notificar) {
            $notify_result = $this->sendServicioCompletadoEmail($serv);
        }

        return new JsonResponse([
            'message' => 'Servicio completado',
            'id' => $serv->id(),
            'notify_result' => $notify_result,
        ]);
    }

    // ==========================
    // Acción: Subir informe (completado -> finalizado)
    // POST /api/servicios/{nid}/informe
    // Body: { informe_fid }
    // ==========================
    public function informe($nid, Request $request)
    {
        $this->requirePermission('administer lubriplanner servicios api');

        $serv = Node::load($nid);
        if (!$serv || $serv->bundle() !== self::BUNDLE) {
            throw new NotFoundHttpException("Servicio $nid no encontrado.");
        }

        $data = $this->validateJson($request, ['informe_fid']);
        $fid = (int) $data['informe_fid'];
        if ($fid <= 0) {
            throw new BadRequestHttpException('informe_fid inválido');
        }

        $this->setIfHasField($serv, 'field_informe_de_servicio', $fid);
        $this->setIfHasField($serv, 'field_estado', 'finalizado');
        $serv->save();

        // ✅ Notificación de "finalizado" depende SOLO del servicio.field_notificar_al_cliente
        $notify_result = null;
        $notificar = (bool) ($this->getFieldValue($serv, 'field_notificar_al_cliente') ?? false);

        if ($notificar) {
            $notify_result = $this->sendServicioFinalizadoEmail($serv);
        }

        return new JsonResponse([
            'message' => 'Informe asociado y servicio finalizado',
            'id' => $serv->id(),
            'notify_result' => $notify_result,
        ]);
    }


    // ==========================
    // Acción opcional: complete (ruta que ya tienes en YAML)
    // POST /api/servicios/{nid}/complete
    // Lo redirigimos a completar() para no duplicar lógica.
    // ==========================
    public function complete($nid, Request $request)
    {
        return $this->completar($nid, $request);
    }

    // ==========================
    // GET ALL
    // ==========================
    private function getAll()
    {
        try {
            $nids = \Drupal::entityQuery('node')
                ->accessCheck(TRUE)
                ->condition('type', self::BUNDLE)
                ->condition('status', 1)
                ->sort('created', 'DESC')
                ->execute();

            $nodes = Node::loadMultiple($nids);
            $data = array_map([$this, 'formatServicio'], $nodes);
            return new JsonResponse(array_values($data));
        } catch (\Throwable $e) {
            \Drupal::logger('lubriplanner_servicios_api_v2')->error('getAll() error: @m', ['@m' => $e->getMessage()]);
            return new JsonResponse(['error' => 'Error interno listando servicios'], 500);
        }
    }

    // ==========================
    // CREATE
    // ==========================
    private function createServicio(Request $request)
    {
        $this->requirePermission('administer lubriplanner servicios api');

        // Requeridos
        $data = $this->validateJson($request, ['componente', 'tipo_servicio']);

        $componente_id = (int) $data['componente'];
        $comp_node = Node::load($componente_id);
        if (!$comp_node || $comp_node->bundle() !== self::COMPONENT_BUNDLE) {
            throw new NotFoundHttpException("Componente $componente_id no encontrado.");
        }

        // Normalizar tipo_servicio (solo 2 opciones)
        $tipo = strtolower(trim((string) $data['tipo_servicio']));
        // Por si el select envía "Lubricación" / "Muestreo"
        $tipo = str_replace(['ó', ' '], ['o', ''], $tipo); // "lubricación" -> "lubricacion"
        if (!in_array($tipo, ['lubricacion', 'muestreo'], true)) {
            throw new BadRequestHttpException("tipo_servicio inválido. Use 'lubricacion' o 'muestreo'.");
        }

        // ✅ Regla: no permitir 2+ servicios del mismo tipo si hay uno "activo"
        // Activo = estado distinto de completado/finalizado
        $existentes_activos = \Drupal::entityQuery('node')
            ->accessCheck(TRUE)
            ->condition('type', self::BUNDLE)
            ->condition('status', 1)
            ->condition('field_componente.target_id', $componente_id)
            ->condition('field_tipo_de_servicio', $tipo)
            ->condition('field_estado', ['completado', 'finalizado'], 'NOT IN')
            ->range(0, 1)
            ->execute();

        if (!empty($existentes_activos)) {
            return new JsonResponse([
                'error' => 'Ya existe un servicio de este tipo en proceso para este componente.',
                'code' => 'DUPLICATE_ACTIVE_SERVICE',
                'componente' => $componente_id,
                'tipo_servicio' => $tipo,
            ], 409);
        }

        // Crear nodo
        $node = Node::create([
            'type' => self::BUNDLE,
            'status' => 1,
        ]);

        // ✅ N° servicio global único (title)
        $node->set('title', $this->nextConsecutiveGlobalServicio());

        // Referencia al componente
        $this->setIfHasField($node, 'field_componente', $componente_id);

        // Cliente desde componente (entity reference)
        $cliente_comp_id = $this->getFieldValue($comp_node, 'field_cliente_comp_id');
        if (!empty($cliente_comp_id)) {
            $this->setIfHasField($node, 'field_cliente_serv', (int) $cliente_comp_id);
        }

        // Activo / Equipo desde componente (texto)
        $this->setIfHasField($node, 'field_activo_serv', $this->getFieldValue($comp_node, 'field_comp_activo'));
        $this->setIfHasField($node, 'field_equipo_serv', $this->getFieldValue($comp_node, 'field_comp_equipo'));

        // Tipo servicio (TEXTO)  ✅ field correcto
        $this->setIfHasField($node, 'field_tipo_de_servicio', $tipo);

        // Estado inicial
        $this->setIfHasField($node, 'field_estado', 'en_espera');

        // fecha_ultimo_servicio: si existe un último servicio completado de este tipo, usar fecha_completado; si no, hoy
        $ultimo_completado = $this->getLastCompletedDateOfType($componente_id, $tipo);
        $fecha_ultimo = $ultimo_completado ?: date('Y-m-d');
        $this->setIfHasField($node, 'field_fecha_ultimo_servicio', $fecha_ultimo);

        // fecha_proximo_servicio = fecha_ultimo + frecuencia (según tipo)
        $frecuencia_horas = 0.0;
        if ($tipo === 'muestreo') {
            $frecuencia_horas = (float) ($this->getFieldValue($comp_node, 'field_frecuencia_de_muestreo') ?? 0);
        } else { // lubricacion
            $frecuencia_horas = (float) ($this->getFieldValue($comp_node, 'field_frecuencia_de_cambio') ?? 0);
        }

        if ($frecuencia_horas > 0) {
            $next_ts = strtotime($fecha_ultimo) + (int) round($frecuencia_horas * 3600);
            $this->setIfHasField($node, 'field_fecha_proximo_servicio', date('Y-m-d', $next_ts));
        }

        $node->save();

        return new JsonResponse([
            'message' => 'Servicio creado',
            'id' => $node->id(),
            'numero_servicio' => $node->label(),
            'tipo_servicio' => $tipo,
            'estado' => 'en_espera',
        ], 201);
    }

    // ==========================
    // UPDATE
    // ==========================
    private function updateServicio(Node $node, Request $request)
    {
        $this->requirePermission('administer lubriplanner servicios api');
        $data = $this->validateJson($request);

        $this->fillNodeFields($node, $data);
        $node->save();

        return new JsonResponse(['message' => 'Servicio actualizado']);
    }

    // ==========================
    // DELETE
    // ==========================
    private function deleteServicio(Node $node)
    {
        $this->requirePermission('administer lubriplanner servicios api');
        $node->delete();
        return new JsonResponse(['message' => 'Servicio eliminado']);
    }

    // ==========================
    // FORMATEO SEGURO (evita 500)
    // ==========================
    private function formatServicio(Node $node)
    {
        $file_url_generator = \Drupal::service('file_url_generator');

        // Cliente
        $cliente_target = $this->getTargetId($node, 'field_cliente_serv');
        $cliente_node = $cliente_target ? Node::load($cliente_target) : NULL;
        $cliente = $cliente_node ? [
            'id' => $cliente_node->id(),
            'nombre' => $cliente_node->label(),
        ] : null;

        // Componente
        $comp_target = $this->getTargetId($node, 'field_componente');
        $comp_node = $comp_target ? Node::load($comp_target) : NULL;
        $componente = $comp_node ? [
            'id' => $comp_node->id(),
            'title' => $comp_node->label(),
        ] : null;

        // Atendido por (user)
        $uid = $this->getTargetId($node, 'field_atendido_por');
        $user = $uid ? User::load($uid) : NULL;

        $avatar = null;
        if ($user && $user->hasField('user_picture') && !$user->get('user_picture')->isEmpty()) {
            $pic = $user->get('user_picture')->entity;
            $avatar = $pic ? $file_url_generator->generateAbsoluteString($pic->getFileUri()) : null;
        }

        $atendido_por = $user ? [
            'uid' => $user->id(),
            'nombre' => $user->getDisplayName(),
            'avatar' => $avatar,
        ] : null;

        // Files
        $firma = $this->getFileUrl($node, 'field_firma_del_responsable', $file_url_generator);
        $soporte = $this->getFileUrl($node, 'field_soporte', $file_url_generator);
        $informe_servicio = $this->getFileUrl($node, 'field_informe_de_servicio', $file_url_generator);

        return [
            'id' => $node->id(),
            'numero_servicio' => $node->label(),

            'tipo_servicio' => $this->getFieldValue($node, 'field_tipo_de_servicio'),
            'activo' => $this->getFieldValue($node, 'field_activo_serv'),
            'equipo' => $this->getFieldValue($node, 'field_equipo_serv'),

            'estado' => $this->getFieldValue($node, 'field_estado'),
            'responsable' => $this->getFieldValue($node, 'field_responsable'),
            'observaciones' => $this->getFieldValue($node, 'field_observaciones'),
            'notificar_al_cliente' => (bool) ($this->getFieldValue($node, 'field_notificar_al_cliente') ?? false),

            'fecha_agendado' => $this->getFieldValue($node, 'field_fecha_agendado'),
            'fecha_completado' => $this->getFieldValue($node, 'field_fecha_completado'),
            'fecha_notificado' => $this->getFieldValue($node, 'field_fecha_notificado'),

            'trabajo_real' => $this->getFieldValue($node, 'field_trabajo_real'),
            'fecha_ultimo_servicio' => $this->getFieldValue($node, 'field_fecha_ultimo_servicio'),
            'fecha_proximo_servicio' => $this->getFieldValue($node, 'field_fecha_proximo_servicio'),

            'firma' => $firma,
            'soporte' => $soporte,
            'informe_servicio' => $informe_servicio,

            'cliente' => $cliente,
            'componente' => $componente,
            'atendido_por' => $atendido_por,
        ];
    }

    // ==========================
    // Helpers de negocio
    // ==========================
    private function getLastCompletedDateOfType(int $componente_id, string $tipo_servicio): ?string
    {
        // Busca servicios del mismo componente + tipo_servicio con fecha_completado
        try {
            $nids = \Drupal::entityQuery('node')
                ->accessCheck(TRUE)
                ->condition('type', self::BUNDLE)
                ->condition('status', 1)
                ->condition('field_componente.target_id', $componente_id)
                ->condition('field_tipo_de_servicio', $tipo_servicio)
                ->exists('field_fecha_completado')
                ->sort('field_fecha_completado', 'DESC')
                ->range(0, 1)
                ->execute();

            if (empty($nids)) return null;

            $node = Node::load(reset($nids));
            if (!$node) return null;

            return $this->getFieldValue($node, 'field_fecha_completado');
        } catch (\Throwable $e) {
            \Drupal::logger('lubriplanner_servicios_api_v2')->warning('getLastCompletedDateOfType error: @m', ['@m' => $e->getMessage()]);
            return null;
        }
    }

    // ==========================
    // Fill seguro (PATCH)
    // ==========================
    private function fillNodeFields(Node $node, array $data): void
    {
        // Texto
        if (array_key_exists('tipo_servicio', $data)) {
            $this->setIfHasField($node, 'field_tipo_de_servicio', $data['tipo_servicio']);
        }
        if (array_key_exists('activo', $data)) $this->setIfHasField($node, 'field_activo_serv', $data['activo']);
        if (array_key_exists('equipo', $data)) $this->setIfHasField($node, 'field_equipo_serv', $data['equipo']);
        if (array_key_exists('estado', $data)) $this->setIfHasField($node, 'field_estado', $data['estado']);
        if (array_key_exists('responsable', $data)) $this->setIfHasField($node, 'field_responsable', $data['responsable']);
        if (array_key_exists('observaciones', $data)) $this->setIfHasField($node, 'field_observaciones', $data['observaciones']);
        if (array_key_exists('trabajo_real', $data)) $this->setIfHasField($node, 'field_trabajo_real', $data['trabajo_real']);

        // Fechas
        if (array_key_exists('fecha_agendado', $data)) $this->setIfHasField($node, 'field_fecha_agendado', $data['fecha_agendado']);
        if (array_key_exists('fecha_completado', $data)) $this->setIfHasField($node, 'field_fecha_completado', $data['fecha_completado']);
        if (array_key_exists('fecha_notificado', $data)) $this->setIfHasField($node, 'field_fecha_notificado', $data['fecha_notificado']);
        if (array_key_exists('fecha_ultimo_servicio', $data)) $this->setIfHasField($node, 'field_fecha_ultimo_servicio', $data['fecha_ultimo_servicio']);
        if (array_key_exists('fecha_proximo_servicio', $data)) $this->setIfHasField($node, 'field_fecha_proximo_servicio', $data['fecha_proximo_servicio']);

        // Bool
        if (array_key_exists('notificar_al_cliente', $data)) {
            $this->setIfHasField($node, 'field_notificar_al_cliente', (int) !!$data['notificar_al_cliente']);
        }

        // Referencias
        if (array_key_exists('cliente', $data)) $this->setIfHasField($node, 'field_cliente_serv', (int) $data['cliente']);
        if (array_key_exists('componente', $data)) $this->setIfHasField($node, 'field_componente', (int) $data['componente']);
        if (array_key_exists('atendido_por', $data)) $this->setIfHasField($node, 'field_atendido_por', (int) $data['atendido_por']);
    }

    // ==========================
    // Utilidades seguras
    // ==========================
    private function getRealMethod(Request $request): string
    {
        $override = strtoupper($request->headers->get('X-HTTP-Method-Override', ''));
        return $override ?: $request->getMethod();
    }

    private function validateJson(Request $request, array $required = []): array
    {
        $content = $request->getContent();
        if ($content === '' || $content === null) throw new BadRequestHttpException('JSON vacío');

        $data = json_decode($content, TRUE);
        if (json_last_error() !== JSON_ERROR_NONE) {
            throw new BadRequestHttpException('JSON inválido: ' . json_last_error_msg());
        }

        foreach ($required as $field) {
            if (!isset($data[$field])) {
                throw new BadRequestHttpException("Campo requerido: $field");
            }
        }

        return $data;
    }

    private function requirePermission(string $perm): void
    {
        if (!$this->currentUser()->hasPermission($perm)) {
            throw new AccessDeniedHttpException();
        }
    }

    private function getFieldValue(Node $node, string $field)
    {
        if (!$node->hasField($field) || $node->get($field)->isEmpty()) return null;
        return $node->get($field)->value ?? null;
    }

    private function getTargetId(Node $node, string $field): ?int
    {
        if (!$node->hasField($field) || $node->get($field)->isEmpty()) return null;
        $tid = $node->get($field)->target_id ?? null;
        return $tid ? (int) $tid : null;
    }

    private function setIfHasField(Node $node, string $field, $value): void
    {
        if (!$node->hasField($field)) return;
        $node->set($field, $value);
    }

    private function getFileUrl(Node $node, string $field, $file_url_generator): ?string
    {
        if (!$node->hasField($field) || $node->get($field)->isEmpty()) return null;
        $file = $node->get($field)->entity;
        return $file ? $file_url_generator->generateAbsoluteString($file->getFileUri()) : null;
    }

    // ✅ Helper: consecutivo GLOBAL único (por title numérico)
    private function nextConsecutiveGlobalServicio(): string
    {
        $nids = \Drupal::entityQuery('node')
            ->accessCheck(FALSE)
            ->condition('type', self::BUNDLE)
            ->exists('title')
            ->execute();

        if (empty($nids)) return '1';

        $nodes = Node::loadMultiple($nids);
        $max = 0;
        foreach ($nodes as $n) {
            $t = (int) $n->label();
            if ($t > $max) $max = $t;
        }
        return (string) ($max + 1);
    }

    public function recalcActivosDelComponente(int $componente_id): void
    {
        $activos = ['en_espera', 'agendado', 'notificado'];

        $nids = \Drupal::entityQuery('node')
            ->accessCheck(FALSE)
            ->condition('type', self::BUNDLE)
            ->condition('status', 1)
            ->condition('field_componente.target_id', $componente_id)
            ->condition('field_estado', $activos, 'IN')
            ->execute();

        if (empty($nids)) return;

        $servicios = Node::loadMultiple($nids);

        // cargar componente
        $comp = Node::load($componente_id);
        if (!$comp || $comp->bundle() !== self::COMPONENT_BUNDLE) return;

        $frecuencia_horas = (float) ($this->getFieldValue($comp, 'field_frecuencia_de_cambio') ?? 0);
        if ($frecuencia_horas <= 0) return;

        foreach ($servicios as $serv) {
            $this->recalcFechaProximoServicio($serv, $frecuencia_horas);
            $serv->save();
        }
    }

    private function recalcFechaProximoServicio(Node $serv, float $frecuencia_horas): void
    {
        $fecha_ultimo = $this->getFieldValue($serv, 'field_fecha_ultimo_servicio') ?: date('Y-m-d');
        $trabajo_real = (float) ($this->getFieldValue($serv, 'field_trabajo_real') ?? 0);

        // Si ya tiene trabajo_real (recalculado), usar frecuencia - trabajo_real
        $delta_horas = $trabajo_real > 0 ? max(0, $frecuencia_horas - $trabajo_real) : $frecuencia_horas;

        $next_ts = strtotime($fecha_ultimo) + (int) round($delta_horas * 3600);
        $this->setIfHasField($serv, 'field_fecha_proximo_servicio', date('Y-m-d', $next_ts));
    }

    /**
     * Envía notificaciones al cliente.
     *
     * $evento:
     *  - 'proximo'    => depende de clientes.field_enviar_notificaciones
     *  - 'completado' => depende de servicios.field_notificar_al_cliente
     *  - 'finalizado' => depende de servicios.field_notificar_al_cliente
     *
     * $manual:
     *  - true cuando viene de botón (Notificar)
     *  - false cuando viene de automatización/flujo
     */
    private function sendNotificacionCliente(Node $serv, string $evento = 'proximo', bool $manual = false): array
    {
        // 1) Cargar cliente y correo
        $cliente_id = $this->getTargetId($serv, 'field_cliente_serv');
        if (!$cliente_id) {
            return ['ok' => false, 'code' => 'NO_CLIENTE', 'message' => 'No se pudo notificar: el servicio no tiene cliente asociado.'];
        }

        $cliente = Node::load($cliente_id);
        if (!$cliente) {
            return ['ok' => false, 'code' => 'CLIENTE_NOT_FOUND', 'message' => 'No se pudo notificar: no se encontró el cliente asociado.'];
        }

        $email = '';
        if ($cliente->hasField('field_email_de_contacto') && !$cliente->get('field_email_de_contacto')->isEmpty()) {
            $email = (string) $cliente->get('field_email_de_contacto')->value;
        }
        $email = trim($email);

        if ($email === '') {
            return ['ok' => false, 'code' => 'EMAIL_EMPTY', 'message' => 'No se pudo notificar: el cliente no tiene correo registrado.'];
        }

        $validator = \Drupal::service('email.validator');
        if (!$validator->isValid($email)) {
            return ['ok' => false, 'code' => 'EMAIL_INVALID', 'message' => 'No se pudo notificar: el correo del cliente no es válido.'];
        }

        // 2) Validar flags según evento
        if ($evento === 'proximo') {
            // Depende del CLIENTE.field_enviar_notificaciones
            $enviar = true;
            if ($cliente->hasField('field_enviar_notificaciones') && !$cliente->get('field_enviar_notificaciones')->isEmpty()) {
                $enviar = (bool) $cliente->get('field_enviar_notificaciones')->value;
            }
            if (!$enviar) {
                return ['ok' => true, 'code' => 'SKIP_DISABLED', 'message' => 'El cliente tiene desactivado “enviar notificaciones”.'];
            }
        } else {
            // completado/finalizado => depende del SERVICIO.field_notificar_al_cliente
            $flag = true;
            if ($serv->hasField('field_notificar_al_cliente') && !$serv->get('field_notificar_al_cliente')->isEmpty()) {
                $flag = (bool) $serv->get('field_notificar_al_cliente')->value;
            }
            if (!$flag) {
                return ['ok' => true, 'code' => 'SKIP_FLAG_OFF', 'message' => 'El servicio no tiene habilitado “Notificar al cliente”.'];
            }
        }

        // 3) Construir contenido
        $num = $serv->label();

        // Tipo (por si hay variaciones en el nombre del campo)
        $tipo =
            $this->getFieldValue($serv, 'field_tipo_de_servicio') ??
            $this->getFieldValue($serv, 'field_tipo_servicio') ??
            '';

        $activo = $this->getFieldValue($serv, 'field_activo_serv') ?? '';
        $equipo = $this->getFieldValue($serv, 'field_equipo_serv') ?? '';

        $fecha_prox = $this->getFieldValue($serv, 'field_fecha_proximo_servicio') ?? '';
        $fecha_comp = $this->getFieldValue($serv, 'field_fecha_completado') ?? '';

        if ($evento === 'proximo') {
            $subject = "Notificación de servicio #$num - $tipo";
            $body =
                "Hola,\n\n" .
                "Te informamos que se aproxima un servicio programado.\n\n" .
                "Servicio: #$num\n" .
                "Tipo: $tipo\n" .
                "Activo: $activo\n" .
                "Equipo: $equipo\n" .
                "Fecha estimada del servicio: $fecha_prox\n\n" .
                "Gracias.";
        } elseif ($evento === 'completado') {
            $subject = "Servicio completado #$num - $tipo";
            $body =
                "Hola,\n\n" .
                "Te confirmamos que el servicio ha sido COMPLETADO.\n\n" .
                "Servicio: #$num\n" .
                "Tipo: $tipo\n" .
                "Activo: $activo\n" .
                "Equipo: $equipo\n" .
                "Fecha de completado: $fecha_comp\n\n" .
                "Gracias.";
        } else { // finalizado
            $subject = "Servicio finalizado #$num - $tipo";
            $body =
                "Hola,\n\n" .
                "Te informamos que el servicio ha sido FINALIZADO.\n\n" .
                "Servicio: #$num\n" .
                "Tipo: $tipo\n" .
                "Activo: $activo\n" .
                "Equipo: $equipo\n\n" .
                "Gracias.";
        }

        // 4) Enviar por mail manager
        $params = ['subject' => $subject, 'message' => $body];

        $langcode = \Drupal::languageManager()->getDefaultLanguage()->getId();
        $from = \Drupal::config('system.site')->get('mail') ?: 'no-reply@localhost';

        try {
            $result = \Drupal::service('plugin.manager.mail')->mail(
                'lubriplanner_servicios_api_v2',
                'servicio_notificacion',
                $email,
                $langcode,
                $params,
                $from,
                true
            );

            if (!empty($result['result'])) {
                return ['ok' => true, 'code' => 'SENT', 'message' => 'Notificación enviada con éxito.'];
            }

            return ['ok' => false, 'code' => 'SEND_FAIL', 'message' => 'No se pudo notificar: fallo de envío.'];
        } catch (\Throwable $e) {
            \Drupal::logger('lubriplanner_servicios_api_v2')->error('Mail error: @m', ['@m' => $e->getMessage()]);
            return ['ok' => false, 'code' => 'EXCEPTION', 'message' => 'No se pudo notificar: error interno enviando correo.'];
        }
    }




    private function sendServicioCompletadoEmail(Node $serv): array
    {
        $cliente_id = $this->getTargetId($serv, 'field_cliente_serv');
        $cliente = $cliente_id ? Node::load($cliente_id) : null;

        if (!$cliente) {
            return ['ok' => false, 'code' => 'NO_CLIENTE', 'message' => 'No se encontró el cliente asociado.'];
        }

        // Respetar flag cliente
        if ($cliente->hasField('field_enviar_notificaciones') && !$cliente->get('field_enviar_notificaciones')->isEmpty()) {
            $allow = (bool) $cliente->get('field_enviar_notificaciones')->value;
            if (!$allow) {
                return ['ok' => false, 'code' => 'CLIENTE_NOTIF_OFF', 'message' => 'El cliente tiene las notificaciones deshabilitadas.'];
            }
        }

        // Email fijo del cliente
        $email = null;
        if ($cliente->hasField('field_email_de_contacto') && !$cliente->get('field_email_de_contacto')->isEmpty()) {
            $email = $cliente->get('field_email_de_contacto')->value;
        }

        if (empty($email) || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
            return ['ok' => false, 'code' => 'EMAIL_INVALIDO', 'message' => 'No se pudo notificar: el correo del cliente no es válido.'];
        }

        $tipo = $this->getFieldValue($serv, 'field_tipo_de_servicio') ?? '';
        $activo = $this->getFieldValue($serv, 'field_activo_serv') ?? '';
        $equipo = $this->getFieldValue($serv, 'field_equipo_serv') ?? '';
        $num = $serv->label();
        $fecha_comp = $this->getFieldValue($serv, 'field_fecha_completado') ?? date('Y-m-d');

        $params = [
            'subject' => "Servicio completado #$num - $tipo",
            'message' =>
            "Hola,\n\n" .
                "Te confirmamos que el servicio ha sido completado.\n\n" .
                "Servicio: #$num\n" .
                "Tipo: $tipo\n" .
                "Activo: $activo\n" .
                "Equipo: $equipo\n" .
                "Fecha de completado: $fecha_comp\n\n" .
                "Gracias.",
        ];

        $langcode = \Drupal::languageManager()->getDefaultLanguage()->getId();
        $from = \Drupal::config('system.site')->get('mail') ?: 'no-reply@localhost';

        $result = \Drupal::service('plugin.manager.mail')->mail(
            'lubriplanner_servicios_api_v2',
            'servicio_completado',
            $email,
            $langcode,
            $params,
            $from,
            true
        );

        if (!empty($result['result'])) {
            return ['ok' => true, 'code' => 'ENVIADO', 'message' => 'Notificación enviada: el correo se envió con éxito.'];
        }

        return ['ok' => false, 'code' => 'MAIL_FAIL', 'message' => 'No se pudo notificar: falló el envío del correo.'];
    }

    private function sendServicioFinalizadoEmail(Node $serv): array
    {
        $cliente_id = $this->getTargetId($serv, 'field_cliente_serv');
        $cliente = $cliente_id ? Node::load($cliente_id) : null;

        if (!$cliente) {
            return ['ok' => false, 'code' => 'NO_CLIENTE', 'message' => 'No se encontró el cliente asociado.'];
        }

        // Respetar flag cliente
        if ($cliente->hasField('field_enviar_notificaciones') && !$cliente->get('field_enviar_notificaciones')->isEmpty()) {
            $allow = (bool) $cliente->get('field_enviar_notificaciones')->value;
            if (!$allow) {
                return ['ok' => false, 'code' => 'CLIENTE_NOTIF_OFF', 'message' => 'El cliente tiene las notificaciones deshabilitadas.'];
            }
        }

        // Email fijo del cliente
        $email = null;
        if ($cliente->hasField('field_email_de_contacto') && !$cliente->get('field_email_de_contacto')->isEmpty()) {
            $email = $cliente->get('field_email_de_contacto')->value;
        }

        if (empty($email) || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
            return ['ok' => false, 'code' => 'EMAIL_INVALIDO', 'message' => 'No se pudo notificar: el correo del cliente no es válido.'];
        }

        $tipo = $this->getFieldValue($serv, 'field_tipo_de_servicio') ?? '';
        $activo = $this->getFieldValue($serv, 'field_activo_serv') ?? '';
        $equipo = $this->getFieldValue($serv, 'field_equipo_serv') ?? '';
        $num = $serv->label();

        $params = [
            'subject' => "Informe de Servicio de $tipo #$num",
            'message' =>
            "Hola,\n\n" .
                "Te confirmamos que ya está listo el informe del servicio de $tipo #$num  .\n\n" .
                "Activo: $activo\n" .
                "Equipo: $equipo\n" .
                "Gracias.",
        ];

        $langcode = \Drupal::languageManager()->getDefaultLanguage()->getId();
        $from = \Drupal::config('system.site')->get('mail') ?: 'no-reply@localhost';

        $result = \Drupal::service('plugin.manager.mail')->mail(
            'lubriplanner_servicios_api_v2',
            'servicio_completado',
            $email,
            $langcode,
            $params,
            $from,
            true
        );

        if (!empty($result['result'])) {
            return ['ok' => true, 'code' => 'ENVIADO', 'message' => 'Notificación enviada: el correo se envió con éxito.'];
        }

        return ['ok' => false, 'code' => 'MAIL_FAIL', 'message' => 'No se pudo notificar: falló el envío del correo.'];
    }

    private function sendProximoServicioEmail(Node $serv, bool $force = false): array
    {
        // 1) Cliente asociado
        $cliente_id = $this->getTargetId($serv, 'field_cliente_serv');
        if (!$cliente_id) {
            return [
                'ok' => false,
                'code' => 'NO_CLIENTE',
                'message' => 'No se pudo notificar: el servicio no tiene cliente asociado.',
            ];
        }

        $cliente = Node::load($cliente_id);
        if (!$cliente) {
            return [
                'ok' => false,
                'code' => 'CLIENTE_NOT_FOUND',
                'message' => 'No se pudo notificar: no se encontró el cliente asociadoZZ.',
            ];
        }

        // 2) Regla: depende del check del cliente
        if (!$force) {
            $flag = false;
            if ($cliente->hasField('field_enviar_notificaciones') && !$cliente->get('field_enviar_notificaciones')->isEmpty()) {
                $flag = (bool) $cliente->get('field_enviar_notificaciones')->value;
            }

            if (!$flag) {
                return [
                    'ok' => false,
                    'code' => 'CLIENTE_NOTIF_DISABLED',
                    'message' => 'No se envió notificación: el cliente tiene desactivado "Enviar notificaciones".',
                ];
            }
        }

        // 3) Email del cliente
        $email = '';
        if ($cliente->hasField('field_email_de_contacto') && !$cliente->get('field_email_de_contacto')->isEmpty()) {
            $email = (string) $cliente->get('field_email_de_contacto')->value;
        }
        $email = trim($email);

        if ($email === '') {
            return [
                'ok' => false,
                'code' => 'EMAIL_EMPTY',
                'message' => 'No se pudo notificar: el cliente no tiene correo registrado.',
            ];
        }

        $validator = \Drupal::service('email.validator');
        if (!$validator->isValid($email)) {
            return [
                'ok' => false,
                'code' => 'EMAIL_INVALID',
                'message' => 'No se pudo notificar: el correo del cliente no es válido.',
            ];
        }

        // 4) Datos para mensaje (solo lectura)
        $tipo = (string) ($this->getFieldValue($serv, 'field_tipo_de_servicio') ?? $this->getFieldValue($serv, 'field_tipo_servicio') ?? '');
        $activo = (string) ($this->getFieldValue($serv, 'field_activo_serv') ?? '');
        $equipo = (string) ($this->getFieldValue($serv, 'field_equipo_serv') ?? '');
        $num = (string) $serv->label();
        $fecha_prox = (string) ($this->getFieldValue($serv, 'field_fecha_proximo_servicio') ?? '');

        $params = [
            'subject' => "Notificación de servicio #$num - $tipo",
            'message' =>
            "Hola,\n\n" .
                "Te informamos que se aproxima un servicio programado.\n\n" .
                "Servicio: #$num\n" .
                "Tipo: $tipo\n" .
                "Activo: $activo\n" .
                "Equipo: $equipo\n" .
                "Fecha estimada del servicio: $fecha_prox\n\n" .
                "Gracias.",
        ];

        $langcode = \Drupal::languageManager()->getDefaultLanguage()->getId();
        $from = \Drupal::config('system.site')->get('mail') ?: 'no-reply@localhost';

        try {
            $result = \Drupal::service('plugin.manager.mail')->mail(
                'lubriplanner_servicios_api_v2',
                'servicio_notificacion',
                $email,
                $langcode,
                $params,
                $from,
                true
            );

            if (!empty($result['result'])) {
                return [
                    'ok' => true,
                    'code' => 'SENT',
                    'message' => 'Notificación enviada, el correo se envió con éxito.',
                ];
            }

            return [
                'ok' => false,
                'code' => 'SEND_FAILED',
                'message' => 'No se pudo notificar: fallo el envío del correo.',
            ];
        } catch (\Throwable $e) {
            \Drupal::logger('lubriplanner_servicios_api_v2')->error('sendProximoServicioEmail error: @m', ['@m' => $e->getMessage()]);
            return [
                'ok' => false,
                'code' => 'EXCEPTION',
                'message' => 'No se pudo notificar: error interno al enviar correo.',
            ];
        }
    }

    public function uploadInforme(Request $request)
    {
        $this->requirePermission('administer lubriplanner servicios api');

        /** @var UploadedFile|null $uploaded */
        $uploaded = $request->files->get('file');
        if (!$uploaded) {
            return new JsonResponse([
                'status' => false,
                'message' => 'No se recibió archivo (field "file").',
            ], 400);
        }

        // ✅ Config alineada con Drupal (campo field_informe_de_servicio = 20MB)
        $maxBytes = 20 * 1024 * 1024; // 20MB
        $extensions = 'pdf doc docx';

        // Carpeta destino
        $directory = 'private://informes_servicio';
        \Drupal::service('file_system')->prepareDirectory(
            $directory,
            FileSystemInterface::CREATE_DIRECTORY | FileSystemInterface::MODIFY_PERMISSIONS
        );

        // Guardar archivo usando repositorio (Drupal-friendly)
        $destination = $directory . '/' . $uploaded->getClientOriginalName();

        $fileRepository = \Drupal::service('file.repository');
        $fileSystem = \Drupal::service('file_system');

        // Leer y escribir (EXISTS_RENAME evita colisiones)
        $data = file_get_contents($uploaded->getRealPath());
        if ($data === false) {
            return new JsonResponse([
                'status' => false,
                'message' => 'No se pudo leer el archivo subido.',
            ], 400);
        }

        /** @var \Drupal\file\FileInterface $file */
        $file = $fileRepository->writeData($data, $destination, FileSystemInterface::EXISTS_RENAME);

        // Validadores core de Drupal
        $validator = \Drupal::service('file.validator');
        $violations = $validator->validate($file, [
            'file_validate_extensions' => [$extensions],
            'file_validate_size' => [$maxBytes],
        ]);

        if (count($violations) > 0) {
            // Limpiar archivo y entidad si no pasa validación
            $uri = $file->getFileUri();
            try {
                $file->delete();
            } catch (\Throwable $e) {
                // si falla delete de entidad, seguimos igual
            }
            try {
                $fileSystem->delete($uri);
            } catch (\Throwable $e) {
                // si falla borrar del FS, seguimos igual
            }

            // Unificar mensajes
            $messages = [];
            foreach ($violations as $v) {
                $messages[] = $v->getMessage();
            }

            return new JsonResponse([
                'status' => false,
                'message' => implode(' | ', $messages),
            ], 400);
        }

        // Marcar permanente (o déjalo temporal si prefieres limpieza automática)
        $file->setPermanent();
        $file->save();

        $url = \Drupal::service('file_url_generator')->generateAbsoluteString($file->getFileUri());

        return new JsonResponse([
            'status' => true,
            'data' => [
                'fid' => (int) $file->id(),
                'filename' => $uploaded->getClientOriginalName(),
            ],
        ]);
    }

    public function downloadInforme($nid)
    {
        $serv = Node::load((int) $nid);
        if (!$serv || $serv->bundle() !== self::BUNDLE) {
            throw new NotFoundHttpException("Servicio $nid no encontrado.");
        }

        // ✅ 1) Validar acceso: interno o cliente dueño
        $this->assertCanAccessServicio($serv);

        // ✅ 2) Obtener fid del campo
        if (!$serv->hasField('field_informe_de_servicio') || $serv->get('field_informe_de_servicio')->isEmpty()) {
            throw new NotFoundHttpException("El servicio no tiene informe.");
        }

        $fid = (int) $serv->get('field_informe_de_servicio')->target_id;
        $file = $fid ? File::load($fid) : null;
        if (!$file) {
            throw new NotFoundHttpException("Archivo no encontrado.");
        }

        $uri = $file->getFileUri();
        $path = \Drupal::service('file_system')->realpath($uri);

        if (!$path || !file_exists($path)) {
            throw new NotFoundHttpException("Archivo no disponible.");
        }

        // ✅ 3) Responder archivo como descarga segura
        $response = new BinaryFileResponse($path);
        $disposition = $response->headers->makeDisposition(
            ResponseHeaderBag::DISPOSITION_ATTACHMENT,
            $file->getFilename()
        );
        $response->headers->set('Content-Disposition', $disposition);

        return $response;
    }

    private function assertCanAccessServicio(Node $serv): void
    {
        // Internos: permiso admin => full access
        if ($this->currentUser()->hasPermission('administer lubriplanner servicios api')) {
            return;
        }

        // Clientes: validar que el servicio pertenezca a su cliente
        $servClienteId = $this->getTargetId($serv, 'field_cliente_serv');
        if (!$servClienteId) {
            throw new AccessDeniedHttpException();
        }

        $user = User::load($this->currentUser()->id());

        // ✅ AJUSTA ESTE CAMPO según tu modelo:
        // Debe existir un campo en el usuario que apunte al nodo cliente
        // Ejemplo sugerido: field_cliente_asociado (entity reference a node cliente)
        $userClienteId = null;
        if ($user && $user->hasField('field_cliente_asociado') && !$user->get('field_cliente_asociado')->isEmpty()) {
            $userClienteId = (int) $user->get('field_cliente_asociado')->target_id;
        }

        if (!$userClienteId || $userClienteId !== (int) $servClienteId) {
            throw new AccessDeniedHttpException();
        }
    }

    public function downloadHistorialComponente($componente)
    {
        $componente_id = (int) $componente;
        if ($componente_id <= 0) {
            throw new NotFoundHttpException("Componente inválido.");
        }

        // Cargar componente y validar que exista
        $comp = Node::load($componente_id);
        if (!$comp || $comp->bundle() !== self::COMPONENT_BUNDLE) {
            throw new NotFoundHttpException("Componente $componente_id no encontrado.");
        }

        // ✅ Control de acceso: interno o cliente dueño del componente
        $this->assertCanAccessComponente($comp);

        // Traer servicios del componente
        $nids = \Drupal::entityQuery('node')
            ->accessCheck(TRUE)
            ->condition('type', self::BUNDLE)
            ->condition('status', 1)
            ->condition('field_componente.target_id', $componente_id)
            ->sort('created', 'DESC')
            ->execute();

        $nodes = Node::loadMultiple($nids);

        // CSV (UTF-8 con BOM para Excel)
        $bom = "\xEF\xBB\xBF";
        $headers = [
            'NID',
            'N° Servicio',
            'Tipo de servicio',
            'Estado',
            'Cliente',
            'Activo',
            'Equipo',
            'Fecha último servicio',
            'Fecha próximo servicio',
            'Fecha agendado',
            'Fecha notificado',
            'Fecha completado',
            'Trabajo real',
            'Responsable',
            'Observaciones',
        ];

        $lines = [];
        $lines[] = $this->csvLine($headers);

        foreach ($nodes as $serv) {
            $cliente_id = $this->getTargetId($serv, 'field_cliente_serv');
            $cliente_name = null;
            if ($cliente_id) {
                $cliente_node = Node::load($cliente_id);
                $cliente_name = $cliente_node ? $cliente_node->label() : null;
            }

            $row = [
                $serv->id(),
                $serv->label(), // title = N° servicio
                (string) ($this->getFieldValue($serv, 'field_tipo_servicio') ?? ''),
                (string) ($this->getFieldValue($serv, 'field_estado') ?? ''),
                (string) ($cliente_name ?? ''),
                (string) ($this->getFieldValue($serv, 'field_activo_serv') ?? ''),
                (string) ($this->getFieldValue($serv, 'field_equipo_serv') ?? ''),
                (string) ($this->getFieldValue($serv, 'field_fecha_ultimo_servicio') ?? ''),
                (string) ($this->getFieldValue($serv, 'field_fecha_proximo_servicio') ?? ''),
                (string) ($this->getFieldValue($serv, 'field_fecha_agendado') ?? ''),
                (string) ($this->getFieldValue($serv, 'field_fecha_notificado') ?? ''),
                (string) ($this->getFieldValue($serv, 'field_fecha_completado') ?? ''),
                (string) ($this->getFieldValue($serv, 'field_trabajo_real') ?? ''),
                (string) ($this->getFieldValue($serv, 'field_responsable') ?? ''),
                (string) ($this->getFieldValue($serv, 'field_observaciones') ?? ''),
            ];

            $lines[] = $this->csvLine($row);
        }

        $csv = $bom . implode("\n", $lines);

        // Nombre de archivo con componente + fecha
        $safeComp = preg_replace('/[^A-Za-z0-9_\-]/', '_', $comp->label());
        $filename = "Historial_Servicios_Componente_{$componente_id}_{$safeComp}_" . date('Y-m-d') . ".csv";

        $response = new Response($csv);
        $response->headers->set('Content-Type', 'text/csv; charset=UTF-8');
        $response->headers->set('Content-Disposition', 'attachment; filename="' . $filename . '"');

        return $response;
    }

    private function assertCanAccessComponente(Node $comp): void
    {
        // Internos: permiso admin => full access
        if ($this->currentUser()->hasPermission('administer lubriplanner servicios api')) {
            return;
        }

        // Cliente dueño: componente debe tener el cliente asociado
        // Ajusta si tu componente guarda el cliente en otro campo:
        $compClienteId = (int) ($this->getFieldValue($comp, 'field_cliente_comp_id') ?? 0);
        if ($compClienteId <= 0) {
            throw new AccessDeniedHttpException();
        }

        $userClienteId = $this->getCurrentUserClienteId();
        if (!$userClienteId || $userClienteId !== $compClienteId) {
            throw new AccessDeniedHttpException();
        }
    }

    private function getCurrentUserClienteId(): ?int
    {
        $user = User::load($this->currentUser()->id());
        if (!$user) return null;

        // ✅ AJUSTA este campo si tu usuario usa otro:
        // entity reference al nodo cliente
        if ($user->hasField('field_cliente_asociado') && !$user->get('field_cliente_asociado')->isEmpty()) {
            return (int) $user->get('field_cliente_asociado')->target_id;
        }

        return null;
    }

    private function csvLine(array $cols): string
    {
        $escaped = array_map(function ($v) {
            $v = (string) $v;
            $v = str_replace('"', '""', $v);
            return '"' . $v . '"';
        }, $cols);

        return implode(',', $escaped);
    }

    private function sendEstadoServicioEmail(Node $serv, string $evento, bool $force = false): array
    {
        // Regla: depende del check del SERVICIO
        if (!$force && $serv->hasField('field_notificar_al_cliente') && !$serv->get('field_notificar_al_cliente')->isEmpty()) {
            $flag = (bool) $serv->get('field_notificar_al_cliente')->value;
            if (!$flag) {
                return ['ok' => false, 'code' => 'SERV_NOTIF_DISABLED', 'message' => 'No se envió: el servicio tiene desactivado "Notificar al cliente".'];
            }
        }

        // Email: por ahora el mismo del cliente
        $cliente_id = $this->getTargetId($serv, 'field_cliente_serv');
        if (!$cliente_id) {
            return ['ok' => false, 'code' => 'NO_CLIENTE', 'message' => 'No se pudo notificar: el servicio no tiene cliente asociado.'];
        }

        $cliente = Node::load($cliente_id);
        if (!$cliente) {
            return ['ok' => false, 'code' => 'CLIENTE_NOT_FOUND', 'message' => 'No se pudo notificar: no se encontró el cliente asociado.'];
        }

        $email = '';
        if ($cliente->hasField('field_email_de_contacto') && !$cliente->get('field_email_de_contacto')->isEmpty()) {
            $email = (string) $cliente->get('field_email_de_contacto')->value;
        }
        $email = trim($email);

        if ($email === '') {
            return ['ok' => false, 'code' => 'EMAIL_EMPTY', 'message' => 'No se pudo notificar: el cliente no tiene correo registrado.'];
        }

        $validator = \Drupal::service('email.validator');
        if (!$validator->isValid($email)) {
            return ['ok' => false, 'code' => 'EMAIL_INVALID', 'message' => 'No se pudo notificar: el correo del cliente no es válido.'];
        }

        $tipo = (string) ($this->getFieldValue($serv, 'field_tipo_de_servicio') ?? '');
        $num = (string) $serv->label();

        $subject = ($evento === 'finalizado')
            ? "Servicio #$num finalizado - $tipo"
            : "Servicio #$num completado - $tipo";

        $body = ($evento === 'finalizado')
            ? "Hola,\n\nTe informamos que el servicio #$num ($tipo) ha sido FINALIZADO y ya cuenta con informe.\n\nGracias."
            : "Hola,\n\nTe informamos que el servicio #$num ($tipo) ha sido COMPLETADO.\n\nGracias.";

        $params = [
            'subject' => $subject,
            'message' => $body,
        ];

        $langcode = \Drupal::languageManager()->getDefaultLanguage()->getId();
        $from = \Drupal::config('system.site')->get('mail') ?: 'no-reply@localhost';

        try {
            $result = \Drupal::service('plugin.manager.mail')->mail(
                'lubriplanner_servicios_api_v2',
                'servicio_estado',
                $email,
                $langcode,
                $params,
                $from,
                true
            );

            if (!empty($result['result'])) {
                return ['ok' => true, 'code' => 'SENT', 'message' => 'Notificación enviada correctamente.'];
            }

            return ['ok' => false, 'code' => 'SEND_FAIL', 'message' => 'No se pudo enviar la notificación (fallo del servicio de correo).'];
        } catch (\Throwable $e) {
            \Drupal::logger('lubriplanner_servicios_api_v2')->error('sendEstadoServicioEmail error: @m', ['@m' => $e->getMessage()]);
            return ['ok' => false, 'code' => 'EXCEPTION', 'message' => 'No se pudo enviar la notificación (error interno).'];
        }
    }


    private function existsActiveServicioOfType(int $componente_id, string $tipo_servicio): bool
    {
        try {
            $nids = \Drupal::entityQuery('node')
                ->accessCheck(TRUE)
                ->condition('type', self::BUNDLE)
                ->condition('status', 1)
                ->condition('field_componente.target_id', $componente_id)
                ->condition('field_tipo_servicio', $tipo_servicio)
                ->condition('field_estado', ['completado', 'finalizado'], 'NOT IN')
                ->range(0, 1)
                ->execute();

            return !empty($nids);
        } catch (\Throwable $e) {
            \Drupal::logger('lubriplanner_servicios_api_v2')->warning('existsActiveServicioOfType error: @m', ['@m' => $e->getMessage()]);
            // En caso de duda, NO bloqueamos creación por error interno, pero lo logeamos
            return false;
        }
    }
}
