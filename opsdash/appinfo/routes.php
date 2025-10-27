<?php
return [
  'routes' => [
    // Canonical URLs under /config_dashboard (NC31-compatible). Keep names aligned to the controller.
    ['name' => 'config_dashboard#index',    'url' => '/config_dashboard',          'verb' => 'GET'],
    ['name' => 'config_dashboard#load',     'url' => '/config_dashboard/load',     'verb' => 'GET'],
    ['name' => 'config_dashboard#persist',  'url' => '/config_dashboard/persist',  'verb' => 'POST'],
    ['name' => 'config_dashboard#notes',    'url' => '/config_dashboard/notes',    'verb' => 'GET'],
    ['name' => 'config_dashboard#notesSave','url' => '/config_dashboard/notes',    'verb' => 'POST'],
    ['name' => 'config_dashboard#ping',     'url' => '/config_dashboard/ping',     'verb' => 'GET'],
    ['name' => 'config_dashboard#presetsList',   'url' => '/config_dashboard/presets',          'verb' => 'GET'],
    ['name' => 'config_dashboard#presetsSave',   'url' => '/config_dashboard/presets',          'verb' => 'POST'],
    ['name' => 'config_dashboard#presetsLoad',   'url' => '/config_dashboard/presets/{name}',   'verb' => 'GET'],
    ['name' => 'config_dashboard#presetsDelete', 'url' => '/config_dashboard/presets/{name}',   'verb' => 'DELETE'],
  ],
];
