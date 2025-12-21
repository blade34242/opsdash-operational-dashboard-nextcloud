<?php

declare(strict_types=1);

namespace OCP;

interface ICacheFactory {
	public function createLocal(string $prefix): ICache;
}
