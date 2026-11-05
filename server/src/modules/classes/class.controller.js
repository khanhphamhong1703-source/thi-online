const asyncHandler = require('../../utils/asyncHandler');
const classService = require('./class.service');

const listClasses = asyncHandler(async (req, res) => {
  const result = await classService.listClasses(req.user.id, req.query);
  res.json({ success: true, data: result.items, pagination: result.pagination });
});

const getClass = asyncHandler(async (req, res) => {
  const data = await classService.getClass(req.params.id, req.user.id);
  res.json({ success: true, data });
});

const createClass = asyncHandler(async (req, res) => {
  const data = await classService.createClass(req.user.id, req.body);
  res.status(201).json({ success: true, message: 'Tạo lớp học thành công', data });
});

const updateClass = asyncHandler(async (req, res) => {
  const data = await classService.updateClass(req.params.id, req.user.id, req.body);
  res.json({ success: true, message: 'Cập nhật lớp học thành công', data });
});

const archiveClass = asyncHandler(async (req, res) => {
  await classService.archiveClass(req.params.id, req.user.id);
  res.json({
    success: true,
    message: 'Đã lưu trữ lớp học. Dữ liệu học sinh vẫn được giữ nguyên.',
  });
});

const dashboard = asyncHandler(async (req, res) => {
  const data = await classService.getTeacherDashboard(req.user.id);
  res.json({ success: true, data });
});

module.exports = { listClasses, getClass, createClass, updateClass, archiveClass, dashboard };
