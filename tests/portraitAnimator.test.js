import { describe, it, expect } from 'vitest';
import { createAnimator, getTipPosition } from '../src/services/portraitAnimator';

describe('portraitAnimator', () => {
  const strokes = [
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
  ];

  it('initial progress is 0', () => {
    const anim = createAnimator(strokes, { x: 100, y: 100, width: 100, height: 100 }, 200);
    expect(anim.getProgress()).toBe(0);
  });

  it('advances progress by pixel distance', () => {
    const anim = createAnimator(strokes, { x: 100, y: 100, width: 100, height: 100 }, 200);
    anim.advance(500); // 0.5 seconds at 200 px/s
    // total normalized length = 2; mapped length = 2 * 100 (width) = 200px
    expect(anim.getProgress()).toBeCloseTo(0.5, 2);
  });

  it('computes tip position at partial stroke', () => {
    const anim = createAnimator(strokes, { x: 100, y: 100, width: 100, height: 100 }, 200);
    anim.advance(250); // quarter of total mapped length
    const tip = getTipPosition(anim);
    expect(tip.x).toBeCloseTo(100, 0);
    expect(tip.y).toBeCloseTo(50, 0);
  });

  it('completes at end', () => {
    const anim = createAnimator(strokes, { x: 100, y: 100, width: 100, height: 100 }, 200);
    anim.advance(2000);
    expect(anim.isComplete()).toBe(true);
    expect(anim.getProgress()).toBe(1);
  });
});
