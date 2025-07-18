<!-- resources/views/conversations/index.blade.php -->
@extends('layouts.app2')

@section('content')
    <div class="container">
        <div class="bg-white row justify-content-between">
            <div class="p-0 m-0 border-0 rounded-none d-none d-md-block col-12 col-md-4">
                <div class="border-0 card ">
                    <div class="py-3 border-0 card-header rounded-0">
                        <i class="p-1 fas fa-inbox fs-5 text-info"></i>
                        Conversations
                    </div>
                    <div class="p-0 card-body">
                        <ol class="list-group list-group-flush">
                        @forelse($conversations ?? [] as $conversation)
                                <a href="{{ route('conversations.show', $conversation) }}">
                                <li class="border-bottom border-top-0 border-right-0 border-left-0 list-group-item d-flex justify-content-between align-items-start">
                                        <div class="ms-2 me-auto">
                                            <div class="fw-bold text-gray">
                                                {{ $conversation->name ??$conversation->users->where('id', '!=', auth()->id())->pluck('name')->join(', ') }}
                                            </div>
                                            @if ($conversation->latestMessage)
                                                <small class="text-muted d-block">{{ Str::limit($conversation->latestMessage->body, 30) }}</small>
                                            @endif
                                        </div>
                                        <span class="badge bg-primary rounded-pill">14</span>
                                    </li>
                                </a>
                                @empty
                                <p>No conversations yet.</p>
                                @endforelse
                            </ol>
                    </div>
                </div>
            </div>
            <div class="p-0 m-0 border-0 rounded-none col-12 col-md-8 col-lg-8">
                @yield('conversation-content')
            </div>
        </div>
    </div>
@endsection
