import { describe, it, expect } from 'vitest';
import { parseCommand, canParseLocally, needsLLM } from '../src/services/commandParser';

describe('parseCommand', () => {
  it('parses draw rect command', () => {
    const result = parseCommand('画一个红色矩形');
    expect(result).toEqual([{
      action: 'draw',
      shape: 'rect',
      color: '#ef4444',
      position: 'center',
      size: 'medium'
    }]);
  });

  it('parses draw circle with position and size', () => {
    const result = parseCommand('在左上角画个大蓝圆');
    expect(result).toEqual([{
      action: 'draw',
      shape: 'circle',
      color: '#3b82f6',
      position: '左上角',
      size: 'large'
    }]);
  });

  it('parses undo', () => {
    expect(parseCommand('撤销')).toEqual([{ action: 'undo' }]);
  });

  it('parses redo', () => {
    expect(parseCommand('重做')).toEqual([{ action: 'redo' }]);
  });

  it('parses clear', () => {
    expect(parseCommand('清空画布')).toEqual([{ action: 'clear' }]);
  });

  it('parses save', () => {
    expect(parseCommand('保存图片')).toEqual([{ action: 'save' }]);
  });

  it('returns null for unparseable input', () => {
    expect(parseCommand('随便说点什么')).toBeNull();
  });
});

describe('needsLLM', () => {
  it('returns true for multi-step commands', () => {
    expect(needsLLM('先画红圆，再画蓝方块')).toBe(true);
  });

  it('returns true for unparseable commands', () => {
    expect(needsLLM('随便说点什么')).toBe(true);
  });

  it('returns false for simple local commands', () => {
    expect(needsLLM('画一个红色矩形')).toBe(false);
  });
});
