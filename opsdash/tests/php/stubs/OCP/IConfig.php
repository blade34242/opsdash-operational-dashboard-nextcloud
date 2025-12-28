<?php

declare(strict_types=1);

namespace OCP;

interface IConfig {
	public function getAppValue(string $appName, string $key, string $default = ''): string;
	public function getUserValue(string $userId, string $appName, string $key, string $default = ''): string;
	public function setUserValue(string $userId, string $appName, string $key, string $value): void;
}
