<?php
declare(strict_types=1);

namespace OCA\Aaacalstatsdashxyz\Controller;

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
use Sabre\VObject\Reader;
// use Sabre\VObject\Reader; // removed to avoid parsing raw ICS in NC32

final class ConfigDashboardController extends Controller {
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
        // Load bundled frontend (JS) — cache-busted filename
        // Load CSS first to align with strict CSP (avoid runtime style injection)
        \OCP\Util::addStyle($this->appName, 'style');
        \OCP\Util::addScript($this->appName, 'main46');
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
        return new TemplateResponse($this->appName, 'config_dashboard', [
            'version' => $version,
            'changelog' => $changelog,
        ]);
    }

    #[NoAdminRequired]
    #[NoCSRFRequired]
    public function ping(): DataResponse {
        return new DataResponse([
            'ok' => true,
            'app' => $this->appName,
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
        if ($offset > 24) $offset = 24; elseif ($offset < -24) $offset = -24;
        // Ensure this endpoint is strictly read-only; ignore any 'save' requests
        $save   = false;

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
                // derive deterministic fallback color from id
                $hex = substr(md5($id), 0, 6);
                $color = '#' . $hex;
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
        $cleanGroups = [];
        foreach ($groupsById as $k=>$v) {
            $id = substr((string)$k, 0, 128);
            if (!isset($allowedSet[$id])) continue;
            $n = (int)$v; if ($n < 0) $n = 0; if ($n > 9) $n = 9;
            $cleanGroups[$id] = $n;
        }
        foreach ($allowedIds as $id) { if (!isset($cleanGroups[$id])) $cleanGroups[$id] = 0; }
        $groupsById = $cleanGroups;

        // --- Aktuelle Periode einlesen/aggregieren ---
        $events = [];
        // Limits to prevent excessive processing
        $maxPerCal = 2000; // soft cap per calendar
        $maxTotal  = 5000; // soft cap overall
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
                ];
            }
        }

        $totalHours=0.0; $byCalMap=[]; $byDay=[]; $dow=array_fill_keys(['Mon','Tue','Wed','Thu','Fri','Sat','Sun'],0.0); $long=[]; $daysSeen=[];
        $perDayByCal = [];
        $dowByCal    = [];
        // 24×7 Heatmap-Aggregation vorbereiten
        $dowOrder=['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
        $hod=[]; foreach($dowOrder as $d){ $hod[$d]=array_fill(0,24,0.0); }

        foreach ($events as $r) {
            $h=(float)($r['hours']??0); $totalHours+=$h;
            $calName=(string)($r['calendar']??'');
            $calId = (string)($r['calendar_id'] ?? $calName);
            $byCalMap[$calId] = $byCalMap[$calId] ?? ['id'=>$calId,'calendar'=>$calName,'events_count'=>0,'total_hours'=>0.0];
            $byCalMap[$calId]['events_count']++; $byCalMap[$calId]['total_hours'] += $h;

            $day = substr((string)($r['start']??''),0,10);
            $byDay[$day] = $byDay[$day] ?? ['date'=>$day,'events_count'=>0,'total_hours'=>0.0];
            $byDay[$day]['events_count']++; $byDay[$day]['total_hours'] += $h; $daysSeen[$day]=true;

            $ts=strtotime((string)($r['start']??'')); $w=$ts?date('D',$ts):'Mon'; $dow[$w]=($dow[$w]??0)+$h;
            $cidStack = (string)($r['calendar_id'] ?? $calId ?? $calName);
            // per-day per-calendar stack
            if (!isset($perDayByCal[$day])) $perDayByCal[$day] = [];
            $perDayByCal[$day][$cidStack] = ($perDayByCal[$day][$cidStack] ?? 0) + $h;
            // per-DOW per-calendar stack
            if (!isset($dowByCal[$w])) $dowByCal[$w] = [];
            $dowByCal[$w][$cidStack] = ($dowByCal[$w][$cidStack] ?? 0) + $h;

            $long[]=[
                'calendar'=>$calName,
                'summary'=>(string)($r['title']??''),
                'duration_h'=>$h,
                'start'=>(string)($r['start']??''),
                'desc'=>(string)($r['desc']??'')
            ];

            // ---- 24×7 Heatmap: Eventdauer anteilig auf Stunden/Buckets verteilen ----
            $stStr=(string)($r['start']??null); $enStr=(string)($r['end']??null);
            $st=$stStr?strtotime($stStr):null; $en=$enStr?strtotime($enStr):null;
            if ($st && $en && $en > $st) {
                $cur=$st;
                while ($cur < $en) {
                    $slotEnd = strtotime(date('Y-m-d H:00:00', $cur).' +1 hour');
                    if ($slotEnd === false) break;
                    if ($slotEnd > $en) $slotEnd = $en;
                    $dur = max(0, $slotEnd - $cur) / 3600.0; // Stunden
                    $dname = date('D', $cur); // Mon..Sun
                    $hour  = (int)date('G', $cur); // 0..23
                    if (isset($hod[$dname][$hour])) $hod[$dname][$hour] += $dur;
                    $cur = $slotEnd;
                }
            }
        }
        usort($long,fn($a,$b)=>$b['duration_h']<=>$a['duration_h']);
        $byCalList = array_values($byCalMap);
        usort($byCalList,fn($a,$b)=>$b['total_hours']<=>$a['total_hours']);
        ksort($byDay);

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
        $barLabels=array_keys($byDay);
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
                $h=(float)($r['hours']??0); $prevTotal += $h; $prevEvents++;
                $d = substr((string)($r['start']??''),0,10); $prevDaysSeen[$d]=true;
            }
        }
        $prevDaysCount   = count($prevDaysSeen);
        $prevAvgPerDay   = $prevDaysCount   ? ($prevTotal / $prevDaysCount)   : 0;
        $prevAvgPerEvent = $prevEvents      ? ($prevTotal / $prevEvents)      : 0;

        $delta = [
            'total_hours'   => round($totalHours - $prevTotal, 2),
            'avg_per_day'   => round($avgPerDay  - $prevAvgPerDay, 2),
            'avg_per_event' => round($avgPerEvent- $prevAvgPerEvent, 2),
            'events'        => $eventsCount - $prevEvents,
        ];

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
                'typical_start'  => $typStart,
                'typical_end'    => $typEnd,
                'weekend_share'  => $weekendShare,  // %
                'evening_share'  => $eveningShare,  // %

                // Δ vs. Vorperiode
                'delta'          => $delta,
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
        $req = $data['cals'] ?? [];
        if (is_string($req)) $req = array_values(array_filter(explode(',', $req), fn($x)=>$x!==''));
        $req = is_array($req) ? $req : [];

        // Intersect with user's calendars
        $allowedIds = [];
        foreach ($this->getCalendarsFor($uid) as $cal) { $allowedIds[] = (string)($cal->getUri() ?? spl_object_id($cal)); }
        $allowed = array_flip($allowedIds);
        $after = array_values(array_unique(array_filter(array_map(fn($x)=>substr((string)$x,0,128), $req), fn($x)=>isset($allowed[$x]))));

        // Save
        $csv = implode(',', $after);
        $this->config->setUserValue($uid, $this->appName, 'selected_cals', $csv);

        // Optional: groups mapping
        $groupsSaved = null; $groupsRead = null;
        if (isset($data['groups']) && is_array($data['groups'])) {
            $gclean = [];
            foreach ($data['groups'] as $k=>$v) {
                $id = substr((string)$k, 0, 128);
                if (!isset($allowed[$id])) continue;
                $n = (int)$v; if ($n < 0) $n = 0; if ($n > 9) $n = 9;
                $gclean[$id] = $n;
            }
            $this->config->setUserValue($uid, $this->appName, 'cal_groups', json_encode($gclean));
            $groupsSaved = $gclean;
            try {
                $gjson = (string)$this->config->getUserValue($uid, $this->appName, 'cal_groups', '');
                $tmp = $gjson!=='' ? json_decode($gjson, true) : [];
                if (is_array($tmp)) $groupsRead = $tmp;
            } catch (\Throwable) {}
        }

        // Read-back
        $readCsv = (string)$this->config->getUserValue($uid, $this->appName, 'selected_cals', '');
        $read = array_values(array_filter(explode(',', $readCsv), fn($x)=>$x!==''));

        return new DataResponse([
            'ok' => true,
            'request' => $req,
            'saved_csv' => $csv,
            'read_csv' => $readCsv,
            'saved' => $after,
            'read'  => $read,
            'groups_saved' => $groupsSaved,
            'groups_read'  => $groupsRead,
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
            $obj0=(is_array($row['objects']??null) && isset($row['objects'][0]) && is_array($row['objects'][0])) ? $row['objects'][0] : null;
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
                    $out[]=[
                        'calendar'=>$calendarName,
                        'calendar_id'=>$calendarId,
                        'title'=>$sum,
                        'start'=>$this->fmt($dtStart),
                                    'startTz'=>$tzStart,
                                    'end'=>$this->fmt($dtEnd),
                                    'endTz'=>$tzEnd,
                                    'hours'=>$hours!==null?round($hours,2):null,
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
            if (!$dtEnd && $dtStart && isset($obj0['DURATION'][0])) { try{$dtEnd=(clone $dtStart)->add(new DateInterval((string)$obj0['DURATION'][0]));}catch(\Throwable){$dtEnd=(clone $dtStart)->modify('+1 hour');} }
            elseif (!$dtEnd && $dtStart) { $dtEnd=(clone $dtStart)->modify('+1 hour'); }
            $hours=($dtEnd instanceof DateTimeInterface && $dtStart instanceof DateTimeInterface)?($dtEnd->getTimestamp()-$dtStart->getTimestamp())/3600:null;

            $out[]=[
                'calendar'=>$calendarName,'calendar_id'=>$calendarId,
                'title'=>$this->text($sum),'start'=>$this->fmt($dtStart),'startTz'=>$this->tzid($pStart,$dtStart),
                'end'=>$this->fmt($dtEnd),'endTz'=>$this->tzid($pEnd,$dtEnd),'hours'=>$hours!==null?round($hours,2):null,
                'status'=>$this->text($status),'location'=>$this->text($loc),'desc'=>$this->shorten($this->text($desc)??'',160),
            ];
        }
        if (($icsParsed || $icsSkipped>0) && $this->isDebugEnabled()) {
            $this->logger->debug('parseRows ICS fallback', ['app'=>$this->appName,'calendar'=>$calendarName,'icsParsed'=>$icsParsed,'icsSkipped'=>$icsSkipped]);
        }
        return $out;
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
}
