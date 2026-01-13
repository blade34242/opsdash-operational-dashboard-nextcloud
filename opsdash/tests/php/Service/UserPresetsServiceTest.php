<?php

declare(strict_types=1);

namespace OCA\Opsdash\Tests\Service;

use OCA\Opsdash\Service\UserPresetsService;
use OCP\IConfig;
use PHPUnit\Framework\TestCase;
use Psr\Log\LoggerInterface;

class UserPresetsServiceTest extends TestCase {
  public function testWriteRejectsOversizedPayload(): void {
    $config = $this->createMock(IConfig::class);
    $logger = $this->createMock(LoggerInterface::class);
    $service = new UserPresetsService($config, $logger);

    $presets = [
      'huge' => [
        'updated_at' => '2025-01-01T00:00:00Z',
        'payload' => [
          'notes' => str_repeat('x', 70000),
        ],
      ],
    ];

    $this->expectException(\LengthException::class);
    $service->write('opsdash', 'targets_presets', 'user-1', $presets);
  }
}
