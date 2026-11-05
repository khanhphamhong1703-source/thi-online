const multer = require('multer');
const ApiError = require('../utils/ApiError');

const MAX_FILE_SIZE = 5 * 1024 * 1024;

const excelUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE, files: 1 },
  fileFilter: (_req, file, cb) => {
    const isXlsx = /\.xlsx$/i.test(file.originalname);
    if (!isXlsx) {
      return cb(new ApiError(400, 'Chỉ chấp nhận file Excel định dạng .xlsx'));
    }
    return cb(null, true);
  },
});

const documentUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE, files: 1 },
  fileFilter: (_req, file, cb) => {
    const isDocument = /\.(docx|txt)$/i.test(file.originalname);
    if (!isDocument) {
      return cb(new ApiError(400, 'Chỉ chấp nhận file Word .docx hoặc văn bản .txt'));
    }
    return cb(null, true);
  },
});

const uploadExcel = excelUpload.single('file');
const uploadDocument = documentUpload.single('file');

module.exports = { uploadExcel, uploadDocument, MAX_FILE_SIZE };
