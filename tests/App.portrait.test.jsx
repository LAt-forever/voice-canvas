import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import React from 'react';

vi.mock('../src/services/speechService', () => ({
  createSpeechRecognizer: vi.fn(() => ({
    start: vi.fn(),
    stop: vi.fn()
  })),
  isSpeechSupported: vi.fn(() => true)
}));

vi.mock('../src/components/CanvasBoard', () => ({
  default: React.forwardRef(function CanvasBoardMock(props, ref) {
    React.useImperativeHandle(ref, () => ({
      exportImage: () => 'data:image/png;base64,abc'
    }));
    return <canvas data-testid="canvas-board" />;
  })
}));

vi.mock('../src/services/portraitPipeline', () => ({
  portraitPipeline: vi.fn(() => Promise.resolve())
}));

describe('App portrait pipeline', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    import.meta.env.VITE_STABILITY_API_KEY = 'test-key';
    import.meta.env.VITE_STABILITY_API_ENDPOINT = 'https://api.test/generate';
  });

  it('queues a portrait command from debug button and starts pipeline', async () => {
    const { portraitPipeline } = await import('../src/services/portraitPipeline');
    const App = (await import('../src/App')).default;
    render(<App />);

    const button = screen.getByRole('button', { name: /Draw Portrait/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(portraitPipeline).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'drawPortrait', description: '戴眼镜的女孩' }),
        expect.objectContaining({ VITE_STABILITY_API_KEY: 'test-key' }),
        expect.objectContaining({ onStatus: expect.any(Function), onComplete: expect.any(Function), onError: expect.any(Function) })
      );
    });
  });
});
