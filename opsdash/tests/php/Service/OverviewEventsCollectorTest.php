<?php

declare(strict_types=1);

namespace OCA\Opsdash\Tests\Service;

use DateTimeImmutable;
use OCA\Opsdash\Service\CalendarParsingService;
use OCA\Opsdash\Service\OverviewEventsCollector;
use OCP\Calendar\IManager;
use PHPUnit\Framework\TestCase;
use Psr\Log\LoggerInterface;

class OverviewEventsCollectorTest extends TestCase {
  public function testCollectSkipsUnselectedCalendars(): void {
    $manager = new class() implements IManager {
      public array $responses = [];
      public function newQuery(string $principal): object {
        return new class() {
          public string $calendar = '';
          public function addSearchCalendar(string $calendar): void { $this->calendar = $calendar; }
          public function setTimerangeStart($from): void {}
          public function setTimerangeEnd($to): void {}
        };
      }
      public function searchForPrincipal(object $q): array {
        return $this->responses[$q->calendar] ?? [];
      }
    };

    $manager->responses = [
      'cal-a' => [['id' => 1]],
      'cal-b' => [['id' => 2]],
    ];

    $calendarService = new class() extends CalendarParsingService {
      public function parseRows(array $raw, string $calendarName, ?string $calendarId = null): array {
        return array_map(
          fn ($row) => ['calendar' => $calendarName, 'calendar_id' => $calendarId, 'hours' => 1, 'allday' => false],
          $raw,
        );
      }
    };

    $logger = $this->createMock(LoggerInterface::class);
    $collector = new OverviewEventsCollector($manager, $calendarService, $logger);

    $calA = new class() {
      public function getUri(): string { return 'cal-a'; }
      public function getDisplayName(): string { return 'A'; }
    };
    $calB = new class() {
      public function getUri(): string { return 'cal-b'; }
      public function getDisplayName(): string { return 'B'; }
    };

    $res = $collector->collect(
      principal: 'principals/users/admin',
      cals: [$calA, $calB],
      includeAll: false,
      selectedIds: ['cal-a'],
      from: new DateTimeImmutable('2025-01-01T00:00:00Z'),
      to: new DateTimeImmutable('2025-01-08T00:00:00Z'),
      maxPerCal: 50,
      maxTotal: 50,
      debug: true,
    );

    $this->assertCount(1, $res['events']);
    $this->assertSame('cal-a', $res['events'][0]['calendar_id']);
    $this->assertFalse($res['truncated']);
    $this->assertCount(1, $res['queryDbg']);
    $this->assertSame('cal-a', $res['queryDbg'][0]['calendar_id']);
  }

  public function testCollectAppliesCapsAndReportsTruncation(): void {
    $manager = new class() implements IManager {
      public array $responses = [];
      public function newQuery(string $principal): object {
        return new class() {
          public string $calendar = '';
          public function addSearchCalendar(string $calendar): void { $this->calendar = $calendar; }
          public function setTimerangeStart($from): void {}
          public function setTimerangeEnd($to): void {}
        };
      }
      public function searchForPrincipal(object $q): array {
        return $this->responses[$q->calendar] ?? [];
      }
    };

    $manager->responses = [
      'cal-a' => array_fill(0, 10, ['id' => 1]),
      'cal-b' => array_fill(0, 10, ['id' => 2]),
    ];

    $calendarService = new class() extends CalendarParsingService {
      public function parseRows(array $raw, string $calendarName, ?string $calendarId = null): array {
        return array_map(
          fn ($row) => ['calendar' => $calendarName, 'calendar_id' => $calendarId, 'hours' => 1, 'allday' => false],
          $raw,
        );
      }
    };

    $logger = $this->createMock(LoggerInterface::class);
    $collector = new OverviewEventsCollector($manager, $calendarService, $logger);

    $calA = new class() {
      public function getUri(): string { return 'cal-a'; }
      public function getDisplayName(): string { return 'A'; }
    };
    $calB = new class() {
      public function getUri(): string { return 'cal-b'; }
      public function getDisplayName(): string { return 'B'; }
    };

    $res = $collector->collect(
      principal: 'principals/users/admin',
      cals: [$calA, $calB],
      includeAll: true,
      selectedIds: [],
      from: new DateTimeImmutable('2025-01-01T00:00:00Z'),
      to: new DateTimeImmutable('2025-01-08T00:00:00Z'),
      maxPerCal: 3,
      maxTotal: 5,
      debug: false,
    );

    $this->assertTrue($res['truncated']);
    $this->assertCount(5, $res['events']);
    $this->assertSame('cal-a', $res['events'][0]['calendar_id']);
    $this->assertSame('cal-b', $res['events'][4]['calendar_id']);
  }
}
