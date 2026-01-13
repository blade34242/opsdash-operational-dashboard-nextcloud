<?php
declare(strict_types=1);

namespace OCA\Opsdash\Service;

class CalendarColorService {
    /**
     * Normalize various color formats to #RRGGBB (uppercase hex).
     */
    public function normalize(string $color): string {
        $c = trim($color);
        if (preg_match('/^#([0-9a-fA-F]{8})$/', $c, $m)) {
            return '#' . strtoupper(substr($m[1], 2));
        }
        if (preg_match('/^#([0-9a-fA-F]{3})$/', $c, $m)) {
            $r = $m[1][0];
            $g = $m[1][1];
            $b = $m[1][2];
            return '#' . strtoupper($r . $r . $g . $g . $b . $b);
        }
        if (preg_match('/^#([0-9a-fA-F]{6})$/', $c)) {
            return strtoupper($c);
        }
        if (preg_match('/^rgba?\(\s*([0-9]{1,3})\s*,\s*([0-9]{1,3})\s*,\s*([0-9]{1,3})/i', $c, $m)) {
            $r = max(0, min(255, (int)$m[1]));
            $g = max(0, min(255, (int)$m[2]));
            $b = max(0, min(255, (int)$m[3]));
            return strtoupper(sprintf('#%02x%02x%02x', $r, $g, $b));
        }
        return $c;
    }

    /**
     * Resolve the display color for a calendar-like object.
     *
     * @return array{color: string, raw: string|null, source: string}
     */
    public function resolveCalendarColor(object $calendar, string $fallbackKey): array {
        $color = null;
        $raw = null;
        $src = 'fallback';
        try {
            if (method_exists($calendar, 'getDisplayColor')) {
                $raw = $calendar->getDisplayColor();
                if (is_string($raw) && $raw !== '') {
                    $color = $this->normalize($raw);
                    $src = 'getDisplayColor';
                }
            }
        } catch (\Throwable) {
            $color = null;
        }
        if ($color === null || $color === '') {
            $color = ColorPalette::fallbackHex($fallbackKey);
            $src = 'fallback';
        } elseif ($src === 'fallback') {
            $color = ColorPalette::fallbackHex($fallbackKey);
        }
        return [
            'color' => $color,
            'raw' => $raw,
            'source' => $src,
        ];
    }
}
