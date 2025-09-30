<?php
declare(strict_types=1);

// Legacy navigation registration to ensure the app appears in the app switcher
// on servers that might not process navigation.xml or bootstrap hooks early enough.

/** @var \OCP\IURLGenerator $url */
$url = \OC::$server->getURLGenerator();
/** @var \OCP\L10N\IFactory $l10nFactory */
$l10nFactory = \OC::$server->getL10NFactory();
$l = $l10nFactory->get('aaacalstatsdashxyz');

\OCP\App::registerNavigation('aaacalstatsdashxyz', [
    'id' => 'aaacalstatsdashxyz',
    'order' => 10,
    'href' => $url->linkToRoute('aaacalstatsdashxyz.config_dashboard.index'),
    'icon' => $url->imagePath('aaacalstatsdashxyz', 'app.svg'),
    'name' => $l->t('Calendar Dashboard'),
]);

