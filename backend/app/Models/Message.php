<?php

namespace App\Models;

use MongoDB\Laravel\Eloquent\Model;

class Message extends Model
{
    protected $connection = 'mongodb';
    protected $collection = 'messages';

    protected $fillable = [
        'room_code',
        'user_id',
        'user_name',
        'message',
    ];
}
