const { z } = require('zod');

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, 'ID không hợp lệ');

const paginationQuery = {
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
  search: z.string().trim().max(120).optional().default(''),
};

const teacherQuerySchema = z.object({
  ...paginationQuery,
  status: z.enum(['all', 'active', 'locked']).optional().default('all'),
});

const classQuerySchema = z.object({
  ...paginationQuery,
  status: z.enum(['all', 'active', 'archived']).optional().default('all'),
});

const studentQuerySchema = z.object({
  ...paginationQuery,
});

const examQuerySchema = z.object({
  ...paginationQuery,
  status: z
    .enum(['all', 'DRAFT', 'PUBLISHED', 'CLOSED'])
    .optional()
    .default('all'),
});

const idParamSchema = z.object({ id: objectId });

module.exports = {
  teacherQuerySchema,
  classQuerySchema,
  studentQuerySchema,
  examQuerySchema,
  idParamSchema,
};
