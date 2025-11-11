#!/usr/bin/env php
<?php
declare(strict_types=1);

require_once __DIR__ . '/../vendor/autoload.php';

use OC\AppFramework\Utility\SimpleContainer;
use OCP\Calendar\IManager;
use OCP\User\IManager as IUserManager;
use OCP\IConfig;
use OCP\IUser;
use OCP\Server;

$container = Server::get(SimpleContainer::class);
/** @var IManager $calendarManager */
$calendarManager = $container->query(IManager::class);
/** @var IUserManager $userManager */
$userManager = $container->query(IUserManager::class);
/** @var IConfig $config */
$configStore = $container->query(IConfig::class);

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
        '{DAV:}displayname' => 'Opsdash Focus',
        '{http://apple.com/ns/ical/}calendar-color' => '#2563EB',
    ]);
    echo "Created calendar $calendarId for $uid" . PHP_EOL;
}

$configStore->setUserValue($uid, 'opsdash', 'selected_cals', $calendarId);
$configStore->setUserValue($uid, 'opsdash', 'cal_groups', json_encode([$calendarId => 0]));

echo "Seeded QA selection for $uid" . PHP_EOL;
