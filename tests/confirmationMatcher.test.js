import { describe, it, expect } from 'vitest';
import { isConfirm, isCancel } from '../src/utils/confirmationMatcher';

describe('confirmationMatcher', () => {
  it('detects confirm keywords', () => {
    expect(isConfirm('确认')).toBe(true);
    expect(isConfirm('执行')).toBe(true);
    expect(isConfirm('好的开始')).toBe(true);
    expect(isConfirm('取消')).toBe(false);
  });

  it('detects cancel keywords', () => {
    expect(isCancel('取消')).toBe(true);
    expect(isCancel('放弃')).toBe(true);
    expect(isCancel('不要算了')).toBe(true);
    expect(isCancel('确认')).toBe(false);
  });

  it('handles edge cases', () => {
    expect(isConfirm('')).toBe(false);
    expect(isCancel('')).toBe(false);
    expect(isConfirm(null)).toBe(false);
    expect(isCancel(undefined)).toBe(false);
    expect(isConfirm('确认取消')).toBe(true);
    expect(isCancel('确认取消')).toBe(true);
    expect(isCancel('不错')).toBe(true);
    expect(isConfirm('好棒')).toBe(true);
  });
});
