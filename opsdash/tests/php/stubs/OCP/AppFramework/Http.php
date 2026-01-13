<?php

declare(strict_types=1);

namespace OCP\AppFramework;

final class Http {
  public const STATUS_OK = 200;
  public const STATUS_BAD_REQUEST = 400;
  public const STATUS_UNAUTHORIZED = 401;
  public const STATUS_NOT_FOUND = 404;
  public const STATUS_METHOD_NOT_ALLOWED = 405;
  public const STATUS_REQUEST_ENTITY_TOO_LARGE = 413;
  public const STATUS_REQUEST_URI_TOO_LONG = 414;
  public const STATUS_PRECONDITION_FAILED = 412;
  public const STATUS_INTERNAL_SERVER_ERROR = 500;
}
