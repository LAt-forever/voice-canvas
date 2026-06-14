import { describe, it, expect } from 'vitest';
import { extractParameter, detectShape, detectColor, detectPosition, detectSize } from '../src/services/commandParser';
import { isSkip } from '../src/utils/confirmationMatcher';

describe('extractParameter', () => {
  it('extracts color', () => {
    expect(extractParameter('红色', 'color')).toBe('#ef4444');
    expect(extractParameter('blue', 'color')).toBe('#3b82f6');
    expect(extractParameter('随便', 'color')).toBeNull();
  });

  it('extracts size only when explicit', () => {
    expect(extractParameter('大', 'size')).toBe('large');
    expect(extractParameter('small', 'size')).toBe('small');
    expect(extractParameter('中号', 'size')).toBe('medium');
    expect(extractParameter('随便', 'size')).toBeNull();
  });

  it('extracts position only when explicit', () => {
    expect(extractParameter('左上角', 'position')).toBe('左上角');
    expect(extractParameter('top-left', 'position')).toBe('top-left');
    expect(extractParameter('随便', 'position')).toBeNull();
  });

  it('extracts shape', () => {
    expect(extractParameter('圆形', 'shape')).toBe('circle');
    expect(extractParameter('矩形', 'shape')).toBe('rect');
    expect(extractParameter('随便', 'shape')).toBeNull();
  });
});

describe('exported detectors', () => {
  it('detects shape homophones', () => {
    expect(detectShape('园')).toBe('circle');
    expect(detectShape('举行')).toBe('rect');
  });

  it('detects English colors', () => {
    expect(detectColor('red')).toBe('#ef4444');
    expect(detectColor('blue circle')).toBe('#3b82f6');
  });

  it('detects English positions', () => {
    expect(detectPosition('top-left')).toBe('top-left');
    expect(detectPosition('center')).toBe('center');
  });

  it('detects explicit sizes', () => {
    expect(detectSize('big')).toBe('large');
    expect(detectSize('小号')).toBe('small');
  });
});

describe('isSkip', () => {
  it('detects skip keywords', () => {
    expect(isSkip('跳过')).toBe(true);
    expect(isSkip('默认')).toBe(true);
    expect(isSkip('随便')).toBe(true);
    expect(isSkip('红色')).toBe(false);
  });
});
