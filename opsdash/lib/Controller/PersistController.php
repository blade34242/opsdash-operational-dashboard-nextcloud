<?php
declare(strict_types=1);

namespace OCA\Opsdash\Controller;

use OCA\Opsdash\Service\CalendarAccessService;
use OCA\Opsdash\Service\PersistSanitizer;
use OCA\Opsdash\Service\UserConfigService;
use OCP\AppFramework\Controller;
use OCP\AppFramework\Http;
use OCP\AppFramework\Http\Attribute\NoAdminRequired;
use OCP\AppFramework\Http\DataResponse;
use OCP\IConfig;
use OCP\IRequest;
use OCP\IUserSession;
use Psr\Log\LoggerInterface;

final class PersistController extends Controller {
    use CsrfEnforcerTrait;
    use RequestGuardTrait;

    private const CONFIG_ONBOARDING = 'onboarding_state';
    private const MAX_CONFIG_BYTES = 65535;

    public function __construct(
        string $appName,
        IRequest $request,
        private IUserSession $userSession,
        protected LoggerInterface $logger,
        private IConfig $config,
        private CalendarAccessService $calendarAccess,
        private PersistSanitizer $persistSanitizer,
        private UserConfigService $userConfigService,
    ) {
        parent::__construct($appName, $request);
    }

    #[NoAdminRequired]
    public function persist(): DataResponse {
        $uid = (string)($this->userSession->getUser()?->getUID() ?? '');
        if ($uid === '') return new DataResponse(['message' => 'unauthorized'], Http::STATUS_UNAUTHORIZED);
        if ($csrf = $this->enforceCsrf()) {
            return $csrf;
        }

        // Read request
        $data = $this->readJsonBodyDefault();
        if ($data instanceof DataResponse) {
            return $data;
        }
        $hasCals = array_key_exists('cals', $data);
        $reqOriginal = null;
        if ($hasCals) {
            $reqOriginal = $data['cals'];
            if (is_string($reqOriginal)) {
                $reqOriginal = array_values(array_filter(explode(',', $reqOriginal), fn($x) => $x !== ''));
            }
            $reqOriginal = is_array($reqOriginal) ? $reqOriginal : [];
        }

        // Intersect with user's calendars
        $allowedIds = $this->calendarAccess->getCalendarIdsFor($uid);
        $allowed = array_fill_keys($allowedIds, true);

        // Save
        $after = null;
        $csv = null;
        if ($hasCals) {
            $after = array_values(array_unique(array_filter(array_map(fn($x) => substr((string)$x, 0, 128), $reqOriginal), fn($x) => isset($allowed[$x]))));
            $csv = implode(',', $after);
            $this->config->setUserValue($uid, $this->appName, 'selected_cals', $csv);
        }

        // Optional: groups mapping
        $groupsSaved = null; $groupsRead = null;
        if (isset($data['groups']) && is_array($data['groups'])) {
            $gclean = $this->persistSanitizer->cleanGroups($data['groups'], $allowed, array_keys($allowed));
            if ($resp = $this->writeUserJsonValue($uid, 'cal_groups', $gclean, 'groups')) {
                return $resp;
            }
            $groupsSaved = $gclean;
            try {
                $gjson = (string)$this->config->getUserValue($uid, $this->appName, 'cal_groups', '');
                $tmp = $gjson !== '' ? json_decode($gjson, true) : [];
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
            $tw = $this->persistSanitizer->cleanTargets(is_array($data['targets_week']) ? $data['targets_week'] : [], $allowed);
            if ($resp = $this->writeUserJsonValue($uid, 'cal_targets_week', $tw, 'targets_week')) {
                return $resp;
            }
            $targetsWeekSaved = $tw;
            try {
                $r = (string)$this->config->getUserValue($uid, $this->appName, 'cal_targets_week', '');
                $targetsWeekRead = $r !== '' ? json_decode($r, true) : [];
            } catch (\Throwable) {}
        }
        if (isset($data['targets_config'])) {
            $cleanCfg = $this->persistSanitizer->cleanTargetsConfig($data['targets_config']);
            if ($resp = $this->writeUserJsonValue($uid, 'targets_config', $cleanCfg, 'targets_config')) {
                return $resp;
            }
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
            $tm = $this->persistSanitizer->cleanTargets(is_array($data['targets_month']) ? $data['targets_month'] : [], $allowed);
            if ($resp = $this->writeUserJsonValue($uid, 'cal_targets_month', $tm, 'targets_month')) {
                return $resp;
            }
            $targetsMonthSaved = $tm;
            try {
                $r = (string)$this->config->getUserValue($uid, $this->appName, 'cal_targets_month', '');
                $targetsMonthRead = $r !== '' ? json_decode($r, true) : [];
            } catch (\Throwable) {}
        }
        if (!empty($data['onboarding_reset'])) {
            try {
                $this->config->deleteUserValue($uid, $this->appName, self::CONFIG_ONBOARDING);
            } catch (\Throwable) {}
        } elseif (array_key_exists('onboarding', $data)) {
            $cleanOnboarding = $this->persistSanitizer->cleanOnboardingState($data['onboarding']);
            if ($resp = $this->writeUserJsonValue($uid, self::CONFIG_ONBOARDING, $cleanOnboarding, 'onboarding')) {
                return $resp;
            }
            $onboardingSaved = $cleanOnboarding;
        }
        $onboardingRead = $this->userConfigService->readOnboardingState($this->appName, $uid);
        if (array_key_exists('theme_preference', $data)) {
            $themeValue = $this->persistSanitizer->sanitizeThemePreference($data['theme_preference']);
            if ($themeValue === null) {
                try { $this->config->deleteUserValue($uid, $this->appName, 'theme_preference'); } catch (\Throwable) {}
            } else {
                $this->config->setUserValue($uid, $this->appName, 'theme_preference', $themeValue);
                $themeSaved = $themeValue;
            }
            $themeRead = $this->userConfigService->readThemePreference($this->appName, $uid);
        }
        if (isset($data['reporting_config'])) {
            $cleanReporting = $this->persistSanitizer->sanitizeReportingConfig($data['reporting_config']);
            if ($resp = $this->writeUserJsonValue($uid, 'reporting_config', $cleanReporting, 'reporting_config')) {
                return $resp;
            }
            $reportingSaved = $cleanReporting;
        }
        $reportingRead = $this->userConfigService->readReportingConfig($this->appName, $uid);
        if (isset($data['targets_config_activity'])) {
            $activity = $data['targets_config_activity'];
            if (is_array($activity) && array_key_exists('showDayOffTrend', $activity)) {
                $currentCfg = $targetsConfigSaved ?? $this->userConfigService->readTargetsConfig($this->appName, $uid);
                if (is_array($currentCfg)) {
                    if (!isset($currentCfg['activityCard']) || !is_array($currentCfg['activityCard'])) {
                        $currentCfg['activityCard'] = [];
                    }
                    $currentCfg['activityCard']['showDayOffTrend'] = $activity['showDayOffTrend'] !== false;
                    if ($resp = $this->writeUserJsonValue($uid, 'targets_config', $currentCfg, 'targets_config')) {
                        return $resp;
                    }
                    $targetsConfigSaved = $currentCfg;
                    $targetsConfigRead = $currentCfg;
                }
            }
        }
        if (isset($data['deck_settings'])) {
            $cleanDeck = $this->persistSanitizer->sanitizeDeckSettings($data['deck_settings']);
            if ($resp = $this->writeUserJsonValue($uid, 'deck_settings', $cleanDeck, 'deck_settings')) {
                return $resp;
            }
            $deckSaved = $cleanDeck;
        }
        $deckRead = $this->userConfigService->readDeckSettings($this->appName, $uid);
        if (isset($data['widgets'])) {
            $cleanWidgets = $this->persistSanitizer->sanitizeWidgets($data['widgets']);
            if ($resp = $this->writeUserJsonValue($uid, 'widgets_layout', $cleanWidgets, 'widgets')) {
                return $resp;
            }
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
        $read = array_values(array_filter(explode(',', $readCsv), fn($x) => $x !== ''));
        if ($themeRead === null) {
            $themeRead = $this->userConfigService->readThemePreference($this->appName, $uid);
        }
        if ($targetsConfigRead === null) {
            $targetsConfigRead = $this->userConfigService->readTargetsConfig($this->appName, $uid);
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

    /**
     * @param array<string,mixed> $payload
     */
    private function writeUserJsonValue(string $uid, string $key, array $payload, string $label): ?DataResponse {
        try {
            $json = $this->encodeConfigValue($payload, $label);
            $this->config->setUserValue($uid, $this->appName, $key, $json);
            return null;
        } catch (\LengthException $e) {
            return new DataResponse(['message' => $label . ' too large'], Http::STATUS_REQUEST_ENTITY_TOO_LARGE);
        } catch (\Throwable $e) {
            $this->logger->error('persist failed: ' . $e->getMessage(), ['app' => $this->appName]);
            return new DataResponse(['message' => 'error'], Http::STATUS_INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * @param array<string,mixed> $payload
     */
    private function encodeConfigValue(array $payload, string $label): string {
        $json = json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
        if ($json === false) {
            throw new \RuntimeException('json encode failed: ' . $label);
        }
        if (strlen($json) > self::MAX_CONFIG_BYTES) {
            throw new \LengthException('payload too large: ' . $label);
        }
        return $json;
    }
}
