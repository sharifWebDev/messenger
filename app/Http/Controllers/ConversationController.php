<?php

namespace App\Http\Controllers;

use App\Models\Conversation;
use Illuminate\Http\Request;

class ConversationController extends Controller
{
    // app/Http/Controllers/ConversationController.php
    public function index()
    {
        $conversations = auth()->user()->conversations()->with(['users', 'latestMessage'])->get();

        return view('conversations.index', compact('conversations'));
    }

    public function store(Request $request)
    {
        $request->validate([
            'user_ids' => 'required|array',
            'user_ids.*' => 'exists:users,id',
        ]);

        $users = collect($request->user_ids)->push(auth()->id())->unique();

        $conversation = Conversation::whereHas('users', function ($query) use ($users) {
            $query->whereIn('user_id', $users);
        }, '=', $users->count())->first();

        if (! $conversation) {
            $conversation = Conversation::create();
            $conversation->users()->attach($users);
        }

        return redirect()->route('conversations.show', $conversation);
    }

    public function show(Conversation $conversation)
    {
        if (!$conversation->users->contains(auth()->id())) {
        abort(403);
    }

        // $messages = $conversation->messages()->with('user')->latest()->paginate(20);

        $messages = $conversation->messages()->with('user')->latest()->paginate(20);


        return view('conversations.show', compact('conversation', 'messages'));
    }
}
