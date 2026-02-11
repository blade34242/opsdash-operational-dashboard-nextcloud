<?php
declare(strict_types=1);

namespace OCA\Opsdash\Service;

use OCP\ICacheFactory;
use OCP\IConfig;
use Psr\Log\LoggerInterface;

final class OverviewLoadCacheService {
    private const CORE_CACHE_TTL = 30;
    private const CORE_CACHE_VERSION_KEY = 'core_cache_version';

    public function __construct(
        private ICacheFactory $cacheFactory,
        private IConfig $config,
        private UserConfigService $userConfigService,
        private OverviewIncludeResolver $includeResolver,
        private LoggerInterface $logger,
    ) {}

    public function isCacheEnabled(string $appName): bool {
        $env = getenv('OPSDASH_CACHE_ENABLED');
        if ($env !== false) {
            $filtered = filter_var($env, FILTER_VALIDATE_BOOL, FILTER_NULL_ON_FAILURE);
            if ($filtered !== null) {
                return (bool)$filtered;
            }
        }
        try {
            $raw = (string)$this->config->getAppValue($appName, 'cache_enabled', '1');
            $filtered = filter_var($raw, FILTER_VALIDATE_BOOL, FILTER_NULL_ON_FAILURE);
            if ($filtered !== null) {
                return (bool)$filtered;
            }
        } catch (\Throwable) {}
        return true;
    }

    public function cacheTtl(string $appName): int {
        $env = getenv('OPSDASH_CACHE_TTL');
        if ($env !== false && is_numeric($env)) {
            $ttl = (int)$env;
            return $ttl < 0 ? 0 : $ttl;
        }
        try {
            $raw = (string)$this->config->getAppValue($appName, 'cache_ttl', '60');
            if (is_numeric($raw)) {
                $ttl = (int)$raw;
                return $ttl < 0 ? 0 : $ttl;
            }
        } catch (\Throwable) {}
        return 60;
    }

    public function coreCacheTtl(string $appName): int {
        return min(self::CORE_CACHE_TTL, $this->cacheTtl($appName));
    }

    /**
     * @param array<string,bool> $includes
     * @return array{payload: array<string,mixed>, storedAt: int}|null
     */
    public function readCoreCache(
        string $appName,
        string $uid,
        array $includes,
        string $userTzName,
        string $userLocale,
        int $userWeekStart,
    ): ?array {
        $coreIncludes = $this->includeResolver->normalizeForCache($includes, 'core');
        $coreVersion = $this->readUserCoreCacheVersion($appName, $uid);
        try {
            $cache = $this->cacheFactory->createDistributed($appName);
            $cacheKey = $this->buildCoreCacheKey($uid, $coreIncludes, $userTzName, $userLocale, $userWeekStart, $coreVersion);
            $cached = $cacheKey ? $cache->get($cacheKey) : null;
            if (is_string($cached) && $cached !== '') {
                $cachedPayload = json_decode($cached, true);
                if (is_array($cachedPayload) && isset($cachedPayload['payload'])) {
                    $payload = $cachedPayload['payload'];
                    if (is_array($payload)) {
                        return [
                            'payload' => $payload,
                            'storedAt' => (int)($cachedPayload['storedAt'] ?? 0),
                        ];
                    }
                }
            }
        } catch (\Throwable $e) {
            if ($this->userConfigService->isDebugEnabled()) {
                $this->logger->debug('core cache read failed', [
                    'app' => $appName,
                    'error' => $e->getMessage(),
                ]);
            }
        }
        return null;
    }

    /**
     * @param array<string,bool> $includes
     */
    public function writeCoreCache(
        string $appName,
        string $uid,
        array $includes,
        string $userTzName,
        string $userLocale,
        int $userWeekStart,
        array $payload,
    ): ?int {
        $ttl = $this->coreCacheTtl($appName);
        if ($ttl <= 0) {
            return null;
        }
        $coreIncludes = $this->includeResolver->normalizeForCache($includes, 'core');
        $coreVersion = $this->readUserCoreCacheVersion($appName, $uid);
        try {
            $cache = $this->cacheFactory->createDistributed($appName);
            $cacheKey = $this->buildCoreCacheKey($uid, $coreIncludes, $userTzName, $userLocale, $userWeekStart, $coreVersion);
            $storedAt = time();
            $cache->set($cacheKey, json_encode(['payload' => $payload, 'storedAt' => $storedAt]), $ttl);
            return $storedAt;
        } catch (\Throwable $e) {
            if ($this->userConfigService->isDebugEnabled()) {
                $this->logger->debug('core cache write failed', [
                    'app' => $appName,
                    'error' => $e->getMessage(),
                ]);
            }
        }
        return null;
    }

    public function bumpUserCoreCacheVersion(string $appName, string $uid): void {
        $current = $this->readUserCoreCacheVersion($appName, $uid);
        $next = $current + 1;
        try {
            $this->config->setUserValue($uid, $appName, self::CORE_CACHE_VERSION_KEY, (string)$next);
        } catch (\Throwable $e) {
            if ($this->userConfigService->isDebugEnabled()) {
                $this->logger->debug('core cache version bump failed', [
                    'app' => $appName,
                    'uid' => $uid,
                    'error' => $e->getMessage(),
                ]);
            }
        }
    }

    /**
     * @param array<string,bool> $includes
     * @param array<string,mixed> $targetsConfig
     * @param array<string,mixed> $reportingConfig
     * @param array<string,mixed> $deckSettings
     * @param array<string,mixed> $meta
     * @return array{payload: array<string,mixed>, meta: array<string,mixed>, storedAt: int}|null
     */
    public function readDataCache(
        string $appName,
        string $uid,
        string $range,
        int $offset,
        array $selectedIds,
        array $groupsById,
        array $targetsWeek,
        array $targetsMonth,
        array $targetsConfig,
        array $reportingConfig,
        array $deckSettings,
        array $includes,
        string $userTzName,
        string $userLocale,
        int $userWeekStart,
    ): ?array {
        $cacheIncludes = $this->includeResolver->normalizeForCache($includes, 'data');
        try {
            $cache = $this->cacheFactory->createDistributed($appName);
            $cacheKey = $this->buildLoadCacheKey(
                'data',
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
                $cacheIncludes,
                $userTzName,
                $userLocale,
                $userWeekStart,
            );
            $cached = $cacheKey ? $cache->get($cacheKey) : null;
            if (is_string($cached) && $cached !== '') {
                $cachedPayload = json_decode($cached, true);
                if (is_array($cachedPayload) && isset($cachedPayload['payload']) && isset($cachedPayload['meta'])) {
                    $payload = $cachedPayload['payload'];
                    $meta = $cachedPayload['meta'];
                    if (is_array($payload) && is_array($meta)) {
                        return [
                            'payload' => $payload,
                            'meta' => $meta,
                            'storedAt' => (int)($cachedPayload['storedAt'] ?? 0),
                        ];
                    }
                }
            }
        } catch (\Throwable $e) {
            if ($this->userConfigService->isDebugEnabled()) {
                $this->logger->debug('load cache read failed', [
                    'app' => $appName,
                    'error' => $e->getMessage(),
                ]);
            }
        }
        return null;
    }

    /**
     * @param array<string,bool> $includes
     * @param array<string,mixed> $targetsConfig
     * @param array<string,mixed> $reportingConfig
     * @param array<string,mixed> $deckSettings
     * @param array<string,mixed> $payload
     * @param array<string,mixed> $meta
     */
    public function writeDataCache(
        string $appName,
        string $uid,
        string $range,
        int $offset,
        array $selectedIds,
        array $groupsById,
        array $targetsWeek,
        array $targetsMonth,
        array $targetsConfig,
        array $reportingConfig,
        array $deckSettings,
        array $includes,
        string $userTzName,
        string $userLocale,
        int $userWeekStart,
        array $payload,
        array $meta,
    ): ?int {
        $ttl = $this->cacheTtl($appName);
        if ($ttl <= 0) {
            return null;
        }
        $cacheIncludes = $this->includeResolver->normalizeForCache($includes, 'data');
        try {
            $cache = $this->cacheFactory->createDistributed($appName);
            $cacheKey = $this->buildLoadCacheKey(
                'data',
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
                $cacheIncludes,
                $userTzName,
                $userLocale,
                $userWeekStart,
            );
            $storedAt = time();
            $cache->set($cacheKey, json_encode(['payload' => $payload, 'meta' => $meta, 'storedAt' => $storedAt]), $ttl);
            return $storedAt;
        } catch (\Throwable $e) {
            if ($this->userConfigService->isDebugEnabled()) {
                $this->logger->debug('load cache write failed', [
                    'app' => $appName,
                    'error' => $e->getMessage(),
                ]);
            }
        }
        return null;
    }

    /**
     * @param array<string,bool> $includes
     */
    private function buildLoadCacheKey(
        string $scope,
        string $uid,
        string $range,
        int $offset,
        array $selectedIds,
        array $groupsById,
        array $targetsWeek,
        array $targetsMonth,
        array $targetsConfig,
        array $reportingConfig,
        array $deckSettings,
        array $includes,
        string $userTzName,
        string $userLocale,
        int $userWeekStart,
    ): string {
        $selectionHash = hash('sha256', json_encode($selectedIds) ?: '');
        $configHash = hash('sha256', json_encode([
            'groups' => $groupsById,
            'targetsWeek' => $targetsWeek,
            'targetsMonth' => $targetsMonth,
            'targetsConfig' => $targetsConfig,
            'reportingConfig' => $reportingConfig,
            'deckSettings' => $deckSettings,
            'includes' => array_keys($includes),
            'timezone' => $userTzName,
            'locale' => $userLocale,
            'weekStart' => $userWeekStart,
        ]) ?: '');
        return sprintf('opsdash:load:%s:%s:%s:%d:%s:%s', $scope, $uid, $range, $offset, $selectionHash, $configHash);
    }

    /**
     * @param array<string,bool> $includes
     */
    private function buildCoreCacheKey(string $uid, array $includes, string $userTzName, string $userLocale, int $userWeekStart, int $coreVersion): string {
        $includeKeys = array_keys($includes);
        sort($includeKeys);
        $includeHash = hash('sha256', json_encode([
            'include' => $includeKeys,
            'timezone' => $userTzName,
            'locale' => $userLocale,
            'weekStart' => $userWeekStart,
            'coreVersion' => $coreVersion,
        ]) ?: '');
        return sprintf('opsdash:load:core:%s:%s', $uid, $includeHash);
    }

    private function readUserCoreCacheVersion(string $appName, string $uid): int {
        try {
            $raw = (string)$this->config->getUserValue($uid, $appName, self::CORE_CACHE_VERSION_KEY, '0');
            if (is_numeric($raw)) {
                $version = (int)$raw;
                return $version < 0 ? 0 : $version;
            }
        } catch (\Throwable) {}
        return 0;
    }
}
