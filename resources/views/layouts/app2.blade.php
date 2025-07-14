
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

    <!-- Laravel Echo -->
    <script src="https://cdn.jsdelivr.net/npm/laravel-echo@1.15.3/dist/echo.iife.js"></script>

    <!-- Pusher JS (required for Laravel Echo) -->
    <script src="https://js.pusher.com/7.2/pusher.min.js"></script>

    <!-- jQuery (optional, but useful for AJAX) -->
    <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>

    <!-- Axios -->
    <script src="https://cdn.jsdelivr.net/npm/axios/dist/axios.min.js"></script>

    <!-- WebRTC Adapter (for cross-browser compatibility) -->
    <script src="https://webrtc.github.io/adapter/adapter-latest.js"></script>

    <!-- Emoji picker -->
<link href="https://cdn.jsdelivr.net/npm/@emoji-mart/css" rel="stylesheet">
<script src="https://cdn.jsdelivr.net/npm/@emoji-mart/data"></script>
<script src="https://cdn.jsdelivr.net/npm/@emoji-mart/react"></script>

<!-- FilePond for file uploads -->
<link href="https://unpkg.com/filepond/dist/filepond.min.css" rel="stylesheet">
<script src="https://unpkg.com/filepond/dist/filepond.min.js"></script>

<script src="https://cdn.webrtc-experiment.com/RecordRTC.js"></script>

<script src="https://rtcmulticonnection.herokuapp.com/dist/RTCMultiConnection.min.js"></script>

    <!-- Toastr notifications -->
<link href="https://cdnjs.cloudflare.com/ajax/libs/toastr.js/latest/toastr.min.css" rel="stylesheet">
<script src="https://cdnjs.cloudflare.com/ajax/libs/toastr.js/latest/toastr.min.js"></script>


        @vite(['resources/css/app.css', 'resources/js/app.js'])
    {{-- <link href="{{ asset('css/app.css') }}" rel="stylesheet"> --}}
</head>
<body>
    <nav class="navbar navbar-expand-lg navbar-light bg-light">
        <div class="container">
            <a class="navbar-brand" href="#">Messenger App</a>

            <div class="collapse navbar-collapse justify-content-end">
                <ul class="navbar-nav">
                    @auth
                        <li class="nav-item">
                            <a class="nav-link active" href="#">
                                <i class="fas fa-user-circle me-1"></i>
                                {{ Auth::user()->name }}
                            </a>
                        </li>
                    @endauth
                    @guest
                        <li class="nav-item">
                            <a class="nav-link" href="{{ route('login') }}">Login</a>
                        </li>
                    @endguest
                </ul>
            </div>
        </div>
    </nav>

    <div id="app" class="container mt-4">
        @yield('content')
    </div>

    <!-- Bootstrap 5 JS Bundle with Popper -->
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>

    <!-- Laravel Echo Initialization -->
    <script>
        window.Echo = new Echo({
            broadcaster: 'reverb',
            key: '{{ env('REVERB_APP_KEY') }}',
            wsHost: window.location.hostname,
            wsPort: 8080,
            forceTLS: false,
            enabledTransports: ['ws', 'wss'],
        });

        console.log('Echo instance:', window.Echo);
console.log('Echo.socketId:', window.Echo.socketId ? window.Echo.socketId() : 'undefined');

    </script>



    {{-- <script src="{{ asset('js/app.js') }}"></script> --}}
    @yield('scripts')
</body>
</html>
