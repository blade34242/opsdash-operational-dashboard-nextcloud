<?php
declare(strict_types=1);

namespace OCA\Opsdash\Service;

use OCP\IConfig;
use Psr\Log\LoggerInterface;

final class UserPresetsService {
    public function __construct(
        private IConfig $config,
        private LoggerInterface $logger,
    ) {}

    /** @return array<string,array<string,mixed>> */
    public function read(string $appName, string $key, string $uid): array {
        try {
            $raw = (string)$this->config->getUserValue($uid, $appName, $key, '');
            if ($raw === '') {
                return [];
            }
            $decoded = json_decode($raw, true);
            if (!is_array($decoded)) {
                return [];
            }
            $out = [];
            foreach ($decoded as $name => $entry) {
                if (!is_string($name) || $name === '' || !is_array($entry)) {
                    continue;
                }
                $out[$name] = $entry;
            }
            return $out;
        } catch (\Throwable $e) {
            $this->logger->error('read presets failed: ' . $e->getMessage(), ['app' => $appName]);
            return [];
        }
    }

    /** @param array<string,array<string,mixed>> $presets */
    public function write(string $appName, string $key, string $uid, array $presets): void {
        try {
            $encoded = json_encode($presets, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
            if ($encoded === false) {
                throw new \RuntimeException('json encode failed');
            }
            $this->config->setUserValue($uid, $appName, $key, $encoded);
        } catch (\Throwable $e) {
            $this->logger->error('write presets failed: ' . $e->getMessage(), ['app' => $appName]);
            throw $e;
        }
    }

    /**
     * @param array<string,array<string,mixed>> $presets
     * @return array<int,array<string,mixed>>
     */
    public function formatList(array $presets): array {
        $list = [];
        foreach ($presets as $name => $entry) {
            $payload = is_array($entry['payload'] ?? null) ? $entry['payload'] : [];
            $selected = isset($payload['selected']) && is_array($payload['selected']) ? $payload['selected'] : [];
            $groups = isset($payload['groups']) && is_array($payload['groups']) ? $payload['groups'] : [];
            $list[] = [
                'name' => $name,
                'createdAt' => $entry['created_at'] ?? null,
                'updatedAt' => $entry['updated_at'] ?? null,
                'selectedCount' => count($selected),
                'calendarCount' => count($groups),
            ];
        }
        usort($list, function ($a, $b) {
            $au = (string)($a['updatedAt'] ?? '');
            $bu = (string)($b['updatedAt'] ?? '');
            if ($au === $bu) {
                return strcmp((string)$a['name'], (string)$b['name']);
            }
            return strcmp($bu, $au);
        });
        return $list;
    }
}

