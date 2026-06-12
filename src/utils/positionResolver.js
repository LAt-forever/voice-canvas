export const DEFAULT_MARGIN = 40;

export function resolvePosition(input, canvasWidth, canvasHeight) {
  const normalized = String(input || 'center').toLowerCase().trim();
  const centerX = canvasWidth / 2;
  const centerY = canvasHeight / 2;

  switch (normalized) {
    case 'top-left':
    case '左上':
    case '左上角':
      return { x: DEFAULT_MARGIN, y: DEFAULT_MARGIN };
    case 'top':
    case '上':
    case '上方':
      return { x: centerX, y: DEFAULT_MARGIN };
    case 'top-right':
    case '右上':
    case '右上角':
      return { x: canvasWidth - DEFAULT_MARGIN, y: DEFAULT_MARGIN };
    case 'left':
    case '左':
    case '左边':
      return { x: DEFAULT_MARGIN, y: centerY };
    case 'center':
    case '中间':
    case '中央':
    case '中心':
      return { x: centerX, y: centerY };
    case 'right':
    case '右':
    case '右边':
      return { x: canvasWidth - DEFAULT_MARGIN, y: centerY };
    case 'bottom-left':
    case '左下':
    case '左下角':
      return { x: DEFAULT_MARGIN, y: canvasHeight - DEFAULT_MARGIN };
    case 'bottom':
    case '下':
    case '下方':
      return { x: centerX, y: canvasHeight - DEFAULT_MARGIN };
    case 'bottom-right':
    case '右下':
    case '右下角':
      return { x: canvasWidth - DEFAULT_MARGIN, y: canvasHeight - DEFAULT_MARGIN };
    default:
      return { x: centerX, y: centerY };
  }
}
