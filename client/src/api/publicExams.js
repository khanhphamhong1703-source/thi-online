import api from './client';

export const publicExamApi = {
  list: (params) => api.get('/public/exams', { params }),
  get: (id) => api.get(`/public/exams/${id}`),
  lookup: (payload) => api.post('/public/exams/lookup', payload),
  start: (id, payload) => api.post(`/public/exams/${id}/start`, payload),
  getAttempt: (attemptId, token) =>
    api.get(`/public/attempts/${attemptId}`, {
      headers: { Authorization: `Bearer ${token}` },
    }),
  saveAnswers: (attemptId, token, answers) =>
    api.patch(
      `/public/attempts/${attemptId}/answers`,
      { answers },
      { headers: { Authorization: `Bearer ${token}` } }
    ),
  submit: (attemptId, token, answers) =>
    api.post(
      `/public/attempts/${attemptId}/submit`,
      { answers },
      { headers: { Authorization: `Bearer ${token}` } }
    ),
  recordExit: (attemptId, token) =>
    api.post(
      `/public/attempts/${attemptId}/exit`,
      {},
      { headers: { Authorization: `Bearer ${token}` } }
    ),
};
