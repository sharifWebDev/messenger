<?php

// app/Http/Middleware/CleanSDP.php
namespace App\Http\Middleware;

use Closure;

class CleanSDP
{
    public function handle($request, Closure $next)
    {
        if ($request->has('signal.sdp')) {
            $sdp = $request->input('signal.sdp');
            $request->merge([
                'signal.sdp' => $this->cleanSDP($sdp)
            ]);
        }
        return $next($request);
    }

    protected function cleanSDP($sdp)
    {
        return collect(explode("\n", $sdp))
            ->reject(function ($line) {
                return str_starts_with($line, 'a=max-message-size:');
            })
            ->implode("\n");
    }
}
