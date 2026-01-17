<?php

namespace Drupal\lubriplanner_listas_api\Controller;

use Drupal\Core\Controller\ControllerBase;
use Drupal\field\Entity\FieldStorageConfig;
use Drupal\field\Entity\FieldConfig;
use Drupal\Core\Entity\EntityStorageException;
use Drupal\taxonomy\Entity\Term;
use Drupal\taxonomy\Entity\Vocabulary;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Symfony\Component\HttpKernel\Exception\BadRequestHttpException;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;

/**
 * API REST para gestionar términos de taxonomía (listas).
 */
class ListasApiController extends ControllerBase
{

    /**
     * Responde a GET (lista) o POST (crear).
     */
    public function collection($vocab, Request $request)
    {
        // Override seguro
        $override = $request->headers->get('X-HTTP-Method-Override');
        $incoming = $override ? strtoupper((string) $override) : '';
        $method = $incoming !== '' ? $incoming : strtoupper($request->getMethod());

        if (!Vocabulary::load($vocab)) {
            return new JsonResponse(['error' => "Vocabulario '$vocab' no existe."], 404);
        }

        switch ($method) {
            case 'GET':
                return $this->getAll($vocab, $request);

            case 'POST':
                return $this->createTerm($vocab, $request);

            default:
                return new JsonResponse(['error' => 'Método no permitido'], 405);
        }
    }

    /**
     * Responde a GET (uno), PATCH (actualizar), DELETE (eliminar).
     */
    public function item($vocab, $tid, Request $request)
    {
        // Override seguro
        $override = $request->headers->get('X-HTTP-Method-Override');
        $incoming = $override ? strtoupper((string) $override) : '';
        $method = $incoming !== '' ? $incoming : strtoupper($request->getMethod());

        $vocabulary = Vocabulary::load($vocab);
        if (!$vocabulary) {
            return new JsonResponse(['error' => "Vocabulario '$vocab' no existe."], 404);
        }

        $term = Term::load($tid);
        if (!$term || $term->bundle() !== $vocab) {
            return new JsonResponse(['error' => "Término $tid no encontrado."], 404);
        }

        switch ($method) {
            case 'GET':
                return $this->getOne($term);

            case 'PATCH':
                return $this->updateTerm($term, $request);

            case 'DELETE':
                return $this->deleteTerm($term);

            default:
                return new JsonResponse(['error' => 'Método no permitido'], 405);
        }
    }

    // ========================================
    // MÉTODOS PRIVADOS
    // ========================================

    private function getAll($vocab, Request $request)
    {
        $page = (int) $request->query->get('page', 0);
        $limit = (int) $request->query->get('limit', 10);

        if ($limit < 1) $limit = 10;
        if ($page < 0) $page = 0;

        $offset = $page * $limit;

        // ✅ FIX: no usar get('filter', []) porque Symfony espera scalar
        $filterBag = (array) $request->query->all('filter');

        $name = $request->query->get('name');
        if ($name === null && isset($filterBag['name'])) {
            $name = $filterBag['name'];
        }

        $name = is_string($name) ? trim($name) : null;
        if ($name === '') $name = null;

        // 1) Total con filtro si aplica
        $countQuery = \Drupal::entityQuery('taxonomy_term')
            ->accessCheck(TRUE)
            ->condition('vid', $vocab);

        if ($name !== null) {
            $countQuery->condition('name', $name, 'CONTAINS');
        }

        $total = (int) $countQuery->count()->execute();

        // 2) Data paginada con filtro si aplica
        $listQuery = \Drupal::entityQuery('taxonomy_term')
            ->accessCheck(TRUE)
            ->condition('vid', $vocab);

        if ($name !== null) {
            $listQuery->condition('name', $name, 'CONTAINS');
        }

        $tids = $listQuery
            ->sort('weight')
            ->sort('name')
            ->range($offset, $limit)
            ->execute();

        $terms = Term::loadMultiple($tids);

        $data = [];
        foreach ($terms as $term) {
            $data[] = [
                'tid' => $term->id(),
                'name' => $term->label(),
                'weight' => $term->getWeight(),
            ];
        }

        return new JsonResponse([
            'data' => $data,
            'total' => $total,
            'page' => $page,
            'limit' => $limit,
        ]);
    }





    private function getOne(Term $term)
    {
        return new JsonResponse([
            'tid' => $term->id(),
            'name' => $term->label(),
            'weight' => $term->getWeight(),
            'vid' => $term->bundle(),
        ]);
    }

    private function createTerm($vocab, Request $request)
    {
        $this->requirePermission('administer lubriplanner listas api');

        $data = $this->validateJson($request, ['name']);
        $data['name'] = trim($data['name']);

        // VALIDAR DUPLICADO
        if ($this->termNameExists($vocab, $data['name'])) {
            return new JsonResponse([
                'message' => 'Los datos enviados no son válidos.',
                'errors' => [
                    'name' => ['Este nombre ya existe.']
                ],
            ], 422);
        }

        $weight = isset($data['weight']) ? (int) $data['weight'] : 0;

        $term = Term::create([
            'vid' => $vocab,
            'name' => $data['name'],
            'weight' => $weight,
        ]);

        $term->save();

        return new JsonResponse([
            'message' => 'Término creado exitosamente.',
            'tid' => $term->id(),
            'name' => $term->label(),
        ], 201);
    }

    private function updateTerm(Term $term, Request $request)
    {
        $this->requirePermission('administer lubriplanner listas api');

        $data = $this->validateJson($request, ['name']);
        $newName = trim($data['name']);

        // ✅ VALIDAR DUPLICADO (excluyendo el mismo tid)
        if ($this->termNameExists($term->bundle(), $newName, (int) $term->id())) {
            return new JsonResponse([
                'message' => 'Los datos enviados no son válidos.',
                'errors' => [
                    'name' => ['Este nombre ya existe.']
                ],
            ], 422);
        }

        $term->setName($newName);

        if (isset($data['weight'])) {
            $term->setWeight((int) $data['weight']);
        }

        $term->save();

        return new JsonResponse(['message' => 'Término actualizado.']);
    }


    private function deleteTerm(Term $term)
    {
        $this->requirePermission('administer lubriplanner listas api');

        $vocab = $term->bundle();
        $tid = (int) $term->id();

        // ✅ Chequeo pro de uso antes de borrar
        $usage = $this->getTermUsageReport($vocab, $tid, 5);

        if (!empty($usage['total'])) {
            return new JsonResponse([
                'message' => 'No se puede eliminar porque este elemento está siendo utilizado.',
                'term' => [
                    'tid' => $tid,
                    'name' => $term->label(),
                    'vid' => $vocab,
                ],
                'usage' => $usage,
            ], 409);
        }

        try {
            $term->delete();
            return new JsonResponse(['message' => 'Término eliminado.']);
        } catch (EntityStorageException $e) {
            return new JsonResponse([
                'message' => 'No se pudo eliminar el término.',
                'details' => $e->getMessage(),
            ], 409);
        } catch (\Throwable $e) {
            return new JsonResponse([
                'message' => 'Error interno al eliminar el término.',
                'details' => $e->getMessage(),
            ], 500);
        }
    }



    // ========================================
    // UTILIDADES
    // ========================================

    private function validateJson(Request $request, array $required)
    {
        $content = $request->getContent();
        if (empty($content)) {
            throw new BadRequestHttpException('Cuerpo de la solicitud vacío.');
        }

        $decoded = json_decode($content, TRUE);
        if (json_last_error() !== JSON_ERROR_NONE) {
            throw new BadRequestHttpException('JSON inválido: ' . json_last_error_msg());
        }

        foreach ($required as $field) {
            if (empty($decoded[$field])) {
                throw new BadRequestHttpException("Campo '$field' es requerido.");
            }
        }

        return $decoded;
    }

    private function requirePermission($permission)
    {
        if (!$this->currentUser()->hasPermission($permission)) {
            throw new AccessDeniedHttpException();
        }
    }

    private function termNameExists($vocab, $name, $excludeTid = null)
    {
        $query = \Drupal::entityQuery('taxonomy_term')
            ->accessCheck(TRUE)
            ->condition('vid', $vocab)
            ->condition('name', $name);

        // ✅ excluir el término actual cuando editas
        if (!empty($excludeTid)) {
            $query->condition('tid', (int) $excludeTid, '!=');
        }

        return (bool) $query->count()->execute();
    }

    private function isTermInUse(Term $term): bool
    {
        $tid = (int) $term->id();

        $entityTypeManager = \Drupal::entityTypeManager();
        $fieldManager = \Drupal::service('entity_field.manager');

        // Recorre todos los tipos de entidad que tengan "bundle" (nodos, párrafos, etc.)
        foreach ($entityTypeManager->getDefinitions() as $entityTypeId => $definition) {
            if (!$definition->entityClassImplements('\Drupal\Core\Entity\ContentEntityInterface')) {
                continue;
            }

            // Algunos tipos no tienen bundles; usamos '__' para field definitions base
            $bundles = [];
            if ($definition->hasKey('bundle')) {
                $bundles = array_keys($entityTypeManager->getBundleInfo($entityTypeId));
            } else {
                $bundles = ['__'];
            }

            foreach ($bundles as $bundle) {
                $fields = $fieldManager->getFieldDefinitions($entityTypeId, $bundle === '__' ? $entityTypeId : $bundle);

                foreach ($fields as $fieldName => $fieldDef) {
                    // Solo campos entity_reference a taxonomy_term
                    if ($fieldDef->getType() !== 'entity_reference') {
                        continue;
                    }

                    $settings = $fieldDef->getSettings();
                    if (($settings['target_type'] ?? null) !== 'taxonomy_term') {
                        continue;
                    }

                    // Consulta rápida: ¿existe alguna entidad que referencie este tid?
                    try {
                        $q = \Drupal::entityQuery($entityTypeId)
                            ->accessCheck(TRUE)
                            ->condition($fieldName, $tid)
                            ->range(0, 1);

                        $ids = $q->execute();
                        if (!empty($ids)) {
                            return TRUE; // Está en uso
                        }
                    } catch (\Throwable $e) {
                        // Si algún query falla por un campo/bundle especial, lo ignoramos y seguimos.
                        continue;
                    }
                }
            }
        }

        return FALSE;
    }

    /**
     * Devuelve un reporte de entidades/campos donde se usa el término.
     *
     * @return array {
     *   total: int,
     *   items: array<array{
     *     entity_type: string,
     *     bundle: string,
     *     field: string,
     *     field_label: string,
     *     count: int,
     *     sample_ids: array<int|string>
     *   }>
     * }
     */
    private function getTermUsageReport(string $vocab, int $tid, int $sampleLimit = 5): array
    {
        $items = [];
        $total = 0;

        // 1) Encontrar field storages que referencien taxonomy_term
        $storages = \Drupal::entityTypeManager()
            ->getStorage('field_storage_config')
            ->loadMultiple();

        foreach ($storages as $storage) {
            if (!$storage instanceof FieldStorageConfig) {
                continue;
            }

            // Solo entity_reference a taxonomy_term
            if ($storage->getType() !== 'entity_reference') {
                continue;
            }

            $settings = $storage->getSettings();
            if (($settings['target_type'] ?? null) !== 'taxonomy_term') {
                continue;
            }

            $entityType = $storage->getTargetEntityTypeId();
            $fieldName = $storage->getName();

            // 2) Por cada bundle donde el campo existe (FieldConfig)
            $fieldConfigs = \Drupal::entityTypeManager()
                ->getStorage('field_config')
                ->loadByProperties([
                    'field_name' => $fieldName,
                    'entity_type' => $entityType,
                ]);

            foreach ($fieldConfigs as $fc) {
                if (!$fc instanceof FieldConfig) {
                    continue;
                }

                $bundle = $fc->getTargetBundle();

                // 3) Ver si ese field config está restringido al vocab actual
                // handler_settings[target_bundles] suele traer los vocabs permitidos.
                $handlerSettings = $fc->getSetting('handler_settings') ?? [];
                $targetBundles = $handlerSettings['target_bundles'] ?? null;

                // Si hay restricción y NO incluye este vocab, saltar.
                if (is_array($targetBundles) && !isset($targetBundles[$vocab])) {
                    continue;
                }

                // 4) Contar referencias
                try {
                    $countQuery = \Drupal::entityQuery($entityType)
                        ->accessCheck(TRUE)
                        ->condition($fieldName, $tid)
                        ->condition('type', $bundle);

                    $count = (int) $countQuery->count()->execute();

                    if ($count <= 0) {
                        continue;
                    }

                    // 5) Sacar ejemplos
                    $sampleQuery = \Drupal::entityQuery($entityType)
                        ->accessCheck(TRUE)
                        ->condition($fieldName, $tid)
                        ->condition('type', $bundle)
                        ->range(0, $sampleLimit);

                    $sampleIds = array_values($sampleQuery->execute());

                    $total += $count;

                    $items[] = [
                        'entity_type' => $entityType,
                        'bundle' => $bundle,
                        'field' => $fieldName,
                        'field_label' => (string) $fc->getLabel(),
                        'count' => $count,
                        'sample_ids' => $sampleIds,
                    ];
                } catch (\Throwable $e) {
                    // Si algún entity type/bundle no soporta "type" o falla, no tumbar todo.
                    // Puedes loguearlo si quieres:
                    // \Drupal::logger('lubriplanner_listas_api')->warning($e->getMessage());
                    continue;
                }
            }
        }

        return [
            'total' => $total,
            'items' => $items,
        ];
    }
}
