<?php

declare(strict_types=1);

namespace OCA\Opsdash\Tests\Controller;

use OCA\Opsdash\Controller\RequestGuardTrait;
use OCP\AppFramework\Http;
use OCP\AppFramework\Http\DataResponse;
use PHPUnit\Framework\TestCase;

final class RequestGuardTraitTest extends TestCase {
  private RequestGuardHarness $harness;
  private string|int|null $previousQueryString;

  protected function setUp(): void {
    parent::setUp();
    $this->harness = new RequestGuardHarness();
    $this->previousQueryString = $_SERVER['QUERY_STRING'] ?? null;
  }

  protected function tearDown(): void {
    if ($this->previousQueryString === null) {
      unset($_SERVER['QUERY_STRING']);
    } else {
      $_SERVER['QUERY_STRING'] = $this->previousQueryString;
    }
    parent::tearDown();
  }

  public function testEnforceQueryLengthAllowsSmallQuery(): void {
    $_SERVER['QUERY_STRING'] = 'include=core';
    $response = $this->harness->enforce(64);
    $this->assertNull($response);
  }

  public function testEnforceQueryLengthBlocksLargeQuery(): void {
    $_SERVER['QUERY_STRING'] = str_repeat('a', 32);
    $response = $this->harness->enforce(8);
    $this->assertInstanceOf(DataResponse::class, $response);
    $this->assertSame(Http::STATUS_REQUEST_URI_TOO_LONG, $response->getStatus());
    $this->assertSame(['message' => 'query too large'], $response->getData());
  }

  public function testReadJsonBodyRejectsOversizePayload(): void {
    $this->harness->setRawBody(str_repeat('a', 10));
    $response = $this->harness->readBody(5, 16);
    $this->assertInstanceOf(DataResponse::class, $response);
    $this->assertSame(Http::STATUS_REQUEST_ENTITY_TOO_LARGE, $response->getStatus());
    $this->assertSame(['message' => 'payload too large'], $response->getData());
  }

  public function testReadJsonBodyRejectsInvalidJson(): void {
    $this->harness->setRawBody('not-json');
    $response = $this->harness->readBody(64, 16);
    $this->assertInstanceOf(DataResponse::class, $response);
    $this->assertSame(Http::STATUS_BAD_REQUEST, $response->getStatus());
    $this->assertSame(['message' => 'invalid json'], $response->getData());
  }

  public function testReadJsonBodyAcceptsValidJson(): void {
    $this->harness->setRawBody('{"range":"week","offset":1}');
    $response = $this->harness->readBody(64, 16);
    $this->assertIsArray($response);
    $this->assertSame(['range' => 'week', 'offset' => 1], $response);
  }

  public function testReadJsonBodyRejectsTooDeepJson(): void {
    $this->harness->setRawBody('{"a":{"b":{"c":1}}}');
    $response = $this->harness->readBody(128, 2);
    $this->assertInstanceOf(DataResponse::class, $response);
    $this->assertSame(Http::STATUS_BAD_REQUEST, $response->getStatus());
    $this->assertSame(['message' => 'invalid json'], $response->getData());
  }

  public function testReadJsonBodyRejectsScalarJson(): void {
    $this->harness->setRawBody('"ok"');
    $response = $this->harness->readBody(32, 16);
    $this->assertInstanceOf(DataResponse::class, $response);
    $this->assertSame(Http::STATUS_BAD_REQUEST, $response->getStatus());
    $this->assertSame(['message' => 'invalid json'], $response->getData());
  }
}

final class RequestGuardHarness {
  use RequestGuardTrait;
  private string $rawBody = '';

  public function enforce(int $maxBytes): ?DataResponse {
    return $this->enforceQueryLength($maxBytes);
  }

  public function readBody(int $maxBytes, int $maxDepth): array|DataResponse {
    return $this->readJsonBody($maxBytes, $maxDepth);
  }

  public function setRawBody(string $rawBody): void {
    $this->rawBody = $rawBody;
  }

  protected function readRawBody(): string {
    return $this->rawBody;
  }
}
