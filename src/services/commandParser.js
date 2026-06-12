import { resolveColor } from '../utils/colorMap';

const SHAPE_SYNONYMS = {
  rect: ['rect', 'rectangle', '方块', '方', '矩形'],
  circle: ['circle', '圆', '圆形'],
  line: ['line', '直线', '线'],
  triangle: ['triangle', '三角形', '三角']
};

function detectShape(text) {
  for (const [shape, synonyms] of Object.entries(SHAPE_SYNONYMS)) {
    for (const synonym of synonyms) {
      if (text.includes(synonym)) return shape;
    }
  }
  return null;
}

function detectColor(text) {
  const colorNames = ['红', '绿', '蓝', '黄', '紫', '橙', '粉', '青', '黑', '白', '灰'];
  for (const name of colorNames) {
    if (text.includes(name)) return resolveColor(name);
  }
  const hexMatch = text.match(/#([0-9a-fA-F]{6})/);
  if (hexMatch) return hexMatch[0];
  return null;
}

function detectPosition(text) {
  const positions = [
    '左上角', '右上角', '左下角', '右下角',
    '左上', '右上', '左下', '右下',
    '上方', '下方', '左边', '右边',
    '上', '下', '左', '右',
    '中间', '中央', '中心', 'center'
  ];
  for (const pos of positions) {
    if (text.includes(pos)) return pos;
  }
  return 'center';
}

function detectSize(text) {
  if (text.includes('大')) return 'large';
  if (text.includes('小')) return 'small';
  return 'medium';
}

export function parseCommand(text) {
  const normalized = text.toLowerCase().trim();

  if (normalized.includes('撤销')) {
    return [{ action: 'undo' }];
  }
  if (normalized.includes('重做')) {
    return [{ action: 'redo' }];
  }
  if (normalized.includes('清空') || normalized.includes('重置')) {
    return [{ action: 'clear' }];
  }
  if (normalized.includes('保存') || normalized.includes('下载')) {
    return [{ action: 'save' }];
  }

  const shape = detectShape(normalized);
  if (shape) {
    return [{
      action: 'draw',
      shape,
      color: detectColor(normalized),
      position: detectPosition(normalized),
      size: detectSize(normalized)
    }];
  }

  return null;
}

export function canParseLocally(text) {
  return parseCommand(text) !== null;
}

export function needsLLM(text) {
  const normalized = text.toLowerCase();
  const complexMarkers = ['先', '再', '然后', '接着', '第一步', '第二步', '和', '连'];
  return complexMarkers.some(marker => normalized.includes(marker)) || !canParseLocally(text);
}
