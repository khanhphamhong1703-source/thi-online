const env = require('../../config/env');
const asyncHandler = require('../../utils/asyncHandler');
const ApiError = require('../../utils/ApiError');
const {
  accessCookieOptions,
  refreshCookieOptions,
  clearAccessCookieOptions,
  clearRefreshCookieOptions,
} = require('../../utils/cookies');
const authService = require('./auth.service');
const { recordActivity } = require('../activity/activity.service');

function requestMeta(req) {
  return {
    userAgent: req.get('user-agent'),
    ip: req.ip,
  };
}

function setAuthCookies(res, { accessToken, refreshToken }) {
  res.cookie(env.ACCESS_COOKIE_NAME, accessToken, accessCookieOptions());
  res.cookie(env.REFRESH_COOKIE_NAME, refreshToken, refreshCookieOptions());
}

function clearAuthCookies(res) {
  res.clearCookie(env.ACCESS_COOKIE_NAME, clearAccessCookieOptions());
  res.clearCookie(env.REFRESH_COOKIE_NAME, clearRefreshCookieOptions());
}

const login = asyncHandler(async (req, res) => {
  try {
    const { accessToken, refreshToken, user } = await authService.login(
      req.body,
      requestMeta(req)
    );
    setAuthCookies(res, { accessToken, refreshToken });

    if (user.role === 'TEACHER' || user.role === 'ADMIN') {
      await recordActivity({
        req,
        actor: user,
        category: 'AUTH',
        action: 'AUTH_LOGIN_SUCCESS',
      });
    }

    res.json({ success: true, message: 'Đăng nhập thành công', user });
  } catch (error) {
    const expectedRole = req.body?.expectedRole;
    if (expectedRole === 'TEACHER' || expectedRole === 'ADMIN') {
      const username = String(req.body?.username || '').trim();
      await recordActivity({
        req,
        actor: {
          id: null,
          username: username || 'không xác định',
          fullName: username || 'Không xác định',
          role: expectedRole,
        },
        category: 'AUTH',
        action: 'AUTH_LOGIN_FAILED',
        status: 'FAILED',
        reason: error.message,
      });
    }
    throw error;
  }
});

const refresh = asyncHandler(async (req, res) => {
  const rawRefreshToken = req.cookies?.[env.REFRESH_COOKIE_NAME];
  if (!rawRefreshToken) {
    throw new ApiError(401, 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn');
  }

  const session = await authService.refresh(rawRefreshToken, requestMeta(req));
  setAuthCookies(res, session);
  res.json({ success: true, user: session.user });
});

const logout = asyncHandler(async (req, res) => {
  try {
    await authService.logout(req.cookies?.[env.REFRESH_COOKIE_NAME]);
  } finally {
    clearAuthCookies(res);
  }
  res.json({ success: true, message: 'Đã đăng xuất' });
});

const me = asyncHandler(async (req, res) => {
  const user = await authService.getMe(req.user.id);
  res.json({ success: true, user });
});

const changePassword = asyncHandler(async (req, res) => {
  const session = await authService.changePassword(req.user.id, req.body, requestMeta(req));
  setAuthCookies(res, session);

  if (req.user.role === 'TEACHER') {
    await recordActivity({
      req,
      category: 'ACCOUNT',
      action: 'PASSWORD_CHANGE',
    });
  }

  res.json({ success: true, message: 'Đổi mật khẩu thành công' });
});

module.exports = { login, refresh, logout, me, changePassword };
