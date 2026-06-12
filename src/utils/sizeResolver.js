export const SIZE_PRESETS = {
  small: { width: 80, height: 60 },
  medium: { width: 160, height: 120 },
  large: { width: 320, height: 240 }
};

export function resolveSize(input) {
  if (!input) return SIZE_PRESETS.medium;
  if (typeof input === 'object' && input.width && input.height) {
    return { width: Number(input.width), height: Number(input.height) };
  }
  const normalized = String(input).toLowerCase().trim();
  return SIZE_PRESETS[normalized] || SIZE_PRESETS.medium;
}

export function adjustSize(currentSize, direction) {
  const factor = direction === 'larger' ? 1.5 : 0.75;
  return {
    width: currentSize.width * factor,
    height: currentSize.height * factor
  };
}
