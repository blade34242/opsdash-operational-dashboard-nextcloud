<?php
declare(strict_types=1);

// Fallback navigation registration for servers that do not read navigation.xml
// Ensures the app appears in the top app switcher.

/** @var \OCP\IURLGenerator $url */
$url = \OC::$server->getURLGenerator();
/** @var \OCP\L10N\IFactory $l10nFactory */
$l10nFactory = \OC::$server->getL10NFactory();
$l = $l10nFactory->get('aaacalstatsdashxyz');

return [
    'id' => 'aaacalstatsdashxyz',
    'order' => 10,
    'href' => $url->linkToRoute('aaacalstatsdashxyz.config_dashboard.index'),
    'icon' => $url->imagePath('aaacalstatsdashxyz', 'app.svg'),
    'name' => $l->t('Calendar Dashboard'),
];

