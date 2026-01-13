<?php
declare(strict_types=1);

namespace OCA\Opsdash\Service;

use DateTimeImmutable;
use OCP\Calendar\IManager;
use OCP\IConfig;
use Psr\Log\LoggerInterface;

class CalendarAccessService {
    private const APP_NAME = 'opsdash';

    public function __construct(
        private IManager $calendarManager,
        private IConfig $config,
        private LoggerInterface $logger,
    ) {
    }

    /**
     * @return array<int,\OCP\Calendar\IBackendMixedCalendar>
     */
    public function getCalendarsFor(string $uid): array {
        try {
            if (method_exists($this->calendarManager, 'getCalendarsForPrincipal')) {
                $principal = 'principals/users/' . $uid;
                return $this->calendarManager->getCalendarsForPrincipal($principal) ?? [];
            }
            if (method_exists($this->calendarManager, 'getCalendarsForUser')) {
                return $this->calendarManager->getCalendarsForUser($uid) ?? [];
            }
            if (method_exists($this->calendarManager, 'getCalendars')) {
                return $this->calendarManager->getCalendars($uid) ?? [];
            }
        } catch (\Throwable $e) {
            $this->logger->error('getCalendars error: ' . $e->getMessage(), ['app' => self::APP_NAME]);
        }
        return [];
    }

    /**
     * @return array<int,string>
     */
    public function getCalendarIdsFor(string $uid): array {
        $ids = [];
        foreach ($this->getCalendarsFor($uid) as $cal) {
            $ids[] = (string)($cal->getUri() ?? spl_object_id($cal));
        }
        return $ids;
    }

    /**
     * @return array<string,bool>
     */
    public function getCalendarIdSetFor(string $uid): array {
        return array_fill_keys($this->getCalendarIdsFor($uid), true);
    }

    /**
     * @return array{0: DateTimeImmutable, 1: DateTimeImmutable}
     */
    public function rangeBounds(string $range, int $offset, ?\DateTimeZone $tz = null, ?int $weekStart = null): array {
        $now = $tz ? new DateTimeImmutable('now', $tz) : new DateTimeImmutable('now');
        if ($range === 'month') {
            $base = $now->modify(($offset >= 0 ? '+' : '') . $offset . ' month');
            return [
                $base->modify('first day of this month')->setTime(0, 0, 0),
                $base->modify('last day of this month')->setTime(23, 59, 59),
            ];
        }
        $base = $now->modify(($offset >= 0 ? '+' : '') . $offset . ' week');
        $weekStart = $weekStart ?? 1;
        if ($weekStart < 0 || $weekStart > 6) {
            $weekStart = 1;
        }
        $currentDow = (int)$base->format('w'); // 0=Sun..6=Sat
        $diff = ($currentDow - $weekStart + 7) % 7;
        $start = $base->modify('-' . $diff . ' day')->setTime(0, 0, 0);
        $end = $start->modify('+6 day')->setTime(23, 59, 59);
        return [$start, $end];
    }

    public function resolveUserTimezone(string $uid): \DateTimeZone {
        $tzName = 'UTC';
        try {
            $raw = (string)$this->config->getUserValue($uid, 'core', 'timezone', '');
            if ($raw !== '') {
                $tzName = $raw;
            }
        } catch (\Throwable) {
            $tzName = 'UTC';
        }
        try {
            return new \DateTimeZone($tzName);
        } catch (\Throwable) {
            return new \DateTimeZone('UTC');
        }
    }

    public function resolveUserWeekStart(string $uid): int {
        $raw = '';
        try {
            $raw = (string)$this->config->getUserValue($uid, 'core', 'firstday', '');
        } catch (\Throwable) {
            $raw = '';
        }
        if ($raw === '') {
            try {
                $raw = (string)$this->config->getUserValue($uid, 'core', 'firstDay', '');
            } catch (\Throwable) {
                $raw = '';
            }
        }
        $weekStart = $this->normalizeWeekStart($raw);
        if ($weekStart === null) {
            try {
                $weekStart = (int)$this->config->getSystemValue('firstday', 1);
            } catch (\Throwable) {
                $weekStart = 1;
            }
        }
        if ($weekStart < 0 || $weekStart > 6) {
            $weekStart = 1;
        }
        return $weekStart;
    }

    public function notesKey(string $range, DateTimeImmutable $from): string {
        $prefix = ($range === 'month') ? 'notes_month_' : 'notes_week_';
        return $prefix . $from->format('Y-m-d');
    }

    private function normalizeWeekStart(string $raw): ?int {
        if ($raw === '' || !is_numeric($raw)) {
            return null;
        }
        $value = (int)$raw;
        $value = $value % 7;
        if ($value < 0) {
            $value += 7;
        }
        return $value;
    }
}
