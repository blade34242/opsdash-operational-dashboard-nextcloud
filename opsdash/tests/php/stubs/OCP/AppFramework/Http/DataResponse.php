<?php

declare(strict_types=1);

namespace OCP\AppFramework\Http;

class DataResponse {
  public function __construct(
    private array $data = [],
    private int $statusCode = 200,
  ) {
  }

  public function getData(): array {
    return $this->data;
  }

  public function getStatus(): int {
    return $this->statusCode;
  }
}
