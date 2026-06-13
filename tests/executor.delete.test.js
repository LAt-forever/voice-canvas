import { describe, it, expect } from 'vitest';
import { executeCommand } from '../src/services/executor';

describe('executeCommand - delete', () => {
  it('removes the last shape when filters.last is true', () => {
    const state = {
      shapes: [
        { id: 'a', type: 'rect', x: 100, y: 100, width: 100, height: 100, color: '#ef4444' },
        { id: 'b', type: 'circle', x: 200, y: 200, width: 100, height: 100, color: '#3b82f6' }
      ],
      currentColor: '#000000'
    };
    const result = executeCommand({ action: 'delete', filters: { last: true } }, state, { width: 800, height: 600 });
    expect(result.shapes).toHaveLength(1);
    expect(result.shapes[0].id).toBe('a');
    expect(result.removed).toHaveLength(1);
    expect(result.removed[0].id).toBe('b');
    expect(result.currentColor).toBe('#000000');
  });

  it('removes all shapes matching color when filters.all is true', () => {
    const state = {
      shapes: [
        { id: 'a', type: 'rect', x: 100, y: 100, width: 100, height: 100, color: '#ef4444' },
        { id: 'b', type: 'circle', x: 200, y: 200, width: 100, height: 100, color: '#ef4444' },
        { id: 'c', type: 'rect', x: 300, y: 300, width: 100, height: 100, color: '#22c55e' }
      ],
      currentColor: '#000000'
    };
    const result = executeCommand({ action: 'delete', filters: { color: 'red', all: true } }, state, { width: 800, height: 600 });
    expect(result.shapes).toHaveLength(1);
    expect(result.shapes[0].id).toBe('c');
    expect(result.removed).toHaveLength(2);
    expect(result.currentColor).toBe('#000000');
  });

  it('returns empty removed array when no match', () => {
    const state = {
      shapes: [{ id: 'a', type: 'rect', x: 100, y: 100, width: 100, height: 100, color: '#ef4444' }],
      currentColor: '#000000'
    };
    const result = executeCommand({ action: 'delete', filters: { color: 'blue' } }, state, { width: 800, height: 600 });
    expect(result.shapes).toHaveLength(1);
    expect(result.removed).toHaveLength(0);
    expect(result.removed).toEqual([]);
    expect(result.currentColor).toBe('#000000');
  });

  it('removes shape by position and shape filters', () => {
    const state = {
      shapes: [
        { id: 'a', type: 'rect', x: 50, y: 50, width: 100, height: 100, color: '#ef4444' },
        { id: 'b', type: 'circle', x: 400, y: 300, width: 100, height: 100, color: '#3b82f6' }
      ],
      currentColor: '#000000'
    };
    const result = executeCommand({ action: 'delete', filters: { position: 'top-left', shape: 'rect' } }, state, { width: 800, height: 600 });
    expect(result.shapes).toHaveLength(1);
    expect(result.shapes[0].id).toBe('b');
    expect(result.removed).toHaveLength(1);
    expect(result.removed[0].id).toBe('a');
    expect(result.currentColor).toBe('#000000');
  });
});
