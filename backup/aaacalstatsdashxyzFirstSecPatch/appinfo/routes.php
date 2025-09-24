<?php
return [
  'routes' => [
    ['name' => 'config_dashboard#index', 'url' => '/config_dashboard',        'verb' => 'GET'],
    ['name' => 'config_dashboard#load',  'url' => '/config_dashboard/load',   'verb' => 'POST'],
    ['name' => 'config_dashboard#load',  'url' => '/config_dashboard/load',   'verb' => 'GET'],
    ['name' => 'config_dashboard#save',  'url' => '/config_dashboard/save',   'verb' => 'POST'],
    // GET save removed for safety; use POST only
    ['name' => 'config_dashboard#persist','url'=> '/config_dashboard/persist','verb' => 'POST'],
    // Notes (week/month) endpoints
    ['name' => 'config_dashboard#notes',      'url' => '/config_dashboard/notes',   'verb' => 'GET'],
    ['name' => 'config_dashboard#notesSave',  'url' => '/config_dashboard/notes',   'verb' => 'POST'],
    ['name' => 'config_dashboard#ping',  'url' => '/config_dashboard/ping',   'verb' => 'GET'],
    // Admin metrics endpoints
    ['name' => 'admin#getMetrics',       'url' => '/admin/metrics',           'verb' => 'GET'],
    ['name' => 'admin#getUserMetrics',   'url' => '/admin/metrics/users',     'verb' => 'GET'],
    ['name' => 'admin#resetMetrics',     'url' => '/admin/metrics/reset',     'verb' => 'POST'],
    ['name' => 'admin#setMetricsConfig', 'url' => '/admin/metrics/config',    'verb' => 'POST'],
  ],
];
