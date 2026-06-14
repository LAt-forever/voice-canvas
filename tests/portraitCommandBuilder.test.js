import { describe, it, expect } from 'vitest';
import { buildPortraitPrompt, enrichDescription } from '../src/services/portraitCommandBuilder';

describe('portraitCommandBuilder', () => {
  it('builds a Stability prompt from Chinese description', () => {
    const prompt = buildPortraitPrompt('戴眼镜的女孩');
    expect(prompt).toContain('戴眼镜的女孩');
    expect(prompt).toContain('pencil sketch');
    expect(prompt).toContain('portrait');
    expect(prompt).toContain('white background');
  });

  it('enriches description with style modifiers', () => {
    const prompt = enrichDescription('a girl with glasses');
    expect(prompt).toContain('pencil sketch');
    expect(prompt).toContain('portrait');
  });

  it('sanitizes empty description', () => {
    const prompt = buildPortraitPrompt('');
    expect(prompt).toContain('portrait');
  });
});
