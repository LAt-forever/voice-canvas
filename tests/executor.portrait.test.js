import { describe, it, expect } from 'vitest';
import { executeCommand, createInitialState } from '../src/services/executor';

describe('executor portrait', () => {
  it('creates a portrait shape', () => {
    const state = createInitialState();
    const command = {
      action: 'drawPortrait',
      description: '戴眼镜的女孩',
      prompt: 'a girl with glasses, pencil sketch, portrait',
      position: 'center',
      size: 'medium',
      color: '#333333'
    };
    const result = executeCommand(command, state, { width: 800, height: 600 });
    expect(result.shapes).toHaveLength(1);
    const portrait = result.shapes[0];
    expect(portrait.type).toBe('portrait');
    expect(portrait.description).toBe('戴眼镜的女孩');
    expect(portrait.animationProgress).toBe(0);
    expect(portrait.isAnimating).toBe(false);
    expect(portrait.strokes).toEqual([]);
  });

  it('maps size to portrait dimensions', () => {
    const state = createInitialState();
    const small = executeCommand({ action: 'drawPortrait', description: 'x', size: 'small' }, state, { width: 800, height: 600 });
    expect(small.shapes[0].width).toBe(256);

    const large = executeCommand({ action: 'drawPortrait', description: 'x', size: 'large' }, state, { width: 800, height: 600 });
    expect(large.shapes[0].width).toBe(512);
  });
});
