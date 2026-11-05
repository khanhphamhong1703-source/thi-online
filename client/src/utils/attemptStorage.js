const PREFIX = 'edumanage:attempt:';

function key(attemptId) {
  return `${PREFIX}${attemptId}`;
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
