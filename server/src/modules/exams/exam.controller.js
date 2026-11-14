const asyncHandler = require('../../utils/asyncHandler');
const examService = require('./exam.service');
const { extractDocumentText } = require('./exam-import.service');
const examResultExcel = require('./exam-result.excel');
const { recordActivity, examLogData } = require('../activity/activity.service');

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

  await recordActivity({
    req,
    category: 'EXAM',
    action: 'EXAM_CREATE',
    targetType: 'EXAM',
    targetId: data.id,
    targetLabel: data.title,
    data: examLogData(data),
  });

  res.status(201).json({ success: true, message: 'Tạo đề thi thành công', data });
});

const updateExam = asyncHandler(async (req, res) => {
  const data = await examService.updateExam(req.params.id, req.user.id, req.body);

  await recordActivity({
    req,
    category: 'EXAM',
    action: 'EXAM_UPDATE',
    targetType: 'EXAM',
    targetId: data.id,
    targetLabel: data.title,
    data: examLogData(data),
  });

  res.json({ success: true, message: 'Cập nhật đề thi thành công', data });
});

const deleteExam = asyncHandler(async (req, res) => {
  const data = await examService.deleteExam(req.params.id, req.user.id);

  await recordActivity({
    req,
    category: 'EXAM',
    action: 'EXAM_DELETE',
    targetType: 'EXAM',
    targetId: data.id,
    targetLabel: data.title,
    data: {
      title: data.title,
      questionCount: data.questionCount,
      attemptCount: data.attemptCount,
    },
  });

  res.json({ success: true, message: 'Đã xóa đề thi' });
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

const regradeExamAttempts = asyncHandler(async (req, res) => {
  const data = await examService.regradeExamAttempts(req.params.id, req.user.id);

  await recordActivity({
    req,
    category: 'EXAM',
    action: 'EXAM_REGRADE',
    targetType: 'EXAM',
    targetId: req.params.id,
    targetLabel: data.title,
    data: { title: data.title, attemptCount: data.regraded },
  });

  res.json({
    success: true,
    message:
      data.regraded > 0
        ? `Đã chấm lại ${data.regraded} bài làm`
        : 'Chưa có bài nào để chấm lại',
    data,
  });
});

const exportResults = asyncHandler(async (req, res) => {
  const { buffer, fileName, examTitle, attemptCount } = await examResultExcel.buildExportBuffer(
    req.params.id,
    req.user.id,
    req.query.classId
  );

  await recordActivity({
    req,
    category: 'EXAM',
    action: 'EXAM_EXPORT_RESULTS',
    targetType: 'EXAM',
    targetId: req.params.id,
    targetLabel: examTitle,
    data: { title: examTitle, attemptCount },
  });

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
  deleteExam,
  getResults,
  regradeExamAttempts,
  getAttemptDetail,
  exportResults,
  importText,
};
