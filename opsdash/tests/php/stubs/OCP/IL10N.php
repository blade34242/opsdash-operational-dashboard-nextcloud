<?php

declare(strict_types=1);

namespace OCP;

interface IL10N {
	public function t(string $text, array $parameters = []): string;
}
