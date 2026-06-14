import { describe, it, expect, vi, beforeEach } from 'vitest';
import { portraitPipeline, terminateWorker } from '../src/services/portraitPipeline';

describe('portraitPipeline', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    terminateWorker();
  });

  it('throws when API key is missing', async () => {
    await expect(
      portraitPipeline({ description: 'a girl' }, {})
    ).rejects.toThrow('请配置 VITE_STABILITY_API_KEY');
  });

  it('calls status callbacks in order', async () => {
    const statuses = [];
    const onStatus = (msg) => statuses.push(msg);
    const onComplete = vi.fn();

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      headers: new Map([['content-type', 'application/json']]),
      json: vi.fn().mockResolvedValue({ image: 'iVBORw0KGgo=' })
    });
    global.createImageBitmap = vi.fn().mockResolvedValue({ width: 16, height: 16 });

    const postMessage = vi.fn();
    const addEventListener = vi.fn((event, handler) => {
      if (event === 'message') {
        setTimeout(() => {
          handler({ data: { type: 'PROCESS_COMPLETE', result: { strokes: [], totalLength: 0 } } });
        }, 10);
      }
    });
    global.Worker = vi.fn(function() {
      return {
        postMessage,
        addEventListener,
        removeEventListener: vi.fn(),
        terminate: vi.fn()
      };
    });

    await portraitPipeline(
      { description: 'a girl' },
      { VITE_STABILITY_API_KEY: 'key', VITE_STABILITY_API_ENDPOINT: 'https://api.test', VITE_PORTRAIT_MODEL: 'sd3-medium' },
      { onStatus, onComplete }
    );

    expect(statuses).toEqual(['Generating portrait...', 'Processing sketch...', 'Drawing portrait...']);
    expect(onComplete).toHaveBeenCalled();
  });
});
