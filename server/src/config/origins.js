const env = require('./env');

const allowedOrigins = new Set([env.CLIENT_URL]);

for (const origin of env.CORS_EXTRA_ORIGINS.split(',')) {
  const trimmed = origin.trim();
  if (trimmed) allowedOrigins.add(new URL(trimmed).origin);
}

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

function requestHost(req) {
  const forwarded = String(req.headers['x-forwarded-host'] || '')
    .split(',')[0]
    .trim();
  return forwarded || String(req.headers.host || '').trim();
}

function isSameOriginRequest(origin, req) {
  if (!origin) return false;
  let originHost;
  try {
    originHost = new URL(origin).host;
  } catch {
    return false;
  }
  const host = requestHost(req);
  return Boolean(host) && originHost === host;
}

function isAllowedOrigin(origin, req) {
  if (!origin) return true;
  if (allowedOrigins.has(origin)) return true;
  return Boolean(req) && isSameOriginRequest(origin, req);
}

module.exports = { allowedOrigins, isAllowedOrigin };
