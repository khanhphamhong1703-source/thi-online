const env = require('../config/env');

const ACCESS_MAX_AGE = env.ACCESS_TOKEN_TTL_MINUTES * 60 * 1000;
const REFRESH_MAX_AGE = env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000;
const REFRESH_COOKIE_PATH = '/api/auth';

const secureCookie =
  env.COOKIE_SECURE === undefined
    ? env.NODE_ENV === 'production'
    : env.COOKIE_SECURE === 'true';

function baseCookieOptions(path) {
  return {
    httpOnly: true,
    secure: secureCookie,
    sameSite: 'lax',
    path,
  };
}

function accessCookieOptions() {
  return { ...baseCookieOptions('/'), maxAge: ACCESS_MAX_AGE };
}

function refreshCookieOptions() {
  return { ...baseCookieOptions(REFRESH_COOKIE_PATH), maxAge: REFRESH_MAX_AGE };
}

function clearAccessCookieOptions() {
  return baseCookieOptions('/');
}

function clearRefreshCookieOptions() {
  return baseCookieOptions(REFRESH_COOKIE_PATH);
}

module.exports = {
  accessCookieOptions,
  refreshCookieOptions,
  clearAccessCookieOptions,
  clearRefreshCookieOptions,
};
