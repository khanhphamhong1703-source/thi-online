export function getFullscreenElement() {
  if (typeof document === 'undefined') return null;
  return document.fullscreenElement || document.webkitFullscreenElement || null;
}

export function isExamFullscreenSupported() {
  if (typeof document === 'undefined') return false;
  const element = document.documentElement;
  return Boolean(element.requestFullscreen || element.webkitRequestFullscreen);
}

export async function enterExamFullscreen() {
  if (getFullscreenElement()) return true;
  if (!isExamFullscreenSupported()) return false;

  const element = document.documentElement;
  const request = element.requestFullscreen || element.webkitRequestFullscreen;
  try {
    await request.call(element, { navigationUI: 'hide' });
    return Boolean(getFullscreenElement());
  } catch {
    return false;
  }
}

export async function exitExamFullscreen() {
  if (!getFullscreenElement()) return;
  const exit = document.exitFullscreen || document.webkitExitFullscreen;
  if (!exit) return;
  try {
    await exit.call(document);
  } catch {
    // Trình duyệt có thể từ chối thoát; không cần chặn luồng nộp bài.
  }
}
