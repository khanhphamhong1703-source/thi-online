const PREFIX = 'edumanage:attempt:';
const DRAFT_PREFIX = 'edumanage:attempt-draft:';

function key(attemptId) {
  return `${PREFIX}${attemptId}`;
}

function draftKey(attemptId) {
  return `${DRAFT_PREFIX}${attemptId}`;
}

export function saveAttemptToken(attemptId, token) {
  try {
    sessionStorage.setItem(key(attemptId), token);
  } catch {
    // sessionStorage có thể bị chặn; phiên vẫn dùng được trong bộ nhớ trang.
  }
}

export function getAttemptToken(attemptId) {
  try {
    return sessionStorage.getItem(key(attemptId));
  } catch {
    return null;
  }
}

export function removeAttemptToken(attemptId) {
  try {
    sessionStorage.removeItem(key(attemptId));
  } catch {
    // bỏ qua
  }
}

export function saveAttemptDraft(attemptId, answers) {
  try {
    localStorage.setItem(
      draftKey(attemptId),
      JSON.stringify({ answers, savedAt: Date.now() })
    );
  } catch {
    // bỏ qua
  }
}

export function getAttemptDraft(attemptId) {
  try {
    const raw = localStorage.getItem(draftKey(attemptId));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed.answers === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

export function removeAttemptDraft(attemptId) {
  try {
    localStorage.removeItem(draftKey(attemptId));
  } catch {
    // bỏ qua
  }
}
