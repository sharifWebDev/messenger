<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Facades\Broadcast;

class BroadcastServiceProvider extends ServiceProvider
{
    /**
     * Bootstrap any application services.
     *
     * @return void
     */
    public function boot()
    {
        // Authenticate the user's personal channel
        Broadcast::routes(['middleware' => ['web', 'auth']]);

        // Register channel routes
        require base_path('routes/channels.php');

        // Configure Reverb if it's enabled
        if (config('broadcasting.default') === 'reverb') {
            $this->configureReverb();
        }
    }

    /**
     * Configure Reverb-specific broadcast settings
     *
     * @return void
     */
    protected function configureReverb()
    {
        Broadcast::extend('reverb', function ($app) {
            return new \Laravel\Reverb\Broadcasting\Broadcaster(
                $app['reverb.connection'],
                $app['reverb.application'],
                $app['reverb.channel_manager']
            );
        });
    }
}
