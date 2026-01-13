<?php

declare(strict_types=1);

namespace OCA\Opsdash\Tests\Service;

use OCA\Opsdash\Service\CalendarColorService;
use OCA\Opsdash\Service\ColorPalette;
use PHPUnit\Framework\TestCase;

final class CalendarColorServiceTest extends TestCase {
  public function testNormalizeHexVariants(): void {
    $service = new CalendarColorService();

    $this->assertSame('#223344', $service->normalize('#11223344'));
    $this->assertSame('#AABBCC', $service->normalize('#abc'));
    $this->assertSame('#AABBCC', $service->normalize('#aabbcc'));
  }

  public function testNormalizeRgb(): void {
    $service = new CalendarColorService();
    $this->assertSame('#010203', $service->normalize('rgb(1, 2, 3)'));
    $this->assertSame('#FFFFFF', $service->normalize('rgba(255,255,255,0.1)'));
  }

  public function testNormalizeKeepsUnknownStrings(): void {
    $service = new CalendarColorService();
    $this->assertSame('transparent', $service->normalize('transparent'));
  }

  public function testResolveCalendarColorUsesDisplayColor(): void {
    $service = new CalendarColorService();
    $calendar = new class() {
      public function getDisplayColor(): string {
        return '#abc';
      }
    };

    $info = $service->resolveCalendarColor($calendar, 'fallback');
    $this->assertSame('#AABBCC', $info['color']);
    $this->assertSame('#abc', $info['raw']);
    $this->assertSame('getDisplayColor', $info['source']);
  }

  public function testResolveCalendarColorFallsBackOnEmpty(): void {
    $service = new CalendarColorService();
    $calendar = new class() {
      public function getDisplayColor(): string {
        return '';
      }
    };

    $info = $service->resolveCalendarColor($calendar, 'cal-1');
    $this->assertSame(ColorPalette::fallbackHex('cal-1'), $info['color']);
    $this->assertSame('', $info['raw']);
    $this->assertSame('fallback', $info['source']);
  }
}
