import { useMemo, useRef, useState } from 'react';
import { useLibrary } from '../state/LibraryContext.jsx';
import ChangePasswordForm from '../components/ChangePasswordForm.jsx';
import { askCircle as getCircleReply } from '../services/circleAssistant.js';

const stages = [
  { id: 'account', label: 'Profile', icon: '01' },
  { id: 'chat', label: 'Circle assistant', icon: '02' },
  { id: 'borrow', label: 'Borrow Book', icon: '03' },
  { id: 'requests', label: 'Your Requests', icon: '04' },
  { id: 'return', label: 'Return books', icon: '05' },
  { id: 'payments', label: 'Payments / Penalties', icon: '06' },
];

function Home({ onLogout }) {
  const {
    books, currentUser, requests, loans, payments, genres, loading, error, requestBook, requestLoanExtension, createPenaltyReceipt, submitPenaltyReceiptPhoto,
  } = useLibrary();
  const [activeStage, setActiveStage] = useState('account');
  const [prompt, setPrompt] = useState('');
  const [messages, setMessages] = useState([]);
  const [selectedBook, setSelectedBook] = useState(null);
  const [actionError, setActionError] = useState('');
  const [requestingBookId, setRequestingBookId] = useState(null);
  const [bookQuery, setBookQuery] = useState('');
  const [genreFilter, setGenreFilter] = useState('All genres');
  const [authorFilter, setAuthorFilter] = useState('All authors');
  const [sortOrder, setSortOrder] = useState('title');
  const [extensionReasons, setExtensionReasons] = useState({});
  const [printingReceipt, setPrintingReceipt] = useState(null);
  const [receiptUploadErrors, setReceiptUploadErrors] = useState({});
  const receiptFileInputs = useRef({});
  const penaltyTotal = Number(currentUser?.outstanding_penalty_total ?? currentUser?.penalty_balance ?? 0);

  const askCircle = (event) => {
    event.preventDefault();
    const text = prompt.trim();
    if (!text) return;
    const reply = getCircleReply(text, { books, requests, loans });
    setMessages((current) => [...current, { from: 'you', text }, { from: 'circle', ...reply }]);
    setPrompt('');
  };

  const requestFromCircle = async (book) => {
    setRequestingBookId(book.id);
    try {
      await requestBook(book.id);
      setMessages((current) => [...current, {
        from: 'circle',
        text: `Your request for “${book.title}” was sent to the library desk for approval.`,
      }]);
    } catch (requestError) {
      setMessages((current) => [...current, {
        from: 'circle',
        text: requestError.response?.data?.message || `I could not submit a request for “${book.title}”. Please try again.`,
      }]);
    } finally {
      setRequestingBookId(null);
    }
  };

  const submitRequest = async () => {
    if (!selectedBook) return;
    setActionError('');
    try {
      await requestBook(selectedBook.id);
      setSelectedBook(null);
    } catch {
      setActionError('That request could not be submitted. Check the message above and try again.');
    }
  };

  const userName = currentUser?.name || 'Library member';
  const currentStage = stages.find((stage) => stage.id === activeStage);
  const printReceipt = (receiptId) => {
    setPrintingReceipt(receiptId);
    window.setTimeout(() => {
      window.print();
      setPrintingReceipt(null);
    }, 0);
  };
  const submitCashierReceipt = async (payment, event) => {
    const photo = event.target.files?.[0];
    event.target.value = '';
    if (!photo) return;

    if (!photo.type.startsWith('image/')) {
      setReceiptUploadErrors((current) => ({ ...current, [payment.apiId]: 'Choose an image of the cashier receipt.' }));
      return;
    }
    if (photo.size > 5 * 1024 * 1024) {
      setReceiptUploadErrors((current) => ({ ...current, [payment.apiId]: 'The image must be 5 MB or smaller.' }));
      return;
    }

    setReceiptUploadErrors((current) => ({ ...current, [payment.apiId]: '' }));
    try {
      await submitPenaltyReceiptPhoto(payment.apiId, photo);
    } catch (uploadError) {
      setReceiptUploadErrors((current) => ({
        ...current,
        [payment.apiId]: uploadError.response?.data?.message || 'The receipt photo could not be submitted. Please try again.',
      }));
    }
  };
  const authors = useMemo(() => [...new Set(books.map((book) => book.author).filter(Boolean))]
    .sort((left, right) => left.localeCompare(right)), [books]);
  const visibleBooks = useMemo(() => books
    .filter((book) => (genreFilter === 'All genres' || book.genre === genreFilter)
      && (authorFilter === 'All authors' || book.author === authorFilter)
      && `${book.title} ${book.author}`.toLowerCase().includes(bookQuery.trim().toLowerCase()))
    .sort((left, right) => sortOrder === 'author'
      ? left.author.localeCompare(right.author)
      : sortOrder === 'reverse'
        ? right.title.localeCompare(left.title)
        : left.title.localeCompare(right.title)), [books, genreFilter, authorFilter, bookQuery, sortOrder]);

  return (
    <main className="dashboard">
      <aside className="sidebar">
        <div className="brand"><span className="brand-mark">R</span><span>Reverie<br /><small>library services</small></span></div>
        <div className="member-card"><div className="avatar">{userName[0].toUpperCase()}</div><div><strong>{userName}</strong><span>{currentUser?.member_type || 'Member'} · School ID {currentUser?.library_id || 'not recorded'}</span></div></div>
        <p className="nav-heading">Your journey</p>
        <nav className="stage-nav">{stages.map((stage, index) => <button className={activeStage === stage.id ? 'stage-link active' : 'stage-link'} onClick={() => setActiveStage(stage.id)} key={stage.id}><span className="stage-number">{stage.icon}</span><span>{stage.label}</span>{index < stages.length - 1 && <i />}</button>)}</nav>
        <div className="side-note"><span className="status-dot" /> Library desk online<br /><small>Mon - Fri, 8:00 - 18:00</small></div>
      </aside>

      <section className="content">
        <header className="topbar"><div><span className="eyebrow">MEMBER PORTAL / 2026</span><h1>Welcome, {userName.split(' ')[0]}<span className="accent-dot">.</span></h1></div></header>
        <div className="progress-row"><div><span className="eyebrow">LIBRARY FLOW</span><strong>{currentStage.label}</strong></div><span>{stages.findIndex((stage) => stage.id === activeStage) + 1} of {stages.length}</span></div>
        {(error || actionError) && <p className="login-error" role="alert">{error || actionError}</p>}

        {activeStage === 'account' && <section className="flow-panel account-panel"><div className="panel-intro"><span className="step-kicker">YOUR ACCOUNT</span><h2>Your library<br /><em>profile.</em></h2><p>View your account details and manage your password.</p><div className="intro-line" /></div><div className="account-form"><label>Full name<input value={currentUser?.name || ''} readOnly /></label><label>Email address<input value={currentUser?.email || ''} readOnly /></label><label>Account type<input value={currentUser?.member_type || currentUser?.role || 'Member'} readOnly /></label><label>School ID<input value={currentUser?.library_id || 'Not applicable'} readOnly /></label><label>Address<input value={currentUser?.address || 'Not provided'} readOnly /></label><ChangePasswordForm /><button className="logout-action" onClick={onLogout}>Log out</button></div></section>}

        {activeStage === 'chat' && <section className="flow-panel chat-panel"><div className="chat-head"><div className="circle-icon"><span>✦</span></div><div><span className="step-kicker">STEP 02 / CIRCLE</span><h2>How can I help with the library?</h2><p>Search books, check your requests, or ask when a loan is due.</p></div><span className="online-pill">● live library</span></div><div className="messages">{messages.length === 0 ? <div className="empty-chat"><div className="sparkle">✦</div><p>Ask about a title, author, available books,<br />your requests, or your return dates.</p><div className="suggestions"><button onClick={() => setPrompt('What books are available?')}>Available books</button><button onClick={() => setPrompt('What books do I need to return?')}>My return dates</button><button onClick={() => setPrompt('What is my request status?')}>My requests</button></div></div> : messages.map((message, index) => <div className={`message ${message.from}`} key={`${message.text}-${index}`}><span>{message.text}</span>{message.items?.map((book) => <article className="circle-book-result" key={book.id}><strong>{book.title}</strong><small>{book.author} · {book.genre || 'Library'} · {book.available_quantity} available</small>{message.canRequest && <button type="button" disabled={requestingBookId !== null || book.available_quantity < 1} onClick={() => requestFromCircle(book)}>{requestingBookId === book.id ? 'Sending request...' : 'Request this book'}</button>}</article>)}</div>)}</div><form className="chat-input" onSubmit={askCircle}><input value={prompt} onChange={(event) => setPrompt(event.target.value)} placeholder="Ask Circle about the library..." /><button aria-label="Send message">↑</button></form></section>}

        {activeStage === 'borrow' && <section className="flow-panel borrow-panel">
          <div className="section-heading"><div><span className="step-kicker">STEP 03 / CLICK-AND-COLLECT</span><h2>Find your next <em>chapter.</em></h2></div><span className="availability"><i /> {books.reduce((total, book) => total + Number(book.available_quantity), 0)} copies available</span></div>
          <div className="catalog-controls">
            <input aria-label="Search books" value={bookQuery} onChange={(event) => setBookQuery(event.target.value)} placeholder="Search title or author" />
            <select aria-label="Filter by genre" value={genreFilter} onChange={(event) => setGenreFilter(event.target.value)}><option>All genres</option>{genres.map((genre) => <option key={genre}>{genre}</option>)}</select>
            <select aria-label="Filter by author" value={authorFilter} onChange={(event) => setAuthorFilter(event.target.value)}><option>All authors</option>{authors.map((author) => <option key={author}>{author}</option>)}</select>
            <select aria-label="Sort books" value={sortOrder} onChange={(event) => setSortOrder(event.target.value)}><option value="title">Alphabetical (A–Z)</option><option value="reverse">Reverse alphabetical (Z–A)</option><option value="author">Sort by author</option></select>
          </div>
          <div className="book-grid">{visibleBooks.map((book) => <article className={`book-card ${selectedBook?.id === book.id ? 'selected' : ''}`} key={book.id} onClick={() => setSelectedBook(book)}><div className={`book-cover ${book.accent}`}><span>R</span><strong>{book.title}</strong><small>{book.author}</small></div><div className="book-info"><span>{book.genre || 'Library'}</span><h3>{book.title}</h3><p>{book.author}</p><div className="book-status"><i /> {book.available_quantity > 0 ? `${book.available_quantity} available` : 'Unavailable'} <button disabled={!book.available_quantity} aria-label={`Select ${book.title}`}>+</button></div></div></article>)}</div>
          {visibleBooks.length === 0 && <p className="empty-chat">No books match these search and filter choices.</p>}
          {selectedBook && <div className="borrow-bar"><div><strong>{selectedBook.title}</strong><span>Request for pickup at the library desk</span></div><button disabled={loading || selectedBook.available_quantity < 1} className="primary-button" onClick={submitRequest}>{loading ? 'Submitting...' : 'Request this book'} <span>→</span></button></div>}
        </section>}

        {activeStage === 'requests' && <section className="flow-panel member-requests">
          <div className="section-heading"><div><span className="step-kicker">YOUR ACCOUNT</span><h2>Your <em>requests.</em></h2></div><span className="availability">{requests.length} total</span></div>
          {requests.length ? requests.map((request) => <article className="member-request-row" key={request.id}>
            <div><strong>{request.book}</strong><span>Request #{request.id}</span></div>
            <div><b className={`member-request-status ${request.status === 'Rejected' ? 'rejected' : ''}`}>{request.status}</b>{request.due && <span>Return by {request.due}</span>}{request.reason && <span className="request-notice">Notice: {request.reason}</span>}</div>
          </article>) : <div className="empty-chat">You have not made any book requests yet.</div>}
        </section>}

        {activeStage === 'return' && (
          <section className="flow-panel return-panel">
            <div className="return-copy">
              <span className="step-kicker">STEP 05 / RETURN BOOKS</span>
              <h2>Close the loop<br />with <em>ease.</em></h2>
              <p>Active loans are synced with the library database. Return books at the desk.</p>
              {loans.length ? loans.map((loan) => (
                <div className="receipt" key={loan.id}>
                  <span className="receipt-icon">▣</span>
                  <div><strong>{loan.title}</strong><span>Return by {loan.due}</span></div>
                  <b>ON LOAN</b>
                  {!(loan.extensions || []).some((extension) => extension.status === 'pending') && (
                    <div className="extension-request">
                      <input
                        aria-label={`Reason for extension for ${loan.title}`}
                        value={extensionReasons[loan.id] || ''}
                        onChange={(event) => setExtensionReasons({ ...extensionReasons, [loan.id]: event.target.value })}
                        placeholder="Reason for extension"
                      />
                      <button
                        disabled={(extensionReasons[loan.id] || '').trim().length < 5}
                        onClick={() => requestLoanExtension(loan.id, extensionReasons[loan.id].trim()).catch(() => {})}
                      >
                        Request extension
                      </button>
                    </div>
                  )}
                </div>
              )) : (
                <div className="receipt"><div><strong>No active loans</strong><span>Approved requests will appear here.</span></div></div>
              )}
            </div>
          </section>
        )}

        {activeStage === 'payments' && <section className="flow-panel member-payments">
          <div className="section-heading"><div><span className="step-kicker">ACCOUNT / PENALTIES</span><h2>Payments & <em>receipts.</em></h2></div></div>
          <div className="amount-due"><span>Outstanding amount to pay</span><strong>${penaltyTotal.toFixed(2)}</strong>{penaltyTotal <= 0 && <small>No outstanding penalties.</small>}</div>
          {penaltyTotal > 0 && <div className="receipt-create"><p>Create a receipt to take to the cashier. Payment is completed in person.</p><button disabled={loading || payments.some((payment) => payment.status !== 'Paid - cleared')} className="primary-button" onClick={() => createPenaltyReceipt().catch(() => {})}>Create penalty receipt <span>→</span></button></div>}
          <h3>Your receipts</h3>
          {payments.length > 0 && <p className="print-help">Choose “Download / Print PDF”, then select “Save as PDF” in your browser’s print dialog to download a copy.</p>}
          {payments.length ? payments.map((payment) => {
            const canSubmitPhoto = payment.status === 'Printed - awaiting cashier' || payment.status === 'Declined - resubmission required';
            return (
              <article className="member-receipt" key={payment.id}>
                <div className={printingReceipt === payment.id ? 'print-target receipt-document' : 'receipt-document'}>
                  <span className="step-kicker">LIBRARY PENALTY PAYMENT RECEIPT</span>
                  <strong>{payment.id}</strong>
                  <span><b>Member</b>{currentUser?.name || 'Library member'}</span>
                  <span><b>Date issued</b>{payment.createdAt ? new Date(payment.createdAt).toLocaleDateString() : 'Not available'}</span>
                  <span><b>Status</b>{payment.status}</span>
                  <div className="receipt-total"><span>Amount due at cashier</span><b>${payment.amount.toFixed(2)}</b></div>
                  <p>Pay the amount shown at the library cashier. After payment, submit a clear photo of the cashier-issued receipt for administrator review.</p>
                  {payment.reviewReason && <p className="receipt-review-reason">Admin notice: {payment.reviewReason}</p>}
                  {payment.status === 'Submitted - awaiting review' && <p className="receipt-submission-status">Your receipt photo was submitted. The administrator will review the payment.</p>}
                  {receiptUploadErrors[payment.apiId] && <p className="receipt-upload-error" role="alert">{receiptUploadErrors[payment.apiId]}</p>}
                </div>
                <div className="member-receipt-actions">
                  <button type="button" className="primary-button" onClick={() => printReceipt(payment.id)}>Download / Print PDF</button>
                  {canSubmitPhoto && (
                    <>
                      <input
                        accept="image/jpeg,image/png,image/webp"
                        aria-label={`Choose cashier receipt photo for ${payment.id}`}
                        className="receipt-file-input"
                        onChange={(event) => submitCashierReceipt(payment, event)}
                        ref={(element) => { receiptFileInputs.current[payment.apiId] = element; }}
                        type="file"
                      />
                      <button
                        type="button"
                        className="request-action submit-receipt-button"
                        disabled={loading}
                        onClick={() => receiptFileInputs.current[payment.apiId]?.click()}
                      >
                        Submit receipt for admin confirmation
                      </button>
                    </>
                  )}
                </div>
              </article>
            );
          }) : <p className="empty-chat">No penalty receipts have been issued.</p>}
        </section>}
      </section>
    </main>
  );
}

export default Home;
