const asyncHandler = require('../../utils/asyncHandler');
const adminDataService = require('./admin-data.service');
const adminBackupService = require('./admin-backup.service');
const ApiError = require('../../utils/ApiError');

const getSummary = asyncHandler(async (_req, res) => {
  const data = await adminDataService.getSummary();
  res.json({ success: true, data });
});

function listHandler(serviceMethod) {
  return asyncHandler(async (req, res) => {
    const result = await serviceMethod(req.query);
    res.json({ success: true, data: result.items, pagination: result.pagination });
  });
}

const listTeachers = listHandler(adminDataService.listTeachers);
const listClasses = listHandler(adminDataService.listClasses);
const listStudents = listHandler(adminDataService.listStudents);
const listExams = listHandler(adminDataService.listExams);

const restoreClass = asyncHandler(async (req, res) => {
  const data = await adminDataService.restoreClass(req.params.id);
  res.json({ success: true, message: 'Đã khôi phục lớp học', data });
});

const archiveClass = asyncHandler(async (req, res) => {
  const data = await adminDataService.archiveClass(req.params.id);
  res.json({ success: true, message: 'Đã lưu trữ lớp học', data });
});

const deleteTeacher = asyncHandler(async (req, res) => {
  const data = await adminDataService.deleteTeacher(req.params.id);
  res.json({ success: true, message: 'Đã xoá vĩnh viễn giáo viên', data });
});

const deleteClass = asyncHandler(async (req, res) => {
  const data = await adminDataService.deleteClass(req.params.id);
  res.json({ success: true, message: 'Đã xoá vĩnh viễn lớp học', data });
});

const deleteStudent = asyncHandler(async (req, res) => {
  const data = await adminDataService.deleteStudent(req.params.id);
  res.json({ success: true, message: 'Đã xoá vĩnh viễn học sinh', data });
});

const deleteExam = asyncHandler(async (req, res) => {
  const data = await adminDataService.deleteExam(req.params.id);
  res.json({ success: true, message: 'Đã xoá vĩnh viễn đề thi', data });
});

const exportBackup = asyncHandler(async (_req, res) => {
  const backup = await adminBackupService.exportBackup();
  const filename = `vieexam-backup-${new Date().toISOString().slice(0, 10)}.json`;

  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.setHeader('Cache-Control', 'no-store');
  res.send(JSON.stringify(backup, null, 2));
});

const importBackup = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new ApiError(400, 'Vui lòng chọn file sao lưu JSON');
  }

  const data = await adminBackupService.importBackup({
    buffer: req.file.buffer,
    mode: req.body.mode,
    confirmReplace: req.body.confirmReplace === 'true',
    currentAdminId: req.user.id,
  });

  res.json({
    success: true,
    message:
      data.mode === 'replace'
        ? 'Đã khôi phục dữ liệu từ bản sao lưu'
        : 'Đã hợp nhất dữ liệu từ bản sao lưu',
    data,
  });
});

module.exports = {
  getSummary,
  listTeachers,
  listClasses,
  listStudents,
  listExams,
  restoreClass,
  archiveClass,
  deleteTeacher,
  deleteClass,
  deleteStudent,
  deleteExam,
  exportBackup,
  importBackup,
};
