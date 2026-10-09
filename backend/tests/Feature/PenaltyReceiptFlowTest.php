<?php

namespace Tests\Feature;

use App\Models\Book;
use App\Models\BorrowRequest;
use App\Models\Loan;
use App\Models\PenaltyReceipt;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class PenaltyReceiptFlowTest extends TestCase
{
    use RefreshDatabase;

    protected function tearDown(): void
    {
        Carbon::setTestNow();

        parent::tearDown();
    }

    public function test_member_receipt_amount_includes_only_unpaid_overdue_penalties(): void
    {
        Carbon::setTestNow('2026-10-08 12:00:00');
        $member = User::factory()->create(['penalty_balance' => 4]);
        $this->createOverdueLoan($member, '2026-10-06', 2);

        $this->actingAs($member)
            ->postJson('/api/penalty-receipts')
            ->assertCreated()
            ->assertJsonPath('data.amount', '7.00')
            ->assertJsonPath('data.status', 'awaiting payment');
    }

    public function test_admin_confirmation_applies_receipt_to_balance_and_overdue_loan(): void
    {
        Carbon::setTestNow('2026-10-08 12:00:00');
        Storage::fake();
        $member = User::factory()->create(['penalty_balance' => 4]);
        $loan = $this->createOverdueLoan($member, '2026-10-06', 2);
        $receipt = PenaltyReceipt::create([
            'user_id' => $member->id,
            'amount' => 7,
            'status' => 'submitted',
            'receipt_image_path' => 'penalty-receipts/receipt.jpg',
        ]);
        Storage::put($receipt->receipt_image_path, 'cashier receipt image');
        $admin = User::factory()->create(['role' => 'admin']);

        $this->actingAs($admin)
            ->postJson("/api/admin/penalty-receipts/{$receipt->id}/confirm")
            ->assertOk()
            ->assertJsonPath('data.status', 'paid - cleared');

        $this->assertSame('0.00', $member->fresh()->penalty_balance);
        $this->assertSame('5.00', $loan->fresh()->penalty_paid_amount);
    }

    public function test_admin_cannot_confirm_submitted_receipt_without_an_available_photo(): void
    {
        Storage::fake();
        $member = User::factory()->create(['penalty_balance' => 10]);
        $receipt = PenaltyReceipt::create([
            'user_id' => $member->id,
            'amount' => 10,
            'status' => 'submitted',
        ]);
        $admin = User::factory()->create(['role' => 'admin']);

        $this->actingAs($admin)
            ->postJson("/api/admin/penalty-receipts/{$receipt->id}/confirm")
            ->assertUnprocessable()
            ->assertJsonPath('message', 'A submitted receipt must have an available payment photo before it can be confirmed.');

        $this->assertSame('10.00', $member->fresh()->penalty_balance);
        $this->assertSame('submitted', $receipt->fresh()->status);
    }

    public function test_admin_cannot_confirm_receipt_before_member_submits_a_photo(): void
    {
        $member = User::factory()->create(['penalty_balance' => 10]);
        $receipt = PenaltyReceipt::create([
            'user_id' => $member->id,
            'amount' => 10,
            'status' => 'awaiting payment',
        ]);
        $admin = User::factory()->create(['role' => 'admin']);

        $this->actingAs($admin)
            ->postJson("/api/admin/penalty-receipts/{$receipt->id}/confirm")
            ->assertUnprocessable()
            ->assertJsonPath('message', 'Only submitted payment photos can be confirmed.');

        $this->assertSame('10.00', $member->fresh()->penalty_balance);
        $this->assertSame('awaiting payment', $receipt->fresh()->status);
    }

    public function test_declined_request_notice_is_returned_to_the_member(): void
    {
        $member = User::factory()->create();
        $book = Book::create([
            'title' => 'Notice Test Book',
            'author' => 'Test Author',
            'isbn' => 'NOTICE-'.uniqid(),
            'quantity' => 1,
            'available_quantity' => 1,
        ]);
        $request = BorrowRequest::create([
            'user_id' => $member->id,
            'book_id' => $book->id,
            'status' => 'pending',
        ]);
        $admin = User::factory()->create(['role' => 'admin']);

        $this->actingAs($admin)
            ->postJson("/api/admin/requests/{$request->id}/reject", ['reason' => 'The book is reserved for class use.'])
            ->assertOk()
            ->assertJsonPath('data.rejection_reason', 'The book is reserved for class use.');

        $this->actingAs($member)
            ->getJson('/api/library')
            ->assertOk()
            ->assertJsonPath('requests.0.rejection_reason', 'The book is reserved for class use.');
    }

    public function test_receipt_photo_is_only_visible_to_owner_or_admin(): void
    {
        Storage::fake();
        $owner = User::factory()->create();
        $otherMember = User::factory()->create();
        $admin = User::factory()->create(['role' => 'admin']);
        $receipt = PenaltyReceipt::create([
            'user_id' => $owner->id,
            'amount' => 10,
            'status' => 'submitted',
            'receipt_image_path' => 'penalty-receipts/receipt.jpg',
        ]);
        Storage::put($receipt->receipt_image_path, 'private receipt image');

        $this->actingAs($otherMember)
            ->get("/api/penalty-receipts/{$receipt->id}/photo")
            ->assertForbidden();

        $this->actingAs($owner)
            ->get("/api/penalty-receipts/{$receipt->id}/photo")
            ->assertOk();

        $this->actingAs($admin)
            ->get("/api/penalty-receipts/{$receipt->id}/photo")
            ->assertOk();
    }

    private function createOverdueLoan(User $member, string $dueDate, float $penaltyPaid): Loan
    {
        $book = Book::create([
            'title' => 'Test Book',
            'author' => 'Test Author',
            'isbn' => 'TEST-'.uniqid(),
            'quantity' => 1,
            'available_quantity' => 1,
        ]);
        $request = BorrowRequest::create([
            'user_id' => $member->id,
            'book_id' => $book->id,
            'status' => 'approved',
        ]);

        return Loan::create([
            'borrow_request_id' => $request->id,
            'user_id' => $member->id,
            'book_id' => $book->id,
            'due_date' => $dueDate,
            'penalty_paid_amount' => $penaltyPaid,
        ]);
    }
}
