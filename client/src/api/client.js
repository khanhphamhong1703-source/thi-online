import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  withCredentials: true,
  timeout: 30000,
});

let refreshPromise = null;
const REFRESH_LOCK = 'vieexam-auth-refresh';

function refreshAccessToken() {
  if (!refreshPromise) {
    const request = () => api.post('/auth/refresh');
    // Khóa theo origin để nhiều tab không xoay vòng cùng một refresh token.
    const hasWebLocks = typeof navigator !== 'undefined' && Boolean(navigator.locks?.request);
    const run = hasWebLocks
      ? () => navigator.locks.request(REFRESH_LOCK, request)
      : request;
    refreshPromise = run().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const url = error.config?.url || '';
    const isPublicAttempt = url.includes('/public/attempts');
    const isLoginRequest = url.includes('/auth/login');
    const isRefreshRequest = url.includes('/auth/refresh');
    const config = error.config;

    if (
      error.response?.status === 401 &&
      !isLoginRequest &&
      !isPublicAttempt &&
      !isRefreshRequest &&
      config &&
      !config._retry
    ) {
      config._retry = true;
      try {
        await refreshAccessToken();
        return api(config);
      } catch (refreshError) {
        if ([401, 403].includes(refreshError.response?.status)) {
          window.dispatchEvent(new Event('auth:unauthorized'));
        }
        return Promise.reject(refreshError);
      }
    }

    if (error.response?.status === 401 && !isLoginRequest && !isPublicAttempt && !isRefreshRequest) {
      window.dispatchEvent(new Event('auth:unauthorized'));
    }
    return Promise.reject(error);
  }
);

export function getErrorMessage(error, fallback = 'Đã xảy ra lỗi. Vui lòng thử lại.') {
  const payload = error.response?.data;
  if (payload?.details?.length) {
    return payload.details[0].message || payload.message || fallback;
  }
  if (payload?.message) return payload.message;
  if (error.code === 'ECONNABORTED') return 'Yêu cầu quá thời gian chờ. Vui lòng thử lại.';
  if (!error.response) return 'Không kết nối được tới máy chủ. Vui lòng kiểm tra backend.';
  return fallback;
}

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function getFilenameFromDisposition(disposition, fallback) {
  if (!disposition) return fallback;
  const match = disposition.match(/filename="?([^"]+)"?/i);
  return match?.[1] || fallback;
}

export default api;
