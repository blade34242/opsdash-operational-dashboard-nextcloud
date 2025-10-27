<?php
declare(strict_types=1);

namespace OCA\Opsdash\Service;

use DateInterval;
use DateTimeImmutable;
use DateTimeInterface;
use OCP\Calendar\IManager;
use OCP\IConfig;
use Psr\Log\LoggerInterface;
use Sabre\VObject\Reader;

class CalendarService {
    public function __construct(
        private IManager $calendarManager,
        private IConfig $config,
        private LoggerInterface $logger,
        private string $appName,
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
            $this->logger->error('getCalendars error: ' . $e->getMessage(), ['app' => $this->appName]);
        }
        return [];
    }

    /**
     * @return array{0: DateTimeImmutable, 1: DateTimeImmutable}
     */
    public function rangeBounds(string $range, int $offset): array {
        $now = new DateTimeImmutable('now');
        if ($range === 'month') {
            $base = $now->modify(($offset >= 0 ? '+' : '') . $offset . ' month');
            return [
                $base->modify('first day of this month')->setTime(0, 0, 0),
                $base->modify('last day of this month')->setTime(23, 59, 59),
            ];
        }
        $base = $now->modify(($offset >= 0 ? '+' : '') . $offset . ' week');
        return [
            $base->modify('monday this week')->setTime(0, 0, 0),
            $base->modify('sunday this week')->setTime(23, 59, 59),
        ];
    }

    public function notesKey(string $range, DateTimeImmutable $from): string {
        $prefix = ($range === 'month') ? 'notes_month_' : 'notes_week_';
        return $prefix . $from->format('Y-m-d');
    }

    public function normalizeColor(string $color): string {
        $c = trim($color);
        if (preg_match('/^#([0-9a-fA-F]{8})$/', $c, $m)) {
            return '#' . substr($m[1], 2);
        }
        if (preg_match('/^#([0-9a-fA-F]{3})$/', $c, $m)) {
            $r = $m[1][0];
            $g = $m[1][1];
            $b = $m[1][2];
            return '#' . $r . $r . $g . $g . $b . $b;
        }
        if (preg_match('/^#([0-9a-fA-F]{6})$/', $c)) {
            return strtoupper($c);
        }
        if (preg_match('/^rgb\(\s*([0-9]{1,3})\s*,\s*([0-9]{1,3})\s*,\s*([0-9]{1,3})\s*\)$/', $c, $m)) {
            $parts = array_slice($m, 1, 3);
            $hex = array_map(fn ($n) => str_pad(dechex(max(0, min(255, (int)$n))), 2, '0', STR_PAD_LEFT), $parts);
            return '#' . implode('', $hex);
        }
        return '#' . substr(md5($c), 0, 6);
    }

    /**
     * @param array<int,mixed> $raw
     * @return array<int,array<string,mixed>>
     */
    public function parseRows(array $raw, string $calendarName, ?string $calendarId = null): array {
        $out = [];
        $count = 0;
        $maxRows = 5000;
        $maxIcsBytes = 200000;
        $icsParsed = false;
        $icsSkipped = 0;

        foreach ($raw as $row) {
            if (++$count > $maxRows) {
                break;
            }
            if (is_array($row) && isset($row['objects']) && is_array($row['objects'])) {
                $objects = $row['objects'];
                $payload = $objects[0] ?? [];
                if (isset($payload['calendardata'])) {
                    $ics = (string)$payload['calendardata'];
                    if ($ics !== '' && strlen($ics) < $maxIcsBytes) {
                        try {
                            $vobj = Reader::read($ics);
                            if ($vobj && isset($vobj->VEVENT)) {
                                foreach ($vobj->select('VEVENT') as $vevent) {
                                    $dtStart = $vevent->DTSTART?->getDateTime();
                                    $dtEnd = $vevent->DTEND?->getDateTime();
                                    if (!$dtEnd && $dtStart && isset($vevent->DURATION)) {
                                        try {
                                            $dtEnd = (clone $dtStart)->add(new DateInterval((string)$vevent->DURATION->getValue()));
                                        } catch (\Throwable) {
                                            $dtEnd = (clone $dtStart)->modify('+1 hour');
                                        }
                                    } elseif (!$dtEnd && $dtStart) {
                                        $dtEnd = (clone $dtStart)->modify('+1 hour');
                                    }
                                    $hours = ($dtEnd instanceof DateTimeInterface && $dtStart instanceof DateTimeInterface)
                                        ? ($dtEnd->getTimestamp() - $dtStart->getTimestamp()) / 3600
                                        : null;

                                    $out[] = [
                                        'calendar' => $calendarName,
                                        'calendar_id' => $calendarId,
                                        'title' => $this->text($vevent->SUMMARY ?? null),
                                        'start' => $this->fmt($dtStart),
                                        'startTz' => $dtStart?->getTimezone()->getName(),
                                        'end' => $this->fmt($dtEnd),
                                        'endTz' => $dtEnd?->getTimezone()->getName(),
                                        'hours' => $hours !== null ? round($hours, 2) : null,
                                        'status' => (string)($vevent->STATUS?->getValue() ?? ''),
                                        'location' => (string)($vevent->LOCATION?->getValue() ?? ''),
                                        'desc' => $this->shorten((string)($vevent->DESCRIPTION?->getValue() ?? ''), 160),
                                    ];
                                }
                                $icsParsed = true;
                            }
                        } catch (\Throwable) {
                            // ignore malformed ICS
                        }
                    } else {
                        $icsSkipped++;
                    }
                }
                continue;
            }

            if (!is_array($row)) {
                continue;
            }
            $object = $row['object'] ?? $row['calendardata'] ?? null;
            if (is_string($object) && $object !== '') {
                if (strlen($object) > $maxIcsBytes) {
                    $icsSkipped++;
                    continue;
                }
                try {
                    $vobj = Reader::read($object);
                    if ($vobj && isset($vobj->VEVENT)) {
                        foreach ($vobj->select('VEVENT') as $vevent) {
                            $dtStart = $vevent->DTSTART?->getDateTime();
                            $dtEnd = $vevent->DTEND?->getDateTime();
                            if (!$dtEnd && $dtStart && isset($vevent->DURATION)) {
                                try {
                                    $dtEnd = (clone $dtStart)->add(new DateInterval((string)$vevent->DURATION->getValue()));
                                } catch (\Throwable) {
                                    $dtEnd = (clone $dtStart)->modify('+1 hour');
                                }
                            } elseif (!$dtEnd && $dtStart) {
                                $dtEnd = (clone $dtStart)->modify('+1 hour');
                            }
                            $hours = ($dtEnd instanceof DateTimeInterface && $dtStart instanceof DateTimeInterface)
                                ? ($dtEnd->getTimestamp() - $dtStart->getTimestamp()) / 3600
                                : null;
                            $out[] = [
                                'calendar' => $calendarName,
                                'calendar_id' => $calendarId,
                                'title' => $this->text($vevent->SUMMARY ?? null),
                                'start' => $this->fmt($dtStart),
                                'startTz' => $dtStart?->getTimezone()->getName(),
                                'end' => $this->fmt($dtEnd),
                                'endTz' => $dtEnd?->getTimezone()->getName(),
                                'hours' => $hours !== null ? round($hours, 2) : null,
                                'status' => (string)($vevent->STATUS?->getValue() ?? ''),
                                'location' => (string)($vevent->LOCATION?->getValue() ?? ''),
                                'desc' => $this->shorten((string)($vevent->DESCRIPTION?->getValue() ?? ''), 160),
                            ];
                        }
                        $icsParsed = true;
                    }
                } catch (\Throwable) {
                    // ignore malformed ICS
                }
                continue;
            }

            $obj0 = $row['objects'][0] ?? null;
            if (is_array($obj0)) {
                $get = function (string $name) use ($obj0): array {
                    $val = $obj0[$name][0] ?? null;
                    $params = $obj0[$name][1] ?? [];
                    return [$val, is_array($params) ? $params : []];
                };
                [$dtStart, $pStart] = $get('DTSTART');
                [$dtEnd, $pEnd] = $get('DTEND');
                [$summary] = $get('SUMMARY');
                [$status] = $get('STATUS');
                [$location] = $get('LOCATION');
                [$desc] = $get('DESCRIPTION');
                if (!$dtEnd && $dtStart && isset($obj0['DURATION'][0])) {
                    try {
                        $dtEnd = (clone $dtStart)->add(new DateInterval((string)$obj0['DURATION'][0]));
                    } catch (\Throwable) {
                        $dtEnd = (clone $dtStart)->modify('+1 hour');
                    }
                } elseif (!$dtEnd && $dtStart) {
                    $dtEnd = (clone $dtStart)->modify('+1 hour');
                }
                $hours = ($dtEnd instanceof DateTimeInterface && $dtStart instanceof DateTimeInterface)
                    ? ($dtEnd->getTimestamp() - $dtStart->getTimestamp()) / 3600
                    : null;
                $out[] = [
                    'calendar' => $calendarName,
                    'calendar_id' => $calendarId,
                    'title' => $this->text($summary),
                    'start' => $this->fmt($dtStart),
                    'startTz' => $this->tzid($pStart, $dtStart),
                    'end' => $this->fmt($dtEnd),
                    'endTz' => $this->tzid($pEnd, $dtEnd),
                    'hours' => $hours !== null ? round($hours, 2) : null,
                    'status' => $this->text($status),
                    'location' => $this->text($location),
                    'desc' => $this->shorten($this->text($desc) ?? '', 160),
                ];
                continue;
            }
        }

        if (($icsParsed || $icsSkipped > 0) && $this->isDebugEnabled()) {
            $this->logger->debug('parseRows ICS fallback', [
                'app' => $this->appName,
                'calendar' => $calendarName,
                'icsParsed' => $icsParsed,
                'icsSkipped' => $icsSkipped,
            ]);
        }

        return $out;
    }

    public function isDebugEnabled(): bool {
        try {
            $level = (int)$this->config->getSystemValue('loglevel', 2);
            return $level === 0;
        } catch (\Throwable) {
            return false;
        }
    }

    private function fmt(?DateTimeInterface $dt): ?string {
        return $dt ? (DateTimeImmutable::createFromInterface($dt))->format('Y-m-d H:i:s') : null;
    }

    private function text(mixed $node): ?string {
        if (is_object($node) && method_exists($node, 'getValue')) {
            return (string)$node->getValue();
        }
        if (is_scalar($node)) {
            return (string)$node;
        }
        return null;
    }

    /**
     * @param array<string,mixed> $params
     */
    private function tzid(array $params, ?DateTimeInterface $fallback): ?string {
        if (isset($params['TZID'])) {
            $param = $params['TZID'];
            if (is_object($param) && method_exists($param, 'getValue')) {
                return (string)$param->getValue();
            }
            if (is_scalar($param)) {
                return (string)$param;
            }
        }
        return $fallback?->getTimezone()->getName();
    }

    private function shorten(string $value, int $max): string {
        $value = trim($value);
        if (mb_strlen($value) <= $max) {
            return $value;
        }
        return mb_substr($value, 0, $max - 1) . '…';
    }
}
