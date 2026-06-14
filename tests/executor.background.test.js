import { describe, it, expect } from 'vitest';
import { executeCommand, createInitialState } from '../src/services/executor';

describe('executeCommand - background', () => {
  it('initial state includes default background', () => {
    const state = createInitialState();
    expect(state.background).toEqual({ type: 'solid', color: '#ffffff' });
  });

  it('sets solid background', () => {
    const state = createInitialState();
    const result = executeCommand(
      { action: 'setBackground', background: { type: 'solid', color: '#ff0000' } },
      state,
      { width: 800, height: 600 }
    );
    expect(result.background).toEqual({ type: 'solid', color: '#ff0000' });
  });

  it('preserves background when drawing', () => {
    const state = { ...createInitialState(), background: { type: 'solid', color: '#ff0000' } };
    const result = executeCommand(
      { action: 'draw', shape: 'rect', color: 'blue', position: 'center', size: 'medium' },
      state,
      { width: 800, height: 600 }
    );
    expect(result.background).toEqual({ type: 'solid', color: '#ff0000' });
  });

  it('preserves background when clearing', () => {
    const state = { ...createInitialState(), background: { type: 'solid', color: '#ff0000' } };
    const result = executeCommand({ action: 'clear' }, state, { width: 800, height: 600 });
    expect(result.background).toEqual({ type: 'solid', color: '#ff0000' });
  });
});
