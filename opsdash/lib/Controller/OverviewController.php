<?php
declare(strict_types=1);

namespace OCA\Opsdash\Controller;

use OCP\AppFramework\Controller;
use OCP\AppFramework\Http\TemplateResponse;
use OCP\AppFramework\Http\DataResponse;
use OCP\AppFramework\Http;
use OCP\AppFramework\Http\Attribute\NoAdminRequired;
use OCP\AppFramework\Http\Attribute\NoCSRFRequired;
use OCP\IRequest;
use OCP\IUserSession;
use OCP\IConfig;
use OCP\Calendar\IManager;
use Psr\Log\LoggerInterface;

use OCA\Opsdash\Service\ColorPalette;
use OCA\Opsdash\Service\CalendarService;
use OCA\Opsdash\Service\NotesService;
use OCA\Opsdash\Service\PersistSanitizer;
use OCA\Opsdash\Service\OverviewSelectionService;
use OCA\Opsdash\Service\OverviewEventsCollector;
use OCA\Opsdash\Service\OverviewHistoryService;
use OCA\Opsdash\Service\OverviewAggregationService;
use OCA\Opsdash\Service\OverviewChartsBuilder;
use OCA\Opsdash\Service\OverviewBalanceService;
use OCA\Opsdash\Service\ViteAssetsService;

final class OverviewController extends Controller {
    private const MAX_OFFSET = 24;
    private const MAX_GROUP = 9;
    private const MAX_AGG_PER_CAL = 2000;
    private const MAX_AGG_TOTAL   = 5000;
    private const CONFIG_ONBOARDING = 'onboarding_state';
    private const ONBOARDING_VERSION = 1;
    private const RATIO_DECIMALS = 1;
    public function __construct(
        string $appName,
        IRequest $request,
        private IManager $calendarManager,
        private LoggerInterface $logger,
        private IUserSession $userSession,
        private IConfig $config,
        private ViteAssetsService $viteAssetsService,
        private CalendarService $calendarService,
        private NotesService $notesService,
        private PersistSanitizer $persistSanitizer,
        private OverviewSelectionService $selectionService,
        private OverviewEventsCollector $eventsCollector,
        private OverviewHistoryService $historyService,
        private OverviewAggregationService $aggregationService,
        private OverviewChartsBuilder $chartsBuilder,
        private OverviewBalanceService $balanceService,
    ) {
        parent::__construct($appName, $request);
    }

    #[NoAdminRequired]
    #[NoCSRFRequired]
    public function index(): TemplateResponse {
        // Load bundled frontend (CSS + JS)
        // CSS first to align with strict CSP (avoid runtime style injection)
        try {
            $assets = $this->viteAssetsService->resolveBuiltAssets($this->appName);
        } catch (\Throwable $e) {
            $this->logger->error('Failed to resolve Opsdash frontend assets', [
                'exception' => $e,
            ]);
            throw $e instanceof \RuntimeException ? $e : new \RuntimeException('Failed to resolve frontend assets', 0, $e);
        }
        \OCP\Util::addStyle($this->appName, 'style');
        foreach ($assets['styles'] as $style) {
            \OCP\Util::addStyle($this->appName, $style);
        }
        \OCP\Util::addScript($this->appName, $assets['script']);
        // Expose version and optional changelog URL to template
        $version = '';
        try {
            if (class_exists('OC_App') && method_exists(\OC_App::class, 'getAppVersion')) {
                $version = (string) (\OC_App::getAppVersion($this->appName) ?? '');
            }
        } catch (\Throwable) { }
        $changelog = '';
        try {
            $changelog = (string)$this->config->getAppValue($this->appName, 'changelog_url', '');
        } catch (\Throwable) { }
        $uid = (string)($this->userSession->getUser()?->getUID() ?? '');
        $bootstrapTheme = 'auto';
        if ($uid !== '') {
            try {
                $bootstrapTheme = $this->readThemePreference($uid);
            } catch (\Throwable) {
                $bootstrapTheme = 'auto';
            }
        }

        return new TemplateResponse($this->appName, 'overview', [
            'version' => $version,
            'changelog' => $changelog,
            'themePreference' => $bootstrapTheme,
        ]);
    }

    #[NoAdminRequired]
    #[NoCSRFRequired]
    public function ping(): DataResponse {
        $version = '';
        try { if (class_exists('OC_App') && method_exists(\OC_App::class, 'getAppVersion')) { $version = (string)(\OC_App::getAppVersion($this->appName) ?? ''); } } catch (\Throwable) {}
        $changelog = '';
        try { $changelog = (string)$this->config->getAppValue($this->appName, 'changelog_url', ''); } catch (\Throwable) {}
        return new DataResponse([
            'ok' => true,
            'app' => $this->appName,
            'version' => $version,
            'changelog' => $changelog,
            'ts' => time(),
        ], Http::STATUS_OK);
    }

    #[NoAdminRequired]
    #[NoCSRFRequired]
	    public function load(): DataResponse {
	        $uid = (string)($this->userSession->getUser()?->getUID() ?? '');
	        if ($uid === '') return new DataResponse(['message' => 'unauthorized'], Http::STATUS_UNAUTHORIZED);

        $method = strtoupper((string)($_SERVER['REQUEST_METHOD'] ?? 'GET'));
        $data = null;
        $provided = false;
        if ($method === 'POST') {
            // Read-only POST: allow preview parameters but never mutate state here
            $raw  = file_get_contents('php://input') ?: '';
            $tmp  = json_decode($raw, true);
            if (!is_array($tmp)) return new DataResponse(['message' => 'invalid json'], Http::STATUS_BAD_REQUEST);
            $data = $tmp;
            $provided = array_key_exists('cals', $data);
        } else { // GET support (no CSRF token required)
            // Accept multiple formats: cals[]=id, repeated cals=id, or calsCsv=comma-separated
            $calsParam = $this->request->getParam('cals', null);
            $calsCsv   = $this->request->getParam('calsCsv', null);
            $providedGet = ($calsParam !== null) || ($calsCsv !== null);
            $cals = [];
            if (is_array($calsParam)) {
                $cals = $calsParam;
            } elseif (is_string($calsParam) && $calsParam !== '') {
                $cals = [$calsParam];
            } elseif (is_string($calsCsv) && $calsCsv !== '') {
                $cals = explode(',', $calsCsv);
            }
            $data = [
                'range' => (string)$this->request->getParam('range', 'week'),
                'offset' => (int)$this->request->getParam('offset', 0),
                // include cals only if explicitly provided
                'cals' => $providedGet ? $cals : null,
                'save' => (bool)$this->request->getParam('save', false),
                'debug'=> (bool)$this->request->getParam('debug', false),
            ];
            $provided = $providedGet;
        }

        $range  = strtolower((string)($data['range']  ?? 'week'));
        if ($range !== 'month') $range = 'week';
        $offset = (int)($data['offset'] ?? 0);
        if ($offset > self::MAX_OFFSET) $offset = self::MAX_OFFSET; elseif ($offset < -self::MAX_OFFSET) $offset = -self::MAX_OFFSET;
        // Ensure this endpoint is strictly read-only; ignore any 'save' requests
        $save   = false;
        $onboardingParam = $this->request->getParam('onboarding', null);
        $forceReset = is_string($onboardingParam) && strtolower((string)$onboardingParam) === 'reset';

        // Distinguish between: no saved value vs saved empty list (user config)
        $savedRaw = (string)$this->config->getUserValue($uid, $this->appName, 'selected_cals', '__UNSET__');
        $sel = $this->selectionService->resolveInitialSelection($savedRaw, $provided, $data['cals'] ?? null);
        $hasSaved = $sel['hasSaved'];
        $savedIds = $sel['savedIds'];
        $selectedIds = $sel['selectedIds'];

        // No state change in load

        [$from, $to] = $this->calendarService->rangeBounds($range, $offset);
        $fromStr = $from->format('Y-m-d H:i:s');
        $toStr   = $to->format('Y-m-d H:i:s');

        $cals = $this->calendarService->getCalendarsFor($uid);
        $principal = 'principals/users/' . $uid;
        $principal = 'principals/users/' . $uid;

        $sidebar = [];
        $idToName = [];
        $colorsById = [];
        $colorsByName = [];
        $dbgFlag = (bool)($data['debug'] ?? false) || $this->isDebugEnabled();
        $queryDbg = [];
        $calDebug = [];
        $includeAll = $sel['includeAll'];
        foreach ($cals as $cal) {
            $id   = (string)($cal->getUri() ?? spl_object_id($cal));
            $name = $cal->getDisplayName() ?: ($cal->getUri() ?? 'calendar');
            $color = null; $raw = null; $src = 'fallback';
            try {
                if (method_exists($cal, 'getColor')) {
                    $raw = $cal->getColor();
                    if (is_string($raw) && $raw !== '') { $color = $this->normalizeColor($raw); $src = 'getColor'; }
                }
                if (($color === null || $color === '') && method_exists($cal, 'getDisplayColor')) {
                    $raw = $cal->getDisplayColor();
                    if (is_string($raw) && $raw !== '') { $color = $this->normalizeColor($raw); $src = 'getDisplayColor'; }
                }
                if (($color === null || $color === '') && method_exists($cal, 'getCalendarColor')) {
                    $raw = $cal->getCalendarColor();
                    if (is_string($raw) && $raw !== '') { $color = $this->normalizeColor($raw); $src = 'getCalendarColor'; }
                }
                if (($color === null || $color === '') && method_exists($cal, 'getColour')) {
                    $raw = $cal->getColour();
                    if (is_string($raw) && $raw !== '') { $color = $this->normalizeColor($raw); $src = 'getColour'; }
                }
            } catch (\Throwable) {}
            if ($color === null || $color === '') {
                $color = ColorPalette::fallbackHex($name !== '' ? $name : $id);
                $src = 'fallback';
            } elseif ($src === 'fallback') {
                // Server reported fallback but supplied a colour; ensure it matches calendar palette
                $color = ColorPalette::fallbackHex($name !== '' ? $name : $id);
            }
            $sidebar[] = [
                'id'=>$id, 'displayname'=>$name, 'color'=>$color,
                'color_raw'=>$raw, 'color_src'=>$src,
                // checked: if no saved selection exists, default to all checked; otherwise use saved/toggled set
                'checked'=> $includeAll ? true : in_array($id,$selectedIds,true)
            ];
            $colorsById[$id] = $color; $colorsByName[$name] = $color; $idToName[$id] = $name;
            if ($this->isDebugEnabled()) { $calDebug[$id] = ['name'=>$name,'raw'=>$raw,'norm'=>$color,'src'=>$src]; }
        }

        // Selected list to return to client: if not provided and no saved, default to all calendars
        $selectedIds = $this->selectionService->finalizeSelectedIds(
            $includeAll,
            array_map(fn($x)=>$x['id'], $sidebar),
            $selectedIds,
        );

        // Read user-defined calendar groups (id -> 0..9). Default missing IDs to 0.
        $groupsById = [];
        try {
            $gjson = (string)$this->config->getUserValue($uid, $this->appName, 'cal_groups', '');
            if ($gjson !== '') { $tmp = json_decode($gjson, true); if (is_array($tmp)) $groupsById = $tmp; }
        } catch (\Throwable) {}
        $allowedIds = array_map(fn($x)=>$x['id'], $sidebar);
        $allowedSet = array_flip($allowedIds);
        $groupsById = $this->persistSanitizer->cleanGroups($groupsById, $allowedSet, $allowedIds);

        // --- User timezone for bucketing (heatmap, DOW, per-day) ---
        $userTzName = 'UTC';
        try {
            $tz = (string)$this->config->getUserValue($uid, 'core', 'timezone', '');
            if ($tz !== '') $userTzName = $tz;
        } catch (\Throwable) {}
        try { $userTz = new \DateTimeZone($userTzName); } catch (\Throwable) { $userTz = new \DateTimeZone('UTC'); }

        // Per-calendar targets (hours) for week and month
        $targetsWeek = [];
        $targetsMonth = [];
        try {
            $tw = (string)$this->config->getUserValue($uid, $this->appName, 'cal_targets_week', '');
            $tm = (string)$this->config->getUserValue($uid, $this->appName, 'cal_targets_month', '');
            if ($tw !== '') { $tmp = json_decode($tw, true); if (is_array($tmp)) $targetsWeek = $tmp; }
            if ($tm !== '') { $tmp = json_decode($tm, true); if (is_array($tmp)) $targetsMonth = $tmp; }
        } catch (\Throwable) {}
        // Clean: only allow known ids, clamp values
        $targetsWeek = $this->persistSanitizer->cleanTargets($targetsWeek, $allowedSet);
        $targetsMonth = $this->persistSanitizer->cleanTargets($targetsMonth, $allowedSet);

        $targetsConfig = $this->readTargetsConfig($uid);

        // Derive category metadata and group mapping for balance calculations
        $categoryMeta = [];
        $groupToCategory = [];
        if (!empty($targetsConfig['categories']) && is_array($targetsConfig['categories'])) {
            foreach ($targetsConfig['categories'] as $cat) {
                if (!is_array($cat)) continue;
                $catId = substr((string)($cat['id'] ?? ''), 0, 64);
                if ($catId === '') continue;
                $label = trim((string)($cat['label'] ?? '')) ?: ucfirst($catId);
                $categoryMeta[$catId] = ['id'=>$catId, 'label'=>$label];
                if (!empty($cat['groupIds']) && is_array($cat['groupIds'])) {
                    foreach ($cat['groupIds'] as $gid) {
                        $n = (int)$gid;
                        if ($n < 0 || $n > self::MAX_GROUP) continue;
                        $groupToCategory[$n] = $catId;
                    }
                }
            }
        }
        $categoryMeta['__uncategorized__'] = ['id'=>'__uncategorized__', 'label'=>'Unassigned'];
        if (!isset($targetsConfig['balance']) || !is_array($targetsConfig['balance'])) {
            $targetsConfig['balance'] = $this->defaultBalanceConfig();
        }

	        // --- Aktuelle Periode einlesen/aggregieren ---
	        // Limits to prevent excessive processing
	        $maxPerCal = self::MAX_AGG_PER_CAL; // soft cap per calendar
	        $maxTotal  = self::MAX_AGG_TOTAL;   // soft cap overall
	        $collect = $this->eventsCollector->collect(
	            principal: $principal,
	            cals: $cals,
	            includeAll: $includeAll,
	            selectedIds: $selectedIds,
	            from: $from,
	            to: $to,
	            maxPerCal: $maxPerCal,
	            maxTotal: $maxTotal,
	            debug: $dbgFlag,
	        );
	        $events = $collect['events'];
	        $truncated = $collect['truncated'];
	        $queryDbg = $collect['queryDbg'];
	        $totalAdded = count($events);

	        $mapCalToCategory = function(string $calId) use ($groupsById, $groupToCategory) {
	            $group = isset($groupsById[$calId]) ? (int)$groupsById[$calId] : 0;
	            return $groupToCategory[$group] ?? '__uncategorized__';
	        };
	        $allDayHours = isset($targetsConfig['allDayHours']) ? max(0.0, min(24.0, (float)$targetsConfig['allDayHours'])) : 8.0;
	        $agg = $this->aggregationService->aggregate(
	            events: $events,
	            from: $from,
	            to: $to,
	            userTz: $userTz,
	            allDayHours: $allDayHours,
	            colorsById: $colorsById,
	            categoryMeta: $categoryMeta,
	            mapCalToCategory: $mapCalToCategory,
	        );
	        $totalHours = $agg['totalHours'];
	        $byCalMap = $agg['byCalMap'];
	        $byCalList = $agg['byCalList'];
	        $byDay = $agg['byDay'];
	        $perDayByCal = $agg['perDayByCal'];
	        $dowByCal = $agg['dowByCal'];
	        $perDayByCat = $agg['perDayByCat'];
	        $dowByCatTotals = $agg['dowByCatTotals'];
	        $categoryTotals = $agg['categoryTotals'];
	        $categoryColors = $agg['categoryColors'];
	        $rangeLabels = $agg['rangeLabels'];
	        $eventsCount = $agg['eventsCount'];
	        $daysCount = $agg['daysCount'];
	        $avgPerDay = $agg['avgPerDay'];
	        $avgPerEvent = $agg['avgPerEvent'];
	        $daysSeen = $agg['daysSeen'];
	        $overlapCount = $agg['overlapCount'];
	        $earliestStartTs = $agg['earliestStartTs'];
	        $latestEndTs = $agg['latestEndTs'];
	        $longestSessionHours = $agg['longestSessionHours'];
	        $long = $agg['long'];
	        $dowOrder = $agg['dowOrder'];
	        $hod = $agg['hod'];
	        $dow = $agg['dowTotals'];

        // Build effective calendar order: selected or all (on first run)
        $effectiveIds = $includeAll ? array_map(fn($x)=>$x['id'], $sidebar)
                                    : $selectedIds;
        // Ensure uniqueness/preserve order
        $seen = [];
        $effectiveIds = array_values(array_filter($effectiveIds, function($id) use (&$seen){ if(isset($seen[$id])) return false; $seen[$id]=true; return true; }));

	        $chartsPayload = $this->chartsBuilder->build(
	            effectiveIds: $effectiveIds,
	            idToName: $idToName,
	            colorsById: $colorsById,
	            byCalMap: $byCalMap,
	            byDay: $byDay,
	            rangeLabels: $rangeLabels,
	            dowOrder: $dowOrder,
	            perDayByCal: $perDayByCal,
	            dowByCal: $dowByCal,
	            hod: $hod,
	            dowTotals: $dow,
	        );
	        $hodMatrix = $chartsPayload['charts']['hod']['matrix'];

        // Quick-wins KPIs
        $activeDays = $daysCount;
        $busiest = null;
        if (!empty($byDay)) {
            $tmp = $byDay; usort($tmp, fn($a,$b)=>($b['total_hours']<=>$a['total_hours']));
            $busiest = ['date'=>$tmp[0]['date'], 'hours'=>round($tmp[0]['total_hours'],2)];
        }
        $dayHours = array_map(fn($x)=>(float)$x['total_hours'], array_values($byDay));
        sort($dayHours);
        $medianPerDay = count($dayHours)
            ? (count($dayHours)%2
                ? $dayHours[intdiv(count($dayHours),2)]
                : ($dayHours[count($dayHours)/2-1]+$dayHours[count($dayHours)/2])/2)
            : 0.0;
        $medianPerDay = round($medianPerDay,2);
        $topCal = !empty($byCalList) ? [
            'calendar'=>$byCalList[0]['calendar'],
            'share'   => $totalHours>0 ? round(100*$byCalList[0]['total_hours']/$totalHours,1) : 0.0
        ] : null;

        // Rhythmus (aus HOD)
        $vmaxRow = array_fill(0,24,0.0);
        foreach ($hodMatrix as $row){ for($i=0;$i<24;$i++){ $vmaxRow[$i] += $row[$i]; } }
        $threshold = 0.25; // 15min
        $typStart = null; $typEnd = null;
        for ($i=0;$i<24;$i++){ if ($vmaxRow[$i] >= $threshold) { $typStart = $i; break; } }
        for ($i=23;$i>=0;$i--){ if ($vmaxRow[$i] >= $threshold) { $typEnd = $i+1; break; } }
        $typStart = $typStart!==null ? sprintf('%02d:00', $typStart) : null;
        $typEnd   = $typEnd!==null   ? sprintf('%02d:00', $typEnd)   : null;

        $totalWeekend = array_sum($hod['Sat']) + array_sum($hod['Sun']);
        $totalEvening = 0.0; for($i=18;$i<24;$i++){ foreach($dowOrder as $d){ $totalEvening += $hod[$d][$i]; } }
        $weekendShare = $totalHours>0 ? round(100*$totalWeekend/$totalHours,1) : 0.0;
        $eveningShare = $totalHours>0 ? round(100*$totalEvening/$totalHours,1) : 0.0;

        // --- Vorperiode (für Δ) ---
        [$pf,$pt] = $this->calendarService->rangeBounds($range, $offset-1);
        $previousMetrics = $this->historyService->collectCategoryTotalsForRange(
            from: $pf,
            to: $pt,
            categoryMeta: $categoryMeta,
            calendars: $cals,
            includeAll: $includeAll,
            selectedIds: $selectedIds,
            principal: $principal,
            mapCalToCategory: $mapCalToCategory,
            userTz: $userTz,
            allDayHours: $allDayHours,
            captureDays: true,
        );
        $categoryTotalsPrev = $previousMetrics['totals'];
        $prevTotal = $previousMetrics['total'];
        $prevEvents = $previousMetrics['events'];
        $prevDaysSeen = $previousMetrics['daysSeen'];
        $prevDaysCount   = count($prevDaysSeen);
        $prevAvgPerDay   = $prevDaysCount   ? ($prevTotal / $prevDaysCount)   : 0;
        $prevAvgPerEvent = $prevEvents      ? ($prevTotal / $prevEvents)      : 0;

        // Normalize category colors fallback
        foreach ($categoryColors as $catId => $color) {
            if (!$color) {
                $categoryColors[$catId] = '#2563eb';
            }
        }

        // Format earliest/latest timestamps
        $earliestStart = $earliestStartTs !== null
            ? (new \DateTimeImmutable('@'.$earliestStartTs))->setTimezone($userTz)->format('Y-m-d H:i')
            : null;
        $latestEnd = $latestEndTs !== null
            ? (new \DateTimeImmutable('@'.$latestEndTs))->setTimezone($userTz)->format('Y-m-d H:i')
            : null;
        $longestSession = round($longestSessionHours, 2);

        // Determine last day off / half day
        $halfThreshold = 4.0; // hours
        $lastDayOff = null;
        $lastHalfDay = null;
        $cursor = $to;
        while ($cursor->getTimestamp() >= $from->getTimestamp()) {
            $key = $cursor->format('Y-m-d');
            $dayTotal = isset($byDay[$key]) ? (float)$byDay[$key]['total_hours'] : 0.0;
            if ($lastDayOff === null && $dayTotal <= 0.01) {
                $lastDayOff = $key;
            }
            if ($lastHalfDay === null && $dayTotal > 0.01 && $dayTotal <= $halfThreshold) {
                $lastHalfDay = $key;
            }
            if ($lastDayOff !== null && $lastHalfDay !== null) {
                break;
            }
            $nextCursor = $cursor->modify('-1 day');
            if ($nextCursor->getTimestamp() === $cursor->getTimestamp()) {
                break; // prevent infinite loop in case modify fails
            }
            $cursor = $nextCursor;
        }

        $balanceConfig = $targetsConfig['balance'];
        $trendLookback = (int)($balanceConfig['trend']['lookbackWeeks'] ?? 4);
        $precomputedDaysWorked = [];
        if (!empty($prevDaysSeen)) {
            $precomputedDaysWorked[1] = count($prevDaysSeen);
        }
        $dayOffTrend = $this->historyService->buildDayOffTrend(
            $range,
            $offset,
            $from,
            $to,
            $byDay,
            $includeAll,
            $selectedIds,
            $cals,
            $principal,
            $userTz,
            $trendLookback,
            $precomputedDaysWorked,
        );

        $trendHistory = $this->historyService->buildBalanceHistory(
            $range,
            $offset,
            $trendLookback,
            $cals,
            $includeAll,
            $selectedIds,
            $principal,
            $mapCalToCategory,
            $userTz,
            $allDayHours,
            $categoryMeta,
        );

        $balance = $this->balanceService->build(
            range: $range,
            targetsConfig: $targetsConfig,
            targetsWeek: $targetsWeek,
            targetsMonth: $targetsMonth,
            byCalMap: $byCalMap,
            idToName: $idToName,
            categoryMeta: $categoryMeta,
            categoryTotals: $categoryTotals,
            totalHours: $totalHours,
            categoryTotalsPrev: $categoryTotalsPrev,
            prevTotal: $prevTotal,
            categoryColors: $categoryColors,
            balanceConfig: $balanceConfig,
            perDayByCat: $perDayByCat,
            from: $from,
            to: $to,
            trendHistory: $trendHistory,
        );
        $balanceIndex = $balance['balanceIndex'];
        $balanceOverview = $balance['balanceOverview'];

        $delta = [
            'total_hours'   => round($totalHours - $prevTotal, 2),
            'avg_per_day'   => round($avgPerDay  - $prevAvgPerDay, 2),
            'avg_per_event' => round($avgPerEvent- $prevAvgPerEvent, 2),
            'events'        => $eventsCount - $prevEvents,
        ];

        $onboardingState = $this->readOnboardingState($uid);
        $needsOnboarding = !$onboardingState['completed'] || $onboardingState['version'] < self::ONBOARDING_VERSION;
        if ($forceReset) {
            $needsOnboarding = true;
        }
        $onboardingPayload = $onboardingState;
        $onboardingPayload['version_required'] = self::ONBOARDING_VERSION;
        $onboardingPayload['needsOnboarding'] = $needsOnboarding;
        if ($forceReset) {
            $onboardingPayload['resetRequested'] = true;
        }

        $widgets = [];
        try {
            $widgetsRaw = (string)$this->config->getUserValue($uid, $this->appName, 'widgets_layout', '');
            if ($widgetsRaw !== '') {
                $tmp = json_decode($widgetsRaw, true);
                if (is_array($tmp)) {
                    $widgets = $this->persistSanitizer->sanitizeWidgets($tmp);
                }
            }
        } catch (\Throwable) {}

        return new DataResponse([
            'ok'   => true,
            'meta' => [
                'uid'=>$uid,
                'range'=>$range,
                'offset'=>$offset,
                'from'=>$from->format('Y-m-d'),
                'to'=>$to->format('Y-m-d'),
                'truncated'=>$truncated,
                'limits'=>['maxPerCal'=>$maxPerCal,'maxTotal'=>$maxTotal,'totalProcessed'=>$totalAdded],
            ],
            'calendars' => $sidebar,
            'selected'  => $selectedIds,
            'colors'    => ['byId'=>$colorsById, 'byName'=>$colorsByName],
            'groups'    => ['byId'=>$groupsById],
            'targets'   => ['week'=>$targetsWeek, 'month'=>$targetsMonth],
            'targetsConfig' => $targetsConfig,
            'themePreference' => $this->readThemePreference($uid),
            'reportingConfig' => $this->readReportingConfig($uid),
            'deckSettings' => $this->readDeckSettings($uid),
            'widgets' => $widgets,
            'onboarding' => $onboardingPayload,
            'calDebug'  => $calDebug,
            // Always include debug envelope so clients can introspect easily
            'debug'     => [
                'principal'=>$principal,
                'from'=>$fromStr,
                'to'=>$toStr,
                'queries'=>$queryDbg,
                'enabled'=>$dbgFlag,
                'selection' => [
                    'provided' => $provided,
                    'request'  => $provided ? ($data['cals'] ?? null) : null,
                    'applied'  => $selectedIds,
                    'saved'    => $hasSaved ? $savedIds : null,
                ],
            ],
            'stats'     => [
                'total_hours'   => round($totalHours,2),
                'avg_per_day'   => round($avgPerDay,2),
                'avg_per_event' => round($avgPerEvent,2),
                'events'        => $eventsCount,

                // Zusatz-KPIs
                'active_days'    => $activeDays,
                'busiest_day'    => $busiest,       // {date, hours}
                'median_per_day' => $medianPerDay,
                'top_calendar'   => $topCal,        // {calendar, share}

                // Rhythmus/Verfügbarkeit
                'typical_start'   => $typStart,
                'typical_end'     => $typEnd,
                'earliest_start'  => $earliestStart,
                'latest_end'      => $latestEnd,
                'longest_session' => $longestSession,
                'last_day_off'    => $lastDayOff,
                'last_half_day_off' => $lastHalfDay,
                'weekend_share'   => $weekendShare,  // %
                'evening_share'   => $eveningShare,  // %
                'overlap_events'  => $overlapCount,

                // Δ vs. Vorperiode
                'delta'          => $delta,
                'balance_index'  => round($balanceIndex, 3),
                'balance_overview' => $balanceOverview,
                'day_off_trend'  => $dayOffTrend,
            ],
            'byCal'     => $byCalList,
            'byDay'     => array_values($byDay),
            'longest'   => array_slice($long,0,50),
            'charts'    => $chartsPayload['charts'],
        ], Http::STATUS_OK);
    }

    #[NoAdminRequired]
    public function save(): DataResponse {
        $uid = (string)($this->userSession->getUser()?->getUID() ?? '');
        if ($uid === '') return new DataResponse(['message' => 'unauthorized'], Http::STATUS_UNAUTHORIZED);

        $method = strtoupper((string)($_SERVER['REQUEST_METHOD'] ?? 'GET'));
        if ($method !== 'POST') {
            return new DataResponse(['message' => 'method not allowed'], Http::STATUS_METHOD_NOT_ALLOWED);
        }
        $raw  = file_get_contents('php://input') ?: '';
        $tmp  = json_decode($raw, true);
        if (!is_array($tmp)) return new DataResponse(['message' => 'invalid json'], Http::STATUS_BAD_REQUEST);
        $data = $tmp;

        $original = $data['cals'] ?? [];
        if (is_string($original)) {
            $original = array_values(array_filter(array_map(fn($x)=>substr((string)$x,0,128), explode(',', $original)), fn($x)=>$x!==''));
        }
        $cals = is_array($original) ? $original : [];
        $cals = array_values(array_unique(array_filter(array_map(fn($x)=>substr((string)$x,0,128), $cals), fn($x)=>$x!=='')));
        // Intersect with user's calendars
        $allowedIds = [];
        foreach ($this->calendarService->getCalendarsFor($uid) as $cal) { $allowedIds[] = (string)($cal->getUri() ?? spl_object_id($cal)); }
        $allowedSet = array_flip($allowedIds);
        $filtered = array_values(array_filter($cals, fn($id)=>isset($allowedSet[$id])));
        $rejected = array_values(array_diff($cals, $filtered));
        if (!empty($rejected) && $this->isDebugEnabled()) {
            $this->logger->debug('save selection filtered ids', ['app'=>$this->appName, 'rejected'=>$rejected]);
        }
        $cals = $filtered;

        // Optionally save calendar groups mapping if provided
        if (isset($data['groups']) && is_array($data['groups'])) {
            $gclean = [];
            foreach ($data['groups'] as $k=>$v) {
                $id = substr((string)$k, 0, 128);
                if (!isset($allowedSet[$id])) continue;
                $n = (int)$v; if ($n < 0) $n = 0; if ($n > 9) $n = 9;
                $gclean[$id] = $n;
            }
            try { $this->config->setUserValue($uid, $this->appName, 'cal_groups', json_encode($gclean)); }
            catch (\Throwable $e) { $this->logger->error('save groups failed: '.$e->getMessage(), ['app'=>$this->appName]); }
        }

        try {
            $this->config->setUserValue($uid, $this->appName, 'selected_cals', implode(',', $cals));
            return new DataResponse(['ok'=>true, 'saved'=>$cals], Http::STATUS_OK);
        } catch (\Throwable $e) {
            $this->logger->error('save prefs failed: '.$e->getMessage(), ['app'=>$this->appName]);
            return new DataResponse(['message'=>'error'], Http::STATUS_INTERNAL_SERVER_ERROR);
        }
    }

    #[NoAdminRequired]
    public function persist(): DataResponse {
        $uid = (string)($this->userSession->getUser()?->getUID() ?? '');
        if ($uid === '') return new DataResponse(['message' => 'unauthorized'], Http::STATUS_UNAUTHORIZED);
        if ($csrf = $this->enforceCsrf()) {
            return $csrf;
        }

        // Read request
        $raw  = file_get_contents('php://input') ?: '';
        $data = json_decode($raw, true);
        if (!is_array($data)) return new DataResponse(['message' => 'invalid json'], Http::STATUS_BAD_REQUEST);
        $hasCals = array_key_exists('cals', $data);
        $reqOriginal = null;
        if ($hasCals) {
            $reqOriginal = $data['cals'];
            if (is_string($reqOriginal)) {
                $reqOriginal = array_values(array_filter(explode(',', $reqOriginal), fn($x)=>$x!==''));
            }
            $reqOriginal = is_array($reqOriginal) ? $reqOriginal : [];
        }

        // Intersect with user's calendars
        $allowedIds = [];
        foreach ($this->calendarService->getCalendarsFor($uid) as $cal) { $allowedIds[] = (string)($cal->getUri() ?? spl_object_id($cal)); }
        $allowed = array_flip($allowedIds);

        // Save
        $after = null;
        $csv = null;
        if ($hasCals) {
            $after = array_values(array_unique(array_filter(array_map(fn($x)=>substr((string)$x,0,128), $reqOriginal), fn($x)=>isset($allowed[$x]))));
            $csv = implode(',', $after);
            $this->config->setUserValue($uid, $this->appName, 'selected_cals', $csv);
        }

        // Optional: groups mapping
        $groupsSaved = null; $groupsRead = null;
        if (isset($data['groups']) && is_array($data['groups'])) {
            $gclean = $this->persistSanitizer->cleanGroups($data['groups'], $allowed, array_keys($allowed));
            $this->config->setUserValue($uid, $this->appName, 'cal_groups', json_encode($gclean));
            $groupsSaved = $gclean;
            try {
                $gjson = (string)$this->config->getUserValue($uid, $this->appName, 'cal_groups', '');
                $tmp = $gjson!=='' ? json_decode($gjson, true) : [];
                if (is_array($tmp)) $groupsRead = $tmp;
            } catch (\Throwable) {}
        }

        // Optional: per-calendar targets (week/month) mapping: { id: hours }
        $targetsWeekSaved = null; $targetsMonthSaved = null; $targetsWeekRead = null; $targetsMonthRead = null;
        $targetsConfigSaved = null; $targetsConfigRead = null;
        $onboardingSaved = null; $onboardingRead = null;
        $themeSaved = null; $themeRead = null;
        $reportingSaved = null; $reportingRead = null;
        $deckSaved = null; $deckRead = null;
        $widgetsSaved = null; $widgetsRead = null;
        if (isset($data['targets_week'])) {
            $tw = $this->persistSanitizer->cleanTargets(is_array($data['targets_week'])?$data['targets_week']:[], $allowed);
            $this->config->setUserValue($uid, $this->appName, 'cal_targets_week', json_encode($tw));
            $targetsWeekSaved = $tw;
            try {
                $r = (string)$this->config->getUserValue($uid, $this->appName, 'cal_targets_week', '');
                $targetsWeekRead = $r!=='' ? json_decode($r, true) : [];
            } catch (\Throwable) {}
        }
        if (isset($data['targets_config'])) {
            $cleanCfg = $this->persistSanitizer->cleanTargetsConfig($data['targets_config']);
            $this->config->setUserValue($uid, $this->appName, 'targets_config', json_encode($cleanCfg));
            $targetsConfigSaved = $cleanCfg;
            try {
                $cfgJson = (string)$this->config->getUserValue($uid, $this->appName, 'targets_config', '');
                if ($cfgJson !== '') {
                    $tmp = json_decode($cfgJson, true);
                    if (is_array($tmp)) {
                        $targetsConfigRead = $this->persistSanitizer->cleanTargetsConfig($tmp);
                    }
                }
            } catch (\Throwable) {}
        }
        if (isset($data['targets_month'])) {
            $tm = $this->persistSanitizer->cleanTargets(is_array($data['targets_month'])?$data['targets_month']:[], $allowed);
            $this->config->setUserValue($uid, $this->appName, 'cal_targets_month', json_encode($tm));
            $targetsMonthSaved = $tm;
            try {
                $r = (string)$this->config->getUserValue($uid, $this->appName, 'cal_targets_month', '');
                $targetsMonthRead = $r!=='' ? json_decode($r, true) : [];
            } catch (\Throwable) {}
        }
        if (!empty($data['onboarding_reset'])) {
            try {
                $this->config->deleteUserValue($uid, $this->appName, self::CONFIG_ONBOARDING);
            } catch (\Throwable) {}
        } elseif (array_key_exists('onboarding', $data)) {
            $cleanOnboarding = $this->persistSanitizer->cleanOnboardingState($data['onboarding']);
            $this->config->setUserValue($uid, $this->appName, self::CONFIG_ONBOARDING, json_encode($cleanOnboarding));
            $onboardingSaved = $cleanOnboarding;
        }
        $onboardingRead = $this->readOnboardingState($uid);
        if (array_key_exists('theme_preference', $data)) {
            $themeValue = $this->persistSanitizer->sanitizeThemePreference($data['theme_preference']);
            if ($themeValue === null) {
                try { $this->config->deleteUserValue($uid, $this->appName, 'theme_preference'); } catch (\Throwable) {}
            } else {
                $this->config->setUserValue($uid, $this->appName, 'theme_preference', $themeValue);
                $themeSaved = $themeValue;
            }
            $themeRead = $this->readThemePreference($uid);
        }
        if (isset($data['reporting_config'])) {
            $cleanReporting = $this->persistSanitizer->sanitizeReportingConfig($data['reporting_config']);
            $this->config->setUserValue($uid, $this->appName, 'reporting_config', json_encode($cleanReporting));
            $reportingSaved = $cleanReporting;
        }
        $reportingRead = $this->readReportingConfig($uid);
        if (isset($data['targets_config_activity'])) {
            $activity = $data['targets_config_activity'];
            if (is_array($activity) && array_key_exists('showDayOffTrend', $activity)) {
                $currentCfg = $targetsConfigSaved ?? $this->readTargetsConfig($uid);
                if (is_array($currentCfg)) {
                    if (!isset($currentCfg['activityCard']) || !is_array($currentCfg['activityCard'])) {
                        $currentCfg['activityCard'] = [];
                    }
                    $currentCfg['activityCard']['showDayOffTrend'] = $activity['showDayOffTrend'] !== false;
                    $this->config->setUserValue($uid, $this->appName, 'targets_config', json_encode($currentCfg));
                    $targetsConfigSaved = $currentCfg;
                    $targetsConfigRead = $currentCfg;
                }
            }
        }
        if (isset($data['deck_settings'])) {
            $cleanDeck = $this->persistSanitizer->sanitizeDeckSettings($data['deck_settings']);
            $this->config->setUserValue($uid, $this->appName, 'deck_settings', json_encode($cleanDeck));
            $deckSaved = $cleanDeck;
        }
        $deckRead = $this->readDeckSettings($uid);
        if (isset($data['widgets'])) {
            $cleanWidgets = $this->persistSanitizer->sanitizeWidgets($data['widgets']);
            $this->config->setUserValue($uid, $this->appName, 'widgets_layout', json_encode($cleanWidgets));
            $widgetsSaved = $cleanWidgets;
        }
        try {
            $widgetsRaw = (string)$this->config->getUserValue($uid, $this->appName, 'widgets_layout', '');
            if ($widgetsRaw !== '') {
                $tmp = json_decode($widgetsRaw, true);
                if (is_array($tmp)) {
                    $widgetsRead = $this->persistSanitizer->sanitizeWidgets($tmp);
                }
            }
        } catch (\Throwable) {}

        // Read-back
        $readCsv = (string)$this->config->getUserValue($uid, $this->appName, 'selected_cals', '');
        $read = array_values(array_filter(explode(',', $readCsv), fn($x)=>$x!==''));
        if ($themeRead === null) {
            $themeRead = $this->readThemePreference($uid);
        }

        return new DataResponse([
            'ok' => true,
            'request' => $hasCals ? $reqOriginal : null,
            'saved_csv' => $csv,
            'read_csv' => $readCsv,
            'saved' => $after,
            'read'  => $read,
            'groups_saved' => $groupsSaved,
            'groups_read'  => $groupsRead,
            'targets_week_saved'  => $targetsWeekSaved,
            'targets_week_read'   => $targetsWeekRead,
            'targets_month_saved' => $targetsMonthSaved,
            'targets_month_read'  => $targetsMonthRead,
            'targets_config_saved' => $targetsConfigSaved,
            'targets_config_read'  => $targetsConfigRead,
            'onboarding_saved' => $onboardingSaved,
            'onboarding_read'  => $onboardingRead,
            'theme_preference_saved' => $themeSaved,
            'theme_preference_read' => $themeRead,
            'reporting_config_saved' => $reportingSaved,
            'reporting_config_read' => $reportingRead,
            'deck_settings_saved' => $deckSaved,
            'deck_settings_read' => $deckRead,
            'widgets_saved' => $widgetsSaved,
            'widgets_read' => $widgetsRead,
        ], Http::STATUS_OK);
    }

    #[NoAdminRequired]
    #[NoCSRFRequired]
    public function notes(): DataResponse {
        $uid = (string)($this->userSession->getUser()?->getUID() ?? '');
        if ($uid === '') return new DataResponse(['message' => 'unauthorized'], Http::STATUS_UNAUTHORIZED);

        $range  = strtolower((string)$this->request->getParam('range', 'week'));
        if ($range !== 'month') $range = 'week';
        $offset = (int)$this->request->getParam('offset', 0);
        if ($offset > 24) $offset = 24; elseif ($offset < -24) $offset = -24;

        $payload = $this->notesService->getNotes($uid, $range, $offset);
        return new DataResponse(array_merge(['ok' => true], $payload), Http::STATUS_OK);
    }

    #[NoAdminRequired]
    public function notesSave(): DataResponse {
        $uid = (string)($this->userSession->getUser()?->getUID() ?? '');
        if ($uid === '') return new DataResponse(['message' => 'unauthorized'], Http::STATUS_UNAUTHORIZED);
        if ($csrf = $this->enforceCsrf()) {
            return $csrf;
        }

        $raw  = file_get_contents('php://input') ?: '';
        $data = json_decode($raw, true);
        if (!is_array($data)) return new DataResponse(['message' => 'invalid json'], Http::STATUS_BAD_REQUEST);

        $range  = strtolower((string)($data['range'] ?? 'week'));
        if ($range !== 'month') $range = 'week';
        $offset = (int)($data['offset'] ?? 0);
        if ($offset > 24) $offset = 24; elseif ($offset < -24) $offset = -24;
        $text   = (string)($data['content'] ?? '');
        if ($this->notesService->saveNotes($uid, $range, $offset, $text)) {
            return new DataResponse(['ok'=>true], Http::STATUS_OK);
        }
        return new DataResponse(['message'=>'error'], Http::STATUS_INTERNAL_SERVER_ERROR);
    }

    /**
     * Enforce requesttoken presence/validity for POST endpoints.
     */
    private function enforceCsrf(): ?DataResponse {
        $token = (string)$this->request->getHeader('requesttoken');
        if ($token === '') {
            return new DataResponse(['message' => 'missing requesttoken'], Http::STATUS_PRECONDITION_FAILED);
        }
        if (method_exists($this->request, 'passesCSRFCheck')) {
            try {
                if (!$this->request->passesCSRFCheck()) {
                    return new DataResponse(['message' => 'invalid requesttoken'], Http::STATUS_PRECONDITION_FAILED);
                }
            } catch (\Throwable $e) {
                $this->logger->warning('csrf check failed', [
                    'app' => $this->appName,
                    'exception' => $e,
                ]);
            }
        }
        return null;
    }

    private function readReportingConfig(string $uid): array {
        try {
            $raw = (string)$this->config->getUserValue($uid, $this->appName, 'reporting_config', '');
            if ($raw !== '') {
                $decoded = json_decode($raw, true);
                if (is_array($decoded)) {
                    return $this->persistSanitizer->sanitizeReportingConfig($decoded);
                }
            }
        } catch (\Throwable) {}
        return $this->persistSanitizer->sanitizeReportingConfig(null);
    }

    private function readDeckSettings(string $uid): array {
        try {
            $raw = (string)$this->config->getUserValue($uid, $this->appName, 'deck_settings', '');
            if ($raw !== '') {
                $decoded = json_decode($raw, true);
                if (is_array($decoded)) {
                    return $this->persistSanitizer->sanitizeDeckSettings($decoded);
                }
            }
        } catch (\Throwable) {}
        return $this->persistSanitizer->sanitizeDeckSettings(null);
    }

    private function isDebugEnabled(): bool {
        try {
            $lvl = (int)$this->config->getSystemValue('loglevel', 2);
            return $lvl === 0; // 0 = debug
        } catch (\Throwable) {
            return false;
        }
    }

    /**
     * Normalize various color formats to #RRGGBB
     */
    private function normalizeColor(string $c): string {
        $c = trim($c);
        // #AARRGGBB -> #RRGGBB
        if (preg_match('/^#([0-9a-fA-F]{8})$/', $c, $m)) {
            return '#' . substr($m[1], 2);
        }
        // #RGB or #RRGGBB
        if (preg_match('/^#([0-9a-fA-F]{3})$/', $c, $m)) {
            $r = $m[1][0]; $g = $m[1][1]; $b = $m[1][2];
            return '#' . $r.$r.$g.$g.$b.$b;
        }
        if (preg_match('/^#([0-9a-fA-F]{6})$/', $c)) return $c;
        // rgb/rgba
        if (preg_match('/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i', $c, $m)) {
            $r = max(0,min(255,(int)$m[1])); $g=max(0,min(255,(int)$m[2])); $b=max(0,min(255,(int)$m[3]));
            return sprintf('#%02x%02x%02x', $r,$g,$b);
        }
        // fallback
        return $c;
    }

    private function readTargetsConfig(string $uid): array {
        try {
            $json = (string)$this->config->getUserValue($uid, $this->appName, 'targets_config', '');
            if ($json !== '') {
                $tmp = json_decode($json, true);
                if (is_array($tmp)) {
                    return $this->persistSanitizer->cleanTargetsConfig($tmp);
                }
            }
        } catch (\Throwable $e) {
            if ($this->isDebugEnabled()) {
                $this->logger->debug('read targets config failed', ['app'=>$this->appName, 'error'=>$e->getMessage()]);
            }
        }
        return $this->persistSanitizer->cleanTargetsConfig(null);
    }

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

    private function defaultBalanceConfig(): array {
        return [
            'categories' => ['work', 'hobby', 'sport'],
            'useCategoryMapping' => true,
            'index' => ['method' => 'simple_range', 'basis' => 'category'],
            'thresholds' => [
                // Deviation vs expected share (absolute). Defaults are tuned for target alignment, not raw dominance.
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

    private function readOnboardingState(string $uid): array {
        try {
            $raw = (string)$this->config->getUserValue($uid, $this->appName, self::CONFIG_ONBOARDING, '');
        } catch (\Throwable $e) {
            $raw = '';
        }
        if ($raw === '') {
            return $this->persistSanitizer->cleanOnboardingState(null);
        }
        try {
            $decoded = json_decode($raw, true, flags: JSON_THROW_ON_ERROR);
        } catch (\Throwable $e) {
            $decoded = null;
        }
        return $this->persistSanitizer->cleanOnboardingState($decoded);
    }

    private function readThemePreference(string $uid): string {
        try {
            $stored = (string)$this->config->getUserValue($uid, $this->appName, 'theme_preference', '');
        } catch (\Throwable $e) {
            $stored = '';
        }
        $normalized = $this->persistSanitizer->sanitizeThemePreference($stored);
        return $normalized ?? 'auto';
    }

}
