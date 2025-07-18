<!-- resources/views/conversations/show.blade.php -->
@extends('conversations.index')

@section('conversation-content')
    <style>
        .conversation-messages {
            height: calc(100vh - 200px);
            overflow-y: auto;
            display: flex;
            flex-direction: column-reverse;
        }
    </style>
    <div class="border border-left border-top-0 border-right-0 border-bottom-0 card rounded-0">
        <div class="py-3 border-0 rounded-0 card-header d-flex justify-content-between align-items-center">
            <span>{{ $conversation->name ??$conversation->users->where('id', '!=', auth()->id())->pluck('name')->join(', ') }}</span>
            <div>
                <button class="btn btn-sm btn-primary start-audio-call" data-type="audio">
                    <i class="fas fa-phone"></i>
                </button>
                <button class="btn btn-sm btn-primary start-video-call" data-type="video">
                    <i class="fas fa-video"></i>
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


        <div class="border-0 card-footer ">
            <form id="send-message-form">
                @csrf
                <input type="hidden" name="conversation_id" value="{{ $conversation->id }}">
                <div class="gap-1 input-group">
                    <input type="text" name="body" class="border-0 outline-none form-control outline-0 focus:outline-0 focus:ring-0"
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
    <div id="callModal" class="modal fade">
        <div class="modal-dialog">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 id="callModalTitle" class="modal-title">Call</h5>
                </div>
                <div class="modal-body">
                    <div class="video-container">
                        <video id="remoteVideo" autoplay playsinline></video>
                        <video id="localVideo" autoplay playsinline muted></video>
                    </div>
                    <div class="call-controls">
                        <button id="endCallBtn" class="btn btn-danger">
                            <i class="fas fa-phone-slash"></i> End
                        </button>
                        <button id="toggleAudioBtn" class="btn btn-secondary">
                            <i class="fas fa-microphone"></i> Mute
                        </button>
                        <button id="toggleVideoBtn" class="btn btn-secondary">
                            <i class="fas fa-video"></i> Video Off
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- Incoming Call Modal -->
    <div class="modal fade" id="incomingCallModal" tabindex="-1" role="dialog" aria-hidden="true">
        <div class="modal-dialog" role="document">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title">Incoming Call</h5>
                </div>
                <div class="modal-body">
                    <p id="incomingCallType"></p>
                    <div class="call-controls">
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

    <!-- Add this to your layout for alerts -->
    <div id="alerts-container" class="top-0 p-3 position-fixed end-0" style="z-index: 2000"></div>

    <!-- System message styling -->
    <style>
    .message.system {
        text-align: center;
        margin: 10px 0;
    }
    .message.system p {
        margin: 0;
    }
    </style>

@section('scripts')
    <script>
        const conversationId = {{ $conversation->id }};
        console.log('conversation id: ' + conversationId);

        const userId = {{ auth()->id() }};
    </script>
    <script src="{{ asset('js/chat.js') }}"></script>
    <script src="{{ asset('js/webrtc.js') }}"></script>
@endsection
@endsection
