import api from './client';

export const examApi = {
  list: (params) => api.get('/exams', { params }),
  get: (id) => api.get(`/exams/${id}`),
  create: (payload) => api.post('/exams', payload),
  update: (id, payload) => api.patch(`/exams/${id}`, payload),
  extractImportText: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/exams/import-text', formData);
  },
  publish: (id) => api.post(`/exams/${id}/publish`),
  close: (id) => api.post(`/exams/${id}/close`),
  remove: (id) => api.delete(`/exams/${id}`),
  results: (id, params) => api.get(`/exams/${id}/attempts`, { params }),
  attemptDetail: (examId, attemptId) =>
    api.get(`/exams/${examId}/attempts/${attemptId}`),
  exportResults: (id, classId) =>
    api.get(`/exams/${id}/results/export`, {
      params: classId ? { classId } : undefined,
      responseType: 'blob',
    }),
};
