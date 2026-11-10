const asyncHandler = require('../../utils/asyncHandler');
const studentService = require('./student.service');
const { recordActivity, maskStudentCode } = require('../activity/activity.service');

const getStudent = asyncHandler(async (req, res) => {
  const data = await studentService.getStudent(req.params.id, req.user.id);
  res.json({ success: true, data });
});

const updateStudent = asyncHandler(async (req, res) => {
  const { student, classrooms } = await studentService.updateStudent(
    req.params.id,
    req.user.id,
    req.body
  );

  await recordActivity({
    req,
    category: 'STUDENT',
    action: 'STUDENT_UPDATE',
    targetType: 'STUDENT',
    targetId: student.id,
    targetLabel: student.fullName,
    data: {
      fullName: student.fullName,
      studentCode: maskStudentCode(student.studentCode),
      className: classrooms[0]?.name || null,
    },
  });

  res.json({ success: true, message: 'Cập nhật học sinh thành công', data: student });
});

module.exports = { getStudent, updateStudent };
