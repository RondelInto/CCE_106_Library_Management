import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import {
  approveRequest as approveRequestApi,
  confirmPayment as confirmPaymentApi,
  confirmReturn as confirmReturnApi,
  approveLoanExtension as approveLoanExtensionApi,
  createGenre as createGenreApi,
  deleteGenre as deleteGenreApi,
  updateGenre as updateGenreApi,
  createBook,
  createPenaltyReceipt as createPenaltyReceiptApi,
  deleteBook,
  getAdminLibrary,
  getLibrary,
  declineLoanExtension as declineLoanExtensionApi,
  declinePayment as declinePaymentApi,
  rejectRequest as rejectRequestApi,
  requestBook as requestBookApi,
  requestLoanExtension as requestLoanExtensionApi,
  registerMember as registerMemberApi,
  submitPenaltyReceiptPhoto as submitPenaltyReceiptPhotoApi,
  updateMember as updateMemberApi,
  updateBook,
} from '../services/api.js';

const LibraryContext = createContext(null);

const formatDate = (date) => {
  if (!date) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(date);
  if (!match) return null;
  const [, year, month, day] = match;
  return new Date(Number(year), Number(month) - 1, Number(day)).toLocaleDateString();
};

const mapBook = (book) => ({
  ...book,
  isbn: book.isbn,
  code: `BK-${String(book.id).padStart(4, '0')}`,
  copies: book.quantity,
  tag: book.genre || 'Library',
  accent: 'blue',
});
const mapUser = (user) => ({
  ...user,
  id: user.library_id || String(user.id),
  apiId: user.id,
  name: user.name,
  schoolId: user.library_id || '',
  role: user.member_type || user.role,
  penalty: Number(user.outstanding_penalty_total ?? user.penalty_balance ?? 0),
});
const mapRequest = (request) => ({
  id: request.id,
  userId: request.user_id,
  name: request.user?.name || '',
  role: request.user?.member_type || 'Member',
  book: request.book?.title || '',
  due: formatDate(request.loan?.due_date),
  dueDate: request.loan?.due_date || '',
  createdAt: request.created_at || null,
  status: {
    pending: 'Ready to approve',
    approved: 'Approved - pick up',
    rejected: 'Rejected',
    returned: 'Returned',
  }[request.status] || request.status,
  reason: request.rejection_reason || '',
});
const mapLoan = (loan) => ({
  id: loan.id,
  memberId: loan.user?.library_id || String(loan.user_id),
  member: loan.user?.name || '',
  title: loan.book?.title || '',
  due: formatDate(loan.due_date),
  penalty: Number(loan.penalty_amount || 0),
  dueDate: loan.due_date,
  extensions: (loan.extensions || []).map((extension) => ({
    id: extension.id,
    reason: extension.reason,
    status: extension.status,
    suggestedDueDate: extension.approved_due_date || null,
  })),
});
const mapPayment = (payment) => ({
  id: `RCP-${payment.id}`,
  apiId: payment.id,
  memberId: payment.user_id,
  member: payment.user?.name || '',
  amount: Number(payment.amount),
  reviewReason: payment.review_reason || '',
  hasReceiptPhoto: Boolean(payment.receipt_image_path),
  status: {
    'awaiting payment': 'Printed - awaiting cashier',
    submitted: 'Submitted - awaiting review',
    declined: 'Declined - resubmission required',
    'paid - cleared': 'Paid - cleared',
  }[payment.status] || payment.status,
  createdAt: payment.created_at || null,
});

export function LibraryProvider({ children }) {
  const [users, setUsers] = useState([]);
  const [books, setBooks] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loans, setLoans] = useState([]);
  const [requests, setRequests] = useState([]);
  const [genres, setGenres] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [role, setRole] = useState('member');

  const applySnapshot = useCallback((data, admin) => {
    setCurrentUser(data.user || currentUser);
    setUsers((admin ? data.users : [data.user]).map(mapUser));
    setBooks(data.books.map(mapBook));
    setRequests(data.requests.map(mapRequest));
    setLoans(data.loans.map(mapLoan));
    setPayments(data.payments.map(mapPayment));
    setGenres(data.genres || []);
  }, [currentUser]);

  const loadLibrary = useCallback(async (selectedRole = 'member') => {
    setLoading(true);
    setError('');
    setRole(selectedRole);
    try {
      const data = selectedRole === 'admin' ? await getAdminLibrary() : await getLibrary();
      applySnapshot(data, selectedRole === 'admin');
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Could not load library data.');
      throw requestError;
    } finally {
      setLoading(false);
    }
  }, [applySnapshot]);

  const refresh = useCallback(() => loadLibrary(role), [loadLibrary, role]);
  const runAction = useCallback(async (action) => {
    setError('');
    try {
      const result = await action();
      try {
        await refresh();
      } catch {
        // Keep successful one-time responses available even if the reload fails.
      }
      return result;
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'The library action could not be completed.');
      throw requestError;
    }
  }, [refresh]);

  const value = useMemo(() => ({
    users,
    books,
    payments,
    loans,
    requests,
    genres,
    currentUser,
    loading,
    error,
    setError,
    loadLibrary,
    refresh,
    requestBook: (id) => runAction(() => requestBookApi(id)),
    approveRequest: (id, dueDate) => runAction(() => approveRequestApi(id, dueDate)),
    rejectRequest: (id, reason) => runAction(() => rejectRequestApi(id, reason)),
    requestLoanExtension: (id, reason) => runAction(() => requestLoanExtensionApi(id, reason)),
    approveLoanExtension: (id, dueDate) => runAction(() => approveLoanExtensionApi(id, dueDate)),
    declineLoanExtension: (id) => runAction(() => declineLoanExtensionApi(id)),
    createGenre: (name) => runAction(async () => {
      const created = await createGenreApi(name);
      setGenres((current) => [...current, created].sort((left, right) => left.localeCompare(right)));
      return created;
    }),
    deleteGenre: (name) => runAction(async () => {
      await deleteGenreApi(name);
      setGenres((current) => current.filter((genre) => genre.toLowerCase() !== name.toLowerCase()));
    }),
    updateGenre: (oldName, name) => runAction(async () => {
      const updated = await updateGenreApi(oldName, name);
      setGenres((current) => current.map((genre) => (genre.toLowerCase() === oldName.toLowerCase() ? updated : genre))
        .sort((left, right) => left.localeCompare(right)));
      setBooks((current) => current.map((book) => (
        (book.genre || book.tag || '').toLowerCase() === oldName.toLowerCase()
          ? { ...book, genre: updated, tag: updated }
          : book
      )));
      return updated;
    }),
    confirmReturn: (id) => runAction(() => confirmReturnApi(id)),
    createPenaltyReceipt: () => runAction(createPenaltyReceiptApi),
    submitPenaltyReceiptPhoto: (id, photo) => runAction(() => submitPenaltyReceiptPhotoApi(id, photo)),
    confirmPayment: (id) => runAction(() => confirmPaymentApi(id)),
    declinePayment: (id, reason) => runAction(() => declinePaymentApi(id, reason)),
    registerMember: (member) => runAction(() => registerMemberApi(member)),
    updateMember: (id, member) => runAction(async () => {
      const { data } = await updateMemberApi(id, member);
      setUsers((current) => current.map((user) => (user.apiId === id ? mapUser({
        ...data,
        outstanding_penalty_total: user.penalty,
      }) : user)));
      return data;
    }),
    saveBook: async (book, id) => runAction(async () => {
      const payload = {
        title: book.title,
        author: book.author,
        isbn: book.isbn || book.code,
        genre: book.genre || book.tag || null,
        quantity: Number(book.quantity ?? book.copies),
      };
      return id ? updateBook(id, payload) : createBook(payload);
    }),
    deleteBook: (id) => runAction(() => deleteBook(id)),
  }), [users, books, payments, loans, requests, currentUser, loading, error, loadLibrary, refresh, runAction, genres]);

  return <LibraryContext.Provider value={value}>{children}</LibraryContext.Provider>;
}

export function useLibrary() {
  const context = useContext(LibraryContext);
  if (!context) throw new Error('useLibrary must be used inside LibraryProvider');
  return context;
}
