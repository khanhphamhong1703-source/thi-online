const { z } = require('zod');
const { SESSION_STATUSES } = require('./session.service');

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, 'ID không hợp lệ');

const listSessionsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().trim().max(120).optional().default(''),
  status: z.enum(SESSION_STATUSES).default('ACTIVE'),
  teacherId: objectId.optional(),
});

const sessionIdSchema = z.object({ id: objectId });
const userIdSchema = z.object({ id: objectId });

module.exports = { listSessionsQuerySchema, sessionIdSchema, userIdSchema };
