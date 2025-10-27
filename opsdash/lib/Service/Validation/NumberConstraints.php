<?php

declare(strict_types=1);

namespace OCA\Opsdash\Service\Validation;

class NumberConstraints {
  public function __construct(
    public readonly ?float $min = null,
    public readonly ?float $max = null,
    public readonly ?float $step = null,
    public readonly ?int $precision = null,
    public readonly bool $allowEmpty = false,
  ) {
  }
}

