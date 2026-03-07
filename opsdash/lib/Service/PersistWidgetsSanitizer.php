<?php
declare(strict_types=1);

namespace OCA\Opsdash\Service;

final class PersistWidgetsSanitizer {
    private const MAX_WIDGET_TABS = 10;
    private const MAX_WIDGETS_PER_TAB = 50;
    private const MAX_WIDGETS_TOTAL = 100;

    /**
     * @param mixed $value
     * @return array<string,mixed>|array<int,array<string,mixed>>
     */
    public function sanitize($value): array {
        if (!is_array($value)) {
            return [];
        }
        if (array_key_exists('tabs', $value)) {
            $tabsRaw = $value['tabs'];
            if (!is_array($tabsRaw)) {
                return [];
            }
            $tabs = [];
            $totalWidgets = 0;
            foreach ($tabsRaw as $tab) {
                if (count($tabs) >= self::MAX_WIDGET_TABS) {
                    break;
                }
                if (!is_array($tab)) {
                    continue;
                }
                $id = substr(trim((string)($tab['id'] ?? '')), 0, 48);
                if ($id === '') {
                    $id = sprintf('tab-%d', count($tabs) + 1);
                }
                $labelRaw = trim((string)($tab['label'] ?? ''));
                $label = $labelRaw !== '' ? substr($labelRaw, 0, 48) : sprintf('Tab %d', count($tabs) + 1);
                $widgets = $this->sanitizeWidgetList($tab['widgets'] ?? [], self::MAX_WIDGETS_PER_TAB, $totalWidgets);
                $tabs[] = [
                    'id' => $id,
                    'label' => $label,
                    'widgets' => $widgets,
                ];
            }
            if (empty($tabs)) {
                return [];
            }
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
        $totalWidgets = 0;
        return $this->sanitizeWidgetList($value, self::MAX_WIDGETS_TOTAL, $totalWidgets);
    }

    /**
     * @param mixed $value
     * @return array<int,array<string,mixed>>
     */
    private function sanitizeWidgetList($value, int $limit, int &$totalWidgets): array {
        if (!is_array($value)) {
            return [];
        }
        $cleaned = [];
        foreach ($value as $item) {
            if ($totalWidgets >= self::MAX_WIDGETS_TOTAL || count($cleaned) >= $limit) {
                break;
            }
            if (!is_array($item)) {
                continue;
            }
            $type = substr(trim((string)($item['type'] ?? '')), 0, 64);
            if ($type === '') {
                continue;
            }
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
            $totalWidgets += 1;
        }
        return $cleaned;
    }
}
