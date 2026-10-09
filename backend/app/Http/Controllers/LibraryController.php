<?php

namespace App\Http\Controllers;

use App\Models\Book;
use App\Models\BorrowRequest;
use App\Models\Loan;
use App\Models\LoanExtension;
use App\Models\PenaltyReceipt;
use App\Models\User;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class LibraryController extends Controller
{
    public function memberLibrary(Request $request): JsonResponse
    {
        $user = $request->user();
        $user->setAttribute('outstanding_penalty_total', $this->outstandingPenaltyTotal($user));

        return response()->json([
            'user' => $user,
            'books' => Book::query()->orderBy('title')->get(),
            'requests' => BorrowRequest::with(['book', 'loan'])->where('user_id', $user->id)->latest()->get(),
            'loans' => Loan::with(['book', 'extensions' => fn ($query) => $query->latest()])->where('user_id', $user->id)->whereNull('returned_at')->latest()->get(),
            'payments' => PenaltyReceipt::where('user_id', $user->id)->latest()->get(),
            'genres' => DB::table('genres')->orderBy('name')->pluck('name'),
        ]);
    }

    public function adminLibrary(Request $request): JsonResponse
    {
        $this->authorizeAdmin();
        $users = User::with(['loans' => fn ($query) => $query->whereNull('returned_at')->whereDate('due_date', '<', today())])
            ->orderBy('name')
            ->get();
        $users->each(fn (User $user) => $user->setAttribute('outstanding_penalty_total', $this->outstandingPenaltyTotal($user, $user->loans)));

        return response()->json([
            'user' => $request->user(),
            'users' => $users,
            'books' => Book::query()->orderBy('title')->get(),
            'requests' => BorrowRequest::with(['user', 'book', 'loan'])->latest()->get(),
            'loans' => Loan::with(['user', 'book', 'extensions' => fn ($query) => $query->latest()])->whereNull('returned_at')->latest()->get(),
            'payments' => PenaltyReceipt::with('user')->latest()->get(),
            'genres' => DB::table('genres')->orderBy('name')->pluck('name'),
        ]);
    }

    public function requestBook(Request $request): JsonResponse
    {
        $validated = $request->validate(['book_id' => ['required', 'integer', 'exists:books,id']]);
        $user = $request->user();

        $hasOpenRequest = BorrowRequest::where('user_id', $user->id)
            ->where('book_id', $validated['book_id'])
            ->whereIn('status', ['pending', 'approved'])
            ->exists();

        if ($hasOpenRequest) {
            return response()->json(['message' => 'You already have an open request for this book.'], 422);
        }

        $borrowRequest = BorrowRequest::create([
            'user_id' => $user->id,
            'book_id' => $validated['book_id'],
        ]);

        return response()->json([
            'message' => 'Borrow request submitted.',
            'data' => $borrowRequest->load(['user', 'book']),
        ], 201);
    }

    public function approveRequest(Request $request, int $id): JsonResponse
    {
        $this->authorizeAdmin();
        $validated = $request->validate([
            'due_date' => ['nullable', 'date', 'after_or_equal:today'],
        ]);

        $loan = DB::transaction(function () use ($id, $validated) {
            $borrowRequest = BorrowRequest::with('book')->lockForUpdate()->findOrFail($id);
            abort_unless($borrowRequest->status === 'pending', 422, 'Only pending requests can be approved.');

            $book = Book::lockForUpdate()->findOrFail($borrowRequest->book_id);
            abort_unless($book->available_quantity > 0, 422, 'No copies of this book are currently available.');

            $book->decrement('available_quantity');
            $borrowRequest->update(['status' => 'approved', 'approved_at' => now()]);

            return Loan::create([
                'borrow_request_id' => $borrowRequest->id,
                'user_id' => $borrowRequest->user_id,
                'book_id' => $book->id,
                'due_date' => $validated['due_date'] ?? today()->addDays(10),
            ]);
        });

        return response()->json(['message' => 'Request approved and loan created.', 'data' => $loan->load(['user', 'book'])]);
    }

    public function rejectRequest(Request $request, int $id): JsonResponse
    {
        $this->authorizeAdmin();
        $borrowRequest = BorrowRequest::findOrFail($id);
        abort_unless($borrowRequest->status === 'pending', 422, 'Only pending requests can be rejected.');
        $validated = $request->validate([
            'reason' => ['required', 'string', 'min:5', 'max:1000'],
        ]);
        $borrowRequest->update(['status' => 'rejected', 'rejection_reason' => trim($validated['reason'])]);

        return response()->json(['message' => 'Borrow request declined with a notice.', 'data' => $borrowRequest]);
    }

    public function requestExtension(Request $request, int $id): JsonResponse
    {
        $validated = $request->validate(['reason' => ['required', 'string', 'min:5', 'max:1000']]);
        $loan = Loan::where('user_id', $request->user()->id)->whereNull('returned_at')->findOrFail($id);
        abort_if($loan->extensions()->where('status', 'pending')->exists(), 422, 'An extension request is already awaiting review.');

        $extension = $loan->extensions()->create([
            'user_id' => $request->user()->id,
            'reason' => trim($validated['reason']),
        ]);

        return response()->json(['message' => 'Extension request sent to the library desk.', 'data' => $extension], 201);
    }

    public function approveExtension(Request $request, int $id): JsonResponse
    {
        $this->authorizeAdmin();
        $validated = $request->validate(['due_date' => ['required', 'date', 'after:today']]);
        $extension = DB::transaction(function () use ($id, $validated) {
            $extension = LoanExtension::with('loan')->lockForUpdate()->findOrFail($id);
            abort_unless($extension->status === 'pending' && $extension->loan->returned_at === null, 422, 'This extension request is no longer active.');
            abort_if($validated['due_date'] <= $extension->loan->due_date->toDateString(), 422, 'Extended due date must be later than the current due date.');
            $extension->loan->update(['due_date' => $validated['due_date']]);
            $extension->update(['status' => 'approved', 'approved_due_date' => $validated['due_date']]);

            return $extension;
        });

        return response()->json(['message' => 'Extension approved.', 'data' => $extension->fresh('loan')]);
    }

    public function declineExtension(int $id): JsonResponse
    {
        $this->authorizeAdmin();
        $extension = LoanExtension::findOrFail($id);
        abort_unless($extension->status === 'pending', 422, 'This extension request is no longer pending.');
        $extension->update(['status' => 'declined']);

        return response()->json(['message' => 'Extension request declined.', 'data' => $extension]);
    }

    public function genres(): JsonResponse
    {
        return response()->json(['data' => DB::table('genres')->orderBy('name')->pluck('name')]);
    }

    public function createGenre(Request $request): JsonResponse
    {
        $this->authorizeAdmin();
        $validated = $request->validate(['name' => ['required', 'string', 'max:100']]);
        $name = trim($validated['name']);
        abort_if($name === '', 422, 'Genre name cannot be empty.');

        $exists = DB::table('genres')->whereRaw('LOWER(name) = ?', [mb_strtolower($name)])->exists();
        abort_if($exists, 422, 'This genre already exists.');
        DB::table('genres')->insert(['name' => $name, 'created_at' => now(), 'updated_at' => now()]);

        return response()->json(['message' => 'Genre added.', 'data' => $name], 201);
    }

    public function updateGenre(Request $request): JsonResponse
    {
        $this->authorizeAdmin();
        $validated = $request->validate([
            'old_name' => ['required', 'string', 'max:100'],
            'name' => ['required', 'string', 'max:100'],
        ]);
        $oldName = trim($validated['old_name']);
        $name = trim($validated['name']);
        abort_if($oldName === '' || $name === '', 422, 'Genre names cannot be empty.');

        $genre = DB::table('genres')->whereRaw('LOWER(name) = ?', [mb_strtolower($oldName)])->first();
        abort_if(! $genre, 404, 'This genre no longer exists.');

        $duplicate = DB::table('genres')
            ->whereRaw('LOWER(name) = ?', [mb_strtolower($name)])
            ->where('id', '!=', $genre->id)
            ->exists();
        abort_if($duplicate, 422, 'This genre already exists.');

        DB::transaction(function () use ($genre, $name) {
            DB::table('genres')->where('id', $genre->id)->update(['name' => $name, 'updated_at' => now()]);
            Book::query()->whereRaw('LOWER(genre) = ?', [mb_strtolower($genre->name)])->update(['genre' => $name]);
        });

        return response()->json(['message' => 'Genre updated.', 'data' => $name]);
    }

    public function deleteGenre(Request $request): JsonResponse
    {
        $this->authorizeAdmin();
        $validated = $request->validate(['name' => ['required', 'string', 'max:100']]);
        $name = trim($validated['name']);
        abort_if($name === '', 422, 'Genre name cannot be empty.');

        $genre = DB::table('genres')->whereRaw('LOWER(name) = ?', [mb_strtolower($name)])->first();
        abort_if(! $genre, 404, 'This genre no longer exists.');

        $isInUse = Book::query()->whereRaw('LOWER(genre) = ?', [mb_strtolower($genre->name)])->exists();
        abort_if($isInUse, 422, 'This genre is assigned to one or more books. Update those books before deleting it.');

        DB::table('genres')->where('id', $genre->id)->delete();

        return response()->json(['message' => 'Genre deleted.', 'data' => $genre->name]);
    }

    public function confirmReturn(int $id): JsonResponse
    {
        $this->authorizeAdmin();

        $loan = DB::transaction(function () use ($id) {
            $loan = Loan::with('borrowRequest')->lockForUpdate()->findOrFail($id);
            abort_unless($loan->returned_at === null, 422, 'This loan has already been returned.');

            $lateDays = max(0, $loan->due_date->startOfDay()->diffInDays(today(), false));
            $penalty = max(0, round($lateDays * 2.5, 2) - (float) $loan->penalty_paid_amount);
            $loan->update(['returned_at' => today(), 'penalty_amount' => $penalty]);
            $loan->book()->increment('available_quantity');
            $loan->borrowRequest()->update(['status' => 'returned']);

            if ($penalty > 0) {
                User::whereKey($loan->user_id)->increment('penalty_balance', $penalty);
            }

            return $loan->fresh(['user', 'book']);
        });

        return response()->json(['message' => 'Return confirmed.', 'data' => $loan]);
    }

    public function createPenaltyReceipt(Request $request): JsonResponse
    {
        $receipt = DB::transaction(function () use ($request) {
            $user = User::lockForUpdate()->findOrFail($request->user()->id);
            $outstanding = $this->outstandingPenaltyTotal($user);
            abort_if($outstanding <= 0, 422, 'There is no outstanding penalty balance.');
            abort_if(
                PenaltyReceipt::where('user_id', $user->id)->whereIn('status', ['awaiting payment', 'submitted', 'declined'])->exists(),
                422,
                'An unpaid receipt already exists for this account. Submit or replace its payment photo.'
            );

            return PenaltyReceipt::create([
                'user_id' => $user->id,
                'amount' => $outstanding,
                'status' => 'awaiting payment',
            ]);
        });

        return response()->json(['message' => 'Penalty receipt created.', 'data' => $receipt], 201);
    }

    public function submitPenaltyReceiptPhoto(Request $request, int $id): JsonResponse
    {
        $validated = $request->validate([
            'receipt_photo' => ['required', 'image', 'mimes:jpg,jpeg,png,webp', 'max:5120'],
        ]);
        $receipt = PenaltyReceipt::where('user_id', $request->user()->id)->findOrFail($id);
        abort_unless(in_array($receipt->status, ['awaiting payment', 'declined'], true), 422, 'This receipt cannot accept another payment photo.');

        $path = $validated['receipt_photo']->store('penalty-receipts');
        $receipt->update([
            'receipt_image_path' => $path,
            'review_reason' => null,
            'submitted_at' => now(),
            'status' => 'submitted',
        ]);

        return response()->json(['message' => 'Payment photo submitted for review.', 'data' => $receipt->fresh()]);
    }

    public function penaltyReceiptPhoto(Request $request, int $id)
    {
        $receipt = PenaltyReceipt::findOrFail($id);
        abort_unless($request->user()->role === 'admin' || $receipt->user_id === $request->user()->id, 403);
        abort_unless($receipt->receipt_image_path && Storage::exists($receipt->receipt_image_path), 404, 'No payment photo is available.');

        return Storage::response($receipt->receipt_image_path);
    }

    public function declinePayment(Request $request, int $id): JsonResponse
    {
        $this->authorizeAdmin();
        $validated = $request->validate([
            'reason' => ['required', 'string', 'min:5', 'max:1000'],
        ]);
        $receipt = PenaltyReceipt::findOrFail($id);
        abort_unless($receipt->status === 'submitted', 422, 'Only submitted payment photos can be declined.');
        $receipt->update([
            'status' => 'declined',
            'review_reason' => trim($validated['reason']),
        ]);

        return response()->json(['message' => 'Payment photo declined with a notice.', 'data' => $receipt]);
    }

    public function confirmPayment(int $id): JsonResponse
    {
        $this->authorizeAdmin();

        $receipt = DB::transaction(function () use ($id) {
            $receipt = PenaltyReceipt::lockForUpdate()->findOrFail($id);
            abort_unless($receipt->status === 'submitted', 422, 'Only submitted payment photos can be confirmed.');
            abort_unless(
                $receipt->receipt_image_path && Storage::exists($receipt->receipt_image_path),
                422,
                'A submitted receipt must have an available payment photo before it can be confirmed.'
            );

            $user = User::lockForUpdate()->findOrFail($receipt->user_id);
            $remainingPayment = (float) $receipt->amount;
            $balancePayment = min((float) $user->penalty_balance, $remainingPayment);
            $user->penalty_balance = max(0, (float) $user->penalty_balance - $balancePayment);
            $remainingPayment -= $balancePayment;
            $user->save();

            $overdueLoans = Loan::where('user_id', $user->id)
                ->whereNull('returned_at')
                ->whereDate('due_date', '<', today())
                ->orderBy('due_date')
                ->lockForUpdate()
                ->get();
            foreach ($overdueLoans as $loan) {
                if ($remainingPayment <= 0) {
                    break;
                }

                $lateDays = max(0, (int) $loan->due_date->startOfDay()->diffInDays(today(), false));
                $unpaidPenalty = max(0, round($lateDays * 2.5, 2) - (float) $loan->penalty_paid_amount);
                $appliedPayment = min($unpaidPenalty, $remainingPayment);
                $loan->increment('penalty_paid_amount', $appliedPayment);
                $remainingPayment -= $appliedPayment;
            }

            $receipt->update(['status' => 'paid - cleared', 'confirmed_at' => now()]);

            return $receipt->fresh('user');
        });

        return response()->json(['message' => 'Payment confirmed.', 'data' => $receipt]);
    }

    private function outstandingPenaltyTotal(User $user, ?Collection $overdueLoans = null): float
    {
        $loans = $overdueLoans ?? Loan::where('user_id', $user->id)
            ->whereNull('returned_at')
            ->whereDate('due_date', '<', today())
            ->get();

        $accruedPenalties = $loans->sum(function (Loan $loan): float {
            $lateDays = max(0, (int) $loan->due_date->startOfDay()->diffInDays(today(), false));

            return max(0, round($lateDays * 2.5, 2) - (float) $loan->penalty_paid_amount);
        });

        return round((float) $user->penalty_balance + $accruedPenalties, 2);
    }

    public function registerMember(Request $request): JsonResponse
    {
        $this->authorizeAdmin();
        $validated = $request->validate([
            'first_name' => ['required', 'string', 'max:100', 'regex:/\pL/u'],
            'last_name' => ['required', 'string', 'max:100', 'regex:/\pL/u'],
            'middle_name' => ['nullable', 'string', 'max:100', 'regex:/\pL/u'],
            'email' => ['required', 'email', 'max:255', 'unique:users,email'],
            'library_id' => ['required', 'string', 'max:64', 'unique:users,library_id'],
            'member_type' => ['required', Rule::in(['Student', 'Faculty / Staff'])],
            'sex' => ['nullable', 'string', 'max:32'],
            'address' => ['nullable', 'string', 'max:255'],
        ]);
        $temporaryPassword = Str::password(14);
        $user = User::create([
            'name' => implode(' ', array_filter([
                $validated['first_name'],
                $validated['middle_name'] ?? null,
                $validated['last_name'],
            ])),
            'email' => $validated['email'],
            'library_id' => $validated['library_id'],
            'member_type' => $validated['member_type'],
            'sex' => $validated['sex'] ?? null,
            'address' => $validated['address'] ?? null,
            'role' => 'member',
            'password' => $temporaryPassword,
        ]);

        return response()->json([
            'message' => 'Member account created. Share the temporary password securely.',
            'data' => $user,
            'temporary_password' => $temporaryPassword,
        ], 201);
    }

    public function updateMember(Request $request, int $id): JsonResponse
    {
        $this->authorizeAdmin();
        $member = User::query()->where('role', 'member')->findOrFail($id);
        $validated = $request->validate([
            'first_name' => ['required', 'string', 'max:100', 'regex:/\pL/u'],
            'last_name' => ['required', 'string', 'max:100', 'regex:/\pL/u'],
            'middle_name' => ['nullable', 'string', 'max:100', 'regex:/\pL/u'],
            'email' => ['required', 'email', 'max:255', Rule::unique('users', 'email')->ignore($member->id)],
            'library_id' => ['required', 'string', 'max:64', Rule::unique('users', 'library_id')->ignore($member->id)],
            'member_type' => ['required', Rule::in(['Student', 'Faculty / Staff'])],
            'sex' => ['nullable', 'string', 'max:32'],
            'address' => ['nullable', 'string', 'max:255'],
        ]);

        $member->update([
            'name' => implode(' ', array_filter([
                trim($validated['first_name']),
                isset($validated['middle_name']) ? trim($validated['middle_name']) : null,
                trim($validated['last_name']),
            ])),
            'email' => $validated['email'],
            'library_id' => trim($validated['library_id']),
            'member_type' => $validated['member_type'],
            'sex' => $validated['sex'] ?? $member->sex,
            'address' => $validated['address'] ?? null,
        ]);

        return response()->json(['message' => 'Member details updated.', 'data' => $member->fresh()]);
    }

    private function authorizeAdmin(): void
    {
        abort_unless(request()->user()?->role === 'admin', 403, 'Administrator access is required.');
    }
}
