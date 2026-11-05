import api from './client';

export const studentApi = {
  listByClass: (classId, params) =>
    api.get(`/classes/${classId}/students`, { params }),
  addToClass: (classId, payload) =>
    api.post(`/classes/${classId}/students`, payload),
  removeFromClass: (classId, studentId) =>
    api.delete(`/classes/${classId}/students/${studentId}`),
  get: (studentId) => api.get(`/students/${studentId}`),
  update: (studentId, payload) => api.patch(`/students/${studentId}`, payload),
  previewImport: (classId, file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post(`/classes/${classId}/students/import/preview`, formData);
  },
  commitImport: (classId, file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post(`/classes/${classId}/students/import/commit`, formData);
  },
  exportByClass: (classId) =>
    api.get(`/classes/${classId}/students/export`, { responseType: 'blob' }),
  downloadErrorReport: (classId, errors) =>
    api.post(`/classes/${classId}/students/import/error-report`, { errors }, {
      responseType: 'blob',
    }),
};
