const { MongoClient } = require('../server/node_modules/mongodb');

const PORT = Number(process.env.LOCAL_MONGO_PORT) || 27018;
const HOST = '127.0.0.1';

async function main() {
  const client = new MongoClient(`mongodb://${HOST}:${PORT}/?directConnection=true`);
  await client.connect();
  const admin = client.db('admin');

  try {
    await admin.command({ replSetGetStatus: 1 });
    console.log('Replica set đã được khởi tạo trước đó.');
  } catch (error) {
    if (error.code === 94 || error.codeName === 'NotYetInitialized') {
      await admin.command({
        replSetInitiate: {
          _id: 'rs0',
          members: [{ _id: 0, host: `${HOST}:${PORT}` }],
        },
      });
      console.log('Đã khởi tạo replica set rs0.');
    } else {
      throw error;
    }
  }

  for (let attempt = 0; attempt < 20; attempt += 1) {
    const status = await admin.command({ replSetGetStatus: 1 });
    if (status.myState === 1) {
      console.log(`MongoDB replica set PRIMARY sẵn sàng tại ${HOST}:${PORT}.`);
      await client.close();
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  throw new Error('Replica set chưa đạt trạng thái PRIMARY');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
