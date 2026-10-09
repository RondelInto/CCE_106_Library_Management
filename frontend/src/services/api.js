import axios from 'axios';

const TOKEN_KEY = 'reverie.access-token';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: {
    Accept: 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const getCurrentUser = async () => {
  const { data } = await api.get('/user');
  return data;
};

export const login = async (credentials) => {
  const { data } = await api.post('/login', credentials);
  localStorage.setItem(TOKEN_KEY, data.token);
  return data.user;
};

export const logout = async () => {
  try {
    await api.post('/logout');
  } finally {
    localStorage.removeItem(TOKEN_KEY);
  }
};

export const updatePassword = async (passwords) => (await api.put('/user/password', passwords)).data;

export const clearAuthToken = () => localStorage.removeItem(TOKEN_KEY);
export const hasAuthToken = () => Boolean(localStorage.getItem(TOKEN_KEY));

export const pingApi = async () => {
  const { data } = await api.get('/ping');
  return data;
};

// ---- Books ----

export const getBooks = async (search = '') => {
  const { data } = await api.get('/books', { params: search ? { search } : {} });
  return data.data;
};

export const getBook = async (id) => {
  const { data } = await api.get(`/books/${id}`);
  return data.data;
};

export const createBook = async (payload) => {
  const { data } = await api.post('/books', payload);
  return data.data;
};

export const updateBook = async (id, payload) => {
  const { data } = await api.put(`/books/${id}`, payload);
  return data.data;
};

export const deleteBook = async (id) => {
  const { data } = await api.delete(`/books/${id}`);
  return data;
};

export const getLibrary = async () => (await api.get('/library')).data;
export const getAdminLibrary = async () => (await api.get('/admin/library')).data;
export const getGenres = async () => (await api.get('/genres')).data.data;
export const createGenre = async (name) => (await api.post('/genres', { name })).data.data;
export const updateGenre = async (old_name, name) => (await api.put('/genres', { old_name, name })).data.data;
export const deleteGenre = async (name) => (await api.delete('/genres', { data: { name } })).data;
export const requestBook = async (book_id) => (await api.post('/requests', { book_id })).data;
export const approveRequest = async (id, due_date) => (await api.post(`/admin/requests/${id}/approve`, { due_date })).data;
export const rejectRequest = async (id, reason) => (await api.post(`/admin/requests/${id}/reject`, { reason })).data;
export const requestLoanExtension = async (id, reason) => (await api.post(`/loans/${id}/extensions`, { reason })).data;
export const approveLoanExtension = async (id, due_date) => (await api.post(`/admin/extensions/${id}/approve`, { due_date })).data;
export const declineLoanExtension = async (id) => (await api.post(`/admin/extensions/${id}/decline`)).data;
export const confirmReturn = async (id) => (await api.post(`/admin/loans/${id}/return`)).data;
export const createPenaltyReceipt = async () => (await api.post('/penalty-receipts')).data;
export const submitPenaltyReceiptPhoto = async (id, photo) => {
  const form = new FormData();
  form.append('receipt_photo', photo, photo.name || `receipt-${id}`);
  return (await api.post(`/penalty-receipts/${id}/photo`, form)).data;
};
export const confirmPayment = async (id) => (await api.post(`/admin/penalty-receipts/${id}/confirm`)).data;
export const declinePayment = async (id, reason) => (await api.post(`/admin/penalty-receipts/${id}/decline`, { reason })).data;
export const getPenaltyReceiptPhoto = async (id) => (await api.get(`/penalty-receipts/${id}/photo`, { responseType: 'blob' })).data;
export const registerMember = async (member) => (await api.post('/admin/members', member)).data;
export const updateMember = async (id, member) => (await api.put(`/admin/members/${id}`, member)).data;

export default api;
