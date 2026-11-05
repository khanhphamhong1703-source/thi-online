const mammoth = require('mammoth');
const { TextDecoder } = require('util');
const ApiError = require('../../utils/ApiError');

const MAX_TEXT_LENGTH = 200000;

function decodeTextFile(buffer) {
  if (buffer.length >= 2 && buffer[0] === 0xff && buffer[1] === 0xfe) {
    return buffer.toString('utf16le');
  }
  if (buffer.length >= 2 && buffer[0] === 0xfe && buffer[1] === 0xff) {
    return new TextDecoder('utf-16be').decode(buffer);
  }
  return buffer.toString('utf8').replace(/^\uFEFF/, '');
}

async function extractDocumentText(file) {
  if (!file) {
    throw new ApiError(400, 'Vui lòng chọn file Word hoặc văn bản');
  }

  const filename = file.originalname;
  let text = '';
  let warnings = [];

  try {
    if (/\.docx$/i.test(filename)) {
      const result = await mammoth.extractRawText({ buffer: file.buffer });
      text = result.value || '';
      warnings = (result.messages || [])
        .filter((message) => message.type === 'warning')
        .slice(0, 5)
        .map((message) => message.message);
    } else {
      text = decodeTextFile(file.buffer);
    }
  } catch {
    throw new ApiError(400, 'Không đọc được nội dung file. Vui lòng kiểm tra lại định dạng.');
  }

  const normalized = text.replace(/\r\n?/g, '\n').replace(/\u0000/g, '').trim();
  if (!normalized) {
    throw new ApiError(400, 'File không có nội dung văn bản');
  }
  if (normalized.length > MAX_TEXT_LENGTH) {
    throw new ApiError(400, 'Nội dung file quá dài. Vui lòng chia nhỏ file.');
  }

  return { filename, text: normalized, warnings };
}

module.exports = { extractDocumentText };
