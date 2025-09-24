<?php
declare(strict_types=1);

namespace OCA\Aaacalstatsdashxyz\Settings;

use OCP\Settings\ISection;

class AdminSection implements ISection {
    public function getID(): string { return 'aaacalstatsdashxyz'; }
    public function getName(): string { return 'Calendar Dashboard'; }
    public function getPriority(): int { return 50; }
}

