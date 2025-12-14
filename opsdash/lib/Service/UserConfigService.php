<?php
declare(strict_types=1);

namespace OCA\Opsdash\Service;

use OCP\IConfig;
use Psr\Log\LoggerInterface;

final class UserConfigService {
    public function __construct(
        private IConfig $config,
        private PersistSanitizer $persistSanitizer,
        private LoggerInterface $logger,
    ) {}

    public function isDebugEnabled(): bool {
        try {
            $lvl = (int)$this->config->getSystemValue('loglevel', 2);
            return $lvl === 0; // 0 = debug
        } catch (\Throwable) {
            return false;
        }
    }

    public function readReportingConfig(string $appName, string $uid): array {
        try {
            $raw = (string)$this->config->getUserValue($uid, $appName, 'reporting_config', '');
            if ($raw !== '') {
                $decoded = json_decode($raw, true);
                if (is_array($decoded)) {
                    return $this->persistSanitizer->sanitizeReportingConfig($decoded);
                }
            }
        } catch (\Throwable) {}
        return $this->persistSanitizer->sanitizeReportingConfig(null);
    }

    public function readDeckSettings(string $appName, string $uid): array {
        try {
            $raw = (string)$this->config->getUserValue($uid, $appName, 'deck_settings', '');
            if ($raw !== '') {
                $decoded = json_decode($raw, true);
                if (is_array($decoded)) {
                    return $this->persistSanitizer->sanitizeDeckSettings($decoded);
                }
            }
        } catch (\Throwable) {}
        return $this->persistSanitizer->sanitizeDeckSettings(null);
    }

    public function readTargetsConfig(string $appName, string $uid): array {
        try {
            $json = (string)$this->config->getUserValue($uid, $appName, 'targets_config', '');
            if ($json !== '') {
                $tmp = json_decode($json, true);
                if (is_array($tmp)) {
                    return $this->persistSanitizer->cleanTargetsConfig($tmp);
                }
            }
        } catch (\Throwable $e) {
            if ($this->isDebugEnabled()) {
                $this->logger->debug('read targets config failed', [
                    'app' => $appName,
                    'error' => $e->getMessage(),
                ]);
            }
        }
        return $this->persistSanitizer->cleanTargetsConfig(null);
    }

    public function readOnboardingState(string $appName, string $uid): array {
        try {
            $raw = (string)$this->config->getUserValue($uid, $appName, 'onboarding_state', '');
        } catch (\Throwable) {
            $raw = '';
        }
        if ($raw === '') {
            return $this->persistSanitizer->cleanOnboardingState(null);
        }
        try {
            $decoded = json_decode($raw, true, flags: JSON_THROW_ON_ERROR);
        } catch (\Throwable) {
            $decoded = null;
        }
        return $this->persistSanitizer->cleanOnboardingState($decoded);
    }

    public function readThemePreference(string $appName, string $uid): string {
        try {
            $stored = (string)$this->config->getUserValue($uid, $appName, 'theme_preference', '');
        } catch (\Throwable) {
            $stored = '';
        }
        $normalized = $this->persistSanitizer->sanitizeThemePreference($stored);
        return $normalized ?? 'auto';
    }
}

