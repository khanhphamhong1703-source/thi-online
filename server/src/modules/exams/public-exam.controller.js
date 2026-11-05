const asyncHandler = require('../../utils/asyncHandler');
const attemptService = require('./attempt.service');

const listExams = asyncHandler(async (req, res) => {
  const result = await attemptService.listPublicExams(req.query);
  res.json({ success: true, data: result.items, pagination: result.pagination });
});

const getExam = asyncHandler(async (req, res) => {
  const data = await attemptService.getPublicExam(req.params.id);
  res.json({ success: true, data });
});

const lookupExam = asyncHandler(async (req, res) => {
  const data = await attemptService.lookupExamStudent(req.body);
  res.json({ success: true, data });
});

const startAttempt = asyncHandler(async (req, res) => {
  const data = await attemptService.startAttempt(req.params.id, req.body);
  res.json({ success: true, message: 'Bắt đầu làm bài', data });
});

const getAttempt = asyncHandler(async (req, res) => {
  const data = await attemptService.getAttemptForStudent(req.attemptId);
  res.json({ success: true, data });
});

const saveAnswers = asyncHandler(async (req, res) => {
  const data = await attemptService.saveAttemptAnswers(req.attemptId, req.body.answers);
  res.json({ success: true, message: 'Đã lưu bài làm', data });
});

const submitAttempt = asyncHandler(async (req, res) => {
  const data = await attemptService.submitAttempt(req.attemptId, req.body.answers);
  res.json({ success: true, message: 'Đã nộp bài', data });
});

const recordExit = asyncHandler(async (req, res) => {
  const data = await attemptService.recordAttemptExit(req.attemptId);
  res.json({ success: true, message: 'Đã ghi nhận lần thoát', data });
});

module.exports = {
  listExams,
  getExam,
  lookupExam,
  startAttempt,
  getAttempt,
  saveAnswers,
  submitAttempt,
  recordExit,
};
