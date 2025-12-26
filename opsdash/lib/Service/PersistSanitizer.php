<?php
declare(strict_types=1);

namespace OCA\Opsdash\Service;

final class PersistSanitizer {
    private const MAX_TARGET_HOURS = 10000;
    private const MAX_GROUP = 9;
    private const MAX_DECK_BOARD_ID = 100000;
    private const PRESET_NAME_MAX_LEN = 80;
    private const RATIO_DECIMALS = 1;

    /**
     * @param array<string,mixed> $targets
     * @param array<string,int> $allowedSet
     * @return array<string,float>
     */
    public function cleanTargets(array $targets, array $allowedSet): array {
        $out = [];
        foreach ($targets as $id => $value) {
            $key = substr((string)$id, 0, 128);
            if (!isset($allowedSet[$key])) {
                continue;
            }
            if (!is_numeric($value)) {
                continue;
            }
            $out[$key] = round($this->clampFloat((float)$value, 0.0, self::MAX_TARGET_HOURS), 2);
        }
        return $out;
    }

    /**
     * @param array<string,mixed> $groupsById
     * @param array<string,int> $allowedSet
     * @param array<int,string> $allowedIds
     * @return array<string,int>
     */
    public function cleanGroups(array $groupsById, array $allowedSet, array $allowedIds): array {
        $out = [];
        foreach ($allowedIds as $id) {
            $key = substr((string)$id, 0, 128);
            if ($key === '') {
                continue;
            }
            $out[$key] = 0;
        }
        foreach ($groupsById as $id => $raw) {
            $key = substr((string)$id, 0, 128);
            if ($key === '' || !isset($allowedSet[$key])) {
                continue;
            }
            $n = is_numeric($raw) ? (int)floor((float)$raw) : 0;
            if ($n < 0 || $n > self::MAX_GROUP) {
                $n = 0;
            }
            $out[$key] = $n;
        }
        return $out;
    }

    /**
     * @param mixed $cfg
     * @return array<string,mixed>
     */
    public function cleanTargetsConfig($cfg): array {
        $base = $this->defaultTargetsConfig();
        if (!is_array($cfg)) {
            return $base;
        }

        $out = $base;

        if (isset($cfg['totalHours'])) {
            $out['totalHours'] = round($this->clampFloat((float)$cfg['totalHours'], 0, self::MAX_TARGET_HOURS), 2);
        }

        if (isset($cfg['categories']) && is_array($cfg['categories'])) {
            $cats = [];
            foreach ($cfg['categories'] as $cat) {
                if (!is_array($cat)) {
                    continue;
                }
                $id = substr((string)($cat['id'] ?? ''), 0, 64);
                if ($id === '') {
                    $id = 'cat_' . count($cats);
                }
                $label = trim((string)($cat['label'] ?? ''));
                if ($label === '') {
                    $label = ucfirst($id);
                }
                $target = round($this->clampFloat((float)($cat['targetHours'] ?? 0), 0, self::MAX_TARGET_HOURS), 2);
                $includeWeekend = !empty($cat['includeWeekend']);
                $paceMode = ((string)($cat['paceMode'] ?? '') === 'time_aware') ? 'time_aware' : 'days_only';
                $groupIds = [];
                if (isset($cat['groupIds']) && is_array($cat['groupIds'])) {
                    foreach ($cat['groupIds'] as $gid) {
                        $n = (int)$gid;
                        if ($n < 0 || $n > self::MAX_GROUP) {
                            continue;
                        }
                        if (!in_array($n, $groupIds, true)) {
                            $groupIds[] = $n;
                        }
                    }
                }
                $color = $this->sanitizeHexColor($cat['color'] ?? null);
                $cats[] = [
                    'id' => $id,
                    'label' => $label,
                    'targetHours' => $target,
                    'includeWeekend' => $includeWeekend,
                    'paceMode' => $paceMode,
                    'color' => $color,
                    'groupIds' => $groupIds,
                ];
                if (count($cats) >= 12) {
                    break;
                }
            }
            if (!empty($cats)) {
                $out['categories'] = $cats;
            }
        }

        $out['activityCard'] = $this->cleanActivityCardConfig($cfg['activityCard'] ?? null);
        $out['balance'] = $this->cleanBalanceConfig($cfg['balance'] ?? null, $out['categories']);

        if (isset($cfg['pace']) && is_array($cfg['pace'])) {
            $pace = $cfg['pace'];
            $out['pace']['includeWeekendTotal'] = !empty($pace['includeWeekendTotal']);
            $mode = (string)($pace['mode'] ?? $out['pace']['mode']);
            $out['pace']['mode'] = $mode === 'time_aware' ? 'time_aware' : 'days_only';
            if (isset($pace['thresholds']) && is_array($pace['thresholds'])) {
                $thr = $pace['thresholds'];
                if (isset($thr['onTrack'])) {
                    $out['pace']['thresholds']['onTrack'] = round($this->clampFloat((float)$thr['onTrack'], -100, 100), 2);
                }
                if (isset($thr['atRisk'])) {
                    $out['pace']['thresholds']['atRisk'] = round($this->clampFloat((float)$thr['atRisk'], -100, 100), 2);
                }
            }
        }

        if (isset($cfg['forecast']) && is_array($cfg['forecast'])) {
            $fc = $cfg['forecast'];
            $out['forecast']['methodPrimary'] = ((string)($fc['methodPrimary'] ?? '') === 'momentum') ? 'momentum' : 'linear';
            if (isset($fc['momentumLastNDays'])) {
                $n = (int)round((float)$fc['momentumLastNDays']);
                if ($n < 1) {
                    $n = 1;
                }
                if ($n > 14) {
                    $n = 14;
                }
                $out['forecast']['momentumLastNDays'] = $n;
            }
            if (isset($fc['padding'])) {
                $out['forecast']['padding'] = round($this->clampFloat((float)$fc['padding'], 0, 100), 1);
            }
        }

        if (isset($cfg['ui']) && is_array($cfg['ui'])) {
            $ui = $cfg['ui'];
            foreach ($out['ui'] as $key => $val) {
                if (array_key_exists($key, $ui)) {
                    $out['ui'][$key] = !empty($ui[$key]);
                }
            }
        }

        if (isset($cfg['timeSummary']) && is_array($cfg['timeSummary'])) {
            $ts = $cfg['timeSummary'];
            foreach ($out['timeSummary'] as $key => $val) {
                if (array_key_exists($key, $ts)) {
                    $out['timeSummary'][$key] = (bool)$ts[$key];
                }
            }
        }

        if (isset($cfg['includeZeroDaysInStats'])) {
            $out['includeZeroDaysInStats'] = !empty($cfg['includeZeroDaysInStats']);
        }

        if (isset($cfg['allDayHours'])) {
            $out['allDayHours'] = round($this->clampFloat((float)$cfg['allDayHours'], 0, 24), 2);
        }

        return $out;
    }

    /**
     * @param mixed $cfg
     * @return array<string,mixed>
     */
    public function cleanActivityCardConfig($cfg): array {
        $base = $this->defaultActivityCardConfig();
        if (!is_array($cfg)) {
            return $base;
        }
        $result = $base;
        $booleanKeys = [
            'showWeekendShare',
            'showEveningShare',
            'showEarliestLatest',
            'showOverlaps',
            'showLongestSession',
            'showLastDayOff',
            'showDayOffTrend',
            'showHint',
        ];
        foreach ($booleanKeys as $key) {
            if (array_key_exists($key, $cfg)) {
                $result[$key] = !empty($cfg[$key]);
            }
        }
        if (isset($cfg['forecastMode'])) {
            $mode = strtolower((string)$cfg['forecastMode']);
            if (in_array($mode, ['off', 'total', 'calendar', 'category'], true)) {
                $result['forecastMode'] = $mode;
            }
        }
        return $result;
    }

    /**
     * @param mixed $cfg
     * @param array<int,array<string,mixed>> $categories
     * @return array<string,mixed>
     */
    public function cleanBalanceConfig($cfg, array $categories): array {
        $base = $this->defaultBalanceConfig();
        $result = $base;

        $available = [];
        foreach ($categories as $cat) {
            if (!is_array($cat)) {
                continue;
            }
            $id = substr((string)($cat['id'] ?? ''), 0, 64);
            if ($id !== '') {
                $available[] = $id;
            }
        }

        if (!is_array($cfg)) {
            if (!empty($available)) {
                $result['categories'] = array_slice($available, 0, count($result['categories']));
            }
            return $result;
        }

        $orderSource = isset($cfg['categories']) && is_array($cfg['categories']) ? $cfg['categories'] : $base['categories'];
        $order = [];
        foreach ($orderSource as $rawId) {
            $id = substr((string)$rawId, 0, 64);
            if ($id === '') {
                continue;
            }
            if (!empty($available) && !in_array($id, $available, true)) {
                continue;
            }
            if (!in_array($id, $order, true)) {
                $order[] = $id;
            }
        }
        if (empty($order)) {
            $order = !empty($available) ? array_slice($available, 0, count($base['categories'])) : $base['categories'];
        }
        $result['categories'] = $order;
        $result['useCategoryMapping'] = !empty($cfg['useCategoryMapping']);

        $method = (string)($cfg['index']['method'] ?? $base['index']['method']);
        $result['index']['method'] = $method === 'shannon_evenness' ? 'shannon_evenness' : 'simple_range';
        $basis = (string)($cfg['index']['basis'] ?? $base['index']['basis']);
        $allowedBasis = ['off', 'category', 'calendar', 'both'];
        $result['index']['basis'] = in_array($basis, $allowedBasis, true) ? $basis : 'category';

        if (isset($cfg['thresholds']) && is_array($cfg['thresholds'])) {
            $thr = $cfg['thresholds'];
            if (isset($thr['noticeAbove'])) {
                $result['thresholds']['noticeAbove'] = round($this->clampFloat((float)$thr['noticeAbove'], 0.0, 1.0), self::RATIO_DECIMALS);
            }
            if (isset($thr['noticeBelow'])) {
                $result['thresholds']['noticeBelow'] = round($this->clampFloat((float)$thr['noticeBelow'], 0.0, 1.0), self::RATIO_DECIMALS);
            }
            if (isset($thr['warnAbove'])) {
                $result['thresholds']['warnAbove'] = round($this->clampFloat((float)$thr['warnAbove'], 0.0, 1.0), self::RATIO_DECIMALS);
            }
            if (isset($thr['warnBelow'])) {
                $result['thresholds']['warnBelow'] = round($this->clampFloat((float)$thr['warnBelow'], 0.0, 1.0), self::RATIO_DECIMALS);
            }
            if (isset($thr['warnIndex'])) {
                $result['thresholds']['warnIndex'] = round($this->clampFloat((float)$thr['warnIndex'], 0.0, 1.0), self::RATIO_DECIMALS);
            }
        }

        $displayMode = (string)($cfg['relations']['displayMode'] ?? $base['relations']['displayMode']);
        $result['relations']['displayMode'] = $displayMode === 'factor' ? 'factor' : 'ratio';

        if (isset($cfg['trend']) && is_array($cfg['trend'])) {
            $lookback = (int)($cfg['trend']['lookbackWeeks'] ?? $base['trend']['lookbackWeeks']);
            if ($lookback < 1) {
                $lookback = 1;
            }
            if ($lookback > 12) {
                $lookback = 12;
            }
            $result['trend']['lookbackWeeks'] = $lookback;
        }

        if (isset($cfg['dayparts']) && is_array($cfg['dayparts'])) {
            $result['dayparts']['enabled'] = !empty($cfg['dayparts']['enabled']);
        }

        if (isset($cfg['ui']) && is_array($cfg['ui'])) {
            $result['ui']['showNotes'] = !empty($cfg['ui']['showNotes']);
        }

        return $result;
    }

    /**
     * @param mixed $value
     * @return array<string,mixed>
     */
    public function sanitizeReportingConfig($value): array {
        $defaults = $this->defaultReportingConfig();
        if (!is_array($value)) {
            return $defaults;
        }
        $schedule = $value['schedule'] ?? 'both';
        if ($schedule !== 'week' && $schedule !== 'month') {
            $schedule = 'both';
        }
        $interim = $value['interim'] ?? 'none';
        if (!in_array($interim, ['none', 'midweek', 'daily'], true)) {
            $interim = 'none';
        }
        $reminder = $value['reminderLead'] ?? 'none';
        if (!in_array($reminder, ['none', '1d', '2d'], true)) {
            $reminder = 'none';
        }
        $threshold = (float)($value['riskThreshold'] ?? $defaults['riskThreshold']);
        if (!is_finite($threshold) || $threshold < 0 || $threshold > 1) {
            $threshold = $defaults['riskThreshold'];
        }
        return [
            'enabled' => !empty($value['enabled']),
            'schedule' => $schedule,
            'interim' => $interim,
            'reminderLead' => $reminder,
            'alertOnRisk' => array_key_exists('alertOnRisk', $value) ? (bool)$value['alertOnRisk'] : true,
            'riskThreshold' => round($threshold, 3),
            'notifyEmail' => array_key_exists('notifyEmail', $value) ? (bool)$value['notifyEmail'] : true,
            'notifyNotification' => !empty($value['notifyNotification']),
        ];
    }

    /**
     * @param mixed $value
     * @return array<string,mixed>
     */
    public function sanitizeDeckSettings($value): array {
        $defaults = $this->defaultDeckSettings();
        if (!is_array($value)) {
            return $defaults;
        }
        $allowedFilters = [
            'all',
            'mine',
            'open_all',
            'open_mine',
            'done_all',
            'done_mine',
            'archived_all',
            'archived_mine',
        ];
        $defaultFilter = in_array(($value['defaultFilter'] ?? 'all'), $allowedFilters, true)
            ? $value['defaultFilter']
            : 'all';
        $hiddenBoards = [];
        if (!empty($value['hiddenBoards']) && is_array($value['hiddenBoards'])) {
            foreach ($value['hiddenBoards'] as $id) {
                $validated = filter_var($id, FILTER_VALIDATE_INT, [
                    'options' => ['min_range' => 1, 'max_range' => self::MAX_DECK_BOARD_ID],
                ]);
                if ($validated === false) {
                    continue;
                }
                $clamped = $this->clampDeckBoardId((int)$validated);
                if ($clamped !== null) {
                    $hiddenBoards[] = $clamped;
                }
            }
            $hiddenBoards = array_values(array_unique($hiddenBoards));
        }
        $mineMode = 'assignee';
        if (isset($value['mineMode']) && is_string($value['mineMode'])) {
            $mode = $value['mineMode'];
            if (in_array($mode, ['assignee', 'creator', 'both'], true)) {
                $mineMode = $mode;
            }
        }
        $ticker = $defaults['ticker'];
        if (isset($value['ticker']) && is_array($value['ticker'])) {
            $ticker = [
                'autoScroll' => array_key_exists('autoScroll', $value['ticker'])
                    ? $this->normalizeBool($value['ticker']['autoScroll'], $defaults['ticker']['autoScroll'])
                    : $defaults['ticker']['autoScroll'],
                'intervalSeconds' => $this->clampInt(
                    $value['ticker']['intervalSeconds'] ?? $defaults['ticker']['intervalSeconds'],
                    3,
                    10,
                    $defaults['ticker']['intervalSeconds']
                ),
                'showBoardBadges' => array_key_exists('showBoardBadges', $value['ticker'])
                    ? $this->normalizeBool($value['ticker']['showBoardBadges'], $defaults['ticker']['showBoardBadges'])
                    : $defaults['ticker']['showBoardBadges'],
            ];
        }
        return [
            'enabled' => array_key_exists('enabled', $value) ? $this->normalizeBool($value['enabled'], $defaults['enabled']) : $defaults['enabled'],
            'filtersEnabled' => array_key_exists('filtersEnabled', $value) ? $this->normalizeBool($value['filtersEnabled'], $defaults['filtersEnabled']) : $defaults['filtersEnabled'],
            'defaultFilter' => $defaultFilter,
            'hiddenBoards' => $hiddenBoards,
            'mineMode' => $mineMode,
            'solvedIncludesArchived' => array_key_exists('solvedIncludesArchived', $value)
                ? $this->normalizeBool($value['solvedIncludesArchived'], $defaults['solvedIncludesArchived'])
                : $defaults['solvedIncludesArchived'],
            'ticker' => $ticker,
        ];
    }

    /**
     * @param mixed $value
     * @return array<string,mixed>
     */
    public function sanitizeWidgets($value): array {
        if (!is_array($value)) return [];
        if (array_key_exists('tabs', $value)) {
            $tabsRaw = $value['tabs'];
            if (!is_array($tabsRaw)) return [];
            $tabs = [];
            foreach ($tabsRaw as $idx => $tab) {
                if (!is_array($tab)) continue;
                $id = substr(trim((string)($tab['id'] ?? '')), 0, 48);
                if ($id === '') {
                    $id = sprintf('tab-%d', count($tabs) + 1);
                }
                $labelRaw = trim((string)($tab['label'] ?? ''));
                $label = $labelRaw !== '' ? substr($labelRaw, 0, 48) : sprintf('Tab %d', count($tabs) + 1);
                $widgets = $this->sanitizeWidgetList($tab['widgets'] ?? []);
                $tabs[] = [
                    'id' => $id,
                    'label' => $label,
                    'widgets' => $widgets,
                ];
            }
            if (empty($tabs)) return [];
            $defaultTabId = trim((string)($value['defaultTabId'] ?? $value['defaultTab'] ?? ''));
            $found = false;
            foreach ($tabs as $tab) {
                if ($tab['id'] === $defaultTabId) {
                    $found = true;
                    break;
                }
            }
            if (!$found) {
                $defaultTabId = $tabs[0]['id'];
            }
            return [
                'tabs' => $tabs,
                'defaultTabId' => $defaultTabId,
            ];
        }
        return $this->sanitizeWidgetList($value);
    }

    /**
     * @param mixed $value
     * @return array<int,array<string,mixed>>
     */
    private function sanitizeWidgetList($value): array {
        if (!is_array($value)) return [];
        $cleaned = [];
        foreach ($value as $idx => $item) {
            if (!is_array($item)) continue;
            $type = substr(trim((string)($item['type'] ?? '')), 0, 64);
            if ($type === '') continue;
            $id = substr(trim((string)($item['id'] ?? '')), 0, 64);
            $layout = $item['layout'] ?? [];
            $width = ($layout['width'] ?? '') === 'quarter' || ($layout['width'] ?? '') === 'half' ? $layout['width'] : 'full';
            $heightRaw = (string)($layout['height'] ?? '');
            $height = ($heightRaw === 's' || $heightRaw === 'l' || $heightRaw === 'xl') ? $heightRaw : 'm';
            $orderRaw = $layout['order'] ?? 0;
            $order = is_numeric($orderRaw) ? (float)$orderRaw : 0.0;
            $options = (isset($item['options']) && is_array($item['options'])) ? $item['options'] : [];
            $cleaned[] = [
                'id' => $id !== '' ? $id : sprintf('widget-%s-%d', $type, count($cleaned) + 1),
                'type' => $type,
                'options' => $options,
                'layout' => [
                    'width' => $width,
                    'height' => $height,
                    'order' => $order,
                ],
                'version' => (int)($item['version'] ?? 1) ?: 1,
            ];
        }
        return $cleaned;
    }

    public function sanitizeThemePreference($value): ?string {
        $v = strtolower(trim((string)$value));
        if ($v === 'light' || $v === 'dark' || $v === 'auto') {
            return $v;
        }
        return null;
    }

    /**
     * @param mixed $state
     * @return array<string,mixed>
     */
    public function cleanOnboardingState($state): array {
        $result = $this->defaultOnboardingState();
        if (!is_array($state)) {
            return $result;
        }
        $result['completed'] = !empty($state['completed']);
        $version = (int)($state['version'] ?? 0);
        if ($version < 0) {
            $version = 0;
        } elseif ($version > 1000) {
            $version = 1000;
        }
        $result['version'] = $version;
        $strategy = trim((string)($state['strategy'] ?? ''));
        $result['strategy'] = substr($strategy, 0, 64);
        $completedAt = trim((string)($state['completed_at'] ?? ''));
        if ($completedAt !== '') {
            $result['completed_at'] = substr($completedAt, 0, 32);
        }
        $dashboardMode = trim((string)($state['dashboardMode'] ?? ''));
        if ($dashboardMode === 'quick' || $dashboardMode === 'standard' || $dashboardMode === 'pro') {
            $result['dashboardMode'] = $dashboardMode;
        }
        return $result;
    }

    public function sanitizePresetName(string $name): string {
        $clean = trim(preg_replace('/\s+/', ' ', $name) ?? '');
        if ($clean === '') {
            return '';
        }
        // Allow letters, numbers, space, dot, dash, underscore only; strip everything else
        $clean = preg_replace('/[^A-Za-z0-9 _\-.]/u', '', $clean) ?? '';
        if ($clean === '') {
            return '';
        }
        if (mb_strlen($clean) > self::PRESET_NAME_MAX_LEN) {
            $clean = mb_substr($clean, 0, self::PRESET_NAME_MAX_LEN);
        }
        return $clean;
    }

    /**
     * @return array<string,mixed>
     */
    private function defaultTargetsConfig(): array {
        return [
            'totalHours' => 48,
            'categories' => [
                ['id' => 'work', 'label' => 'Work', 'targetHours' => 32, 'includeWeekend' => false, 'paceMode' => 'days_only', 'groupIds' => [1]],
                ['id' => 'hobby', 'label' => 'Hobby', 'targetHours' => 6, 'includeWeekend' => true, 'paceMode' => 'days_only', 'groupIds' => [2]],
                ['id' => 'sport', 'label' => 'Sport', 'targetHours' => 4, 'includeWeekend' => true, 'paceMode' => 'days_only', 'groupIds' => [3]],
            ],
            'pace' => [
                'includeWeekendTotal' => true,
                'mode' => 'days_only',
                'thresholds' => ['onTrack' => -2, 'atRisk' => -10],
            ],
            'forecast' => [
                'methodPrimary' => 'linear',
                'momentumLastNDays' => 2,
                'padding' => 1.5,
            ],
            'ui' => [
                'showTotalDelta' => true,
                'showNeedPerDay' => true,
                'showCategoryBlocks' => true,
                'badges' => true,
                'includeWeekendToggle' => true,
                'showCalendarCharts' => true,
                'showCategoryCharts' => true,
            ],
            'allDayHours' => 8.0,
            'timeSummary' => [
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
            ],
            'activityCard' => $this->defaultActivityCardConfig(),
            'balance' => $this->defaultBalanceConfig(),
            'includeZeroDaysInStats' => false,
        ];
    }

    /**
     * @return array<string,mixed>
     */
    private function defaultActivityCardConfig(): array {
        return [
            'showWeekendShare' => true,
            'showEveningShare' => true,
            'showEarliestLatest' => true,
            'showOverlaps' => true,
            'showLongestSession' => true,
            'showLastDayOff' => true,
            'showDayOffTrend' => true,
            'showHint' => true,
            'forecastMode' => 'total',
        ];
    }

    /**
     * @return array<string,mixed>
     */
    private function defaultBalanceConfig(): array {
        return [
            'categories' => ['work', 'hobby', 'sport'],
            'useCategoryMapping' => true,
            'index' => ['method' => 'simple_range', 'basis' => 'category'],
            'thresholds' => [
                'noticeAbove' => 0.15,
                'noticeBelow' => 0.15,
                'warnAbove' => 0.30,
                'warnBelow' => 0.30,
                'warnIndex' => 0.60,
            ],
            'relations' => ['displayMode' => 'ratio'],
            'trend' => ['lookbackWeeks' => 4],
            'dayparts' => ['enabled' => false],
            'ui' => [
                'showNotes' => false,
            ],
        ];
    }

    /**
     * @return array<string,mixed>
     */
    private function defaultReportingConfig(): array {
        return [
            'enabled' => false,
            'schedule' => 'both',
            'interim' => 'none',
            'reminderLead' => '1d',
            'alertOnRisk' => true,
            'riskThreshold' => 0.85,
            'notifyEmail' => true,
            'notifyNotification' => true,
        ];
    }

    /**
     * @return array<string,mixed>
     */
    private function defaultDeckSettings(): array {
        return [
            'enabled' => true,
            'filtersEnabled' => true,
            'defaultFilter' => 'all',
            'hiddenBoards' => [],
            'mineMode' => 'assignee',
            'solvedIncludesArchived' => true,
            'ticker' => [
                'autoScroll' => true,
                'intervalSeconds' => 5,
                'showBoardBadges' => true,
            ],
        ];
    }

    /**
     * @return array<string,mixed>
     */
    private function defaultOnboardingState(): array {
        return [
            'completed' => false,
            'version' => 0,
            'strategy' => '',
            'completed_at' => '',
            'dashboardMode' => 'standard',
        ];
    }

    private function clampFloat(float $value, float $min, float $max): float {
        if (!is_finite($value)) {
            return $min;
        }
        if ($value < $min) {
            return $min;
        }
        if ($value > $max) {
            return $max;
        }
        return $value;
    }

    private function sanitizeHexColor($value): ?string {
        if (!is_string($value)) {
            return null;
        }
        $v = trim($value);
        if ($v === '') {
            return null;
        }
        if (preg_match('/^#([0-9a-fA-F]{6})$/', $v, $m)) {
            return strtoupper('#' . $m[1]);
        }
        if (preg_match('/^#([0-9a-fA-F]{3})$/', $v, $m)) {
            $r = $m[1][0];
            $g = $m[1][1];
            $b = $m[1][2];
            return strtoupper('#' . $r . $r . $g . $g . $b . $b);
        }
        return null;
    }

    private function toBool(mixed $value): bool {
        if (is_bool($value)) {
            return $value;
        }
        if (is_int($value) || is_float($value)) {
            return (float)$value !== 0.0;
        }
        if (is_string($value)) {
            $v = strtolower(trim($value));
            if ($v === '' || $v === '0' || $v === 'false' || $v === 'no' || $v === 'off' || $v === 'null') {
                return false;
            }
            if ($v === '1' || $v === 'true' || $v === 'yes' || $v === 'on') {
                return true;
            }
            if (is_numeric($v)) {
                return (float)$v !== 0.0;
            }
            return true;
        }
        return !empty($value);
    }

    private function normalizeBool(mixed $value, bool $default): bool {
        if (is_bool($value)) {
            return $value;
        }
        if (is_string($value)) {
            $filtered = filter_var($value, FILTER_VALIDATE_BOOL, FILTER_NULL_ON_FAILURE);
            if ($filtered !== null) {
                return $filtered;
            }
        }
        if (is_int($value)) {
            if ($value === 1) {
                return true;
            }
            if ($value === 0) {
                return false;
            }
            return $default;
        }
        if (is_float($value)) {
            if ($value === 1.0) {
                return true;
            }
            if ($value === 0.0) {
                return false;
            }
            return $default;
        }
        return $default;
    }

    private function clampDeckBoardId(int $id): ?int {
        if ($id <= 0 || $id > self::MAX_DECK_BOARD_ID) {
            return null;
        }
        return $id;
    }

    private function clampInt(mixed $value, int $min, int $max, int $fallback): int {
        if (!is_numeric($value)) {
            return $fallback;
        }
        $n = (int)floor((float)$value);
        if ($n < $min) {
            return $min;
        }
        if ($n > $max) {
            return $max;
        }
        return $n;
    }
}
