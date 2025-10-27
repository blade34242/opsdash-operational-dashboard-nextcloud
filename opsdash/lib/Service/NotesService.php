<?php
declare(strict_types=1);

namespace OCA\Opsdash\Service;

use OCP\IConfig;
use Psr\Log\LoggerInterface;

class NotesService {
    public function __construct(
        private IConfig $config,
        private CalendarService $calendarService,
        private LoggerInterface $logger,
        private string $appName,
    ) {
    }

    public function getNotes(string $uid, string $range, int $offset): array {
        [$fromCur] = $this->calendarService->rangeBounds($range, $offset);
        [$fromPrev] = $this->calendarService->rangeBounds($range, $offset - 1);

        $keyCurrent = $this->calendarService->notesKey($range, $fromCur);
        $keyPrevious = $this->calendarService->notesKey($range, $fromPrev);

        $current = (string)$this->config->getUserValue($uid, $this->appName, $keyCurrent, '');
        $previous = (string)$this->config->getUserValue($uid, $this->appName, $keyPrevious, '');

        return [
            'period' => [
                'type' => $range,
                'current_from' => $fromCur->format('Y-m-d'),
                'previous_from' => $fromPrev->format('Y-m-d'),
            ],
            'notes' => [
                'current' => $current,
                'previous' => $previous,
            ],
        ];
    }

    public function saveNotes(string $uid, string $range, int $offset, string $content): bool {
        if (strlen($content) > 32768) {
            $content = substr($content, 0, 32768);
        }

        [$fromCur] = $this->calendarService->rangeBounds($range, $offset);
        $key = $this->calendarService->notesKey($range, $fromCur);

        try {
            $this->config->setUserValue($uid, $this->appName, $key, $content);
            return true;
        } catch (\Throwable $e) {
            $this->logger->error('notes save failed: ' . $e->getMessage(), ['app' => $this->appName]);
            return false;
        }
    }
}
