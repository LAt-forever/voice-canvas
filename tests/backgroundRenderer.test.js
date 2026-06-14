import { describe, it, expect } from 'vitest';
import { renderBackground, DEFAULT_BACKGROUND } from '../src/utils/backgroundRenderer';

const canvasSize = { width: 200, height: 150 };

function createCtx() {
  // Mock 2D canvas context for jsdom
  const pixels = new Map();
  let currentFillStyle = '#000000';
  let currentGlobalAlpha = 1;
  let savedState = [];

  function key(x, y) {
    return `${x},${y}`;
  }

  function parseColor(style) {
    if (typeof style === 'object' && style && style.addColorStop) {
      // Gradient — return first color stop for simplicity in tests
      return style._stops?.[0]?.color ? parseColor(style._stops[0].color) : [0, 0, 255, 255];
    }
    if (typeof style === 'string' && style.startsWith('#')) {
      const hex = style.slice(1);
      if (hex.length === 3) {
        const r = parseInt(hex[0] + hex[0], 16);
        const g = parseInt(hex[1] + hex[1], 16);
        const b = parseInt(hex[2] + hex[2], 16);
        return [r, g, b, 255];
      }
      if (hex.length === 6) {
        const r = parseInt(hex.slice(0, 2), 16);
        const g = parseInt(hex.slice(2, 4), 16);
        const b = parseInt(hex.slice(4, 6), 16);
        return [r, g, b, 255];
      }
    }
    return [0, 0, 0, 255];
  }

  const ctx = {
    fillStyle: '#000000',
    globalAlpha: 1,
    save() {
      savedState.push({ fillStyle: this.fillStyle, globalAlpha: this.globalAlpha });
    },
    restore() {
      const state = savedState.pop();
      if (state) {
        this.fillStyle = state.fillStyle;
        this.globalAlpha = state.globalAlpha;
      }
    },
    fillRect(x, y, w, h) {
      const color = parseColor(this.fillStyle);
      for (let py = y; py < y + h; py++) {
        for (let px = x; px < x + w; px++) {
          if (px >= 0 && px < canvasSize.width && py >= 0 && py < canvasSize.height) {
            const alpha = this.globalAlpha;
            if (alpha < 1) {
              const existing = pixels.get(key(px, py)) || [0, 0, 0, 0];
              pixels.set(key(px, py), [
                Math.round(existing[0] * (1 - alpha) + color[0] * alpha),
                Math.round(existing[1] * (1 - alpha) + color[1] * alpha),
                Math.round(existing[2] * (1 - alpha) + color[2] * alpha),
                Math.round(existing[3] * (1 - alpha) + color[3] * alpha),
              ]);
            } else {
              pixels.set(key(px, py), [...color]);
            }
          }
        }
      }
    },
    beginPath() {},
    moveTo() {},
    arc(x, y, r) {
      // Simple dot: fill the bounding box of the arc
      const color = parseColor(this.fillStyle);
      for (let py = Math.floor(y - r); py <= Math.ceil(y + r); py++) {
        for (let px = Math.floor(x - r); px <= Math.ceil(x + r); px++) {
          if (px >= 0 && px < canvasSize.width && py >= 0 && py < canvasSize.height) {
            pixels.set(key(px, py), [...color]);
          }
        }
      }
    },
    fill() {},
    createLinearGradient() {
      const gradient = {
        _stops: [],
        addColorStop(offset, color) {
          this._stops.push({ offset, color });
        }
      };
      return gradient;
    },
    createRadialGradient() {
      return this.createLinearGradient();
    },
    getImageData(x, y, w, h) {
      const data = new Uint8ClampedArray(w * h * 4);
      for (let py = 0; py < h; py++) {
        for (let px = 0; px < w; px++) {
          const pixel = pixels.get(key(x + px, y + py)) || [0, 0, 0, 0];
          const idx = (py * w + px) * 4;
          data[idx] = pixel[0];
          data[idx + 1] = pixel[1];
          data[idx + 2] = pixel[2];
          data[idx + 3] = pixel[3];
        }
      }
      return { data };
    },
    putImageData(imageData) {
      // For noise texture: mark all pixels as set with non-zero alpha
      for (let y = 0; y < canvasSize.height; y++) {
        for (let x = 0; x < canvasSize.width; x++) {
          pixels.set(key(x, y), [128, 128, 128, 255]);
        }
      }
    }
  };

  return ctx;
}

describe('renderBackground', () => {
  it('renders solid color', () => {
    const ctx = createCtx();
    renderBackground(ctx, canvasSize.width, canvasSize.height, { type: 'solid', color: '#ff0000' });
    const data = ctx.getImageData(0, 0, 1, 1).data;
    expect(data[0]).toBe(255);
    expect(data[1]).toBe(0);
    expect(data[2]).toBe(0);
  });

  it('renders linear gradient', () => {
    const ctx = createCtx();
    renderBackground(ctx, canvasSize.width, canvasSize.height, {
      type: 'gradient', subtype: 'linear', color: '#ff0000', color2: '#0000ff', direction: 'to-right'
    });
    const data = ctx.getImageData(0, 0, 1, 1).data;
    expect(data[3]).toBe(255); // alpha
  });

  it('renders radial gradient', () => {
    const ctx = createCtx();
    renderBackground(ctx, canvasSize.width, canvasSize.height, {
      type: 'gradient', subtype: 'radial', color: '#ff0000', color2: '#0000ff'
    });
    const data = ctx.getImageData(100, 75, 1, 1).data;
    expect(data[3]).toBe(255);
  });

  it('renders stripes pattern', () => {
    const ctx = createCtx();
    renderBackground(ctx, canvasSize.width, canvasSize.height, {
      type: 'pattern', subtype: 'stripes', color: '#000000', color2: '#ffffff'
    });
    const data = ctx.getImageData(0, 0, 1, 1).data;
    expect(data[3]).toBe(255);
  });

  it('renders checkerboard pattern', () => {
    const ctx = createCtx();
    renderBackground(ctx, canvasSize.width, canvasSize.height, {
      type: 'pattern', subtype: 'checkerboard', color: '#000000', color2: '#ffffff'
    });
    const data = ctx.getImageData(0, 0, 1, 1).data;
    expect(data[3]).toBe(255);
  });

  it('renders starry texture', () => {
    const ctx = createCtx();
    renderBackground(ctx, canvasSize.width, canvasSize.height, {
      type: 'texture', subtype: 'starry', color: '#000000', density: 'medium'
    });
    const data = ctx.getImageData(100, 75, 1, 1).data;
    expect(data[3]).toBe(255);
  });

  it('renders noise texture', () => {
    const ctx = createCtx();
    renderBackground(ctx, canvasSize.width, canvasSize.height, {
      type: 'texture', subtype: 'noise', color: '#808080', density: 'medium'
    });
    const data = ctx.getImageData(100, 75, 1, 1).data;
    expect(data[3]).toBe(255);
  });

  it('uses default background for null config', () => {
    const ctx = createCtx();
    renderBackground(ctx, canvasSize.width, canvasSize.height, null);
    const data = ctx.getImageData(0, 0, 1, 1).data;
    expect(data[0]).toBe(255);
    expect(data[1]).toBe(255);
    expect(data[2]).toBe(255);
  });
});
