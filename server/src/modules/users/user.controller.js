const asyncHandler = require('../../utils/asyncHandler');
const userService = require('./user.service');

const listTeachers = asyncHandler(async (req, res) => {
  const result = await userService.listTeachers(req.query);
  res.json({ success: true, data: result.items, pagination: result.pagination });
});

const getTeacher = asyncHandler(async (req, res) => {
  const data = await userService.getTeacher(req.params.id);
  res.json({ success: true, data });
});

const createTeacher = asyncHandler(async (req, res) => {
  const data = await userService.createTeacher(req.body);
  res.status(201).json({
    success: true,
    message: 'Tạo tài khoản giáo viên thành công',
    data,
  });
});

const updateTeacher = asyncHandler(async (req, res) => {
  const data = await userService.updateTeacher(req.params.id, req.body);
  res.json({ success: true, message: 'Cập nhật giáo viên thành công', data });
});

const setTeacherStatus = asyncHandler(async (req, res) => {
  const data = await userService.setTeacherStatus(req.params.id, req.body.isActive);
  res.json({
    success: true,
    message: data.isActive ? 'Đã mở khóa tài khoản' : 'Đã khóa tài khoản',
    data,
  });
});

const resetPassword = asyncHandler(async (req, res) => {
  await userService.resetTeacherPassword(req.params.id, req.body.newPassword);
  res.json({ success: true, message: 'Đặt lại mật khẩu thành công' });
});

const dashboard = asyncHandler(async (_req, res) => {
  const data = await userService.getAdminDashboard();
  res.json({ success: true, data });
});

module.exports = {
  listTeachers,
  getTeacher,
  createTeacher,
  updateTeacher,
  setTeacherStatus,
  resetPassword,
  dashboard,
};
