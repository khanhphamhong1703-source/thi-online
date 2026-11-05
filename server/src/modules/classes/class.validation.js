const { z } = require('zod');

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'ID không hợp lệ');

const classBodySchema = z.object({
  name: z.string().trim().min(1, 'Vui lòng nhập tên lớp').max(100, 'Tên lớp tối đa 100 ký tự'),
  classCode: z
    .string()
    .trim()
    .min(1, 'Vui lòng nhập mã lớp')
    .max(30, 'Mã lớp tối đa 30 ký tự')
    .regex(/^[a-zA-Z0-9._-]+$/, 'Mã lớp chỉ gồm chữ, số, dấu chấm, gạch dưới, gạch ngang'),
  schoolYear: z
    .string()
    .trim()
    .min(4, 'Năm học không hợp lệ')
    .max(20, 'Năm học tối đa 20 ký tự'),
  description: z.string().trim().max(500, 'Mô tả tối đa 500 ký tự').optional().nullable(),
});

const updateClassSchema = classBodySchema.partial().refine(
  (data) => Object.keys(data).length > 0,
  { message: 'Cần ít nhất một trường để cập nhật' }
);

const listClassesQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
  search: z.string().trim().max(100).optional().default(''),
});

const classIdSchema = z.object({ id: objectId });

module.exports = { classBodySchema, updateClassSchema, listClassesQuerySchema, classIdSchema, objectId };
