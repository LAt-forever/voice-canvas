import { describe, it, expect } from 'vitest';
import { executeCommand, createInitialState } from '../src/services/executor';

describe('executeCommand', () => {
  it('draws a red rect at center', () => {
    const state = createInitialState();
    const result = executeCommand(
      { action: 'draw', shape: 'rect', color: 'red', position: 'center', size: 'medium' },
      state,
      { width: 800, height: 600 }
    );
    expect(result.shapes).toHaveLength(1);
    expect(result.shapes[0].type).toBe('rect');
    expect(result.shapes[0].color).toBe('#ef4444');
    expect(result.shapes[0].x).toBe(400);
    expect(result.shapes[0].y).toBe(300);
  });

  it('draws a circle with default color when no color given', () => {
    const state = createInitialState();
    const result = executeCommand(
      { action: 'draw', shape: 'circle', position: 'center', size: 'small' },
      state,
      { width: 800, height: 600 }
    );
    expect(result.shapes[0].type).toBe('circle');
    expect(result.shapes[0].color).toBe('#3b82f6');
  });

  it('clears all shapes', () => {
    const state = { shapes: [{ id: '1', type: 'rect' }], currentColor: '#000' };
    const result = executeCommand({ action: 'clear' }, state, { width: 800, height: 600 });
    expect(result.shapes).toHaveLength(0);
  });
});
