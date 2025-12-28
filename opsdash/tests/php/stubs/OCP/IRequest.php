<?php

declare(strict_types=1);

namespace OCP;

interface IRequest {
	public function getParam(string $name, $default = null);
	public function getHeader(string $name, ?string $default = null): ?string;
	public function passesCSRFCheck(): bool;
}
