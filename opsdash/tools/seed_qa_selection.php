<?php
declare(strict_types=1);

use OCP\AppFramework\Bootstrap\IBootContext;
use OCP\AppFramework\Bootstrap\IBootstrap;
use OCP\AppFramework\Bootstrap\IRegistrationContext;
use OCP\AppFramework\Utility\ITimeFactory;
use OCP\IConfig;
use OCP\Server;

class OpsdashSeedQA implements IBootstrap {
    public function register(IRegistrationContext $context): void {}

    public function boot(IBootContext $context): void {
        $server = Server::get(Server::class);
        /** @var IConfig $config */
        $config = $server->query(IConfig::class);

        $config->setUserValue('qa', 'opsdash', 'selected_cals', 'opsdash-focus');
        $config->setUserValue('qa', 'opsdash', 'cal_groups', json_encode(['opsdash-focus' => 0]));
    }
}
