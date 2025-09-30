<?php
declare(strict_types=1);

namespace OCA\Aaacalstatsdashxyz\AppInfo;

use OCP\AppFramework\App;
use OCP\AppFramework\Bootstrap\IBootstrap;
use OCP\AppFramework\Bootstrap\IRegistrationContext;
use OCP\AppFramework\Bootstrap\IBootContext;
// (metrics/admin settings removed)

class Application extends App implements IBootstrap {
    public function __construct() {
        parent::__construct('aaacalstatsdashxyz');
    }

    public function register(IRegistrationContext $context): void { /* no admin settings */ }

    public function boot(IBootContext $context): void {
        // Ensure navigation entry exists at runtime on servers that do not
        // pick up navigation.xml. This is safe to call on each request.
        try {
            if (class_exists('OC') && method_exists(\OC::$server, 'getNavigationManager')) {
                $server = \OC::$server;
                $nav = $server->getNavigationManager();
                if ($nav && method_exists($nav, 'add')) {
                    $url = $server->getURLGenerator();
                    $l10nFactory = $server->getL10NFactory();
                    $l = $l10nFactory->get('aaacalstatsdashxyz');
                    $route = $url->linkToRoute('aaacalstatsdashxyz.config_dashboard.index');
                    // Use explicit SVG name for NC31/32 compatibility (Nextcloud resolves to img/app.svg)
                    $icon  = $url->imagePath('aaacalstatsdashxyz', 'app.svg');
                    // Version-sensitive fallback (NC 32 navigation quirks)
                    $major = 0;
                    try { if (class_exists('OC_Util') && method_exists('OC_Util','getVersion')) { $ver = \OC_Util::getVersion(); $major = (int)($ver[0] ?? 0); } } catch (\Throwable) {}
                    $nav->add(function () use ($route, $icon, $l, $major) {
                        return [
                            'id' => 'aaacalstatsdashxyz',
                            'order' => 10,
                            'href' => $route,
                            'icon' => $icon,
                            'name' => $l->t('Calendar Dashboard'),
                            // Some NC versions expect explicit 'link' type; keep consistent
                            'type' => 'link',
                            'classes' => '',
                            'active' => false,
                            'unread' => 0,
                            'default' => false,
                        ];
                    });
                }
            }
        } catch (\Throwable $e) {
            // ignore navigation bootstrap issues to not break app
        }
    }
}
