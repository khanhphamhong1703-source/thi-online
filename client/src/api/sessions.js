import api from './client';

export const adminSessionsApi = {
  list: (params) => api.get('/admin/sessions', { params }),
  remove: (id) => api.delete(`/admin/sessions/${id}`),
  revokeAll: (userId) => api.post(`/admin/sessions/users/${userId}/revoke-all`),
};
