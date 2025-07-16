<?php

namespace App\Events;

use App\Models\Message;
use App\Http\Resources\MessageResource;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PresenceChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class MessageSent implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public $message;

    public function __construct(Message $message)
    {
        $message->load('user'); // 👈 Eager load user to prevent N+1 issues
        $this->message = new MessageResource($message); // 👈 Wrap with resource
    }

    /**
     * Broadcast to presence channel like: presence-conversation.1
     */
    public function broadcastOn()
    {
        return new PresenceChannel('conversation.' . $this->message->conversation_id);
    }

    // /**
    //  * Optional: alias for event name (frontend will listen for this)
    //  */
    // public function broadcastAs()
    // {
    //     return 'message.sent';
    // }

    // /**
    //  * Data sent with the broadcast (as array)
    //  */
    // public function broadcastWith()
    // {
    //     return $this->message->toArray(request());
    // }
}
