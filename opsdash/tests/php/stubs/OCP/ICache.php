<?php

declare(strict_types=1);

namespace OCP;

interface ICache {
	public function get(string $key);

	public function set(string $key, $value, int $ttl = 0): bool;

	public function hasKey(string $key): bool;
}
