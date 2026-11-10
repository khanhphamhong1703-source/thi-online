const { z } = require('zod');
const { CATEGORIES } = require('./activity.service');

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, 'ID không hợp lệ');

const activityQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
  search: z.string().trim().max(120).optional().default(''),
  category: z.enum(CATEGORIES).optional(),
  status: z.enum(['SUCCESS', 'FAILED']).optional(),
  action: z.string().trim().max(60).optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

const adminActivityQuerySchema = activityQuerySchema.extend({
  teacherId: objectId.optional(),
});

module.exports = { activityQuerySchema, adminActivityQuerySchema };
