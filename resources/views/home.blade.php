<!-- resources/views/home.blade.php -->
@extends('layouts.app2')

@section('content')
    <div class="container">
        <div class="row justify-content-center">
            <div class="col-md-4">
                <div class="card">
                    <div class="card-header d-flex justify-content-between align-items-center">
                        <span>Conversations</span>
                        <button class="btn btn-sm btn-primary" data-bs-toggle="modal" data-bs-target="#newConversationModal">
                            <i class="fas fa-plus"></i> New
                        </button>
                    </div>

                    <div class="card-body p-0">
                        <div class="list-group list-group-flush">
                            @foreach ($conversations as $conversation)
                                <a href="{{ route('conversations.show', $conversation) }}"
                                    class="list-group-item list-group-item-action d-flex justify-content-between align-items-center
                                      {{ request()->is('conversations/' . $conversation->id) ? 'active' : '' }}">
                                    <div>
                                        <strong>
                                            {{ $conversation->name ?? $conversation->users->pluck('name')->join(', ') }}
                                        </strong>
                                        @if ($conversation->latestMessage)
                                            <div class="text-muted text-truncate" style="max-width: 200px;">
                                                {{ $conversation->latestMessage->body }}
                                            </div>
                                        @endif
                                    </div>
                                    @if (auth()->user()->hasUnreadMessages($conversation->id))
                                        <span class="badge bg-primary rounded-pill">!</span>
                                    @endif
                                </a>
                            @endforeach
                        </div>
                    </div>
                </div>

                <div class="card mt-3">
                    <div class="card-header">Suggested Contacts</div>
                    <div class="card-body">
                        @foreach ($suggestedContacts as $contact)
                            <div class="d-flex align-items-center mb-2">
                                <div class="flex-grow-1">
                                    {{ $contact->name }}
                                </div>
                                <button class="btn btn-sm btn-outline-primary start-conversation"
                                    data-user-id="{{ $contact->id }}">
                                    <i class="fas fa-comment"></i>
                                </button>
                            </div>
                        @endforeach
                    </div>
                </div>
            </div>

            <div class="col-md-8">
                @if (isset($activeConversation))
                    @include('conversations.show', ['conversation' => $activeConversation])
                @else
                    <div class="card">
                        <div class="card-body text-center py-5">
                            <h4>Welcome to Messenger</h4>
                            <p class="text-muted">Select a conversation or start a new one</p>
                        </div>
                    </div>
                @endif
            </div>
        </div>
    </div>

    <!-- New Conversation Modal -->
    <div class="modal fade" id="newConversationModal" tabindex="-1" aria-hidden="true">
        <div class="modal-dialog">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title">New Conversation</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body">
                    <div class="mb-3">
                        <label class="form-label">Search Contacts</label>
                        <input type="text" class="form-control" id="searchContacts"
                            placeholder="Type a name or email...">
                    </div>
                    <div id="searchResults" class="list-group"></div>
                </div>
            </div>
        </div>
    </div>

@section('scripts')
    <script>
        $(document).ready(function() {
            // Search users
            $('#searchContacts').on('input', function() {
                const query = $(this).val();
                if (query.length < 2) {
                    $('#searchResults').empty();
                    return;
                }

                $.ajax({
                    url: '{{ route('home.search') }}',
                    method: 'GET',
                    data: {
                        query: query
                    },
                    success: function(response) {
                        $('#searchResults').empty();
                        if (response.length === 0) {
                            $('#searchResults').append(
                                '<div class="list-group-item">No users found</div>'
                            );
                        } else {
                            response.forEach(function(user) {
                                $('#searchResults').append(`
                                <div class="list-group-item d-flex justify-content-between align-items-center">
                                    <span>${user.name} (${user.email})</span>
                                    <button class="btn btn-sm btn-primary start-conversation"
                                            data-user-id="${user.id}">
                                        Start Chat
                                    </button>
                                </div>
                            `);
                            });
                        }
                    }
                });
            });

            // Start new conversation
            $(document).on('click', '.start-conversation', function() {
                const userId = $(this).data('user-id');

                $.ajax({
                    url: '{{ route('conversations.store') }}',
                    method: 'POST',
                    data: {
                        user_ids: [userId],
                        _token: '{{ csrf_token() }}'
                    },
                    success: function(response) {
                        window.location.href = response.redirect;
                    },
                    error: function(xhr) {
                        alert('Error starting conversation');
                    }
                });
            });

            // Check for unread messages periodically
            function checkUnreadMessages() {
                $.get('{{ route('home.unread-count') }}', function(response) {
                    if (response.count > 0) {
                        $('#unreadCountBadge').text(response.count).show();
                    } else {
                        $('#unreadCountBadge').hide();
                    }
                });
            }

            setInterval(checkUnreadMessages, 30000); // Check every 30 seconds
            checkUnreadMessages(); // Initial check
        });
    </script>
@endsection
@endsection
