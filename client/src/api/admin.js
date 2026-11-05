import api from './client';

export const adminApi = {
  getDashboard: () => api.get('/admin/dashboard'),
  listTeachers: (params) => api.get('/admin/teachers', { params }),
  getTeacher: (id) => api.get(`/admin/teachers/${id}`),
  createTeacher: (payload) => api.post('/admin/teachers', payload),
  updateTeacher: (id, payload) => api.patch(`/admin/teachers/${id}`, payload),
  setTeacherStatus: (id, isActive) =>
    api.patch(`/admin/teachers/${id}/status`, { isActive }),
  resetPassword: (id, newPassword) =>
    api.post(`/admin/teachers/${id}/reset-password`, { newPassword }),
};
