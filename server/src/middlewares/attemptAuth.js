const jwt = require('jsonwebtoken');
const env = require('../config/env');
const ApiError = require('../utils/ApiError');

function authenticateAttempt(req, _res, next) {
  const authorization = req.headers.authorization || '';
  if (!authorization.startsWith('Bearer ')) {
    return next(new ApiError(401, 'Thiếu phiên làm bài'));
  }

  try {
    const payload = jwt.verify(authorization.slice(7), env.JWT_SECRET);
    if (payload.scope !== 'EXAM_ATTEMPT' || !payload.attemptId) {
      throw new Error('invalid scope');
    }
    if (req.params.id && req.params.id !== payload.attemptId) {
      return next(new ApiError(403, 'Phiên làm bài không hợp lệ'));
    }
    req.attemptId = payload.attemptId;
    return next();
  } catch {
    return next(new ApiError(401, 'Phiên làm bài không hợp lệ hoặc đã hết hạn'));
  }
}

module.exports = { authenticateAttempt };
