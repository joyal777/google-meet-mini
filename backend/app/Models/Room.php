<?php

namespace App\Models;

use MongoDB\Laravel\Eloquent\Model;
use MongoDB\Laravel\Relations\BelongsTo;

class Room extends Model
{
    protected $connection = 'mongodb';
    protected $collection = 'rooms';

    protected $fillable = [
        'room_code',
        'host_id',
        'host_name',
        'participants',
        'is_active',
        'all_participants',
    ];

    protected $casts = [
        'is_active'    => 'boolean',
    ];

    // Room belongs to a host (User)
    public function host(): BelongsTo
    {
        return $this->belongsTo(User::class, 'host_id');
    }
}
