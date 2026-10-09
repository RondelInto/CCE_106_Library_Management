<?php

namespace Tests\Feature;

use App\Models\Book;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class GenreManagementTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_delete_a_genre_with_reserved_characters_in_its_name(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        DB::table('genres')->insert([
            'name' => '18+',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->actingAs($admin)
            ->deleteJson('/api/genres', ['name' => '18+'])
            ->assertOk()
            ->assertJsonPath('data', '18+');

        $this->assertDatabaseMissing('genres', ['name' => '18+']);
    }

    public function test_admin_can_rename_a_genre_and_update_books_using_it(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        DB::table('genres')->insert([
            'name' => 'Reference',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        Book::query()->create([
            'title' => 'Referenced title',
            'author' => 'Library author',
            'isbn' => '9780000000001',
            'genre' => 'Reference',
            'quantity' => 1,
            'available_quantity' => 1,
        ]);

        $this->actingAs($admin)
            ->putJson('/api/genres', ['old_name' => 'Reference', 'name' => 'Updated Reference'])
            ->assertOk()
            ->assertJsonPath('data', 'Updated Reference');

        $this->assertDatabaseMissing('genres', ['name' => 'Reference']);
        $this->assertDatabaseHas('genres', ['name' => 'Updated Reference']);
        $this->assertDatabaseHas('books', ['isbn' => '9780000000001', 'genre' => 'Updated Reference']);
    }

    public function test_admin_cannot_delete_a_genre_used_by_a_book(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        DB::table('genres')->insert([
            'name' => 'Reference',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        Book::query()->create([
            'title' => 'Referenced title',
            'author' => 'Library author',
            'isbn' => '9780000000001',
            'genre' => 'Reference',
            'quantity' => 1,
            'available_quantity' => 1,
        ]);

        $this->actingAs($admin)
            ->deleteJson('/api/genres', ['name' => 'Reference'])
            ->assertUnprocessable()
            ->assertJsonPath('message', 'This genre is assigned to one or more books. Update those books before deleting it.');

        $this->assertDatabaseHas('genres', ['name' => 'Reference']);
    }
}
