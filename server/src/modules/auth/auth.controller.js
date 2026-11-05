const env = require('../../config/env');
const asyncHandler = require('../../utils/asyncHandler');
const { authCookieOptions, clearCookieOptions } = require('../../utils/cookies');
const authService = require('./auth.service');

const login = asyncHandler(async (req, res) => {
  const { token, user } = await authService.login(req.body);
  res.cookie(env.COOKIE_NAME, token, authCookieOptions());
  res.json({ success: true, message: 'Đăng nhập thành công', user });
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
  res.json({ success: true, message: 'Đổi mật khẩu thành công' });
});

module.exports = { login, logout, me, changePassword };
