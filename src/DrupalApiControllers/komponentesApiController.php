<?php

namespace Drupal\lubriplanner_komponentes_api_v2\Controller;

use Drupal\Core\Controller\ControllerBase;
use Drupal\node\Entity\Node;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Symfony\Component\HttpKernel\Exception\BadRequestHttpException;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;

class KomponentesApiController extends ControllerBase
{

    // ========================================
    // COLECCIÓN: GET todos / POST crear
    // ========================================
    public function collection(Request $request)
    {
        $method = $this->getRealMethod($request);
        switch ($method) {
            case 'GET':
                return $this->getAll($request);
            case 'POST':
                return $this->createKomponente($request);
            default:
                return new JsonResponse(['error' => 'Método no permitido'], 405);
        }
    }

    // ========================================
    // ÍTEM: GET uno / PATCH update / DELETE
    // ========================================
    public function item($nid, Request $request)
    {
        $method = $this->getRealMethod($request);
        $node = Node::load($nid);
        if (!$node || $node->bundle() !== 'componentes') {
            throw new NotFoundHttpException("Componente $nid no encontrado.");
        }
        switch ($method) {
            case 'GET':
                return $this->getOne($node);
            case 'PATCH':
                return $this->updateKomponente($node, $request);
            case 'DELETE':
                return $this->deleteKomponente($node);
            default:
                return new JsonResponse(['error' => 'Método no permitido'], 405);
        }
    }

    // ========================================
    // RESPUESTAS
    // ========================================
    private function getAll(Request $request)
    {
        // Pagination: soporta page/limit y también page[limit]/page[offset]
        $page = (int) $request->query->get('page', 0);
        $limit = (int) $request->query->get('limit', 10);

        $pageBag = $request->query->get('page');
        $pageLimit = is_array($pageBag) ? ($pageBag['limit'] ?? null) : null;
        $pageOffset = is_array($pageBag) ? ($pageBag['offset'] ?? null) : null;
        $pageNumber = is_array($pageBag) ? ($pageBag['number'] ?? null) : null;

        if (is_numeric($pageNumber))
            $page = (int)$pageNumber;

        if (is_numeric($pageLimit)) {
            $limit = (int) $pageLimit;
        }
        if ($limit < 1) $limit = 10;

        if (is_numeric($pageOffset)) {
            $offset = (int) $pageOffset;
            $page = (int) floor($offset / $limit);
        } else {
            $offset = $page * $limit;
        }

        // Bolsa de filtros estilo drupalFilter / JSON:API-like:
        // ?filter[title]=x  ó ?filter[cliente]=... etc
        $allQuery = $request->query->all();
        $filterBag = $allQuery['filter'] ?? [];

        // Helper: toma valor desde query directo o desde filterBag
        $get = function (string $key) use ($request, $filterBag) {
            $v = $request->query->get($key);
            if ($v === null && is_array($filterBag) && array_key_exists($key, $filterBag)) {
                $v = $filterBag[$key];
            }
            return $v;
        };

        // Valores entrantes (pueden venir como string, number o array)
        $title = $get('title') ?? $get('name');

        // "Context mode" histórico: estos suelen venir como IDs
        $cliente = $get('cliente');
        $activo  = $get('activo');
        $equipo  = $get('equipo');
        $lubricante = $get('lubricante');

        // También permitimos *_id explícitos
        $cliente_id = $get('cliente_id');
        $activo_id  = $get('activo_id');
        $equipo_id  = $get('equipo_id');
        $lubricante_id = $get('lubricante_id');

        // Otros filtros (opcionales)
        $frecuencia_cambio = $get('frecuencia_cambio');
        $frecuencia_muestreo = $get('frecuencia_muestreo');

        // Normaliza lubricante cuando venga como CSV: "1,2,3"
        $normalizeMaybeCsv = function ($val) {
            if (is_string($val) && str_contains($val, ',')) {
                $val = array_values(array_filter(array_map('trim', explode(',', $val))));
            }
            return $val;
        };

        $lubricante = $normalizeMaybeCsv($lubricante);
        $lubricante_id = $normalizeMaybeCsv($lubricante_id);

        // Aplica filtros a una EntityQuery
        $applyFilters = function ($query) use (
            $title,
            $cliente,
            $activo,
            $equipo,
            $lubricante,
            $cliente_id,
            $activo_id,
            $equipo_id,
            $lubricante_id,
            $frecuencia_cambio,
            $frecuencia_muestreo
        ) {
            // title (búsqueda parcial)
            if ($title !== null && $title !== '') {
                $query->condition('title', $title, 'CONTAINS');
            }

            // Cliente: si es numérico => ID, si no => texto
            $cVal = $cliente_id ?? $cliente;
            if ($cVal !== null && $cVal !== '') {
                if (is_numeric($cVal)) $query->condition('field_cliente_comp_id', (int) $cVal);
                else $query->condition('field_comp_cliente', $cVal, 'CONTAINS');
            }

            // Activo: si es numérico => ID, si no => texto
            $aVal = $activo_id ?? $activo;
            if ($aVal !== null && $aVal !== '') {
                if (is_numeric($aVal)) $query->condition('field_comp_activo_id', (int) $aVal);
                else $query->condition('field_comp_activo', $aVal, 'CONTAINS');
            }

            // Equipo: si es numérico => ID, si no => texto
            $eVal = $equipo_id ?? $equipo;
            if ($eVal !== null && $eVal !== '') {
                if (is_numeric($eVal)) $query->condition('field_comp_equipo_id', (int) $eVal);
                else $query->condition('field_comp_equipo', $eVal, 'CONTAINS');
            }

            // Lubricante: soporta array (multiselect) por ID
            $lVal = $lubricante_id ?? $lubricante;
            if ($lVal !== null && $lVal !== '') {
                if (is_array($lVal)) {
                    $vals = array_values(array_filter($lVal, fn($x) => $x !== null && $x !== ''));
                    if (!empty($vals)) {
                        // si todo parece numérico -> IN por ID
                        $allNumeric = true;
                        foreach ($vals as $v) {
                            if (!is_numeric($v)) {
                                $allNumeric = false;
                                break;
                            }
                        }
                        if ($allNumeric) {
                            $vals = array_map('intval', $vals);
                            $query->condition('field_comp_lubricante_id', $vals, 'IN');
                        } else {
                            // fallback: texto
                            // (entityQuery no soporta OR fácilmente; tomamos el primero)
                            $query->condition('field_comp_lubricante', (string) $vals[0], 'CONTAINS');
                        }
                    }
                } else {
                    if (is_numeric($lVal)) $query->condition('field_comp_lubricante_id', (int) $lVal);
                    else $query->condition('field_comp_lubricante', $lVal, 'CONTAINS');
                }
            }

            // Frecuencias (si quieres exact match; si las guardas como texto y quieres parcial, cambia a CONTAINS)
            if ($frecuencia_cambio !== null && $frecuencia_cambio !== '') {
                $query->condition('field_frecuencia_de_cambio', $frecuencia_cambio);
            }
            if ($frecuencia_muestreo !== null && $frecuencia_muestreo !== '') {
                $query->condition('field_frecuencia_de_muestreo', $frecuencia_muestreo);
            }
        };

        // 1) Total
        $totalQuery = \Drupal::entityQuery('node')
            ->accessCheck(TRUE)
            ->condition('type', 'componentes')
            ->condition('status', 1);

        $applyFilters($totalQuery);
        $total = (int) $totalQuery->count()->execute();

        // 2) Data paginada
        $listQuery = \Drupal::entityQuery('node')
            ->accessCheck(TRUE)
            ->condition('type', 'componentes')
            ->condition('status', 1);

        $applyFilters($listQuery);

        $nids = $listQuery
            ->sort('title', 'ASC')
            ->range($offset, $limit)
            ->execute();

        $nodes = Node::loadMultiple($nids);
        $data = array_map([$this, 'formatKomponente'], $nodes);

        return new JsonResponse([
            'data' => array_values($data),
            'total' => $total,
            'page' => (int) $page,
            'limit' => (int) $limit,
        ]);
    }



    private function getOne(Node $node)
    {
        return new JsonResponse($this->formatKomponente($node));
    }

    // ========================================
    // CREAR / ACTUALIZAR / ELIMINAR
    // ========================================
    private function createKomponente(Request $request)
    {
        $this->requirePermission('administer lubriplanner komponentes api');
        $data = $this->validateJson($request);
        if (empty($data['title']) && !empty($data['name'])) {
            $data['title'] = $data['name'];
        }
        if (empty($data['title'])) {
            throw new BadRequestHttpException("Campo requerido: title");
        }

        $node = Node::create([
            'type' => 'componentes',
            'title' => $data['title'],
            'status' => 1,
        ]);

        $this->fillNodeFields($node, $data);
        $node->save();

        return new JsonResponse([
            'message' => 'Componente creado exitosamente.',
            'id' => $node->id(),
        ], 201);
    }

    private function updateKomponente(Node $node, Request $request)
    {
        $this->requirePermission('administer lubriplanner komponentes api');

        // ✅ Captura frecuencia antes
        $oldFreq = (float) ($node->hasField('field_frecuencia_de_cambio') && !$node->get('field_frecuencia_de_cambio')->isEmpty()
            ? $node->get('field_frecuencia_de_cambio')->value
            : 0);

        $data = $this->validateJson($request);
        if (empty($data['title']) && !empty($data['name'])) {
            $data['title'] = $data['name'];
        }
        if (empty($data['title'])) {
            throw new BadRequestHttpException("Campo requerido: title");
        }

        $node->set('title', $data['title']);
        $this->fillNodeFields($node, $data);
        $node->save();

        // ✅ Captura frecuencia después
        $newFreq = (float) ($node->hasField('field_frecuencia_de_cambio') && !$node->get('field_frecuencia_de_cambio')->isEmpty()
            ? $node->get('field_frecuencia_de_cambio')->value
            : 0);

        // ✅ Si cambió, recalcula servicios activos del componente
        if ($newFreq !== $oldFreq) {
            $this->recalcServiciosActivosDelComponente((int) $node->id(), $newFreq);
        }

        return new JsonResponse([
            'message' => 'Componente actualizado',
            'oldFreq' => $oldFreq,
            'newFreq' => $newFreq,
        ]);
    }


    private function deleteKomponente(Node $node)
    {
        $this->requirePermission('administer lubriplanner komponentes api');
        $node->delete();
        return new JsonResponse(['message' => 'Componente eliminado']);
    }

    // ========================================
    // FORMATEO DEL KOMPONENTE
    // ========================================
    private function formatKomponente(Node $node)
    {
        $getVal = function (string $field) use ($node) {
            if (!$node->hasField($field) || $node->get($field)->isEmpty()) return null;
            return $node->get($field)->value ?? null;
        };

        return [
            'id' => $node->id(),
            'title' => $node->label(),

            // Labels
            'cliente' => $getVal('field_comp_cliente'),
            'activo' => $getVal('field_comp_activo'),
            'equipo' => $getVal('field_comp_equipo'),
            'lubricante' => $getVal('field_comp_lubricante'),
            'lubricante_codigo' => $getVal('field_comp_lubricante_codigo'),

            // IDs (clave para context mode / filtros robustos)
            'cliente_id' => $getVal('field_cliente_comp_id'),
            'activo_id' => $getVal('field_comp_activo_id'),
            'equipo_id' => $getVal('field_comp_equipo_id'),
            'lubricante_id' => $getVal('field_comp_lubricante_id'),

            // Extra info equipo
            'modelo_equipo' => $getVal('field_comp_modelo_equipo'),
            'fabricante_equipo' => $getVal('field_comp_fabricante_equipo'),

            // Frecuencias / volumen / observaciones
            'frecuencia_cambio' => $getVal('field_frecuencia_de_cambio'),
            'frecuencia_muestreo' => $getVal('field_frecuencia_de_muestreo'),
            'volumen_requerido' => $getVal('field_volumen_requerido'),
            'observaciones' => $getVal('field_observaciones'),

            'created' => \Drupal::service('date.formatter')->format($node->getCreatedTime(), 'custom', 'c'),
        ];
    }

    // ========================================
    // RELLENAR CAMPOS
    // ========================================
    private function fillNodeFields(Node $node, array $data)
    {
        // Helper para setear solo si existe el field en Drupal
        $setIfExists = function (string $field, $value) use ($node) {
            if ($node->hasField($field)) {
                $node->set($field, $value);
            }
        };

        // ----------- Cliente / Activo / Equipo -----------
        if (array_key_exists('cliente_id', $data)) {
            $setIfExists('field_cliente_comp_id', $data['cliente_id'] === '' ? null : (int) $data['cliente_id']);
        }
        if (array_key_exists('cliente', $data)) {
            $setIfExists('field_comp_cliente', $data['cliente']);
        }

        if (array_key_exists('activo_id', $data)) {
            $setIfExists('field_comp_activo_id', $data['activo_id'] === '' ? null : (int) $data['activo_id']);
        }
        if (array_key_exists('activo', $data)) {
            $setIfExists('field_comp_activo', $data['activo']);
        }

        if (array_key_exists('equipo_id', $data)) {
            $setIfExists('field_comp_equipo_id', $data['equipo_id'] === '' ? null : (int) $data['equipo_id']);
        }
        if (array_key_exists('equipo', $data)) {
            $setIfExists('field_comp_equipo', $data['equipo']);
        }

        if (array_key_exists('modelo_equipo', $data)) {
            $setIfExists('field_comp_modelo_equipo', $data['modelo_equipo']);
        }
        if (array_key_exists('fabricante_equipo', $data)) {
            $setIfExists('field_comp_fabricante_equipo', $data['fabricante_equipo']);
        }

        // ----------- Lubricante -----------
        if (array_key_exists('lubricante_id', $data)) {
            $setIfExists(
                'field_comp_lubricante_id',
                $data['lubricante_id'] === '' ? null : (int) $data['lubricante_id']
            );
        }
        if (array_key_exists('lubricante', $data)) {
            $setIfExists('field_comp_lubricante', $data['lubricante']);
        }
        if (array_key_exists('lubricante_codigo', $data)) {
            $setIfExists('field_comp_lubricante_codigo', $data['lubricante_codigo']);
        }

        // ----------- Frecuencias / Volumen / Observaciones -----------
        if (array_key_exists('frecuencia_cambio', $data)) {
            $setIfExists('field_frecuencia_de_cambio', $data['frecuencia_cambio'] === '' ? null : $data['frecuencia_cambio']);
        }
        if (array_key_exists('frecuencia_muestreo', $data)) {
            $setIfExists('field_frecuencia_de_muestreo', $data['frecuencia_muestreo'] === '' ? null : $data['frecuencia_muestreo']);
        }
        if (array_key_exists('volumen_requerido', $data)) {
            $setIfExists('field_volumen_requerido', $data['volumen_requerido'] === '' ? null : $data['volumen_requerido']);
        }
        if (array_key_exists('observaciones', $data)) {
            $setIfExists('field_observaciones', $data['observaciones']);
        }
    }

    // ========================================
    // UTILIDADES (reutilizadas)
    // ========================================
    private function getRealMethod(Request $request)
    {
        $override = strtoupper($request->headers->get('X-HTTP-Method-Override', ''));
        return $override ?: $request->getMethod();
    }

    private function validateJson(Request $request, array $required = [])
    {
        $content = $request->getContent();
        if (empty($content)) throw new BadRequestHttpException('JSON vacío');
        $data = json_decode($content, TRUE);
        if (json_last_error() !== JSON_ERROR_NONE) {
            throw new BadRequestHttpException('JSON inválido: ' . json_last_error_msg());
        }
        foreach ($required as $field) {
            if (!isset($data[$field]) || $data[$field] === '') {
                throw new BadRequestHttpException("Campo requerido: $field");
            }
        }
        return $data;
    }

    private function requirePermission($perm)
    {
        if (!$this->currentUser()->hasPermission($perm)) {
            throw new AccessDeniedHttpException();
        }
    }

    private function recalcServiciosActivosDelComponente(int $componente_id, float $frecuencia_horas): void
    {
        if ($frecuencia_horas <= 0) return;

        $activos = ['en_espera', 'agendado', 'notificado'];

        $nids = \Drupal::entityQuery('node')
            ->accessCheck(FALSE)
            ->condition('type', 'servicios')
            ->condition('status', 1)
            ->condition('field_componente.target_id', $componente_id)
            ->condition('field_estado', $activos, 'IN')
            ->execute();

        if (empty($nids)) return;

        $servicios = Node::loadMultiple($nids);

        foreach ($servicios as $serv) {
            $this->recalcFechaProximoServicio($serv, $frecuencia_horas);
            $serv->save();
        }
    }

    private function recalcFechaProximoServicio(Node $serv, float $frecuencia_horas): void
    {
        $fechaUlt = ($serv->hasField('field_fecha_ultimo_servicio') && !$serv->get('field_fecha_ultimo_servicio')->isEmpty())
            ? $serv->get('field_fecha_ultimo_servicio')->value
            : date('Y-m-d');

        $trabajoReal = ($serv->hasField('field_trabajo_real') && !$serv->get('field_trabajo_real')->isEmpty())
            ? (float) $serv->get('field_trabajo_real')->value
            : 0.0;

        // ✅ Si ya fue recalculado (tiene trabajo_real), usa (frecuencia - trabajo_real)
        $deltaHoras = $trabajoReal > 0 ? max(0, $frecuencia_horas - $trabajoReal) : $frecuencia_horas;

        $nextTs = strtotime($fechaUlt) + (int) round($deltaHoras * 3600);
        if ($serv->hasField('field_fecha_proximo_servicio')) {
            $serv->set('field_fecha_proximo_servicio', date('Y-m-d', $nextTs));
        }
    }
}
