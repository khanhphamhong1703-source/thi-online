const { z } = require('zod');
const { parseDateInput } = require('../../utils/date');

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'ID không hợp lệ');

const optionalEmail = z
  .string()
  .trim()
  .max(120, 'Email tối đa 120 ký tự')
  .optional()
  .nullable()
  .refine((value) => !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value), {
    message: 'Email không hợp lệ',
  });

const optionalPhone = z
  .string()
  .trim()
  .max(20)
  .optional()
  .nullable()
  .refine((value) => !value || /^(0|\+84)\d{9,10}$/.test(value), {
    message: 'Số điện thoại không hợp lệ',
  });

const dateOfBirth = z
  .string()
  .min(1, 'Vui lòng nhập ngày sinh')
  .refine((value) => parseDateInput(value) !== null, {
    message: 'Ngày sinh không hợp lệ (định dạng dd/mm/yyyy)',
  });

const studentBodySchema = z.object({
  fullName: z.string().trim().min(2, 'Họ tên phải có ít nhất 2 ký tự').max(100),
  dateOfBirth,
  phone: optionalPhone,
  email: optionalEmail,
});

const updateStudentSchema = studentBodySchema.partial().refine(
  (data) => Object.keys(data).length > 0,
  { message: 'Cần ít nhất một trường để cập nhật' }
);

const listStudentsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
  search: z.string().trim().max(100).optional().default(''),
});

const classIdSchema = z.object({ classId: objectId });
const studentIdSchema = z.object({ studentId: objectId });
const idSchema = z.object({ id: objectId });

const importReportSchema = z.object({
  errors: z
    .array(
      z.object({
        rowNumber: z.number().int().positive(),
        studentCode: z.string().max(50).optional().default(''),
        fullName: z.string().max(150).optional().default(''),
        errors: z.array(z.string().max(500)).max(20).default([]),
      })
    )
    .max(2000),
});

module.exports = {
  studentBodySchema,
  updateStudentSchema,
  listStudentsQuerySchema,
  classIdSchema,
  studentIdSchema,
  idSchema,
  importReportSchema,
};
