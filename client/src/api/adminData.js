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
  exportBackup: () =>
    api.get('/admin/data/backup/export', {
      responseType: 'blob',
      timeout: 120000,
    }),
  importBackup: (file, mode) => {
    const form = new FormData();
    form.append('file', file);
    form.append('mode', mode);
    if (mode === 'replace') form.append('confirmReplace', 'true');
    return api.post('/admin/data/backup/import', form, { timeout: 120000 });
  },
};
