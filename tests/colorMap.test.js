import { describe, it, expect } from 'vitest';
import { resolveColor, COLOR_MAP } from '../src/utils/colorMap';

describe('resolveColor', () => {
  it('returns mapped hex for known English color names', () => {
    expect(resolveColor('red')).toBe('#ef4444');
    expect(resolveColor('blue')).toBe('#3b82f6');
  });

  it('returns mapped hex for known Chinese color names', () => {
    expect(resolveColor('红色')).toBe('#ef4444');
    expect(resolveColor('蓝色')).toBe('#3b82f6');
  });

  it('returns raw string for hex colors', () => {
    expect(resolveColor('#123456')).toBe('#123456');
  });

  it('has default color for empty input', () => {
    expect(resolveColor('')).toBe('#3b82f6');
  });

  it('COLOR_MAP contains expected entries', () => {
    expect(COLOR_MAP['red']).toBe('#ef4444');
    expect(COLOR_MAP['红']).toBe('#ef4444');
  });
});
