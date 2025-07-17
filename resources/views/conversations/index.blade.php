<!-- resources/views/conversations/index.blade.php -->
@extends('layouts.app2')

@section('content')
<div class="container">
    <div class="row justify-content-between">
        <div class="d-none d-md-block col-12 col-md-4">
            <div class="card">
                <div class="py-3 border-0 card-header">
                    <i class="p-1 fas fa-inbox fs-5 text-info"></i>
                    Conversations</div>
                <div class="card-body">
                    @forelse($conversations ?? [] as $conversation)
                        <a href="{{ route('conversations.show', $conversation) }}" class="p-2 d-block">
                            {{ $conversation->name ?? $conversation->users->where('id', '!=', auth()->id())->pluck('name')->join(', ') }}
                            @if($conversation->latestMessage)
                                <small class="text-muted d-block">{{ Str::limit($conversation->latestMessage->body, 30) }}</small>
                            @endif
                        </a>
                    @empty
                        <p>No conversations yet.</p>
                    @endforelse
                </div>
            </div>
        </div>
        <div class="col-12 col-md-8 col-lg-8">
            @yield('conversation-content')
        </div>
    </div>
</div>
@endsection
