<?php

namespace Drupal\lubriplanner_clientes_api_v2\Controller;

use Drupal\Core\Controller\ControllerBase;
use Drupal\node\Entity\Node;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Symfony\Component\HttpKernel\Exception\BadRequestHttpException;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;
use Drupal\file\Entity\File;
use Drupal\Core\File\FileSystemInterface;

class ClientesApiController extends ControllerBase
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
                return $this->createCliente($request);
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

        if (!$node || $node->bundle() !== 'clientes') {
            throw new NotFoundHttpException("Cliente $nid no encontrado.");
        }

        switch ($method) {
            case 'GET':
                return $this->getOne($node);
            case 'PATCH':
                return $this->updateCliente($node, $request);
            case 'DELETE':
                return $this->deleteCliente($node);
            default:
                return new JsonResponse(['error' => 'Método no permitido'], 405);
        }
    }

    // ========================================
    // SUBIDA DE LOGO
    // ========================================
    public function uploadImage(Request $request)
    {
        if (empty($_FILES['file']['name'])) {
            return new JsonResponse(['status' => false, 'message' => 'No se recibió ningún archivo'], 400);
        }

        $file = $_FILES['file'];
        $allowed = ['png', 'jpg', 'jpeg', 'gif', 'svg'];
        $ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));

        if (!in_array($ext, $allowed)) {
            return new JsonResponse(['status' => false, 'message' => 'Extensión no permitida'], 400);
        }

        if ($file['size'] > 3 * 1024 * 1024) {
            return new JsonResponse(['status' => false, 'message' => 'Máximo 3MB'], 400);
        }

        try {
            $dir = 'public://clientes/logos';
            \Drupal::service('file_system')->prepareDirectory($dir, FileSystemInterface::CREATE_DIRECTORY);

            $filename = 'logo_' . time() . '_' . preg_replace('/[^a-zA-Z0-9._-]/', '_', $file['name']);
            $dest = $dir . '/' . $filename;

            if (!move_uploaded_file($file['tmp_name'], $dest)) {
                throw new \Exception('Error al mover archivo');
            }

            $file_entity = File::create([
                'uri' => $dest,
                'filename' => $file['name'],
                'filemime' => $file['type'],
                'filesize' => $file['size'],
                'status' => 1,
            ]);
            $file_entity->save();

            $url = \Drupal::service('file_url_generator')->generateAbsoluteString($file_entity->getFileUri());

            return new JsonResponse([
                'status' => true,
                'message' => 'Logo subido',
                'data' => [
                    'fid' => (string) $file_entity->id(),
                    'url' => $url,
                ]
            ]);
        } catch (\Exception $e) {
            \Drupal::logger('lubriplanner_clientes_api_v2')->error($e->getMessage());
            return new JsonResponse(['status' => false, 'message' => 'Error del servidor'], 500);
        }
    }

    // ========================================
    // SUBIDA DE IMAGEN DEL ACTIVO
    // ========================================
    public function uploadActivoImage(Request $request)
    {
        if (empty($_FILES['file']['name'])) {
            return new JsonResponse(['status' => false, 'message' => 'No se recibió ningún archivo'], 400);
        }

        $file = $_FILES['file'];
        $allowed = ['png', 'jpg', 'jpeg', 'gif', 'svg'];
        $ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));

        if (!in_array($ext, $allowed)) {
            return new JsonResponse(['status' => false, 'message' => 'Extensión no permitida'], 400);
        }

        if ($file['size'] > 3 * 1024 * 1024) {
            return new JsonResponse(['status' => false, 'message' => 'Máximo 3MB'], 400);
        }

        try {
            $dir = 'public://clientes/activos';
            \Drupal::service('file_system')->prepareDirectory($dir, FileSystemInterface::CREATE_DIRECTORY);

            $filename = 'activo_' . time() . '_' . preg_replace('/[^a-zA-Z0-9._-]/', '_', $file['name']);
            $dest = $dir . '/' . $filename;

            if (!move_uploaded_file($file['tmp_name'], $dest)) {
                throw new \Exception('Error al mover archivo');
            }

            $file_entity = File::create([
                'uri' => $dest,
                'filename' => $file['name'],
                'filemime' => $file['type'],
                'filesize' => $file['size'],
                'status' => 1,
            ]);
            $file_entity->save();

            $url = \Drupal::service('file_url_generator')->generateAbsoluteString($file_entity->getFileUri());

            return new JsonResponse([
                'status' => true,
                'message' => 'Imagen activo subido',
                'data' => [
                    'fid' => (string) $file_entity->id(),
                    'url' => $url,
                ]
            ]);
        } catch (\Exception $e) {
            \Drupal::logger('lubriplanner_clientes_api_v2')->error($e->getMessage());
            return new JsonResponse(['status' => false, 'message' => 'Error del servidor'], 500);
        }
    }

    // ========================================
    // GET ALL + FILTERS + PAGINACIÓN
    // ========================================
    private function getAll(Request $request)
    {
        $page = (int) $request->query->get('page', 0);
        $limit = (int) $request->query->get('limit', 10);
        if ($limit < 1) $limit = 10;
        if ($page < 0) $page = 0;
        $offset = $page * $limit;

        $filterBag = (array) $request->query->all('filter');

        $getFilter = function (string $key, array $aliases = []) use ($request, $filterBag) {
            $val = $request->query->get($key);
            if ($val === null && array_key_exists($key, $filterBag)) $val = $filterBag[$key];

            foreach ($aliases as $a) {
                if ($val === null && $request->query->get($a) !== null) $val = $request->query->get($a);
                if ($val === null && array_key_exists($a, $filterBag)) $val = $filterBag[$a];
            }

            if (is_array($val)) {
                $arr = array_values(array_filter(array_map(function ($x) {
                    $x = is_string($x) ? trim($x) : (string) $x;
                    return $x === '' ? null : $x;
                }, $val)));
                return $arr ?: null;
            }

            if (is_string($val) && str_contains($val, ',')) {
                $arr = array_values(array_filter(array_map('trim', explode(',', $val))));
                return $arr ?: null;
            }

            $val = is_string($val) ? trim($val) : null;
            return ($val === '') ? null : $val;
        };

        $cliente   = $getFilter('cliente', ['title', 'name']);
        $prestador = $getFilter('prestador_de_servicio', ['field_prestador_de_servicio', 'prestador']);
        $numero    = $getFilter('numero_de_contacto', ['field_numero_de_contacto', 'contacto']);
        $email     = $getFilter('email_contacto', ['email', 'field_email_de_contacto', 'email_de_contacto']);

        $applyFilters = function ($query) use ($cliente, $prestador, $numero, $email) {
            if ($cliente !== null) {
                $query->condition('title', $cliente, 'CONTAINS');
            }

            // Prestador es TEXTO, pero admite multiselect: OR CONTAINS
            if ($prestador !== null) {
                $vals = is_array($prestador) ? $prestador : [$prestador];
                $vals = array_values(array_filter(array_map(function ($x) {
                    $x = is_string($x) ? trim($x) : (string) $x;
                    return $x === '' ? null : $x;
                }, $vals)));

                if (!empty($vals)) {
                    $or = $query->orConditionGroup();
                    foreach ($vals as $v) {
                        $or->condition('field_prestador_de_servicio', $v, 'CONTAINS');
                    }
                    $query->condition($or);
                }
            }

            if ($numero !== null) {
                $query->condition('field_numero_de_contacto', $numero, 'CONTAINS');
            }

            if ($email !== null) {
                $query->condition('field_email_de_contacto', $email, 'CONTAINS');
            }

            return $query;
        };

        $countQuery = \Drupal::entityQuery('node')
            ->accessCheck(TRUE)
            ->condition('type', 'clientes')
            ->condition('status', 1);

        $applyFilters($countQuery);
        $total = (int) $countQuery->count()->execute();

        $listQuery = \Drupal::entityQuery('node')
            ->accessCheck(TRUE)
            ->condition('type', 'clientes')
            ->condition('status', 1);

        $applyFilters($listQuery);

        $nids = $listQuery
            ->sort('title', 'ASC')
            ->range($offset, $limit)
            ->execute();

        $nodes = Node::loadMultiple($nids);

        $data = [];
        foreach ($nodes as $node) {
            $data[] = $this->formatCliente($node);
        }

        return new JsonResponse([
            'data'  => array_values($data),
            'total' => $total,
            'page'  => $page,
            'limit' => $limit,
        ]);
    }

    private function getOne(Node $node)
    {
        return new JsonResponse($this->formatCliente($node));
    }

    // ========================================
    // CREAR / ACTUALIZAR / ELIMINAR
    // ========================================
    private function createCliente(Request $request)
    {
        $this->requirePermission('administer lubriplanner clientes api');

        $data = $this->validateJson($request, ['cliente']);

        $node = Node::create([
            'type' => 'clientes',
            'title' => $data['cliente'],
            'status' => 1,
        ]);

        $this->fillNodeFields($node, $data);
        $node->save();

        return new JsonResponse([
            'message' => 'Cliente creado exitosamente.',
            'id' => (string) $node->id(),
        ], 201);
    }

    private function updateCliente(Node $node, Request $request)
    {
        $this->requirePermission('administer lubriplanner clientes api');

        $data = $this->validateJson($request, ['cliente']);

        $node->set('title', $data['cliente']);
        $this->fillNodeFields($node, $data);
        $node->save();

        return new JsonResponse(['message' => 'Cliente actualizado.']);
    }

    private function deleteCliente(Node $node)
    {
        $this->requirePermission('administer lubriplanner clientes api');
        $node->delete();
        return new JsonResponse(['message' => 'Cliente eliminado']);
    }

    // ========================================
    // FORMATEO
    // ========================================
    private function formatCliente(Node $node)
    {
        $prestador_label = null;
        if ($node->hasField('field_prestador_de_servicio') && !$node->get('field_prestador_de_servicio')->isEmpty()) {
            $prestador_label = $node->get('field_prestador_de_servicio')->value ?? null;
        }

        $logo_url = null;
        if ($node->hasField('field_logo_del_cliente') && !$node->get('field_logo_del_cliente')->isEmpty()) {
            $file = $node->get('field_logo_del_cliente')->entity;
            if ($file) {
                $logo_url = \Drupal::service('file_url_generator')->generateAbsoluteString($file->getFileUri());
            }
        }

        $data = [
            'id' => (string) $node->id(),
            'cliente' => $node->label(),

            // Prestador (texto)
            'prestador_de_servicio' => $prestador_label,
            'field_prestador_de_servicio' => $prestador_label,

            'field_numero_de_contacto' => $node->get('field_numero_de_contacto')->value ?? null,
            'field_email_de_contacto' => $node->get('field_email_de_contacto')->value ?? null,
            'field_enviar_notificaciones' => (bool) ($node->get('field_enviar_notificaciones')->value ?? false),

            'field_logo_del_cliente_url' => $logo_url,
            'field_logo_del_cliente' => $node->hasField('field_logo_del_cliente') && !$node->get('field_logo_del_cliente')->isEmpty()
                ? (string) $node->get('field_logo_del_cliente')->target_id
                : null,

            'created' => date('c', $node->getCreatedTime()),
            'activos' => [],
        ];

        if ($node->hasField('field_activos') && !$node->get('field_activos')->isEmpty()) {
            $data['activos'] = $this->buildActivos($node);
        }

        return $data;
    }

    private function buildActivos(Node $node)
    {
        $items = $node->get('field_activos')->referencedEntities();
        $result = [];

        foreach ($items as $activo) {
            $eq = [];

            if ($activo->hasField('field_eq') && !$activo->get('field_eq')->isEmpty()) {
                foreach ($activo->get('field_eq')->referencedEntities() as $equipo) {
                    $eq[] = [
                        'id' => (string) $equipo->id(),
                        'equipo' => $equipo->get('field_nombre_del_equipo')->value ?? null,
                        'modelo' => $equipo->get('field_modelo')->value ?? null,
                        'fabricante' => $equipo->get('field_fabricante')->value ?? null,
                    ];
                }
            }

            $img_url = null;
            $img_fid = null;
            if ($activo->hasField('field_imagen_del_activo') && !$activo->get('field_imagen_del_activo')->isEmpty()) {
                $img_fid = (string) $activo->get('field_imagen_del_activo')->target_id;
                $file = $activo->get('field_imagen_del_activo')->entity;
                if ($file) {
                    $img_url = \Drupal::service('file_url_generator')->generateAbsoluteString($file->getFileUri());
                }
            }

            $result[] = [
                'activo' => $activo->get('field_nombre_del_activo')->value ?? null,
                'id' => (string) $activo->id(),
                'imagen_del_activo' => $img_url,
                'imagen_fid' => $img_fid, // ✅ CLAVE PARA EDITAR SIN PERDER IMAGEN
                'descripcion' => $activo->hasField('field_descripcion') ? ($activo->get('field_descripcion')->value ?? null) : null,
                'eq' => $eq,
            ];
        }

        return $result;
    }

    // ========================================
    // VALIDAR CAMPO ÚNICO
    // ========================================
    public function validarUnico(Request $request)
    {
        $field = $request->query->get('field');
        $value = trim((string) $request->query->get('value'));
        $exclude = $request->query->get('exclude');

        if (!$field || $value === '') {
            return new JsonResponse(['isUnique' => true]);
        }

        $query = \Drupal::entityQuery('node')
            ->accessCheck(TRUE)
            ->condition('type', 'clientes');

        if ($field === 'title' || $field === 'cliente') {
            $query->condition('title', $value, '=');
        } else {
            $query->condition($field, $value, '=');
        }

        if (!empty($exclude) && is_numeric($exclude)) {
            $query->condition('nid', (int) $exclude, '!=');
        }

        $query->range(0, 1);
        $result = $query->execute();

        return new JsonResponse(['isUnique' => empty($result)]);
    }

    // ========================================
    // UTILIDADES
    // ========================================
    private function getRealMethod(Request $request)
    {
        $override = $request->headers->get('X-HTTP-Method-Override');
        $incoming = $override ? strtoupper((string) $override) : '';
        return $incoming !== '' ? $incoming : strtoupper($request->getMethod());
    }

    private function validateJson(Request $request, array $required = [])
    {
        $content = $request->getContent();
        if (empty($content)) {
            throw new BadRequestHttpException('Cuerpo vacío.');
        }

        $data = json_decode($content, TRUE);
        if (json_last_error() !== JSON_ERROR_NONE) {
            throw new BadRequestHttpException('JSON inválido: ' . json_last_error_msg());
        }

        foreach ($required as $field) {
            if (!isset($data[$field]) || $data[$field] === '') {
                throw new BadRequestHttpException("Campo '$field' es requerido.");
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

    private function fillNodeFields(Node $node, array $data)
    {
        $fields = [
            'field_enviar_notificaciones',
            'field_numero_de_contacto',
            'field_email_de_contacto',
            'field_prestador_de_servicio',
        ];

        foreach ($fields as $field) {
            if (isset($data[$field])) {
                $node->set($field, $data[$field]);
            }
        }

        // Logo cliente
        if (isset($data['field_logo_del_cliente'])) {
            $image_fid = $data['field_logo_del_cliente'];

            if (is_numeric($image_fid)) {
                $file = File::load((int) $image_fid);
                if ($file) {
                    $node->set('field_logo_del_cliente', [
                        'target_id' => (int) $image_fid,
                        'alt' => $data['cliente'] ?? 'Logo del cliente',
                        'title' => $data['cliente'] ?? 'Logo del cliente',
                    ]);
                }
            }
        }

        // ACTIVOS + EQUIPOS
        if (!empty($data['field_activos']) && is_array($data['field_activos'])) {
            $storage = \Drupal::entityTypeManager()->getStorage('paragraph');
            $activo_refs = [];

            foreach ($data['field_activos'] as $activo_data) {
                $activo = $storage->create([
                    'type' => 'activos',
                    'field_nombre_del_activo' => $activo_data['activo'] ?? '',
                ]);

                // Imagen del activo (si viene fid)
                if (!empty($activo_data['imagen_fid']) && is_numeric($activo_data['imagen_fid'])) {
                    $activo->set('field_imagen_del_activo', [
                        'target_id' => (int) $activo_data['imagen_fid'],
                        'alt' => $activo_data['activo'] ?? 'Activo',
                    ]);
                }

                $activo->save();

                if (!empty($activo_data['equipos']) && is_array($activo_data['equipos'])) {
                    $equipo_refs = [];

                    foreach ($activo_data['equipos'] as $eq) {
                        $equipo = $storage->create([
                            'type' => 'equipos',
                            'field_nombre_del_equipo' => $eq['equipo'] ?? '',
                            'field_modelo' => $eq['modelo'] ?? '',
                            'field_fabricante' => $eq['fabricante'] ?? '',
                        ]);
                        $equipo->save();

                        $equipo_refs[] = [
                            'target_id' => $equipo->id(),
                            'target_revision_id' => $equipo->getRevisionId(),
                        ];
                    }

                    $activo->set('field_eq', $equipo_refs);
                    $activo->save();
                }

                $activo_refs[] = [
                    'target_id' => $activo->id(),
                    'target_revision_id' => $activo->getRevisionId(),
                ];
            }

            $node->set('field_activos', $activo_refs);
        }
    }
}
