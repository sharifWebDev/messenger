<?php

namespace App\Events;

use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

// app/Events/CallSignal.php
class CallSignal implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public $conversationId;

    public $senderId;

    public $targetUserId;

    public $signal;

    public function __construct($conversationId, $senderId, $targetUserId, $signal)
    {
        $this->conversationId = $conversationId;
        $this->senderId = $senderId;
        $this->targetUserId = $targetUserId;
        $this->signal = $signal;
    }

    public function broadcastOn()
    {
        return new PrivateChannel('user.'.$this->targetUserId);
    }
}
