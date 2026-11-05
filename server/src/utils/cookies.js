const env = require('../config/env');

const COOKIE_MAX_AGE = 7 * 24 * 60 * 60 * 1000;
const secureCookie =
  env.COOKIE_SECURE === undefined
    ? env.NODE_ENV === 'production'
    : env.COOKIE_SECURE === 'true';

function authCookieOptions() {
  return {
    httpOnly: true,
    secure: secureCookie,
    sameSite: 'lax',
    path: '/',
    maxAge: COOKIE_MAX_AGE,
  };
}

function clearCookieOptions() {
  return {
    httpOnly: true,
    secure: secureCookie,
    sameSite: 'lax',
    path: '/',
  };
}

module.exports = { authCookieOptions, clearCookieOptions };
