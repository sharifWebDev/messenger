<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Facades\Broadcast;

class BroadcastServiceProvider extends ServiceProvider
{
    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // Register the broadcasting routes for private channels
        Broadcast::routes(['middleware' => ['web', 'auth']]);

        // Load channel definitions
        require base_path('routes/channels.php');
    }
}
