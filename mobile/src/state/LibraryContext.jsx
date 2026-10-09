import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import {
  approveRequest as approveRequestApi,
  approveLoanExtension as approveLoanExtensionApi,
  confirmPayment as confirmPaymentApi,
  declinePayment as declinePaymentApi,
  confirmReturn as confirmReturnApi,
  createGenre as createGenreApi,
  deleteGenre as deleteGenreApi,
  updateGenre as updateGenreApi,
  createBook,
  createPenaltyReceipt as createPenaltyReceiptApi,
  deleteBook,
  getAdminLibrary,
  getLibrary,
  submitPenaltyReceiptPhoto as submitPenaltyReceiptPhotoApi,
  updateMember as updateMemberApi,
  declineLoanExtension as declineLoanExtensionApi,
  registerMember as registerMemberApi,
  requestBook as requestBookApi,
  rejectRequest as rejectRequestApi,
  requestLoanExtension as requestLoanExtensionApi,
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
  id: String(book.id),
  apiId: book.id,
  code: `BK-${String(book.id).padStart(4, '0')}`,
  category: book.genre || 'Library',
  copies: Number(book.available_quantity),
  quantity: Number(book.quantity),
  accent: '#496B58',
});
const mapUser = (user) => {
  const names = user.name.split(' ');
  return {
    ...user,
    id: user.library_id || String(user.id),
    schoolId: user.library_id || '',
    apiId: user.id,
    firstName: names[0],
    lastName: names.slice(1).join(' '),
    role: user.member_type || user.role,
    penalty: Number(user.outstanding_penalty_total ?? user.penalty_balance ?? 0),
  };
};
const mapRequest = (request) => ({
  id: String(request.id),
  apiId: request.id,
  createdAt: request.created_at,
  dueDate: request.loan?.due_date || null,
  memberId: request.user?.library_id || String(request.user_id),
  member: request.user?.name || '',
  book: request.book?.title || '',
  due: formatDate(request.loan?.due_date),
  status: { pending: 'Ready to approve', approved: 'Approved - pick up', rejected: 'Declined', returned: 'Returned' }[request.status] || request.status,
  reason: request.rejection_reason || '',
});
const mapLoan = (loan) => ({
  id: String(loan.id),
  apiId: loan.id,
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
  status: {
    'awaiting payment': 'Printed - awaiting cashier',
    submitted: 'Submitted - awaiting review',
    declined: 'Declined - resubmission required',
    'paid - cleared': 'Paid - cleared',
  }[payment.status] || payment.status,
  reviewReason: payment.review_reason || '',
  hasPhoto: Boolean(payment.receipt_image_path),
});

export function LibraryProvider({ children }) {
  const [books, setBooks] = useState([]);
  const [users, setUsers] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loans, setLoans] = useState([]);
  const [payments, setPayments] = useState([]);
  const [genres, setGenres] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [role, setRole] = useState('member');

  const applySnapshot = useCallback((data, admin) => {
    if (data.user) setCurrentUser(data.user);
    setUsers((admin ? data.users : [data.user]).map(mapUser));
    setBooks(data.books.map(mapBook));
    setRequests(data.requests.map(mapRequest));
    setLoans(data.loans.map(mapLoan));
    setPayments(data.payments.map(mapPayment));
    setGenres(data.genres || []);
  }, []);

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
    books, users, requests, loans, payments, genres, currentUser, error, loading, loadLibrary, refresh,
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
        (book.genre || book.category || '').toLowerCase() === oldName.toLowerCase()
          ? { ...book, genre: updated, category: updated }
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
    saveBook: (book, id) => runAction(() => {
      const payload = {
        title: book.title,
        author: book.author,
        isbn: book.isbn || book.code,
        genre: book.category || book.genre || null,
        quantity: Number(book.quantity ?? book.copies),
      };
      return id ? updateBook(id, payload) : createBook(payload);
    }),
    deleteBook: (id) => runAction(() => deleteBook(id)),
  }), [books, users, requests, loans, payments, currentUser, error, loading, loadLibrary, refresh, runAction, genres]);

  return <LibraryContext.Provider value={value}>{children}</LibraryContext.Provider>;
}

export function useLibrary() {
  const context = useContext(LibraryContext);
  if (!context) throw new Error('useLibrary must be used inside LibraryProvider');
  return context;
}
