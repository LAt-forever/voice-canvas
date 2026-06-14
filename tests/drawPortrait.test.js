import { describe, it, expect, vi } from 'vitest';
import { drawPortrait } from '../src/shapes/drawPortrait';

describe('drawPortrait', () => {
  it('draws visible portion of strokes based on progress', () => {
    const ctx = {
      save: vi.fn(),
      restore: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      stroke: vi.fn(),
      setLineDash: vi.fn(),
      closePath: vi.fn()
    };

    const shape = {
      x: 100,
      y: 100,
      width: 100,
      height: 100,
      color: '#333333',
      animationProgress: 0.5,
      strokes: [
        {
          id: 's0',
          type: 'outline',
          points: [{ x: 0, y: 0 }, { x: 1, y: 0 }],
          length: 1
        },
        {
          id: 's1',
          type: 'outline',
          points: [{ x: 1, y: 0 }, { x: 1, y: 1 }],
          length: 1
        }
      ]
    };

    drawPortrait(ctx, shape);
    expect(ctx.save).toHaveBeenCalled();
    expect(ctx.stroke).toHaveBeenCalled();
    expect(ctx.restore).toHaveBeenCalled();
  });

  it('draws full strokes when progress is 1', () => {
    const ctx = {
      save: vi.fn(),
      restore: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      stroke: vi.fn(),
      setLineDash: vi.fn(),
      closePath: vi.fn()
    };

    const shape = {
      x: 100,
      y: 100,
      width: 100,
      height: 100,
      color: '#333333',
      animationProgress: 1,
      strokes: [
        {
          id: 's0',
          type: 'outline',
          points: [{ x: 0, y: 0 }, { x: 1, y: 0 }],
          length: 1
        }
      ]
    };

    drawPortrait(ctx, shape);
    expect(ctx.setLineDash).not.toHaveBeenCalled();
  });
});
