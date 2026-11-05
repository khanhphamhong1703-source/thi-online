import api from './client';

export const adminDataApi = {
  summary: () => api.get('/admin/data/summary'),
  listTeachers: (params) => api.get('/admin/data/teachers', { params }),
  listClasses: (params) => api.get('/admin/data/classes', { params }),
  listStudents: (params) => api.get('/admin/data/students', { params }),
  listExams: (params) => api.get('/admin/data/exams', { params }),
  restoreClass: (id) => api.patch(`/admin/data/classes/${id}/restore`),
  archiveClass: (id) => api.patch(`/admin/data/classes/${id}/archive`),
  deleteTeacher: (id) => api.delete(`/admin/data/teachers/${id}`),
  deleteClass: (id) => api.delete(`/admin/data/classes/${id}`),
  deleteStudent: (id) => api.delete(`/admin/data/students/${id}`),
  deleteExam: (id) => api.delete(`/admin/data/exams/${id}`),
};
