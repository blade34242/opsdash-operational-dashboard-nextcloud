<?php

declare(strict_types=1);

namespace OCA\Opsdash\Tests\Validation;

use OCA\Opsdash\Service\Validation\NumberConstraints;
use OCA\Opsdash\Service\Validation\NumberValidator;
use PHPUnit\Framework\TestCase;

class NumberValidatorTest extends TestCase {
  public function testClampsToRangeAndWarns(): void {
    $constraints = new NumberConstraints(0.0, 10.0);
    $result = NumberValidator::validate(-5, $constraints);

    $this->assertSame(0.0, $result->getValue());
    $this->assertFalse($result->hasErrors());
    $this->assertCount(1, $result->getIssues());
    $this->assertSame('warning', $result->getIssues()[0]->severity);
  }

  public function testRejectsInvalidValues(): void {
    $constraints = new NumberConstraints(0.0, 10.0);
    $result = NumberValidator::validate('oops', $constraints);

    $this->assertNull($result->getValue());
    $this->assertTrue($result->hasErrors());
  }

  public function testAllowsEmptyWhenConfigured(): void {
    $constraints = new NumberConstraints(0.0, 10.0, null, null, true);
    $result = NumberValidator::validate('', $constraints);

    $this->assertNull($result->getValue());
    $this->assertFalse($result->hasErrors());
  }

  public function testRoundsUsingStep(): void {
    $constraints = new NumberConstraints(0.0, 10.0, 0.25);
    $result = NumberValidator::validate(2.37, $constraints);

    $this->assertSame(2.25, $result->getValue());
    $this->assertFalse($result->hasErrors());
    $this->assertNotEmpty($result->getIssues());
    $this->assertSame('warning', $result->getIssues()[0]->severity);
  }
}
