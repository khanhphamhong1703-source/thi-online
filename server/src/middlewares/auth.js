const jwt = require('jsonwebtoken');
const env = require('../config/env');
const prisma = require('../config/prisma');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

const authenticate = asyncHandler(async (req, _res, next) => {
  let token = req.cookies?.[env.ACCESS_COOKIE_NAME];

  if (!token && req.headers.authorization?.startsWith('Bearer ')) {
    token = req.headers.authorization.slice(7);
  }

  if (!token) {
    throw new ApiError(401, 'Bạn chưa đăng nhập');
  }

  let payload;
  try {
    payload = jwt.verify(token, env.JWT_SECRET);
  } catch {
    throw new ApiError(401, 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn');
  }

  if (!payload.sub || payload.scope !== 'ACCESS') {
    throw new ApiError(401, 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn');
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.sub },
    select: {
      id: true,
      username: true,
      fullName: true,
      email: true,
      phone: true,
      role: true,
      isActive: true,
      tokenVersion: true,
      createdAt: true,
    },
  });

  if (!user) {
    throw new ApiError(401, 'Tài khoản không tồn tại');
  }

  if (!user.isActive) {
    throw new ApiError(403, 'Tài khoản đã bị khóa. Vui lòng liên hệ quản trị viên.');
  }

  if ((payload.tv ?? 0) !== (user.tokenVersion ?? 0)) {
    throw new ApiError(401, 'Phiên đăng nhập đã hết hiệu lực. Vui lòng đăng nhập lại.');
  }

  req.user = user;
  next();
});

function requireRole(...roles) {
  return (req, _res, next) => {
    if (!req.user) {
      return next(new ApiError(401, 'Bạn chưa đăng nhập'));
    }
    if (!roles.includes(req.user.role)) {
      return next(new ApiError(403, 'Bạn không có quyền truy cập chức năng này'));
    }
    return next();
  };
}

module.exports = { authenticate, requireRole };
