require('dotenv').config();
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const username = (process.env.SEED_ADMIN_USERNAME || 'admin').trim().toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD;
  const fullName = process.env.SEED_ADMIN_FULLNAME || 'Quản trị viên';
  const email = process.env.SEED_ADMIN_EMAIL || null;

  if (!password || password.length < 8) {
    throw new Error('SEED_ADMIN_PASSWORD phải có ít nhất 8 ký tự trong file .env');
  }

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
  const admin = existing
    ? await prisma.user.update({ where: { username }, data })
    : await prisma.user.create({ data: { username, ...data } });

  console.log(`Đã tạo/cập nhật tài khoản Admin: ${admin.username}`);
  console.log('Mật khẩu Admin lấy từ biến SEED_ADMIN_PASSWORD trong server/.env');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
