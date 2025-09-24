<?php
declare(strict_types=1);

namespace OCA\Aaacalstatsdashxyz\Service;

use OCP\IDBConnection;
use OCP\IConfig;
use OCP\DB\QueryBuilder\IQueryBuilder;
use DateTimeImmutable;

final class MetricsService {
    public function __construct(
        private IDBConnection $db,
        private IConfig $config,
    ) {}

    public function enabled(): bool {
        return $this->config->getAppValue('aaacalstatsdashxyz', 'metrics_enabled', '0') === '1';
    }

    public function setEnabled(bool $enabled): void {
        $this->config->setAppValue('aaacalstatsdashxyz', 'metrics_enabled', $enabled ? '1' : '0');
    }

    public function increment(string $metric): void {
        $metric = substr($metric, 0, 32);
        $now = time();

        // Try update first
        $qb = $this->db->getQueryBuilder();
        $qb->update('aaacalstatsdashxyz_metrics')
            ->set('count', $qb->expr()->literal(IQueryBuilder::PARAM_INT) /*dummy*/, IQueryBuilder::PARAM_INT);
        // The line above cannot set arithmetic; use expression
        $qb = $this->db->getQueryBuilder();
        $qb->update('aaacalstatsdashxyz_metrics')
            ->set('count', $qb->createFunction('count + 1'))
            ->set('updated_at', $qb->createNamedParameter($now, IQueryBuilder::PARAM_INT))
            ->where($qb->expr()->eq('metric', $qb->createNamedParameter($metric)));
        $affected = (int)$qb->executeStatement();
        if ($affected > 0) return;

        // Insert; if conflict occurs (another request inserted), fall back to update
        try {
            $qb = $this->db->getQueryBuilder();
            $qb->insert('aaacalstatsdashxyz_metrics')
                ->values([
                    'metric' => $qb->createNamedParameter($metric),
                    'count' => $qb->createNamedParameter(1, IQueryBuilder::PARAM_INT),
                    'updated_at' => $qb->createNamedParameter($now, IQueryBuilder::PARAM_INT),
                ])->executeStatement();
            return;
        } catch (\Throwable) {
            $qb = $this->db->getQueryBuilder();
            $qb->update('aaacalstatsdashxyz_metrics')
                ->set('count', $qb->createFunction('count + 1'))
                ->set('updated_at', $qb->createNamedParameter($now, IQueryBuilder::PARAM_INT))
                ->where($qb->expr()->eq('metric', $qb->createNamedParameter($metric)))->executeStatement();
        }
    }

    public function getAll(): array {
        $qb = $this->db->getQueryBuilder();
        $qb->select('metric', 'count', 'updated_at')->from('aaacalstatsdashxyz_metrics');
        $rows = $qb->executeQuery()->fetchAllAssociative() ?: [];
        $out = [];
        foreach ($rows as $r) {
            $out[$r['metric']] = [
                'count' => (int)$r['count'],
                'updated_at' => (int)$r['updated_at'],
            ];
        }
        return $out;
    }

    public function reset(): void {
        $qb = $this->db->getQueryBuilder();
        // Truncate is not portable; delete and re-insert zeros is fine
        $qb->delete('aaacalstatsdashxyz_metrics')->executeStatement();
    }

    public function incrementUser(string $uid, string $metric): void {
        $uid = substr($uid, 0, 64);
        $metric = substr($metric, 0, 32);
        $now = time();
        $ym = gmdate('Y-m');

        // UPDATE first
        $qb = $this->db->getQueryBuilder();
        $qb->update('aaacalstatsdashxyz_user_metrics')
            ->set('count', $qb->createFunction('count + 1'))
            ->set('updated_at', $qb->createNamedParameter($now, IQueryBuilder::PARAM_INT))
            ->where($qb->expr()->eq('uid', $qb->createNamedParameter($uid)))
            ->andWhere($qb->expr()->eq('ym', $qb->createNamedParameter($ym)))
            ->andWhere($qb->expr()->eq('metric', $qb->createNamedParameter($metric)));
        $affected = (int)$qb->executeStatement();
        if ($affected > 0) return;

        // INSERT, fallback to UPDATE if race
        try {
            $qb = $this->db->getQueryBuilder();
            $qb->insert('aaacalstatsdashxyz_user_metrics')
                ->values([
                    'uid' => $qb->createNamedParameter($uid),
                    'ym' => $qb->createNamedParameter($ym),
                    'metric' => $qb->createNamedParameter($metric),
                    'count' => $qb->createNamedParameter(1, IQueryBuilder::PARAM_INT),
                    'updated_at' => $qb->createNamedParameter($now, IQueryBuilder::PARAM_INT),
                ])->executeStatement();
            return;
        } catch (\Throwable) {
            $qb = $this->db->getQueryBuilder();
            $qb->update('aaacalstatsdashxyz_user_metrics')
                ->set('count', $qb->createFunction('count + 1'))
                ->set('updated_at', $qb->createNamedParameter($now, IQueryBuilder::PARAM_INT))
                ->where($qb->expr()->eq('uid', $qb->createNamedParameter($uid)))
                ->andWhere($qb->expr()->eq('ym', $qb->createNamedParameter($ym)))
                ->andWhere($qb->expr()->eq('metric', $qb->createNamedParameter($metric)))
                ->executeStatement();
        }
    }

    /**
     * @return array<int, array{uid:string,ym:string,open:int,load:int,save:int,total:int}>
     */
    public function getUserMonthly(int $months = 6): array {
        $months = max(1, min(36, $months));
        $cutoff = new \DateTimeImmutable('first day of this month');
        $cutYm = $cutoff->modify('-'.($months-1).' months')->format('Y-m');

        $qb = $this->db->getQueryBuilder();
        $qb->select('uid', 'ym', 'metric', 'count')
            ->from('aaacalstatsdashxyz_user_metrics')
            ->where($qb->expr()->gte('ym', $qb->createNamedParameter($cutYm)));
        $rows = $qb->executeQuery()->fetchAllAssociative() ?: [];
        $acc = [];
        foreach ($rows as $r) {
            $uid = (string)$r['uid']; $ym=(string)$r['ym']; $m=(string)$r['metric']; $c=(int)$r['count'];
            $key = $uid.'|'.$ym;
            if (!isset($acc[$key])) { $acc[$key] = ['uid'=>$uid,'ym'=>$ym,'open'=>0,'load'=>0,'save'=>0,'total'=>0]; }
            if (isset($acc[$key][$m])) $acc[$key][$m] += $c;
            $acc[$key]['total'] += $c;
        }
        // sort by ym desc, then uid
        $list = array_values($acc);
        usort($list, function($a,$b){
            $d = strcmp($b['ym'],$a['ym']); if ($d!==0) return $d; return strcmp($a['uid'],$b['uid']);
        });
        return $list;
    }
}
