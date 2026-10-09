<?php

namespace Database\Seeders;

use App\Models\Book;
use Illuminate\Database\Seeder;

class BookSeeder extends Seeder
{
    public function run(): void
    {
        $books = [
            ['title' => 'Clean Code', 'author' => 'Robert C. Martin', 'isbn' => '9780132350884', 'genre' => 'Technology', 'published_year' => 2008, 'quantity' => 3],
            ['title' => 'The Pragmatic Programmer', 'author' => 'Andrew Hunt', 'isbn' => '9780201616224', 'genre' => 'Technology', 'published_year' => 1999, 'quantity' => 2],
            ['title' => 'Noli Me Tangere', 'author' => 'Jose Rizal', 'isbn' => '9789710843019', 'genre' => 'Classic Literature', 'published_year' => 1887, 'quantity' => 5],
            ['title' => 'El Filibusterismo', 'author' => 'Jose Rizal', 'isbn' => '9789710843026', 'genre' => 'Classic Literature', 'published_year' => 1891, 'quantity' => 4],
            ['title' => 'Introduction to Algorithms', 'author' => 'Thomas H. Cormen', 'isbn' => '9780262033848', 'genre' => 'Technology', 'published_year' => 2009, 'quantity' => 2],
        ];

        foreach ($books as $book) {
            Book::create([
                ...$book,
                'available_quantity' => $book['quantity'],
            ]);
        }
    }
}
