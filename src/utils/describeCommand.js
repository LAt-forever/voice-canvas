const SHAPE_NAMES = {
  rect: '矩形',
  circle: '圆形',
  line: '直线',
  triangle: '三角形'
};

const SIZE_NAMES = {
  small: '小号',
  medium: '中号',
  large: '大号'
};

const POSITION_NAMES = {
  center: '中心',
  'top-left': '左上角',
  'top-right': '右上角',
  'bottom-left': '左下角',
  'bottom-right': '右下角',
  top: '上方',
  bottom: '下方',
  left: '左边',
  right: '右边'
};

const DIRECTION_NAMES = {
  'to-right': '从左到右',
  'to-left': '从右到左',
  'to-bottom': '从上到下',
  'to-top': '从下到上',
  'to-bottom-right': '从左上到右下',
  'to-bottom-left': '从右上到左下',
  'to-top-right': '从左下到右上',
  'to-top-left': '从右下到左上'
};

const COLOR_MAP = {
  '#ef4444': '红色',
  '#22c55e': '绿色',
  '#3b82f6': '蓝色',
  '#eab308': '黄色',
  '#a855f7': '紫色',
  '#f97316': '橙色',
  '#ec4899': '粉色',
  '#06b6d4': '青色',
  '#000000': '黑色',
  '#ffffff': '白色',
  '#6b7280': '灰色'
};

const ENGLISH_COLOR_NAMES = {
  red: '红色', green: '绿色', blue: '蓝色', yellow: '黄色',
  purple: '紫色', orange: '橙色', pink: '粉色', cyan: '青色',
  black: '黑色', white: '白色', gray: '灰色'
};

const GRID_SIZE_NAMES = {
  small: '小',
  medium: '中',
  large: '大'
};

function colorName(color) {
  if (!color) return '';
  const normalized = String(color).toLowerCase();
  if (COLOR_MAP[normalized]) return COLOR_MAP[normalized];
  return ENGLISH_COLOR_NAMES[normalized] || color;
}

export function describeCommand(command) {
  switch (command.action) {
    case 'draw': {
      const shape = SHAPE_NAMES[command.shape] || command.shape || '图形';
      const col = colorName(command.color);
      const pos = POSITION_NAMES[command.position] || command.position || '中心';
      const size = SIZE_NAMES[command.size] || command.size || '中号';
      return `在${pos}画一个${col}${size}${shape}`;
    }
    case 'setColor':
      return `将当前颜色设置为${colorName(command.color)}`;
    case 'setBackground': {
      const bg = command.background || {};
      if (bg.type === 'solid') {
        return `将背景设置为${colorName(bg.color)}纯色`;
      }
      if (bg.type === 'gradient') {
        const dir = DIRECTION_NAMES[bg.direction] || '';
        return `将背景设置为${dir}${colorName(bg.color || '')}到${colorName(bg.color2 || '')}渐变`;
      }
      if (bg.type === 'pattern') {
        const subtype = bg.subtype === 'stripes' ? '条纹' : bg.subtype === 'checkerboard' ? '棋盘格' : '点阵';
        return `将背景设置为${subtype}${colorName(bg.color || '')}与${colorName(bg.color2 || '')}图案`;
      }
      if (bg.type === 'texture') {
        const subtype = bg.subtype === 'starry' ? '星空' : '噪点';
        return `将背景设置为${subtype}${colorName(bg.color || '')}纹理`;
      }
      return '设置背景';
    }
    case 'setGrid':
      return command.visible ? '显示网格' : '隐藏网格';
    case 'setSnap':
      return command.snap ? '开启网格吸附' : '关闭网格吸附';
    case 'setGridSize': {
      return `设置网格间距为${GRID_SIZE_NAMES[command.size] || command.size}`;
    }
    case 'createLayer':
      return '新建一个图层并切换到它';
    case 'switchLayer':
      return `切换到图层 ${command.target}`;
    case 'renameLayer':
      return `将当前图层重命名为“${command.name}”`;
    case 'toggleLayerVisibility':
      return command.visible ? '显示当前图层' : '隐藏当前图层';
    case 'deleteLayer':
      return '删除当前图层及其图形';
    case 'undo':
      return '撤销上一步';
    case 'redo':
      return '重做上一步';
    case 'clear':
      return '清空画布';
    case 'save':
      return '保存图片';
    case 'delete':
      return '删除符合条件的图形';
    default:
      return `未知命令：${JSON.stringify(command)}`;
  }
}
