<?php
declare(strict_types=1);

namespace OCA\Opsdash\Service;

final class OverviewBalanceService {
    private const RATIO_DECIMALS = 1;

    /**
     * @param string $range
     * @param array<string,mixed> $targetsConfig
     * @param array<string,float|int|string> $targetsWeek
     * @param array<string,float|int|string> $targetsMonth
     * @param array<string, array{id:string,calendar:string,events_count:int,total_hours:float}> $byCalMap
     * @param array<string,string> $idToName
     * @param array<string,array{id:string,label:string}> $categoryMeta
     * @param array<string,float> $categoryTotals
     * @param float $totalHours
     * @param array<string,float> $categoryTotalsPrev
     * @param float $prevTotal
     * @param array<string, string|null> $categoryColors
     * @param array<string,mixed> $balanceConfig
     * @param array<string, array<string, float>> $perDayByCat
     * @param \DateTimeImmutable $from
     * @param \DateTimeImmutable $to
     * @param array<int, array<string, mixed>> $trendHistory
     * @return array{balanceIndex: float, balanceOverview: array<string, mixed>}
     */
    public function build(
        string $range,
        array $targetsConfig,
        array $targetsWeek,
        array $targetsMonth,
        array $byCalMap,
        array $idToName,
        array $categoryMeta,
        array $categoryTotals,
        float $totalHours,
        array $categoryTotalsPrev,
        float $prevTotal,
        array $categoryColors,
        array $balanceConfig,
        array $perDayByCat,
        \DateTimeImmutable $from,
        \DateTimeImmutable $to,
        array $trendHistory,
    ): array {
        $balanceCategories = [];
        $categoryShares = [];
        $categoryDelta = [];

        foreach ($categoryMeta as $catId => $meta) {
            $hours = $categoryTotals[$catId] ?? 0.0;
            $share = $totalHours > 0 ? ($hours / $totalHours) : 0.0;
            $prevShare = $prevTotal > 0 ? (($categoryTotalsPrev[$catId] ?? 0.0) / $prevTotal) : 0.0;
            $deltaShare = ($share - $prevShare) * 100.0;
            $categoryShares[$catId] = $share;
            $categoryDelta[$catId] = $deltaShare;
            $balanceCategories[] = [
                'id' => $catId,
                'label' => $meta['label'],
                'hours' => round($hours, 2),
                'share' => round($share * 100, 1),
                'prevShare' => round($prevShare * 100, 1),
                'delta' => round($deltaShare, 1),
                'color' => $categoryColors[$catId] ?? '#2563eb',
            ];
        }

        $balanceBuckets = [];
        $basis = $balanceConfig['index']['basis'] ?? 'category';
        $useCategories = ($basis === 'category' || $basis === 'both');
        $useCalendars  = ($basis === 'calendar' || $basis === 'both');

        $expectedShares = [];
        if ($useCategories) {
            $catTargets = $targetsConfig['categories'] ?? [];
            $targetSum = 0.0;
            $catTargetMap = [];
            foreach ($catTargets as $cat) {
                if (!is_array($cat)) {
                    continue;
                }
                $id = (string)($cat['id'] ?? '');
                $tgt = (float)($cat['targetHours'] ?? 0);
                if ($id === '' || $tgt <= 0) {
                    continue;
                }
                $catTargetMap[$id] = $tgt;
                $targetSum += $tgt;
            }
            if ($targetSum > 0) {
                foreach ($catTargetMap as $id => $tgt) {
                    $expectedShares['cat:' . $id] = $tgt / $targetSum;
                }
            }
            foreach ($categoryMeta as $catId => $_meta) {
                $key = 'cat:' . $catId;
                if (!array_key_exists($key, $expectedShares)) {
                    $expectedShares[$key] = 0.0;
                }
            }
        }

        if ($useCalendars) {
            $targetMap = $range === 'month' ? ($targetsMonth ?? []) : ($targetsWeek ?? []);
            $targetSum = 0.0;
            $cleanTargetMap = [];
            foreach ($targetMap as $calId => $targetVal) {
                $t = (float)$targetVal;
                if ($t <= 0) {
                    continue;
                }
                $cleanTargetMap[(string)$calId] = $t;
                $targetSum += $t;
            }
            if ($targetSum > 0) {
                foreach ($cleanTargetMap as $calId => $tgt) {
                    $expectedShares['cal:' . $calId] = $tgt / $targetSum;
                }
            }
            foreach ($byCalMap as $calId => $_entry) {
                $key = 'cal:' . $calId;
                if (!array_key_exists($key, $expectedShares)) {
                    $expectedShares[$key] = 0.0;
                }
            }
        }

        if ($useCategories) {
            foreach ($categoryShares as $catId => $shareVal) {
                $balanceBuckets[] = [
                    'id' => 'cat:' . $catId,
                    'label' => $categoryMeta[$catId]['label'] ?? $catId,
                    'share' => $shareVal,
                ];
            }
        }
        if ($useCalendars) {
            foreach ($byCalMap as $calId => $entry) {
                $share = $totalHours > 0 ? (($entry['total_hours'] ?? 0.0) / $totalHours) : 0.0;
                $label = $idToName[$calId] ?? ($entry['calendar'] ?? $calId);
                $balanceBuckets[] = ['id' => 'cal:' . $calId, 'label' => $label, 'share' => $share];
            }
        }

        $balanceIndex = 0.0;
        $maxDeviationAbs = 0.0;
        $maxPosDev = 0.0; $maxPosBucket = null; $maxPosExpected = 0.0; $maxPosActual = 0.0;
        $maxNegDev = 0.0; $maxNegBucket = null; $maxNegExpected = 0.0; $maxNegActual = 0.0;
        if (!empty($balanceBuckets) && $basis !== 'off') {
            foreach ($balanceBuckets as $bucket) {
                $actual = (float)($bucket['share'] ?? 0.0);
                $expected = (float)($expectedShares[$bucket['id'] ?? ''] ?? 0.0);
                $dev = $actual - $expected;
                $absDev = abs($dev);
                if ($absDev > $maxDeviationAbs) {
                    $maxDeviationAbs = $absDev;
                }
                if ($dev > $maxPosDev) {
                    $maxPosDev = $dev;
                    $maxPosBucket = $bucket;
                    $maxPosExpected = $expected;
                    $maxPosActual = $actual;
                }
                if (-$dev > $maxNegDev) {
                    $maxNegDev = -$dev;
                    $maxNegBucket = $bucket;
                    $maxNegExpected = $expected;
                    $maxNegActual = $actual;
                }
            }
            $balanceIndex = max(0.0, min(1.0, 1.0 - $maxDeviationAbs));
        }

        $relations = [];
        $relationMode = (string)($balanceConfig['relations']['displayMode'] ?? 'ratio');
        $formatRatio = function (float $a, float $b) use ($relationMode): string {
            if ($a <= 0.0001 && $b <= 0.0001) return '—';
            if ($b <= 0.0001 && $a > 0.0001) return '∞ : 1';
            if ($a <= 0.0001 && $b > 0.0001) return '0 : 1';
            $ratio = $b > 0 ? ($a / $b) : 0.0;
            if ($relationMode === 'factor') {
                return sprintf('%.' . self::RATIO_DECIMALS . 'f×', round($ratio, self::RATIO_DECIMALS));
            }
            return sprintf('%.' . self::RATIO_DECIMALS . 'f : 1', round($ratio, self::RATIO_DECIMALS));
        };
        $balanceOrder = is_array($balanceConfig['categories'] ?? null) ? $balanceConfig['categories'] : [];
        $workId = $balanceOrder[0] ?? null;
        $hobbyId = $balanceOrder[1] ?? null;
        $sportId = $balanceOrder[2] ?? null;
        $workHours = $workId ? ($categoryTotals[$workId] ?? 0.0) : 0.0;
        $hobbyHours = $hobbyId ? ($categoryTotals[$hobbyId] ?? 0.0) : 0.0;
        $sportHours = $sportId ? ($categoryTotals[$sportId] ?? 0.0) : 0.0;
        if ($workId && $hobbyId) {
            $relations[] = ['label' => 'Work:Hobby', 'value' => $formatRatio($workHours, $hobbyHours)];
        }
        if ($workId && $sportId) {
            $relations[] = ['label' => 'Work:Sport', 'value' => $formatRatio($workHours, $sportHours)];
        }
        if ($workId && $hobbyId && $sportId) {
            $relations[] = ['label' => '(H+S):Work', 'value' => $formatRatio($hobbyHours + $sportHours, $workHours)];
        }

        $trendEntries = [];
        $maxDeltaAbs = 0.0; $maxDeltaLabel = '';
        foreach ($categoryDelta as $catId => $deltaVal) {
            $label = $categoryMeta[$catId]['label'] ?? $catId;
            $trendEntries[] = ['id' => $catId, 'label' => $label, 'delta' => round($deltaVal, 1)];
            if (abs($deltaVal) > $maxDeltaAbs) {
                $maxDeltaAbs = abs($deltaVal);
                $maxDeltaLabel = $deltaVal > 0 ? 'up:' . $label : 'down:' . $label;
            }
        }
        $trendBadge = 'Balanced';
        if ($maxDeltaAbs >= 3.0) {
            if (strpos($maxDeltaLabel, 'up:') === 0) {
                $trendBadge = 'Shifting to ' . substr($maxDeltaLabel, 3);
            } else {
                $trendBadge = 'Dropping ' . substr($maxDeltaLabel, 5);
            }
        }
        $balanceTrend = ['delta' => $trendEntries, 'badge' => $trendBadge, 'history' => $trendHistory];

        $balanceDaily = [];
        $cursor = $from;
        while ($cursor->getTimestamp() <= $to->getTimestamp()) {
            $key = $cursor->format('Y-m-d');
            $totals = $perDayByCat[$key] ?? [];
            $dayTotal = array_sum($totals);
            $cats = [];
            foreach ($categoryMeta as $catId => $meta) {
                $hours = $totals[$catId] ?? 0.0;
                $share = $dayTotal > 0 ? round(($hours / $dayTotal) * 100, 1) : 0.0;
                $cats[] = ['id' => $catId, 'label' => $meta['label'], 'hours' => round($hours, 2), 'share' => $share];
            }
            $balanceDaily[] = [
                'date' => $key,
                'weekday' => $cursor->format('D'),
                'total_hours' => round($dayTotal, 2),
                'categories' => $cats,
            ];
            $cursor = $cursor->modify('+1 day');
        }

        $balanceWarnings = [];
        $noticeAbove = (float)($balanceConfig['thresholds']['noticeAbove'] ?? 0.15);
        $noticeBelow = (float)($balanceConfig['thresholds']['noticeBelow'] ?? 0.15);
        $warnAbove   = (float)($balanceConfig['thresholds']['warnAbove'] ?? 0.30);
        $warnBelow   = (float)($balanceConfig['thresholds']['warnBelow'] ?? 0.30);
        $warnIndex   = (float)($balanceConfig['thresholds']['warnIndex'] ?? 0.60);
        if ($basis !== 'off') {
            if ($maxPosBucket !== null && $maxPosDev >= $noticeAbove) {
                $actualPct = round($maxPosActual * 100, 1);
                $expectedPct = round($maxPosExpected * 100, 1);
                $deltaPct = round($maxPosDev * 100, 1);
                $label = $maxPosBucket['label'] ?? 'Bucket';
                if ($maxPosDev >= $warnAbove) {
                    $balanceWarnings[] = sprintf('%s above target by %.1fpp (%s%% vs %s%%).', $label, $deltaPct, $actualPct, $expectedPct);
                } else {
                    $balanceWarnings[] = sprintf('%s slightly above target (%.1fpp, %s%% vs %s%%).', $label, $deltaPct, $actualPct, $expectedPct);
                }
            }
            if ($maxNegBucket !== null && $maxNegDev >= $noticeBelow) {
                $actualPct = round($maxNegActual * 100, 1);
                $expectedPct = round($maxNegExpected * 100, 1);
                $deltaPct = round($maxNegDev * 100, 1);
                $label = $maxNegBucket['label'] ?? 'Bucket';
                if ($maxNegDev >= $warnBelow) {
                    $balanceWarnings[] = sprintf('%s below target by %.1fpp (%s%% vs %s%%).', $label, $deltaPct, $actualPct, $expectedPct);
                } else {
                    $balanceWarnings[] = sprintf('%s slightly below target (%.1fpp, %s%% vs %s%%).', $label, $deltaPct, $actualPct, $expectedPct);
                }
            }
            if ($balanceIndex < $warnIndex) {
                $balanceWarnings[] = sprintf('Balance index low (%.2f).', $balanceIndex);
            }
        }

        $balanceOverview = [
            'index' => round($balanceIndex, 3),
            'categories' => $balanceCategories,
            'relations' => $relations,
            'trend' => $balanceTrend,
            'daily' => $balanceDaily,
            'warnings' => $balanceWarnings,
            'trendHistory' => $trendHistory,
        ];

        return [
            'balanceIndex' => $balanceIndex,
            'balanceOverview' => $balanceOverview,
        ];
    }
}

