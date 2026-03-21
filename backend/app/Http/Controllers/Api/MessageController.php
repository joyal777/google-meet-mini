<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Message;
use Illuminate\Http\Request;

class MessageController extends Controller
{
    public function index($roomCode)
    {
        $messages = Message::where('room_code', $roomCode)
            ->orderBy('created_at', 'asc')
            ->get();
        return response()->json($messages);
    }

    public function store(Request $request, $roomCode)
    {
        $user = auth()->user();
        $request->validate(['message' => 'required|string|max:500']);

        $message = Message::create([
            'room_code' => $roomCode,
            'user_id'   => (string) $user->id,
            'user_name' => $user->name,
            'message'   => $request->message,
        ]);

        return response()->json($message, 201);
    }
}
