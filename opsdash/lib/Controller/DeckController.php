<?php
declare(strict_types=1);

namespace OCA\Opsdash\Controller;

use OCA\Opsdash\Service\DeckDataService;
use OCP\AppFramework\Controller;
use OCP\AppFramework\Http;
use OCP\AppFramework\Http\Attribute\NoAdminRequired;
use OCP\AppFramework\Http\Attribute\NoCSRFRequired;
use OCP\AppFramework\Http\DataResponse;
use OCP\IRequest;
use OCP\IUserSession;
use Psr\Log\LoggerInterface;

final class DeckController extends Controller {
    use RequestGuardTrait;

    private const MAX_QUERY_BYTES = 4096;

    public function __construct(
        string $appName,
        IRequest $request,
        private IUserSession $userSession,
        private LoggerInterface $logger,
        private DeckDataService $deckDataService,
    ) {
        parent::__construct($appName, $request);
    }

    #[NoAdminRequired]
    #[NoCSRFRequired]
    public function boards(): DataResponse {
        $uid = (string)($this->userSession->getUser()?->getUID() ?? '');
        if ($uid === '') {
            return new DataResponse(['message' => 'unauthorized'], Http::STATUS_UNAUTHORIZED);
        }
        if ($guard = $this->enforceQueryLength(self::MAX_QUERY_BYTES)) {
            return $guard;
        }

        $boards = $this->deckDataService->fetchBoards($uid);
        return new DataResponse(['ok' => true, 'boards' => $boards], Http::STATUS_OK);
    }

    #[NoAdminRequired]
    #[NoCSRFRequired]
    public function cards(): DataResponse {
        $uid = (string)($this->userSession->getUser()?->getUID() ?? '');
        if ($uid === '') {
            return new DataResponse(['message' => 'unauthorized'], Http::STATUS_UNAUTHORIZED);
        }
        if ($guard = $this->enforceQueryLength(self::MAX_QUERY_BYTES)) {
            return $guard;
        }

        $from = (string)$this->request->getParam('from', '');
        $to = (string)$this->request->getParam('to', '');
        $includeArchived = $this->toBool($this->request->getParam('includeArchived', null), true);
        $includeCompleted = $this->toBool($this->request->getParam('includeCompleted', null), true);

        try {
            $result = $this->deckDataService->fetchCards($uid, $from, $to, $includeArchived, $includeCompleted);
            return new DataResponse([
                'ok' => true,
                'cards' => $result['cards'] ?? [],
                'truncated' => (bool)($result['truncated'] ?? false),
                'rangeTruncated' => (bool)($result['rangeTruncated'] ?? false),
            ], Http::STATUS_OK);
        } catch (\Throwable $e) {
            $this->logger->error('Deck cards load failed: ' . $e->getMessage(), ['app' => 'opsdash']);
            return new DataResponse(['message' => 'deck_unavailable'], Http::STATUS_SERVICE_UNAVAILABLE);
        }
    }

    private function toBool(mixed $value, bool $default): bool {
        if ($value === null) {
            return $default;
        }
        if (is_bool($value)) {
            return $value;
        }
        if (is_numeric($value)) {
            return (int)$value !== 0;
        }
        if (is_string($value)) {
            $normalized = strtolower(trim($value));
            if (in_array($normalized, ['1', 'true', 'yes', 'on'], true)) {
                return true;
            }
            if (in_array($normalized, ['0', 'false', 'no', 'off'], true)) {
                return false;
            }
        }
        return $default;
    }
}
