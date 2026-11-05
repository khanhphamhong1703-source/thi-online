const { z } = require('zod');
const { passwordSchema } = require('../auth/auth.validation');

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'ID không hợp lệ');

const optionalEmail = z
  .string()
  .trim()
  .max(120, 'Email tối đa 120 ký tự')
  .optional()
  .nullable()
  .refine((value) => !value || z.string().email().safeParse(value).success, {
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

const username = z
  .string()
  .trim()
  .min(3, 'Username phải có ít nhất 3 ký tự')
  .max(30, 'Username tối đa 30 ký tự')
  .regex(/^[a-zA-Z0-9._-]+$/, 'Username chỉ gồm chữ, số, dấu chấm, gạch dưới, gạch ngang');

const createTeacherSchema = z.object({
  fullName: z.string().trim().min(2, 'Họ tên phải có ít nhất 2 ký tự').max(100),
  username,
  password: passwordSchema,
  email: optionalEmail,
  phone: optionalPhone,
});

const updateTeacherSchema = z
  .object({
    fullName: z.string().trim().min(2, 'Họ tên phải có ít nhất 2 ký tự').max(100),
    username,
    email: optionalEmail,
    phone: optionalPhone,
  })
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Cần ít nhất một trường để cập nhật',
  });

const listTeachersQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
  search: z.string().trim().max(100).optional().default(''),
  status: z.enum(['all', 'active', 'locked']).optional().default('all'),
});

const teacherIdSchema = z.object({ id: objectId });

const statusSchema = z.object({ isActive: z.boolean() });

const resetPasswordSchema = z.object({ newPassword: passwordSchema });

module.exports = {
  createTeacherSchema,
  updateTeacherSchema,
  listTeachersQuerySchema,
  teacherIdSchema,
  statusSchema,
  resetPasswordSchema,
};
