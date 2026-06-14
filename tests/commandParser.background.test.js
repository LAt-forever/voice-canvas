import { describe, it, expect } from 'vitest';
import { parseCommand } from '../src/services/commandParser';

describe('parseCommand - background', () => {
  it('sets solid blue background', () => {
    expect(parseCommand('把背景改成蓝色')).toEqual([{
      action: 'setBackground',
      background: { type: 'solid', color: '#3b82f6' }
    }]);
  });

  it('sets linear gradient background', () => {
    expect(parseCommand('换成渐变色背景')).toEqual([{
      action: 'setBackground',
      background: { type: 'gradient', subtype: 'linear', color: '#3b82f6', color2: '#ffffff', direction: 'to-right' }
    }]);
  });

  it('sets directional gradient with two colors', () => {
    expect(parseCommand('换成从左到右的红蓝渐变')).toEqual([{
      action: 'setBackground',
      background: { type: 'gradient', subtype: 'linear', color: '#ef4444', color2: '#3b82f6', direction: 'to-right' }
    }]);
  });

  it('sets radial gradient', () => {
    expect(parseCommand('换成中心扩散的蓝色渐变')).toEqual([{
      action: 'setBackground',
      background: { type: 'gradient', subtype: 'radial', color: '#3b82f6', color2: '#ffffff', direction: 'to-right' }
    }]);
  });

  it('sets stripes pattern', () => {
    expect(parseCommand('换成黑白条纹')).toEqual([{
      action: 'setBackground',
      background: { type: 'pattern', subtype: 'stripes', color: '#000000', color2: '#ffffff', direction: 'to-right', density: 'medium' }
    }]);
  });

  it('sets checkerboard pattern', () => {
    expect(parseCommand('换成棋盘格')).toEqual([{
      action: 'setBackground',
      background: { type: 'pattern', subtype: 'checkerboard', color: '#000000', color2: '#ffffff', direction: 'to-right', density: 'medium' }
    }]);
  });

  it('sets starry texture', () => {
    expect(parseCommand('换成星空背景')).toEqual([{
      action: 'setBackground',
      background: { type: 'texture', subtype: 'starry', color: '#000000', color2: '#ffffff', direction: 'to-right', density: 'medium' }
    }]);
  });

  it('resets background to default', () => {
    expect(parseCommand('恢复默认背景')).toEqual([{
      action: 'setBackground',
      background: { type: 'solid', color: '#ffffff' }
    }]);
  });
});
