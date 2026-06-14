import { describe, it, expect } from 'vitest';
import { parseCommand, canParseLocally, needsLLM } from '../src/services/commandParser';

describe('parseCommand - layer', () => {
  it('creates new layer', () => {
    expect(parseCommand('新建图层')).toEqual([{ action: 'createLayer' }]);
    expect(parseCommand('创建新图层')).toEqual([{ action: 'createLayer' }]);
  });

  it('switches to a target layer', () => {
    expect(parseCommand('切换到图层 2')).toEqual([{ action: 'switchLayer', target: '2' }]);
    expect(parseCommand('切到图层 3')).toEqual([{ action: 'switchLayer', target: '3' }]);
  });

  it('renames current layer', () => {
    expect(parseCommand('重命名当前图层为背景')).toEqual([{ action: 'renameLayer', name: '背景' }]);
  });

  it('hides current layer', () => {
    expect(parseCommand('隐藏当前图层')).toEqual([{ action: 'toggleLayerVisibility', visible: false }]);
  });

  it('shows current layer', () => {
    expect(parseCommand('显示当前图层')).toEqual([{ action: 'toggleLayerVisibility', visible: true }]);
  });

  it('deletes current layer', () => {
    expect(parseCommand('删除当前图层')).toEqual([{ action: 'deleteLayer' }]);
  });

  it('is parseable locally and does not need LLM', () => {
    expect(canParseLocally('新建图层')).toBe(true);
    expect(canParseLocally('切换到图层 2')).toBe(true);
    expect(canParseLocally('重命名当前图层为背景')).toBe(true);
    expect(canParseLocally('隐藏当前图层')).toBe(true);
    expect(canParseLocally('显示当前图层')).toBe(true);
    expect(canParseLocally('删除当前图层')).toBe(true);
    expect(needsLLM('新建图层')).toBe(false);
    expect(needsLLM('切换到图层 2')).toBe(false);
    expect(needsLLM('删除当前图层')).toBe(false);
  });
});
