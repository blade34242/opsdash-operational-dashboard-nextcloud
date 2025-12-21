<?php

declare(strict_types=1);

error_reporting(E_ALL);
ini_set('display_errors', '1');

$composerAutoload = dirname(__DIR__) . '/../vendor/autoload.php';

if (file_exists($composerAutoload)) {
	require $composerAutoload;
} else {
	fwrite(STDERR, "Composer autoloader not found. Run `composer install` in the app root.\n");
	exit(1);
}

if (!class_exists(\OCP\AppFramework\Controller::class)) {
	require __DIR__ . '/stubs/OCP/AppFramework/Controller.php';
}

$interfaceStubs = [
	\OCP\IRequest::class => '/stubs/OCP/IRequest.php',
	\OCP\Calendar\IManager::class => '/stubs/OCP/Calendar/IManager.php',
	\OCP\IUserSession::class => '/stubs/OCP/IUserSession.php',
	\OCP\IUser::class => '/stubs/OCP/IUser.php',
	\OCP\IUserManager::class => '/stubs/OCP/IUserManager.php',
	\OCP\IConfig::class => '/stubs/OCP/IConfig.php',
	\OCP\ICache::class => '/stubs/OCP/ICache.php',
	\OCP\ICacheFactory::class => '/stubs/OCP/ICacheFactory.php',
	\Psr\Log\LoggerInterface::class => '/stubs/Psr/Log/LoggerInterface.php',
];

foreach ($interfaceStubs as $fqcn => $relativePath) {
	if (!interface_exists($fqcn) && !class_exists($fqcn)) {
		require __DIR__ . $relativePath;
	}
}
