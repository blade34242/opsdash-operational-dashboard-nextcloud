<?php

declare(strict_types=1);

namespace OCA\Opsdash\Tests;

use PHPUnit\Framework\TestCase;

/**
 * Minimal smoke test to ensure PHPUnit wiring works.
 *
 * Once services are extracted we will replace this with
 * targeted unit tests.
 */
class SmokeTest extends TestCase {
	public function testPhpUnitWiring(): void {
		$this->assertTrue(true);
	}
}
