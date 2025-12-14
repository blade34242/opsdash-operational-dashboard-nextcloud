<?php
declare(strict_types=1);

namespace OCA\Opsdash\Controller;

use DateTimeImmutable;
use DateTimeInterface;
use OCA\Opsdash\Service\CalendarService;
use OCA\Opsdash\Service\PersistSanitizer;
use OCA\Opsdash\Service\UserPresetsService;
use OCP\AppFramework\Controller;
use OCP\AppFramework\Http;
use OCP\AppFramework\Http\Attribute\NoAdminRequired;
use OCP\AppFramework\Http\Attribute\NoCSRFRequired;
use OCP\AppFramework\Http\DataResponse;
use OCP\IRequest;
use OCP\IUserSession;
use Psr\Log\LoggerInterface;

final class PresetsController extends Controller {
    private const MAX_PRESETS = 20;
    private const PRESETS_KEY = 'targets_presets';

    public function __construct(
        string $appName,
        IRequest $request,
        private IUserSession $userSession,
        private LoggerInterface $logger,
        private CalendarService $calendarService,
        private PersistSanitizer $persistSanitizer,
        private UserPresetsService $userPresetsService,
    ) {
        parent::__construct($appName, $request);
    }

    #[NoAdminRequired]
    #[NoCSRFRequired]
    public function presetsList(): DataResponse {
        $uid = (string)($this->userSession->getUser()?->getUID() ?? '');
        if ($uid === '') {
            return new DataResponse(['message' => 'unauthorized'], Http::STATUS_UNAUTHORIZED);
        }
        $presets = $this->userPresetsService->read($this->appName, self::PRESETS_KEY, $uid);
        return new DataResponse([
            'ok' => true,
            'presets' => $this->userPresetsService->formatList($presets),
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
        $name = $this->persistSanitizer->sanitizePresetName((string)($data['name'] ?? ''));
        if ($name === '') {
            return new DataResponse(['message' => 'missing name'], Http::STATUS_BAD_REQUEST);
        }
        $calendars = $this->calendarService->getCalendarsFor($uid);
        $allowedIds = [];
        foreach ($calendars as $cal) {
            $allowedIds[] = (string)($cal->getUri() ?? spl_object_id($cal));
        }
        $allowedSet = array_flip($allowedIds);
        $sanitized = $this->sanitizePresetPayload($data, $allowedSet, $allowedIds);
        $payload = $sanitized['payload'];
        $warnings = $sanitized['warnings'];

        $presets = $this->userPresetsService->read($this->appName, self::PRESETS_KEY, $uid);
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
        $this->userPresetsService->write($this->appName, self::PRESETS_KEY, $uid, $presets);

        return new DataResponse([
            'ok' => true,
            'preset' => [
                'name' => $name,
                'createdAt' => $presets[$name]['created_at'] ?? null,
                'updatedAt' => $presets[$name]['updated_at'] ?? null,
            ],
            'presets' => $this->userPresetsService->formatList($presets),
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
        $decodedName = $this->persistSanitizer->sanitizePresetName(urldecode($name));
        if ($decodedName === '') {
            return new DataResponse(['message' => 'not found'], Http::STATUS_NOT_FOUND);
        }
        $presets = $this->userPresetsService->read($this->appName, self::PRESETS_KEY, $uid);
        if (!isset($presets[$decodedName])) {
            return new DataResponse(['message' => 'not found'], Http::STATUS_NOT_FOUND);
        }
        $entry = $presets[$decodedName];
        $storedPayload = is_array($entry['payload'] ?? null) ? $entry['payload'] : [];

        $calendars = $this->calendarService->getCalendarsFor($uid);
        $allowedIds = [];
        foreach ($calendars as $cal) {
            $allowedIds[] = (string)($cal->getUri() ?? spl_object_id($cal));
        }
        $allowedSet = array_flip($allowedIds);

        $sanitized = $this->sanitizePresetPayload($storedPayload, $allowedSet, $allowedIds);
        $payload = $sanitized['payload'];
        $warnings = $sanitized['warnings'];

        $presets[$decodedName]['payload'] = $payload;
        $this->userPresetsService->write($this->appName, self::PRESETS_KEY, $uid, $presets);

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
        $decodedName = $this->persistSanitizer->sanitizePresetName(urldecode($name));
        if ($decodedName === '') {
            return new DataResponse(['message' => 'not found'], Http::STATUS_NOT_FOUND);
        }
        $presets = $this->userPresetsService->read($this->appName, self::PRESETS_KEY, $uid);
        if (!isset($presets[$decodedName])) {
            return new DataResponse(['message' => 'not found'], Http::STATUS_NOT_FOUND);
        }
        unset($presets[$decodedName]);
        $this->userPresetsService->write($this->appName, self::PRESETS_KEY, $uid, $presets);
        return new DataResponse([
            'ok' => true,
            'presets' => $this->userPresetsService->formatList($presets),
        ], Http::STATUS_OK);
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
        $groups = $this->persistSanitizer->cleanGroups($groupsRaw, $allowedSet, $allIds);
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
        $targetsWeek = $this->persistSanitizer->cleanTargets($targetsWeekRaw, $allowedSet);
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
        $targetsMonth = $this->persistSanitizer->cleanTargets($targetsMonthRaw, $allowedSet);
        if (!empty($removedMonthTargets)) {
            $warnings[] = 'Removed monthly targets for unknown calendars: ' . implode(', ', $removedMonthTargets);
        }

        $targetsConfigRaw = $data['targets_config'] ?? null;
        $targetsConfig = $this->persistSanitizer->cleanTargetsConfig($targetsConfigRaw);
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
}

