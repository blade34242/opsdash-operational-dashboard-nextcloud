<?php
declare(strict_types=1);

namespace OCA\Aaacalstatsdashxyz\Controller;

use OCP\AppFramework\Controller;
use OCP\AppFramework\Http\DataResponse;
use OCP\AppFramework\Http;
use OCP\AppFramework\Http\Attribute\AdminRequired;
use OCP\IRequest;
use OCA\Aaacalstatsdashxyz\Service\MetricsService;

final class AdminController extends Controller {
    public function __construct(
        string $appName,
        IRequest $request,
        private MetricsService $metrics,
    ) {
        parent::__construct($appName, $request);
    }

    #[AdminRequired]
    public function getMetrics(): DataResponse {
        return new DataResponse([
            'enabled' => $this->metrics->enabled(),
            'metrics' => $this->metrics->getAll(),
        ], Http::STATUS_OK);
    }

    #[AdminRequired]
    public function resetMetrics(): DataResponse {
        $this->metrics->reset();
        return new DataResponse(['ok' => true], Http::STATUS_OK);
    }

    #[AdminRequired]
    public function setMetricsConfig(): DataResponse {
        $raw = file_get_contents('php://input') ?: '';
        $data = json_decode($raw, true);
        $enabled = (bool)($data['enabled'] ?? false);
        $this->metrics->setEnabled($enabled);
        return new DataResponse(['ok' => true, 'enabled' => $enabled], Http::STATUS_OK);
    }

    #[AdminRequired]
    public function getUserMetrics(): DataResponse {
        $months = (int)($this->request->getParam('months') ?? 6);
        $months = max(1, min(36, $months));
        return new DataResponse([
            'enabled' => $this->metrics->enabled(),
            'months' => $months,
            'rows' => $this->metrics->getUserMonthly($months),
        ], Http::STATUS_OK);
    }
}

