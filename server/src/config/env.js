const path = require('path');
const { z } = require('zod');

require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(5000),
  CLIENT_URL: z.string().url().default('http://localhost:5173'),
  CORS_EXTRA_ORIGINS: z.string().default(''),
  MONGODB_URI: z.string().min(1, 'Thiếu MONGODB_URI'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET phải có ít nhất 32 ký tự'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  COOKIE_NAME: z.string().default('token'),
  COOKIE_SECURE: z.enum(['true', 'false']).optional(),
  TRUST_PROXY: z.coerce.number().int().min(0).max(10).optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const details = parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`);
  throw new Error(`Cấu hình môi trường không hợp lệ:\n${details.join('\n')}`);
}

module.exports = Object.freeze(parsed.data);
