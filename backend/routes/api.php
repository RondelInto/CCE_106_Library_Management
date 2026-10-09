<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\BookController;
use App\Http\Controllers\LibraryController;
use App\Http\Controllers\PingController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
|
| These routes are loaded by bootstrap/app.php and all of them are
| assigned to the "api" middleware group. Consumed by the React
| frontend and the React Native mobile app.
|
*/

Route::get('/ping', PingController::class);
Route::post('/login', [AuthController::class, 'login']);
Route::get('/genres', [LibraryController::class, 'genres']);

// Books resource — full REST CRUD
// GET    /api/books          -> index
// GET    /api/books/{book}   -> show
// POST   /api/books          -> store
// PUT    /api/books/{book}   -> update
// DELETE /api/books/{book}   -> destroy
Route::get('/books', [BookController::class, 'index']);
Route::get('/books/{id}', [BookController::class, 'show']);

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/user', function (Request $request) {
        return $request->user();
    });

    Route::post('/logout', [AuthController::class, 'logout']);
    Route::put('/user/password', [AuthController::class, 'updatePassword']);
    Route::get('/library', [LibraryController::class, 'memberLibrary']);
    Route::post('/requests', [LibraryController::class, 'requestBook']);
    Route::post('/loans/{id}/extensions', [LibraryController::class, 'requestExtension']);
    Route::post('/penalty-receipts', [LibraryController::class, 'createPenaltyReceipt']);
    Route::post('/penalty-receipts/{id}/photo', [LibraryController::class, 'submitPenaltyReceiptPhoto']);
    Route::get('/penalty-receipts/{id}/photo', [LibraryController::class, 'penaltyReceiptPhoto']);

    Route::middleware('can:manage-library')->group(function () {
        Route::post('/books', [BookController::class, 'store']);
        Route::post('/genres', [LibraryController::class, 'createGenre']);
        Route::put('/genres', [LibraryController::class, 'updateGenre']);
        Route::delete('/genres', [LibraryController::class, 'deleteGenre']);
        Route::put('/books/{id}', [BookController::class, 'update']);
        Route::patch('/books/{id}', [BookController::class, 'update']);
        Route::delete('/books/{id}', [BookController::class, 'destroy']);
        Route::get('/admin/library', [LibraryController::class, 'adminLibrary']);
        Route::post('/admin/members', [LibraryController::class, 'registerMember']);
        Route::put('/admin/members/{id}', [LibraryController::class, 'updateMember']);
        Route::post('/admin/requests/{id}/approve', [LibraryController::class, 'approveRequest']);
        Route::post('/admin/requests/{id}/reject', [LibraryController::class, 'rejectRequest']);
        Route::post('/admin/extensions/{id}/approve', [LibraryController::class, 'approveExtension']);
        Route::post('/admin/extensions/{id}/decline', [LibraryController::class, 'declineExtension']);
        Route::post('/admin/loans/{id}/return', [LibraryController::class, 'confirmReturn']);
        Route::post('/admin/penalty-receipts/{id}/confirm', [LibraryController::class, 'confirmPayment']);
        Route::post('/admin/penalty-receipts/{id}/decline', [LibraryController::class, 'declinePayment']);
    });
});
