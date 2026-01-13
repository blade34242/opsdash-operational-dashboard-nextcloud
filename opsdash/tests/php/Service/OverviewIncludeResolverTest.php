<?php

declare(strict_types=1);

namespace OCA\Opsdash\Tests\Service;

use OCA\Opsdash\Service\OverviewIncludeResolver;
use PHPUnit\Framework\TestCase;

final class OverviewIncludeResolverTest extends TestCase {
  public function testResolveExpandsCoreInclude(): void {
    $resolver = new OverviewIncludeResolver();
    $result = $resolver->resolve(['core']);

    $this->assertArrayHasKey('core', $result);
    $this->assertArrayHasKey('calendars', $result);
    $this->assertArrayHasKey('userSettings', $result);
    $this->assertArrayHasKey('targetsConfig', $result);
  }

  public function testResolveExpandsDataInclude(): void {
    $resolver = new OverviewIncludeResolver();
    $result = $resolver->resolve(['data']);

    $this->assertArrayHasKey('data', $result);
    $this->assertArrayHasKey('stats', $result);
    $this->assertArrayHasKey('charts', $result);
  }

  public function testNormalizeForCacheDropsUnknownKeys(): void {
    $resolver = new OverviewIncludeResolver();
    $resolved = $resolver->resolve(['data', 'debug', 'unknown']);
    $normalized = $resolver->normalizeForCache($resolved, 'data');

    $this->assertArrayHasKey('data', $normalized);
    $this->assertArrayNotHasKey('debug', $normalized);
    $this->assertArrayNotHasKey('unknown', $normalized);
  }
}
