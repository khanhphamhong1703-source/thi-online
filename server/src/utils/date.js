const DATE_PATTERN = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/;
const ISO_DATE_PATTERN = /^(\d{4})-(\d{1,2})-(\d{1,2})$/;

function buildUtcNoon(year, month, day) {
  const date = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  if (
    Number.isNaN(date.getTime()) ||
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  return date;
}

function parseDateInput(value) {
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    return buildUtcNoon(value.getFullYear(), value.getMonth() + 1, value.getDate());
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    // Excel serial date (1900 date system)
    const utcDays = Math.floor(value - 25569);
    const utcValue = utcDays * 86400 * 1000;
    const date = new Date(utcValue);
    if (Number.isNaN(date.getTime())) return null;
    return buildUtcNoon(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate());
  }

  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  let year;
  let month;
  let day;

  const dmy = trimmed.match(DATE_PATTERN);
  if (dmy) {
    day = Number(dmy[1]);
    month = Number(dmy[2]);
    year = Number(dmy[3]);
  } else {
    const iso = trimmed.match(ISO_DATE_PATTERN);
    if (!iso) return null;
    year = Number(iso[1]);
    month = Number(iso[2]);
    day = Number(iso[3]);
  }

  if (year < 1900 || year > new Date().getFullYear()) return null;
  return buildUtcNoon(year, month, day);
}

function formatDateVN(value) {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const day = String(date.getUTCDate()).padStart(2, '0');
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  return `${day}/${month}/${date.getUTCFullYear()}`;
}

module.exports = { parseDateInput, formatDateVN };
