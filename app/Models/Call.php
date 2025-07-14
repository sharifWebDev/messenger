<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Call extends Model
{
    protected $fillable = ['conversation_id', 'caller_id', 'type', 'started_at', 'ended_at', 'status'];

    public function conversation()
    {
        return $this->belongsTo(Conversation::class);
    }

    public function caller()
    {
        return $this->belongsTo(User::class, 'caller_id');
    }
}
