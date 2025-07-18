<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\CallController;
use App\Http\Controllers\HomeController;
use Illuminate\Support\Facades\Broadcast;
use App\Http\Controllers\MessageController;
use App\Http\Controllers\ConversationController;


Route::middleware(['auth'])->group(function () {
    Broadcast::routes();
});


Route::get('/', function () {
    return view('welcome');
});

// routes/web.php

Route::middleware(['auth'])->group(function () {
    // Home routes
    Route::get('/home', [HomeController::class, 'index'])->name('home');
    Route::get('/search-users', [HomeController::class, 'searchUsers'])->name('home.search');
    Route::get('/unread-count', [HomeController::class, 'unreadCount'])->name('home.unread-count');
    Route::post('/mark-as-read', [HomeController::class, 'markAsRead'])->name('home.mark-as-read');

    // Conversations
    Route::get('/conversations', [ConversationController::class, 'index'])->name('conversations.index');
    Route::post('/conversations', [ConversationController::class, 'store'])->name('conversations.store');
    Route::get('/conversations/{conversation}', [ConversationController::class, 'show'])->name('conversations.show');

    // Messages
    Route::post('/messages', [MessageController::class, 'store'])->name('messages.store');

    // Calls
    Route::post('/calls', [CallController::class, 'store'])->name('calls.store');
    Route::post('/calls/{call}/answer', [CallController::class, 'answer'])->name('calls.answer');
    Route::post('/calls/{call}/end', [CallController::class, 'end'])->name('calls.end');
});


// routes/web.php
Route::post('/broadcast-signal', [CallController::class, 'broadcastSignal']);
Route::post('/debug-log', [CallController::class, 'broadcastSignal']);

// routes/api.php
Route::middleware(['auth'])
->post('/debug-log', function(Request $request) {
    $logged = json_encode([
        'user_id' => $request->user_id,
        'conversation_id' => $request->conversation_id,
        'message' => $request->message,
        'timestamp' => $request->timestamp
    ]);
    return response()->json(['status' => 'logged']);
});

Route::middleware([
    'auth:sanctum',
    config('jetstream.auth_session'),
    'verified',
])->group(function () {
    Route::get('/dashboard', function () {
        return view('dashboard');
    })->name('dashboard');
});
