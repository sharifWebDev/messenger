<?php

namespace App\Http\Controllers;

use App\Events\MessageSent;
use App\Models\Conversation;
use Illuminate\Http\Request;
use App\Http\Resources\MessageResource;

class MessageController extends Controller
{
    // app/Http/Controllers/MessageController.php
    public function store(Request $request)
    {
        $request->validate([
            'conversation_id' => 'required|exists:conversations,id',
            'body' => 'required|string',
        ]);

        $conversation = Conversation::with('users:id,name')->findOrFail($request->conversation_id);

        if (!$conversation->users->contains(auth()->id())) {
            abort(403);
        }

        $message = $conversation->messages()->create([
            'user_id' => auth()->id(),
            'body' => $request->body
        ]);

        broadcast(new MessageSent($message))->toOthers();

        $message = new MessageResource($message);

        return response()->json($message);
    }
}
