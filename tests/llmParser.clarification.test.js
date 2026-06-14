import { describe, it, expect, vi, beforeEach } from 'vitest';
import { parseWithClarification, parseWithLLM } from '../src/services/llmParser';

const API_KEY = 'test-key';
const ENDPOINT = 'https://api.example.com/v1/chat/completions';

describe('parseWithClarification', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function mockResponse(content) {
    globalThis.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [{ message: { content } }]
      })
    });
  }

  it('parses new clarification response', async () => {
    mockResponse(JSON.stringify({
      status: 'needs_clarification',
      commands: [{ action: 'draw', shape: 'circle', color: null, position: 'center', size: 'medium' }],
      clarifications: [{ commandIndex: 0, param: 'color', question: '想用什么颜色？', options: ['红色', '蓝色'] }]
    }));

    const result = await parseWithClarification('画一个圆', API_KEY, ENDPOINT, 'test-model');
    expect(result.status).toBe('needs_clarification');
    expect(result.clarifications).toHaveLength(1);
    expect(result.clarifications[0].param).toBe('color');
  });

  it('parses complete response', async () => {
    mockResponse(JSON.stringify({
      status: 'complete',
      commands: [{ action: 'draw', shape: 'circle', color: 'red', position: 'center', size: 'medium' }]
    }));

    const result = await parseWithClarification('画一个红色的圆', API_KEY, ENDPOINT, 'test-model');
    expect(result.status).toBe('complete');
    expect(result.commands).toHaveLength(1);
    expect(result.clarifications).toHaveLength(0);
  });

  it('wraps legacy flat array response as complete', async () => {
    mockResponse(JSON.stringify([
      { action: 'draw', shape: 'circle', color: 'red', position: 'center', size: 'medium' }
    ]));

    const result = await parseWithClarification('画一个红色的圆', API_KEY, ENDPOINT, 'test-model');
    expect(result.status).toBe('complete');
    expect(result.commands).toHaveLength(1);
  });

  it('throws on API error', async () => {
    globalThis.fetch.mockResolvedValueOnce({ ok: false, status: 500 });
    await expect(parseWithClarification('画一个圆', API_KEY, ENDPOINT, 'test-model')).rejects.toThrow('LLM API error: 500');
  });
});

describe('parseWithLLM', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns raw parsed object', async () => {
    const payload = { status: 'complete', commands: [{ action: 'clear' }] };
    globalThis.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ choices: [{ message: { content: JSON.stringify(payload) } }] })
    });

    const result = await parseWithLLM('清空', API_KEY, ENDPOINT, 'test-model');
    expect(result.status).toBe('complete');
  });
});
