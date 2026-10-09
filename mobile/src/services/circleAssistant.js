const stopWords = new Set([
  'a', 'about', 'an', 'and', 'any', 'are', 'book', 'books', 'can', 'do',
  'for', 'find', 'have', 'i', 'is', 'me', 'my', 'of', 'on', 'please',
  'recommend', 'recommendation', 'recommendations', 'show', 'something',
  'tell', 'the', 'there', 'to', 'what', 'which', 'with', 'you',
]);

const availableCopies = (book) => Number(book.available_quantity ?? book.copies ?? 0);
const dueText = (date) => date ? ` (return by ${date})` : '';

function findBooks(query, books) {
  const terms = query.toLowerCase().match(/[a-z0-9]+/g)?.filter((term) => !stopWords.has(term)) || [];
  if (!terms.length) return [];

  return books.map((book) => {
    const title = book.title.toLowerCase();
    const author = (book.author || '').toLowerCase();
    const genre = (book.genre || book.category || '').toLowerCase();
    const score = terms.reduce((total, term) => total
      + (title.includes(term) ? 4 : 0)
      + (author.includes(term) ? 3 : 0)
      + (genre.includes(term) ? 2 : 0), 0);
    return { book, score };
  }).filter(({ score }) => score > 0)
    .sort((left, right) => right.score - left.score || left.book.title.localeCompare(right.book.title))
    .map(({ book }) => book);
}

export function askCircle(prompt, { books, requests, loans }) {
  const query = prompt.trim().toLowerCase();
  const available = books.filter((book) => availableCopies(book) > 0);

  if (/^(hi|hello|hey|good morning|good afternoon|good evening)\b/.test(query)) {
    return {
      text: 'Hi! I can search the live catalog, check your requests and active loans, or help you request a book. What would you like to know?',
    };
  }

  if (/\b(help|what can you do|how do i use)\b/.test(query)) {
    return {
      text: 'Ask me to find a title, author, or genre; show available books; check your requests or return dates; or say “request” followed by a book title to start a borrow request.',
    };
  }

  if (/\b(my requests|request status|requests status|my request)\b/.test(query)) {
    return {
      text: requests.length
        ? `You have ${requests.length} request${requests.length === 1 ? '' : 's'}: ${requests.map((request) => `${request.book} — ${request.status}${dueText(request.due)}`).join('; ')}.`
        : 'You do not have any book requests yet.',
    };
  }

  if (/\b(my loans|my books|books i borrowed|what books did i borrow|return date|due date|when.*return|what.*return)\b/.test(query)) {
    return {
      text: loans.length
        ? `You have ${loans.length} active loan${loans.length === 1 ? '' : 's'}: ${loans.map((loan) => `${loan.title}${dueText(loan.due)}`).join('; ')}.`
        : 'You do not have any active loans right now.',
    };
  }

  if (/\b(hours|open now|opening hours|close|closing time|library desk|where is the library)\b/.test(query)) {
    return { text: 'The library desk is open Monday to Friday, 8:00–18:00. Borrow requests and returns are handled at the library desk.' };
  }

  const matches = findBooks(query, books);
  const borrowIntent = /\b(borrow|request|reserve)\b/.test(query);
  const availableMatches = matches.filter((book) => availableCopies(book) > 0);
  const selected = borrowIntent ? matches.slice(0, 1) : matches.slice(0, 4);

  if (borrowIntent && selected.length) {
    const book = selected[0];
    if (availableCopies(book) < 1) {
      return {
        text: `${book.title} is not currently available to request. Here are available alternatives from the catalog.`,
        items: available.slice(0, 3),
      };
    }
    return { text: `I found ${book.title} by ${book.author}. You can submit a borrow request below.`, items: [book], canRequest: true };
  }

  if (matches.length) {
    const results = availableMatches.length ? availableMatches.slice(0, 4) : matches.slice(0, 4);
    return {
      text: availableMatches.length
        ? `I found ${results.length} matching available book${results.length === 1 ? '' : 's'} in the catalog.`
        : 'I found these matching books, but they are not currently available.',
      items: results,
      canRequest: availableMatches.length > 0,
    };
  }

  if (/\b(available|recommend|suggest|mood|read|book|books)\b/.test(query)) {
    return {
      text: available.length
        ? 'I could not match that to a title, author, or genre. Here are some available books you can browse or request.'
        : 'I could not find a match, and there are no available books in the catalog right now. Try another title, author, or genre.',
      items: available.slice(0, 4),
      canRequest: available.length > 0,
    };
  }

  return {
    text: 'I can help with the library catalog, available books, your request status, and active loans. Try a title or author, or ask “What books do I need to return?”',
  };
}
