<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Default Reverb Server
    |--------------------------------------------------------------------------
    |
    | This option controls the default server used by Reverb to handle
    | incoming messages as well as broadcasting message to all your
    | connected clients. At this time only "reverb" is supported.
    |
    */

    'default' => env('REVERB_SERVER', 'reverb'),

    /*
    |--------------------------------------------------------------------------
    | Reverb Servers
    |--------------------------------------------------------------------------
    |
    | Here you may define details for each of the supported Reverb servers.
    | Each server has its own configuration options that are defined in
    | the array below. You should ensure all the options are present.
    |
    */

    'servers' => [
        'messenger' => [
            'host' => env('REVERB_SERVER_HOST', '0.0.0.0'),
            'port' => env('REVERB_SERVER_PORT', 5173),
            'app_id' => env('REVERB_APP_ID', 'messenger'),
            'app_key' => env('REVERB_APP_KEY', 'messenger-key'),
            'app_secret' => env('REVERB_APP_SECRET', 'messenger-secret'),
            'options' => [
                'tls' => false,
            ],
        ],

        'reverb' => [
            'host' => env('REVERB_SERVER_HOST', '0.0.0.0'),
            'port' => env('REVERB_SERVER_PORT', 8080),
            'path' => env('REVERB_SERVER_PATH', ''),
            'hostname' => env('REVERB_HOST', env('APP_URL')),
            'options' => [
                'tls' => env('REVERB_TLS_ENABLED', false) ? [] : null,
            ],
            'max_request_size' => env('REVERB_MAX_REQUEST_SIZE', 10000),
            'max_message_size' => env('REVERB_APP_MAX_MESSAGE_SIZE', 65536),
            'scaling' => [
                'enabled' => env('REVERB_SCALING_ENABLED', false),
                'channel' => env('REVERB_SCALING_CHANNEL', 'reverb'),
                'server' => [
                    'url' => env('REDIS_URL'),
                    'host' => env('REDIS_HOST', '127.0.0.1'),
                    'port' => env('REDIS_PORT', '6379'),
                    'username' => env('REDIS_USERNAME'),
                    'password' => env('REDIS_PASSWORD'),
                    'database' => env('REDIS_DB', '0'),
                    'timeout' => env('REDIS_TIMEOUT', 60),
                ],
            ],
            'pulse_ingest_interval' => env('REVERB_PULSE_INGEST_INTERVAL', 15),
            'telescope_ingest_interval' => env('REVERB_TELESCOPE_INGEST_INTERVAL', 15),
        ],

    ],

    /*
    |--------------------------------------------------------------------------
    | Reverb Applications
    |--------------------------------------------------------------------------
    |
    | Here you may define how Reverb applications are managed. If you choose
    | to use the "config" provider, you may define an array of apps which
    | your server will support, including their connection credentials.
    |
    */

     'apps' => [
        'provider' => 'config',

        'apps' => [
            [
                'id' => env('REVERB_APP_ID', 'reverb'),
                'name' => env('APP_NAME', 'Laravel'),
                'key' => env('REVERB_APP_KEY', 'reverb-key'),
                'secret' => env('REVERB_APP_SECRET', 'reverb-secret'),
                'enable_client_messages' => true,
                'max_message_size' => env('REVERB_APP_MAX_MESSAGE_SIZE', 10000),
                'allowed_origins' => explode(',', env('REVERB_ALLOWED_ORIGINS', '*')),
                'ping_interval' => env('REVERB_APP_PING_INTERVAL', 60),
                'activity_timeout' => env('REVERB_APP_ACTIVITY_TIMEOUT', 30),
                'options' => [
                    'host' => env('REVERB_HOST'),
                    'port' => env('REVERB_PORT', 443),
                    'scheme' => env('REVERB_SCHEME', 'https'),
                    'useTLS' => env('REVERB_SCHEME', 'https') === 'https',
                ],
            ],
        ],
    ],

];
