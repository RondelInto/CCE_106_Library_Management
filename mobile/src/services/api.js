import axios from 'axios';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://10.0.2.2:8000/api';
let authToken = null;

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    Accept: 'application/json',
  },
});

api.interceptors.request.use((config) => {
  if (authToken) config.headers.Authorization = `Bearer ${authToken}`;
  return config;
});

export const login = async (credentials) => {
  const { data } = await api.post('/login', credentials);
  authToken = data.token;
  return data.user;
};

export const updatePassword = async (passwords) => (await api.put('/user/password', passwords)).data;

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
export const confirmPayment = async (id) => (await api.post(`/admin/penalty-receipts/${id}/confirm`)).data;
export const declinePayment = async (id, reason) => (await api.post(`/admin/penalty-receipts/${id}/decline`, { reason })).data;
export const submitPenaltyReceiptPhoto = async (id, photo) => {
  const form = new FormData();
  form.append('receipt_photo', {
    uri: photo.uri,
    name: photo.fileName || `receipt-${id}.jpg`,
    type: photo.mimeType || 'image/jpeg',
  });
  return (await api.post(`/penalty-receipts/${id}/photo`, form)).data;
};
export const getPenaltyReceiptPhotoSource = (id) => ({
  uri: `${BASE_URL}/penalty-receipts/${id}/photo`,
  headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
});
export const registerMember = async (member) => (await api.post('/admin/members', member)).data;
export const updateMember = async (id, member) => (await api.put(`/admin/members/${id}`, member)).data;
export const createBook = async (book) => (await api.post('/books', book)).data;
export const updateBook = async (id, book) => (await api.put(`/books/${id}`, book)).data;
export const deleteBook = async (id) => (await api.delete(`/books/${id}`)).data;

export const logout = async () => {
  try {
    await api.post('/logout');
  } finally {
    authToken = null;
  }
};

export const pingApi = async () => {
  const { data } = await api.get('/ping');
  return data;
};

export default api;
