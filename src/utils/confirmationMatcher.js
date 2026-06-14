const CONFIRM_KEYWORDS = ['确认', '执行', '开始', '好'];
const CANCEL_KEYWORDS = ['取消', '放弃', '不', '算了'];

export function isConfirm(text) {
  return CONFIRM_KEYWORDS.some(keyword => text.includes(keyword));
}

export function isCancel(text) {
  return CANCEL_KEYWORDS.some(keyword => text.includes(keyword));
}
