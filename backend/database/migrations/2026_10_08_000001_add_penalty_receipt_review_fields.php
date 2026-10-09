<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('loans', function (Blueprint $table) {
            $table->decimal('penalty_paid_amount', 8, 2)->default(0);
        });

        Schema::table('penalty_receipts', function (Blueprint $table) {
            $table->string('receipt_image_path')->nullable();
            $table->text('review_reason')->nullable();
            $table->timestamp('submitted_at')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('penalty_receipts', function (Blueprint $table) {
            $table->dropColumn(['receipt_image_path', 'review_reason', 'submitted_at']);
        });

        Schema::table('loans', function (Blueprint $table) {
            $table->dropColumn('penalty_paid_amount');
        });
    }
};
