<?php

namespace App\Http\Controllers;

use App\Models\Book;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class BookController extends Controller
{
    /**
     * GET /api/books
     * Retrieve all books. Supports optional ?search= to filter by title/author.
     */
    public function index(Request $request): JsonResponse
    {
        $query = Book::query();

        if ($search = $request->query('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('title', 'like', "%{$search}%")
                  ->orWhere('author', 'like', "%{$search}%");
            });
        }

        if ($genre = $request->query('genre')) {
            $query->where('genre', $genre);
        }

        $books = $query->orderBy('title')->get();

        return response()->json([
            'data' => $books,
        ]);
    }

    /**
     * GET /api/books/{id}
     * Retrieve a single book by ID.
     */
    public function show(string $id): JsonResponse
    {
        $book = Book::find($id);

        if (! $book) {
            return response()->json([
                'message' => "Book with id {$id} not found.",
            ], 404);
        }

        return response()->json([
            'data' => $book,
        ]);
    }

    /**
     * POST /api/books
     * Create a new book.
     */
    public function store(Request $request): JsonResponse
    {
        abort_unless($request->user()?->role === 'admin', 403, 'Administrator access is required.');

        try {
            $validated = $request->validate([
                'title' => 'required|string|max:255',
                'author' => 'required|string|max:255',
                'isbn' => 'required|string|max:32|unique:books,isbn',
                'genre' => 'nullable|string|max:100',
                'published_year' => 'nullable|integer|min:1000|max:' . (date('Y') + 1),
                'quantity' => 'nullable|integer|min:0',
            ]);
        } catch (ValidationException $e) {
            return response()->json([
                'message' => 'Validation failed.',
                'errors' => $e->errors(),
            ], 422);
        }

        if (! empty($validated['genre']) && ! DB::table('genres')->where('name', $validated['genre'])->exists()) {
            return response()->json([
                'message' => 'Select a genre from the library genre list.',
                'errors' => ['genre' => ['Select a genre from the library genre list.']],
            ], 422);
        }

        $duplicate = Book::query()
            ->whereRaw('LOWER(title) = ?', [mb_strtolower($validated['title'])])
            ->whereRaw('LOWER(author) = ?', [mb_strtolower($validated['author'])])
            ->exists();
        if ($duplicate) {
            return response()->json([
                'message' => 'A book with this title and author already exists.',
                'errors' => ['title' => ['This title and author are already in the catalog.']],
            ], 422);
        }

        $validated['quantity'] = $validated['quantity'] ?? 1;
        // A new book starts with all copies available.
        $validated['available_quantity'] = $validated['quantity'];

        $book = Book::create($validated);

        return response()->json([
            'message' => 'Book created successfully.',
            'data' => $book,
        ], 201);
    }

    /**
     * PUT/PATCH /api/books/{id}
     * Update an existing book.
     */
    public function update(Request $request, string $id): JsonResponse
    {
        abort_unless($request->user()?->role === 'admin', 403, 'Administrator access is required.');

        $book = Book::find($id);

        if (! $book) {
            return response()->json([
                'message' => "Book with id {$id} not found.",
            ], 404);
        }

        try {
            $validated = $request->validate([
                'title' => 'sometimes|required|string|max:255',
                'author' => 'sometimes|required|string|max:255',
                'isbn' => 'sometimes|required|string|max:32|unique:books,isbn,' . $book->id,
                'genre' => 'nullable|string|max:100',
                'published_year' => 'nullable|integer|min:1000|max:' . (date('Y') + 1),
                'quantity' => 'sometimes|integer|min:0',
            ]);
        } catch (ValidationException $e) {
            return response()->json([
                'message' => 'Validation failed.',
                'errors' => $e->errors(),
            ], 422);
        }

        if (isset($validated['genre']) && $validated['genre'] !== '' && ! DB::table('genres')->where('name', $validated['genre'])->exists()) {
            return response()->json([
                'message' => 'Select a genre from the library genre list.',
                'errors' => ['genre' => ['Select a genre from the library genre list.']],
            ], 422);
        }

        $title = $validated['title'] ?? $book->title;
        $author = $validated['author'] ?? $book->author;
        $duplicate = Book::query()
            ->whereKeyNot($book->id)
            ->whereRaw('LOWER(title) = ?', [mb_strtolower($title)])
            ->whereRaw('LOWER(author) = ?', [mb_strtolower($author)])
            ->exists();
        if ($duplicate) {
            return response()->json([
                'message' => 'A book with this title and author already exists.',
                'errors' => ['title' => ['This title and author are already in the catalog.']],
            ], 422);
        }

        if (array_key_exists('quantity', $validated)) {
            $checkedOut = $book->quantity - $book->available_quantity;
            if ($validated['quantity'] < $checkedOut) {
                return response()->json([
                    'message' => 'Quantity cannot be lower than the number of checked-out copies.',
                    'errors' => ['quantity' => ['Quantity cannot be lower than the number of checked-out copies.']],
                ], 422);
            }

            $validated['available_quantity'] = $validated['quantity'] - $checkedOut;
        }

        $book->update($validated);

        return response()->json([
            'message' => 'Book updated successfully.',
            'data' => $book,
        ]);
    }

    /**
     * DELETE /api/books/{id}
     * Delete a book.
     */
    public function destroy(string $id): JsonResponse
    {
        abort_unless(request()->user()?->role === 'admin', 403, 'Administrator access is required.');

        $book = Book::find($id);

        if (! $book) {
            return response()->json([
                'message' => "Book with id {$id} not found.",
            ], 404);
        }

        if ($book->borrowRequests()->exists()) {
            return response()->json([
                'message' => 'This book has circulation history and cannot be deleted. Set its quantity to 0 to remove it from the available catalog.',
            ], 409);
        }

        $book->delete();

        return response()->json([
            'message' => 'Book deleted successfully.',
        ]);
    }
}
