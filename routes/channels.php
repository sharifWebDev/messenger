<?php

use Illuminate\Support\Facades\Broadcast;

/*
|--------------------------------------------------------------------------
| Broadcast Channels
|--------------------------------------------------------------------------
|
| Here you may register all of the event broadcasting channels that your
| application supports. The given channel authorization callbacks are
| used to check if an authenticated user can listen to the channel.
|
*/

// Broadcast::channel('conversation.{conversationId}', function ($user, $conversationId) {
//     return $user->conversations()->where('conversations.id', $conversationId)->exists();
// });

// routes/channels.php
Broadcast::channel('conversation.{conversationId}', function ($user, $conversationId) {
    return $user->conversations->contains($conversationId);
});

Broadcast::channel('chat.{id}', function ($user, $id) {
    return true;
});

Broadcast::channel('user.{userId}', function ($user, $userId) {
    return (int) $user->id === (int) $userId;
});
