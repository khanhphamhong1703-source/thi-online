const app = require('./app');
const env = require('./config/env');
const prisma = require('./config/prisma');

async function start() {
  try {
    await prisma.$connect();
    const server = app.listen(env.PORT, () => {
      console.log(`API chạy tại http://localhost:${env.PORT}`);
      console.log(`Môi trường: ${env.NODE_ENV}`);
    });

    const shutdown = async (signal) => {
      console.log(`\nNhận ${signal}, đang dừng server...`);
      server.close(async () => {
        await prisma.$disconnect();
        process.exit(0);
      });
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
  } catch (error) {
    console.error('Không thể khởi động server:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

start();
