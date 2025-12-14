<?php

declare(strict_types=1);

namespace OCA\Opsdash\Tests\Service;

use OCA\Opsdash\Service\OverviewSelectionService;
use PHPUnit\Framework\TestCase;

class OverviewSelectionServiceTest extends TestCase {
  public function testResolveInitialSelectionDefaultsToIncludeAllWhenUnsetAndNotProvided(): void {
    $service = new OverviewSelectionService();
    $result = $service->resolveInitialSelection('__UNSET__', false, null);
    $this->assertFalse($result['hasSaved']);
    $this->assertTrue($result['includeAll']);
    $this->assertSame([], $result['savedIds']);
    $this->assertSame([], $result['selectedIds']);

    $final = $service->finalizeSelectedIds(true, ['a', 'b'], $result['selectedIds']);
    $this->assertSame(['a', 'b'], $final);
  }

  public function testResolveInitialSelectionUsesSavedIdsWhenPresent(): void {
    $service = new OverviewSelectionService();
    $result = $service->resolveInitialSelection('a,b,,c', false, null);
    $this->assertTrue($result['hasSaved']);
    $this->assertFalse($result['includeAll']);
    $this->assertSame(['a', 'b', 'c'], $result['savedIds']);
    $this->assertSame(['a', 'b', 'c'], $result['selectedIds']);
  }

  public function testResolveInitialSelectionRespectsExplicitEmptyRequest(): void {
    $service = new OverviewSelectionService();
    $result = $service->resolveInitialSelection('a,b', true, []);
    $this->assertTrue($result['hasSaved']);
    $this->assertFalse($result['includeAll']);
    $this->assertSame([], $result['selectedIds']);
  }

  public function testResolveInitialSelectionParsesCsvWhenProvided(): void {
    $service = new OverviewSelectionService();
    $result = $service->resolveInitialSelection('__UNSET__', true, 'a,b,a,');
    $this->assertFalse($result['hasSaved']);
    $this->assertFalse($result['includeAll']);
    $this->assertSame(['a', 'b'], $result['selectedIds']);
  }
}

