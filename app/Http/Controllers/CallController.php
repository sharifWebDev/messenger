<?php

// app/Http/Controllers/CallController.php
namespace App\Http\Controllers;

use App\Models\Call;
use App\Events\CallEnded;
use App\Events\CallSignal;
use App\Events\CallStarted;
use App\Events\CallAnswered;
use App\Models\Conversation;
use Illuminate\Http\Request;
use App\Http\Resources\CallResource;
use Illuminate\Support\Facades\Log;

class CallController extends Controller
{
    public function store(Request $request)
    {
        $request->validate([
            'conversation_id' => 'required|exists:conversations,id',
            'type' => 'required|in:audio,video',
        ]);

        $conversation = Conversation::with('users')->findOrFail($request->conversation_id);

        $call = $conversation->calls()->create([
            'caller_id' => auth()->id(),
            'conversation_id' => $request->conversation_id,
            'type' => $request->type,
            'status' => 'calling',
        ]);

        Log::info('Call initiated', [
            'call_id' => $call->id,
            'type' => $call->type,
            'caller' => auth()->id(),
            'conversation' => $request->conversation_id
        ]);

        broadcast(new CallStarted($call))->toOthers();

        return response()->json(new CallResource($call->load('conversation.users')));
    }

    public function answer(Call $call)
    {
        $call->update([
            'status' => 'in-progress',
            'started_at' => now(),
            'callee_id' => auth()->id(),
        ]);

        Log::info('Call answered', [
            'call_id' => $call->id,
            'callee' => auth()->id()
        ]);

        broadcast(new CallAnswered($call))->toOthers();

        return response()->json(new CallResource($call->load('conversation.users')));
    }

    public function end(Call $call)
    {
        $call->update([
            'status' => 'completed',
            'ended_at' => now(),
        ]);

        Log::info('Call ended', [
            'call_id' => $call->id,
            'duration' => $call->started_at ? now()->diffInSeconds($call->started_at) : 0
        ]);

        broadcast(new CallEnded($call))->toOthers();

        return response()->json(new CallResource($call->load('conversation.users')));
    }

    public function broadcastSignal(Request $request)
    {
        $request->validate([
            'conversation_id' => 'required|exists:conversations,id',
            'signal' => 'required|array',
            'target_user_id' => 'nullable|exists:users,id',
            'call_id' => 'required|exists:calls,id',
        ]);

        $conversation = Conversation::findOrFail($request->conversation_id);
        $targetUserId = $request->target_user_id ?? $conversation->users
            ->where('id', '!=', auth()->id())
            ->pluck('id')
            ->first();

        Log::debug('WebRTC signal broadcast', [
            'from' => auth()->id(),
            'to' => $targetUserId,
            'call_id' => $request->call_id,
            'signal_type' => $request->signal['type'] ?? 'unknown'
        ]);

        broadcast(new CallSignal(
            $request->conversation_id,
            auth()->id(),
            $targetUserId,
            $request->signal,
            $request->call_id
        ))->toOthers();

        return response()->json(['status' => 'success']);
    }
}
