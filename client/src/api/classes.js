import api from './client';

export const classApi = {
  getDashboard: () => api.get('/teacher/dashboard'),
  list: (params) => api.get('/classes', { params }),
  get: (id) => api.get(`/classes/${id}`),
  create: (payload) => api.post('/classes', payload),
  update: (id, payload) => api.patch(`/classes/${id}`, payload),
  archive: (id) => api.delete(`/classes/${id}`),
};
