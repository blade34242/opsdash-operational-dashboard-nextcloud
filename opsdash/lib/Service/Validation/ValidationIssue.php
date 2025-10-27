<?php

declare(strict_types=1);

namespace OCA\Opsdash\Service\Validation;

class ValidationIssue {
  /**
   * @param array<string,mixed> $context
   */
  public function __construct(
    public readonly string $severity,
    public readonly string $message,
    public readonly ?string $code = null,
    public readonly array $context = [],
  ) {
  }

  /**
   * @param array<string,mixed> $context
   */
  public static function error(string $message, ?string $code = null, array $context = []): self {
    return new self('error', $message, $code, $context);
  }

  /**
   * @param array<string,mixed> $context
   */
  public static function warning(string $message, ?string $code = null, array $context = []): self {
    return new self('warning', $message, $code, $context);
  }
}
