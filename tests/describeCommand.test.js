import { describe, it, expect } from 'vitest';
import { describeCommand } from '../src/utils/describeCommand';

describe('describeCommand', () => {
  it('describes a draw command', () => {
    const cmd = { action: 'draw', shape: 'circle', color: 'red', position: 'center', size: 'medium' };
    expect(describeCommand(cmd)).toContain('画');
    expect(describeCommand(cmd)).toContain('红色');
    expect(describeCommand(cmd)).toContain('圆形');
  });

  it('describes setColor', () => {
    const cmd = { action: 'setColor', color: 'blue' };
    expect(describeCommand(cmd)).toContain('当前颜色');
    expect(describeCommand(cmd)).toContain('蓝色');
  });

  it('describes solid background', () => {
    const cmd = { action: 'setBackground', background: { type: 'solid', color: '#ff0000' } };
    expect(describeCommand(cmd)).toContain('背景');
  });

  it('describes createLayer', () => {
    const cmd = { action: 'createLayer' };
    expect(describeCommand(cmd)).toContain('新建');
    expect(describeCommand(cmd)).toContain('图层');
  });

  it('describes grid toggle', () => {
    expect(describeCommand({ action: 'setGrid', visible: true })).toContain('显示网格');
    expect(describeCommand({ action: 'setGrid', visible: false })).toContain('隐藏网格');
  });

  it('falls back to JSON for unknown commands', () => {
    const cmd = { action: 'magic', foo: 'bar' };
    expect(describeCommand(cmd)).toContain('magic');
  });
});
