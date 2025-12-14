<?php

declare(strict_types=1);

namespace OCA\Opsdash\Tests\Service;

use DateTimeImmutable;
use OCA\Opsdash\Service\OverviewBalanceService;
use PHPUnit\Framework\TestCase;

class OverviewBalanceServiceTest extends TestCase {
  public function testBuildComputesIndexAndWarnings(): void {
    $service = new OverviewBalanceService();

    $categoryMeta = [
      'work' => ['id' => 'work', 'label' => 'Work'],
      'hobby' => ['id' => 'hobby', 'label' => 'Hobby'],
    ];
    $categoryTotals = ['work' => 80.0, 'hobby' => 20.0];
    $categoryTotalsPrev = ['work' => 50.0, 'hobby' => 50.0];

    $targetsConfig = [
      'categories' => [
        ['id' => 'work', 'targetHours' => 50],
        ['id' => 'hobby', 'targetHours' => 50],
      ],
    ];
    $balanceConfig = [
      'index' => ['basis' => 'category'],
      'categories' => ['work', 'hobby'],
      'thresholds' => [
        'warnIndex' => 0.8,
        'noticeAbove' => 0.05,
        'warnAbove' => 0.20,
        'noticeBelow' => 0.05,
        'warnBelow' => 0.20,
      ],
      'relations' => ['displayMode' => 'ratio'],
    ];

    $res = $service->build(
      range: 'week',
      targetsConfig: $targetsConfig,
      targetsWeek: [],
      targetsMonth: [],
      byCalMap: [],
      idToName: [],
      categoryMeta: $categoryMeta,
      categoryTotals: $categoryTotals,
      totalHours: 100.0,
      categoryTotalsPrev: $categoryTotalsPrev,
      prevTotal: 100.0,
      categoryColors: ['work' => '#111111', 'hobby' => '#222222'],
      balanceConfig: $balanceConfig,
      perDayByCat: [],
      from: new DateTimeImmutable('2025-01-01T00:00:00Z'),
      to: new DateTimeImmutable('2025-01-07T23:59:59Z'),
      trendHistory: [],
    );

    $this->assertEquals(0.7, round($res['balanceIndex'], 2));
    $this->assertArrayHasKey('balanceOverview', $res);
    $warnings = $res['balanceOverview']['warnings'] ?? [];
    $this->assertIsArray($warnings);
    $this->assertTrue(
      array_reduce($warnings, fn ($carry, $w) => $carry || (is_string($w) && str_contains($w, 'Balance index low')), false),
    );
  }
}

