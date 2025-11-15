#!/usr/bin/env php
<?php
declare(strict_types=1);

define('OC_ROOT', dirname(__DIR__, 3));
require_once OC_ROOT . '/config/config.php';
require_once OC_ROOT . '/lib/base.php';

use OCP\Server;
use OCP\IUserManager;
use OCA\Deck\Service\BoardService;
use OCA\Deck\Service\StackService;
use OCA\Deck\Service\CardService;
use OCA\Deck\Service\AssignmentService;
use OCA\Deck\Service\LabelService;
use OCA\Deck\Service\PermissionService;

final class DeckSeedRuntimeError extends \RuntimeException {}

function main(): void {
    if (!class_exists(\OCA\Deck\AppInfo\Application::class)) {
        fwrite(STDERR, "Deck app is not available on this instance. Enable Deck to seed QA boards.\n");
        exit(0);
    }
    if (!\OC_App::isEnabled('deck')) {
        fwrite(STDERR, "Deck app is disabled; skipping Deck board seeding.\n");
        exit(0);
    }
    \OC_App::loadApp('deck');

    $userId = getenv('QA_USER') ?: 'qa';
    $boardTitle = getenv('QA_DECK_BOARD_TITLE') ?: 'Opsdash Deck QA';
    $boardColor = getenv('QA_DECK_BOARD_COLOR') ?: '#2563EB';

    /** @var IUserManager $userManager */
    $userManager = Server::get(IUserManager::class);
    $user = $userManager->get($userId);
    if (!$user) {
        throw new DeckSeedRuntimeError("User \"$userId\" does not exist.");
    }

    /** @var PermissionService $permissionService */
    $permissionService = Server::get(PermissionService::class);
    $permissionService->setUserId($userId);
    /** @var BoardService $boardService */
    $boardService = Server::get(BoardService::class);
    $boardService->setUserId($userId);
    /** @var StackService $stackService */
    $stackService = Server::get(StackService::class);
    /** @var CardService $cardService */
    $cardService = Server::get(CardService::class);
    /** @var AssignmentService $assignmentService */
    $assignmentService = Server::get(AssignmentService::class);
    /** @var LabelService $labelService */
    $labelService = Server::get(LabelService::class);

    $board = findBoardByTitle($boardService, $boardTitle);
    if ($board === null) {
        $board = $boardService->create($boardTitle, $userId, normalizeHex($boardColor));
        echo "Created Deck board \"{$boardTitle}\" for {$userId}\n";
    } else {
        echo "Reusing Deck board #{$board->getId()} \"{$board->getTitle()}\"\n";
        resetBoardStacks($stackService, (int)$board->getId());
        $board = $boardService->find((int)$board->getId(), true);
    }

    $stackPlan = [
        ['title' => 'Inbox', 'order' => 10],
        ['title' => 'In Progress', 'order' => 20],
        ['title' => 'Done', 'order' => 30],
    ];
    $stackMap = seedStacks($stackService, (int)$board->getId(), $stackPlan);

    $labelPlan = [
        ['title' => 'Ops', 'color' => '#F97316'],
        ['title' => 'Blocked', 'color' => '#F43F5E'],
        ['title' => 'Reporting', 'color' => '#0EA5E9'],
    ];
    $labelMap = ensureLabels($labelService, $boardService, (int)$board->getId(), $labelPlan);

    $cardsSeeded = seedCards($cardService, $assignmentService, $stackMap, $labelMap, $userId);
    echo "Seeded {$cardsSeeded} Deck cards for {$userId}\n";
}

/**
 * @param BoardService $boardService
 * @param string $title
 * @return \OCA\Deck\Db\Board|null
 */
function findBoardByTitle(BoardService $boardService, string $title) {
    $boards = $boardService->findAll(0, true);
    foreach ($boards as $board) {
        if (strcasecmp((string)$board->getTitle(), $title) === 0) {
            return $board;
        }
    }
    return null;
}

function normalizeHex(string $color): string {
    $c = trim($color);
    if ($c === '') {
        return '#2563EB';
    }
    if ($c[0] !== '#') {
        return '#' . $c;
    }
    return strtoupper($c);
}

function resetBoardStacks(StackService $stackService, int $boardId): void {
    try {
        $stacks = $stackService->findAll($boardId);
        foreach ($stacks as $stack) {
            $stackService->delete((int)$stack->getId());
        }
    } catch (\Throwable $e) {
        throw new DeckSeedRuntimeError('Failed to reset Deck board: ' . $e->getMessage(), 0, $e);
    }
}

/**
 * @param StackService $stackService
 * @param int $boardId
 * @param array<int, array{title: string, order: int}> $plan
 * @return array<string, int>
 */
function seedStacks(StackService $stackService, int $boardId, array $plan): array {
    $map = [];
    foreach ($plan as $entry) {
        $stack = $stackService->create($entry['title'], $boardId, $entry['order']);
        $map[$entry['title']] = (int)$stack->getId();
    }
    return $map;
}

/**
 * @param LabelService $labelService
 * @param BoardService $boardService
 * @param int $boardId
 * @param array<int, array{title: string, color: string}> $plan
 * @return array<string, int>
 */
function ensureLabels(LabelService $labelService, BoardService $boardService, int $boardId, array $plan): array {
    $board = $boardService->find($boardId, true);
    $existing = [];
    foreach ($board->getLabels() ?? [] as $label) {
        $existing[(string)$label->getTitle()] = (int)$label->getId();
    }
    $map = [];
    foreach ($plan as $entry) {
        $title = $entry['title'];
        if (isset($existing[$title])) {
            $map[$title] = $existing[$title];
            continue;
        }
        $label = $labelService->create($title, ltrim($entry['color'], '#'), $boardId);
        $map[$title] = (int)$label->getId();
    }
    return $map;
}

/**
 * @param CardService $cardService
 * @param AssignmentService $assignmentService
 * @param array<string, int> $stackMap
 * @param array<string, int> $labelMap
 */
function seedCards(
    CardService $cardService,
    AssignmentService $assignmentService,
    array $stackMap,
    array $labelMap,
    string $userId
): int {
    $tz = new \DateTimeZone('UTC');
    $weekStart = new \DateTimeImmutable('monday this week', $tz);
    $weekStart = $weekStart->setTime(9, 0);
    $monthAnchor = (new \DateTimeImmutable('first day of this month', $tz))->setTime(10, 0);

    $entries = [
        [
            'title' => 'Prep Opsdash Deck sync',
            'stack' => 'Inbox',
            'description' => 'Collect blockers and upcoming deliverables.',
            'due' => $weekStart->modify('+1 day'),
            'labels' => ['Ops'],
            'assign' => [$userId],
            'done' => false,
            'archived' => false,
        ],
        [
            'title' => 'Publish Ops report cards',
            'stack' => 'In Progress',
            'description' => 'Assemble summaries for this sprint.',
            'due' => $weekStart->modify('+3 days'),
            'labels' => ['Reporting'],
            'assign' => [$userId],
            'done' => true,
            'archived' => true,
        ],
        [
            'title' => 'Resolve Deck blockers',
            'stack' => 'In Progress',
            'description' => 'Triage cards stuck behind approvals.',
            'due' => $weekStart->modify('+4 days'),
            'labels' => ['Blocked'],
            'assign' => [$userId],
            'done' => false,
            'archived' => false,
        ],
        [
            'title' => 'Plan monthly Ops themes',
            'stack' => 'Inbox',
            'description' => 'Draft next month focus areas.',
            'due' => $monthAnchor->modify('+20 days'),
            'labels' => ['Ops'],
            'assign' => [$userId],
            'done' => false,
            'archived' => false,
        ],
    ];

    $count = 0;
    $order = 1;
    foreach ($entries as $entry) {
        $stackTitle = $entry['stack'];
        if (!isset($stackMap[$stackTitle])) {
            continue;
        }
        $card = $cardService->create(
            $entry['title'],
            $stackMap[$stackTitle],
            'plain',
            $order++,
            $userId,
            $entry['description'],
            ($entry['due'] instanceof \DateTimeImmutable) ? $entry['due']->format('c') : null
        );

        foreach ($entry['labels'] as $labelTitle) {
            if (isset($labelMap[$labelTitle])) {
                try {
                    $cardService->assignLabel((int)$card->getId(), $labelMap[$labelTitle]);
                } catch (\Throwable $e) {
                    fwrite(STDERR, 'Failed to assign label "' . $labelTitle . '": ' . $e->getMessage() . PHP_EOL);
                }
            }
        }

        foreach ($entry['assign'] as $assignee) {
            try {
                $assignmentService->assignUser((int)$card->getId(), $assignee);
            } catch (\Throwable $e) {
                fwrite(STDERR, 'Failed to assign user ' . $assignee . ': ' . $e->getMessage() . PHP_EOL);
            }
        }

        if (!empty($entry['done'])) {
            try {
                $cardService->done((int)$card->getId());
            } catch (\Throwable $e) {
                fwrite(STDERR, 'Failed to mark card as done: ' . $e->getMessage() . PHP_EOL);
            }
        }
        if (!empty($entry['archived'])) {
            try {
                $cardService->archive((int)$card->getId());
            } catch (\Throwable $e) {
                fwrite(STDERR, 'Failed to archive card: ' . $e->getMessage() . PHP_EOL);
            }
        }

        $count++;
    }

    $doneStackId = $stackMap['Done'] ?? null;
    if ($doneStackId) {
        $card = $cardService->create(
            'Archive completed Ops tasks',
            $doneStackId,
            'plain',
            $order + 5,
            $userId,
            'Keeps the board lean with auto-archiving.',
            $weekStart->modify('-1 day')->format('c')
        );
        $cardService->done((int)$card->getId());
        $cardService->archive((int)$card->getId());
        $count++;
    }

    return $count;
}

try {
    main();
} catch (DeckSeedRuntimeError $e) {
    fwrite(STDERR, '[deck seed] ' . $e->getMessage() . PHP_EOL);
    exit(1);
} catch (\Throwable $e) {
    fwrite(STDERR, '[deck seed] Unhandled error: ' . $e->getMessage() . PHP_EOL);
    exit(1);
}
