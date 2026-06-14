import { describe, it, expect } from 'vitest';
import { parseCommand } from '../src/services/commandParser';

describe('portrait command parsing', () => {
  it('detects Chinese portrait commands', () => {
    const result = parseCommand('画一个戴眼镜的女孩');
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      action: 'drawPortrait',
      description: '戴眼镜的女孩',
      position: 'center',
      size: 'medium'
    });
  });

  it('detects position and size keywords', () => {
    const result = parseCommand('在左上角画一个小号的人物肖像');
    expect(result[0]).toMatchObject({
      action: 'drawPortrait',
      position: 'top-left',
      size: 'small'
    });
  });

  it('uses default description when no noun is extractable', () => {
    const result = parseCommand('画肖像');
    expect(result[0].action).toBe('drawPortrait');
    expect(result[0].description).toBe('portrait');
  });
});
