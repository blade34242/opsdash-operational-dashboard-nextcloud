<?php

declare(strict_types=1);

namespace OCA\Opsdash\Tests\Service;

use OCA\Opsdash\Service\CalendarService;
use OCP\Calendar\IManager;
use OCP\IConfig;
use PHPUnit\Framework\TestCase;
use Psr\Log\LoggerInterface;

final class CalendarServiceTest extends TestCase {
    public function testParseRowsStructuredObjects(): void {
        $calendarManager = $this->createMock(IManager::class);
        $config = $this->createMock(IConfig::class);
        $logger = $this->createMock(LoggerInterface::class);
        $service = new CalendarService($calendarManager, $config, $logger);

        $raw = [
            [
                'objects' => [
                    [
                        'UID' => ['opsdash-work-w1-mon-standup', []],
                        'SUMMARY' => ['Team standup', []],
                        'DTSTART' => [
                            [
                                'date' => '2025-12-15 09:00:00.000000',
                                'timezone_type' => 3,
                                'timezone' => 'UTC',
                            ],
                            [],
                        ],
                        'DTEND' => [
                            [
                                'date' => '2025-12-15 09:30:00.000000',
                                'timezone_type' => 3,
                                'timezone' => 'UTC',
                            ],
                            [],
                        ],
                    ],
                ],
            ],
        ];

        $rows = $service->parseRows($raw, 'opsdash-work', 'opsdash-work');

        $this->assertCount(1, $rows);
        $this->assertSame('Team standup', $rows[0]['title']);
        $this->assertSame('2025-12-15 09:00:00', $rows[0]['start']);
        $this->assertSame('2025-12-15 09:30:00', $rows[0]['end']);
        $this->assertSame(0.5, $rows[0]['hours']);
        $this->assertFalse($rows[0]['allday']);
    }
}
