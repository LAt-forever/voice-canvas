import { describe, it, expect } from 'vitest';
import { snapPosition } from '../src/utils/positionResolver';

describe('snapPosition', () => {
  it('snaps to nearest intersection when within threshold', () => {
    expect(snapPosition(42, 38, 40)).toEqual({ x: 40, y: 40 });
  });

  it('keeps original coordinate when beyond threshold', () => {
    expect(snapPosition(60, 60, 40)).toEqual({ x: 60, y: 60 });
  });

  it('snaps to origin when near zero', () => {
    expect(snapPosition(10, 10, 40)).toEqual({ x: 0, y: 0 });
  });

  it('handles exact multiples of spacing', () => {
    expect(snapPosition(80, 120, 40)).toEqual({ x: 80, y: 120 });
  });

  it('returns original coordinates for invalid spacing', () => {
    expect(snapPosition(42, 38, 0)).toEqual({ x: 42, y: 38 });
  });
});
