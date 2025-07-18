<?php
// app/Events/CallSignal.php
namespace App\Events;

use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class CallSignal implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public $conversationId;
    public $senderId;
    public $targetUserId;
    public $signal;
    public $callId;

    public function __construct($conversationId, $senderId, $targetUserId, $signal, $callId)
    {
        $this->conversationId = $conversationId;
        $this->senderId = $senderId;
        $this->targetUserId = $targetUserId;
        $this->signal = $signal;
        $this->callId = $callId;
    }

    public function broadcastOn()
    {
        return new PrivateChannel('user.'.$this->targetUserId);
    }

    public function broadcastWith()
    {
        return [
            'conversation_id' => $this->conversationId,
            'sender_id' => $this->senderId,
            'signal' => $this->signal,
            'call_id' => $this->callId,
            'timestamp' => now()->toDateTimeString()
        ];
    }
}
