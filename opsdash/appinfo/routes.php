<?php
return [
  'routes' => [
    // Canonical URLs under /overview. Keep names aligned to the controller.
    ['name' => 'overview#index',          'url' => '/overview',                'verb' => 'GET'],
    ['name' => 'overview#load',           'url' => '/overview/load',           'verb' => 'GET'],
    ['name' => 'overview#persist',        'url' => '/overview/persist',        'verb' => 'POST'],
    ['name' => 'overview#notes',          'url' => '/overview/notes',          'verb' => 'GET'],
    ['name' => 'overview#notesSave',      'url' => '/overview/notes',          'verb' => 'POST'],
    ['name' => 'overview#ping',           'url' => '/overview/ping',           'verb' => 'GET'],
    ['name' => 'overview#presetsList',    'url' => '/overview/presets',        'verb' => 'GET'],
    ['name' => 'overview#presetsSave',    'url' => '/overview/presets',        'verb' => 'POST'],
    ['name' => 'overview#presetsLoad',    'url' => '/overview/presets/{name}', 'verb' => 'GET'],
    ['name' => 'overview#presetsDelete',  'url' => '/overview/presets/{name}', 'verb' => 'DELETE'],
  ],
];
