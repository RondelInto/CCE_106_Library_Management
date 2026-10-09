<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('role')->default('member');
            $table->string('library_id')->nullable()->unique();
            $table->string('member_type')->nullable();
            $table->string('sex')->nullable();
            $table->string('address')->nullable();
            $table->decimal('penalty_balance', 8, 2)->default(0);
        });

        Schema::create('borrow_requests', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('book_id')->constrained()->restrictOnDelete();
            $table->string('status')->default('pending');
            $table->timestamp('approved_at')->nullable();
            $table->timestamps();
            $table->index(['user_id', 'status']);
        });

        Schema::create('loans', function (Blueprint $table) {
            $table->id();
            $table->foreignId('borrow_request_id')->unique()->constrained()->restrictOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('book_id')->constrained()->restrictOnDelete();
            $table->date('due_date');
            $table->date('returned_at')->nullable();
            $table->decimal('penalty_amount', 8, 2)->default(0);
            $table->timestamps();
            $table->index(['user_id', 'returned_at']);
        });

        Schema::create('penalty_receipts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->decimal('amount', 8, 2);
            $table->string('status')->default('awaiting payment');
            $table->timestamp('confirmed_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('penalty_receipts');
        Schema::dropIfExists('loans');
        Schema::dropIfExists('borrow_requests');

        Schema::table('users', function (Blueprint $table) {
            $table->dropUnique(['library_id']);
            $table->dropColumn(['role', 'library_id', 'member_type', 'sex', 'address', 'penalty_balance']);
        });
    }
};
