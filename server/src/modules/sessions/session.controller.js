const asyncHandler = require('../../utils/asyncHandler');
const { recordActivity } = require('../activity/activity.service');
const sessionService = require('./session.service');

const list = asyncHandler(async (req, res) => {
  const result = await sessionService.listSessions(req.query);
  res.json({
    success: true,
    data: result.items,
    pagination: result.pagination,
    summary: result.summary,
  });
});

const remove = asyncHandler(async (req, res) => {
  const session = await sessionService.deleteSession(req.params.id);

  await recordActivity({
    req,
    category: 'ACCOUNT',
    action: 'SESSION_DELETE',
    targetType: 'ACCOUNT',
    targetId: session.user.id,
    targetLabel: `${session.user.fullName} (@${session.user.username})`,
    data: {
      device: session.device,
      browser: session.browser,
      ip: session.ip,
    },
  });

  res.json({ success: true, message: 'Đã xoá refresh token', data: session });
});

const revokeAll = asyncHandler(async (req, res) => {
  const result = await sessionService.revokeAllForUser(req.params.id);

  await recordActivity({
    req,
    category: 'ACCOUNT',
    action: 'SESSION_REVOKE_ALL',
    targetType: 'ACCOUNT',
    targetId: result.user.id,
    targetLabel: `${result.user.fullName} (@${result.user.username})`,
    data: { activeSessions: result.activeSessions },
  });

  res.json({
    success: true,
    message: 'Đã thu hồi toàn bộ phiên đăng nhập của tài khoản',
    data: result,
  });
});

module.exports = { list, remove, revokeAll };
