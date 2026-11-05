const asyncHandler = require('../../utils/asyncHandler');
const examService = require('./exam.service');
const { extractDocumentText } = require('./exam-import.service');
const examResultExcel = require('./exam-result.excel');

const listExams = asyncHandler(async (req, res) => {
  const result = await examService.listExams(req.user.id, req.query);
  res.json({ success: true, data: result.items, pagination: result.pagination });
});

const getExam = asyncHandler(async (req, res) => {
  const data = await examService.getExam(req.params.id, req.user.id);
  res.json({ success: true, data });
});

const createExam = asyncHandler(async (req, res) => {
  const data = await examService.createExam(req.user.id, req.body);
  res.status(201).json({ success: true, message: 'Tạo đề thi thành công', data });
});

const updateExam = asyncHandler(async (req, res) => {
  const data = await examService.updateExam(req.params.id, req.user.id, req.body);
  res.json({ success: true, message: 'Cập nhật đề thi thành công', data });
});

const publishExam = asyncHandler(async (req, res) => {
  const data = await examService.publishExam(req.params.id, req.user.id);
  res.json({ success: true, message: 'Đã công bố đề thi', data });
});

const closeExam = asyncHandler(async (req, res) => {
  const data = await examService.closeExam(req.params.id, req.user.id);
  res.json({ success: true, message: 'Đã đóng đề thi', data });
});

const deleteExam = asyncHandler(async (req, res) => {
  await examService.deleteExam(req.params.id, req.user.id);
  res.json({ success: true, message: 'Đã xóa đề thi nháp' });
});

const getResults = asyncHandler(async (req, res) => {
  const result = await examService.getExamResults(req.params.id, req.user.id, req.query);
  res.json({
    success: true,
    exam: result.exam,
    data: result.items,
    pagination: result.pagination,
    stats: result.stats,
  });
});

const getAttemptDetail = asyncHandler(async (req, res) => {
  const data = await examService.getAttemptDetail(
    req.params.id,
    req.params.attemptId,
    req.user.id
  );
  res.json({ success: true, data });
});

const exportResults = asyncHandler(async (req, res) => {
  const { buffer, fileName } = await examResultExcel.buildExportBuffer(
    req.params.id,
    req.user.id,
    req.query.classId
  );
  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  );
  res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
  res.send(buffer);
});

const importText = asyncHandler(async (req, res) => {
  const data = await extractDocumentText(req.file);
  res.json({ success: true, data });
});

module.exports = {
  listExams,
  getExam,
  createExam,
  updateExam,
  publishExam,
  closeExam,
  deleteExam,
  getResults,
  getAttemptDetail,
  exportResults,
  importText,
};
