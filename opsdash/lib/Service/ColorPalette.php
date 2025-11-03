<?php
declare(strict_types=1);

namespace OCA\Opsdash\Service;

/**
 * Utility for producing the same fallback colour palette that the Nextcloud
 * Calendar app uses when a calendar has no explicit colour.
 */
final class ColorPalette {
    private const STEPS = 6;
    /** @var array{0:int,1:int,2:int} */
    private const BASE_RED = [182, 70, 157];
    /** @var array{0:int,1:int,2:int} */
    private const BASE_YELLOW = [221, 203, 85];
    /** @var array{0:int,1:int,2:int} */
    private const BASE_BLUE = [0, 130, 201];
    private const MD5_REGEX = '/^([0-9a-f]{4}-?){8}$/';

    /**
     * Return the deterministic fallback colour (hex) for a given identifier.
     *
     * Mirrors the algorithm from the Calendar app's uidToHexColor helper.
     */
    public static function fallbackHex(string $uid): string {
        $hash = strtolower($uid);
        if (!preg_match(self::MD5_REGEX, $hash)) {
            $hash = md5($hash);
        }
        $hash = preg_replace('/[^0-9a-f]/', '', $hash) ?? '';
        $palette = self::generatePalette(self::STEPS);
        $index = self::hashToIndex($hash, count($palette));
        $color = $palette[$index] ?? self::BASE_BLUE;
        return self::rgbToHex($color);
    }

    /**
     * @param string $hash
     */
    private static function hashToIndex(string $hash, int $maximum): int {
        if ($maximum <= 0) {
            return 0;
        }
        $total = 0;
        $length = strlen($hash);
        for ($i = 0; $i < $length; $i++) {
            $digit = hexdec($hash[$i]);
            if (!is_numeric($digit)) {
                continue;
            }
            $total += ($digit % 16);
        }
        return (int)($total % $maximum);
    }

    /**
     * @return array<int,array{0:int,1:int,2:int}>
     */
    private static function generatePalette(int $steps): array {
        return array_merge(
            self::mixPalette($steps, self::BASE_RED, self::BASE_YELLOW),
            self::mixPalette($steps, self::BASE_YELLOW, self::BASE_BLUE),
            self::mixPalette($steps, self::BASE_BLUE, self::BASE_RED),
        );
    }

    /**
     * @param array{0:int,1:int,2:int} $start
     * @param array{0:int,1:int,2:int} $end
     * @return array<int,array{0:int,1:int,2:int}>
     */
    private static function mixPalette(int $steps, array $start, array $end): array {
        $palette = [$start];
        $step = [
            ($end[0] - $start[0]) / $steps,
            ($end[1] - $start[1]) / $steps,
            ($end[2] - $start[2]) / $steps,
        ];
        for ($i = 1; $i < $steps; $i++) {
            $palette[] = [
                (int)($start[0] + $step[0] * $i),
                (int)($start[1] + $step[1] * $i),
                (int)($start[2] + $step[2] * $i),
            ];
        }
        return $palette;
    }

    /**
     * @param array{0:int,1:int,2:int} $rgb
     */
    private static function rgbToHex(array $rgb): string {
        $parts = array_map(static function (int $value): string {
            $clamped = max(0, min(255, (int)round($value)));
            return strtoupper(str_pad(dechex($clamped), 2, '0', STR_PAD_LEFT));
        }, $rgb);
        return '#' . implode('', $parts);
    }
}
