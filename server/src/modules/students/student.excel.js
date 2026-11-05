const ExcelJS = require('exceljs');
const prisma = require('../../config/prisma');
const ApiError = require('../../utils/ApiError');
const { parseDateInput, formatDateVN } = require('../../utils/date');
const { buildSearchText, normalizeOptional } = require('./student.service');
const { assertClassOwner } = require('../classes/class.service');

const MAX_IMPORT_ROWS = 2000;

const HEADER_ALIASES = {
  studentCode: ['ma hoc sinh', 'ma hs', 'mã học sinh', 'mã hs'],
  fullName: ['ho va ten', 'ho ten', 'ten hoc sinh', 'họ và tên', 'họ tên'],
  dateOfBirth: ['ngay sinh', 'ngay thang nam sinh', 'ngày sinh'],
  phone: ['sdt', 'so dien thoai', 'dien thoai', 'số điện thoại', 'sđt'],
  email: ['email', 'e-mail', 'thu dien tu'],
};

function normalizeText(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function cellToText(cell) {
  const value = cell?.value;
  if (value === null || value === undefined) return '';
  if (value instanceof Date) return value;
  if (typeof value === 'object') {
    if (Array.isArray(value.richText)) {
      return value.richText.map((item) => item.text || '').join('').trim();
    }
    if (value.text !== undefined) return String(value.text).trim();
    if (value.result !== undefined) return value.result;
    if (value.hyperlink !== undefined) return String(value.hyperlink).trim();
  }
  return value;
}

function textValue(cell) {
  const value = cellToText(cell);
  if (value === null || value === undefined) return '';
  return String(value).trim();
}

function findHeaderIndex(headerRow) {
  const indexes = {};
  const headers = [];

  headerRow.eachCell({ includeEmpty: false }, (cell, colNumber) => {
    headers[colNumber] = normalizeText(cellToText(cell));
  });

  for (const [field, aliases] of Object.entries(HEADER_ALIASES)) {
    const normalizedAliases = aliases.map(normalizeText);
    const col = headers.findIndex((header) => header && normalizedAliases.includes(header));
    if (col > 0) indexes[field] = col;
  }

  return indexes;
}

async function readWorkbookRows(buffer) {
  // XLSX là file ZIP; kiểm tra magic bytes trước khi giao cho ExcelJS.
  if (!buffer || buffer.length < 4 || buffer[0] !== 0x50 || buffer[1] !== 0x4b) {
    throw new ApiError(400, 'File tải lên không phải là file Excel .xlsx hợp lệ');
  }

  const workbook = new ExcelJS.Workbook();
  try {
    await workbook.xlsx.load(buffer);
  } catch {
    throw new ApiError(400, 'Không đọc được file Excel. Vui lòng dùng file .xlsx hợp lệ.');
  }

  const sheet = workbook.worksheets[0];
  if (!sheet) {
    throw new ApiError(400, 'File Excel không có sheet dữ liệu');
  }

  const indexes = findHeaderIndex(sheet.getRow(1));
  const missing = [];
  if (!indexes.studentCode) missing.push('Mã học sinh');
  if (!indexes.fullName) missing.push('Họ và tên');
  if (!indexes.dateOfBirth) missing.push('Ngày sinh');
  if (missing.length) {
    throw new ApiError(400, `File Excel thiếu cột bắt buộc: ${missing.join(', ')}`);
  }

  const rows = [];
  for (let rowNumber = 2; rowNumber <= sheet.rowCount; rowNumber += 1) {
    const row = sheet.getRow(rowNumber);
    const raw = {
      rowNumber,
      studentCode: textValue(row.getCell(indexes.studentCode)),
      fullName: textValue(row.getCell(indexes.fullName)),
      dateOfBirth:
        indexes.dateOfBirth !== undefined ? cellToText(row.getCell(indexes.dateOfBirth)) : '',
      phone: indexes.phone ? textValue(row.getCell(indexes.phone)) : '',
      email: indexes.email ? textValue(row.getCell(indexes.email)) : '',
    };

    const isEmpty = ['studentCode', 'fullName', 'dateOfBirth', 'phone', 'email'].every(
      (field) => !String(raw[field] ?? '').trim()
    );
    if (isEmpty) continue;

    rows.push(raw);
    if (rows.length > MAX_IMPORT_ROWS) {
      throw new ApiError(400, `File import tối đa ${MAX_IMPORT_ROWS} dòng dữ liệu`);
    }
  }

  if (rows.length === 0) {
    throw new ApiError(400, 'File Excel không có dữ liệu học sinh');
  }

  return rows;
}

function validateRawRows(rows) {
  const codeCounts = new Map();
  for (const row of rows) {
    const code = String(row.studentCode || '').trim().toUpperCase();
    if (code) codeCounts.set(code, (codeCounts.get(code) || 0) + 1);
  }

  return rows.map((row) => {
    const errors = [];
    const studentCode = String(row.studentCode || '').trim().toUpperCase();
    const fullName = String(row.fullName || '').trim();
    const phone = String(row.phone || '').trim();
    const email = String(row.email || '').trim();
    const dateOfBirth = parseDateInput(row.dateOfBirth);

    if (!studentCode) {
      errors.push('Thiếu mã học sinh');
    } else if (!/^[A-Za-z0-9._-]{1,30}$/.test(studentCode)) {
      errors.push('Mã học sinh chỉ gồm chữ, số, dấu chấm, gạch dưới, gạch ngang (tối đa 30 ký tự)');
    } else if (codeCounts.get(studentCode) > 1) {
      errors.push(`Mã học sinh bị trùng ${codeCounts.get(studentCode)} lần trong file`);
    }

    if (!fullName) {
      errors.push('Thiếu họ và tên');
    } else if (fullName.length < 2 || fullName.length > 100) {
      errors.push('Họ và tên phải từ 2 đến 100 ký tự');
    }

    if (!dateOfBirth) {
      errors.push('Ngày sinh không hợp lệ (định dạng dd/mm/yyyy)');
    }

    if (phone && !/^(0|\+84)\d{9,10}$/.test(phone)) {
      errors.push('Số điện thoại không hợp lệ');
    }

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.push('Email không hợp lệ');
    }

    return {
      rowNumber: row.rowNumber,
      studentCode,
      fullName,
      dateOfBirth,
      phone,
      email,
      errors,
    };
  });
}

async function validateImportRows(rows, classId) {
  const validated = validateRawRows(rows);
  const codes = [...new Set(validated.map((row) => row.studentCode).filter(Boolean))];

  const existingStudents = codes.length
    ? await prisma.student.findMany({ where: { studentCode: { in: codes } } })
    : [];

  const existingByCode = new Map(existingStudents.map((student) => [student.studentCode, student]));
  const existingIds = existingStudents.map((student) => student.id);
  const enrollments = existingIds.length
    ? await prisma.enrollment.findMany({
        where: { classId, studentId: { in: existingIds } },
        select: { studentId: true },
      })
    : [];
  const enrolledIds = new Set(enrollments.map((enrollment) => enrollment.studentId));

  return validated.map((row) => {
    const existing = existingByCode.get(row.studentCode);

    if (row.errors.length > 0) {
      return { ...row, status: 'invalid', existingStudent: existing || null };
    }

    if (existing && enrolledIds.has(existing.id)) {
      return {
        ...row,
        status: 'skipped',
        existingStudent: existing,
        message: 'Học sinh đã thuộc lớp hiện tại, sẽ bỏ qua',
      };
    }

    if (existing) {
      return {
        ...row,
        status: 'existing',
        existingStudent: existing,
        message: 'Mã đã tồn tại, sẽ dùng hồ sơ học sinh hiện có',
      };
    }

    return {
      ...row,
      status: 'new',
      existingStudent: null,
      message: 'Học sinh mới, sẽ được tạo và thêm vào lớp',
    };
  });
}

function summarizeRows(rows) {
  return {
    total: rows.length,
    new: rows.filter((row) => row.status === 'new').length,
    existing: rows.filter((row) => row.status === 'existing').length,
    skipped: rows.filter((row) => row.status === 'skipped').length,
    invalid: rows.filter((row) => row.status === 'invalid').length,
    valid: rows.filter((row) => ['new', 'existing'].includes(row.status)).length,
  };
}

function serializePreviewRows(rows) {
  return rows.map((row) => ({
    rowNumber: row.rowNumber,
    studentCode: row.studentCode,
    fullName: row.fullName,
    dateOfBirth: row.dateOfBirth,
    phone: row.phone,
    email: row.email,
    status: row.status,
    message: row.message || row.errors.join('; '),
    errors: row.errors,
  }));
}

async function previewImport(classId, teacherId, buffer) {
  await assertClassOwner(classId, teacherId);
  const rawRows = await readWorkbookRows(buffer);
  const rows = await validateImportRows(rawRows, classId);

  return {
    rows: serializePreviewRows(rows),
    summary: summarizeRows(rows),
  };
}

async function commitImport(classId, teacherId, buffer) {
  await assertClassOwner(classId, teacherId);
  const rawRows = await readWorkbookRows(buffer);
  const rows = await validateImportRows(rawRows, classId);

  let created = 0;
  let reused = 0;
  let skipped = summarizeRows(rows).skipped;

  for (const row of rows) {
    if (!['new', 'existing'].includes(row.status)) continue;

    const date = parseDateInput(row.dateOfBirth);
    const existingStudent = await prisma.student.findUnique({
      where: { studentCode: row.studentCode },
    });
    const student =
      existingStudent ||
      (await prisma.student.create({
        data: {
          studentCode: row.studentCode,
          fullName: row.fullName,
          dateOfBirth: date,
          phone: normalizeOptional(row.phone),
          email: normalizeOptional(row.email),
          searchText: buildSearchText(
            row.studentCode,
            row.fullName,
            normalizeOptional(row.phone),
            normalizeOptional(row.email)
          ),
        },
      }));

    try {
      await prisma.enrollment.create({ data: { classId, studentId: student.id } });
      if (row.status === 'new') created += 1;
      else reused += 1;
    } catch (error) {
      if (error.code === 'P2002') {
        skipped += 1;
      } else {
        throw error;
      }
    }
  }

  const invalidRows = rows.filter((row) => row.status === 'invalid');

  return {
    summary: {
      total: rows.length,
      imported: created + reused,
      created,
      reused,
      skipped,
      invalid: invalidRows.length,
    },
    errors: invalidRows.map((row) => ({
      rowNumber: row.rowNumber,
      studentCode: row.studentCode,
      fullName: row.fullName,
      errors: row.errors,
    })),
  };
}

function styleHeaderRow(sheet) {
  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1D4ED8' } };
  headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
  headerRow.height = 24;
}

async function buildExportBuffer(classId, teacherId) {
  const classroom = await assertClassOwner(classId, teacherId);
  const enrollments = await prisma.enrollment.findMany({
    where: { classId },
    include: { student: true },
  });

  enrollments.sort((a, b) => a.student.studentCode.localeCompare(b.student.studentCode));

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Danh sách học sinh');
  sheet.columns = [
    { header: 'STT', key: 'index', width: 8 },
    { header: 'Mã học sinh', key: 'studentCode', width: 16 },
    { header: 'Họ và tên', key: 'fullName', width: 30 },
    { header: 'Ngày sinh', key: 'dateOfBirth', width: 16 },
    { header: 'Số điện thoại', key: 'phone', width: 18 },
    { header: 'Email', key: 'email', width: 30 },
  ];

  enrollments.forEach((enrollment, index) => {
    const student = enrollment.student;
    sheet.addRow({
      index: index + 1,
      studentCode: student.studentCode,
      fullName: student.fullName,
      dateOfBirth: formatDateVN(student.dateOfBirth),
      phone: student.phone || '',
      email: student.email || '',
    });
  });

  styleHeaderRow(sheet);
  sheet.views = [{ state: 'frozen', ySplit: 1 }];
  sheet.autoFilter = 'A1:F1';
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber > 1) {
      row.alignment = { vertical: 'middle' };
      row.height = 20;
    }
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return {
    buffer: Buffer.from(buffer),
    classCode: classroom.classCode,
    className: classroom.name,
  };
}

async function buildErrorReportBuffer(errors) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Lỗi import');
  sheet.columns = [
    { header: 'STT', key: 'index', width: 8 },
    { header: 'Dòng Excel', key: 'rowNumber', width: 12 },
    { header: 'Mã học sinh', key: 'studentCode', width: 18 },
    { header: 'Họ và tên', key: 'fullName', width: 28 },
    { header: 'Lỗi', key: 'errors', width: 70 },
  ];

  errors.forEach((item, index) => {
    sheet.addRow({
      index: index + 1,
      rowNumber: item.rowNumber,
      studentCode: item.studentCode,
      fullName: item.fullName,
      errors: item.errors.join('; '),
    });
  });

  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFB91C1C' } };
  headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
  headerRow.height = 24;
  sheet.views = [{ state: 'frozen', ySplit: 1 }];

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

module.exports = {
  previewImport,
  commitImport,
  buildExportBuffer,
  buildErrorReportBuffer,
};
