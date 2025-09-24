<?php
declare(strict_types=1);

namespace OCA\Aaacalstatsdashxyz\Settings;

use OCP\Settings\ISettings;
use OCP\AppFramework\Http\TemplateResponse;
use OCA\Aaacalstatsdashxyz\Service\MetricsService;

class AdminSettings implements ISettings {
    public function __construct(private MetricsService $metrics) {}

    public function getForm(): TemplateResponse {
        $data = [
            'enabled' => $this->metrics->enabled(),
            'metrics' => $this->metrics->getAll(),
        ];
        return new TemplateResponse('aaacalstatsdashxyz', 'admin', $data, 'blank');
    }

    public function getSection(): string { return 'aaacalstatsdashxyz'; }
    public function getPriority(): int { return 50; }
}

