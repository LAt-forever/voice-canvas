import { describe, it, expect } from 'vitest';
import { resolvePosition, DEFAULT_MARGIN } from '../src/utils/positionResolver';

describe('resolvePosition', () => {
  it('resolves center', () => {
    expect(resolvePosition('center', 800, 600)).toEqual({ x: 400, y: 300 });
    expect(resolvePosition('中间', 800, 600)).toEqual({ x: 400, y: 300 });
  });

  it('resolves top-left', () => {
    expect(resolvePosition('top-left', 800, 600)).toEqual({ x: DEFAULT_MARGIN, y: DEFAULT_MARGIN });
    expect(resolvePosition('左上角', 800, 600)).toEqual({ x: DEFAULT_MARGIN, y: DEFAULT_MARGIN });
  });

  it('resolves bottom-right', () => {
    expect(resolvePosition('bottom-right', 800, 600)).toEqual({
      x: 800 - DEFAULT_MARGIN,
      y: 600 - DEFAULT_MARGIN
    });
  });

  it('defaults to center for unknown input', () => {
    expect(resolvePosition('somewhere', 800, 600)).toEqual({ x: 400, y: 300 });
    expect(resolvePosition('', 800, 600)).toEqual({ x: 400, y: 300 });
  });
});
