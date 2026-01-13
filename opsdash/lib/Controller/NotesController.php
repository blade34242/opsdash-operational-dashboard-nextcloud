<?php
declare(strict_types=1);

namespace OCA\Opsdash\Controller;

use OCA\Opsdash\Service\NotesService;
use OCP\AppFramework\Controller;
use OCP\AppFramework\Http;
use OCP\AppFramework\Http\Attribute\NoAdminRequired;
use OCP\AppFramework\Http\Attribute\NoCSRFRequired;
use OCP\AppFramework\Http\DataResponse;
use OCP\IRequest;
use OCP\IUserSession;
use Psr\Log\LoggerInterface;

final class NotesController extends Controller {
    use CsrfEnforcerTrait;
    use RequestGuardTrait;

    private const MAX_OFFSET = 24;
    private const MAX_QUERY_BYTES = 4096;

    public function __construct(
        string $appName,
        IRequest $request,
        private IUserSession $userSession,
        protected LoggerInterface $logger,
        private NotesService $notesService,
    ) {
        parent::__construct($appName, $request);
    }

    #[NoAdminRequired]
    #[NoCSRFRequired]
    public function notes(): DataResponse {
        $uid = (string)($this->userSession->getUser()?->getUID() ?? '');
        if ($uid === '') {
            return new DataResponse(['message' => 'unauthorized'], Http::STATUS_UNAUTHORIZED);
        }
        if ($guard = $this->enforceQueryLength(self::MAX_QUERY_BYTES)) {
            return $guard;
        }

        $range = strtolower((string)$this->request->getParam('range', 'week'));
        if ($range !== 'month') $range = 'week';
        $offset = (int)$this->request->getParam('offset', 0);
        if ($offset > self::MAX_OFFSET) $offset = self::MAX_OFFSET;
        elseif ($offset < -self::MAX_OFFSET) $offset = -self::MAX_OFFSET;

        $payload = $this->notesService->getNotes($uid, $range, $offset);
        return new DataResponse(array_merge(['ok' => true], $payload), Http::STATUS_OK);
    }

    #[NoAdminRequired]
    public function notesSave(): DataResponse {
        $uid = (string)($this->userSession->getUser()?->getUID() ?? '');
        if ($uid === '') {
            return new DataResponse(['message' => 'unauthorized'], Http::STATUS_UNAUTHORIZED);
        }
        if ($csrf = $this->enforceCsrf()) {
            return $csrf;
        }

        $data = $this->readJsonBodyDefault();
        if ($data instanceof DataResponse) {
            return $data;
        }

        $range = strtolower((string)($data['range'] ?? 'week'));
        if ($range !== 'month') $range = 'week';
        $offset = (int)($data['offset'] ?? 0);
        if ($offset > self::MAX_OFFSET) $offset = self::MAX_OFFSET;
        elseif ($offset < -self::MAX_OFFSET) $offset = -self::MAX_OFFSET;
        $text = (string)($data['content'] ?? '');

        if ($this->notesService->saveNotes($uid, $range, $offset, $text)) {
            return new DataResponse(['ok' => true], Http::STATUS_OK);
        }
        return new DataResponse(['message' => 'error'], Http::STATUS_INTERNAL_SERVER_ERROR);
    }
}
