export const SECTION_TITLES = {
  I: 'Trắc nghiệm',
  II: 'Đúng Sai',
  III: 'Trả lời ngắn',
};

export function getExamPhase(exam, now = Date.now()) {
  if (!exam) return 'ENDED';
  if (exam.phase) return exam.phase;
  const closeAt = exam.closeAt ? new Date(exam.closeAt).getTime() : null;
  if (closeAt !== null && now >= closeAt) return 'ENDED';
  if (exam.openAt && now < new Date(exam.openAt).getTime()) return 'UPCOMING';
  return 'OPEN';
}

export function getExamDisplayStatus(exam) {
  if (!exam) return { label: '—', variant: 'neutral' };
  const phase = getExamPhase(exam);
  if (phase === 'OPEN') return { label: 'Đang mở', variant: 'active' };
  if (phase === 'UPCOMING') return { label: 'Sắp mở', variant: 'warning' };
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
