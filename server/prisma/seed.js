require('dotenv').config();
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const username = (process.env.SEED_ADMIN_USERNAME || 'admin').trim().toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD;
  const fullName = process.env.SEED_ADMIN_FULLNAME || 'Quản trị viên';
  const email = process.env.SEED_ADMIN_EMAIL || null;
  const isProduction = process.env.NODE_ENV === 'production';

  if (!password || password.length < 8) {
    throw new Error('SEED_ADMIN_PASSWORD phải có ít nhất 8 ký tự trong file .env');
  }

  if (
    isProduction &&
    /change[_-]?this|replace[-_]?with|admin@123456/i.test(password)
  ) {
    throw new Error(
      'SEED_ADMIN_PASSWORD đang dùng giá trị mẫu. Hãy đặt mật khẩu mạnh trước khi chạy production.'
    );
  }

  const resetPassword = process.env.SEED_ADMIN_RESET_PASSWORD === 'true';
  const passwordHash = await bcrypt.hash(password, 10);

  const data = {
    password: passwordHash,
    fullName,
    email,
    role: 'ADMIN',
    isActive: true,
    searchText: `${fullName} ${username} ${email || ''}`.toLowerCase(),
  };

  const existing = await prisma.user.findUnique({ where: { username } });
  let admin;
  if (existing && resetPassword) {
    admin = await prisma.user.update({
      where: { username },
      data: {
        ...data,
        password: passwordHash,
        tokenVersion: (existing.tokenVersion ?? 0) + 1,
      },
    });
    await prisma.refreshToken.deleteMany({ where: { userId: existing.id } });
  } else if (existing) {
    admin = await prisma.user.update({ where: { username }, data });
  } else {
    admin = await prisma.user.create({ data: { username, ...data, password: passwordHash } });
  }

  console.log(
    existing && !resetPassword
      ? `Đã cập nhật tài khoản Admin (giữ nguyên mật khẩu): ${admin.username}`
      : `Đã tạo/cập nhật tài khoản Admin: ${admin.username}`
  );
  if (!existing || resetPassword) {
    console.log('Mật khẩu Admin lấy từ biến SEED_ADMIN_PASSWORD');
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
