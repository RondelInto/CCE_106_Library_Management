<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;

class PingController extends Controller
{
    /**
     * Simple health-check style endpoint so the frontend/mobile apps
     * have something to hit right away: GET /api/ping
     */
    public function __invoke(): JsonResponse
    {
        return response()->json([
            'message' => 'pong',
            'time' => now()->toIso8601String(),
        ]);
    }
}
