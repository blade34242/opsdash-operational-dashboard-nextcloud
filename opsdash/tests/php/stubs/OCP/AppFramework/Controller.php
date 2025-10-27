<?php

declare(strict_types=1);

namespace OCP\AppFramework;

abstract class Controller {
  public function __construct(
    protected string $appName,
    protected $request,
  ) {
  }
}

