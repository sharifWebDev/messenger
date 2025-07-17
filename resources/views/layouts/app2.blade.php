<!-- resources/views/layouts/app.blade.php -->
<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <title>Messenger App</title>

    <!-- Bootstrap 5 CSS -->
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">

    <!-- Font Awesome -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">

    <!-- Toastr notifications -->
    <link href="https://cdnjs.cloudflare.com/ajax/libs/toastr.js/latest/toastr.min.css" rel="stylesheet">

    @vite(['resources/css/app.css', 'resources/js/app.js'])
</head>

<body>
    <style>
    .collapse {
        visibility: visible ! important;
    }
    .navbar {
        height: 60px ! important;
    }
    </style>
    <div id="app">
        <nav class="navbar navbar-expand-lg navbar-light bg-light">
        <div class="container">
            <a class="navbar-brand" href="#">
                <i class="fas fa-comments me-1 text-primary fs-4"></i>
                Messenger App wq</a>

            <div class="collapse navbar-collapse justify-content-end">
                <ul class="navbar-nav">
                    @if(auth()->check())
                        <li class="nav-item">
                            <a class="nav-link active" href="#">
                                <i class="fas fa-user-circle me-1"></i>
                                {{ auth()->user()->name }}
                            </a>
                        </li>
                    @else
                        <li class="nav-item">
                            <a class="nav-link" href="{{ route('login') }}">Login</a>
                        </li>
                    @endif
                </ul>
            </div>
        </div>
    </nav>
        <div class="container mt-4">
            @yield('content')
        </div>
    </div>

    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>

    <script src="https://cdnjs.cloudflare.com/ajax/libs/toastr.js/latest/toastr.min.js"></script>

    <!-- Axios -->
    <script src="https://cdn.jsdelivr.net/npm/axios/dist/axios.min.js"></script>

    <!-- WebRTC Adapter (for cross-browser compatibility) -->
    <script src="https://webrtc.github.io/adapter/adapter-latest.js"></script>
    <!-- Laravel Echo -->
    <script src="https://cdn.jsdelivr.net/npm/laravel-echo@1.15.3/dist/echo.iife.js"></script>

    <script src="https://js.pusher.com/7.2/pusher.min.js"></script>

    <!-- jQuery (optional, but useful for AJAX) -->
    <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>

    <script src="https://cdn.webrtc-experiment.com/RecordRTC.js"></script>

    <script src="https://rtcmulticonnection.herokuapp.com/dist/RTCMultiConnection.min.js"></script>



     <script src="https://cdn.jsdelivr.net/npm/laravel-echo@1.15.3/dist/echo.iife.js"></script>

<script>
    window.Echo = new Echo({
        broadcaster: 'reverb',
        key: "{{ config('broadcasting.connections.reverb.key') }}",
        wsHost: "{{ config('broadcasting.connections.reverb.options.host') }}",
        wsPort: {{ config('broadcasting.connections.reverb.options.port') }},
        forceTLS: "{{ config('broadcasting.connections.reverb.options.scheme') }}" === 'https',
        enabledTransports: ['ws', 'wss'],
    });

        // Safe check for socketId
        function getSocketIdWhenReady(callback, attempt = 0) {
            if (window.Echo && typeof window.Echo.socketId === 'function') {
                const id = window.Echo.socketId();
                if (id) {
                    console.log('✅ Reverb connected. socketId:', id);
                    callback(id);
                    return;
                }
            }

            if (attempt >= 10) {
                console.warn('❌ Echo not connected after multiple attempts.');
                return;
            }

            setTimeout(() => getSocketIdWhenReady(callback, attempt + 1), 300);
        }

        // Use Echo after it's ready
        getSocketIdWhenReady((socketId) => {
           window.Echo.connector.pusher.connection.bind('connected', () => {
                console.log('✅ Echo connected with socketId:', window.Echo.socketId());

            });

        });

    </script>
    @yield('scripts')
</body>

</html>
