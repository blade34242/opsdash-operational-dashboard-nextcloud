<?php
declare(strict_types=1);

namespace OCA\Opsdash\Command;

use OCA\Opsdash\Service\CalendarAccessService;
use OCA\Opsdash\Service\OverviewAggregationService;
use OCA\Opsdash\Service\OverviewEventsCollector;
use OCA\Opsdash\Service\OverviewSelectionService;
use OCA\Opsdash\Service\PersistSanitizer;
use OCA\Opsdash\Service\UserConfigService;
use OCP\IConfig;
use OCP\IUserManager;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Input\InputOption;
use Symfony\Component\Console\Output\OutputInterface;

class ReportCommand extends Command {
    private const MAX_OFFSET = 24;
    private const MAX_GROUP = 9;
    private const MAX_AGG_PER_CAL = 2000;
    private const MAX_AGG_TOTAL = 5000;

    protected static $defaultName = 'opsdash:report';

    public function __construct(
        private CalendarAccessService $calendarAccess,
        private OverviewEventsCollector $eventsCollector,
        private OverviewAggregationService $aggregationService,
        private OverviewSelectionService $selectionService,
        private UserConfigService $userConfigService,
        private PersistSanitizer $persistSanitizer,
        private IConfig $config,
        private IUserManager $userManager,
    ) {
        parent::__construct();
    }

    protected function configure(): void {
        $this
            ->setDescription('Generate a lightweight Opsdash report snapshot for a user.')
            ->addOption('user', null, InputOption::VALUE_REQUIRED, 'User ID to report on')
            ->addOption('range', null, InputOption::VALUE_REQUIRED, 'Range: week or month', 'week')
            ->addOption('offset', null, InputOption::VALUE_REQUIRED, 'Range offset (-24..24)', '0')
            ->addOption('cals', null, InputOption::VALUE_OPTIONAL, 'Comma-separated calendar ids (optional)')
            ->addOption('format', null, InputOption::VALUE_REQUIRED, 'Output format: text or json', 'text');
    }

    protected function execute(InputInterface $input, OutputInterface $output): int {
        $uid = trim((string)$input->getOption('user'));
        if ($uid === '') {
            $output->writeln('<error>[opsdash] --user is required.</error>');
            return Command::FAILURE;
        }
        if ($this->userManager->get($uid) === null) {
            $output->writeln('<error>[opsdash] User not found.</error>');
            return Command::FAILURE;
        }

        $range = strtolower((string)$input->getOption('range'));
        if ($range !== 'month') {
            $range = 'week';
        }
        $offset = (int)$input->getOption('offset');
        if ($offset > self::MAX_OFFSET) $offset = self::MAX_OFFSET;
        if ($offset < -self::MAX_OFFSET) $offset = -self::MAX_OFFSET;

        $calsCsv = (string)$input->getOption('cals');
        $provided = trim($calsCsv) !== '';
        $requested = $provided ? array_values(array_filter(explode(',', $calsCsv), static fn ($x) => $x !== '')) : null;

        $savedRaw = (string)$this->config->getUserValue($uid, 'opsdash', 'selected_cals', '__UNSET__');
        $selection = $this->selectionService->resolveInitialSelection($savedRaw, $provided, $requested);

        $userTz = $this->calendarAccess->resolveUserTimezone($uid);
        $weekStart = $this->calendarAccess->resolveUserWeekStart($uid);
        [$from, $to] = $this->calendarAccess->rangeBounds($range, $offset, $userTz, $weekStart);
        $cals = $this->calendarService->getCalendarsFor($uid);
        $availableIds = [];
        foreach ($cals as $cal) {
            $id = '';
            try {
                $id = (string)($cal->getUri() ?? '');
            } catch (\Throwable) {
                $id = '';
            }
            if ($id === '') {
                $id = (string)spl_object_id($cal);
            }
            $availableIds[] = $id;
        }
        $allowedSet = [];
        foreach ($availableIds as $id) {
            $allowedSet[$id] = 1;
        }
        $selectedIds = $this->selectionService->finalizeSelectedIds(
            $selection['includeAll'],
            $availableIds,
            $selection['selectedIds'],
        );
        $selectedIds = array_values(array_filter($selectedIds, static fn ($id) => isset($allowedSet[$id])));
        $groupsById = [];
        try {
            $groupsRaw = (string)$this->config->getUserValue($uid, 'opsdash', 'cal_groups', '');
            if ($groupsRaw !== '') {
                $tmp = json_decode($groupsRaw, true);
                if (is_array($tmp)) {
                    $groupsById = $tmp;
                }
            }
        } catch (\Throwable) {}
        $groupsById = $this->persistSanitizer->cleanGroups($groupsById, $allowedSet, $availableIds);

        $targetsConfig = $this->userConfigService->readTargetsConfig('opsdash', $uid);
        $categoryMeta = [];
        $groupToCategory = [];
        if (!empty($targetsConfig['categories']) && is_array($targetsConfig['categories'])) {
            foreach ($targetsConfig['categories'] as $cat) {
                if (!is_array($cat)) continue;
                $catId = substr((string)($cat['id'] ?? ''), 0, 64);
                if ($catId === '') continue;
                $label = trim((string)($cat['label'] ?? '')) ?: ucfirst($catId);
                $categoryMeta[$catId] = ['id' => $catId, 'label' => $label];
                if (!empty($cat['groupIds']) && is_array($cat['groupIds'])) {
                    foreach ($cat['groupIds'] as $gid) {
                        $n = (int)$gid;
                        if ($n < 0 || $n > self::MAX_GROUP) continue;
                        $groupToCategory[$n] = $catId;
                    }
                }
            }
        }
        $categoryMeta['__uncategorized__'] = ['id' => '__uncategorized__', 'label' => 'Unassigned'];

        $mapCalToCategory = function (string $calId) use ($groupsById, $groupToCategory) {
            $group = isset($groupsById[$calId]) ? (int)$groupsById[$calId] : 0;
            return $groupToCategory[$group] ?? '__uncategorized__';
        };

        $collect = $this->eventsCollector->collect(
            principal: 'principals/users/' . $uid,
            cals: $cals,
            includeAll: $selection['includeAll'],
            selectedIds: $selectedIds,
            from: $from,
            to: $to,
            maxPerCal: self::MAX_AGG_PER_CAL,
            maxTotal: self::MAX_AGG_TOTAL,
            debug: false,
        );

        $agg = $this->aggregationService->aggregate(
            events: $collect['events'],
            from: $from,
            to: $to,
            userTz: $userTz,
            allDayHours: (float)($targetsConfig['allDayHours'] ?? 8),
            colorsById: [],
            categoryMeta: $categoryMeta,
            mapCalToCategory: $mapCalToCategory,
        );

        $topCategory = null;
        foreach ($agg['categoryTotals'] as $catId => $hours) {
            if ($topCategory === null || $hours > $topCategory['hours']) {
                $label = $categoryMeta[$catId]['label'] ?? $catId;
                $topCategory = ['id' => $catId, 'label' => $label, 'hours' => round((float)$hours, 2)];
            }
        }
        $topCalendar = !empty($agg['byCalList'])
            ? [
                'id' => $agg['byCalList'][0]['id'],
                'label' => $agg['byCalList'][0]['calendar'],
                'hours' => round((float)$agg['byCalList'][0]['total_hours'], 2),
            ]
            : null;

        $summary = [
            'range' => $range,
            'offset' => $offset,
            'from' => $from->format('Y-m-d'),
            'to' => $to->format('Y-m-d'),
            'selected' => $selectedIds,
            'total_hours' => round((float)$agg['totalHours'], 2),
            'events' => (int)$agg['eventsCount'],
            'active_days' => (int)$agg['daysCount'],
            'avg_per_day' => round((float)$agg['avgPerDay'], 2),
            'avg_per_event' => round((float)$agg['avgPerEvent'], 2),
            'top_calendar' => $topCalendar,
            'top_category' => $topCategory,
        ];

        $format = strtolower((string)$input->getOption('format'));
        if ($format === 'json') {
            $output->writeln(json_encode($summary, JSON_PRETTY_PRINT));
            return Command::SUCCESS;
        }

        $output->writeln(sprintf(
            '<info>[opsdash]</info> Report for %s (%s, offset %d)',
            $uid,
            ucfirst($range),
            $offset,
        ));
        $output->writeln(sprintf('Range: %s → %s', $summary['from'], $summary['to']));
        $output->writeln(sprintf('Total hours: %.2f', $summary['total_hours']));
        $output->writeln(sprintf('Events: %d', $summary['events']));
        $output->writeln(sprintf('Active days: %d', $summary['active_days']));
        $output->writeln(sprintf('Avg/day: %.2f', $summary['avg_per_day']));
        $output->writeln(sprintf('Avg/event: %.2f', $summary['avg_per_event']));
        if ($topCategory) {
            $output->writeln(sprintf('Top category: %s (%.2f h)', $topCategory['label'], $topCategory['hours']));
        }
        if ($topCalendar) {
            $output->writeln(sprintf('Top calendar: %s (%.2f h)', $topCalendar['label'], $topCalendar['hours']));
        }

        return Command::SUCCESS;
    }
}
