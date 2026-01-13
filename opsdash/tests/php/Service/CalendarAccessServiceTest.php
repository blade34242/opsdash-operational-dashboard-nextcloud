<?php

declare(strict_types=1);

namespace OCA\Opsdash\Tests\Service;

use OCA\Opsdash\Service\CalendarAccessService;
use OCP\Calendar\IManager;
use OCP\IConfig;
use PHPUnit\Framework\TestCase;
use Psr\Log\LoggerInterface;

final class CalendarAccessServiceTest extends TestCase {
  public function testGetCalendarsForPrefersPrincipalMethod(): void {
    $manager = new class implements IManager {
      public array $calls = [];

      public function getCalendarsForPrincipal(string $principal): array {
        $this->calls[] = $principal;
        return [new CalendarStub('cal-1')];
      }

      public function getCalendarsForUser(string $uid): array {
        $this->calls[] = 'user:' . $uid;
        return [new CalendarStub('cal-2')];
      }

      public function getCalendars(string $uid): array {
        $this->calls[] = 'legacy:' . $uid;
        return [new CalendarStub('cal-3')];
      }
    };

    $config = new ConfigStub();
    $logger = $this->createMock(LoggerInterface::class);
    $service = new CalendarAccessService($manager, $config, $logger);

    $cals = $service->getCalendarsFor('alice');
    $this->assertCount(1, $cals);
    $this->assertSame('principals/users/alice', $manager->calls[0]);
  }

  public function testGetCalendarsForFallsBackToUserMethod(): void {
    $manager = new class implements IManager {
      public array $calls = [];

      public function getCalendarsForUser(string $uid): array {
        $this->calls[] = $uid;
        return [new CalendarStub('cal-2')];
      }
    };

    $config = new ConfigStub();
    $logger = $this->createMock(LoggerInterface::class);
    $service = new CalendarAccessService($manager, $config, $logger);

    $cals = $service->getCalendarsFor('alice');
    $this->assertCount(1, $cals);
    $this->assertSame('alice', $manager->calls[0]);
  }

  public function testGetCalendarIdsForFallsBackToObjectId(): void {
    $manager = new class implements IManager {
      public function getCalendarsForUser(string $uid): array {
        return [new CalendarStub('cal-1'), new CalendarStub(null)];
      }
    };

    $config = new ConfigStub();
    $logger = $this->createMock(LoggerInterface::class);
    $service = new CalendarAccessService($manager, $config, $logger);

    $ids = $service->getCalendarIdsFor('alice');
    $this->assertCount(2, $ids);
    $this->assertSame('cal-1', $ids[0]);
    $this->assertNotSame('', $ids[1]);
    $this->assertNotSame('cal-1', $ids[1]);
  }

  public function testResolveUserTimezoneFallsBackToUtc(): void {
    $config = new ConfigStub();
    $config->userValues['core/timezone'] = 'Invalid/Zone';
    $logger = $this->createMock(LoggerInterface::class);
    $service = new CalendarAccessService($this->createMock(IManager::class), $config, $logger);

    $tz = $service->resolveUserTimezone('alice');
    $this->assertSame('UTC', $tz->getName());
  }

  public function testResolveUserWeekStartNormalizesUserValue(): void {
    $config = new ConfigStub();
    $config->userValues['core/firstday'] = '8';
    $logger = $this->createMock(LoggerInterface::class);
    $service = new CalendarAccessService($this->createMock(IManager::class), $config, $logger);

    $weekStart = $service->resolveUserWeekStart('alice');
    $this->assertSame(1, $weekStart);
  }

  public function testResolveUserWeekStartFallsBackToSystemValue(): void {
    $config = new ConfigStub();
    $config->systemValues['firstday'] = 0;
    $logger = $this->createMock(LoggerInterface::class);
    $service = new CalendarAccessService($this->createMock(IManager::class), $config, $logger);

    $weekStart = $service->resolveUserWeekStart('alice');
    $this->assertSame(0, $weekStart);
  }

  public function testRangeBoundsHonorsWeekStart(): void {
    $config = new ConfigStub();
    $logger = $this->createMock(LoggerInterface::class);
    $service = new CalendarAccessService($this->createMock(IManager::class), $config, $logger);

    [$start, $end] = $service->rangeBounds('week', 0, new \DateTimeZone('UTC'), 0);
    $this->assertSame('0', $start->format('w'));
    $this->assertSame('23:59:59', $end->format('H:i:s'));
    $this->assertSame($start->modify('+6 day')->format('Y-m-d'), $end->format('Y-m-d'));
  }

  public function testRangeBoundsMonthStartsOnFirstDay(): void {
    $config = new ConfigStub();
    $logger = $this->createMock(LoggerInterface::class);
    $service = new CalendarAccessService($this->createMock(IManager::class), $config, $logger);

    [$start, $end] = $service->rangeBounds('month', 0, new \DateTimeZone('UTC'), 1);
    $this->assertSame('01', $start->format('d'));
    $this->assertSame($start->modify('last day of this month')->format('Y-m-d'), $end->format('Y-m-d'));
  }

  public function testNotesKeyUsesRangePrefix(): void {
    $config = new ConfigStub();
    $logger = $this->createMock(LoggerInterface::class);
    $service = new CalendarAccessService($this->createMock(IManager::class), $config, $logger);
    $from = new \DateTimeImmutable('2024-01-02');

    $this->assertSame('notes_week_2024-01-02', $service->notesKey('week', $from));
    $this->assertSame('notes_month_2024-01-02', $service->notesKey('month', $from));
  }
}

final class CalendarStub {
  public function __construct(
    private ?string $uri,
  ) {}

  public function getUri(): ?string {
    return $this->uri;
  }

  public function getDisplayName(): string {
    return $this->uri ?? '';
  }
}

final class ConfigStub implements IConfig {
  /** @var array<string,string> */
  public array $appValues = [];
  /** @var array<string,string> */
  public array $userValues = [];
  /** @var array<string,mixed> */
  public array $systemValues = [];

  public function getAppValue(string $appName, string $key, string $default = ''): string {
    return $this->appValues[$appName . '/' . $key] ?? $default;
  }

  public function getUserValue(string $userId, string $appName, string $key, string $default = ''): string {
    return $this->userValues[$appName . '/' . $key] ?? $default;
  }

  public function setUserValue(string $userId, string $appName, string $key, string $value): void {
    $this->userValues[$appName . '/' . $key] = $value;
  }

  public function getSystemValue(string $key, $default = null): mixed {
    return $this->systemValues[$key] ?? $default;
  }
}
