<?php

declare(strict_types=1);

namespace OCP\App;

interface IAppManager {
	public function isInstalled(string $appId): bool;
	public function isEnabledForUser(string $appId): bool;
	public function loadApp(string $appId): void;
}
