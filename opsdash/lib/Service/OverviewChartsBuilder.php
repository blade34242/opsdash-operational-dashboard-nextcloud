<?php
declare(strict_types=1);

namespace OCA\Opsdash\Service;

final class OverviewChartsBuilder {
    /**
     * @param string[] $effectiveIds
     * @param array<string, string> $idToName
     * @param array<string, string> $colorsById
     * @param array<string, array{id:string,calendar:string,events_count:int,total_hours:float}> $byCalMap
     * @param array<string, array{date:string,events_count:int,total_hours:float}> $byDay
     * @param string[] $rangeLabels
     * @param string[] $dowOrder
     * @param array<string, array<string, float>> $perDayByCal
     * @param array<string, array<string, float>> $dowByCal
     * @param array<string, array<int, float>> $hod
     * @param array<string, float> $dowTotals
     * @return array{
     *  charts: array{
     *    pie: array{labels: string[], ids: string[], data: float[], colors: string[]},
     *    perDay: array{labels: string[], data: float[]},
     *    dow: array{labels: string[], data: float[]},
     *    perDaySeries: array{labels: string[], series: array<int, array{id:string,name:string,color:string,data: float[]}>},
     *    dowSeries: array{labels: string[], series: array<int, array{id:string,name:string,color:string,data: float[]}>},
     *    hod: array{dows: string[], hours: int[], matrix: array<int, array<int, float>>}
     *  }
     * }
     */
    public function build(
        array $effectiveIds,
        array $idToName,
        array $colorsById,
        array $byCalMap,
        array $byDay,
        array $rangeLabels,
        array $dowOrder,
        array $perDayByCal,
        array $dowByCal,
        array $hod,
        array $dowTotals,
    ): array {
        $pieIds = $effectiveIds;
        $pieLabels = array_map(fn ($id) => $idToName[$id] ?? $id, $pieIds);
        $pieData = array_map(fn ($id) => isset($byCalMap[$id]) ? round((float)$byCalMap[$id]['total_hours'], 2) : 0.0, $pieIds);
        $pieColors = array_map(fn ($id) => $colorsById[$id] ?? '#60a5fa', $pieIds);

        $barLabels = $rangeLabels;
        $barData = array_map(fn ($x) => round((float)$x['total_hours'], 2), array_values($byDay));

        $dowLabels = $dowOrder;
        $dowData = array_map(fn ($k) => round((float)($dowTotals[$k] ?? 0), 2), $dowOrder);

        $perDaySeries = [];
        foreach ($effectiveIds as $cid) {
            $cname = $idToName[$cid] ?? $cid;
            $perDaySeries[] = [
                'id' => $cid,
                'name' => $cname,
                'color' => $colorsById[$cid] ?? '#60a5fa',
                'data' => array_map(fn ($d) => round((float)($perDayByCal[$d][$cid] ?? 0), 2), $barLabels),
            ];
        }
        $dowSeries = [];
        foreach ($effectiveIds as $cid) {
            $cname = $idToName[$cid] ?? $cid;
            $dowSeries[] = [
                'id' => $cid,
                'name' => $cname,
                'color' => $colorsById[$cid] ?? '#60a5fa',
                'data' => array_map(fn ($k) => round((float)($dowByCal[$k][$cid] ?? 0), 2), $dowLabels),
            ];
        }

        $hodHours = range(0, 23);
        $hodMatrix = array_map(
            fn ($d) => array_map(fn ($v) => round((float)$v, 2), $hod[$d] ?? array_fill(0, 24, 0.0)),
            $dowOrder,
        );

        return [
            'charts' => [
                'pie' => ['labels' => $pieLabels, 'ids' => $pieIds, 'data' => $pieData, 'colors' => $pieColors],
                'perDay' => ['labels' => $barLabels, 'data' => $barData],
                'dow' => ['labels' => $dowLabels, 'data' => $dowData],
                'perDaySeries' => ['labels' => $barLabels, 'series' => $perDaySeries],
                'dowSeries' => ['labels' => $dowLabels, 'series' => $dowSeries],
                'hod' => ['dows' => $dowLabels, 'hours' => $hodHours, 'matrix' => $hodMatrix],
            ],
        ];
    }
}

