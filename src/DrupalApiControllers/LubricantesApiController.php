<?php

namespace Drupal\lubriplanner_lubricantes_api_v2\Controller;

use Drupal\Core\Controller\ControllerBase;
use Drupal\node\Entity\Node;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Symfony\Component\HttpKernel\Exception\BadRequestHttpException;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;

use Drupal\file\Entity\File;
use Drupal\Core\File\FileSystemInterface;

class LubricantesApiController extends ControllerBase
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
                return $this->createLubricante($request);

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
        if (!$node || $node->bundle() !== 'lubricantes') {
            throw new NotFoundHttpException("Lubricante $nid no encontrado.");
        }

        switch ($method) {
            case 'GET':
                return $this->getOne($node);

            case 'PATCH':
                return $this->updateLubricante($node, $request);

            case 'DELETE':
                return $this->deleteLubricante($node);

            default:
                return new JsonResponse(['error' => 'Método no permitido'], 405);
        }
    }

    // ========================================
    // IMÁGENES
    // =======================================
    public function uploadImage(Request $request)
    {
        // ✅ SIN VALIDACIÓN DE AUTENTICACIÓN (para que React funcione)

        // Verificar archivo
        if (empty($_FILES['file']['name'])) {
            return new JsonResponse([
                'status' => false,
                'message' => 'No se recibió ningún archivo'
            ], 400);
        }

        $file = $_FILES['file'];

        // Validar tipo
        $allowed_extensions = ['png', 'jpg', 'jpeg', 'gif', 'svg'];
        $extension = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
        if (!in_array($extension, $allowed_extensions)) {
            return new JsonResponse([
                'status' => false,
                'message' => 'Tipo no permitido. Usa: PNG, JPG, JPEG, GIF, SVG'
            ], 400);
        }

        // Validar tamaño
        if ($file['size'] > 3 * 1024 * 1024) {
            return new JsonResponse([
                'status' => false,
                'message' => 'Máximo 3MB'
            ], 400);
        }

        try {
            $directory = 'public://lubricantes/images';
            $filesystem = \Drupal::service('file_system');

            if (!$filesystem->prepareDirectory($directory, FileSystemInterface::CREATE_DIRECTORY)) {
                throw new \Exception('Error creando directorio');
            }

            // Nombre único
            $filename = 'lub_' . time() . '_' . preg_replace('/[^a-zA-Z0-9._-]/', '_', $file['name']);
            $destination = $directory . '/' . $filename;

            // Mover archivo
            if (!move_uploaded_file($file['tmp_name'], $destination)) {
                throw new \Exception('Error moviendo archivo');
            }

            // Crear File entity
            $file_entity = File::create([
                'uri' => $destination,
                'filename' => $file['name'],
                'filemime' => $file['type'],
                'filesize' => $file['size'],
                'status' => 1,
            ]);
            $file_entity->save();

            // URLs
            $url_generator = \Drupal::service('file_url_generator');
            $absolute_url = $url_generator->generateAbsoluteString($file_entity->getFileUri());
            $relative_url = str_replace('public://', '/web/sites/default/files/', $file_entity->getFileUri());

            return new JsonResponse([
                'status' => true,
                'message' => 'Imagen subida correctamente',
                'data' => [
                    'fid' => $file_entity->id(),
                    'filename' => $file['name'],
                    'url' => $absolute_url,
                    'relative_url' => $relative_url,
                    'filesize' => $file['size']
                ]
            ]);
        } catch (\Exception $e) {
            \Drupal::logger('lubriplanner_lubricantes_api_v2')->error('Upload: @msg', ['@msg' => $e->getMessage()]);
            return new JsonResponse([
                'status' => false,
                'message' => 'Error: ' . $e->getMessage()
            ], 500);
        }
    }

    // ========================================
    // MÉTODOS PRIVADOS
    // ========================================

    private function getAll(Request $request)
    {
        // ========================================
        // Pagination: soporta page/limit y page[limit]/page[offset]
        // ========================================
        $page = 0;
        $limit = (int) $request->query->get('limit', 10);

        $pageBag = $request->query->get('page'); // puede ser array o scalar
        $pageLimit  = is_array($pageBag) ? ($pageBag['limit'] ?? null) : null;
        $pageOffset = is_array($pageBag) ? ($pageBag['offset'] ?? null) : null;

        if (is_numeric($pageLimit)) {
            $limit = (int) $pageLimit;
        }
        if ($limit < 1) $limit = 10;

        if (is_numeric($pageOffset)) {
            $offset = (int) $pageOffset;
            $page = (int) floor($offset / $limit);
        } else {
            $pageScalar = $request->query->get('page', 0);
            $page = is_numeric($pageScalar) ? (int) $pageScalar : 0;
            if ($page < 0) $page = 0;
            $offset = $page * $limit;
        }

        // ========================================
        // Sort: soporta sort=codigo y sort=-codigo
        // ========================================
        $sortParam = (string) $request->query->get('sort', 'title');
        $sortDir = 'ASC';
        if ($sortParam !== '' && $sortParam[0] === '-') {
            $sortDir = 'DESC';
            $sortParam = substr($sortParam, 1);
        }

        $sortMap = [
            'title' => 'title',
            'name' => 'title',
            'codigo' => 'field_codigo',
            'created' => 'created',
        ];

        $sortField = $sortMap[$sortParam] ?? 'title';


        // ========================================
        // Filters (incluye filter[search] para autocomplete)
        // ========================================
        $allQuery = $request->query->all();
        $filterBag = $allQuery['filter'] ?? [];

        // Helper para tomar filtros: acepta ?codigo= o ?filter[codigo]=
        $getFilter = function (string $key) use ($request, $filterBag) {
            $v = $request->query->get($key);
            if ($v === null && is_array($filterBag) && array_key_exists($key, $filterBag)) {
                $v = $filterBag[$key];
            }
            return $v;
        };

        // search unificado (GenericAutocomplete envía filter[search])
        $search = $getFilter('search');
        if ($search === null) {
            $search = $request->query->get('q'); // fallback opcional
        }

        // multiselect filters (CSV -> array)
        $origen = $this->normalizeFilterValue($filterBag['origen'] ?? null);
        $clasificacion = $this->normalizeFilterValue($filterBag['clasificacion'] ?? null);
        $fabricante = $this->normalizeFilterValue($filterBag['fabricante'] ?? null);
        $tipo = $this->normalizeFilterValue($filterBag['tipo_de_lubricante'] ?? null);

        // Mapa: filtros del frontend -> campos Drupal
        $map = [
            'title' => 'title',
            'name' => 'title',

            'codigo' => 'field_codigo',
            'descripcion' => 'field_descripcion',
            'clasificacion' => 'field_clasificacion',
            'empaque' => 'field_empaque',
            'lob' => 'field_lob',
            'fabricante' => 'field_fabricante',
            'origen' => 'field_origen',
            'tipo_de_lubricante' => 'field_tipo_de_lubricante',
            'familia' => 'field_familia',
        ];

        // Detectar si un campo es entity_reference para filtrar por target_id si aplica
        $storage = \Drupal::service('entity_field.manager')
            ->getFieldStorageDefinitions('node', 'lubricantes');

        $isEntityRef = function (string $fieldName) use ($storage): bool {
            if (!isset($storage[$fieldName])) return false;
            return $storage[$fieldName]->getType() === 'entity_reference';
        };

        // Aplica filtros al query
        $applyFilters = function ($query) use ($map, $getFilter, $isEntityRef, $search) {

            $search = $filterBag['search'] ?? null;

            if ($search !== null && trim((string)$search) !== '') {
                $s = trim((string)$search);
                $group = $query->orConditionGroup()
                    ->condition('title', $s, 'CONTAINS')
                    ->condition('field_codigo', $s, 'CONTAINS');
                $query->condition($group);
            }

            foreach ($map as $param => $field) {
                $val = $getFilter($param);
                if ($val === null || $val === '' || $val === []) continue;

                // ✅ Si viene como "a,b,c" conviértelo a array para usar IN (multiselect)
                if (is_string($val)) {
                    $val = trim($val);
                    if ($val === '') continue;

                    // soporta CSV: "6,91"
                    if (str_contains($val, ',')) {
                        $val = array_values(array_filter(array_map('trim', explode(',', $val))));
                    }
                }


                // Multiselect (array)
                if (is_array($val)) {
                    $vals = array_values(array_filter($val, fn($x) => $x !== null && $x !== ''));
                    if (empty($vals)) continue;

                    // si es entity_reference -> target_id
                    if ($field !== 'title' && $isEntityRef($field)) {
                        $query->condition($field . '.target_id', $vals, 'IN');
                    } else {
                        $query->condition($field, $vals, 'IN');
                    }
                    continue;
                }

                // Texto (string)
                $val = is_string($val) ? trim($val) : $val;
                if ($val === '') continue;

                // title CONTAINS, fields texto CONTAINS
                $query->condition($field, $val, 'CONTAINS');
            }
        };

        // 1) Total con filtros
        $countQuery = \Drupal::entityQuery('node')
            ->accessCheck(TRUE)
            ->condition('type', 'lubricantes')
            ->condition('status', 1);

        $applyFilters($countQuery);
        $total = (int) $countQuery->count()->execute();

        // 2) Data paginada con filtros
        $listQuery = \Drupal::entityQuery('node')
            ->accessCheck(TRUE)
            ->condition('type', 'lubricantes')
            ->condition('status', 1);

        $applyFilters($listQuery);

        $nids = $listQuery
            ->sort($sortField, $sortDir)
            ->range($offset, $limit)
            ->execute();

        $nodes = Node::loadMultiple($nids);
        $data = array_map([$this, 'formatLubricante'], $nodes);

        return new JsonResponse([
            'data' => array_values($data),
            'total' => $total,
            'page' => (int) $page,
            'limit' => (int) $limit,
        ]);
    }



    private function getOne(Node $node)
    {
        return new JsonResponse($this->formatLubricante($node));
    }

    private function createLubricante(Request $request)
    {
        $this->requirePermission('administer lubriplanner lubricantes api');

        $data = $this->validateJson($request, ['title']);

        $node = Node::create([
            'type' => 'lubricantes',
            'title' => $data['title'],
            'status' => 1,
        ]);

        $this->fillNodeFields($node, $data);
        $node->save();

        return new JsonResponse([
            'message' => 'Lubricante creado exitosamente.',
            'id' => $node->id(),
        ], 201);
    }

    private function updateLubricante(Node $node, Request $request)
    {
        $this->requirePermission('administer lubriplanner lubricantes api');

        $data = $this->validateJson($request, ['title']);

        $node->set('title', $data['title']);
        $this->fillNodeFields($node, $data);
        $node->save();

        return new JsonResponse(['message' => 'Lubricante actualizado.']);
    }

    private function deleteLubricante(Node $node)
    {
        $this->requirePermission('administer lubriplanner lubricantes api');
        $node->delete();

        return new JsonResponse(['message' => 'Lubricante eliminado.']);
    }

    // ========================================
    // UTILIDADES (igual que en listas)
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

    public function validarCodigo(Request $request)
    {
        $codigo = trim($request->query->get('codigo'));
        $exclude = $request->query->get('exclude');

        if ($codigo === '') {
            return new JsonResponse(['isUnique' => true]);
        }

        $query = \Drupal::entityQuery('node')
            ->accessCheck(TRUE)
            ->condition('type', 'lubricantes')
            ->condition('field_codigo', $codigo, '='); // 👈 EXACT MATCH

        if (!empty($exclude) && is_numeric($exclude)) {
            $query->condition('nid', (int) $exclude, '!=');
        }

        $query->range(0, 1);

        $result = $query->execute();

        return new JsonResponse([
            'isUnique' => empty($result), // 👈 SI NO EXISTE → true
        ]);
    }

    public function validarUnico(Request $request)
    {
        $field = $request->query->get('field');
        $value = trim($request->query->get('value'));
        $exclude = $request->query->get('exclude');

        if (!$field || $value === '') {
            return new JsonResponse(['isUnique' => true]);
        }

        $query = \Drupal::entityQuery('node')
            ->accessCheck(TRUE)
            ->condition('type', 'lubricantes');

        // 🔑 title es propiedad base
        if ($field === 'title') {
            $query->condition('title', $value, '=');
        } else {
            $query->condition($field, $value, '=');
        }

        if (!empty($exclude) && is_numeric($exclude)) {
            $query->condition('nid', (int) $exclude, '!=');
        }

        $query->range(0, 1);
        $result = $query->execute();

        return new JsonResponse([
            'isUnique' => empty($result),
        ]);
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
            'field_codigo',
            'field_descripcion',
            'field_clasificacion',
            'field_empaque',
            'field_lob',
            'field_fabricante',
            'field_origen',
            'field_tipo_de_lubricante',
            'field_galones_empaque',
            'field_especificaciones',
            'field_familia',
        ];

        foreach ($fields as $field) {
            if (isset($data[$field])) {
                $node->set($field, $data[$field]);
            }
        }

        // ✅ NUEVO: MANEJO ESPECIAL PARA IMÁGENES
        if (isset($data['field_imagen_del_lubricante'])) {
            $image_fid = $data['field_imagen_del_lubricante'];

            if (is_numeric($image_fid)) {
                // Es un FID - cargar archivo y asignar
                $file = \Drupal\file\Entity\File::load($image_fid);
                if ($file) {
                    $node->set('field_imagen_del_lubricante', [
                        'target_id' => $image_fid,
                        'alt' => $data['title'] ?? 'Imagen de lubricante',
                        'title' => $data['title'] ?? 'Imagen de lubricante',
                    ]);
                    \Drupal::logger('lubriplanner_lubricantes_api_v2')->notice('Imagen asignada: FID @fid a nodo @nid', [
                        '@fid' => $image_fid,
                        '@nid' => $node->id()
                    ]);
                }
            } else {
                // Es una URL - intentar procesar
                \Drupal::logger('lubriplanner_lubricantes_api_v2')->warning('URL de imagen recibida: @url', ['@url' => $image_fid]);
            }
        }
    }

    public function formatLubricante(Node $node)
    {
        $fileAbsUrl = function (string $field) use ($node) {
            if (!$node->hasField($field) || $node->get($field)->isEmpty()) {
                return null;
            }

            $file = $node->get($field)->entity;
            if (!$file) return null;

            return \Drupal::service('file_url_generator')
                ->generateAbsoluteString($file->getFileUri());
        };

        $fileFid = function (string $field) use ($node) {
            if (!$node->hasField($field) || $node->get($field)->isEmpty()) {
                return null;
            }
            return (string) $node->get($field)->target_id;
        };

        return [
            'id' => (string) $node->id(),
            'title' => $node->label(),
            'codigo' => $node->get('field_codigo')->value ?? null,
            'descripcion' => $node->get('field_descripcion')->value ?? null,

            // ✅ URL absoluta para preview
            'imagen_del_lubricante' => $fileAbsUrl('field_imagen_del_lubricante'),

            // ✅ (recomendado) fid para conservar imagen en edición
            'field_imagen_del_lubricante' => $fileFid('field_imagen_del_lubricante'),

            'clasificacion' => $node->get('field_clasificacion')->value ?? null,
            'empaque' => $node->get('field_empaque')->value ?? null,
            'lob' => $node->get('field_lob')->value ?? null,
            'fabricante' => $node->get('field_fabricante')->value ?? null,
            'origen' => $node->get('field_origen')->value ?? null,
            'tipo_lubricante' => $node->get('field_tipo_de_lubricante')->value ?? null,
            'galones_empaque' => $node->get('field_galones_empaque')->value ?? null,
            'especificaciones' => $node->get('field_especificaciones')->value ?? null,
            'familia' => $node->get('field_familia')->value ?? null,
            'created' => \Drupal::service('date.formatter')->format($node->getCreatedTime(), 'custom', 'c'),
        ];
    }


    private function normalizeFilterValue($value): array
    {
        if ($value === null || $value === '') return [];

        // Si llega como array (por si luego cambias el frontend a filter[x][]=a&filter[x][]=b)
        if (is_array($value)) {
            return array_values(array_filter(array_map('trim', $value), fn($v) => $v !== ''));
        }

        // Si llega CSV: "A,B,C"
        $parts = array_map('trim', explode(',', (string) $value));
        return array_values(array_filter($parts, fn($v) => $v !== ''));
    }
}
