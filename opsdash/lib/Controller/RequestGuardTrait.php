<?php
declare(strict_types=1);

namespace OCA\Opsdash\Controller;

use OCP\AppFramework\Http\DataResponse;
use OCP\AppFramework\Http;

trait RequestGuardTrait {
    protected function defaultMaxBodyBytes(): int {
        return 262144;
    }

    protected function defaultMaxJsonDepth(): int {
        return 16;
    }

    /**
     * Enforce an upper bound for GET query length.
     */
    protected function enforceQueryLength(int $maxBytes): ?DataResponse {
        $raw = $_SERVER['QUERY_STRING'] ?? '';
        if (!is_string($raw)) {
            return null;
        }
        if (strlen($raw) > $maxBytes) {
            return new DataResponse(['message' => 'query too large'], Http::STATUS_REQUEST_URI_TOO_LONG);
        }
        return null;
    }

    /**
     * Read and decode JSON body with size/depth guards.
     *
     * @return array<string, mixed>|DataResponse
     */
    protected function readJsonBody(int $maxBytes, int $maxDepth): array|DataResponse {
        $raw = $this->readRawBody();
        if (strlen($raw) > $maxBytes) {
            return new DataResponse(['message' => 'payload too large'], Http::STATUS_REQUEST_ENTITY_TOO_LARGE);
        }
        $data = json_decode($raw, true, $maxDepth);
        if (!is_array($data)) {
            return new DataResponse(['message' => 'invalid json'], Http::STATUS_BAD_REQUEST);
        }
        return $data;
    }

    /**
     * @return array<string, mixed>|DataResponse
     */
    protected function readJsonBodyDefault(): array|DataResponse {
        return $this->readJsonBody($this->defaultMaxBodyBytes(), $this->defaultMaxJsonDepth());
    }

    protected function readRawBody(): string {
        return file_get_contents('php://input') ?: '';
    }
}
