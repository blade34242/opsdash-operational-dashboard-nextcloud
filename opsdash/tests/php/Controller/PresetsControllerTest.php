<?php

declare(strict_types=1);

namespace OCA\Opsdash\Tests\Controller;

use OCA\Opsdash\Controller\PresetsController;
use OCA\Opsdash\Service\CalendarService;
use OCA\Opsdash\Service\PersistSanitizer;
use OCA\Opsdash\Service\UserPresetsService;
use OCP\IConfig;
use OCP\IRequest;
use OCP\IUserSession;
use PHPUnit\Framework\TestCase;
use Psr\Log\LoggerInterface;

class PresetsControllerTest extends TestCase {
  private PresetsController $controller;

  protected function setUp(): void {
    parent::setUp();

    $logger = $this->createMock(LoggerInterface::class);
    $userPresetsService = new UserPresetsService(
      $this->createMock(IConfig::class),
      $logger,
    );

    $this->controller = new PresetsController(
      'opsdash',
      $this->createMock(IRequest::class),
      $this->createMock(IUserSession::class),
      $logger,
      $this->createMock(CalendarService::class),
      new PersistSanitizer(),
      $userPresetsService,
    );
  }

  public function testPresetExportFixtureSanitisesWithoutWarnings(): void {
    $fixturePath = dirname(__DIR__, 3) . '/test/fixtures/preset-export.json';
    $fixture = json_decode((string)file_get_contents($fixturePath), true, 512, JSON_THROW_ON_ERROR);
    $payload = is_array($fixture['payload'] ?? null) ? $fixture['payload'] : [];

    $data = [
      'selected' => $payload['cals'] ?? [],
      'groups' => $payload['groups'] ?? [],
      'targets_week' => $payload['targets_week'] ?? [],
      'targets_month' => $payload['targets_month'] ?? [],
      'targets_config' => $payload['targets_config'] ?? [],
    ];

    $allowedIds = ['personal', 'opsdash-focus'];
    $allowedSet = array_flip($allowedIds);

    $method = new \ReflectionMethod(PresetsController::class, 'sanitizePresetPayload');
    $method->setAccessible(true);

    /** @var array{payload:array<string,mixed>,warnings:string[]} $result */
    $result = $method->invoke($this->controller, $data, $allowedSet, $allowedIds);

    $this->assertSame([], $result['warnings']);
    $this->assertSame($allowedIds, $result['payload']['selected']);
    $this->assertSame(['personal' => 0, 'opsdash-focus' => 1], $result['payload']['groups']);
    $this->assertSame(['personal' => 12.0, 'opsdash-focus' => 8.0], $result['payload']['targets_week']);
    $this->assertSame(['personal' => 48.0, 'opsdash-focus' => 32.0], $result['payload']['targets_month']);
    $this->assertIsArray($result['payload']['targets_config']);
  }

  public function testSanitizePresetPayloadRemovesUnknownCalendarsAndWarns(): void {
    $data = [
      'selected' => ['personal', 'unknown', 'personal', 'opsdash-focus'],
      'groups' => [
        'personal' => 0,
        'unknown' => 99,
      ],
      'targets_week' => [
        'unknown' => 5,
        'opsdash-focus' => 8,
      ],
      'targets_month' => [
        'personal' => 12,
        'unknown' => 77,
      ],
      'targets_config' => [
        'totalHours' => 20,
        'categories' => [
          ['id' => 'focus', 'label' => 'Focus', 'targetHours' => 12, 'includeWeekend' => false, 'paceMode' => 'days_only'],
        ],
      ],
    ];

    $allowedIds = ['personal', 'opsdash-focus'];
    $allowedSet = array_flip($allowedIds);

    $method = new \ReflectionMethod(PresetsController::class, 'sanitizePresetPayload');
    $method->setAccessible(true);

    /** @var array{payload:array<string,mixed>,warnings:string[]} $result */
    $result = $method->invoke($this->controller, $data, $allowedSet, $allowedIds);

    $this->assertNotEmpty($result['warnings']);
    $this->assertStringContainsString('Skipped unknown calendars', implode(' | ', $result['warnings']));
    $this->assertStringContainsString('Removed calendar mappings for unknown calendars', implode(' | ', $result['warnings']));
    $this->assertStringContainsString('Removed weekly targets for unknown calendars', implode(' | ', $result['warnings']));
    $this->assertStringContainsString('Removed monthly targets for unknown calendars', implode(' | ', $result['warnings']));

    $this->assertSame($allowedIds, $result['payload']['selected']);
    $this->assertArrayNotHasKey('unknown', $result['payload']['groups']);
    $this->assertArrayNotHasKey('unknown', $result['payload']['targets_week']);
    $this->assertArrayNotHasKey('unknown', $result['payload']['targets_month']);
  }

  public function testTrimPresetsKeepsMostRecent(): void {
    $method = new \ReflectionMethod(PresetsController::class, 'trimPresets');
    $method->setAccessible(true);

    $presets = [];
    for ($i = 0; $i < 25; $i++) {
      $presets['preset-' . $i] = [
        'updated_at' => sprintf('2025-01-%02dT00:00:00Z', $i + 1),
      ];
    }

    /** @var array<string,array<string,mixed>> $trimmed */
    $trimmed = $method->invoke($this->controller, $presets);

    $this->assertCount(20, $trimmed);
    $this->assertArrayHasKey('preset-24', $trimmed);
    $this->assertArrayHasKey('preset-5', $trimmed);
    $this->assertArrayNotHasKey('preset-0', $trimmed);
  }
}
