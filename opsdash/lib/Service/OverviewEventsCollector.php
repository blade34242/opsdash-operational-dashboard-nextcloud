<?php
declare(strict_types=1);

namespace OCA\Opsdash\Service;

use DateTimeInterface;
use OCP\Calendar\IManager;
use Psr\Log\LoggerInterface;

final class OverviewEventsCollector {
    private const APP_NAME = 'opsdash';

    public function __construct(
        private IManager $calendarManager,
        private CalendarService $calendarService,
        private LoggerInterface $logger,
    ) {
    }

    /**
     * Collect parsed calendar rows for a time window.
     *
     * @param string $principal
     * @param array<int, object> $cals Calendar-like objects with getUri()/getDisplayName()
     * @param bool $includeAll
     * @param string[] $selectedIds
     * @param DateTimeInterface $from
     * @param DateTimeInterface $to
     * @param int $maxPerCal
     * @param int $maxTotal
     * @param bool $debug
     * @return array{events: array<int, array<string, mixed>>, truncated: bool, queryDbg: array<int, array<string, mixed>>}
     */
    public function collect(
        string $principal,
        array $cals,
        bool $includeAll,
        array $selectedIds,
        DateTimeInterface $from,
        DateTimeInterface $to,
        int $maxPerCal,
        int $maxTotal,
        bool $debug,
    ): array {
        $events = [];
        $queryDbg = [];
        $totalAdded = 0;
        $truncated = false;

        foreach ($cals as $cal) {
            $cid = '';
            try {
                $cid = (string)($cal->getUri() ?? '');
            } catch (\Throwable) {
                $cid = '';
            }
            if ($cid === '') {
                $cid = (string)spl_object_id($cal);
            }
            if (!$includeAll && !in_array($cid, $selectedIds, true)) {
                continue;
            }

            $calName = 'calendar';
            try {
                $calName = (string)($cal->getDisplayName() ?: ($cal->getUri() ?? 'calendar'));
            } catch (\Throwable) {
                $calName = $cid;
            }

            $rawRows = [];
            $used = 'none';
            try {
                if (method_exists($this->calendarManager, 'newQuery') && method_exists($this->calendarManager, 'searchForPrincipal')) {
                    $q = $this->calendarManager->newQuery($principal);
                    if (method_exists($q, 'addSearchCalendar')) {
                        $q->addSearchCalendar((string)($cal->getUri() ?? $cid));
                    }
                    if (method_exists($q, 'setTimerangeStart')) {
                        $q->setTimerangeStart($from);
                    }
                    if (method_exists($q, 'setTimerangeEnd')) {
                        $q->setTimerangeEnd($to);
                    }
                    $res = $this->calendarManager->searchForPrincipal($q);
                    if (is_array($res)) {
                        $rawRows = $res;
                    }
                    $used = 'IManager::searchForPrincipal';
                }
            } catch (\Throwable $e) {
                $this->logger->error('calendar query failed: ' . $e->getMessage(), [
                    'app' => self::APP_NAME,
                ]);
            }

            $mode = 'empty';
            $first = $rawRows[0] ?? null;
            if (is_array($first) && isset($first['objects'])) {
                $mode = 'structured';
            } elseif (is_array($first) && (isset($first['calendardata']) || isset($first['object']))) {
                $mode = 'ics';
            }

            $rows = $this->calendarService->parseRows($rawRows, $calName, $cid);

            if (count($rows) > $maxPerCal) {
                $rows = array_slice($rows, 0, $maxPerCal);
                $truncated = true;
            }

            $remaining = $maxTotal - $totalAdded;
            if ($remaining <= 0) {
                $truncated = true;
                break;
            }
            if (count($rows) > $remaining) {
                $rows = array_slice($rows, 0, $remaining);
                $truncated = true;
            }

            $events = array_merge($events, $rows);
            $totalAdded += count($rows);

            if ($debug) {
                $queryDbg[] = [
                    'calendar_id' => $cid,
                    'method' => $used,
                    'mode' => $mode,
                    'rows' => is_array($rawRows) ? count($rawRows) : 0,
                    'sample_raw' => isset($rawRows[0]) ? $rawRows[0] : null,
                    'sample_parsed' => isset($rows[0]) ? $rows[0] : null,
                    'sample_detect_allday' => (is_array($rawRows[0] ?? null)) ? self::detectAllDayFromRawRow($rawRows[0]) : null,
                ];
            }
        }

        return [
            'events' => $events,
            'truncated' => $truncated,
            'queryDbg' => $queryDbg,
        ];
    }

    /**
     * Best-effort extraction of an all-day signal for debug output.
     *
     * @param array<string, mixed> $row
     * @return array<string, mixed>
     */
    private static function detectAllDayFromRawRow(array $row): array {
        $flag = isset($row['allday']) ? (bool)$row['allday'] : false;
        $reason = $flag ? 'row.allday' : null;

        $obj = null;
        if (isset($row['objects'])) {
            $objects = $row['objects'];
            if ($objects instanceof \ArrayObject) {
                $objects = $objects->getArrayCopy();
            }
            if (is_array($objects) && isset($objects[0])) {
                $obj = $objects[0];
                if ($obj instanceof \ArrayObject) {
                    $obj = $obj->getArrayCopy();
                }
                if ($obj instanceof \stdClass) {
                    $obj = (array)$obj;
                }
            }
        }

        $details = [
            'objects_type' => isset($row['objects']) ? gettype($row['objects']) : null,
        ];
        if (is_array($obj)) {
            if (!$flag && isset($obj['allday'])) {
                $raw = $obj['allday'];
                if ($raw instanceof \stdClass) {
                    $raw = (array)$raw;
                }
                $flag = is_array($raw) ? (bool)($raw[0] ?? false) : (bool)$raw;
                if ($flag) {
                    $reason = 'object.allday';
                }
            }
            if (!$flag && isset($obj['DTSTART'][1])) {
                $params = $obj['DTSTART'][1];
                $details['dtstart_type'] = gettype($params);
                if ($params instanceof \stdClass) {
                    $params = (array)$params;
                }
                $details['params'] = $params;
                $details['has_value_param'] = is_array($params) && array_key_exists('VALUE', $params);
                if (is_array($params) && array_key_exists('VALUE', $params)) {
                    $valueType = $params['VALUE'];
                    $details['value_type'] = $valueType;
                    if (is_array($valueType)) {
                        $valueType = reset($valueType);
                    }
                    if (is_object($valueType) && method_exists($valueType, '__toString')) {
                        $valueType = (string)$valueType;
                    }
                    $details['value_type_upper'] = is_string($valueType) ? strtoupper($valueType) : null;
                    if (is_string($valueType) && strtoupper($valueType) === 'DATE') {
                        $flag = true;
                        $reason = 'VALUE=DATE';
                    }
                }
            }
        }

        $details['allday'] = $flag;
        $details['reason'] = $reason;
        return $details;
    }
}

