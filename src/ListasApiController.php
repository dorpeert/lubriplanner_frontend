<?php

namespace Drupal\lubriplanner_listas_api\Controller;

use Drupal\Core\Controller\ControllerBase;
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
        $incoming = strtoupper($request->headers->get('X-HTTP-Method-Override'));
        $method = $incoming ?: $request->getMethod();

        if (!Vocabulary::load($vocab)) {
            return new JsonResponse(['error' => "Vocabulario '$vocab' no existe."], 404);
        }

        switch ($method) {
            case 'GET':
                return $this->getAll($vocab);

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
        $incoming = strtoupper($request->headers->get('X-HTTP-Method-Override'));
        $method = $incoming ?: $request->getMethod();

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

    private function getAll($vocab)
    {
        $tids = \Drupal::entityQuery('taxonomy_term')
            ->accessCheck(TRUE)
            ->condition('vid', $vocab)
            ->sort('weight')
            ->sort('name')
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

        return new JsonResponse($data);
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

        $term->setName($data['name']);
        if (isset($data['weight'])) {
            $term->setWeight((int) $data['weight']);
        }
        $term->save();

        return new JsonResponse(['message' => 'Término actualizado.']);
    }

    private function deleteTerm(Term $term)
    {
        $this->requirePermission('administer lubriplanner listas api');
        $term->delete();

        return new JsonResponse(['message' => 'Término eliminado.']);
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

    private function termNameExists($vocab, $name)
    {
        $query = \Drupal::entityQuery('taxonomy_term')
            ->accessCheck(TRUE)
            ->condition('vid', $vocab)
            ->condition('name', $name);

        return (bool) $query->count()->execute();
    }
}
