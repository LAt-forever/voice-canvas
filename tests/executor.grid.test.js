import { describe, it, expect } from 'vitest';
import { executeCommand, createInitialState } from '../src/services/executor';

describe('executeCommand - grid', () => {
  it('initial state includes grid config', () => {
    const state = createInitialState();
    expect(state.grid).toEqual({ visible: true, snap: true, spacing: 40 });
  });

  it('toggles grid visibility', () => {
    const state = createInitialState();
    const result = executeCommand({ action: 'setGrid', visible: false }, state, { width: 800, height: 600 });
    expect(result.grid.visible).toBe(false);
    expect(result.grid.snap).toBe(true);
    expect(result.grid.spacing).toBe(40);
  });

  it('toggles snap', () => {
    const state = createInitialState();
    const result = executeCommand({ action: 'setSnap', snap: false }, state, { width: 800, height: 600 });
    expect(result.grid.snap).toBe(false);
  });

  it('sets grid size', () => {
    const state = createInitialState();
    const result = executeCommand({ action: 'setGridSize', size: 'large' }, state, { width: 800, height: 600 });
    expect(result.grid.spacing).toBe(80);
  });

  it('snaps draw position when snap enabled', () => {
    const state = { ...createInitialState(), grid: { visible: true, snap: true, spacing: 40 } };
    const result = executeCommand(
      { action: 'draw', shape: 'rect', color: 'red', position: 'left', size: 'medium' },
      state,
      { width: 800, height: 620 }
    );
    // left gives x=40 (on grid), y=310 (snaps to 320)
    expect(result.shapes[0].x).toBe(40);
    expect(result.shapes[0].y).toBe(320);
  });

  it('does not snap when snap disabled', () => {
    const state = { ...createInitialState(), grid: { visible: true, snap: false, spacing: 40 } };
    const result = executeCommand(
      { action: 'draw', shape: 'rect', color: 'red', position: 'left', size: 'medium' },
      state,
      { width: 800, height: 620 }
    );
    expect(result.shapes[0].x).toBe(40);
    expect(result.shapes[0].y).toBe(310);
  });
});
