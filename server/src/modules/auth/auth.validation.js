const { z } = require('zod');

const passwordSchema = z
  .string()
  .min(8, 'Mật khẩu phải có ít nhất 8 ký tự')
  .max(72, 'Mật khẩu không được vượt quá 72 ký tự')
  .regex(/[A-Za-z]/, 'Mật khẩu phải có ít nhất một chữ cái')
  .regex(/[0-9]/, 'Mật khẩu phải có ít nhất một chữ số');

const loginSchema = z.object({
  username: z.string().trim().min(1, 'Vui lòng nhập username').max(50),
  password: z.string().min(1, 'Vui lòng nhập mật khẩu').max(72),
  expectedRole: z.enum(['ADMIN', 'TEACHER']).optional(),
});

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Vui lòng nhập mật khẩu hiện tại'),
    newPassword: passwordSchema,
    confirmPassword: z.string().min(1, 'Vui lòng xác nhận mật khẩu mới'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Mật khẩu xác nhận không khớp',
    path: ['confirmPassword'],
  });

module.exports = { loginSchema, changePasswordSchema, passwordSchema };
