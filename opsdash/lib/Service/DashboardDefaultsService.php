<?php
declare(strict_types=1);

namespace OCA\Opsdash\Service;

final class DashboardDefaultsService {
    /**
     * @return array{
     *   quick: array<int, array<string,mixed>>,
     *   standard: array<int, array<string,mixed>>,
     *   pro: array<int, array<string,mixed>>
     * }
     */
    public function getPresets(): array {
        return [
            'quick' => $this->buildQuickPreset(),
            'standard' => $this->buildStandardPreset(),
            'pro' => $this->buildProPreset(),
        ];
    }

    /**
     * @return array{tabs: array<int, array{id: string, label: string, widgets: array<int, array<string,mixed>>}>, defaultTabId: string}
     */
    public function createDefaultTabs(string $mode): array {
        $preset = $mode === 'quick'
            ? $this->buildQuickPreset()
            : ($mode === 'pro' ? $this->buildProPreset() : $this->buildStandardPreset());
        return [
            'tabs' => [
                [
                    'id' => 'tab-1',
                    'label' => 'Overview',
                    'widgets' => $preset,
                ],
            ],
            'defaultTabId' => 'tab-1',
        ];
    }

    /**
     * @return array<int, array<string,mixed>>
     */
    private function buildQuickPreset(): array {
        $widgets = [];
        $i = 0;
        $widgets[] = $this->buildWidget('time_summary_v2', [
            'showTotal' => true,
            'showAverage' => true,
            'showMedian' => true,
            'showBusiest' => true,
            'showWorkday' => true,
            'showWeekend' => true,
            'showWeekendShare' => true,
            'showCalendarSummary' => true,
            'showTopCategory' => true,
            'showBalance' => true,
            'mode' => 'active',
            'scale' => 'xl',
        ], ['width' => 'full', 'height' => 'xl', 'order' => 5], ++$i);
        $widgets[] = $this->buildWidget('targets_v2', [
            'showForecast' => true,
            'showHeader' => false,
            'showLegend' => true,
            'showDelta' => true,
            'showPace' => true,
            'showToday' => true,
            'scale' => 'lg',
        ], ['width' => 'full', 'height' => 'xl', 'order' => 10], ++$i);
        $widgets[] = $this->buildWidget('balance_index', [
            'showTrend' => true,
            'showMessages' => true,
            'showConfig' => false,
            'indexBasis' => 'category',
            'noticeAbove' => 0.15,
            'noticeBelow' => 0.15,
            'warnAbove' => 0.3,
            'warnBelow' => 0.3,
            'warnIndex' => 0.6,
            'lookbackWeeks' => 3,
            'messageDensity' => 'normal',
            'trendColor' => '#2563EB',
            'showCurrent' => true,
            'labelMode' => 'period',
            'reverseTrend' => false,
        ], ['width' => 'full', 'height' => 'm', 'order' => 20], ++$i);
        $widgets[] = $this->buildWidget('dayoff_trend', [], ['width' => 'full', 'height' => 's', 'order' => 30], ++$i);
        return $widgets;
    }

    /**
     * @return array<int, array<string,mixed>>
     */
    private function buildStandardPreset(): array {
        $widgets = [];
        $i = 0;
        $widgets[] = $this->buildWidget('targets_v2', [
            'showForecast' => true,
            'showHeader' => false,
            'showLegend' => true,
            'showDelta' => true,
            'showPace' => true,
            'showToday' => true,
            'scale' => 'lg',
        ], ['width' => 'half', 'height' => 'l', 'order' => 10], ++$i);
        $widgets[] = $this->buildWidget('time_summary_v2', [
            'showTotal' => true,
            'showAverage' => true,
            'showMedian' => true,
            'showBusiest' => true,
            'showWorkday' => true,
            'showWeekend' => true,
            'showWeekendShare' => true,
            'showCalendarSummary' => true,
            'showTopCategory' => true,
            'showBalance' => true,
            'mode' => 'active',
            'scale' => 'md',
        ], ['width' => 'half', 'height' => 'xl', 'order' => 20], ++$i);
        $widgets[] = $this->buildWidget('balance_index', [
            'showTrend' => true,
            'showMessages' => true,
            'showConfig' => false,
            'indexBasis' => 'category',
            'noticeAbove' => 0.15,
            'noticeBelow' => 0.15,
            'warnAbove' => 0.3,
            'warnBelow' => 0.3,
            'warnIndex' => 0.6,
            'lookbackWeeks' => 3,
            'messageDensity' => 'normal',
            'trendColor' => '#2563EB',
            'showCurrent' => true,
            'labelMode' => 'period',
            'reverseTrend' => false,
        ], ['width' => 'half', 'height' => 'm', 'order' => 30], ++$i);
        $widgets[] = $this->buildWidget('dayoff_trend', [], ['width' => 'half', 'height' => 's', 'order' => 40], ++$i);
        $widgets[] = $this->buildWidget('category_mix_trend', [
            'lookbackWeeks' => 3,
            'density' => 'normal',
            'labelMode' => 'period',
            'colorMode' => 'hybrid',
            'squareCells' => false,
            'showHeader' => true,
            'showBadge' => true,
        ], ['width' => 'full', 'height' => 'l', 'order' => 50], ++$i);
        $widgets[] = $this->buildWidget('calendar_table', [], ['width' => 'full', 'height' => 'l', 'order' => 55], ++$i);
        $widgets[] = $this->buildWidget('chart_pie', [
            'scope' => 'calendar',
            'showLegend' => true,
            'showLabels' => true,
        ], ['width' => 'half', 'height' => 'm', 'order' => 56], ++$i);
        $widgets[] = $this->buildWidget('chart_stacked', [
            'scope' => 'calendar',
            'showLegend' => true,
            'showLabels' => false,
        ], ['width' => 'full', 'height' => 'l', 'order' => 57], ++$i);
        $widgets[] = $this->buildWidget('chart_per_day', [
            'scope' => 'calendar',
            'showLabels' => false,
        ], ['width' => 'half', 'height' => 'm', 'order' => 58], ++$i);
        $widgets[] = $this->buildWidget('chart_dow', [
            'scope' => 'calendar',
            'showLabels' => true,
        ], ['width' => 'half', 'height' => 'm', 'order' => 58.5], ++$i);
        $widgets[] = $this->buildWidget('chart_hod', [
            'showHint' => false,
        ], ['width' => 'full', 'height' => 'l', 'order' => 59], ++$i);
        return $widgets;
    }

    /**
     * @return array<int, array<string,mixed>>
     */
    private function buildProPreset(): array {
        $widgets = [];
        $i = 0;
        $widgets[] = $this->buildWidget('targets_v2', [
            'showForecast' => true,
            'showPace' => true,
            'useLocalConfig' => false,
            'localConfig' => null,
            'showCategoryBlocks' => true,
        ], ['width' => 'half', 'height' => 'xl', 'order' => 10], ++$i);
        $widgets[] = $this->buildWidget('time_summary_v2', [
            'showTotal' => true,
            'showAverage' => true,
            'showMedian' => true,
            'showBusiest' => true,
            'showWorkday' => true,
            'showWeekend' => true,
            'showWeekendShare' => true,
            'showCalendarSummary' => true,
            'showTopCategory' => true,
            'showBalance' => true,
            'mode' => 'active',
            'scale' => 'md',
        ], ['width' => 'half', 'height' => 'xl', 'order' => 30], ++$i);
        $widgets[] = $this->buildWidget('balance_index', [
            'showTrend' => true,
            'showMessages' => true,
            'showConfig' => false,
            'indexBasis' => 'category',
            'noticeAbove' => 0.15,
            'noticeBelow' => 0.15,
            'warnAbove' => 0.3,
            'warnBelow' => 0.3,
            'warnIndex' => 0.6,
            'lookbackWeeks' => 3,
            'messageDensity' => 'normal',
            'trendColor' => '#2563EB',
            'showCurrent' => true,
            'labelMode' => 'period',
            'reverseTrend' => false,
        ], ['width' => 'half', 'height' => 'm', 'order' => 40], ++$i);
        $widgets[] = $this->buildWidget('dayoff_trend', [], ['width' => 'half', 'height' => 's', 'order' => 50], ++$i);
        $widgets[] = $this->buildWidget('category_mix_trend', [
            'lookbackWeeks' => 3,
            'density' => 'normal',
            'labelMode' => 'period',
            'colorMode' => 'hybrid',
            'squareCells' => false,
            'showHeader' => true,
            'showBadge' => true,
        ], ['width' => 'full', 'height' => 'l', 'order' => 55], ++$i);
        $widgets[] = $this->buildWidget('calendar_table', [], ['width' => 'full', 'height' => 'l', 'order' => 56], ++$i);
        $widgets[] = $this->buildWidget('chart_pie', [
            'scope' => 'calendar',
            'showLegend' => true,
            'showLabels' => true,
        ], ['width' => 'half', 'height' => 'm', 'order' => 57], ++$i);
        $widgets[] = $this->buildWidget('chart_stacked', [
            'scope' => 'calendar',
            'showLegend' => true,
            'showLabels' => false,
        ], ['width' => 'full', 'height' => 'l', 'order' => 58], ++$i);
        $widgets[] = $this->buildWidget('chart_per_day', [
            'scope' => 'calendar',
            'showLabels' => false,
        ], ['width' => 'half', 'height' => 'm', 'order' => 59], ++$i);
        $widgets[] = $this->buildWidget('chart_dow', [
            'scope' => 'calendar',
            'showLabels' => true,
        ], ['width' => 'half', 'height' => 'm', 'order' => 59.5], ++$i);
        $widgets[] = $this->buildWidget('chart_hod', [
            'showHint' => false,
        ], ['width' => 'full', 'height' => 'l', 'order' => 59.8], ++$i);
        $widgets[] = $this->buildWidget('deck_cards', [
            'allowMine' => true,
            'includeArchived' => true,
            'includeCompleted' => true,
            'autoScroll' => true,
            'intervalSeconds' => 5,
            'showCount' => true,
            'filters' => [
                'open_all',
                'open_mine',
                'done_all',
                'done_mine',
                'archived_all',
                'archived_mine',
                'due_all',
                'due_mine',
                'due_today_all',
                'due_today_mine',
                'created_today_all',
                'created_today_mine',
            ],
            'defaultFilter' => 'open_all',
            'mineMode' => 'assignee',
        ], ['width' => 'half', 'height' => 'xl', 'order' => 60], ++$i);
        $widgets[] = $this->buildWidget('note_editor', [], ['width' => 'half', 'height' => 'l', 'order' => 70], ++$i);
        return $widgets;
    }

    /**
     * @param array<string,mixed> $options
     * @param array<string,mixed> $layout
     * @return array<string,mixed>
     */
    private function buildWidget(string $type, array $options, array $layout, int $index): array {
        return [
            'id' => sprintf('widget-%s-%d', $type, $index),
            'type' => $type,
            'options' => $options,
            'layout' => [
                'width' => (string)($layout['width'] ?? 'full'),
                'height' => (string)($layout['height'] ?? 'm'),
                'order' => is_numeric($layout['order'] ?? null) ? (float)$layout['order'] : 0.0,
            ],
            'version' => 1,
        ];
    }
}
