export const COLOR_MAP = {
  red: '#ef4444',
  红: '#ef4444',
  红色: '#ef4444',
  green: '#22c55e',
  绿: '#22c55e',
  绿色: '#22c55e',
  blue: '#3b82f6',
  蓝: '#3b82f6',
  蓝色: '#3b82f6',
  yellow: '#eab308',
  黄: '#eab308',
  黄色: '#eab308',
  purple: '#a855f7',
  紫: '#a855f7',
  紫色: '#a855f7',
  orange: '#f97316',
  橙: '#f97316',
  橙色: '#f97316',
  pink: '#ec4899',
  粉: '#ec4899',
  粉色: '#ec4899',
  cyan: '#06b6d4',
  青: '#06b6d4',
  青色: '#06b6d4',
  black: '#000000',
  黑: '#000000',
  黑色: '#000000',
  white: '#ffffff',
  白: '#ffffff',
  白色: '#ffffff',
  gray: '#6b7280',
  灰: '#6b7280',
  灰色: '#6b7280'
};

export function resolveColor(input) {
  if (!input) return '#3b82f6';
  const normalized = String(input).toLowerCase().trim();
  return COLOR_MAP[normalized] || normalized;
}
