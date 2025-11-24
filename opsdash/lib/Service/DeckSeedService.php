<?php
declare(strict_types=1);

namespace OCA\Opsdash\Service;

use DateTimeImmutable;
use DateTimeZone;
use OCP\IUserManager;
use OCP\Server;

class DeckSeedException extends \RuntimeException {}

class DeckSeedService {
    public function __construct(
        private IUserManager $userManager,
    ) {
    }

    /**
     * @param array{
     *   userId?: string,
     *   boardTitle?: string,
     *   boardColor?: string,
     *   resetStacks?: bool
     * } $options
     */
    public function seed(array $options = []): array {
        $userId = isset($options['userId']) ? (string)$options['userId'] : 'qa';
        $boardTitle = isset($options['boardTitle']) ? (string)$options['boardTitle'] : 'Opsdash Deck QA';
        $boardColor = isset($options['boardColor']) ? (string)$options['boardColor'] : '#2563EB';
        $resetStacks = array_key_exists('resetStacks', $options) ? (bool)$options['resetStacks'] : true;
        $otherUserId = isset($options['otherUserId']) ? (string)$options['otherUserId'] : (getenv('QA_OTHER_USER') ?: 'admin');

        $user = $this->userManager->get($userId);
        if (!$user) {
            throw new DeckSeedException("User \"{$userId}\" does not exist.");
        }

        // Ensure Deck sees a logged-in user for activity entries.
        try {
            $userSession = \OC::$server->getUserSession();
            if ($userSession && method_exists($userSession, 'setUser')) {
                $userSession->setUser($user);
            }
        } catch (\Throwable $e) {
            // Non-fatal: continue if session binding fails
        }

        $this->ensureDeckAvailable();

        /** @var \OCA\Deck\Service\PermissionService $permissionService */
        $permissionService = Server::get('OCA\\Deck\\Service\\PermissionService');
        $permissionService->setUserId($userId);
        /** @var \OCA\Deck\Service\BoardService $boardService */
        $boardService = Server::get('OCA\\Deck\\Service\\BoardService');
        $boardService->setUserId($userId);
        /** @var \OCA\Deck\Service\StackService $stackService */
        $stackService = Server::get('OCA\\Deck\\Service\\StackService');
        /** @var \OCA\Deck\Service\CardService $cardService */
        $cardService = Server::get('OCA\\Deck\\Service\\CardService');
        /** @var \OCA\Deck\Service\AssignmentService $assignmentService */
        $assignmentService = Server::get('OCA\\Deck\\Service\\AssignmentService');
        /** @var \OCA\Deck\Service\LabelService $labelService */
        $labelService = Server::get('OCA\\Deck\\Service\\LabelService');

        $otherUser = $this->userManager->get($otherUserId);

        $board = $this->findBoardByTitle($boardService, $boardTitle);
        $created = false;
        if ($board === null) {
            $board = $boardService->create($boardTitle, $userId, $this->normalizeHex($boardColor));
            $created = true;
        } elseif ($resetStacks) {
            $this->resetBoardStacks($stackService, (int)$board->getId());
            $board = $boardService->find((int)$board->getId(), true);
        } else {
            $board = $boardService->find((int)$board->getId(), true);
        }

        if (!$board) {
            throw new DeckSeedException('Unable to create or load Deck board.');
        }

        $stackPlan = [
            ['title' => 'Inbox', 'order' => 10],
            ['title' => 'In Progress', 'order' => 20],
            ['title' => 'Done', 'order' => 30],
        ];
        $stackMap = $this->seedStacks($stackService, (int)$board->getId(), $stackPlan);

        $labelPlan = [
            ['title' => 'Ops', 'color' => '#F97316'],
            ['title' => 'Blocked', 'color' => '#F43F5E'],
            ['title' => 'Reporting', 'color' => '#0EA5E9'],
        ];
        $labelMap = $this->ensureLabels($labelService, $boardService, (int)$board->getId(), $labelPlan);

        $cardsSeeded = $this->seedCards(
            $cardService,
            $assignmentService,
            $stackMap,
            $labelMap,
            $userId,
            $otherUser ? (string)$otherUser->getUID() : null
        );

        return [
            'boardId' => (int)$board->getId(),
            'boardTitle' => (string)$board->getTitle(),
            'created' => $created,
            'stacks' => array_keys($stackMap),
            'labels' => array_keys($labelMap),
            'cardsSeeded' => $cardsSeeded,
        ];
    }

    private function ensureDeckAvailable(): void {
        if (!class_exists('OCA\\Deck\\AppInfo\\Application')) {
            throw new DeckSeedException('Deck app is not installed. Enable Deck before seeding.');
        }
        $appManager = \OC::$server->getAppManager();
        if (!$appManager->isInstalled('deck') || !$appManager->isEnabledForUser('deck')) {
            throw new DeckSeedException('Deck app is disabled. Enable Deck before seeding.');
        }
        $appManager->loadApp('deck');
    }

    /**
     * @param \OCA\Deck\Service\BoardService $boardService
     * @param string $title
     * @return \OCA\Deck\Db\Board|null
     */
    private function findBoardByTitle($boardService, string $title) {
        $boards = $boardService->findAll(0, true);
        foreach ($boards as $board) {
            if (strcasecmp((string)$board->getTitle(), $title) === 0) {
                return $board;
            }
        }
        return null;
    }

    private function normalizeHex(string $color): string {
        $c = ltrim(trim($color), '#');
        if ($c === '') {
            return '2563EB';
        }
        // Deck expects 6-char hex without leading '#'
        return strtoupper(substr($c, 0, 6));
    }

    private function resetBoardStacks($stackService, int $boardId): void {
        try {
            $stacks = $stackService->findAll($boardId);
            foreach ($stacks as $stack) {
                $stackService->delete((int)$stack->getId());
            }
        } catch (\Throwable $e) {
            throw new DeckSeedException('Failed to reset Deck board stacks: ' . $e->getMessage(), 0, $e);
        }
    }

    /**
     * @param \OCA\Deck\Service\StackService $stackService
     * @param int $boardId
     * @param array<int, array{title: string, order: int}> $plan
     * @return array<string, int>
     */
    private function seedStacks($stackService, int $boardId, array $plan): array {
        $map = [];
        foreach ($plan as $entry) {
            $stack = $stackService->create($entry['title'], $boardId, $entry['order']);
            $map[$entry['title']] = (int)$stack->getId();
        }
        return $map;
    }

    /**
     * @param \OCA\Deck\Service\LabelService $labelService
     * @param \OCA\Deck\Service\BoardService $boardService
     * @param int $boardId
     * @param array<int, array{title: string, color: string}> $plan
     * @return array<string, int>
     */
    private function ensureLabels($labelService, $boardService, int $boardId, array $plan): array {
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
     * @param array<string, int> $stackMap
     * @param array<string, int> $labelMap
     */
    private function seedCards($cardService, $assignmentService, array $stackMap, array $labelMap, string $userId, ?string $otherUserId): int {
        $tz = new DateTimeZone('UTC');
        $weekStart = (new DateTimeImmutable('monday this week', $tz))->setTime(9, 0);
        $monthAnchor = (new DateTimeImmutable('first day of this month', $tz))->setTime(10, 0);

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
                'title' => 'Resolve Deck blockers',
                'stack' => 'Inbox',
                'description' => 'Triage cards stuck behind approvals.',
                'due' => $weekStart->modify('+3 days'),
                'labels' => ['Blocked'],
                'assign' => [$otherUserId ?: $userId],
                'done' => false,
                'archived' => false,
            ],
            [
                'title' => 'QA follow-ups',
                'stack' => 'Inbox',
                'description' => 'Follow up on sprint QA items.',
                'due' => $weekStart->modify('+2 days'),
                'labels' => ['Ops'],
                'assign' => [$userId],
                'done' => false,
                'archived' => false,
            ],
            [
                'title' => 'Publish Ops report cards',
                'stack' => 'Done',
                'description' => 'Assemble summaries for this sprint.',
                'due' => $weekStart->modify('+3 days'),
                'labels' => ['Reporting'],
                'assign' => [$userId],
                'done' => true,
                'archived' => false,
            ],
            [
                'title' => 'Archive completed Ops tasks',
                'stack' => 'Done',
                'description' => 'Keeps the board lean with auto-archiving.',
                'due' => $weekStart->modify('-1 day'),
                'labels' => [],
                'assign' => [$otherUserId ?: $userId],
                'done' => true,
                'archived' => true,
            ],
            [
                'title' => 'Retro Deck automation',
                'stack' => 'Done',
                'description' => 'Document learnings from automation spike.',
                'due' => $weekStart->modify('+1 day'),
                'labels' => ['Ops'],
                'assign' => [$userId],
                'done' => true,
                'archived' => false,
            ],
            [
                'title' => 'Cleanup stale labels',
                'stack' => 'Done',
                'description' => 'Reduce label noise before next sprint.',
                'due' => $weekStart->modify('+2 days'),
                'labels' => ['Reporting'],
                'assign' => [$otherUserId ?: $userId],
                'done' => true,
                'archived' => false,
            ],
            [
                'title' => 'Triage Deck bugs',
                'stack' => 'In Progress',
                'description' => 'Sweep new Deck bugs and assign owners.',
                'due' => $weekStart->modify('+4 days'),
                'labels' => ['Blocked'],
                'assign' => [$otherUserId ?: $userId],
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
                ($entry['due'] instanceof DateTimeImmutable) ? $entry['due']->format('c') : null
            );

            foreach ($entry['labels'] as $labelTitle) {
                if (!isset($labelMap[$labelTitle])) {
                    continue;
                }
                try {
                    $cardService->assignLabel((int)$card->getId(), $labelMap[$labelTitle]);
                } catch (\Throwable $e) {
                    // continue even if label assignment fails
                }
            }

            foreach ($entry['assign'] as $assignee) {
                if (!$assignee) {
                    continue;
                }
                try {
                    $assignmentService->assignUser((int)$card->getId(), $assignee);
                } catch (\Throwable $e) {
                    // continue
                }
            }

            if (!empty($entry['done'])) {
                try {
                    $cardService->done((int)$card->getId());
                } catch (\Throwable $e) {
                    // ignore
                }
            }
            if (!empty($entry['archived'])) {
                try {
                    $cardService->archive((int)$card->getId());
                } catch (\Throwable $e) {
                    // ignore
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
}
