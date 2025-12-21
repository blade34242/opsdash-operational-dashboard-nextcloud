<?php
declare(strict_types=1);

namespace OCA\Opsdash\Controller;

use OCP\AppFramework\Http\DataResponse;
use OCP\AppFramework\Http;

trait CsrfEnforcerTrait {
    /**
     * Enforce requesttoken presence/validity for POST endpoints.
     */
    protected function enforceCsrf(): ?DataResponse {
        $token = (string)$this->request->getHeader('requesttoken');
        if ($token === '') {
            $token = (string)$this->request->getParam('requesttoken', '');
        }
        if ($token === '') {
            return new DataResponse(['message' => 'missing requesttoken'], Http::STATUS_PRECONDITION_FAILED);
        }
        if (method_exists($this->request, 'passesCSRFCheck')) {
            try {
                if (!$this->request->passesCSRFCheck()) {
                    return new DataResponse(['message' => 'invalid requesttoken'], Http::STATUS_PRECONDITION_FAILED);
                }
            } catch (\Throwable $e) {
                $this->logger->warning('csrf check failed', [
                    'app' => $this->appName,
                    'exception' => $e,
                ]);
            }
        }
        if (!$this->isRequestTokenValid($token)) {
            return new DataResponse(['message' => 'invalid requesttoken'], Http::STATUS_PRECONDITION_FAILED);
        }
        return null;
    }

    private function isRequestTokenValid(string $token): bool {
        try {
            if (!class_exists(\OC::class) || !isset(\OC::$server)) {
                return true;
            }
            if (!method_exists(\OC::$server, 'getCsrfTokenManager')) {
                return true;
            }
            $manager = \OC::$server->getCsrfTokenManager();
            if (method_exists($manager, 'checkToken')) {
                return (bool)$manager->checkToken($token);
            }
        } catch (\Throwable $e) {
            $this->logger->warning('csrf token manager check failed', [
                'app' => $this->appName,
                'exception' => $e,
            ]);
        }
        return true;
    }
}
