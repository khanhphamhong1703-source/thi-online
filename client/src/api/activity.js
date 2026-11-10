import api from './client';

export const activityApi = {
  mine: (params) => api.get('/teacher/activity', { params }),
  adminList: (params) => api.get('/admin/data/activity', { params }),
};
