<?php

use App\Http\Controllers\Api\AuthController;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\RoomController;

Route::prefix('auth')->group(function () {
    Route::post('/register', [AuthController::class, 'register']);
    Route::post('/login',    [AuthController::class, 'login']);

    Route::middleware('auth:api')->group(function () {
        Route::post('/logout', [AuthController::class, 'logout']);
        Route::get('/me',      [AuthController::class, 'me']);
        Route::put('/profile', [AuthController::class, 'updateProfile']);
    });
});

Route::middleware('auth:api')->group(function () {
    Route::post('/rooms',              [RoomController::class, 'create']);
    Route::get('/rooms/history', [RoomController::class, 'history']);
    Route::post('/rooms/{code}/join',  [RoomController::class, 'join']);
    Route::post('/rooms/{code}/leave', [RoomController::class, 'leave']);
    Route::get('/rooms/{code}',        [RoomController::class, 'show']);

});
