const asyncHandler = require('../../utils/asyncHandler');
const studentService = require('./student.service');

const getStudent = asyncHandler(async (req, res) => {
  const data = await studentService.getStudent(req.params.id, req.user.id);
  res.json({ success: true, data });
});

const updateStudent = asyncHandler(async (req, res) => {
  const { student } = await studentService.updateStudent(
    req.params.id,
    req.user.id,
    req.body
  );
  res.json({ success: true, message: 'Cập nhật học sinh thành công', data: student });
});

module.exports = { getStudent, updateStudent };
