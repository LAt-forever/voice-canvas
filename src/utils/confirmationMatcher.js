const CONFIRM_KEYWORDS = Object.freeze(['确认', '执行', '开始', '好的', '好呀']);
const CANCEL_KEYWORDS = Object.freeze(['取消', '放弃', '不要', '算了']);

export function isConfirm(text) {
  if (typeof text !== 'string') return false;
  return CONFIRM_KEYWORDS.some(keyword => text.includes(keyword));
}

export function isCancel(text) {
  if (typeof text !== 'string') return false;
  return CANCEL_KEYWORDS.some(keyword => text.includes(keyword));
}
