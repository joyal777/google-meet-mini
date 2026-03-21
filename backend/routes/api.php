<?php

use App\Http\Controllers\Api\AuthController;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\RoomController;
use App\Http\Controllers\Api\MessageController;

Route::prefix('auth')->group(function () {
    Route::post('/register', [AuthController::class, 'register']);
    Route::post('/login',    [AuthController::class, 'login']);
});

Route::middleware('auth:api')->group(function () {
    // Auth
    Route::post('/auth/logout',  [AuthController::class, 'logout']);
    Route::get('/auth/me',       [AuthController::class, 'me']);
    Route::put('/auth/profile',  [AuthController::class, 'updateProfile']);

    // Rooms
    Route::post('/rooms',              [RoomController::class, 'create']);
    Route::get('/rooms/history',       [RoomController::class, 'history']);
    Route::post('/rooms/{code}/join',  [RoomController::class, 'join']);
    Route::post('/rooms/{code}/leave', [RoomController::class, 'leave']);
    Route::get('/rooms/{code}',        [RoomController::class, 'show']);

    // Messages
    Route::get('/rooms/{code}/messages',  [MessageController::class, 'index']);
    Route::post('/rooms/{code}/messages', [MessageController::class, 'store']);
});
