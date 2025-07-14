<?php

namespace App\Http\Controllers;

use App\Events\CallAnswered;
use App\Events\CallEnded;
use App\Events\CallSignal;
use App\Events\CallStarted;
use App\Models\Call;
use App\Models\Conversation;
use Illuminate\Http\Request;

class CallController extends Controller
{
    // app/Http/Controllers/CallController.php
    public function store(Request $request)
    {
        $request->validate([
            'conversation_id' => 'required|exists:conversations,id',
            'type' => 'required|in:audio,video',
        ]);

        $conversation = Conversation::findOrFail($request->conversation_id);
        $this->authorize('view', $conversation);

        $call = $conversation->calls()->create([
            'caller_id' => auth()->id(),
            'type' => $request->type,
            'status' => 'calling',
        ]);

        broadcast(new CallStarted($call))->toOthers();

        return response()->json($call);
    }

    public function answer(Call $call)
    {
        $this->authorize('view', $call->conversation);

        $call->update([
            'status' => 'in-progress',
            'started_at' => now(),
        ]);

        broadcast(new CallAnswered($call))->toOthers();

        return response()->json($call);
    }

    public function end(Call $call)
    {
        $this->authorize('view', $call->conversation);

        $call->update([
            'status' => 'completed',
            'ended_at' => now(),
        ]);

        broadcast(new CallEnded($call))->toOthers();

        return response()->json($call);
    }

    // app/Http/Controllers/CallController.php
    public function broadcastSignal(Request $request)
    {
        $request->validate([
            'conversation_id' => 'required|exists:conversations,id',
            'signal' => 'required|array',
            'target_user_id' => 'nullable|exists:users,id',
        ]);

        $conversation = Conversation::findOrFail($request->conversation_id);
        $this->authorize('view', $conversation);

        $targetUserId = $request->target_user_id ?? $conversation->users->where('id', '!=', auth()->id())->pluck('id')->first();

        broadcast(new CallSignal(
            $conversation->id,
            auth()->id(),
            $targetUserId,
            $request->signal
        ))->toOthers();

        return response()->json(['status' => 'success']);
    }
}
