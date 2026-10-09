<?php

use App\Models\Book;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('genres', function (Blueprint $table) {
            $table->id();
            $table->string('name', 100)->unique();
            $table->timestamps();
        });

        Book::query()->whereNotNull('genre')->distinct()->pluck('genre')->each(function ($genre) {
            $genre = trim($genre);
            if ($genre !== '') {
                DB::table('genres')->insertOrIgnore([
                    'name' => $genre,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }
        });

        Schema::table('borrow_requests', function (Blueprint $table) {
            $table->text('rejection_reason')->nullable();
        });

        Schema::create('loan_extensions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('loan_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->text('reason');
            $table->string('status')->default('pending');
            $table->date('approved_due_date')->nullable();
            $table->timestamps();
            $table->index(['loan_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('loan_extensions');
        Schema::table('borrow_requests', function (Blueprint $table) {
            $table->dropColumn('rejection_reason');
        });
        Schema::dropIfExists('genres');
    }
};
