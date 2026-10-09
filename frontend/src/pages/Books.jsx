import { useEffect, useState } from 'react';
import { getBooks, createBook, updateBook, deleteBook } from '../services/api.js';

const emptyForm = {
  title: '',
  author: '',
  isbn: '',
  genre: '',
  published_year: '',
  quantity: 1,
};

function Books() {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const loadBooks = async (searchTerm = '') => {
    setLoading(true);
    setError('');
    try {
      const data = await getBooks(searchTerm);
      setBooks(data);
    } catch (err) {
      setError('Could not load books. Is the backend running?');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBooks();
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadBooks(search);
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
    setFormErrors({});
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setFormErrors({});

    const payload = {
      ...form,
      published_year: form.published_year ? Number(form.published_year) : null,
      quantity: form.quantity ? Number(form.quantity) : 1,
    };

    try {
      if (editingId) {
        await updateBook(editingId, payload);
      } else {
        await createBook(payload);
      }
      resetForm();
      await loadBooks(search);
    } catch (err) {
      if (err.response?.status === 422) {
        setFormErrors(err.response.data.errors || {});
      } else {
        setError('Something went wrong saving the book.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (book) => {
    setEditingId(book.id);
    setForm({
      title: book.title,
      author: book.author,
      isbn: book.isbn,
      genre: book.genre || '',
      published_year: book.published_year || '',
      quantity: book.quantity,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this book?')) return;
    try {
      await deleteBook(id);
      await loadBooks(search);
    } catch (err) {
      setError('Could not delete that book.');
    }
  };

  return (
    <div className="books-page">
      <h1>Books</h1>
      <p className="subtitle">Manage the library's book catalog.</p>

      <form className="search-bar" onSubmit={handleSearchSubmit}>
        <input
          type="text"
          placeholder="Search by title or author..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button type="submit">Search</button>
        {search && (
          <button
            type="button"
            className="btn-secondary"
            onClick={() => {
              setSearch('');
              loadBooks('');
            }}
          >
            Clear
          </button>
        )}
      </form>

      <div className="card">
        <h2>{editingId ? 'Edit Book' : 'Add a New Book'}</h2>
        <form className="book-form" onSubmit={handleSubmit}>
          <div className="form-row">
            <label>
              Title
              <input name="title" value={form.title} onChange={handleChange} required />
              {formErrors.title && <span className="field-error">{formErrors.title[0]}</span>}
            </label>
            <label>
              Author
              <input name="author" value={form.author} onChange={handleChange} required />
              {formErrors.author && <span className="field-error">{formErrors.author[0]}</span>}
            </label>
          </div>
          <div className="form-row">
            <label>
              ISBN
              <input name="isbn" value={form.isbn} onChange={handleChange} required />
              {formErrors.isbn && <span className="field-error">{formErrors.isbn[0]}</span>}
            </label>
            <label>
              Genre
              <input name="genre" value={form.genre} onChange={handleChange} />
            </label>
          </div>
          <div className="form-row">
            <label>
              Published Year
              <input
                name="published_year"
                type="number"
                value={form.published_year}
                onChange={handleChange}
              />
            </label>
            <label>
              Quantity
              <input
                name="quantity"
                type="number"
                min="0"
                value={form.quantity}
                onChange={handleChange}
              />
            </label>
          </div>
          <div className="form-actions">
            <button type="submit" disabled={submitting}>
              {editingId ? 'Update Book' : 'Add Book'}
            </button>
            {editingId && (
              <button type="button" className="btn-secondary" onClick={resetForm}>
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>

      {error && <p className="error-banner">{error}</p>}

      {loading ? (
        <p>Loading books...</p>
      ) : books.length === 0 ? (
        <p>No books found.</p>
      ) : (
        <table className="books-table">
          <thead>
            <tr>
              <th>Title</th>
              <th>Author</th>
              <th>ISBN</th>
              <th>Genre</th>
              <th>Year</th>
              <th>Available</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {books.map((book) => (
              <tr key={book.id}>
                <td>{book.title}</td>
                <td>{book.author}</td>
                <td>{book.isbn}</td>
                <td>{book.genre || '—'}</td>
                <td>{book.published_year || '—'}</td>
                <td>
                  {book.available_quantity} / {book.quantity}
                </td>
                <td className="row-actions">
                  <button className="btn-small" onClick={() => handleEdit(book)}>
                    Edit
                  </button>
                  <button
                    className="btn-small btn-danger"
                    onClick={() => handleDelete(book.id)}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default Books;
