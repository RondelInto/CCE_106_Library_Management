import { useEffect, useMemo, useRef, useState } from 'react';
import ChangePasswordForm from '../components/ChangePasswordForm.jsx';
import { getPenaltyReceiptPhoto } from '../services/api.js';
import { useLibrary } from '../state/LibraryContext.jsx';

const emptyBook = { code: '', title: '', author: '', copies: '1', genre: '' };
const emptyMember = {
  first_name: '',
  last_name: '',
  middle_name: '',
  email: '',
  library_id: '',
  member_type: 'Student',
  sex: '',
  address: '',
};
const tabs = [['requests', 'Requests'], ['users', 'Users'], ['books', 'Books'], ['returns', 'Returns'], ['payments', 'Receipts'], ['profile', 'Profile']];

function AdminDashboard({ onLogout }) {
  const {
    currentUser,
    users,
    books,
    requests,
    approveRequest,
    rejectRequest,
    loans,
    confirmReturn,
    approveLoanExtension,
    declineLoanExtension,
    payments,
    confirmPayment,
    declinePayment,
    saveBook,
    deleteBook,
    registerMember,
    updateMember,
    genres,
    createGenre,
    deleteGenre,
    updateGenre,
    loading,
    error,
  } = useLibrary();
  const [view, setView] = useState('requests');
  const [query, setQuery] = useState('');
  const [requestFromDate, setRequestFromDate] = useState('');
  const [requestToDate, setRequestToDate] = useState('');
  const [penaltyFilter, setPenaltyFilter] = useState('all');
  const [bookForm, setBookForm] = useState(emptyBook);
  const [editingId, setEditingId] = useState(null);
  const [memberForm, setMemberForm] = useState(emptyMember);
  const [editingMemberId, setEditingMemberId] = useState(null);
  const [createdCredentials, setCreatedCredentials] = useState(null);
  const [copiedPassword, setCopiedPassword] = useState(false);
  const [dueDates, setDueDates] = useState({});
  const [genreDraft, setGenreDraft] = useState('');
  const [editingGenre, setEditingGenre] = useState('');
  const [showGenres, setShowGenres] = useState(false);
  const [memberFormError, setMemberFormError] = useState('');
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [receiptPhotoUrl, setReceiptPhotoUrl] = useState('');
  const [receiptPhotoError, setReceiptPhotoError] = useState('');
  const [receiptPhotoLoaded, setReceiptPhotoLoaded] = useState(false);
  const [reviewReason, setReviewReason] = useState('');
  const reviewReasonRef = useRef(null);

  useEffect(() => {
    if (!selectedReceipt) return undefined;

    let active = true;
    let objectUrl = '';
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') setSelectedReceipt(null);
    };
    window.addEventListener('keydown', closeOnEscape);
    reviewReasonRef.current?.focus();
    setReceiptPhotoUrl('');
    setReceiptPhotoError('');
    setReceiptPhotoLoaded(false);
    getPenaltyReceiptPhoto(selectedReceipt.apiId)
      .then((photo) => {
        objectUrl = URL.createObjectURL(photo);
        if (active) setReceiptPhotoUrl(objectUrl);
        else URL.revokeObjectURL(objectUrl);
      })
      .catch((photoError) => {
        if (active) setReceiptPhotoError(photoError.response?.data?.message || 'Could not load the receipt photo.');
      });

    return () => {
      active = false;
      window.removeEventListener('keydown', closeOnEscape);
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [selectedReceipt]);

  const filteredUsers = useMemo(() => users.filter((user) => {
    const text = `${user.id} ${user.name} ${user.email} ${user.address || ''} ${user.role}`.toLowerCase();
    return text.includes(query.toLowerCase())
      && (penaltyFilter === 'all'
        || (penaltyFilter === 'penalty' ? user.penalty > 0 : user.penalty === 0));
  }), [users, query, penaltyFilter]);
  const filteredBooks = useMemo(
    () => books.filter((book) => `${book.code} ${book.isbn || ''} ${book.title} ${book.author}`.toLowerCase().includes(query.toLowerCase())),
    [books, query],
  );
  const requestDateRangeError = requestFromDate && requestToDate && requestFromDate > requestToDate
    ? 'The start date must be on or before the end date.'
    : '';
  const filteredRequests = useMemo(() => requests.filter((request) => {
    const requestedDate = request.createdAt?.slice(0, 10) || '';
    const localizedRequestedDate = request.createdAt ? new Date(request.createdAt).toLocaleDateString() : '';
    const localizedDueDate = request.dueDate ? new Date(request.dueDate).toLocaleDateString() : '';
    const dateText = [requestedDate, request.dueDate, localizedRequestedDate, localizedDueDate].filter(Boolean).join(' ');
    const matchesQuery = `${request.id} ${request.name} ${request.role} ${request.book} ${request.status} ${dateText}`
      .toLowerCase()
      .includes(query.trim().toLowerCase());
    const matchesFrom = !requestFromDate || (requestedDate && requestedDate >= requestFromDate);
    const matchesTo = !requestToDate || (requestedDate && requestedDate <= requestToDate);

    return matchesQuery && matchesFrom && matchesTo && !requestDateRangeError;
  }), [requests, query, requestFromDate, requestToDate, requestDateRangeError]);
  const filteredLoans = useMemo(() => loans.filter((loan) => (
    `${loan.id} ${loan.member} ${loan.memberId} ${loan.title}`.toLowerCase().includes(query.toLowerCase())
  )), [loans, query]);
  const filteredPayments = useMemo(() => payments.filter((payment) => (
    `${payment.id} ${payment.member} ${payment.memberId} ${payment.status}`.toLowerCase().includes(query.toLowerCase())
  )), [payments, query]);
  const suggestedDueDate = (base = new Date()) => {
    const date = new Date(base);
    date.setDate(date.getDate() + 3);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  };

  const run = async (action) => {
    try {
      await action();
    } catch {
      // The shared library context exposes the server's error message.
    }
  };

  const submitBook = (event) => {
    event.preventDefault();
    run(async () => {
      await saveBook({
        code: bookForm.code,
        isbn: editingId ? bookForm.isbn : bookForm.code,
        title: bookForm.title,
        author: bookForm.author,
        genre: bookForm.genre,
        copies: Number(bookForm.copies),
      }, editingId);
      setBookForm(emptyBook);
      setEditingId(null);
    });
  };

  const submitMember = (event) => {
    event.preventDefault();
    setCreatedCredentials(null);
    setCopiedPassword(false);
    setMemberFormError('');
    if ([memberForm.first_name, memberForm.last_name].some((name) => /^\d+$/.test(name.trim()))) {
      setMemberFormError('First and last names cannot contain only numbers.');
      return;
    }
    run(async () => {
      const payload = {
        ...memberForm,
        first_name: memberForm.first_name.trim(),
        last_name: memberForm.last_name.trim(),
        middle_name: memberForm.middle_name.trim() || null,
        email: memberForm.email.trim(),
        library_id: memberForm.library_id.trim(),
        address: memberForm.address.trim() || null,
        sex: memberForm.sex || null,
      };
      if (editingMemberId) {
        await updateMember(editingMemberId, payload);
      } else {
        const result = await registerMember(payload);
        setCreatedCredentials({
          name: result.data.name,
          email: result.data.email,
          password: result.temporary_password,
        });
      }
      setMemberForm(emptyMember);
      setEditingMemberId(null);
    });
  };

  const editMember = (user) => {
    const [firstName, ...lastNameParts] = user.name.trim().split(/\s+/);
    setEditingMemberId(user.apiId);
    setCreatedCredentials(null);
    setMemberFormError('');
    setMemberForm({
      first_name: firstName || '',
      last_name: lastNameParts.join(' '),
      middle_name: '',
      email: user.email || '',
      library_id: user.schoolId || '',
      member_type: user.role === 'Faculty / Staff' ? 'Faculty / Staff' : 'Student',
      sex: user.sex || '',
      address: user.address || '',
    });
  };

  const cancelMemberEdit = () => {
    setEditingMemberId(null);
    setMemberForm(emptyMember);
    setMemberFormError('');
  };

  const editBook = (book) => {
    setEditingId(book.id);
    setBookForm({ ...book, code: book.isbn || book.code, copies: String(book.copies) });
  };

  const pendingCount = requests.filter((request) => request.status === 'Ready to approve').length;
  const balanceTotal = users.reduce((sum, user) => sum + user.penalty, 0);
  const unpaidCount = payments.filter((payment) => payment.status !== 'Paid - cleared').length;

  return (
    <main className="admin-page">
      <header className="admin-topbar">
        <div className="brand"><span className="brand-mark">R</span><span>Reverie<br /><small>admin desk</small></span></div>
        <div className="admin-user">
          <span className="admin-avatar">{currentUser?.name?.[0] || 'A'}</span>
          <span><strong>{currentUser?.name || 'Library admin'}</strong><small>Authorized administrator</small></span>
        </div>
      </header>
      <section className="admin-content">
        <div className="admin-heading">
          <div>
            <span className="eyebrow">OPERATIONS / TODAY</span>
            <h1>Library operations<span className="accent-dot">.</span></h1>
            <p>Manage persisted circulation, members, inventory, and cashier clearance.</p>
          </div>
        </div>
        {error && <p className="login-error" role="alert">{error}</p>}
        <div className="admin-stats">
          <div><span>Pending requests</span><strong>{pendingCount}</strong><small>Needs attention</small></div>
          <div><span>Books out</span><strong>{loans.length}</strong><small>Active loans</small></div>
          <div><span>Open penalties</span><strong>${balanceTotal.toFixed(2)}</strong><small>Awaiting payment</small></div>
          <div><span>Receipts</span><strong>{unpaidCount}</strong><small>Awaiting verification</small></div>
        </div>
        <nav className="admin-tabs" aria-label="Admin sections" role="tablist">
          {tabs.map(([id, text]) => (
            <button type="button" role="tab" aria-selected={view === id} className={view === id ? 'admin-tab active' : 'admin-tab'} onClick={() => { setView(id); setQuery(''); }} key={id}>{text}</button>
          ))}
        </nav>
        <section className="request-panel">
          <div className="panel-title">
            <div><span className="eyebrow">ADMIN WORKSPACE</span><h2>{tabs.find(([id]) => id === view)[1]}</h2></div>
            {view !== 'profile' && <input className="admin-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={view === 'users' ? 'Search School ID, name, email...' : view === 'books' ? 'Search code, title, author...' : view === 'returns' ? 'Search loan, member, title...' : view === 'payments' ? 'Search receipt, member...' : 'Search requests, members, and dates...'} />}
          </div>
          {loading && <p>Saving and refreshing library data...</p>}
          {view === 'requests' && (
            <>
              <div className="request-date-filters">
                <label>From date<input aria-label="Filter requests from date" type="date" value={requestFromDate} onChange={(event) => setRequestFromDate(event.target.value)} /></label>
                <label>To date<input aria-label="Filter requests to date" type="date" value={requestToDate} onChange={(event) => setRequestToDate(event.target.value)} /></label>
                {(requestFromDate || requestToDate) && <button type="button" onClick={() => { setRequestFromDate(''); setRequestToDate(''); }}>Clear dates</button>}
              </div>
              {requestDateRangeError && <p className="request-date-error" role="alert">{requestDateRangeError}</p>}
              <div className="request-table">
              {filteredRequests.map((request) => (
                <article className="request-row" key={request.id}>
                  <div className="request-book-mark">R</div>
                  <div className="request-person"><strong>{request.name}</strong><span>{request.role}</span></div>
                  <div className="request-title"><strong>{request.book}</strong><span>{request.createdAt ? `Requested ${new Date(request.createdAt).toLocaleDateString()}` : 'Request date unavailable'}</span><span>{request.due ? `Due ${request.due}` : 'Due date after approval'}</span></div>
                  <span className="request-status">{request.reason && request.status !== 'Ready to approve' ? `${request.status}: ${request.reason}` : request.status}</span>
                  {request.status === 'Ready to approve' ? <div className="request-actions">
                    <label>Due date (suggested 3 days from today)<input aria-label={`Due date for ${request.book}`} type="date" min={new Date().toISOString().slice(0, 10)} value={dueDates[request.id] || suggestedDueDate()} onChange={(event) => setDueDates({ ...dueDates, [request.id]: event.target.value })} /></label>
                    <button className="request-action" disabled={loading} onClick={() => run(() => approveRequest(request.id, dueDates[request.id] || suggestedDueDate()))}>Approve</button>
                    <button className="request-action decline-action" disabled={loading} onClick={() => {
                      const reason = window.prompt('Required notice: explain why this request is declined (at least 5 characters).');
                      if (!reason || reason.trim().length < 5) return;
                      if (window.confirm(`Decline this request and send the notice below?\n\n${reason.trim()}`)) run(() => rejectRequest(request.id, reason.trim()));
                    }}>Decline</button>
                  </div> : null}
                </article>
              ))}
              {!requestDateRangeError && filteredRequests.length === 0 && <p className="empty-admin">No borrow requests match this search and date range.</p>}
              </div>
            </>
          )}
          {view === 'users' && (
            <div className="directory">
              <form className="book-editor" onSubmit={submitMember}>
                <span className="eyebrow">{editingMemberId ? 'EDIT MEMBER' : 'REGISTER MEMBER'}</span>
                <input value={memberForm.first_name} onChange={(event) => setMemberForm({ ...memberForm, first_name: event.target.value })} placeholder="First name" required />
                <input value={memberForm.last_name} onChange={(event) => setMemberForm({ ...memberForm, last_name: event.target.value })} placeholder="Last name" required />
                <input value={memberForm.middle_name} onChange={(event) => setMemberForm({ ...memberForm, middle_name: event.target.value })} placeholder="Middle name (optional)" />
                <input type="email" value={memberForm.email} onChange={(event) => setMemberForm({ ...memberForm, email: event.target.value })} placeholder="Email address" required />
                <input value={memberForm.library_id} onChange={(event) => setMemberForm({ ...memberForm, library_id: event.target.value })} placeholder="School ID *" required />
                <select value={memberForm.member_type} onChange={(event) => setMemberForm({ ...memberForm, member_type: event.target.value })}><option>Student</option><option>Faculty / Staff</option></select>
                <select aria-label="Member sex" value={memberForm.sex} onChange={(event) => setMemberForm({ ...memberForm, sex: event.target.value })}><option value="">Sex (optional)</option><option>Male</option><option>Female</option></select>
                <input value={memberForm.address} onChange={(event) => setMemberForm({ ...memberForm, address: event.target.value })} placeholder="Address (optional)" />
                <button className="primary-button" disabled={loading} type="submit">{editingMemberId ? 'Save member details' : 'Create member account'} <span>→</span></button>
                {editingMemberId && <button type="button" className="filter-button" onClick={cancelMemberEdit}>Cancel edit</button>}
              </form>
              {memberFormError && <p className="login-error" role="alert">{memberFormError}</p>}
              {createdCredentials && (
                <section className="member-credentials" role="status" aria-live="polite">
                  <strong>Member account created</strong>
                  <span>{createdCredentials.name} · {createdCredentials.email}</span>
                  <small>Temporary password — share this securely. It will only be shown here once.</small>
                  <code>{createdCredentials.password}</code>
                  <button type="button" onClick={async () => { try { await navigator.clipboard.writeText(createdCredentials.password); setCopiedPassword(true); } catch { setCopiedPassword(false); } }}>
                    {copiedPassword ? 'Password copied' : 'Copy password'}
                  </button>
                </section>
              )}
              <div className="filter-row">
                {[['all', 'All'], ['penalty', 'With penalties'], ['clear', 'No penalties']].map(([id, text]) => (
                  <button className={penaltyFilter === id ? 'filter-button active-filter' : 'filter-button'} onClick={() => setPenaltyFilter(id)} key={id}>{text}</button>
                ))}
              </div>
              {filteredUsers.map((user) => (
                <article className="directory-row" key={user.id}>
                  <div><strong>{user.name}</strong><span>School ID {user.schoolId || 'not recorded'} · {user.role} · {user.email}</span><small>{user.address || 'Address not provided'}</small></div>
                  <button type="button" onClick={() => editMember(user)}>Edit</button>
                  <b className={user.penalty ? 'penalty-value' : 'clear-value'}>${user.penalty.toFixed(2)}<small>{user.penalty ? 'penalty' : 'clear'}</small></b>
                </article>
              ))}
            </div>
          )}
          {view === 'books' && (
            <div className="books-admin">
              <form className="book-editor" onSubmit={submitBook}>
                <span className="eyebrow">{editingId ? 'UPDATE BOOK' : 'ADD BOOK'}</span>
                <label>Book ID / ISBN<input value={bookForm.code} onFocus={() => {
                  if (!bookForm.code && !editingId) {
                    const digits = `979${String(Date.now()).slice(-9).padStart(9, '0')}`;
                    const sum = [...digits].reduce((total, digit, index) => total + Number(digit) * (index % 2 ? 3 : 1), 0);
                    setBookForm((current) => ({ ...current, code: `${digits}${(10 - (sum % 10)) % 10}` }));
                  }
                }} onChange={(event) => setBookForm({ ...bookForm, code: event.target.value })} required /></label>
                <label>Book title<input value={bookForm.title} onChange={(event) => setBookForm({ ...bookForm, title: event.target.value })} required /></label>
                <label>Author<input value={bookForm.author} onChange={(event) => setBookForm({ ...bookForm, author: event.target.value })} required /></label>
                <label>Genre<select value={bookForm.genre} onChange={(event) => setBookForm({ ...bookForm, genre: event.target.value })} required><option value="">Choose genre</option>{genres.map((genre) => <option key={genre}>{genre}</option>)}</select></label>
                <label>Quantity<input value={bookForm.copies} onChange={(event) => setBookForm({ ...bookForm, copies: event.target.value })} type="number" min="0" required /></label>
                <button className="primary-button" disabled={loading} type="submit">{editingId ? 'Save changes' : 'Add book'} <span>→</span></button>
              </form>
              <button
                type="button"
                className="filter-button"
                aria-expanded={showGenres}
                onClick={() => setShowGenres((visible) => !visible)}
              >
                {showGenres ? 'Hide genres' : 'Show genres'}
              </button>
              {showGenres && <>
                <form className="genre-editor" onSubmit={(event) => {
                  event.preventDefault();
                  if (!genreDraft.trim()) return;
                  run(async () => {
                    if (editingGenre) await updateGenre(editingGenre, genreDraft.trim());
                    else await createGenre(genreDraft.trim());
                    setGenreDraft('');
                    setEditingGenre('');
                  });
                }}>
                  <label>{editingGenre ? `Rename ${editingGenre}` : 'Add a genre'}<input value={genreDraft} onChange={(event) => setGenreDraft(event.target.value)} placeholder="Genre name" required /></label>
                  <button type="submit" disabled={loading}>{editingGenre ? 'Save genre' : 'Add genre'}</button>
                  {editingGenre && <button type="button" onClick={() => { setGenreDraft(''); setEditingGenre(''); }}>Cancel</button>}
                </form>
                <div className="genre-list" aria-label="Manage genres">
                {genres.map((genre) => <div className="genre-row" key={genre}>
                  <span>{genre}</span>
                  <button type="button" disabled={loading} onClick={() => { setEditingGenre(genre); setGenreDraft(genre); }}>Edit</button>
                  <button type="button" className="decline-action" disabled={loading} onClick={() => {
                    if (window.confirm(`Delete the genre “${genre}”? Genres assigned to books cannot be deleted.`)) run(() => deleteGenre(genre));
                  }}>Delete</button>
                </div>)}
                </div>
              </>}
              {filteredBooks.map((book) => (
                <article className="book-admin-row" key={book.id}>
                  <div><strong>{book.title}</strong><span>{book.isbn || book.code} · {book.author} · Quantity: {book.copies} · Available: {book.available_quantity}</span></div>
                  <button onClick={() => editBook(book)}>Edit</button>
                  <button onClick={() => run(() => deleteBook(book.id))}>Delete</button>
                </article>
              ))}
            </div>
          )}
          {view === 'returns' && (
            <div className="return-list">
              {filteredLoans.length === 0 ? <p className="empty-admin">No active loans match this search.</p> : filteredLoans.map((loan) => (
                <article className="return-row" key={loan.id}>
                  <div><strong>{loan.title} · {loan.member}</strong><span>Due {loan.due || 'not set'}</span>
                    {(loan.extensions || []).filter((extension) => extension.status === 'pending').map((extension) => <div key={extension.id} className="extension-actions"><span>Extension requested: {extension.reason}</span><label>New due date<input type="date" min={suggestedDueDate(new Date(loan.dueDate || Date.now()))} value={dueDates[`extension-${extension.id}`] || suggestedDueDate(new Date(loan.dueDate || Date.now()))} onChange={(event) => setDueDates({ ...dueDates, [`extension-${extension.id}`]: event.target.value })} /></label><button className="request-action" disabled={loading} onClick={() => run(() => approveLoanExtension(extension.id, dueDates[`extension-${extension.id}`] || suggestedDueDate(new Date(loan.dueDate || Date.now()))))}>Approve extension</button><button className="request-action decline-action" disabled={loading} onClick={() => run(() => declineLoanExtension(extension.id))}>Decline</button></div>)}
                  </div>
                  <button className="request-action" disabled={loading} onClick={() => run(() => confirmReturn(loan.id))}>Confirm return</button>
                </article>
              ))}
            </div>
          )}
          {view === 'payments' && (
            <div className="return-list">
              {filteredPayments.length === 0 ? <p className="empty-admin">No receipts match this search.</p> : filteredPayments.map((payment) => (
                <article className="return-row" key={payment.id}>
                  <div>
                    <strong>{payment.member} · ${payment.amount.toFixed(2)}</strong>
                    <span>{payment.id} · {payment.status}</span>
                    {payment.status === 'Submitted - awaiting review' && <span>{payment.hasReceiptPhoto ? 'Receipt photo submitted for review.' : 'No receipt photo is available.'}</span>}
                    {payment.status === 'Declined - resubmission required' && <span>{payment.reviewReason || 'Waiting for the member to submit a replacement photo.'}</span>}
                  </div>
                  {payment.status === 'Paid - cleared' ? <span>Paid - cleared</span> : payment.status === 'Submitted - awaiting review' && payment.hasReceiptPhoto ? (
                    <button className="request-action" onClick={() => { setReviewReason(''); setSelectedReceipt(payment); }}>Review photo</button>
                  ) : payment.status === 'Printed - awaiting cashier' ? <span>Waiting for the member to submit the cashier receipt photo.</span> : null}
                </article>
              ))}
            </div>
          )}
          {view === 'profile' && (
            <div className="admin-profile">
              <div className="profile-details">
                <div className="profile-avatar">{currentUser?.name?.[0] || 'A'}</div>
                <h3>{currentUser?.name || 'Library administrator'}</h3>
                <p>Administrator account</p>
                <dl>
                  <div><dt>Full name</dt><dd>{currentUser?.name || 'Not provided'}</dd></div>
                  <div><dt>Email address</dt><dd>{currentUser?.email || 'Not provided'}</dd></div>
                  <div><dt>Account type</dt><dd>{currentUser?.member_type || currentUser?.role || 'Administrator'}</dd></div>
                  <div><dt>School ID</dt><dd>{currentUser?.library_id || 'Not applicable'}</dd></div>
                  <div><dt>Address</dt><dd>{currentUser?.address || 'Not provided'}</dd></div>
                </dl>
              </div>
              <ChangePasswordForm />
              <button className="logout-action" onClick={onLogout}>Log out</button>
            </div>
          )}
        </section>
      </section>
      {selectedReceipt && (
        <div className="receipt-modal-backdrop" onClick={() => setSelectedReceipt(null)}>
          <section className="receipt-modal" role="dialog" aria-modal="true" aria-labelledby="receipt-modal-title" onClick={(event) => event.stopPropagation()}>
            <header>
              <div><span className="eyebrow">PAYMENT REVIEW</span><h2 id="receipt-modal-title">{selectedReceipt.member} · {selectedReceipt.id}</h2></div>
              <button type="button" className="receipt-modal-close" aria-label="Close receipt review" onClick={() => setSelectedReceipt(null)}>×</button>
            </header>
            <p>Submitted amount: <strong>${selectedReceipt.amount.toFixed(2)}</strong></p>
            {receiptPhotoUrl ? <img className="receipt-photo" src={receiptPhotoUrl} alt={`Cashier receipt submitted by ${selectedReceipt.member}`} onLoad={() => setReceiptPhotoLoaded(true)} onError={() => { setReceiptPhotoLoaded(false); setReceiptPhotoError('Could not display the receipt photo.'); }} /> : receiptPhotoError ? <p className="login-error" role="alert">{receiptPhotoError}</p> : <p role="status">Loading receipt photo…</p>}
            {selectedReceipt.reviewReason && <p className="receipt-review-reason">Previous notice: {selectedReceipt.reviewReason}</p>}
            <label className="receipt-review-label" htmlFor="receipt-review-reason">Decline reason</label>
            <textarea ref={reviewReasonRef} id="receipt-review-reason" minLength={5} maxLength={1000} value={reviewReason} onChange={(event) => setReviewReason(event.target.value)} placeholder="Explain what needs to be corrected" />
            {error && <p className="login-error" role="alert">{error}</p>}
            <div className="receipt-review-actions">
              <button className="request-action decline-action" disabled={loading || !receiptPhotoLoaded || reviewReason.trim().length < 5} onClick={() => run(async () => { await declinePayment(selectedReceipt.apiId, reviewReason.trim()); setSelectedReceipt(null); })}>Decline with notice</button>
              <button className="request-action" disabled={loading || !receiptPhotoLoaded} onClick={() => run(async () => { await confirmPayment(selectedReceipt.apiId); setSelectedReceipt(null); })}>Approve payment</button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}

export default AdminDashboard;
