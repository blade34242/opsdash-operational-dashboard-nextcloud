<?php
declare(strict_types=1);

// Fallback navigation registration for servers that do not read navigation.xml
// Ensures the app appears in the top app switcher.

/** @var \OCP\IURLGenerator $url */
$url = \OC::$server->getURLGenerator();

return [[
    'id' => 'opsdash',
    'order' => 10,
    'href' => $url->linkToRoute('opsdash.overview.index'),
    'icon' => $url->imagePath('opsdash', 'app.svg'),
    'name' => 'Operational Dashboard',
    'type' => 'link',
    'classes' => '',
    'active' => false,
    'unread' => 0,
    'default' => false,
]];
