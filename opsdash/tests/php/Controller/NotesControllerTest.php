<?php

declare(strict_types=1);

namespace OCA\Opsdash\Tests\Controller;

use OCA\Opsdash\Controller\NotesController;
use OCA\Opsdash\Service\NotesService;
use OCP\AppFramework\Http\DataResponse;
use OCP\AppFramework\Http;
use OCP\IRequest;
use OCP\IUser;
use OCP\IUserSession;
use PHPUnit\Framework\TestCase;
use Psr\Log\LoggerInterface;

class NotesControllerTest extends TestCase {
  private IRequest $request;
  private IUserSession $userSession;
  private NotesService $notesService;
  private NotesController $controller;

  protected function setUp(): void {
    parent::setUp();

    $this->request = $this->createMock(IRequest::class);
    $this->request->method('getHeader')->willReturn('token');
    $this->request->method('passesCSRFCheck')->willReturn(true);
    $this->userSession = $this->createMock(IUserSession::class);
    $this->notesService = $this->createMock(NotesService::class);
    $logger = $this->createMock(LoggerInterface::class);

    $this->controller = new NotesController(
      'opsdash',
      $this->request,
      $this->userSession,
      $logger,
      $this->notesService,
    );
  }

  public function testNotesRequiresUser(): void {
    $this->userSession->method('getUser')->willReturn(null);

    $response = $this->controller->notes();
    $this->assertInstanceOf(DataResponse::class, $response);
    $this->assertSame(Http::STATUS_UNAUTHORIZED, $response->getStatus());
  }

  public function testNotesClampsRangeAndOffset(): void {
    $user = $this->createMock(IUser::class);
    $user->method('getUID')->willReturn('admin');
    $this->userSession->method('getUser')->willReturn($user);

    $this->request->method('getParam')->willReturnMap([
      ['range', 'week', 'year'],
      ['offset', 0, 99],
    ]);

    $this->notesService
      ->expects($this->once())
      ->method('getNotes')
      ->with('admin', 'week', 24)
      ->willReturn(['notes' => ['current' => 'ok']]);

    $response = $this->controller->notes();
    $this->assertSame(Http::STATUS_OK, $response->getStatus());
    $this->assertSame(['ok' => true, 'notes' => ['current' => 'ok']], $response->getData());
  }

  public function testNotesSaveRequiresUser(): void {
    $this->userSession->method('getUser')->willReturn(null);

    $response = $this->controller->notesSave();
    $this->assertSame(Http::STATUS_UNAUTHORIZED, $response->getStatus());
  }

  public function testNotesSaveRejectsInvalidJson(): void {
    $user = $this->createMock(IUser::class);
    $user->method('getUID')->willReturn('admin');
    $this->userSession->method('getUser')->willReturn($user);

    $this->controller = new NotesController(
      'opsdash',
      $this->request,
      $this->userSession,
      $this->createMock(LoggerInterface::class),
      $this->notesService,
    );

    $data = $this->controller->notesSave();
    $this->assertSame(Http::STATUS_BAD_REQUEST, $data->getStatus());
    $this->assertSame(['message' => 'invalid json'], $data->getData());
  }
}
