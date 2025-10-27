<?php

declare(strict_types=1);

namespace OCA\Opsdash\Service\Validation;

class NumberValidator {
  public static function validate(mixed $raw, NumberConstraints $constraints): ValidationResult {
    $issues = [];

    if ($raw === '' || $raw === null) {
      if ($constraints->allowEmpty) {
        return new ValidationResult(null, []);
      }
      $issues[] = ValidationIssue::error('Enter a number', 'number_required');
      return new ValidationResult(null, $issues);
    }

    if (!is_numeric($raw)) {
      $issues[] = ValidationIssue::error('Enter a valid number', 'number_invalid');
      return new ValidationResult(null, $issues);
    }

    $value = (float)$raw;
    $adjusted = false;

    if ($constraints->min !== null && $value < $constraints->min) {
      $value = $constraints->min;
      $adjusted = true;
    }

    if ($constraints->max !== null && $value > $constraints->max) {
      $value = $constraints->max;
      $adjusted = true;
    }

    if ($constraints->step !== null && $constraints->step > 0) {
      $step = $constraints->step;
      $stepped = round($value / $step) * $step;
      if (self::floatsDiffer($stepped, $value)) {
        $value = $stepped;
        $adjusted = true;
      }
    }

    $precision = $constraints->precision ?? self::inferPrecision($constraints->step);
    if ($precision !== null) {
      $next = round($value, $precision);
      if (self::floatsDiffer($next, $value)) {
        $value = $next;
        $adjusted = true;
      }
    }

    if ($adjusted) {
      $issues[] = ValidationIssue::warning(
        self::buildClampMessage($constraints),
        'number_adjusted',
        self::describeConstraints($constraints)
      );
    }

    return new ValidationResult($value, $issues);
  }

  private static function buildClampMessage(NumberConstraints $constraints): string {
    $parts = [];
    if ($constraints->min !== null && $constraints->max !== null) {
      $parts[] = 'Allowed range ' . $constraints->min . ' - ' . $constraints->max;
    } elseif ($constraints->min !== null) {
      $parts[] = 'Minimum ' . $constraints->min;
    } elseif ($constraints->max !== null) {
      $parts[] = 'Maximum ' . $constraints->max;
    }
    if ($constraints->step !== null && $constraints->step > 0) {
      $parts[] = 'step ' . $constraints->step;
    }
    return 'Adjusted to allowed value (' . implode(', ', $parts) . ')';
  }

  /**
   * @return array<string,mixed>
   */
  private static function describeConstraints(NumberConstraints $constraints): array {
    $ctx = [];
    if ($constraints->min !== null) {
      $ctx['min'] = $constraints->min;
    }
    if ($constraints->max !== null) {
      $ctx['max'] = $constraints->max;
    }
    if ($constraints->step !== null && $constraints->step > 0) {
      $ctx['step'] = $constraints->step;
    }
    if ($constraints->precision !== null) {
      $ctx['precision'] = $constraints->precision;
    }
    if ($constraints->allowEmpty) {
      $ctx['allowEmpty'] = true;
    }
    return $ctx;
  }

  private static function inferPrecision(?float $step): ?int {
    if ($step === null || $step <= 0) {
      return null;
    }
    $string = rtrim(rtrim(sprintf('%.10F', $step), '0'), '.');
    if (str_contains($string, '.')) {
      return strlen(substr(strrchr($string, '.'), 1));
    }
    return 0;
  }

  private static function floatsDiffer(float $a, float $b): bool {
    return abs($a - $b) > 1e-9;
  }
}
