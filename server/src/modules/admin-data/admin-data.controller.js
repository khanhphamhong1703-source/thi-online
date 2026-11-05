const asyncHandler = require('../../utils/asyncHandler');
const adminDataService = require('./admin-data.service');

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
};
