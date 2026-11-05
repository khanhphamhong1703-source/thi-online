const env = require('./env');

const allowedOrigins = new Set([env.CLIENT_URL]);

if (env.NODE_ENV !== 'production') {
  try {
    for (const hostname of ['localhost', '127.0.0.1']) {
      const localOrigin = new URL(env.CLIENT_URL);
      localOrigin.hostname = hostname;
      allowedOrigins.add(localOrigin.origin);
    }
  } catch {
    // CLIENT_URL đã được Zod kiểm tra; bỏ qua nếu không parse được.
  }
}

module.exports = { allowedOrigins };
