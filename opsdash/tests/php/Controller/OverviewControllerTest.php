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
        'index' => [
          'basis' => 'both',
        ],
        'thresholds' => [
          'noticeAbove' => 1.5,
          'noticeBelow' => 1.5,
          'warnAbove' => -0.5,
          'warnBelow' => -0.5,
          'warnIndex' => 0.3333,
        ],
        'trend' => [
          'lookbackWeeks' => 25,
        ],
        'ui' => [
          'showNotes' => true,
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

    $this->assertSame('both', $result['balance']['index']['basis']);
    $this->assertSame(1.0, $result['balance']['thresholds']['noticeAbove']);
    $this->assertSame(1.0, $result['balance']['thresholds']['noticeBelow']);
    $this->assertSame(0.0, $result['balance']['thresholds']['warnAbove']);
    $this->assertSame(0.0, $result['balance']['thresholds']['warnBelow']);
    $this->assertSame(0.33, $result['balance']['thresholds']['warnIndex']);
    $this->assertSame(4, $result['balance']['trend']['lookbackWeeks']);
    $this->assertArrayHasKey('showNotes', $result['balance']['ui']);
    $this->assertTrue($result['balance']['ui']['showNotes']);
  }

  public function testBalanceLookbackClamp(): void {
    $method = new \ReflectionMethod(OverviewController::class, 'cleanBalanceConfig');
    $method->setAccessible(true);
    /** @var array<string,mixed> $result */
    $result = $method->invoke($this->controller, ['trend' => ['lookbackWeeks' => 12]], []);
    $this->assertSame(4, $result['trend']['lookbackWeeks']);
  }

  public function testBalanceLookbackClampNegative(): void {
    $method = new \ReflectionMethod(OverviewController::class, 'cleanBalanceConfig');
    $method->setAccessible(true);
    /** @var array<string,mixed> $result */
    $result = $method->invoke($this->controller, ['trend' => ['lookbackWeeks' => -1]], []);
    $this->assertSame(1, $result['trend']['lookbackWeeks']);
  }

  public function testBalanceLookbackClampValid(): void {
    $method = new \ReflectionMethod(OverviewController::class, 'cleanBalanceConfig');
    $method->setAccessible(true);
    /** @var array<string,mixed> $resultOne */
    $resultOne = $method->invoke($this->controller, ['trend' => ['lookbackWeeks' => 1]], []);
    $this->assertSame(1, $resultOne['trend']['lookbackWeeks']);

    /** @var array<string,mixed> $resultFour */
    $resultFour = $method->invoke($this->controller, ['trend' => ['lookbackWeeks' => 4]], []);
    $this->assertSame(4, $resultFour['trend']['lookbackWeeks']);
  }

  public function testBalanceIndexBasisSanitises(): void {
    $method = new \ReflectionMethod(OverviewController::class, 'cleanBalanceConfig');
    $method->setAccessible(true);
    /** @var array<string,mixed> $resultCalendar */
    $resultCalendar = $method->invoke($this->controller, ['index' => ['basis' => 'calendar']], []);
    $this->assertSame('calendar', $resultCalendar['index']['basis']);

    /** @var array<string,mixed> $resultOff */
    $resultOff = $method->invoke($this->controller, ['index' => ['basis' => 'off']], []);
    $this->assertSame('off', $resultOff['index']['basis']);

    /** @var array<string,mixed> $resultFallback */
    $resultFallback = $method->invoke($this->controller, ['index' => ['basis' => 'invalid']], []);
    $this->assertSame('category', $resultFallback['index']['basis']);
  }

  public function testCleanOnboardingState(): void {
    $method = new \ReflectionMethod(OverviewController::class, 'cleanOnboardingState');
    $method->setAccessible(true);

    /** @var array<string,mixed> $default */
    $default = $method->invoke($this->controller, null);
    $this->assertFalse($default['completed']);
    $this->assertSame(0, $default['version']);
    $this->assertSame('', $default['strategy']);
    $this->assertSame('', $default['completed_at']);

    /** @var array<string,mixed> $filled */
    $filled = $method->invoke($this->controller, [
      'completed' => true,
      'version' => '12',
      'strategy' => ' full_granular ',
      'completed_at' => '2025-01-01T00:00:00Z   ',
    ]);
    $this->assertTrue($filled['completed']);
    $this->assertSame(12, $filled['version']);
    $this->assertSame('full_granular', $filled['strategy']);
    $this->assertSame('2025-01-01T00:00:00Z', $filled['completed_at']);
  }

  public function testSanitizePresetNameStripsUnsafeCharacters(): void {
    $method = new \ReflectionMethod(OverviewController::class, 'sanitizePresetName');
    $method->setAccessible(true);

    $result = $method->invoke($this->controller, " ../Evil<script>/\\Name  ");
    $this->assertSame('..EvilscriptName', $result);
  }

  public function testSanitizePresetNameReturnsEmptyWhenNothingAllowed(): void {
    $method = new \ReflectionMethod(OverviewController::class, 'sanitizePresetName');
    $method->setAccessible(true);

    $result = $method->invoke($this->controller, "<><><>");
    $this->assertSame('', $result);
  }

  public function testPresetExportFixtureSanitisesWithoutWarnings(): void {
    $method = new \ReflectionMethod(OverviewController::class, 'sanitizePresetPayload');
    $method->setAccessible(true);

    $fixturePath = dirname(__DIR__, 3) . '/test/fixtures/preset-export.json';
    $fixture = json_decode((string)file_get_contents($fixturePath), true, 512, JSON_THROW_ON_ERROR);
    $payload = $fixture['payload'] ?? [];

    $controllerPayload = [
      'selected' => array_map('strval', $payload['cals'] ?? []),
      'groups' => $payload['groups'] ?? [],
      'targets_week' => $payload['targets_week'] ?? [],
      'targets_month' => $payload['targets_month'] ?? [],
      'targets_config' => $payload['targets_config'] ?? [],
    ];
    $allowedIds = $controllerPayload['selected'];
    $result = $method->invoke($this->controller, $controllerPayload, array_flip($allowedIds), $allowedIds);

    $this->assertSame($allowedIds, $result['payload']['selected']);
    $this->assertSame($controllerPayload['groups'], $result['payload']['groups']);
    $this->assertEquals($controllerPayload['targets_week'], $result['payload']['targets_week']);
    $this->assertEquals($controllerPayload['targets_month'], $result['payload']['targets_month']);
    $this->assertEquals($controllerPayload['targets_config']['totalHours'], $result['payload']['targets_config']['totalHours']);
    $this->assertSame([], $result['warnings'], 'Fixture should import without warnings when calendars match.');
  }

  public function testWeekOffsetFixtureStructure(): void {
    $fixturePath = dirname(__DIR__, 3) . '/test/fixtures/load-week-offset2.json';
    $fixture = json_decode((string)file_get_contents($fixturePath), true, 512, JSON_THROW_ON_ERROR);
    $this->assertSame(2, $fixture['meta']['offset']);
    $this->assertSame('2025-11-10', $fixture['meta']['from']);
    $this->assertSame(['personal', 'asdsad'], $fixture['selected']);
    $this->assertArrayHasKey('byCal', $fixture);
    $this->assertArrayHasKey('stats', $fixture);
  }

  public function testMonthMultiuserFixtureStructure(): void {
    $fixturePath = dirname(__DIR__, 3) . '/test/fixtures/load-month-multiuser.json';
    $fixture = json_decode((string)file_get_contents($fixturePath), true, 512, JSON_THROW_ON_ERROR);
    $this->assertSame(['personal', 'opsdash-focus'], $fixture['selected']);
    $this->assertSame('2025-10-01', $fixture['meta']['from']);
    $this->assertSame('2025-10-31', $fixture['meta']['to']);
    $this->assertArrayHasKey('targets', $fixture);
  }

  public function testQaMonthFixtureStructure(): void {
    $fixturePath = dirname(__DIR__, 3) . '/test/fixtures/load-month-qa.json';
    $fixture = json_decode((string)file_get_contents($fixturePath), true, 512, JSON_THROW_ON_ERROR);
    $this->assertSame('month', $fixture['meta']['range']);
    $this->assertSame('admin', $fixture['meta']['uid']);
    $this->assertArrayHasKey('colors', $fixture);
    $this->assertArrayHasKey('byDay', $fixture);
  }

  public function testQaWeekFixtureStructure(): void {
    $fixturePath = dirname(__DIR__, 3) . '/test/fixtures/load-week-qa.json';
    $fixture = json_decode((string)file_get_contents($fixturePath), true, 512, JSON_THROW_ON_ERROR);
    $this->assertSame('week', $fixture['meta']['range']);
    $this->assertSame('qa', $fixture['meta']['uid']);
    $this->assertSame(['opsdash-focus'], $fixture['selected']);
    $this->assertArrayHasKey('colors', $fixture);
  }

  public function testPersistResponseFixtureStructure(): void {
    $fixturePath = dirname(__DIR__, 3) . '/test/fixtures/persist-response.json';
    $fixture = json_decode((string)file_get_contents($fixturePath), true, 512, JSON_THROW_ON_ERROR);
    $this->assertTrue($fixture['ok']);
    $this->assertSame(['personal', 'opsdash-focus'], $fixture['saved']);
    $this->assertSame('dark', $fixture['theme_preference_read']);
    $this->assertArrayHasKey('targets_config_read', $fixture);
  }

  public function testPersistWeekOffsetFixtureStructure(): void {
    $fixturePath = dirname(__DIR__, 3) . '/test/fixtures/persist-week-offset1.json';
    $fixture = json_decode((string)file_get_contents($fixturePath), true, 512, JSON_THROW_ON_ERROR);
    $this->assertTrue($fixture['ok']);
    $this->assertSame(['personal'], $fixture['saved']);
    $this->assertArrayHasKey('targets_week_read', $fixture);
    $this->assertArrayHasKey('groups_read', $fixture);
  }

  public function testPersistReportingDeckFixtureStructure(): void {
    $fixturePath = dirname(__DIR__, 3) . '/test/fixtures/persist-reporting-deck.json';
    $fixture = json_decode((string)file_get_contents($fixturePath), true, 512, JSON_THROW_ON_ERROR);
    $this->assertTrue($fixture['ok']);
    $this->assertArrayHasKey('reporting_config_read', $fixture);
    $this->assertArrayHasKey('deck_settings_read', $fixture);
    $this->assertSame('mine', $fixture['deck_settings_read']['defaultFilter']);
    $this->assertSame([42], $fixture['deck_settings_read']['hiddenBoards']);
  }

  public function testDeckSettingsSanitizeHiddenBoards(): void {
    $method = new \ReflectionMethod(OverviewController::class, 'sanitizeDeckSettings');
    $method->setAccessible(true);

    /** @var array<string,mixed> $result */
    $result = $method->invoke($this->controller, [
      'enabled' => false,
      'filtersEnabled' => false,
      'defaultFilter' => 'mine',
      'hiddenBoards' => [2, '5', 'foo', -4, 0, 2],
    ]);

    $this->assertFalse($result['enabled']);
    $this->assertFalse($result['filtersEnabled']);
    $this->assertSame('mine', $result['defaultFilter']);
    $this->assertSame([2, 5], $result['hiddenBoards']);
  }

  public function testNotesFixtureStructure(): void {
    $fixturePath = dirname(__DIR__, 3) . '/test/fixtures/notes-week.json';
    $fixture = json_decode((string)file_get_contents($fixturePath), true, 512, JSON_THROW_ON_ERROR);
    $this->assertTrue($fixture['ok']);
    $this->assertArrayHasKey('current', $fixture['notes']);
    $this->assertArrayHasKey('previous', $fixture['notes']);
  }

  public function testNotesQaFixtureStructure(): void {
    $fixturePath = dirname(__DIR__, 3) . '/test/fixtures/notes-month-qa.json';
    $fixture = json_decode((string)file_get_contents($fixturePath), true, 512, JSON_THROW_ON_ERROR);
    $this->assertSame('month', $fixture['range']);
    $this->assertSame('qa', $fixture['user']);
    $this->assertArrayHasKey('current', $fixture['notes']);
    $this->assertArrayHasKey('previous', $fixture['notes']);
  }
}
