<?php

declare(strict_types=1);

namespace OCA\Opsdash\Tests\Service;

use OCA\Opsdash\Service\CalendarAccessService;
use OCA\Opsdash\Service\CalendarParsingService;
use OCA\Opsdash\Service\OverviewEventsCollector;
use OCA\Opsdash\Service\OverviewHistoryService;
use OCA\Opsdash\Service\OverviewStatsDeltaService;
use OCP\Calendar\IManager;
use OCP\IConfig;
use PHPUnit\Framework\TestCase;
use Psr\Log\LoggerInterface;

final class OverviewStatsDeltaServiceTest extends TestCase {
  public function testBuildComputesDeltaAgainstPreviousRange(): void {
    $logger = $this->createMock(LoggerInterface::class);
    $calendarAccess = new FixedBoundsCalendarAccess([
      -1 => [
        new \DateTimeImmutable('2023-12-25 00:00:00', new \DateTimeZone('UTC')),
        new \DateTimeImmutable('2023-12-31 23:59:59', new \DateTimeZone('UTC')),
      ],
    ]);

    $calendarParsing = new QueueCalendarParsingService([
      [],
    ]);
    $manager = new DummyCalendarManager();
    $collector = new OverviewEventsCollector($manager, $calendarParsing, $logger);
    $history = new OverviewHistoryService($calendarAccess, $collector);
    $service = new OverviewStatsDeltaService(
      $calendarAccess,
      $history,
      $collector,
      new \OCA\Opsdash\Service\OverviewAggregationService(),
    );

    $context = [
      'range' => 'week',
      'offset' => 0,
      'principal' => 'principals/users/admin',
      'calendars' => [new DeltaCalendarStub('cal-1')],
      'includeAll' => true,
      'selectedIds' => [],
      'mapCalToCategory' => fn (string $id): string => 'work',
      'userTz' => new \DateTimeZone('UTC'),
      'allDayHours' => 8.0,
      'categoryMeta' => ['work' => ['id' => 'work', 'label' => 'Work']],
      'maxPerCal' => 2000,
      'maxTotal' => 5000,
      'colorsById' => [],
      'weekStart' => 1,
      'currentTotalHours' => 8.0,
      'currentAvgPerDay' => 4.0,
      'currentAvgPerEvent' => 2.0,
      'currentEventsCount' => 3,
      'currentWeekendShare' => 50.0,
      'currentEveningShare' => 0.0,
    ];

    $result = $service->build($context);

    $this->assertSame(['work' => 0.0], $result['categoryTotalsPrev']);
    $this->assertSame(0.0, $result['prevTotal']);
    $this->assertSame(0, $result['prevEvents']);
    $this->assertSame([], $result['prevDaysSeen']);
    $this->assertSame(0.0, $result['prevWeekendShare']);
    $this->assertSame(0.0, $result['prevEveningShare']);

    $this->assertSame(8.0, $result['delta']['total_hours']);
    $this->assertSame(4.0, $result['delta']['avg_per_day']);
    $this->assertSame(2.0, $result['delta']['avg_per_event']);
    $this->assertSame(3, $result['delta']['events']);
    $this->assertSame(50.0, $result['delta']['weekend_share']);
    $this->assertSame(0.0, $result['delta']['evening_share']);
  }
}

final class FixedBoundsCalendarAccess extends CalendarAccessService {
  /** @var array<int, array{0:\DateTimeImmutable,1:\DateTimeImmutable}> */
  private array $bounds;

  public function __construct(array $bounds) {
    parent::__construct(
      new class implements IManager {},
      new class implements IConfig {
        public function getAppValue(string $appName, string $key, string $default = ''): string { return $default; }
        public function getUserValue(string $userId, string $appName, string $key, string $default = ''): string { return $default; }
        public function setUserValue(string $userId, string $appName, string $key, string $value): void {}
      },
      new class implements LoggerInterface {
        public function emergency($message, array $context = []): void {}
        public function alert($message, array $context = []): void {}
        public function critical($message, array $context = []): void {}
        public function error($message, array $context = []): void {}
        public function warning($message, array $context = []): void {}
        public function notice($message, array $context = []): void {}
        public function info($message, array $context = []): void {}
        public function debug($message, array $context = []): void {}
        public function log($level, $message, array $context = []): void {}
      },
    );
    $this->bounds = $bounds;
  }

  public function rangeBounds(string $range, int $offset, ?\DateTimeZone $tz = null, ?int $weekStart = null): array {
    return $this->bounds[$offset];
  }
}

final class DummyCalendarManager implements IManager {
  public function newQuery(string $principal): object {
    return new class() {
      public function addSearchCalendar(string $calendar): void {}
      public function setTimerangeStart(\DateTimeInterface $from): void {}
      public function setTimerangeEnd(\DateTimeInterface $to): void {}
    };
  }

  public function searchForPrincipal(object $query): array {
    return [[]];
  }
}

final class QueueCalendarParsingService extends CalendarParsingService {
  /** @var array<int, array<int, array<string, mixed>>> */
  private array $queue;

  public function __construct(array $queue) {
    $this->queue = $queue;
  }

  public function parseRows(array $raw, string $calendarName, ?string $calendarId = null): array {
    return array_shift($this->queue) ?? [];
  }
}

final class DeltaCalendarStub {
  public function __construct(private string $uri) {}
  public function getUri(): string { return $this->uri; }
  public function getDisplayName(): string { return $this->uri; }
}
