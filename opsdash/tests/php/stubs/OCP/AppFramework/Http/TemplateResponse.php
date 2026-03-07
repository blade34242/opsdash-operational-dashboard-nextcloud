<?php

declare(strict_types=1);

namespace OCP\AppFramework\Http;

class TemplateResponse {
	public function __construct(
		public string $appName,
		public string $templateName,
		public array $params = [],
	) {
	}
}
