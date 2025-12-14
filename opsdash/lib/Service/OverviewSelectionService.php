<?php
declare(strict_types=1);

namespace OCA\Opsdash\Service;

final class OverviewSelectionService {
    /**
     * @param string $savedRaw Stored CSV or "__UNSET__" sentinel.
     * @param bool $provided Whether the request explicitly provided calendar ids.
     * @param mixed $requested Raw request cals: string CSV or array or null.
     * @return array{hasSaved: bool, savedIds: string[], selectedIds: string[], includeAll: bool}
     */
    public function resolveInitialSelection(string $savedRaw, bool $provided, mixed $requested): array {
        $hasSaved = $savedRaw !== '__UNSET__';
        $savedIds = $hasSaved
            ? array_values(array_filter(explode(',', $savedRaw), static fn ($x) => $x !== ''))
            : [];

        $selectedIds = $savedIds;
        if ($provided) {
            $req = $requested;
            if (is_string($req)) {
                $req = array_values(array_filter(explode(',', $req), static fn ($x) => $x !== ''));
            }
            $req = is_array($req) ? $req : [];
            $selectedIds = array_values(array_unique(array_filter(array_map(static fn ($x) => substr((string)$x, 0, 128), $req), static fn ($x) => $x !== '')));
        }

        $includeAll = (!$hasSaved && !$provided);
        return [
            'hasSaved' => $hasSaved,
            'savedIds' => $savedIds,
            'selectedIds' => $selectedIds,
            'includeAll' => $includeAll,
        ];
    }

    /**
     * @param bool $includeAll
     * @param string[] $availableIds
     * @param string[] $selectedIds
     * @return string[]
     */
    public function finalizeSelectedIds(bool $includeAll, array $availableIds, array $selectedIds): array {
        return $includeAll ? array_values($availableIds) : $selectedIds;
    }
}

