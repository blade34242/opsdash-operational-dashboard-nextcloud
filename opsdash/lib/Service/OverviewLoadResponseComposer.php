<?php
declare(strict_types=1);

namespace OCA\Opsdash\Service;

final class OverviewLoadResponseComposer {
    public function __construct(
        private OverviewCorePayloadComposer $coreComposer,
    ) {}

    /**
     * @param array<string,mixed> $context
     * @return array<string,mixed>
     */
    public function buildCorePayload(array $context): array {
        $coreInput = $context['coreInput'] ?? [];
        if (!is_array($coreInput)) {
            $coreInput = [];
        }
        return $this->coreComposer->compose($coreInput);
    }

    /**
     * @param array<string,mixed> $context
     * @param array<string,mixed> $corePayload
     * @param array<string,mixed> $dataPayload
     * @param array<string,mixed> $metaData
     * @param array<int,mixed> $queryDbg
     */
    public function compose(
        array $context,
        array $corePayload,
        array $dataPayload,
        array $metaData,
        bool $cacheHit,
        ?int $cacheStoredAt,
        array $queryDbg,
        bool $queryDbgTruncated,
    ): array {
        $from = $context['from'];
        $to = $context['to'];

        $payload = [
            'ok'   => true,
            'meta' => [
                'range' => $context['range'] ?? '',
                'offset' => $context['offset'] ?? 0,
                'from' => $from instanceof \DateTimeInterface ? $from->format('Y-m-d') : '',
                'to' => $to instanceof \DateTimeInterface ? $to->format('Y-m-d') : '',
                'truncated' => $metaData['truncated'] ?? false,
                'limits' => $metaData['limits'] ?? [],
                'cacheHit' => $cacheHit,
                'cacheStoredAt' => $cacheStoredAt,
            ],
        ];

        foreach ($corePayload as $key => $value) {
            $payload[$key] = $value;
        }
        if (!empty($dataPayload)) {
            foreach ($dataPayload as $key => $value) {
                $payload[$key] = $value;
            }
        }

        if (!empty($context['includeDebug'])) {
            $payload['calDebug'] = $context['calDebug'] ?? [];
            $payload['debug'] = [
                'principal' => $context['principal'] ?? '',
                'from' => $context['fromStr'] ?? '',
                'to' => $context['toStr'] ?? '',
                'queries' => $queryDbg,
                'queryTruncated' => $queryDbgTruncated,
                'enabled' => (bool)($context['debugEnabled'] ?? false),
                'selection' => [
                    'provided' => (bool)($context['provided'] ?? false),
                    'request' => !empty($context['provided']) ? ($context['calsOverride'] ?? null) : null,
                    'applied' => $context['selectedIds'] ?? [],
                    'saved' => !empty($context['selection']['hasSaved']) ? ($context['selection']['savedIds'] ?? null) : null,
                ],
            ];
        } elseif (!empty($context['includeDebugRequested'])) {
            $payload['debug'] = ['enabled' => false];
        }

        return $payload;
    }
}
