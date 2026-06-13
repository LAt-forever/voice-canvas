import { describe, it, expect } from 'vitest';
import { parseCommand, canParseLocally, needsLLM } from '../src/services/commandParser';

describe('parseCommand - grid', () => {
  it('shows grid', () => {
    expect(parseCommand('显示网格')).toEqual([{ action: 'setGrid', visible: true }]);
    expect(parseCommand('打开网格')).toEqual([{ action: 'setGrid', visible: true }]);
  });

  it('hides grid', () => {
    expect(parseCommand('隐藏网格')).toEqual([{ action: 'setGrid', visible: false }]);
    expect(parseCommand('关闭网格')).toEqual([{ action: 'setGrid', visible: false }]);
  });

  it('enables snap', () => {
    expect(parseCommand('打开吸附')).toEqual([{ action: 'setSnap', snap: true }]);
    expect(parseCommand('开启吸附')).toEqual([{ action: 'setSnap', snap: true }]);
  });

  it('disables snap', () => {
    expect(parseCommand('关闭吸附')).toEqual([{ action: 'setSnap', snap: false }]);
  });

  it('increases grid size', () => {
    expect(parseCommand('网格调大')).toEqual([{ action: 'setGridSize', size: 'large' }]);
  });

  it('decreases grid size', () => {
    expect(parseCommand('网格调小')).toEqual([{ action: 'setGridSize', size: 'small' }]);
  });

  it('is parseable locally and does not need LLM', () => {
    expect(canParseLocally('显示网格')).toBe(true);
    expect(canParseLocally('关闭吸附')).toBe(true);
    expect(needsLLM('网格调大')).toBe(false);
    expect(needsLLM('网格调小')).toBe(false);
  });

  it('does not parse bare "网格"', () => {
    expect(parseCommand('网格')).toBeNull();
  });
});
