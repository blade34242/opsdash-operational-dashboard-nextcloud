<?php

declare(strict_types=1);

namespace OCA\Opsdash\Service\Validation;

class ValidationResult {
  /**
   * @param ValidationIssue[] $issues
   */
  public function __construct(
    private readonly ?float $value,
    private readonly array $issues = [],
  ) {
  }

  public function getValue(): ?float {
    return $this->value;
  }

  /**
   * @return ValidationIssue[]
   */
  public function getIssues(): array {
    return $this->issues;
  }

  public function hasErrors(): bool {
    foreach ($this->issues as $issue) {
      if ($issue->severity === 'error') {
        return true;
      }
    }
    return false;
  }
}

