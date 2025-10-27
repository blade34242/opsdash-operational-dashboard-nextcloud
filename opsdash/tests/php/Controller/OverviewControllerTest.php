<?php

declare(strict_types=1);

namespace OCA\Opsdash\Tests\Controller;

use OCA\Opsdash\Controller\OverviewController;
use OCP\Calendar\IManager;
use OCP\IConfig;
use OCP\IRequest;
use OCP\IUserSession;
use PHPUnit\Framework\TestCase;
use Psr\Log\LoggerInterface;

class OverviewControllerTest extends TestCase {
  private OverviewController $controller;

  protected function setUp(): void {
    parent::setUp();
    $this->controller = new OverviewController(
      'opsdash',
      $this->createMock(IRequest::class),
      $this->createMock(IManager::class),
      $this->createMock(LoggerInterface::class),
      $this->createMock(IUserSession::class),
      $this->createMock(IConfig::class),
    );
  }

  public function testCleanTargetsClampsAndSkipsInvalidValues(): void {
    $method = new \ReflectionMethod(OverviewController::class, 'cleanTargets');
    $method->setAccessible(true);

    $allowed = ['wk' => 1, 'ok' => 1, 'max' => 1];
    $input = [
      'wk' => -5,
      'ok' => 'not-a-number',
      'max' => 20000,
      'skip' => 42,
    ];

    /** @var array<string,float> $result */
    $result = $method->invoke($this->controller, $input, $allowed);

    $this->assertSame(0.0, $result['wk']);
    $this->assertArrayNotHasKey('ok', $result, 'Non-numeric values should be skipped');
    $this->assertSame(10000.0, $result['max']);
    $this->assertArrayNotHasKey('skip', $result, 'Disallowed ids should be ignored');
  }

  public function testCleanGroupsSanitisesValues(): void {
    $method = new \ReflectionMethod(OverviewController::class, 'cleanGroups');
    $method->setAccessible(true);

    $allowed = ['cal' => 1, 'max' => 1];
    /** @var array<string,int> $result */
    $result = $method->invoke($this->controller, [
      'cal' => '2.7',
      'bad' => 'oops',
      'max' => 99,
    ], $allowed, ['cal', 'max', 'missing']);

    $this->assertSame(2, $result['cal']);
    $this->assertSame(0, $result['max']);
    $this->assertSame(0, $result['missing']);
    $this->assertArrayNotHasKey('bad', $result);
  }

  public function testCleanTargetsConfigSanitisesNumericFields(): void {
    $method = new \ReflectionMethod(OverviewController::class, 'cleanTargetsConfig');
    $method->setAccessible(true);

    /** @var array<string,mixed> $result */
    $result = $method->invoke($this->controller, [
      'totalHours' => 20000,
      'categories' => [
        [
          'id' => 'alpha',
          'label' => '  ',
          'targetHours' => 20001,
          'includeWeekend' => true,
          'paceMode' => 'time_aware',
          'groupIds' => ['2', '2', '99'],
        ],
      ],
      'pace' => [
        'includeWeekendTotal' => true,
        'mode' => 'time_aware',
        'thresholds' => [
          'onTrack' => 105.234,
          'atRisk' => -150,
        ],
      ],
      'forecast' => [
        'methodPrimary' => 'momentum',
        'momentumLastNDays' => 99,
        'padding' => 12.345,
      ],
      'balance' => [
        'thresholds' => [
          'noticeMaxShare' => 1.5,
          'warnMaxShare' => -0.5,
          'warnIndex' => 0.3333,
        ],
        'trend' => [
          'lookbackWeeks' => 25,
        ],
        'ui' => [
          'roundPercent' => -1,
          'roundRatio' => 5,
        ],
      ],
    ]);

    $this->assertSame(10000.0, $result['totalHours']);
    $this->assertCount(1, $result['categories']);
    $category = $result['categories'][0];
    $this->assertSame('Alpha', $category['label']);
    $this->assertSame(10000.0, $category['targetHours']);
    $this->assertSame(['alpha'], $result['balance']['categories']);
    $this->assertSame([2], $category['groupIds']);

    $this->assertSame('time_aware', $result['pace']['mode']);
    $this->assertTrue($result['pace']['includeWeekendTotal']);
    $this->assertSame(100.0, $result['pace']['thresholds']['onTrack']);
    $this->assertSame(-100.0, $result['pace']['thresholds']['atRisk']);

    $this->assertSame('momentum', $result['forecast']['methodPrimary']);
    $this->assertSame(14, $result['forecast']['momentumLastNDays']);
    $this->assertSame(12.3, $result['forecast']['padding']);

    $this->assertSame(1.0, $result['balance']['thresholds']['noticeMaxShare']);
    $this->assertSame(0.0, $result['balance']['thresholds']['warnMaxShare']);
    $this->assertSame(0.33, $result['balance']['thresholds']['warnIndex']);
    $this->assertSame(12, $result['balance']['trend']['lookbackWeeks']);
    $this->assertSame(0, $result['balance']['ui']['roundPercent']);
    $this->assertSame(3, $result['balance']['ui']['roundRatio']);
  }
}
