<?php

namespace App\Http\Controllers;

use App\Models\Conversation;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class HomeController extends Controller
{
    /**
     * Create a new controller instance.
     *
     * @return void
     */
    

    /**
     * Show the application dashboard.
     *
     * @return \Illuminate\Contracts\Support\Renderable
     */
    public function index()
    {
        // Get the authenticated user
        $user = Auth::user();

        // Get the user's conversations with their latest message and participants
        $conversations = $user->conversations()
            ->with(['latestMessage', 'users' => function ($query) use ($user) {
                $query->where('users.id', '!=', $user->id);
            }])
            ->orderByDesc(function ($query) {
                $query->select('created_at')
                    ->from('messages')
                    ->whereColumn('conversation_id', 'conversations.id')
                    ->latest()
                    ->limit(1);
            })
            ->get();

        // Get suggested contacts (users not in any conversation with the current user)
        $suggestedContacts = User::where('id', '!=', $user->id)
            ->whereDoesntHave('conversations', function ($query) use ($user) {
                $query->whereHas('users', function ($q) use ($user) {
                    $q->where('users.id', $user->id);
                });
            })
            ->inRandomOrder()
            ->limit(5)
            ->get();

        return view('home', [
            'conversations' => $conversations,
            'suggestedContacts' => $suggestedContacts,
        ]);
    }

    /**
     * Search for users to start a new conversation
     *
     * @return \Illuminate\Http\JsonResponse
     */
    public function searchUsers(Request $request)
    {
        $request->validate([
            'query' => 'required|string|min:2',
        ]);

        $users = User::where('id', '!=', Auth::id())
            ->where(function ($query) use ($request) {
                $query->where('name', 'LIKE', '%'.$request->query.'%')
                    ->orWhere('email', 'LIKE', '%'.$request->query.'%');
            })
            ->limit(10)
            ->get();

        return response()->json($users);
    }

    /**
     * Get unread message count
     *
     * @return \Illuminate\Http\JsonResponse
     */
    public function unreadCount()
    {
        $count = Auth::user()->unreadMessages()->count();

        return response()->json(['count' => $count]);
    }

    /**
     * Mark messages as read
     *
     * @return \Illuminate\Http\JsonResponse
     */
    public function markAsRead(Request $request)
    {
        $request->validate([
            'conversation_id' => 'required|exists:conversations,id',
        ]);

        Auth::user()->unreadMessages()
            ->where('conversation_id', $request->conversation_id)
            ->update(['read_at' => now()]);

        return response()->json(['success' => true]);
    }
}
