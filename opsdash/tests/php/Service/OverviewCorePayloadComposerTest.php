<?php

declare(strict_types=1);

namespace OCA\Opsdash\Tests\Service;

use OCA\Opsdash\Service\OverviewCorePayloadComposer;
use PHPUnit\Framework\TestCase;

final class OverviewCorePayloadComposerTest extends TestCase {
  private function baseContext(): array {
    return [
      'includeAll' => false,
      'includes' => [],
      'userSettings' => ['timezone' => 'UTC'],
      'calendars' => [['id' => 'cal-1']],
      'selected' => ['cal-1'],
      'colorsById' => ['cal-1' => '#112233'],
      'colorsByName' => ['Personal' => '#112233'],
      'groupsById' => ['cal-1' => 0],
      'targetsWeek' => ['cal-1' => 12],
      'targetsMonth' => ['cal-1' => 48],
      'targetsConfig' => ['totalHours' => 48],
      'themePreference' => 'dark',
      'reportingConfig' => ['enabled' => false],
      'deckSettings' => ['defaultFilter' => 'mine'],
      'widgets' => [['id' => 'time_summary']],
      'onboarding' => ['completed' => false],
    ];
  }

  public function testComposeIncludesOnlyRequestedKeys(): void {
    $composer = new OverviewCorePayloadComposer();
    $context = $this->baseContext();
    $context['includes'] = ['calendars' => true, 'themePreference' => true];

    $payload = $composer->compose($context);
    $this->assertSame(['calendars', 'themePreference'], array_keys($payload));
    $this->assertSame([['id' => 'cal-1']], $payload['calendars']);
    $this->assertSame('dark', $payload['themePreference']);
  }

  public function testComposeIncludesAllWithCore(): void {
    $composer = new OverviewCorePayloadComposer();
    $context = $this->baseContext();
    $context['includes'] = ['core' => true];

    $payload = $composer->compose($context);
    $this->assertArrayHasKey('userSettings', $payload);
    $this->assertArrayHasKey('calendars', $payload);
    $this->assertArrayHasKey('selected', $payload);
    $this->assertArrayHasKey('colors', $payload);
    $this->assertArrayHasKey('groups', $payload);
    $this->assertArrayHasKey('targets', $payload);
    $this->assertArrayHasKey('targetsConfig', $payload);
    $this->assertArrayHasKey('themePreference', $payload);
    $this->assertArrayHasKey('reportingConfig', $payload);
    $this->assertArrayHasKey('deckSettings', $payload);
    $this->assertArrayHasKey('widgets', $payload);
    $this->assertArrayHasKey('onboarding', $payload);
  }

  public function testComposeIncludesAllWhenIncludeAll(): void {
    $composer = new OverviewCorePayloadComposer();
    $context = $this->baseContext();
    $context['includeAll'] = true;

    $payload = $composer->compose($context);
    $this->assertArrayHasKey('userSettings', $payload);
    $this->assertArrayHasKey('calendars', $payload);
    $this->assertArrayHasKey('selected', $payload);
  }
}
