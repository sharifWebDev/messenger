@extends('conversations.index')

@section('conversation-content')
    <style>
        .conversation-messages {
            height: calc(100vh - 200px);
            overflow-y: auto;
            display: flex;
            flex-direction: column-reverse;
        }

        /* Video call styling */
        .video-container {
            position: relative;
            width: 100%;
            height: 300px;
            background: #000;
            margin-bottom: 15px;
            border-radius: 8px;
            overflow: hidden;
        }

        #remoteVideo {
            width: 100%;
            height: 100%;
            object-fit: cover;
        }

        #localVideo {
            position: absolute;
            bottom: 10px;
            right: 10px;
            width: 120px;
            height: 90px;
            border: 2px solid #fff;
            border-radius: 4px;
            object-fit: cover;
            z-index: 10;
        }

        .call-controls {
            display: flex;
            justify-content: center;
            gap: 10px;
            margin-top: 15px;
        }

        .call-controls button {
            border-radius: 50%;
            width: 50px;
            height: 50px;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        /* Debug console */
        #debugConsole {
            position: fixed;
            bottom: 0;
            right: 0;
            width: 300px;
            height: 200px;
            background: rgba(0, 0, 0, 0.7);
            color: white;
            overflow: auto;
            padding: 10px;
            z-index: 10000;
            font-family: monospace;
            font-size: 12px;
            display: none;
        }

        /* System messages */
        .message.system {
            text-align: center;
            margin: 10px 0;
            color: #6c757d;
            font-size: 0.9em;
        }

        /* Audio call specific */
        .audio-call-ui {
            text-align: center;
            padding: 20px;
        }

        .audio-call-ui .caller-avatar {
            width: 100px;
            height: 100px;
            border-radius: 50%;
            margin: 0 auto 20px;
            background: #f8f9fa;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 40px;
            color: #495057;
        }
    </style>

    <div class="border border-left border-top-0 border-right-0 border-bottom-0 card rounded-0">
        <div class="py-3 border-0 rounded-0 card-header d-flex justify-content-between align-items-center">
            <span>{{ $conversation->name ??$conversation->users->where('id', '!=', auth()->id())->pluck('name')->join(', ') }}</span>
            <div>
                <button class="btn btn-sm btn-primary start-audio-call" data-type="audio" title="Start Audio Call">
                    <i class="fas fa-phone"></i>
                </button>
                <button class="btn btn-sm btn-primary start-video-call" data-type="video" title="Start Video Call">
                    <i class="fas fa-video"></i>
                </button>
                <button class="btn btn-sm btn-secondary toggle-debug" title="Debug Mode">
                    <i class="fas fa-bug"></i>
                </button>
            </div>
        </div>

        <div class="card-body conversation-messages" id="conversationMessages">
            @foreach ($messages as $message)
                <div class="message @if ($message->user_id == auth()->id()) sent @else received @endif">
                    <strong>{{ $message->user->name }}</strong>
                    <p>{{ $message->body }}</p>
                    <small>{{ $message->created_at->diffForHumans() }}</small>
                </div>
            @endforeach
        </div>

        <div class="border-0 card-footer">
            <form id="send-message-form">
                @csrf
                <input type="hidden" name="conversation_id" value="{{ $conversation->id }}">
                <div class="gap-1 input-group">
                    <input type="text" name="body"
                        class="border-0 outline-none form-control outline-0 focus:outline-0 focus:ring-0"
                        style="border-radius: 20px; border: 1px solid #ccc" placeholder="Type a message...">
                    <div class="input-group-append">
                        <button type="submit" class="border-0 rounded-circle btn btn-success"
                            style="border-radius: 0; height: 42px; width: 42px; transform: rotate(45deg);">
                            <i class="fas fa-paper-plane"></i>
                        </button>
                    </div>
                </div>
            </form>
        </div>
    </div>

    <!-- Call Modal -->
    <div id="callModal" class="modal fade" data-bs-backdrop="static" data-bs-keyboard="false">
        <div class="modal-dialog modal-lg">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 id="callModalTitle" class="modal-title"></h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body">
                    <!-- Video container (shown for video calls) -->
                    <div class="video-container">
                        <video id="remoteVideo" autoplay playsinline></video>
                        <video id="localVideo" autoplay playsinline muted></video>
                    </div>

                    <!-- Audio UI (shown for audio calls) -->
                    <div class="audio-call-ui" id="audioCallUi">
                        <div class="caller-avatar">
                            <i class="fas fa-user"></i>
                        </div>
                        <h4 id="callerName"></h4>
                        <p id="callDuration">00:00</p>
                    </div>

                    <div class="call-controls">
                        <button id="endCallBtn" class="btn btn-danger">
                            <i class="fas fa-phone-slash"></i>
                        </button>
                        <button id="toggleAudioBtn" class="btn btn-secondary">
                            <i class="fas fa-microphone"></i>
                        </button>
                        <button id="toggleVideoBtn" class="btn btn-secondary">
                            <i class="fas fa-video"></i>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- Incoming Call Modal -->
    <div class="modal fade" id="incomingCallModal" tabindex="-1" role="dialog" data-bs-backdrop="static"
        data-bs-keyboard="false">
        <div class="modal-dialog" role="document">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title">Incoming Call</h5>
                </div>
                <div class="text-center modal-body">
                    <div class="mb-3 caller-avatar">
                        <i class="fas fa-user"></i>
                    </div>
                    <h4 id="incomingCallerName"></h4>
                    <p id="incomingCallType" class="text-muted"></p>
                    <div class="mt-4 call-controls">
                        <button id="answerCallBtn" class="btn btn-success">
                            <i class="fas fa-phone"></i> Answer
                        </button>
                        <button id="rejectCallBtn" class="btn btn-danger">
                            <i class="fas fa-phone-slash"></i> Reject
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- Debug Console -->
    <div id="debugConsole"></div>

    <!-- System message styling -->
    <style>
        .message.system {
            text-align: center;
            margin: 10px 0;
        }

        .message.system p {
            margin: 0;
            color: #6c757d;
            font-size: 0.9em;
        }
    </style>

@section('scripts')
    <script>
        const conversationId = {{ $conversation->id }};
        const userId = {{ auth()->id() }};
        const otherUsers = {!! json_encode($conversation->users->where('id', '!=', auth()->id())) !!};

        // Debug mode flag
        let debugMode = false;

        // Call duration timer
        let callTimer = null;
        let callStartTime = null;
    </script>
    <script src="{{ asset('js/chat.js') }}"></script>
    <script src="{{ asset('js/webrtc.js') }}"></script>

    <script>

        // Update call duration timer
        function updateCallDuration() {
            if (!callStartTime) return;

            const now = new Date();
            const elapsed = Math.floor((now - callStartTime) / 1000);
            const minutes = Math.floor(elapsed / 60).toString().padStart(2, '0');
            const seconds = (elapsed % 60).toString().padStart(2, '0');

            document.getElementById('callDuration').textContent = `${minutes}:${seconds}`;
        }

        // Start the call timer
        function startCallTimer() {
            callStartTime = new Date();
            callTimer = setInterval(updateCallDuration, 1000);
        }

        // Stop the call timer
        function stopCallTimer() {
            if (callTimer) {
                clearInterval(callTimer);
                callTimer = null;
            }
            document.getElementById('callDuration').textContent = '00:00';
        }
    </script>
@endsection
@endsection
