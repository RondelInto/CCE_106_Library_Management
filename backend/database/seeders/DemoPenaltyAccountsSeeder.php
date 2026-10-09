<?php

namespace Database\Seeders;

use App\Models\Book;
use App\Models\BorrowRequest;
use App\Models\Loan;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class DemoPenaltyAccountsSeeder extends Seeder
{
    private const PASSWORD = 'LibraryDemo!2026';

    public function run(): void
    {
        DB::transaction(function (): void {
            $today = today();
            $lateDays = 5;
            $penalty = $lateDays * 2.5;

            $activeUser = User::updateOrCreate(
                ['library_id' => 'DEMO-PENALTY-ACTIVE'],
                [
                    'email' => 'riley.carter@library.test',
                    'name' => 'Riley Carter',
                    'password' => self::PASSWORD,
                    'role' => 'member',
                    'member_type' => 'Student',
                    'penalty_balance' => 0,
                ],
            );
            $returnedUser = User::updateOrCreate(
                ['library_id' => 'DEMO-PENALTY-RETURNED'],
                [
                    'email' => 'jordan.lee@library.test',
                    'name' => 'Jordan Lee',
                    'password' => self::PASSWORD,
                    'role' => 'member',
                    'member_type' => 'Student',
                    'penalty_balance' => $penalty,
                ],
            );

            $activeBook = Book::updateOrCreate(
                ['isbn' => 'DEMO-PENALTY-ACTIVE-20261008'],
                [
                    'title' => 'Demo Book - Not Returned',
                    'author' => 'Library Test Data',
                    'genre' => 'Test Data',
                    'quantity' => 1,
                    'available_quantity' => 0,
                ],
            );
            $returnedBook = Book::updateOrCreate(
                ['isbn' => 'DEMO-PENALTY-RETURNED-20261008'],
                [
                    'title' => 'Demo Book - Returned Late',
                    'author' => 'Library Test Data',
                    'genre' => 'Test Data',
                    'quantity' => 1,
                    'available_quantity' => 1,
                ],
            );

            $activeRequest = BorrowRequest::updateOrCreate(
                ['user_id' => $activeUser->id, 'book_id' => $activeBook->id],
                ['status' => 'approved', 'approved_at' => $today],
            );
            $returnedRequest = BorrowRequest::updateOrCreate(
                ['user_id' => $returnedUser->id, 'book_id' => $returnedBook->id],
                ['status' => 'returned', 'approved_at' => $today->copy()->subDays(15)],
            );

            Loan::updateOrCreate(
                ['borrow_request_id' => $activeRequest->id],
                [
                    'user_id' => $activeUser->id,
                    'book_id' => $activeBook->id,
                    'due_date' => $today->copy()->subDays($lateDays),
                    'returned_at' => null,
                    'penalty_amount' => 0,
                    'penalty_paid_amount' => 0,
                ],
            );
            Loan::updateOrCreate(
                ['borrow_request_id' => $returnedRequest->id],
                [
                    'user_id' => $returnedUser->id,
                    'book_id' => $returnedBook->id,
                    'due_date' => $today->copy()->subDays($lateDays),
                    'returned_at' => $today,
                    'penalty_amount' => $penalty,
                    'penalty_paid_amount' => 0,
                ],
            );
        });
    }
}
