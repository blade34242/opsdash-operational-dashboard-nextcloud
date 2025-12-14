<?php

declare(strict_types=1);

namespace OCA\Opsdash\Tests\Controller;

use OCA\Opsdash\Controller\OverviewController;
use OCA\Opsdash\Service\CalendarService;
use OCA\Opsdash\Service\NotesService;
use OCA\Opsdash\Service\OverviewAggregationService;
use OCA\Opsdash\Service\OverviewBalanceService;
use OCA\Opsdash\Service\OverviewChartsBuilder;
use OCA\Opsdash\Service\OverviewEventsCollector;
use OCA\Opsdash\Service\OverviewHistoryService;
use OCA\Opsdash\Service\OverviewSelectionService;
use OCA\Opsdash\Service\PersistSanitizer;
use OCA\Opsdash\Service\ViteAssetsService;
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

    $request = $this->createMock(IRequest::class);
    $calendarManager = $this->createMock(IManager::class);
    $logger = $this->createMock(LoggerInterface::class);
    $userSession = $this->createMock(IUserSession::class);
    $config = $this->createMock(IConfig::class);

    $viteAssetsService = new ViteAssetsService();
    $calendarService = new CalendarService($calendarManager, $config, $logger);
    $notesService = new NotesService($config, $calendarService, $logger);
    $sanitizer = new PersistSanitizer();
    $selection = new OverviewSelectionService();
    $collector = new OverviewEventsCollector($calendarManager, $calendarService, $logger);
    $history = new OverviewHistoryService($calendarService, $collector);
    $aggregation = new OverviewAggregationService();
    $chartsBuilder = new OverviewChartsBuilder();
    $balanceService = new OverviewBalanceService();

    $this->controller = new OverviewController(
      'opsdash',
      $request,
      $calendarManager,
      $logger,
      $userSession,
      $config,
      $viteAssetsService,
      $calendarService,
      $notesService,
      $sanitizer,
      $selection,
      $collector,
      $history,
      $aggregation,
      $chartsBuilder,
      $balanceService,
    );
  }

  public function testWeekOffsetFixtureStructure(): void {
    $fixturePath = dirname(__DIR__, 3) . '/test/fixtures/load-week-offset2.json';
    $fixture = json_decode((string)file_get_contents($fixturePath), true, 512, JSON_THROW_ON_ERROR);
    $this->assertSame('week', $fixture['meta']['range']);
    $this->assertSame(2, $fixture['meta']['offset']);
    $this->assertIsArray($fixture['selected']);
    $this->assertNotEmpty($fixture['selected']);
    $this->assertMatchesRegularExpression('/^\\d{4}-\\d{2}-\\d{2}$/', (string)$fixture['meta']['from']);
    $this->assertMatchesRegularExpression('/^\\d{4}-\\d{2}-\\d{2}$/', (string)$fixture['meta']['to']);
    $this->assertArrayHasKey('targets', $fixture);
  }

  public function testMonthOffsetFixtureStructure(): void {
    $fixturePath = dirname(__DIR__, 3) . '/test/fixtures/load-month-offset1.json';
    $fixture = json_decode((string)file_get_contents($fixturePath), true, 512, JSON_THROW_ON_ERROR);
    $this->assertSame('month', $fixture['meta']['range']);
    $this->assertSame(1, $fixture['meta']['offset']);
    $this->assertIsArray($fixture['selected']);
    $this->assertNotEmpty($fixture['selected']);
    $this->assertMatchesRegularExpression('/^\\d{4}-\\d{2}-\\d{2}$/', (string)$fixture['meta']['from']);
    $this->assertMatchesRegularExpression('/^\\d{4}-\\d{2}-\\d{2}$/', (string)$fixture['meta']['to']);
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
    $this->assertArrayHasKey('balance', $fixture['targets_config_read']);
    $this->assertArrayHasKey('ui', $fixture['targets_config_read']['balance']);
    $this->assertArrayHasKey('showNotes', $fixture['targets_config_read']['balance']['ui']);
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
    $this->assertSame('assignee', $fixture['deck_settings_read']['mineMode']);
    $this->assertTrue($fixture['deck_settings_read']['solvedIncludesArchived']);
    $this->assertArrayHasKey('ticker', $fixture['deck_settings_read']);
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
