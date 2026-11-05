const asyncHandler = require('../../utils/asyncHandler');
const ApiError = require('../../utils/ApiError');
const studentService = require('./student.service');
const studentExcel = require('./student.excel');
const { assertClassOwner } = require('../classes/class.service');

function requireFile(req) {
  if (!req.file) {
    throw new ApiError(400, 'Vui lòng chọn file Excel .xlsx');
  }
  return req.file.buffer;
}

const listStudents = asyncHandler(async (req, res) => {
  const result = await studentService.listStudentsInClass(
    req.params.classId,
    req.user.id,
    req.query
  );
  res.json({ success: true, data: result.items, pagination: result.pagination });
});

const addStudent = asyncHandler(async (req, res) => {
  const { student } = await studentService.addStudentToClass(
    req.params.classId,
    req.user.id,
    req.body
  );

  res.status(201).json({
    success: true,
    message: `Thêm học sinh thành công với mã ${student.studentCode}`,
    data: student,
  });
});

const removeStudent = asyncHandler(async (req, res) => {
  await studentService.removeStudentFromClass(
    req.params.classId,
    req.params.studentId,
    req.user.id
  );
  res.json({
    success: true,
    message: 'Đã xóa học sinh khỏi lớp. Hồ sơ học sinh vẫn được giữ trên hệ thống.',
  });
});

const previewImport = asyncHandler(async (req, res) => {
  const data = await studentExcel.previewImport(
    req.params.classId,
    req.user.id,
    requireFile(req)
  );
  res.json({ success: true, data });
});

const commitImport = asyncHandler(async (req, res) => {
  const data = await studentExcel.commitImport(
    req.params.classId,
    req.user.id,
    requireFile(req)
  );
  res.json({ success: true, message: 'Import danh sách học sinh hoàn tất', data });
});

const exportStudents = asyncHandler(async (req, res) => {
  const { buffer, classCode } = await studentExcel.buildExportBuffer(
    req.params.classId,
    req.user.id
  );
  const safeCode = String(classCode).replace(/[^A-Za-z0-9._-]/g, '_');

  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  );
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="danh-sach-hoc-sinh-${safeCode}.xlsx"`
  );
  res.send(buffer);
});

const errorReport = asyncHandler(async (req, res) => {
  await assertClassOwner(req.params.classId, req.user.id);
  const buffer = await studentExcel.buildErrorReportBuffer(req.body.errors);

  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  );
  res.setHeader('Content-Disposition', 'attachment; filename="bao-cao-loi-import.xlsx"');
  res.send(buffer);
});

module.exports = {
  listStudents,
  addStudent,
  removeStudent,
  previewImport,
  commitImport,
  exportStudents,
  errorReport,
};
