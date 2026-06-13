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

function isGridCommand(text) {
  return text.includes('网格') || text.includes('吸附') || text.includes('grid') || text.includes('snap');
}

function parseGridCommand(text) {
  if (text.includes('网格')) {
    if (text.includes('显示') || text.includes('打开') || text.includes('show')) {
      return { action: 'setGrid', visible: true };
    }
    if (text.includes('隐藏') || text.includes('关闭') || text.includes('hide')) {
      return { action: 'setGrid', visible: false };
    }
    if (text.includes('调大') || text.includes('大一点') || text.includes('bigger')) {
      return { action: 'setGridSize', size: 'large' };
    }
    if (text.includes('调小') || text.includes('小一点') || text.includes('smaller')) {
      return { action: 'setGridSize', size: 'small' };
    }
  }

  if (text.includes('吸附') || text.includes('snap')) {
    if (text.includes('打开') || text.includes('开启') || text.includes('enable')) {
      return { action: 'setSnap', snap: true };
    }
    if (text.includes('关闭') || text.includes('disable')) {
      return { action: 'setSnap', snap: false };
    }
  }

  return null;
}

export function parseCommand(text) {
  const normalized = text.toLowerCase().trim();

  if (isDeleteCommand(normalized)) {
    return [parseDeleteCommand(normalized)];
  }

  if (isGridCommand(normalized)) {
    const gridCmd = parseGridCommand(normalized);
    if (gridCmd) return [gridCmd];
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
