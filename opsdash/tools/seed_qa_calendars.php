#!/usr/bin/env php
<?php
declare(strict_types=1);

define('OC_ROOT', dirname(__DIR__, 3));
require_once OC_ROOT . '/config/config.php';
require_once OC_ROOT . '/lib/base.php';

use OCP\Calendar\IManager;
use OCP\IConfig;
use OCP\Server;
use OCP\User\IManager as IUserManager;
use OCP\IUser;

/** @var IUserManager $userManager */
$userManager = Server::get(IUserManager::class);
/** @var IManager $calendarManager */
$calendarManager = Server::get(IManager::class);
/** @var IConfig $configStore */
$configStore = Server::get(IConfig::class);

$uid = getenv('QA_USER') ?: 'qa';
$calendarId = 'opsdash-focus';

/** @var IUser|null $user */
$user = $userManager->get($uid);
if (!$user) {
    fwrite(STDERR, "User $uid does not exist" . PHP_EOL);
    exit(1);
}

$principal = 'principals/users/' . $uid;
$calendars = $calendarManager->getCalendarsForPrincipal($principal) ?: [];
$existing = null;
foreach ($calendars as $calendar) {
    if ($calendar->getUri() === $calendarId) {
        $existing = $calendar;
        break;
    }
}

if (!$existing) {
    $calendarManager->createCalendar($principal, $calendarId, [
        'displayname' => 'Opsdash Focus',
    ]);
    echo "Created calendar $calendarId for $uid" . PHP_EOL;
}

$configStore->setUserValue($uid, 'opsdash', 'selected_cals', $calendarId);
$configStore->setUserValue($uid, 'opsdash', 'cal_groups', json_encode([$calendarId => 0]));

echo "Seeded QA selection for $uid" . PHP_EOL;
