import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import App from '../src/App';

vi.mock('../src/components/CanvasBoard', () => ({
  default: React.forwardRef(function CanvasBoardMock(props, ref) {
    React.useImperativeHandle(ref, () => ({
      exportImage: () => 'data:image/png;base64,abc'
    }));
    return <canvas data-testid="canvas-board" />;
  })
}));

const recognizers = [];

class MockSpeechRecognition {
  constructor() {
    recognizers.push(this);
  }
  start() {}
  stop() {}
}

describe('App clarification flow', () => {
  beforeEach(() => {
    recognizers.length = 0;
    globalThis.SpeechRecognition = MockSpeechRecognition;
    globalThis.webkitSpeechRecognition = MockSpeechRecognition;
    vi.stubEnv('VITE_LLM_API_KEY', 'test-key');
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      json: async () => ({
        choices: [{
          message: {
            content: JSON.stringify({
              status: 'needs_clarification',
              commands: [{ action: 'draw', shape: null, color: null, position: 'center', size: 'medium' }],
              clarifications: [{
                commandIndex: 0,
                param: 'shape',
                question: '想画什么形状？',
                options: ['圆形', '矩形', '三角形', '直线']
              }]
            })
          }
        }]
      })
    })));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function emitFinal(transcript) {
    const recognition = recognizers[0];
    const result = { 0: { transcript, isFinal: false }, isFinal: true, length: 1 };
    const event = { results: [result] };
    act(() => {
      recognition.onresult(event);
    });
  }

  it('shows clarification panel and auto-executes after voice answer', async () => {
    render(<App />);

    fireEvent.click(screen.getByLabelText('Toggle voice'));
    expect(recognizers.length).toBe(1);

    emitFinal('画一个');

    await waitFor(() => {
      expect(screen.getByText('需要补充信息')).toBeInTheDocument();
    });

    const questionEl = document.querySelector('.clarification-question');
    const interpretedEl = screen.getByTestId('interpreted-command');
    expect(questionEl).toHaveTextContent('想画什么形状？');
    expect(interpretedEl).toHaveTextContent('画一个');

    emitFinal('圆形');

    await waitFor(() => {
      expect(screen.queryByText('需要补充信息')).not.toBeInTheDocument();
    });

    expect(screen.getByText('Executed 1 steps')).toBeInTheDocument();
  });
});
