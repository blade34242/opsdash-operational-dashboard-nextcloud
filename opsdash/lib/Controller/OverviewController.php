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

use DateInterval;
use DateTimeImmutable;
use DateTimeInterface;
use JsonException;
use Sabre\VObject\Reader;
// use Sabre\VObject\Reader; // removed to avoid parsing raw ICS in NC32
use OCA\Opsdash\Service\ColorPalette;

final class OverviewController extends Controller {
    private const MAX_OFFSET = 24;
    private const MAX_TARGET_HOURS = 10000;
    private const MAX_GROUP = 9;
    private const MAX_AGG_PER_CAL = 2000;
    private const MAX_AGG_TOTAL   = 5000;
    private const MAX_PRESETS = 20;
    private const PRESET_NAME_MAX_LEN = 80;
    private const PRESETS_KEY = 'targets_presets';
    private const CONFIG_ONBOARDING = 'onboarding_state';
    private const ONBOARDING_VERSION = 1;
    public function __construct(
        string $appName,
        IRequest $request,
        private IManager $calendarManager,
        private LoggerInterface $logger,
        private IUserSession $userSession,
        private IConfig $config,
    ) {
        parent::__construct($appName, $request);
    }

    #[NoAdminRequired]
    #[NoCSRFRequired]
    public function index(): TemplateResponse {
        // Load bundled frontend (CSS + JS)
        // CSS first to align with strict CSP (avoid runtime style injection)
        try {
            $assets = $this->resolveBuiltAssets();
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
        return new TemplateResponse($this->appName, 'overview', [
            'version' => $version,
            'changelog' => $changelog,
        ]);
    }

    /**
     * Resolve built asset names (script + styles) from the Vite manifest.
     *
     * @return array{script: string, styles: string[]}
     */
    private function resolveBuiltAssets(): array {
        if (!class_exists('OC_App') || !method_exists(\OC_App::class, 'getAppPath')) {
            throw new \RuntimeException('Unable to locate app path (OC_App::getAppPath unavailable)');
        }
        $appPath = \OC_App::getAppPath($this->appName);
        if (!is_string($appPath) || $appPath === '') {
            throw new \RuntimeException('Unable to resolve app path for ' . $this->appName);
        }
        $manifestPath = $appPath . '/js/.vite/manifest.json';
        if (!is_readable($manifestPath)) {
            throw new \RuntimeException('Vite manifest not found: ' . $manifestPath);
        }
        $raw = @file_get_contents($manifestPath);
        if ($raw === false) {
            throw new \RuntimeException('Failed to read Vite manifest: ' . $manifestPath);
        }
        try {
            $json = json_decode($raw, true, flags: JSON_THROW_ON_ERROR);
        } catch (JsonException $e) {
            throw new \RuntimeException('Invalid Vite manifest JSON: ' . $manifestPath, 0, $e);
        }
        if (!isset($json['src/main.ts']) || !is_array($json['src/main.ts'])) {
            throw new \RuntimeException('Vite manifest missing entry for src/main.ts');
        }
        $entry = $json['src/main.ts'];
        $scriptFile = isset($entry['file']) && is_string($entry['file']) ? trim($entry['file']) : '';
        if ($scriptFile === '') {
            throw new \RuntimeException('Vite manifest entry for src/main.ts is missing "file"');
        }
        $scriptPath = preg_replace('/\.js$/', '', $scriptFile);
        if ($scriptPath === '' || $scriptPath === $scriptFile) {
            throw new \RuntimeException('Unexpected script filename in manifest: ' . $scriptFile);
        }
        $styles = [];
        if (isset($entry['css']) && is_array($entry['css'])) {
            foreach ($entry['css'] as $cssPath) {
                if (!is_string($cssPath) || $cssPath === '') {
                    continue;
                }
                $css = preg_replace('/\.css$/', '', $cssPath);
                if ($css !== '' && $css !== $cssPath) {
                    $styles[] = $css;
                }
            }
        }

        return [
            'script' => $scriptPath,
            'styles' => $styles,
        ];
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
    public function presetsList(): DataResponse {
        $uid = (string)($this->userSession->getUser()?->getUID() ?? '');
        if ($uid === '') {
            return new DataResponse(['message' => 'unauthorized'], Http::STATUS_UNAUTHORIZED);
        }
        $presets = $this->readPresets($uid);
        return new DataResponse([
            'ok' => true,
            'presets' => $this->formatPresetList($presets),
        ], Http::STATUS_OK);
    }

    #[NoAdminRequired]
    #[NoCSRFRequired]
    public function presetsSave(): DataResponse {
        $uid = (string)($this->userSession->getUser()?->getUID() ?? '');
        if ($uid === '') {
            return new DataResponse(['message' => 'unauthorized'], Http::STATUS_UNAUTHORIZED);
        }
        $raw = file_get_contents('php://input') ?: '';
        $data = json_decode($raw, true);
        if (!is_array($data)) {
            return new DataResponse(['message' => 'invalid json'], Http::STATUS_BAD_REQUEST);
        }
        $name = $this->sanitizePresetName((string)($data['name'] ?? ''));
        if ($name === '') {
            return new DataResponse(['message' => 'missing name'], Http::STATUS_BAD_REQUEST);
        }
        $calendars = $this->getCalendarsFor($uid);
        $allowedIds = [];
        foreach ($calendars as $cal) {
            $allowedIds[] = (string)($cal->getUri() ?? spl_object_id($cal));
        }
        $allowedSet = array_flip($allowedIds);
        $sanitized = $this->sanitizePresetPayload($data, $allowedSet, $allowedIds);
        $payload = $sanitized['payload'];
        $warnings = $sanitized['warnings'];

        $presets = $this->readPresets($uid);
        $now = (new DateTimeImmutable('now'))->format(DateTimeInterface::ATOM);
        $existing = $presets[$name] ?? null;
        $presets[$name] = [
            'created_at' => is_array($existing) && isset($existing['created_at']) ? (string)$existing['created_at'] : $now,
            'updated_at' => $now,
            'payload' => $payload,
        ];
        if (count($presets) > self::MAX_PRESETS) {
            $presets = $this->trimPresets($presets);
        }
        $this->writePresets($uid, $presets);

        return new DataResponse([
            'ok' => true,
            'preset' => [
                'name' => $name,
                'createdAt' => $presets[$name]['created_at'] ?? null,
                'updatedAt' => $presets[$name]['updated_at'] ?? null,
            ],
            'presets' => $this->formatPresetList($presets),
            'warnings' => $warnings,
        ], Http::STATUS_OK);
    }

    #[NoAdminRequired]
    #[NoCSRFRequired]
    public function presetsLoad(string $name): DataResponse {
        $uid = (string)($this->userSession->getUser()?->getUID() ?? '');
        if ($uid === '') {
            return new DataResponse(['message' => 'unauthorized'], Http::STATUS_UNAUTHORIZED);
        }
        $decodedName = $this->sanitizePresetName(urldecode($name));
        if ($decodedName === '') {
            return new DataResponse(['message' => 'not found'], Http::STATUS_NOT_FOUND);
        }
        $presets = $this->readPresets($uid);
        if (!isset($presets[$decodedName])) {
            return new DataResponse(['message' => 'not found'], Http::STATUS_NOT_FOUND);
        }
        $entry = $presets[$decodedName];
        $storedPayload = is_array($entry['payload'] ?? null) ? $entry['payload'] : [];

        $calendars = $this->getCalendarsFor($uid);
        $allowedIds = [];
        foreach ($calendars as $cal) {
            $allowedIds[] = (string)($cal->getUri() ?? spl_object_id($cal));
        }
        $allowedSet = array_flip($allowedIds);

        $sanitized = $this->sanitizePresetPayload($storedPayload, $allowedSet, $allowedIds);
        $payload = $sanitized['payload'];
        $warnings = $sanitized['warnings'];

        $presets[$decodedName]['payload'] = $payload;
        $this->writePresets($uid, $presets);

        return new DataResponse([
            'ok' => true,
            'preset' => array_merge($payload, [
                'name' => $decodedName,
                'createdAt' => $entry['created_at'] ?? null,
                'updatedAt' => $entry['updated_at'] ?? null,
                'warnings' => $warnings,
            ]),
            'warnings' => $warnings,
        ], Http::STATUS_OK);
    }

    #[NoAdminRequired]
    #[NoCSRFRequired]
    public function presetsDelete(string $name): DataResponse {
        $uid = (string)($this->userSession->getUser()?->getUID() ?? '');
        if ($uid === '') {
            return new DataResponse(['message' => 'unauthorized'], Http::STATUS_UNAUTHORIZED);
        }
        $decodedName = $this->sanitizePresetName(urldecode($name));
        if ($decodedName === '') {
            return new DataResponse(['message' => 'not found'], Http::STATUS_NOT_FOUND);
        }
        $presets = $this->readPresets($uid);
        if (!isset($presets[$decodedName])) {
            return new DataResponse(['message' => 'not found'], Http::STATUS_NOT_FOUND);
        }
        unset($presets[$decodedName]);
        $this->writePresets($uid, $presets);
        return new DataResponse([
            'ok' => true,
            'presets' => $this->formatPresetList($presets),
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
        $hasSaved = $savedRaw !== '__UNSET__';
        $savedIds = $hasSaved ? array_values(array_filter(explode(',', $savedRaw), fn($x)=>$x!=='')) : [];

        $selectedIds = $savedIds; // may be empty, but $hasSaved differentiates meaning
        if ($provided) {
            $reqCals  = $data['cals'];
            if (is_string($reqCals)) {
                $reqCals = array_values(array_filter(explode(',', $reqCals), fn($x)=>$x!==''));
            }
            $reqCals = is_array($reqCals) ? $reqCals : [];
            // Respect explicit empty selection (means: none)
            $selectedIds = array_values(array_unique(array_filter(array_map(fn($x)=>substr((string)$x,0,128), $reqCals), fn($x)=>$x!=='')));
        }

        // No state change in load

        [$from, $to] = $this->rangeBounds($range, $offset);
        $fromStr = $from->format('Y-m-d H:i:s');
        $toStr   = $to->format('Y-m-d H:i:s');

        $cals = $this->getCalendarsFor($uid);
        $principal = 'principals/users/' . $uid;
        $principal = 'principals/users/' . $uid;

        $sidebar = [];
        $idToName = [];
        $colorsById = [];
        $colorsByName = [];
        $dbgFlag = (bool)($data['debug'] ?? false) || $this->isDebugEnabled();
        $queryDbg = [];
        $calDebug = [];
        $includeAll = (!$hasSaved && !$provided);
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
        if ($includeAll) {
            $selectedIds = array_map(fn($x)=>$x['id'], $sidebar);
        }

        // Read user-defined calendar groups (id -> 0..9). Default missing IDs to 0.
        $groupsById = [];
        try {
            $gjson = (string)$this->config->getUserValue($uid, $this->appName, 'cal_groups', '');
            if ($gjson !== '') { $tmp = json_decode($gjson, true); if (is_array($tmp)) $groupsById = $tmp; }
        } catch (\Throwable) {}
        $allowedIds = array_map(fn($x)=>$x['id'], $sidebar);
        $allowedSet = array_flip($allowedIds);
        $groupsById = $this->cleanGroups($groupsById, $allowedSet, $allowedIds);

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
        $targetsWeek = $this->cleanTargets($targetsWeek, $allowedSet);
        $targetsMonth = $this->cleanTargets($targetsMonth, $allowedSet);

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
        $events = [];
        // Limits to prevent excessive processing
        $maxPerCal = self::MAX_AGG_PER_CAL; // soft cap per calendar
        $maxTotal  = self::MAX_AGG_TOTAL;   // soft cap overall
        $totalAdded = 0;
        $truncated = false;
        foreach ($cals as $cal) {
            $cid = (string)($cal->getUri() ?? spl_object_id($cal));
            if (!$includeAll && !in_array($cid,$selectedIds,true)) continue;

            $calName = $cal->getDisplayName() ?: ($cal->getUri() ?? 'calendar');
            $rawRows = [];
            $used = 'none';
            // Use NC32 calendar query API via manager
            try {
                if (method_exists($this->calendarManager, 'newQuery') && method_exists($this->calendarManager, 'searchForPrincipal')) {
                    $q = $this->calendarManager->newQuery($principal);
                    if (method_exists($q, 'addSearchCalendar')) $q->addSearchCalendar((string)$cal->getUri());
                    if (method_exists($q, 'setTimerangeStart')) $q->setTimerangeStart($from);
                    if (method_exists($q, 'setTimerangeEnd'))   $q->setTimerangeEnd($to);
                    $res = $this->calendarManager->searchForPrincipal($q);
                    if (is_array($res)) $rawRows = $res;
                    $used = 'IManager::searchForPrincipal';
                }
            } catch (\Throwable $e) { $this->logger->error('calendar query failed: '.$e->getMessage(), ['app'=>$this->appName]); }
            // Debug: log shape of results per calendar
            $mode='empty';
            $first=$rawRows[0]??null;
            if (is_array($first) && isset($first['objects'])) $mode='structured';
            elseif (is_array($first) && (isset($first['calendardata'])||isset($first['object']))) $mode='ics';
            if ($this->isDebugEnabled()) {
                $this->logger->debug('calendar query result', ['app'=>$this->appName,'cal'=>$cid,'mode'=>$mode,'rows'=>is_array($rawRows)?count($rawRows):0]);
            }
            $rows = $this->parseRows($rawRows, $calName, $cid);
            // Apply per-calendar cap
            if (count($rows) > $maxPerCal) { $rows = array_slice($rows, 0, $maxPerCal); $truncated = true; }
            // Apply total cap
            $remaining = $maxTotal - $totalAdded;
            if ($remaining <= 0) { $truncated = true; break; }
            if (count($rows) > $remaining) { $rows = array_slice($rows, 0, $remaining); $truncated = true; }
            $events = array_merge($events, $rows);
            $totalAdded += count($rows);
            if ($dbgFlag) {
                $queryDbg[] = [
                    'calendar_id'=>$cid,
                    'method'=>$used,
                    'mode'=>$mode,
                    'rows'=>is_array($rawRows)?count($rawRows):0,
                    'sample_raw'=>isset($rawRows[0]) ? $this->debugSanitizeSample($rawRows[0]) : null,
                    'sample_parsed'=>isset($rows[0]) ? $rows[0] : null,
                    'sample_detect_allday'=>isset($rawRows[0]) ? $this->debugDetectAllDay($rawRows[0]) : null,
                ];
            }
        }

        $totalHours=0.0; $byCalMap=[]; $byDay=[]; $dow=array_fill_keys(['Mon','Tue','Wed','Thu','Fri','Sat','Sun'],0.0); $long=[]; $daysSeen=[];
        $perDayByCal = [];
        $dowByCal    = [];
        $perDayByCat = [];
        $dowByCatTotals = [];
        $categoryTotals = [];
        $categoryTotalsPrev = [];
        foreach ($categoryMeta as $catId => $_meta) {
            $categoryTotals[$catId] = 0.0;
            $categoryTotalsPrev[$catId] = 0.0;
        }
        $categoryColors = array_fill_keys(array_keys($categoryMeta), null);
        $dayIntervals = [];
        $overlapCount = 0;
        $mapCalToCategory = function(string $calId) use ($groupsById, $groupToCategory) {
            $group = isset($groupsById[$calId]) ? (int)$groupsById[$calId] : 0;
            return $groupToCategory[$group] ?? '__uncategorized__';
        };
        $earliestStartTs = null;
        $latestEndTs = null;
        $longestSessionHours = 0.0;
        // 24×7 Heatmap-Aggregation vorbereiten
        $dowOrder=['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
        $hod=[]; foreach($dowOrder as $d){ $hod[$d]=array_fill(0,24,0.0); }
        $allDayHours = isset($targetsConfig['allDayHours']) ? max(0.0, min(24.0, (float)$targetsConfig['allDayHours'])) : 8.0;

        foreach ($events as $r) {
            $isAllDayEvent = !empty($r['allday']);
            $h=(float)($r['hours']??0);
            $calName=(string)($r['calendar']??'');
            $calId = (string)($r['calendar_id'] ?? $calName);
            $byCalMap[$calId] = $byCalMap[$calId] ?? ['id'=>$calId,'calendar'=>$calName,'events_count'=>0,'total_hours'=>0.0];

            $catId = $mapCalToCategory($calId);
            if (!isset($categoryTotals[$catId])) {
                $categoryTotals[$catId] = 0.0;
            }
            if ($categoryColors[$catId] === null && isset($colorsById[$calId])) {
                $categoryColors[$catId] = $colorsById[$calId];
            }

            // Parse start/end in their original tz (if provided), then convert to user tz
            $stStr=(string)($r['start']??''); $enStr=(string)($r['end']??'');
            $stTzName=(string)($r['startTz']??''); $enTzName=(string)($r['endTz']??'');
            try { $srcTzStart = new \DateTimeZone($stTzName ?: 'UTC'); } catch (\Throwable) { $srcTzStart = new \DateTimeZone('UTC'); }
            try { $srcTzEnd   = new \DateTimeZone($enTzName ?: 'UTC'); } catch (\Throwable) { $srcTzEnd   = new \DateTimeZone('UTC'); }
            $dtStart = $stStr !== '' ? new \DateTimeImmutable($stStr, $srcTzStart) : null;
            $dtEnd   = $enStr !== '' ? new \DateTimeImmutable($enStr, $srcTzEnd)   : null;
            $dtStartUser = $dtStart?->setTimezone($userTz);
            $dtEndUser   = $dtEnd?->setTimezone($userTz);

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
            if ($isAllDayEvent) {
                if ($allDayHours > $longestSessionHours) {
                    $longestSessionHours = $allDayHours;
                }
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
                    $byDay[$dayKey] = $byDay[$dayKey] ?? ['date'=>$dayKey,'events_count'=>0,'total_hours'=>0.0];
                    if ($i === 0) {
                        $byDay[$dayKey]['events_count']++;
                    }
                    $byDay[$dayKey]['total_hours'] += $perDayContribution;
                    $daysSeen[$dayKey] = true;
                    $dname = $currentDay->format('D');
                    if (!isset($perDayByCal[$dayKey])) $perDayByCal[$dayKey] = [];
                    $perDayByCal[$dayKey][$calId] = ($perDayByCal[$dayKey][$calId] ?? 0) + $perDayContribution;
                    if (!isset($perDayByCat[$dayKey])) $perDayByCat[$dayKey] = [];
                    $perDayByCat[$dayKey][$catId] = ($perDayByCat[$dayKey][$catId] ?? 0) + $perDayContribution;
                    if (!isset($dowByCal[$dname])) $dowByCal[$dname] = [];
                    $dowByCal[$dname][$calId] = ($dowByCal[$dname][$calId] ?? 0) + $perDayContribution;
                    if (!isset($dowByCatTotals[$dname])) $dowByCatTotals[$dname] = [];
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
                    'calendar'=>$calName,
                    'summary'=>(string)($r['title']??''),
                    'duration_h'=>$eventHours,
                    'start'=>(string)($r['start']??''),
                    'desc'=>(string)($r['desc']??''),
                    'allday'=>true,
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
                        if (!isset($dayIntervals[$dayKey])) {
                            $dayIntervals[$dayKey] = [];
                        }
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

            // By-day: count event on start day; hours distributed below will adjust totals per day correctly
            if ($dtStartUser) {
                $dayStart = $dtStartUser->format('Y-m-d');
                $byDay[$dayStart] = $byDay[$dayStart] ?? ['date'=>$dayStart,'events_count'=>0,'total_hours'=>0.0];
                $byDay[$dayStart]['events_count']++;
                $daysSeen[$dayStart]=true;
            }

            $long[]=[
                'calendar'=>$calName,
                'summary'=>(string)($r['title']??''),
                'duration_h'=>$eventHours,
                'start'=>(string)($r['start']??''),
                'desc'=>(string)($r['desc']??''),
                'allday'=>false,
            ];

            // ---- 24×7 Heatmap and per-day/per-DOW stacks in USER TZ ----
            if ($dtStartUser && $dtEndUser && $dtEndUser > $dtStartUser) {
                $cur = $dtStartUser;
                while ($cur < $dtEndUser) {
                    // end of current hour in user tz
                    $hourStart = \DateTimeImmutable::createFromFormat('Y-m-d H:00:00', $cur->format('Y-m-d H:00:00'), $userTz) ?: $cur;
                    $slotEnd = $hourStart->modify('+1 hour');
                    if ($slotEnd > $dtEndUser) $slotEnd = $dtEndUser;
                    $dur = max(0, ($slotEnd->getTimestamp() - $cur->getTimestamp()) / 3600.0);
                    $dname = $cur->format('D');
                    $hour  = (int)$cur->format('G');
                    if (isset($hod[$dname][$hour])) $hod[$dname][$hour] += $dur;
                    // per-day per-calendar stack
                    $dayKey = $cur->format('Y-m-d');
                    if (!isset($perDayByCal[$dayKey])) $perDayByCal[$dayKey] = [];
                    $perDayByCal[$dayKey][$calId] = ($perDayByCal[$dayKey][$calId] ?? 0) + $dur;
                    // dow per-calendar stack
                    if (!isset($dowByCal[$dname])) $dowByCal[$dname] = [];
                    $dowByCal[$dname][$calId] = ($dowByCal[$dname][$calId] ?? 0) + $dur;
                    // byDay totals per slot day
                    $byDay[$dayKey] = $byDay[$dayKey] ?? ['date'=>$dayKey,'events_count'=>0,'total_hours'=>0.0];
                    $byDay[$dayKey]['total_hours'] += $dur;
                    $daysSeen[$dayKey]=true;
                    if (!isset($perDayByCat[$dayKey])) $perDayByCat[$dayKey] = [];
                    $perDayByCat[$dayKey][$catId] = ($perDayByCat[$dayKey][$catId] ?? 0) + $dur;
                    if (!isset($dowByCatTotals[$dname])) $dowByCatTotals[$dname] = [];
                    $dowByCatTotals[$dname][$catId] = ($dowByCatTotals[$dname][$catId] ?? 0) + $dur;
                    $cur = $slotEnd;
                }
            }
        }

        // Recompute DOW totals from heatmap matrix to ensure tz-correct sums
        foreach ($dowOrder as $d) {
            $dow[$d] = array_sum($hod[$d]);
        }
        usort($long,fn($a,$b)=>$b['duration_h']<=>$a['duration_h']);
        $byCalList = array_values($byCalMap);
        usort($byCalList,fn($a,$b)=>$b['total_hours']<=>$a['total_hours']);
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
        $daysCount   = count($daysSeen);
        $avgPerDay   = $daysCount   ? ($totalHours / $daysCount)      : 0;
        $avgPerEvent = $eventsCount ? ($totalHours / $eventsCount)    : 0;

        // Build effective calendar order: selected or all (on first run)
        $effectiveIds = $includeAll ? array_map(fn($x)=>$x['id'], $sidebar)
                                    : $selectedIds;
        // Ensure uniqueness/preserve order
        $seen = [];
        $effectiveIds = array_values(array_filter($effectiveIds, function($id) use (&$seen){ if(isset($seen[$id])) return false; $seen[$id]=true; return true; }));

        // Pie/Bar/DOW (include zero-slices for selected calendars)
        $pieIds   = $effectiveIds;
        $pieLabels= array_map(fn($id)=>$idToName[$id] ?? $id, $pieIds);
        $pieData  = array_map(fn($id)=>isset($byCalMap[$id]) ? round((float)$byCalMap[$id]['total_hours'],2) : 0.0, $pieIds);
        $pieColors= array_map(fn($id)=>$colorsById[$id] ?? '#60a5fa', $pieIds);
        $barLabels=$rangeLabels;
        $barData=array_map(fn($x)=>round($x['total_hours'],2),array_values($byDay));
        $dowLabels=$dowOrder;
        $dowData=array_map(fn($k)=>round((float)($dow[$k]??0),2), $dowOrder);

        // Build stacked series using effectiveIds
        $perDaySeries = [];
        foreach ($effectiveIds as $cid) {
            $cname = $idToName[$cid] ?? $cid;
            $perDaySeries[] = [
                'id'   => $cid,
                'name' => $cname,
                'color'=> $colorsById[$cid] ?? '#60a5fa',
                'data' => array_map(fn($d)=>round((float)($perDayByCal[$d][$cid] ?? 0),2), $barLabels),
            ];
        }
        $dowSeries = [];
        foreach ($effectiveIds as $cid) {
            $cname = $idToName[$cid] ?? $cid;
            $dowSeries[] = [
                'id'   => $cid,
                'name' => $cname,
                'color'=> $colorsById[$cid] ?? '#60a5fa',
                'data' => array_map(fn($k)=>round((float)($dowByCal[$k][$cid] ?? 0),2), $dowLabels),
            ];
        }

        // 24×7 Heatmap
        $hodHours = range(0,23);
        $hodMatrix = array_map(fn($d)=>array_map(fn($v)=>round((float)$v,2), $hod[$d]), $dowOrder);

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
        [$pf,$pt] = $this->rangeBounds($range, $offset-1);
        $pfStr=$pf->format('Y-m-d H:i:s'); $ptStr=$pt->format('Y-m-d H:i:s');
        $prevTotal=0.0; $prevEvents=0; $prevDaysSeen=[];
        foreach ($cals as $cal) {
            $cid = (string)($cal->getUri() ?? spl_object_id($cal));
            if (!empty($selectedIds) && !in_array($cid,$selectedIds,true)) continue;
            $rawRows = [];
            try {
                if (method_exists($this->calendarManager, 'newQuery') && method_exists($this->calendarManager, 'searchForPrincipal')) {
                    $q = $this->calendarManager->newQuery($principal);
                    if (method_exists($q, 'addSearchCalendar')) $q->addSearchCalendar((string)$cal->getUri());
                    if (method_exists($q, 'setTimerangeStart')) $q->setTimerangeStart($pf);
                    if (method_exists($q, 'setTimerangeEnd'))   $q->setTimerangeEnd($pt);
                    $res = $this->calendarManager->searchForPrincipal($q);
                    if (is_array($res)) $rawRows = $res;
                }
            } catch (\Throwable) {}
            $mode='empty'; $first=$rawRows[0]??null;
            if (is_array($first) && isset($first['objects'])) $mode='structured';
            elseif (is_array($first) && (isset($first['calendardata'])||isset($first['object']))) $mode='ics';
            if ($this->isDebugEnabled()) {
                $this->logger->debug('calendar prev-period result', ['app'=>$this->appName,'cal'=>$cid,'mode'=>$mode,'rows'=>is_array($rawRows)?count($rawRows):0]);
            }
            $rows = $this->parseRows($rawRows, (string)($cal->getDisplayName() ?: ($cal->getUri() ?? 'calendar')));
            foreach ($rows as $r){
                $isAllDayPrev = !empty($r['allday']);
                $eventHours = (float)($r['hours'] ?? 0.0);
                if ($eventHours < 0) {
                    $eventHours = 0.0;
                }
                $prevCalId = (string)($r['calendar_id'] ?? ($r['calendar'] ?? ''));
                $prevCat = $mapCalToCategory($prevCalId);

                $startStr = (string)($r['start'] ?? '');
                $endStr   = (string)($r['end'] ?? '');
                $startTzName = (string)($r['startTz'] ?? '');
                $endTzName   = (string)($r['endTz'] ?? '');

                $dtStartUser = null;
                $dtEndUser = null;

                if ($isAllDayPrev) {
                    try { $srcTzStart = new \DateTimeZone($startTzName ?: 'UTC'); } catch (\Throwable) { $srcTzStart = new \DateTimeZone('UTC'); }
                    try { $srcTzEnd   = new \DateTimeZone($endTzName ?: 'UTC'); } catch (\Throwable) { $srcTzEnd   = new \DateTimeZone('UTC'); }
                    $dtStart = $startStr !== '' ? new \DateTimeImmutable($startStr, $srcTzStart) : null;
                    $dtEnd   = $endStr !== '' ? new \DateTimeImmutable($endStr, $srcTzEnd) : null;
                    $dtStartUser = $dtStart?->setTimezone($userTz);
                    $dtEndUser   = $dtEnd?->setTimezone($userTz);
                    if ($dtStartUser) {
                        $dtStartUser = $dtStartUser->setTime(0, 0, 0);
                    }
                    if ($dtEndUser) {
                        $dtEndUser = $dtEndUser->setTime(0, 0, 0);
                    }
                    if (!$dtEndUser && $dtStartUser) {
                        $dtEndUser = $dtStartUser->modify('+1 day');
                    }
                    $daysSpannedPrev = 1;
                    if ($dtStartUser && $dtEndUser) {
                        $eventDurSecondsPrev = max(0, $dtEndUser->getTimestamp() - $dtStartUser->getTimestamp());
                        if ($eventDurSecondsPrev <= 0) {
                            $eventDurSecondsPrev = 86400;
                        }
                        $daysSpannedPrev = max(1, (int)ceil($eventDurSecondsPrev / 86400));
                    }
                    $eventHours = $allDayHours * $daysSpannedPrev;
                    if ($dtStartUser) {
                        $currentDayPrev = $dtStartUser;
                        for ($i = 0; $i < $daysSpannedPrev; $i++) {
                            $prevDaysSeen[$currentDayPrev->format('Y-m-d')] = true;
                            $currentDayPrev = $currentDayPrev->modify('+1 day');
                        }
                    }
                } else {
                    $dayKeyPrev = substr($startStr, 0, 10);
                    if ($dayKeyPrev !== '') {
                        $prevDaysSeen[$dayKeyPrev] = true;
                    }
                }

                $prevTotal += $eventHours;
                $prevEvents++;
                $categoryTotalsPrev[$prevCat] = ($categoryTotalsPrev[$prevCat] ?? 0.0) + $eventHours;
            }
        }
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

        // Balance calculations
        $balanceConfig = $targetsConfig['balance'];
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
                'share' => round($share * 100, (int)($balanceConfig['ui']['roundPercent'] ?? 1)),
                'prevShare' => round($prevShare * 100, (int)($balanceConfig['ui']['roundPercent'] ?? 1)),
                'delta' => round($deltaShare, 1),
                'color' => $categoryColors[$catId] ?? '#2563eb',
            ];
        }
        $balanceIndex = 0.0;
        if (!empty($categoryShares)) {
            $maxShare = max($categoryShares);
            $minShare = min($categoryShares);
            $balanceIndex = max(0.0, min(1.0, 1.0 - ($maxShare - $minShare)));
        }

        // Relations
        $relations = [];
        $relationMode = (string)($balanceConfig['relations']['displayMode'] ?? 'ratio');
        $roundRatio = (int)($balanceConfig['ui']['roundRatio'] ?? 1);
        $formatRatio = function(float $a, float $b) use ($relationMode, $roundRatio) {
            if ($a <= 0.0001 && $b <= 0.0001) return '—';
            if ($b <= 0.0001 && $a > 0.0001) return '∞ : 1';
            if ($a <= 0.0001 && $b > 0.0001) return '0 : 1';
            $ratio = $b > 0 ? ($a / $b) : 0.0;
            if ($relationMode === 'factor') {
                return sprintf('%.' . $roundRatio . 'f×', round($ratio, $roundRatio));
            }
            return sprintf('%.' . $roundRatio . 'f : 1', round($ratio, $roundRatio));
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

        // Trend badge
        $trendEntries = [];
        $maxDeltaAbs = 0.0; $maxDeltaLabel = '';
        foreach ($categoryDelta as $catId => $deltaVal) {
            $label = $categoryMeta[$catId]['label'] ?? $catId;
            $trendEntries[] = ['id'=>$catId,'label'=>$label,'delta'=>round($deltaVal,1)];
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
        $balanceTrend = ['delta'=>$trendEntries, 'badge'=>$trendBadge];

        // Daily stacks per category
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
                $cats[] = ['id'=>$catId,'label'=>$meta['label'],'hours'=>round($hours,2),'share'=>$share];
            }
            $balanceDaily[] = [
                'date'=>$key,
                'weekday'=>$cursor->format('D'),
                'total_hours'=>round($dayTotal,2),
                'categories'=>$cats,
            ];
            $cursor = $cursor->modify('+1 day');
        }

        // Insights & warnings
        $balanceWarnings = [];
        $balanceInsights = [];
        $noticeThreshold = (float)($balanceConfig['thresholds']['noticeMaxShare'] ?? 0.65);
        $warnThreshold   = (float)($balanceConfig['thresholds']['warnMaxShare'] ?? 0.75);
        $warnIndex       = (float)($balanceConfig['thresholds']['warnIndex'] ?? 0.60);
        $maxShareCat = null; $maxShareVal = -1.0;
        foreach ($categoryShares as $catId => $shareVal) {
            if ($shareVal > $maxShareVal) {
                $maxShareVal = $shareVal;
                $maxShareCat = $catId;
            }
        }
        if ($maxShareCat !== null) {
            $maxSharePct = round($maxShareVal * 100, 1);
            $label = $categoryMeta[$maxShareCat]['label'] ?? $maxShareCat;
            if ($maxShareVal >= $warnThreshold) {
                $balanceWarnings[] = sprintf('%s accounts for %s%% of tracked hours.', $label, $maxSharePct);
            } elseif ($maxShareVal >= $noticeThreshold) {
                $balanceWarnings[] = sprintf('%s trending high at %s%%.', $label, $maxSharePct);
            }
        }
        if ($balanceIndex < $warnIndex) {
            $balanceWarnings[] = sprintf('Balance index low (%.2f).', $balanceIndex);
        }

        if (!empty($balanceConfig['ui']['showInsights'])) {
            if ($maxShareCat && $maxShareVal >= $warnThreshold && isset($categoryMeta[$maxShareCat])) {
                $balanceInsights[] = sprintf('%s dominates this week (%s%%).', $categoryMeta[$maxShareCat]['label'], round($maxShareVal * 100,1));
            }
            if ($workId && $hobbyId && $totalHours > 0) {
                $hobbyShare = $categoryShares[$hobbyId] ?? 0;
                if ($hobbyShare > 0 && $hobbyShare < 0.15) {
                    $balanceInsights[] = sprintf('%s stays below 15%% — consider scheduling dedicated time.', $categoryMeta[$hobbyId]['label'] ?? 'Hobby');
                }
            }
        }


        if (count($balanceInsights) > 2) {
            $balanceInsights = array_slice($balanceInsights, 0, 2);
        }

        $balanceOverview = [
            'index' => round($balanceIndex, 3),
            'categories' => $balanceCategories,
            'relations' => $relations,
            'trend' => $balanceTrend,
            'daily' => $balanceDaily,
            'insights' => $balanceInsights,
            'warnings' => $balanceWarnings,
        ];

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
            ],
            'byCal'     => $byCalList,
            'byDay'     => array_values($byDay),
            'longest'   => array_slice($long,0,50),
            'charts'    => [
                'pie'    => ['labels'=>$pieLabels,'ids'=>$pieIds,'data'=>$pieData,'colors'=>$pieColors],
                'perDay' => ['labels'=>$barLabels,'data'=>$barData],
                'dow'    => ['labels'=>$dowLabels,'data'=>$dowData],
                'perDaySeries' => ['labels'=>$barLabels, 'series'=>$perDaySeries],
                'dowSeries'    => ['labels'=>$dowLabels, 'series'=>$dowSeries],
                // 24×7-Heatmap
                'hod'    => ['dows'=>$dowLabels, 'hours'=>$hodHours, 'matrix'=>$hodMatrix],
            ],
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
        foreach ($this->getCalendarsFor($uid) as $cal) { $allowedIds[] = (string)($cal->getUri() ?? spl_object_id($cal)); }
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
        foreach ($this->getCalendarsFor($uid) as $cal) { $allowedIds[] = (string)($cal->getUri() ?? spl_object_id($cal)); }
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
            $gclean = $this->cleanGroups($data['groups'], $allowed, array_keys($allowed));
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
        if (isset($data['targets_week'])) {
            $tw = $this->cleanTargets(is_array($data['targets_week'])?$data['targets_week']:[], $allowed);
            $this->config->setUserValue($uid, $this->appName, 'cal_targets_week', json_encode($tw));
            $targetsWeekSaved = $tw;
            try {
                $r = (string)$this->config->getUserValue($uid, $this->appName, 'cal_targets_week', '');
                $targetsWeekRead = $r!=='' ? json_decode($r, true) : [];
            } catch (\Throwable) {}
        }
        if (isset($data['targets_config'])) {
            $cleanCfg = $this->cleanTargetsConfig($data['targets_config']);
            $this->config->setUserValue($uid, $this->appName, 'targets_config', json_encode($cleanCfg));
            $targetsConfigSaved = $cleanCfg;
            try {
                $cfgJson = (string)$this->config->getUserValue($uid, $this->appName, 'targets_config', '');
                if ($cfgJson !== '') {
                    $tmp = json_decode($cfgJson, true);
                    if (is_array($tmp)) {
                        $targetsConfigRead = $this->cleanTargetsConfig($tmp);
                    }
                }
            } catch (\Throwable) {}
        }
        if (isset($data['targets_month'])) {
            $tm = $this->cleanTargets(is_array($data['targets_month'])?$data['targets_month']:[], $allowed);
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
            $cleanOnboarding = $this->cleanOnboardingState($data['onboarding']);
            $this->config->setUserValue($uid, $this->appName, self::CONFIG_ONBOARDING, json_encode($cleanOnboarding));
            $onboardingSaved = $cleanOnboarding;
        }
        $onboardingRead = $this->readOnboardingState($uid);
        if (array_key_exists('theme_preference', $data)) {
            $themeValue = $this->sanitizeThemePreference($data['theme_preference']);
            if ($themeValue === null) {
                try { $this->config->deleteUserValue($uid, $this->appName, 'theme_preference'); } catch (\Throwable) {}
            } else {
                $this->config->setUserValue($uid, $this->appName, 'theme_preference', $themeValue);
                $themeSaved = $themeValue;
            }
            $themeRead = $this->readThemePreference($uid);
        }
        if (isset($data['reporting_config'])) {
            $cleanReporting = $this->sanitizeReportingConfig($data['reporting_config']);
            $this->config->setUserValue($uid, $this->appName, 'reporting_config', json_encode($cleanReporting));
            $reportingSaved = $cleanReporting;
        }
        $reportingRead = $this->readReportingConfig($uid);
        if (isset($data['deck_settings'])) {
            $cleanDeck = $this->sanitizeDeckSettings($data['deck_settings']);
            $this->config->setUserValue($uid, $this->appName, 'deck_settings', json_encode($cleanDeck));
            $deckSaved = $cleanDeck;
        }
        $deckRead = $this->readDeckSettings($uid);

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

        // Current and previous period bounds
        [$fromCur,] = $this->rangeBounds($range, $offset);
        [$fromPrev,] = $this->rangeBounds($range, $offset - 1);
        $kCur  = $this->notesKey($range, $fromCur);
        $kPrev = $this->notesKey($range, $fromPrev);

        $cur  = (string)$this->config->getUserValue($uid, $this->appName, $kCur, '');
        $prev = (string)$this->config->getUserValue($uid, $this->appName, $kPrev, '');

        return new DataResponse([
            'ok' => true,
            'period' => [
                'type' => $range,
                'current_from' => $fromCur->format('Y-m-d'),
                'previous_from' => $fromPrev->format('Y-m-d'),
            ],
            'notes' => [ 'current' => $cur, 'previous' => $prev ],
        ], Http::STATUS_OK);
    }

    #[NoAdminRequired]
    public function notesSave(): DataResponse {
        $uid = (string)($this->userSession->getUser()?->getUID() ?? '');
        if ($uid === '') return new DataResponse(['message' => 'unauthorized'], Http::STATUS_UNAUTHORIZED);

        $raw  = file_get_contents('php://input') ?: '';
        $data = json_decode($raw, true);
        if (!is_array($data)) return new DataResponse(['message' => 'invalid json'], Http::STATUS_BAD_REQUEST);

        $range  = strtolower((string)($data['range'] ?? 'week'));
        if ($range !== 'month') $range = 'week';
        $offset = (int)($data['offset'] ?? 0);
        if ($offset > 24) $offset = 24; elseif ($offset < -24) $offset = -24;
        $text   = (string)($data['content'] ?? '');
        // Clamp length to a reasonable size (e.g. 32k)
        if (strlen($text) > 32768) $text = substr($text, 0, 32768);

        [$fromCur,] = $this->rangeBounds($range, $offset);
        $key = $this->notesKey($range, $fromCur);
        try {
            $this->config->setUserValue($uid, $this->appName, $key, $text);
            return new DataResponse(['ok'=>true], Http::STATUS_OK);
        } catch (\Throwable $e) {
            $this->logger->error('notes save failed: '.$e->getMessage(), ['app'=>$this->appName]);
            return new DataResponse(['message'=>'error'], Http::STATUS_INTERNAL_SERVER_ERROR);
        }
    }

    private function getCalendarsFor(string $uid): array {
        try {
            if (method_exists($this->calendarManager, 'getCalendarsForPrincipal')) {
                $principal = 'principals/users/' . $uid;
                return $this->calendarManager->getCalendarsForPrincipal($principal) ?? [];
            }
            if (method_exists($this->calendarManager, 'getCalendarsForUser')) return $this->calendarManager->getCalendarsForUser($uid) ?? [];
            if (method_exists($this->calendarManager, 'getCalendars'))       return $this->calendarManager->getCalendars($uid) ?? [];
        } catch (\Throwable $e) { $this->logger->error('getCalendars error: '.$e->getMessage()); }
        return [];
    }

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

    private function sanitizeReportingConfig($value): array {
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

    private function readReportingConfig(string $uid): array {
        $defaults = $this->defaultReportingConfig();
        try {
            $raw = (string)$this->config->getUserValue($uid, $this->appName, 'reporting_config', '');
            if ($raw !== '') {
                $decoded = json_decode($raw, true);
                if (is_array($decoded)) {
                    return array_merge($defaults, $this->sanitizeReportingConfig($decoded));
                }
            }
        } catch (\Throwable) {}
        return $defaults;
    }

    private function defaultDeckSettings(): array {
        return [
            'enabled' => true,
            'filtersEnabled' => true,
            'defaultFilter' => 'all',
        ];
    }

    private function sanitizeDeckSettings($value): array {
        $defaults = $this->defaultDeckSettings();
        if (!is_array($value)) {
            return $defaults;
        }
        $defaultFilter = ($value['defaultFilter'] ?? 'all') === 'mine' ? 'mine' : 'all';
        return [
            'enabled' => array_key_exists('enabled', $value) ? (bool)$value['enabled'] : true,
            'filtersEnabled' => array_key_exists('filtersEnabled', $value) ? (bool)$value['filtersEnabled'] : true,
            'defaultFilter' => $defaultFilter,
        ];
    }

    private function readDeckSettings(string $uid): array {
        $defaults = $this->defaultDeckSettings();
        try {
            $raw = (string)$this->config->getUserValue($uid, $this->appName, 'deck_settings', '');
            if ($raw !== '') {
                $decoded = json_decode($raw, true);
                if (is_array($decoded)) {
                    return array_merge($defaults, $this->sanitizeDeckSettings($decoded));
                }
            }
        } catch (\Throwable) {}
        return $defaults;
    }

    private function rangeBounds(string $range, int $offset): array {
        $now=new DateTimeImmutable('now');
        if ($range==='month') {
            $base=$now->modify(($offset>=0?'+':'').$offset.' month');
            return [$base->modify('first day of this month')->setTime(0,0,0), $base->modify('last day of this month')->setTime(23,59,59)];
        }
        $base=$now->modify(($offset>=0?'+':'').$offset.' week');
        return [$base->modify('monday this week')->setTime(0,0,0), $base->modify('sunday this week')->setTime(23,59,59)];
    }

    private function notesKey(string $range, \DateTimeImmutable $from): string {
        $prefix = ($range === 'month') ? 'notes_month_' : 'notes_week_';
        return $prefix . $from->format('Y-m-d');
    }

    private function parseRows(array $raw, string $calendarName, ?string $calendarId = null): array {
        $out=[]; $count=0; $MAX=5000; $MAX_ICS_BYTES=200000; $icsParsed=false; $icsSkipped=0;
        foreach ($raw as $row) {
            if (++$count > $MAX) break;
            $obj0=null;
            if (isset($row['objects'])) {
                $objects = $row['objects'];
                if ($objects instanceof \ArrayObject) {
                    $objects = $objects->getArrayCopy();
                }
                if (is_array($objects) && isset($objects[0])) {
                    $candidate = $objects[0];
                    if ($candidate instanceof \ArrayObject) {
                        $candidate = $candidate->getArrayCopy();
                    }
                    if ($candidate instanceof \stdClass) {
                        $candidate = (array)$candidate;
                    }
                    if (is_array($candidate)) {
                        $obj0 = $candidate;
                    }
                }
            }
            $isAllDay = isset($row['allday']) ? (bool)$row['allday'] : false;
            if ($obj0===null) {
                // Guarded ICS fallback
                $ics=null;
                if (is_array($row) && isset($row['calendardata'])) $ics=(string)$row['calendardata'];
                elseif (is_array($row) && isset($row['object']))   $ics=(string)$row['object'];
                if (is_string($ics) && trim($ics)!=='') {
                    if (strlen($ics) <= $MAX_ICS_BYTES) {
                        try {
                            $vcal=Reader::read($ics);
                            foreach ($vcal->select('VEVENT') as $vevent) {
                                $sum=(string)($vevent->SUMMARY?->getValue() ?? '');
                                $dtStart=$vevent->DTSTART?->getDateTime(); $tzStart=$this->paramValue($vevent->DTSTART ?? null,'TZID');
                                $dtEnd=$vevent->DTEND?->getDateTime();     $tzEnd=$this->paramValue($vevent->DTEND ?? null,'TZID');
                                if (!$dtEnd && $dtStart) {
                                    if (isset($vevent->DURATION)) { try{$dtEnd=(clone $dtStart)->add(new DateInterval((string)$vevent->DURATION));}catch(\Throwable){$dtEnd=(clone $dtStart)->modify('+1 hour');} }
                                    else { $dtEnd=(clone $dtStart)->modify('+1 hour'); }
                                }
                                $hours=($dtStart&&$dtEnd)?(($dtEnd->getTimestamp()-$dtStart->getTimestamp())/3600):null;
                                $evtAllDay = $isAllDay;
                                if (!$evtAllDay && isset($vevent->DTSTART) && method_exists($vevent->DTSTART, 'hasTime')) {
                                    $evtAllDay = !$vevent->DTSTART->hasTime();
                                }
                    $out[]=[
                        'calendar'=>$calendarName,
                        'calendar_id'=>$calendarId,
                        'title'=>$sum,
                        'start'=>$this->fmt($dtStart),
                                    'startTz'=>$tzStart,
                                    'end'=>$this->fmt($dtEnd),
                                    'endTz'=>$tzEnd,
                                    'hours'=>$hours!==null?round($hours,2):null,
                                    'allday'=>$evtAllDay,
                                    'status'=>(string)($vevent->STATUS?->getValue() ?? ''),
                                    'location'=>(string)($vevent->LOCATION?->getValue() ?? ''),
                                    'desc'=>$this->shorten((string)($vevent->DESCRIPTION?->getValue() ?? ''),160)
                                ];
                            }
                            $icsParsed=true;
                        } catch (\Throwable) { /* ignore malformed ICS */ }
                    } else {
                        $icsSkipped++;
                    }
                }
                continue;
            }
            $get=function(string $name) use ($obj0):array{ $val=$obj0[$name][0]??null; $par=$obj0[$name][1]??[]; return [$val,is_array($par)?$par:[]]; };

            [$dtStart,$pStart]=$get('DTSTART'); [$dtEnd,$pEnd]=$get('DTEND'); [$sum]= $get('SUMMARY'); [$status]=$get('STATUS'); [$loc]=$get('LOCATION'); [$desc]=$get('DESCRIPTION');
            if (!$isAllDay && isset($obj0['allday'])) {
                $rawAllDay = $obj0['allday'];
                if ($rawAllDay instanceof \stdClass) {
                    $rawAllDay = (array)$rawAllDay;
                }
                if (is_array($rawAllDay)) {
                    $isAllDay = (bool)($rawAllDay[0] ?? false);
                } else {
                    $isAllDay = (bool)$rawAllDay;
                }
            }
        $pStartParams = $pStart instanceof \stdClass ? (array)$pStart : $pStart;
        if (!$isAllDay && is_array($pStartParams) && array_key_exists('VALUE', $pStartParams)) {
            $valueType = $pStartParams['VALUE'];
            if (is_array($valueType)) {
                $valueType = reset($valueType);
            }
            if (is_object($valueType) && method_exists($valueType, '__toString')) {
                $valueType = (string)$valueType;
            }
            if (is_string($valueType) && strtoupper($valueType) === 'DATE') {
                $isAllDay = true;
            }
        }
            if (!$dtEnd && $dtStart && isset($obj0['DURATION'][0])) { try{$dtEnd=(clone $dtStart)->add(new DateInterval((string)$obj0['DURATION'][0]));}catch(\Throwable){$dtEnd=(clone $dtStart)->modify('+1 hour');} }
            elseif (!$dtEnd && $dtStart) { $dtEnd=(clone $dtStart)->modify('+1 hour'); }
            $hours=($dtEnd instanceof DateTimeInterface && $dtStart instanceof DateTimeInterface)?($dtEnd->getTimestamp()-$dtStart->getTimestamp())/3600:null;

            $out[]=[
                'calendar'=>$calendarName,'calendar_id'=>$calendarId,
                'title'=>$this->text($sum),'start'=>$this->fmt($dtStart),'startTz'=>$this->tzid($pStart,$dtStart),
                'end'=>$this->fmt($dtEnd),'endTz'=>$this->tzid($pEnd,$dtEnd),'hours'=>$hours!==null?round($hours,2):null,
                'status'=>$this->text($status),'location'=>$this->text($loc),'desc'=>$this->shorten($this->text($desc)??'',160),
                'allday'=>$isAllDay,
            ];
        }
        if (($icsParsed || $icsSkipped>0) && $this->isDebugEnabled()) {
            $this->logger->debug('parseRows ICS fallback', ['app'=>$this->appName,'calendar'=>$calendarName,'icsParsed'=>$icsParsed,'icsSkipped'=>$icsSkipped]);
        }
        return $out;
    }

    private function debugSanitizeSample($row): array {
        return $row;
    }

    private function debugDetectAllDay(array $row): array {
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

    private function isDebugEnabled(): bool {
        try {
            $lvl = (int)$this->config->getSystemValue('loglevel', 2);
            return $lvl === 0; // 0 = debug
        } catch (\Throwable) {
            return false;
        }
    }

    // fromVEvent removed; we avoid raw ICS parsing on NC32

    private function fmt(?DateTimeInterface $dt): ?string {
        return $dt ? (DateTimeImmutable::createFromInterface($dt))->format('Y-m-d H:i:s') : null;
    }
    private function text($node): ?string {
        if (is_object($node) && method_exists($node,'getValue')) return (string)$node->getValue();
        if (is_scalar($node)) return (string)$node;
        return null;
    }
    private function tzid(array $params, ?DateTimeInterface $fallback): ?string {
        if (isset($params['TZID'])) {
            $p=$params['TZID'];
            return is_object($p) && method_exists($p,'getValue') ? (string)$p->getValue() : (is_scalar($p)?(string)$p:null);
        }
        return $fallback?->getTimezone()->getName();
    }
    private function paramValue($prop,string $name):?string {
        try{
            if($prop && isset($prop[$name])){
                $p=$prop[$name];
                return method_exists($p,'getValue')?$p->getValue():(string)$p;
            }
        }catch (\Throwable) { }
        return null;
    }
    private function shorten(string $s,int $m):string {
        $s=trim($s); return mb_strlen($s)<= $m ? $s : (mb_substr($s,0,$m-1).'…');
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
                    return $this->cleanTargetsConfig($tmp);
                }
            }
        } catch (\Throwable $e) {
            if ($this->isDebugEnabled()) {
                $this->logger->debug('read targets config failed', ['app'=>$this->appName, 'error'=>$e->getMessage()]);
            }
        }
        return $this->defaultTargetsConfig();
    }

    private function defaultTargetsConfig(): array {
        return [
            'totalHours' => 48,
            'categories' => [
                [
                    'id' => 'work',
                    'label' => 'Work',
                    'targetHours' => 32,
                    'includeWeekend' => false,
                    'paceMode' => 'days_only',
                    'groupIds' => [1],
                ],
                [
                    'id' => 'hobby',
                    'label' => 'Hobby',
                    'targetHours' => 6,
                    'includeWeekend' => true,
                    'paceMode' => 'days_only',
                    'groupIds' => [2],
                ],
                [
                    'id' => 'sport',
                    'label' => 'Sport',
                    'targetHours' => 4,
                    'includeWeekend' => true,
                    'paceMode' => 'days_only',
                    'groupIds' => [3],
                ],
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

    private function defaultActivityCardConfig(): array {
        return [
            'showWeekendShare' => true,
            'showEveningShare' => true,
            'showEarliestLatest' => true,
            'showOverlaps' => true,
            'showLongestSession' => true,
            'showLastDayOff' => true,
            'showHint' => true,
            'forecastMode' => 'total',
        ];
    }

    private function defaultBalanceConfig(): array {
        return [
            'categories' => ['work', 'hobby', 'sport'],
            'useCategoryMapping' => true,
            'index' => ['method' => 'simple_range'],
            'thresholds' => [
                'noticeMaxShare' => 0.65,
                'warnMaxShare' => 0.75,
                'warnIndex' => 0.60,
            ],
            'relations' => ['displayMode' => 'ratio'],
            'trend' => ['lookbackWeeks' => 1],
            'dayparts' => ['enabled' => false],
            'ui' => [
                'roundPercent' => 1,
                'roundRatio' => 1,
                'showDailyStacks' => false,
                'showInsights' => true,
            ],
        ];
    }

    /** @param mixed $cfg */
    private function readPresets(string $uid): array {
        try {
            $raw = (string)$this->config->getUserValue($uid, $this->appName, self::PRESETS_KEY, '');
            if ($raw === '') {
                return [];
            }
            $decoded = json_decode($raw, true);
            if (!is_array($decoded)) {
                return [];
            }
            $out = [];
            foreach ($decoded as $name => $entry) {
                if (!is_string($name) || $name === '' || !is_array($entry)) {
                    continue;
                }
                $out[$name] = $entry;
            }
            return $out;
        } catch (\Throwable $e) {
            $this->logger->error('read presets failed: '.$e->getMessage(), ['app'=>$this->appName]);
            return [];
        }
    }

    private function writePresets(string $uid, array $presets): void {
        try {
            $encoded = json_encode($presets, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
            if ($encoded === false) {
                throw new \RuntimeException('json encode failed');
            }
            $this->config->setUserValue($uid, $this->appName, self::PRESETS_KEY, $encoded);
        } catch (\Throwable $e) {
            $this->logger->error('write presets failed: '.$e->getMessage(), ['app'=>$this->appName]);
            throw $e;
        }
    }

    private function sanitizePresetName(string $name): string {
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
     * @param array<string,mixed> $data
     * @param array<string,int> $allowedSet
     * @param string[] $allIds
     */
    private function sanitizePresetPayload(array $data, array $allowedSet, array $allIds): array {
        $warnings = [];

        $selectedRaw = isset($data['selected']) && is_array($data['selected']) ? $data['selected'] : [];
        $removedSelected = [];
        $selected = $this->cleanSelectionList($selectedRaw, $allowedSet, $removedSelected);
        if (!empty($removedSelected)) {
            $warnings[] = 'Skipped unknown calendars: ' . implode(', ', array_map('strval', $removedSelected));
        }

        $groupsRaw = isset($data['groups']) && is_array($data['groups']) ? $data['groups'] : [];
        $removedGroups = [];
        foreach ($groupsRaw as $key => $_) {
            $id = substr((string)$key, 0, 128);
            if (!isset($allowedSet[$id])) {
                $removedGroups[] = $id;
            }
        }
        $groups = $this->cleanGroups($groupsRaw, $allowedSet, $allIds);
        if (!empty($removedGroups)) {
            $warnings[] = 'Removed calendar mappings for unknown calendars: ' . implode(', ', $removedGroups);
        }

        $targetsWeekRaw = isset($data['targets_week']) && is_array($data['targets_week']) ? $data['targets_week'] : [];
        $removedWeekTargets = [];
        foreach ($targetsWeekRaw as $key => $_) {
            $id = substr((string)$key, 0, 128);
            if (!isset($allowedSet[$id])) {
                $removedWeekTargets[] = $id;
            }
        }
        $targetsWeek = $this->cleanTargets($targetsWeekRaw, $allowedSet);
        if (!empty($removedWeekTargets)) {
            $warnings[] = 'Removed weekly targets for unknown calendars: ' . implode(', ', $removedWeekTargets);
        }

        $targetsMonthRaw = isset($data['targets_month']) && is_array($data['targets_month']) ? $data['targets_month'] : [];
        $removedMonthTargets = [];
        foreach ($targetsMonthRaw as $key => $_) {
            $id = substr((string)$key, 0, 128);
            if (!isset($allowedSet[$id])) {
                $removedMonthTargets[] = $id;
            }
        }
        $targetsMonth = $this->cleanTargets($targetsMonthRaw, $allowedSet);
        if (!empty($removedMonthTargets)) {
            $warnings[] = 'Removed monthly targets for unknown calendars: ' . implode(', ', $removedMonthTargets);
        }

        $targetsConfigRaw = $data['targets_config'] ?? null;
        $targetsConfig = $targetsConfigRaw !== null ? $this->cleanTargetsConfig($targetsConfigRaw) : $this->defaultTargetsConfig();
        if (is_array($targetsConfigRaw) && isset($targetsConfigRaw['categories']) && is_array($targetsConfigRaw['categories'])) {
            $rawCatCount = count($targetsConfigRaw['categories']);
            $cleanCatCount = count($targetsConfig['categories']);
            if ($cleanCatCount < $rawCatCount) {
                $warnings[] = 'Some target categories were normalised or removed due to invalid configuration.';
            }
        }

        return [
            'payload' => [
                'selected' => $selected,
                'groups' => $groups,
                'targets_week' => $targetsWeek,
                'targets_month' => $targetsMonth,
                'targets_config' => $targetsConfig,
            ],
            'warnings' => $warnings,
        ];
    }

    /**
     * @param array<string,array<string,mixed>> $presets
     * @return array<string,array<string,mixed>>
     */
    private function trimPresets(array $presets): array {
        if (count($presets) <= self::MAX_PRESETS) {
            return $presets;
        }
        uasort($presets, function ($a, $b) {
            $at = isset($a['updated_at']) ? (string)$a['updated_at'] : '';
            $bt = isset($b['updated_at']) ? (string)$b['updated_at'] : '';
            return strcmp($bt, $at);
        });
        return array_slice($presets, 0, self::MAX_PRESETS, true);
    }

    /**
     * @param array<string,array<string,mixed>> $presets
     * @return array<int,array<string,mixed>>
     */
    private function formatPresetList(array $presets): array {
        $list = [];
        foreach ($presets as $name => $entry) {
            $payload = is_array($entry['payload'] ?? null) ? $entry['payload'] : [];
            $selected = isset($payload['selected']) && is_array($payload['selected']) ? $payload['selected'] : [];
            $groups = isset($payload['groups']) && is_array($payload['groups']) ? $payload['groups'] : [];
            $list[] = [
                'name' => $name,
                'createdAt' => $entry['created_at'] ?? null,
                'updatedAt' => $entry['updated_at'] ?? null,
                'selectedCount' => count($selected),
                'calendarCount' => count($groups),
            ];
        }
        usort($list, function ($a, $b) {
            $au = (string)($a['updatedAt'] ?? '');
            $bu = (string)($b['updatedAt'] ?? '');
            if ($au === $bu) {
                return strcmp((string)$a['name'], (string)$b['name']);
            }
            return strcmp($bu, $au);
        });
        return $list;
    }

    /**
     * @param array<int,mixed> $raw
     * @param array<string,int> $allowedSet
     * @param array<int,string> $removed
     */
    private function cleanSelectionList(array $raw, array $allowedSet, array &$removed = []): array {
        $out = [];
        $removed = [];
        foreach ($raw as $item) {
            $id = substr((string)$item, 0, 128);
            if (!isset($allowedSet[$id])) {
                $removed[] = $id;
                continue;
            }
            if (!in_array($id, $out, true)) {
                $out[] = $id;
            }
        }
        return $out;
    }

    private function cleanTargetsConfig($cfg): array {
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
                if (!is_array($cat)) continue;
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
                        if ($n < 0 || $n > self::MAX_GROUP) continue;
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
                if (count($cats) >= 12) break;
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
            $forecast = $cfg['forecast'];
            $out['forecast']['methodPrimary'] = (isset($forecast['methodPrimary']) && (string)$forecast['methodPrimary'] === 'momentum') ? 'momentum' : 'linear';
            if (isset($forecast['momentumLastNDays'])) {
                $n = (int)$forecast['momentumLastNDays'];
                if ($n < 1) $n = 1; if ($n > 14) $n = 14;
                $out['forecast']['momentumLastNDays'] = $n;
            }
            if (isset($forecast['padding'])) {
                $out['forecast']['padding'] = round($this->clampFloat((float)$forecast['padding'], 0, 100), 1);
            }
        }

        if (isset($cfg['ui']) && is_array($cfg['ui'])) {
            $ui = $cfg['ui'];
            foreach ($out['ui'] as $key => $val) {
                if (array_key_exists($key, $ui)) {
                    $out['ui'][$key] = (bool)$ui[$key];
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
     * @param array<int,array<string,mixed>> $categories
     */
    private function cleanActivityCardConfig($cfg): array {
        $base = $this->defaultActivityCardConfig();
        if (!is_array($cfg)) {
            return $base;
        }
        $keys = array_keys($base);
        $result = $base;
        $booleanKeys = [
            'showWeekendShare',
            'showEveningShare',
            'showEarliestLatest',
            'showOverlaps',
            'showLongestSession',
            'showLastDayOff',
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

    private function cleanBalanceConfig($cfg, array $categories): array {
        $base = $this->defaultBalanceConfig();
        $result = $base;

        $available = [];
        foreach ($categories as $cat) {
            if (!is_array($cat)) continue;
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
            if ($id === '') continue;
            if (!empty($available) && !in_array($id, $available, true)) continue;
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

        if (isset($cfg['thresholds']) && is_array($cfg['thresholds'])) {
            $thr = $cfg['thresholds'];
            if (isset($thr['noticeMaxShare'])) {
                $result['thresholds']['noticeMaxShare'] = round($this->clampFloat((float)$thr['noticeMaxShare'], 0.0, 1.0), 2);
            }
            if (isset($thr['warnMaxShare'])) {
                $result['thresholds']['warnMaxShare'] = round($this->clampFloat((float)$thr['warnMaxShare'], 0.0, 1.0), 2);
            }
            if (isset($thr['warnIndex'])) {
                $result['thresholds']['warnIndex'] = round($this->clampFloat((float)$thr['warnIndex'], 0.0, 1.0), 2);
            }
        }

        $displayMode = (string)($cfg['relations']['displayMode'] ?? $base['relations']['displayMode']);
        $result['relations']['displayMode'] = $displayMode === 'factor' ? 'factor' : 'ratio';

        if (isset($cfg['trend']) && is_array($cfg['trend'])) {
            $lookback = (int)($cfg['trend']['lookbackWeeks'] ?? $base['trend']['lookbackWeeks']);
            if ($lookback < 1) $lookback = 1;
            if ($lookback > 12) $lookback = 12;
            $result['trend']['lookbackWeeks'] = $lookback;
        }

        if (isset($cfg['dayparts']) && is_array($cfg['dayparts'])) {
            $result['dayparts']['enabled'] = !empty($cfg['dayparts']['enabled']);
        }

        if (isset($cfg['ui']) && is_array($cfg['ui'])) {
            if (isset($cfg['ui']['roundPercent'])) {
                $rp = (int)$cfg['ui']['roundPercent'];
                if ($rp < 0) $rp = 0;
                if ($rp > 3) $rp = 3;
                $result['ui']['roundPercent'] = $rp;
            }
            if (isset($cfg['ui']['roundRatio'])) {
                $rr = (int)$cfg['ui']['roundRatio'];
                if ($rr < 0) $rr = 0;
                if ($rr > 3) $rr = 3;
                $result['ui']['roundRatio'] = $rr;
            }
            if (array_key_exists('showDailyStacks', $cfg['ui'])) {
                $result['ui']['showDailyStacks'] = !empty($cfg['ui']['showDailyStacks']);
            }
            if (array_key_exists('showInsights', $cfg['ui'])) {
                $result['ui']['showInsights'] = !empty($cfg['ui']['showInsights']);
            }
            if (array_key_exists('showNotes', $cfg['ui'])) {
                $result['ui']['showNotes'] = !empty($cfg['ui']['showNotes']);
            }
        }

        return $result;
    }

    private function clampFloat(float $value, float $min, float $max): float {
        if (!is_finite($value)) {
            return $min;
        }
        if ($value < $min) return $min;
        if ($value > $max) return $max;
        return $value;
    }

    private function sanitizeHexColor($value): ?string {
        if (!is_string($value)) {
            return null;
        }
        $trimmed = trim($value);
        if (!preg_match('/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/', $trimmed)) {
            return null;
        }
        if (strlen($trimmed) === 4) {
            $r = strtoupper($trimmed[1]);
            $g = strtoupper($trimmed[2]);
            $b = strtoupper($trimmed[3]);
            return sprintf('#%1$s%1$s%2$s%2$s%3$s%3$s', $r, $g, $b);
        }
        return strtoupper($trimmed);
    }

    /**
     * @param mixed $state
     * @return array{completed:bool,version:int,strategy:string,completed_at:string}
     */
    private function cleanOnboardingState($state): array {
        $result = [
            'completed' => false,
            'version' => 0,
            'strategy' => '',
            'completed_at' => '',
        ];
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
        return $result;
    }

    private function readOnboardingState(string $uid): array {
        try {
            $raw = (string)$this->config->getUserValue($uid, $this->appName, self::CONFIG_ONBOARDING, '');
        } catch (\Throwable $e) {
            $raw = '';
        }
        if ($raw === '') {
            return $this->cleanOnboardingState(null);
        }
        try {
            $decoded = json_decode($raw, true, flags: JSON_THROW_ON_ERROR);
        } catch (\Throwable $e) {
            $decoded = null;
        }
        return $this->cleanOnboardingState($decoded);
    }

    private function sanitizeThemePreference($value): ?string {
        if (is_string($value)) {
            $normalized = strtolower(trim($value));
            if (in_array($normalized, ['auto', 'light', 'dark'], true)) {
                return $normalized;
            }
        }
        return null;
    }

    private function readThemePreference(string $uid): string {
        try {
            $stored = (string)$this->config->getUserValue($uid, $this->appName, 'theme_preference', '');
        } catch (\Throwable $e) {
            $stored = '';
        }
        $normalized = $this->sanitizeThemePreference($stored);
        return $normalized ?? 'auto';
    }

    // ---- Validation helpers ----
    /** @param array<string,mixed> $src @param array<string,int> $allowedSet */
    private function cleanTargets(array $src, array $allowedSet): array {
        $out = [];
        foreach ($src as $k=>$v) {
            $id = substr((string)$k, 0, 128);
            if (!isset($allowedSet[$id])) continue;
            if (!is_numeric($v)) continue;
            $n = (float)$v;
            if (!is_finite($n)) continue;
            if ($n < 0) $n = 0.0;
            if ($n > self::MAX_TARGET_HOURS) $n = (float)self::MAX_TARGET_HOURS;
            $out[$id] = $n;
        }
        return $out;
    }
    /** @param array<string,mixed> $src @param array<string,int> $allowedSet @param string[] $allIds */
    private function cleanGroups(array $src, array $allowedSet, array $allIds): array {
        $out = [];
        foreach ($src as $k=>$v) {
            $id = substr((string)$k, 0, 128);
            if (!isset($allowedSet[$id])) continue;
            if (!is_numeric($v)) continue;
            $n = (int)$v;
            if ($n < 0 || $n > self::MAX_GROUP) {
                $n = 0;
            }
            $out[$id] = $n;
        }
        foreach ($allIds as $id) { if (!isset($out[$id])) $out[$id] = 0; }
        return $out;
    }
}
