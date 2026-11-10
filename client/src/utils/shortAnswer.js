export const SHORT_ANSWER_PATTERNS = [/^[0-9-]$/, /^[0-9,]$/, /^[0-9,]$/, /^[0-9]$/];

export function distributeShortAnswer(text) {
  const cleaned = String(text || '').replace(/\s+/g, '');
  const boxes = ['', '', '', ''];
  let cursor = 0;

  for (const char of cleaned) {
    let placedAt = -1;
    for (let index = cursor; index < boxes.length; index += 1) {
      if (SHORT_ANSWER_PATTERNS[index].test(char)) {
        placedAt = index;
        break;
      }
    }
    if (placedAt === -1) continue;
    boxes[placedAt] = char;
    cursor = placedAt + 1;
    if (cursor >= boxes.length) break;
  }

  return { boxes, nextIndex: Math.min(cursor, boxes.length - 1) };
}
