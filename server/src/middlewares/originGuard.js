const { isAllowedOrigin } = require('../config/origins');
const ApiError = require('../utils/ApiError');

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

// Cookie JWT + Origin check (kết hợp SameSite=Lax) để chống CSRF cho request ghi dữ liệu.
function originGuard(req, _res, next) {
  if (SAFE_METHODS.has(req.method)) return next();

  const origin = req.get('origin');
  if (origin && !isAllowedOrigin(origin, req)) {
    return next(new ApiError(403, 'Nguồn gửi yêu cầu không hợp lệ'));
  }

  if (req.get('sec-fetch-site') === 'cross-site') {
    return next(new ApiError(403, 'Yêu cầu cross-site bị từ chối'));
  }

  return next();
}

module.exports = originGuard;
