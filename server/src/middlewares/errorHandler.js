const multer = require('multer');
const { Prisma } = require('@prisma/client');
const env = require('../config/env');
const ApiError = require('../utils/ApiError');

function notFoundHandler(req, _res, next) {
  next(new ApiError(404, `Không tìm thấy đường dẫn ${req.method} ${req.originalUrl}`));
}

function errorHandler(error, _req, res, _next) {
  let statusCode = error.statusCode || 500;
  let message = error.message || 'Đã xảy ra lỗi hệ thống';
  let details = error.details || null;

  if (error instanceof multer.MulterError) {
    statusCode = 400;
    message =
      error.code === 'LIMIT_FILE_SIZE'
        ? 'File vượt quá dung lượng tối đa cho phép'
        : 'File tải lên không hợp lệ';
  } else if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
      statusCode = 409;
      message = 'Dữ liệu đã tồn tại (trùng mã hoặc tên đăng nhập)';
    } else if (error.code === 'P2025') {
      statusCode = 404;
      message = 'Không tìm thấy dữ liệu cần xử lý';
    } else {
      statusCode = 400;
      message = 'Yêu cầu dữ liệu không hợp lệ';
    }
  } else if (error instanceof Prisma.PrismaClientValidationError) {
    statusCode = 400;
    message = 'Dữ liệu gửi lên không đúng định dạng';
  }

  if (statusCode >= 500 && env.NODE_ENV !== 'test') {
    console.error(error);
    message = env.NODE_ENV === 'production' ? 'Đã xảy ra lỗi hệ thống' : message;
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(details ? { details } : {}),
    ...(env.NODE_ENV === 'development' && statusCode >= 500 ? { stack: error.stack } : {}),
  });
}

module.exports = { notFoundHandler, errorHandler };
