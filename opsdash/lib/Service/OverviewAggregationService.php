<?php
declare(strict_types=1);

namespace OCA\Opsdash\Service;

final class OverviewAggregationService {
    /**
     * @param array<int, array<string, mixed>> $events Parsed CalendarService rows.
     * @param array<string, string> $colorsById
     * @param array<string, array{id:string,label:string}> $categoryMeta
     * @param callable(string): string $mapCalToCategory
     * @return array{
     *   totalHours: float,
     *   byCalMap: array<string, array{id:string,calendar:string,events_count:int,total_hours:float}>,
     *   byCalList: array<int, array{id:string,calendar:string,events_count:int,total_hours:float}>,
     *   byDay: array<string, array{date:string,events_count:int,total_hours:float}>,
     *   perDayByCal: array<string, array<string, float>>,
     *   dowByCal: array<string, array<string, float>>,
     *   perDayByCat: array<string, array<string, float>>,
     *   dowByCatTotals: array<string, array<string, float>>,
     *   categoryTotals: array<string, float>,
     *   categoryColors: array<string, string|null>,
     *   rangeLabels: string[],
     *   eventsCount: int,
     *   daysCount: int,
     *   avgPerDay: float,
     *   avgPerEvent: float,
     *   daysSeen: array<string, bool>,
     *   overlapCount: int,
     *   earliestStartTs: int|null,
     *   latestEndTs: int|null,
     *   longestSessionHours: float,
     *   long: array<int, array{calendar:string,summary:string,duration_h:float,start:string,desc:string,allday:bool}>,
     *   dowOrder: string[],
     *   hod: array<string, array<int, float>>,
     *   dowTotals: array<string, float>
     * }
     */
    public function aggregate(
        array $events,
        \DateTimeImmutable $from,
        \DateTimeImmutable $to,
        \DateTimeZone $userTz,
        float $allDayHours,
        array $colorsById,
        array $categoryMeta,
        callable $mapCalToCategory,
    ): array {
        $totalHours = 0.0;
        $byCalMap = [];
        $byDay = [];
        $long = [];
        $daysSeen = [];
        $perDayByCal = [];
        $dowByCal = [];
        $perDayByCat = [];
        $dowByCatTotals = [];

        $categoryTotals = [];
        foreach ($categoryMeta as $catId => $_meta) {
            $categoryTotals[$catId] = 0.0;
        }
        $categoryColors = array_fill_keys(array_keys($categoryMeta), null);

        $dayIntervals = [];
        $overlapCount = 0;
        $earliestStartTs = null;
        $latestEndTs = null;
        $longestSessionHours = 0.0;

        $dowOrder = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        $hod = [];
        foreach ($dowOrder as $d) {
            $hod[$d] = array_fill(0, 24, 0.0);
        }

        foreach ($events as $r) {
            $isAllDayEvent = !empty($r['allday']);
            $h = (float)($r['hours'] ?? 0);
            $calName = (string)($r['calendar'] ?? '');
            $calId = (string)($r['calendar_id'] ?? $calName);
            $byCalMap[$calId] = $byCalMap[$calId] ?? ['id' => $calId, 'calendar' => $calName, 'events_count' => 0, 'total_hours' => 0.0];

            $catId = $mapCalToCategory($calId);
            if (!isset($categoryTotals[$catId])) {
                $categoryTotals[$catId] = 0.0;
            }
            if (($categoryColors[$catId] ?? null) === null && isset($colorsById[$calId])) {
                $categoryColors[$catId] = $colorsById[$calId];
            }

            $stStr = (string)($r['start'] ?? '');
            $enStr = (string)($r['end'] ?? '');
            $stTzName = (string)($r['startTz'] ?? '');
            $enTzName = (string)($r['endTz'] ?? '');
            try {
                $srcTzStart = new \DateTimeZone($stTzName ?: 'UTC');
            } catch (\Throwable) {
                $srcTzStart = new \DateTimeZone('UTC');
            }
            try {
                $srcTzEnd = new \DateTimeZone($enTzName ?: 'UTC');
            } catch (\Throwable) {
                $srcTzEnd = new \DateTimeZone('UTC');
            }
            $dtStart = $stStr !== '' ? new \DateTimeImmutable($stStr, $srcTzStart) : null;
            $dtEnd = $enStr !== '' ? new \DateTimeImmutable($enStr, $srcTzEnd) : null;
            $dtStartUser = $dtStart?->setTimezone($userTz);
            $dtEndUser = $dtEnd?->setTimezone($userTz);

            if ($isAllDayEvent && $dtStartUser) {
                $dtStartUser = $dtStartUser->setTime(0, 0, 0);
            }
            if ($isAllDayEvent) {
                if ($dtEndUser) {
                    $dtEndUser = $dtEndUser->setTime(0, 0, 0);
                }
                if (!$dtEndUser && $dtStartUser) {
                    $dtEndUser = $dtStartUser->modify('+1 day');
                }
            }

            if ($dtStartUser) {
                $ts = $dtStartUser->getTimestamp();
                if ($earliestStartTs === null || $ts < $earliestStartTs) {
                    $earliestStartTs = $ts;
                }
            }
            if ($dtEndUser) {
                $te = $dtEndUser->getTimestamp();
                if ($latestEndTs === null || $te > $latestEndTs) {
                    $latestEndTs = $te;
                }
            }

            $daysSpanned = 1;
            if ($dtStartUser && $dtEndUser) {
                $eventDurSeconds = max(0, $dtEndUser->getTimestamp() - $dtStartUser->getTimestamp());
                if ($isAllDayEvent) {
                    if ($eventDurSeconds <= 0) {
                        $eventDurSeconds = 86400;
                    }
                    $daysSpanned = max(1, (int)ceil($eventDurSeconds / 86400));
                } else {
                    $eventDur = $eventDurSeconds / 3600.0;
                    if ($eventDur > $longestSessionHours) {
                        $longestSessionHours = $eventDur;
                    }
                }
            }
            if ($isAllDayEvent && $allDayHours > $longestSessionHours) {
                $longestSessionHours = $allDayHours;
            }

            $eventHours = $isAllDayEvent ? ($allDayHours * $daysSpanned) : $h;
            $totalHours += $eventHours;
            $byCalMap[$calId]['events_count']++;
            $byCalMap[$calId]['total_hours'] += $eventHours;
            $categoryTotals[$catId] = ($categoryTotals[$catId] ?? 0.0) + $eventHours;

            if ($isAllDayEvent && $dtStartUser) {
                $perDayContribution = $allDayHours;
                $perHourContribution = $allDayHours / 24.0;
                $currentDay = $dtStartUser;
                for ($i = 0; $i < $daysSpanned; $i++) {
                    $dayKey = $currentDay->format('Y-m-d');
                    $byDay[$dayKey] = $byDay[$dayKey] ?? ['date' => $dayKey, 'events_count' => 0, 'total_hours' => 0.0];
                    if ($i === 0) {
                        $byDay[$dayKey]['events_count']++;
                    }
                    $byDay[$dayKey]['total_hours'] += $perDayContribution;
                    $daysSeen[$dayKey] = true;
                    $dname = $currentDay->format('D');

                    $perDayByCal[$dayKey] = $perDayByCal[$dayKey] ?? [];
                    $perDayByCal[$dayKey][$calId] = ($perDayByCal[$dayKey][$calId] ?? 0) + $perDayContribution;

                    $perDayByCat[$dayKey] = $perDayByCat[$dayKey] ?? [];
                    $perDayByCat[$dayKey][$catId] = ($perDayByCat[$dayKey][$catId] ?? 0) + $perDayContribution;

                    $dowByCal[$dname] = $dowByCal[$dname] ?? [];
                    $dowByCal[$dname][$calId] = ($dowByCal[$dname][$calId] ?? 0) + $perDayContribution;

                    $dowByCatTotals[$dname] = $dowByCatTotals[$dname] ?? [];
                    $dowByCatTotals[$dname][$catId] = ($dowByCatTotals[$dname][$catId] ?? 0) + $perDayContribution;

                    if ($perHourContribution > 0) {
                        for ($hour = 0; $hour < 24; $hour++) {
                            if (isset($hod[$dname][$hour])) {
                                $hod[$dname][$hour] += $perHourContribution;
                            }
                        }
                    }
                    $currentDay = $currentDay->modify('+1 day');
                }

                $long[] = [
                    'calendar' => $calName,
                    'summary' => (string)($r['title'] ?? ''),
                    'duration_h' => $eventHours,
                    'start' => (string)($r['start'] ?? ''),
                    'desc' => (string)($r['desc'] ?? ''),
                    'allday' => true,
                ];
                continue;
            }

            if ($dtStartUser && $dtEndUser && $dtEndUser > $dtStartUser) {
                $segmentStart = $dtStartUser;
                while ($segmentStart < $dtEndUser) {
                    $dayKey = $segmentStart->format('Y-m-d');
                    $dayEndCandidate = $segmentStart->setTime(23, 59, 59);
                    if ($dayEndCandidate > $dtEndUser) {
                        $dayEndCandidate = $dtEndUser;
                    }
                    $startTs = $segmentStart->getTimestamp();
                    $endTs = $dayEndCandidate->getTimestamp();
                    if ($endTs > $startTs) {
                        $dayIntervals[$dayKey] = $dayIntervals[$dayKey] ?? [];
                        foreach ($dayIntervals[$dayKey] as $interval) {
                            if ($startTs < $interval[1] && $endTs > $interval[0]) {
                                $overlapCount++;
                                break;
                            }
                        }
                        $dayIntervals[$dayKey][] = [$startTs, $endTs];
                    }
                    if ($dayEndCandidate >= $dtEndUser) {
                        break;
                    }
                    $segmentStart = $dayEndCandidate->modify('+1 second');
                }
            }

            if ($dtStartUser) {
                $dayStart = $dtStartUser->format('Y-m-d');
                $byDay[$dayStart] = $byDay[$dayStart] ?? ['date' => $dayStart, 'events_count' => 0, 'total_hours' => 0.0];
                $byDay[$dayStart]['events_count']++;
                $daysSeen[$dayStart] = true;
            }

            $long[] = [
                'calendar' => $calName,
                'summary' => (string)($r['title'] ?? ''),
                'duration_h' => $eventHours,
                'start' => (string)($r['start'] ?? ''),
                'desc' => (string)($r['desc'] ?? ''),
                'allday' => false,
            ];

            if ($dtStartUser && $dtEndUser && $dtEndUser > $dtStartUser) {
                $cur = $dtStartUser;
                while ($cur < $dtEndUser) {
                    $hourStart = \DateTimeImmutable::createFromFormat('Y-m-d H:00:00', $cur->format('Y-m-d H:00:00'), $userTz) ?: $cur;
                    $slotEnd = $hourStart->modify('+1 hour');
                    if ($slotEnd > $dtEndUser) {
                        $slotEnd = $dtEndUser;
                    }
                    $dur = max(0, ($slotEnd->getTimestamp() - $cur->getTimestamp()) / 3600.0);
                    $dname = $cur->format('D');
                    $hour = (int)$cur->format('G');
                    if (isset($hod[$dname][$hour])) {
                        $hod[$dname][$hour] += $dur;
                    }

                    $dayKey = $cur->format('Y-m-d');
                    $perDayByCal[$dayKey] = $perDayByCal[$dayKey] ?? [];
                    $perDayByCal[$dayKey][$calId] = ($perDayByCal[$dayKey][$calId] ?? 0) + $dur;

                    $dowByCal[$dname] = $dowByCal[$dname] ?? [];
                    $dowByCal[$dname][$calId] = ($dowByCal[$dname][$calId] ?? 0) + $dur;

                    $byDay[$dayKey] = $byDay[$dayKey] ?? ['date' => $dayKey, 'events_count' => 0, 'total_hours' => 0.0];
                    $byDay[$dayKey]['total_hours'] += $dur;
                    $daysSeen[$dayKey] = true;

                    $perDayByCat[$dayKey] = $perDayByCat[$dayKey] ?? [];
                    $perDayByCat[$dayKey][$catId] = ($perDayByCat[$dayKey][$catId] ?? 0) + $dur;

                    $dowByCatTotals[$dname] = $dowByCatTotals[$dname] ?? [];
                    $dowByCatTotals[$dname][$catId] = ($dowByCatTotals[$dname][$catId] ?? 0) + $dur;

                    $cur = $slotEnd;
                }
            }
        }

        $dowTotals = [];
        foreach ($dowOrder as $d) {
            $dowTotals[$d] = array_sum($hod[$d]);
        }

        usort($long, fn ($a, $b) => $b['duration_h'] <=> $a['duration_h']);

        $byCalList = array_values($byCalMap);
        usort($byCalList, fn ($a, $b) => $b['total_hours'] <=> $a['total_hours']);

        ksort($byDay);

        $rangeLabels = [];
        $cursor = clone $from;
        while ($cursor <= $to) {
            $dayKey = $cursor->format('Y-m-d');
            if (!isset($byDay[$dayKey])) {
                $byDay[$dayKey] = ['date' => $dayKey, 'events_count' => 0, 'total_hours' => 0.0];
            }
            if (!isset($perDayByCal[$dayKey])) {
                $perDayByCal[$dayKey] = [];
            }
            if (!isset($perDayByCat[$dayKey])) {
                $perDayByCat[$dayKey] = [];
            }
            $rangeLabels[] = $dayKey;
            $cursor = $cursor->add(new \DateInterval('P1D'));
        }

        $eventsCount = count($events);
        $daysCount = count($daysSeen);
        $avgPerDay = $daysCount ? ($totalHours / $daysCount) : 0.0;
        $avgPerEvent = $eventsCount ? ($totalHours / $eventsCount) : 0.0;

        return [
            'totalHours' => $totalHours,
            'byCalMap' => $byCalMap,
            'byCalList' => $byCalList,
            'byDay' => $byDay,
            'perDayByCal' => $perDayByCal,
            'dowByCal' => $dowByCal,
            'perDayByCat' => $perDayByCat,
            'dowByCatTotals' => $dowByCatTotals,
            'categoryTotals' => $categoryTotals,
            'categoryColors' => $categoryColors,
            'rangeLabels' => $rangeLabels,
            'eventsCount' => $eventsCount,
            'daysCount' => $daysCount,
            'avgPerDay' => $avgPerDay,
            'avgPerEvent' => $avgPerEvent,
            'daysSeen' => $daysSeen,
            'overlapCount' => $overlapCount,
            'earliestStartTs' => $earliestStartTs,
            'latestEndTs' => $latestEndTs,
            'longestSessionHours' => $longestSessionHours,
            'long' => $long,
            'dowOrder' => $dowOrder,
            'hod' => $hod,
            'dowTotals' => $dowTotals,
        ];
    }
}

