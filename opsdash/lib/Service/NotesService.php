<?php
declare(strict_types=1);

namespace OCA\Opsdash\Service;

use OCP\IConfig;
use Psr\Log\LoggerInterface;

class NotesService {
    private const APP_NAME = 'opsdash';

    public function __construct(
        private IConfig $config,
        private CalendarService $calendarService,
        private LoggerInterface $logger,
    ) {
    }

    public function getNotes(string $uid, string $range, int $offset): array {
        [$fromCur] = $this->calendarService->rangeBounds($range, $offset);
        [$fromPrev] = $this->calendarService->rangeBounds($range, $offset - 1);

        $keyCurrent = $this->calendarService->notesKey($range, $fromCur);
        $keyPrevious = $this->calendarService->notesKey($range, $fromPrev);

        $current = (string)$this->config->getUserValue($uid, self::APP_NAME, $keyCurrent, '');
        $previous = (string)$this->config->getUserValue($uid, self::APP_NAME, $keyPrevious, '');
        $history = [];
        for ($i = 1; $i <= 4; $i++) {
            [$fromHistory] = $this->calendarService->rangeBounds($range, $offset - $i);
            $keyHistory = $this->calendarService->notesKey($range, $fromHistory);
            $content = (string)$this->config->getUserValue($uid, self::APP_NAME, $keyHistory, '');
            if (trim($content) === '') {
                continue;
            }
            $history[] = [
                'offset' => $i,
                'from' => $fromHistory->format('Y-m-d'),
                'content' => $content,
            ];
        }

        return [
            'period' => [
                'type' => $range,
                'current_from' => $fromCur->format('Y-m-d'),
                'previous_from' => $fromPrev->format('Y-m-d'),
            ],
            'notes' => [
                'current' => $current,
                'previous' => $previous,
                'history' => $history,
            ],
        ];
    }

    public function saveNotes(string $uid, string $range, int $offset, string $content): bool {
        if (strlen($content) > 32768) {
            $content = substr($content, 0, 32768);
        }
        $content = htmlspecialchars($content, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');

        [$fromCur] = $this->calendarService->rangeBounds($range, $offset);
        $key = $this->calendarService->notesKey($range, $fromCur);

        try {
            $this->config->setUserValue($uid, self::APP_NAME, $key, $content);
            return true;
        } catch (\Throwable $e) {
            $this->logger->error('notes save failed: ' . $e->getMessage(), ['app' => self::APP_NAME]);
            return false;
        }
    }
}
