const env = require('../../config/env');
const asyncHandler = require('../../utils/asyncHandler');
const { authCookieOptions, clearCookieOptions } = require('../../utils/cookies');
const authService = require('./auth.service');
const { recordActivity } = require('../activity/activity.service');

const login = asyncHandler(async (req, res) => {
  try {
    const { token, user } = await authService.login(req.body);
    res.cookie(env.COOKIE_NAME, token, authCookieOptions());

    if (user.role === 'TEACHER') {
      await recordActivity({
        req,
        actor: user,
        category: 'AUTH',
        action: 'AUTH_LOGIN_SUCCESS',
      });
    }

    res.json({ success: true, message: 'Đăng nhập thành công', user });
  } catch (error) {
    if (req.body?.expectedRole === 'TEACHER') {
      const username = String(req.body?.username || '').trim();
      await recordActivity({
        req,
        actor: {
          id: null,
          username: username || 'không xác định',
          fullName: username || 'Không xác định',
          role: 'TEACHER',
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

const logout = asyncHandler(async (_req, res) => {
  res.clearCookie(env.COOKIE_NAME, clearCookieOptions());
  res.json({ success: true, message: 'Đã đăng xuất' });
});

const me = asyncHandler(async (req, res) => {
  const user = await authService.getMe(req.user.id);
  res.json({ success: true, user });
});

const changePassword = asyncHandler(async (req, res) => {
  await authService.changePassword(req.user.id, req.body);

  if (req.user.role === 'TEACHER') {
    await recordActivity({
      req,
      category: 'ACCOUNT',
      action: 'PASSWORD_CHANGE',
    });
  }

  res.json({ success: true, message: 'Đổi mật khẩu thành công' });
});

module.exports = { login, logout, me, changePassword };
