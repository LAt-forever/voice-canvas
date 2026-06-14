import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generatePortraitImage } from '../src/services/stabilityClient';

describe('stabilityClient', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('decodes base64 JSON response and returns ImageBitmap', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      headers: new Map([['content-type', 'application/json']]),
      json: vi.fn().mockResolvedValue({ image: 'iVBORw0KGgo=' })
    });
    global.createImageBitmap = vi.fn().mockResolvedValue({ width: 256, height: 256 });

    const result = await generatePortraitImage('a girl', 'key', 'https://api.test/generate');
    expect(fetch).toHaveBeenCalledWith(
      'https://api.test/generate',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ Authorization: 'Bearer key' })
      })
    );
    expect(result).toEqual({ width: 256, height: 256 });
  });

  it('handles binary image response', async () => {
    const blob = new Blob(['fake-image']);
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      headers: new Map([['content-type', 'image/png']]),
      blob: vi.fn().mockResolvedValue(blob)
    });
    global.createImageBitmap = vi.fn().mockResolvedValue({ width: 512, height: 512 });

    const result = await generatePortraitImage('a girl', 'key', 'https://api.test/generate');
    expect(result).toEqual({ width: 512, height: 512 });
  });

  it('throws on API error', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 401, text: vi.fn().mockResolvedValue('Unauthorized') });
    await expect(generatePortraitImage('a girl', 'key', 'https://api.test/generate'))
      .rejects.toThrow('Stability API error: 401');
  });
});
