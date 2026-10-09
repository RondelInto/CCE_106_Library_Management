<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Loan extends Model
{
    protected $fillable = ['borrow_request_id', 'user_id', 'book_id', 'due_date', 'returned_at', 'penalty_amount', 'penalty_paid_amount'];

    protected function casts(): array
    {
        return [
            'due_date' => 'date',
            'returned_at' => 'date',
            'penalty_amount' => 'decimal:2',
            'penalty_paid_amount' => 'decimal:2',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function book(): BelongsTo
    {
        return $this->belongsTo(Book::class);
    }

    public function borrowRequest(): BelongsTo
    {
        return $this->belongsTo(BorrowRequest::class);
    }

    public function extensions(): HasMany
    {
        return $this->hasMany(LoanExtension::class);
    }
}
