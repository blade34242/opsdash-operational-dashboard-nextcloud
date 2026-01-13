<?php
declare(strict_types=1);

namespace OCA\Opsdash\Service;

use Psr\Log\LoggerInterface;

final class OverviewLoadService {
    private const MAX_GROUP = 9;
    private const MAX_AGG_PER_CAL = 2000;
    private const MAX_AGG_TOTAL   = 5000;
    private const ONBOARDING_VERSION = 1;
    private const MAX_DEBUG_QUERIES = 50;

    public function __construct(
        private LoggerInterface $logger,
        private OverviewDataService $dataService,
        private OverviewLoadCacheService $cacheService,
        private OverviewLoadContextService $contextService,
        private OverviewLoadResponseComposer $responseComposer,
    ) {}

    /**
     * @param array{
     *   range: string,
     *   offset: int,
     *   provided: bool,
     *   cals: array|null,
     *   debug: bool,
     *   forceReset: bool,
     *   include: string[]
     * } $request
     * @return array<string,mixed>
     */
    public function load(string $appName, string $uid, array $request): array {
        $context = $this->contextService->build($appName, $uid, $request);
        $range = (string)$context['range'];
        $offset = (int)$context['offset'];
        $provided = (bool)$context['provided'];
        $calsOverride = $context['calsOverride'] ?? null;
        $dbgFlag = (bool)$context['debugEnabled'];
        $forceReset = (bool)$context['forceReset'];

        $includes = $context['includes'];
        $includeAll = (bool)$context['includeAll'];
        $shouldInclude = fn(string $key): bool => $includeAll || isset($includes[$key]);
        $includeDebugRequested = (bool)$context['includeDebugRequested'];
        $includeDebug = (bool)$context['includeDebug'];
        $includeLookback = (bool)$context['includeLookback'];
        $includeCharts = (bool)$context['includeCharts'];
        $includeData = (bool)$context['includeData'];

        $userTz = $context['userTz'];
        $userTzName = (string)$context['userTzName'];
        $userLocale = (string)$context['userLocale'];
        $userWeekStart = (int)$context['userWeekStart'];

        $from = $context['from'];
        $to = $context['to'];
        $fromStr = (string)$context['fromStr'];
        $toStr = (string)$context['toStr'];

        $coreCacheEnabled = false;
        $coreCacheStoredAt = null;
        if (!$includeData && !$dbgFlag && !$includeDebugRequested && !$forceReset && !$provided) {
            $coreCacheEnabled = $this->cacheService->isCacheEnabled($appName);
            $coreCacheTtl = $this->cacheService->coreCacheTtl($appName);
            if ($coreCacheEnabled && $coreCacheTtl > 0) {
                $cached = $this->cacheService->readCoreCache(
                    $appName,
                    $uid,
                    $includes,
                    $userTzName,
                    $userLocale,
                    $userWeekStart,
                );
                if ($cached) {
                    $payload = $cached['payload'];
                    $coreCacheStoredAt = $cached['storedAt'] ?: null;
                    return $this->responseComposer->compose(
                        $context,
                        $payload,
                        [],
                        [
                            'truncated' => false,
                            'limits' => ['maxPerCal' => self::MAX_AGG_PER_CAL, 'maxTotal' => self::MAX_AGG_TOTAL, 'totalProcessed' => 0],
                        ],
                        true,
                        $coreCacheStoredAt,
                        [],
                        false,
                    );
                }
            }
        }

        $sel = $context['selection'] ?? [];
        $hasSaved = (bool)($sel['hasSaved'] ?? false);
        $savedIds = $sel['savedIds'] ?? [];
        $selectedIds = $context['selectedIds'] ?? [];

        $principal = (string)$context['principal'];
        $cals = $context['calendars'] ?? [];
        $calendarIds = $context['calendarIds'] ?? [];
        $idToName = $context['idToName'] ?? [];
        $colorsById = $context['colorsById'] ?? [];
        $categoryMeta = $context['categoryMeta'] ?? [];
        $groupToCategory = $context['groupToCategory'] ?? [];
        $groupsById = $context['groupsById'] ?? [];
        $targetsWeek = $context['targetsWeek'] ?? [];
        $targetsMonth = $context['targetsMonth'] ?? [];
        $targetsConfig = $context['targetsConfig'] ?? [];
        $reportingConfig = $context['reportingConfig'] ?? [];
        $deckSettings = $context['deckSettings'] ?? [];

        $cacheEnabled = $includeData && $this->cacheService->isCacheEnabled($appName);
        $cacheTtl = $this->cacheService->cacheTtl($appName);
        if ($cacheTtl <= 0) {
            $cacheEnabled = false;
        }
        if ($dbgFlag) {
            $cacheEnabled = false;
        }
        if ($cacheEnabled && empty($selectedIds) && !$hasSaved) {
            $cacheEnabled = false;
        }

        $cacheHit = false;
        $cacheStoredAt = null;
        $dataPayload = [];
        $queryDbg = [];
        $queryDbgTruncated = false;
        $metaData = [
            'truncated' => false,
            'limits' => ['maxPerCal' => self::MAX_AGG_PER_CAL, 'maxTotal' => self::MAX_AGG_TOTAL, 'totalProcessed' => 0],
        ];

        if ($includeData && $cacheEnabled) {
            $cached = $this->cacheService->readDataCache(
                $appName,
                $uid,
                $range,
                $offset,
                $selectedIds,
                $groupsById,
                $targetsWeek,
                $targetsMonth,
                $targetsConfig,
                $reportingConfig,
                $deckSettings,
                $includes,
                $userTzName,
                $userLocale,
                $userWeekStart,
            );
            if ($cached) {
                $dataPayload = $cached['payload'];
                $metaData = $cached['meta'];
                $cacheHit = true;
                $cacheStoredAt = $cached['storedAt'] ?: null;
            }
        }

        if ($includeData && !$cacheHit) {
            $data = $this->dataService->build([
                'range' => $range,
                'offset' => $offset,
                'from' => $from,
                'to' => $to,
                'principal' => $principal,
                'calendars' => $cals,
                'calendarIds' => $calendarIds,
                'includeAll' => (bool)($sel['includeAll'] ?? false),
                'selectedIds' => $selectedIds,
                'idToName' => $idToName,
                'colorsById' => $colorsById,
                'categoryMeta' => $categoryMeta,
                'groupToCategory' => $groupToCategory,
                'groupsById' => $groupsById,
                'targetsConfig' => $targetsConfig,
                'targetsWeek' => $targetsWeek,
                'targetsMonth' => $targetsMonth,
                'userTz' => $userTz,
                'weekStart' => $userWeekStart,
                'includeCharts' => $includeCharts,
                'include' => [
                    'stats' => $shouldInclude('stats'),
                    'byCal' => $shouldInclude('byCal'),
                    'byDay' => $shouldInclude('byDay'),
                    'longest' => $shouldInclude('longest'),
                    'lookback' => $includeLookback,
                ],
                'debug' => $dbgFlag,
                'maxPerCal' => self::MAX_AGG_PER_CAL,
                'maxTotal' => self::MAX_AGG_TOTAL,
            ]);
            $dataPayload = $data['payload'] ?? [];
            $metaData = $data['meta'] ?? $metaData;
            $queryDbg = $data['queryDbg'] ?? [];

            if ($cacheEnabled) {
                $storedAt = $this->cacheService->writeDataCache(
                    $appName,
                    $uid,
                    $range,
                    $offset,
                    $selectedIds,
                    $groupsById,
                    $targetsWeek,
                    $targetsMonth,
                    $targetsConfig,
                    $reportingConfig,
                    $deckSettings,
                    $includes,
                    $userTzName,
                    $userLocale,
                    $userWeekStart,
                    $dataPayload,
                    $metaData,
                );
                if ($storedAt) {
                    $cacheStoredAt = $storedAt;
                }
            }
        }
        $corePayload = $this->responseComposer->buildCorePayload($context);

        if (!$includeData && $coreCacheEnabled) {
            $storedAt = $this->cacheService->writeCoreCache(
                $appName,
                $uid,
                $includes,
                $userTzName,
                $userLocale,
                $userWeekStart,
                $corePayload,
            );
            if ($storedAt) {
                $cacheHit = false;
                $cacheStoredAt = $storedAt;
            }
        }

        if ($includeDebug && is_array($queryDbg)) {
            $origCount = count($queryDbg);
            if ($origCount > self::MAX_DEBUG_QUERIES) {
                $queryDbg = array_slice($queryDbg, 0, self::MAX_DEBUG_QUERIES);
                $queryDbgTruncated = true;
            }
        }
        return $this->responseComposer->compose(
            $context,
            $corePayload,
            $dataPayload,
            $metaData,
            $cacheHit,
            $cacheStoredAt,
            $queryDbg,
            $queryDbgTruncated,
        );
    }
}
