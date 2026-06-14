import { describe, it, expect } from 'vitest';
import { executeCommand, createInitialState } from '../src/services/executor';

describe('executeCommand - layer', () => {
  it('initial state has default layer', () => {
    const state = createInitialState();
    expect(state.layers).toHaveLength(1);
    expect(state.layers[0].name).toBe('图层 1');
    expect(state.layers[0].visible).toBe(true);
    expect(state.layers[0].locked).toBe(false);
    expect(state.currentLayerId).toBe(state.layers[0].id);
  });

  it('createLayer creates a new layer and switches to it', () => {
    const state = createInitialState();
    const result = executeCommand({ action: 'createLayer' }, state, { width: 800, height: 600 });
    expect(result.layers).toHaveLength(2);
    expect(result.layers[1].name).toBe('图层 2');
    expect(result.currentLayerId).toBe(result.layers[1].id);
  });

  it('switchLayer by index', () => {
    const state = createInitialState();
    const afterCreate = executeCommand({ action: 'createLayer' }, state, { width: 800, height: 600 });
    const result = executeCommand({ action: 'switchLayer', target: '1' }, afterCreate, { width: 800, height: 600 });
    expect(result.currentLayerId).toBe(afterCreate.layers[0].id);
  });

  it('renameLayer renames the current layer', () => {
    const state = createInitialState();
    const result = executeCommand({ action: 'renameLayer', name: 'Background' }, state, { width: 800, height: 600 });
    expect(result.layers[0].name).toBe('Background');
  });

  it('toggleLayerVisibility toggles current layer visibility', () => {
    const state = createInitialState();
    const result = executeCommand({ action: 'toggleLayerVisibility' }, state, { width: 800, height: 600 });
    expect(result.layers[0].visible).toBe(false);
  });

  it('toggleLayerVisibility uses command.layerId when provided', () => {
    const state = createInitialState();
    const afterCreate = executeCommand({ action: 'createLayer' }, state, { width: 800, height: 600 });
    const result = executeCommand(
      { action: 'toggleLayerVisibility', layerId: afterCreate.layers[0].id },
      afterCreate,
      { width: 800, height: 600 }
    );
    expect(result.layers[0].visible).toBe(false);
    expect(result.layers[1].visible).toBe(true);
  });

  it('deleteLayer removes layer and its shapes', () => {
    const state = createInitialState();
    const afterCreate = executeCommand({ action: 'createLayer' }, state, { width: 800, height: 600 });
    const withShape = executeCommand(
      { action: 'draw', shape: 'rect', color: 'red', position: 'center', size: 'medium' },
      afterCreate,
      { width: 800, height: 600 }
    );
    expect(withShape.shapes).toHaveLength(1);
    expect(withShape.shapes[0].layerId).toBe(withShape.currentLayerId);

    const result = executeCommand({ action: 'deleteLayer' }, withShape, { width: 800, height: 600 });
    expect(result.layers).toHaveLength(1);
    expect(result.shapes).toHaveLength(0);
    expect(result.currentLayerId).toBe(result.layers[0].id);
  });

  it('deleteLayer does not delete the last layer', () => {
    const state = createInitialState();
    const result = executeCommand({ action: 'deleteLayer' }, state, { width: 800, height: 600 });
    expect(result.layers).toHaveLength(1);
    expect(result.layers[0].name).toBe('图层 1');
  });
});
