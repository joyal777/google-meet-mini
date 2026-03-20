<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Room;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class RoomController extends Controller
{
    public function create(Request $request)
    {
        $user = auth()->user();

        Room::where('host_id', $user->id)
            ->where('is_active', true)
            ->update(['is_active' => false]);

        $participants = [[
            'id'    => (string) $user->id,
            'name'  => $user->name,
            'email' => $user->email,
        ]];

        $room = new Room();
        $room->room_code    = strtolower(\Str::random(8));
        $room->host_id      = (string) $user->id;
        $room->host_name    = $user->name;
        $room->participants = $participants;
        $room->is_active    = true;
        $room->save();

        return response()->json([
            'room' => array_merge($room->toArray(), ['participants' => $participants]),
            'host' => $user,
        ], 201);
    }

    public function join(Request $request, $roomCode)
    {
        $user = auth()->user();
        $room = Room::where('room_code', $roomCode)
                    ->where('is_active', true)
                    ->first();

        if (!$room) {
            return response()->json(['message' => 'Room not found or inactive'], 404);
        }

        // Current active participants
        $participants = is_string($room->participants)
            ? json_decode($room->participants, true) ?? []
            : ($room->participants ?? []);

        // All time participants (for history)
        $allParticipants = is_string($room->all_participants)
            ? json_decode($room->all_participants, true) ?? []
            : ($room->all_participants ?? []);

        $newParticipant = [
            'id'    => (string) $user->id,
            'name'  => $user->name,
            'email' => $user->email,
        ];

        // Add to active participants if not already there
        if (!collect($participants)->contains('id', (string) $user->id)) {
            $participants[] = $newParticipant;
            $room->participants = $participants;
        }

        // Add to all_participants if not already there (permanent record)
        if (!collect($allParticipants)->contains('id', (string) $user->id)) {
            $allParticipants[] = $newParticipant;
            $room->all_participants = $allParticipants;
        }

        $room->save();

        $host = $room->host;

        return response()->json([
            'room'    => array_merge($room->toArray(), [
                'participants'     => $participants,
                'all_participants' => $allParticipants,
            ]),
            'host'    => $host,
            'is_host' => (string) $room->host_id === (string) $user->id,
        ]);
    }

    public function leave(Request $request, $roomCode)
    {
        $user = auth()->user();
        $room = Room::where('room_code', $roomCode)->first();

        if (!$room) {
            return response()->json(['message' => 'Room not found'], 404);
        }

        $isHost = (string) $room->host_id === (string) $user->id;

        if ($isHost) {
            // Just mark inactive — keep participants for history
            $room->update(['is_active' => false]);
        } else {
            $participants = is_string($room->participants)
                ? json_decode($room->participants, true)
                : ($room->participants ?? []);

            $participants = collect($participants)
                ->filter(fn($p) => $p['id'] !== (string) $user->id)
                ->values()
                ->toArray();

            $room->update(['participants' => $participants]);
        }

        return response()->json([
            'message' => $isHost ? 'Room ended' : 'Left room',
            'is_host' => $isHost,
        ]);
    }

    public function show($roomCode)
    {
        $room = Room::where('room_code', $roomCode)->first();

        if (!$room) {
            return response()->json(['message' => 'Room not found'], 404);
        }

        $host = $room->host;

        return response()->json([
            'room' => $room,
            'host' => $host,
            'participants' => $room->participants,
        ]);
    }

   public function history()
    {
        $user = auth()->user();

        $allRooms = Room::orderBy('created_at', 'desc')->get();

        $rooms = $allRooms->filter(function ($room) use ($user) {
            $allParticipants = is_string($room->all_participants)
                ? json_decode($room->all_participants, true) ?? []
                : ($room->all_participants ?? []);

            $participants = is_string($room->participants)
                ? json_decode($room->participants, true) ?? []
                : ($room->participants ?? []);

            $isHost = (string) $room->host_id === (string) $user->id;
            $inAll  = collect($allParticipants)->contains('id', (string) $user->id);
            $inCurr = collect($participants)->contains('id', (string) $user->id);

            return $isHost || $inAll || $inCurr;
        })
        ->map(function ($room) {
            $allParticipants = is_string($room->all_participants)
                ? json_decode($room->all_participants, true) ?? []
                : ($room->all_participants ?? []);

            // Fallback to participants if all_participants is empty
            if (empty($allParticipants)) {
                $allParticipants = is_string($room->participants)
                    ? json_decode($room->participants, true) ?? []
                    : ($room->participants ?? []);
            }

            return [
                'room_code'        => $room->room_code,
                'host_name'        => $room->host_name,
                'host_id'          => (string) $room->host_id,
                'is_active'        => $room->is_active,
                'all_participants' => $allParticipants,
                'created_at'       => $room->created_at,
            ];
        })
        ->take(10)
        ->values();

        return response()->json($rooms);
    }
}
