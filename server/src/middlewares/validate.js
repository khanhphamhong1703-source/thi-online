const ApiError = require('../utils/ApiError');

function validate(schemas = {}) {
  return (req, _res, next) => {
    try {
      for (const key of ['body', 'query', 'params']) {
        if (!schemas[key]) continue;
        const result = schemas[key].safeParse(req[key]);
        if (!result.success) {
          const details = result.error.issues.map((issue) => ({
            field: issue.path.join('.') || key,
            message: issue.message,
          }));
          throw new ApiError(422, 'Dữ liệu gửi lên không hợp lệ', details);
        }
        req[key] = result.data;
      }
      next();
    } catch (error) {
      next(error);
    }
  };
}

module.exports = validate;
