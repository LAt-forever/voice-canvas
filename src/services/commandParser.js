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

const POSITION_KEYWORDS = [
  '左上角', '右上角', '左下角', '右下角',
  '左上', '右上', '左下', '右下',
  '上方', '下方', '左边', '右边',
  '上', '下', '左', '右',
  '中间', '中央', '中心', 'center'
];

function extractPosition(text) {
  for (const pos of POSITION_KEYWORDS) {
    if (text.includes(pos)) return pos;
  }
  return null;
}

function detectPosition(text) {
  return extractPosition(text) || 'center';
}

function detectSize(text) {
  if (text.includes('大')) return 'large';
  if (text.includes('小')) return 'small';
  return 'medium';
}

function extractSize(text) {
  if (text.includes('大')) return 'large';
  if (text.includes('小')) return 'small';
  return null;
}

const DIRECTION_KEYWORDS = {
  '从左到右': 'to-right',
  '从左往右': 'to-right',
  '从上到下': 'to-bottom',
  '从上往下': 'to-bottom',
  '从右到左': 'to-left',
  '从右往左': 'to-left',
  '从下到上': 'to-top',
  '从下往上': 'to-top',
  '从左上到右下': 'to-bottom-right',
  '从左上往右下': 'to-bottom-right',
  '从右上到左下': 'to-bottom-left',
  '从右上往左下': 'to-bottom-left',
  '从左下到右上': 'to-top-right',
  '从左下往右上': 'to-top-right',
  '从右下到左上': 'to-top-left',
  '从右下往左上': 'to-top-left'
};

function isBackgroundCommand(text) {
  if (text.includes('背景') || text.includes('background')) return true;
  const backgroundMarkers = ['渐变', '条纹', '棋盘', '星空', '噪点', '颗粒', '点阵', '圆点'];
  return backgroundMarkers.some(marker => text.includes(marker));
}

function detectDirection(text) {
  for (const [phrase, direction] of Object.entries(DIRECTION_KEYWORDS)) {
    if (text.includes(phrase)) return direction;
  }
  return 'to-right';
}

function detectBackgroundType(text) {
  if (text.includes('星空')) return { type: 'texture', subtype: 'starry' };
  if (text.includes('噪点') || text.includes('颗粒')) return { type: 'texture', subtype: 'noise' };
  if (text.includes('条纹')) return { type: 'pattern', subtype: 'stripes' };
  if (text.includes('棋盘格') || text.includes('棋盘')) return { type: 'pattern', subtype: 'checkerboard' };
  if (text.includes('点阵') || text.includes('圆点')) return { type: 'pattern', subtype: 'dots' };
  if (text.includes('径向') || text.includes('中心扩散') || text.includes('放射')) return { type: 'gradient', subtype: 'radial' };
  if (text.includes('渐变') || text.includes('渐变色')) return { type: 'gradient', subtype: 'linear' };
  return { type: 'solid', subtype: 'solid' };
}

function detectColors(text) {
  const colors = [];
  const colorNames = ['红', '绿', '蓝', '黄', '紫', '橙', '粉', '青', '黑', '白', '灰'];
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (colorNames.includes(char)) {
      colors.push(resolveColor(char));
    }
  }
  const hexMatches = text.matchAll(/#([0-9a-fA-F]{6})/g);
  for (const match of hexMatches) {
    colors.push(match[0]);
  }
  return colors;
}

function detectSecondaryColor(text) {
  const separators = ['到', '至', '和', '与'];
  for (const sep of separators) {
    const idx = text.indexOf(sep);
    if (idx !== -1) {
      const after = text.slice(idx + 1);
      const color = detectColor(after);
      if (color) return color;
    }
  }
  return '#ffffff';
}

function parseBackgroundCommand(text) {
  if (text.includes('默认') || text.includes('重置') || text.includes('白色')) {
    return { action: 'setBackground', background: { type: 'solid', color: '#ffffff' } };
  }

  const { type, subtype } = detectBackgroundType(text);
  const colors = detectColors(text);
  const direction = detectDirection(text);

  let background;

  if (type === 'solid') {
    background = { type, color: colors[0] || '#3b82f6' };
  } else {
    background = { type, subtype, direction };
  }

  if (type === 'gradient') {
    background.color = colors[0] || '#3b82f6';
    background.color2 = colors[1] || detectSecondaryColor(text) || '#ffffff';
  }
  if (type === 'pattern') {
    background.color = colors[0] || '#000000';
    background.color2 = colors[1] || detectSecondaryColor(text) || '#ffffff';
    background.density = 'medium';
  }
  if (type === 'texture') {
    background.color = colors[0] || '#000000';
    background.color2 = '#ffffff';
    background.density = 'medium';
  }

  return { action: 'setBackground', background };
}

function isDeleteCommand(text) {
  const keywords = ['删', 'remove', 'delete', 'erase'];
  return keywords.some(k => text.includes(k));
}

function parseDeleteCommand(text) {
  const filters = {};

  if (text.includes('最后一个') || text.includes('last')) {
    filters.last = true;
  }
  if (text.includes('所有') || text.includes('全部') || text.includes('all')) {
    filters.all = true;
  }

  const color = detectColor(text);
  if (color) filters.color = color;

  const shape = detectShape(text);
  if (shape) filters.shape = shape;

  const position = extractPosition(text);
  if (position) filters.position = position;

  const size = extractSize(text);
  if (size) filters.size = size;

  if (Object.keys(filters).length === 0) {
    filters.last = true;
  }

  return { action: 'delete', filters };
}

export function parseCommand(text) {
  const normalized = text.toLowerCase().trim();

  if (isBackgroundCommand(normalized)) {
    return [parseBackgroundCommand(normalized)];
  }

  if (isDeleteCommand(normalized)) {
    return [parseDeleteCommand(normalized)];
  }

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
