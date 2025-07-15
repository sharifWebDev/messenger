<!-- resources/views/conversations/index.blade.php -->
@extends('layouts.app2')

@section('content')
<div class="container">
    <div class="row">
        <div class="col-md-4">
            <div class="card">
                <div class="card-header">Conversations</div>
                <div class="card-body">
                    @foreach($conversations ?? [] as $conversation)
                        <a href="{{ route('conversations.show', $conversation) }}" class="p-2 d-block">
                            {{ $conversation->name ?? $conversation->users->where('id', '!=', auth()->id())->pluck('name')->join(', ') }}
                            @if($conversation->latestMessage)
                                <small class="text-muted d-block">{{ Str::limit($conversation->latestMessage->body, 30) }}</small>
                            @endif
                        </a>
                    @endforeach
                </div>
            </div>
        </div>
        <div class="col-md-8">
            @yield('conversation-content')
        </div>
    </div>
</div>
@endsection
