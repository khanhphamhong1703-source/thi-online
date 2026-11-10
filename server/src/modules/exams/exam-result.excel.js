const ExcelJS = require('exceljs');
const prisma = require('../../config/prisma');
const ApiError = require('../../utils/ApiError');
const {
  getExamClassIds,
  getClassesByIds,
  getClassStudentIds,
} = require('./exam.classes');
const { finalizeExpiredAttempts } = require('./attempt.service');

const STATUS_LABELS = {
  IN_PROGRESS: 'Đang làm',
  SUBMITTED: 'Đã nộp',
  AUTO_SUBMITTED: 'Tự nộp',
};

function formatDateTime(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(date);
}

function safeFileName(value) {
  return String(value || 'de-thi')
    .replace(/Đ/g, 'D')
    .replace(/đ/g, 'd')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Za-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

async function buildExportBuffer(examId, teacherId, classId) {
  const exam = await prisma.exam.findFirst({
    where: { id: examId, teacherId },
    select: {
      id: true,
      title: true,
      subject: true,
      teacherId: true,
      classId: true,
      classIds: true,
    },
  });
  if (!exam) {
    throw new ApiError(404, 'Không tìm thấy đề thi');
  }

  const examClassIds = getExamClassIds(exam);
  if (classId && !examClassIds.includes(classId)) {
    throw new ApiError(400, 'Lớp được chọn không thuộc đề thi');
  }
  const classes = await getClassesByIds(classId ? [classId] : examClassIds);
  const selectedClass = classId ? classes[0] : null;
  if (classId && !selectedClass) {
    throw new ApiError(404, 'Không tìm thấy lớp học');
  }
  const classStudentIds = classId ? await getClassStudentIds(classId) : null;
  const classMap = new Map(classes.map((classroom) => [classroom.id, classroom]));
  await finalizeExpiredAttempts({ examId });
  const attempts = await prisma.examAttempt.findMany({
    where: {
      examId,
      ...(classStudentIds ? { studentId: { in: classStudentIds } } : {}),
    },
    include: {
      student: {
        select: { studentCode: true, fullName: true },
      },
    },
  });
  const studentIds = [...new Set(attempts.map((attempt) => attempt.studentId))];
  const enrollments = studentIds.length
    ? await prisma.enrollment.findMany({
        where: {
          studentId: { in: studentIds },
          classId: { in: classes.map((classroom) => classroom.id) },
        },
        select: { studentId: true, classId: true },
      })
    : [];
  const enrollmentMap = new Map(
    enrollments.map((enrollment) => [enrollment.studentId, enrollment.classId])
  );

  const rows = attempts
    .map((attempt) => {
      const attemptClassId =
        enrollmentMap.get(attempt.studentId) || selectedClass?.id || exam.classId;
      const classroom = classMap.get(attemptClassId);
      return {
        attempt,
        classId: attemptClassId,
        className: classroom?.name || '',
        classCode: classroom?.classCode || '',
      };
    })
    .sort(
      (first, second) =>
        first.className.localeCompare(second.className, 'vi') ||
        first.attempt.student.studentCode.localeCompare(second.attempt.student.studentCode) ||
        first.attempt.attemptNumber - second.attempt.attemptNumber
    );

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Bảng điểm');
  sheet.columns = [
    { width: 7 },
    { width: 15 },
    { width: 28 },
    { width: 24 },
    { width: 9 },
    { width: 19 },
    { width: 19 },
    { width: 14 },
    { width: 13 },
    { width: 10 },
    { width: 13 },
    { width: 10 },
    { width: 11 },
  ];

  sheet.mergeCells('A1:M1');
  const titleCell = sheet.getCell('A1');
  titleCell.value = `BẢNG ĐIỂM THI - ${exam.title}`;
  titleCell.font = { bold: true, size: 15, color: { argb: 'FF0F172A' } };
  titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
  sheet.getRow(1).height = 28;

  sheet.mergeCells('A2:M2');
  const metaCell = sheet.getCell('A2');
  metaCell.value = [
    `Môn: ${exam.subject}`,
    classes.length
      ? `Lớp: ${classes.map((classroom) => `${classroom.name} (${classroom.classCode})`).join(', ')}`
      : '',
    `Xuất lúc: ${formatDateTime(new Date())}`,
  ]
    .filter(Boolean)
    .join('  ·  ');
  metaCell.font = { italic: true, size: 10, color: { argb: 'FF64748B' } };
  metaCell.alignment = { vertical: 'middle' };

  const headers = [
    'STT',
    'Mã học sinh',
    'Họ và tên',
    'Lớp',
    'Lượt',
    'Bắt đầu',
    'Nộp bài',
    'Trạng thái',
    'Số câu đúng',
    'Điểm',
    'Điểm tối đa',
    'Tỷ lệ',
    'Số lần thoát',
  ];
  const headerRow = sheet.addRow(headers);
  headerRow.height = 24;
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } };
  headerRow.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };

  rows.forEach(({ attempt, className, classCode }, index) => {
    const percent =
      attempt.maxScore > 0 && attempt.score !== null
        ? Math.round((Number(attempt.score) / Number(attempt.maxScore)) * 10000) / 100
        : null;
    const row = sheet.addRow([
      index + 1,
      attempt.student.studentCode,
      attempt.student.fullName,
      className ? `${className}${classCode ? ` (${classCode})` : ''}` : '',
      attempt.attemptNumber,
      formatDateTime(attempt.startedAt),
      formatDateTime(attempt.submittedAt),
      STATUS_LABELS[attempt.status] || attempt.status,
      attempt.correctCount ?? '',
      attempt.score ?? '',
      attempt.maxScore ?? '',
      percent ?? '',
      attempt.exitCount || 0,
    ]);
    row.height = 20;
    row.alignment = { vertical: 'middle' };
    row.getCell(10).numFmt = '0.##';
    row.getCell(11).numFmt = '0.##';
    row.getCell(12).numFmt = '0.##"%"';
  });

  const lastRow = sheet.rowCount;
  for (let rowNumber = 3; rowNumber <= lastRow; rowNumber += 1) {
    const row = sheet.getRow(rowNumber);
    for (let column = 1; column <= headers.length; column += 1) {
      const cell = row.getCell(column);
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      };
      if (rowNumber > 3 && rowNumber % 2 === 0) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
      }
    }
  }

  sheet.views = [{ state: 'frozen', ySplit: 3 }];
  sheet.autoFilter = { from: 'A3', to: `M${Math.max(3, lastRow)}` };

  const buffer = await workbook.xlsx.writeBuffer();
  return {
    buffer: Buffer.from(buffer),
    fileName: `bang-diem-${safeFileName(exam.title)}${
      selectedClass ? `-${safeFileName(selectedClass.classCode || selectedClass.name)}` : ''
    }.xlsx`,
    examTitle: exam.title,
    attemptCount: rows.length,
  };
}

module.exports = { buildExportBuffer };
