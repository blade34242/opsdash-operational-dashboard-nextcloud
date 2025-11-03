<?php

declare(strict_types=1);

namespace OCA\Opsdash\Tests\Service;

use OCA\Opsdash\Service\ColorPalette;
use PHPUnit\Framework\TestCase;

class ColorPaletteTest extends TestCase {
    /**
     * @return array<string,array{string,string}>
     */
    public static function fallbackProvider(): array {
        return [
            'focus blocks' => ['Opsdash · Focus Blocks', '#3C6EBA'],
            'meetings' => ['Opsdash · Meetings', '#B6469D'],
            'deep work' => ['Opsdash · Deep Work', '#93B27B'],
            'recovery' => ['Opsdash · Recovery', '#B8BE68'],
        ];
    }

    /**
     * @dataProvider fallbackProvider
     */
    public function testFallbackMatchesCalendarPalette(string $label, string $expected): void {
        $this->assertSame($expected, ColorPalette::fallbackHex($label));
    }

    public function testLowercaseHashMatchesPalette(): void {
        $hash = md5(strtolower('Opsdash · Focus Blocks'));
        $this->assertSame(
            ColorPalette::fallbackHex('Opsdash · Focus Blocks'),
            ColorPalette::fallbackHex($hash),
        );
    }
}

