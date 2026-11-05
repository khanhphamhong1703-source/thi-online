export function getExamDisplayStatus(exam) {
  if (!exam) return { label: '—', variant: 'neutral' };
  if (exam.status === 'DRAFT') return { label: 'Bản nháp', variant: 'neutral' };
  if (exam.status === 'CLOSED') return { label: 'Đã đóng', variant: 'warning' };
  if (exam.phase === 'OPEN') return { label: 'Đang mở', variant: 'active' };
  if (exam.phase === 'UPCOMING') return { label: 'Sắp mở', variant: 'warning' };
  return { label: 'Đã kết thúc', variant: 'neutral' };
}

export function getAttemptDisplayStatus(status) {
  if (status === 'SUBMITTED') return { label: 'Đã nộp', variant: 'active' };
  if (status === 'AUTO_SUBMITTED') return { label: 'Tự nộp', variant: 'warning' };
  return { label: 'Đang làm', variant: 'info' };
}

export function toDateTimeLocalValue(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

export function defaultExamWindow() {
  const open = new Date();
  open.setSeconds(0, 0);
  const close = new Date(open.getTime() + 2 * 60 * 60 * 1000);
  return {
    openAt: toDateTimeLocalValue(open),
    closeAt: toDateTimeLocalValue(close),
  };
}
