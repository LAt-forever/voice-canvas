import { describe, it, expect, vi } from 'vitest';

import {
  imageDataToGrayscale,
  detectEdges,
  traceContours,
  simplifyPolyline,
  generateHatching,
  sortStrokes,
  normalizeStrokes,
  processImageData
} from '../src/workers/portraitProcessor.js';

describe('portraitProcessor algorithms', () => {
  it('grayscales a 2x2 image', () => {
    const data = new Uint8ClampedArray([
      255, 0, 0, 255,   0, 255, 0, 255,
      0, 0, 255, 255,   255, 255, 255, 255
    ]);
    const gray = imageDataToGrayscale({ data, width: 2, height: 2 });
    expect(gray).toHaveLength(4);
    expect(gray[0]).toBeCloseTo(76.5, 0);
    expect(gray[3]).toBe(255);
  });

  it('traces a simple square contour', () => {
    const width = 10;
    const height = 10;
    const edge = new Uint8Array(width * height).fill(0);
    for (let x = 2; x <= 7; x++) {
      edge[2 * width + x] = 255;
      edge[7 * width + x] = 255;
    }
    for (let y = 2; y <= 7; y++) {
      edge[y * width + 2] = 255;
      edge[y * width + 7] = 255;
    }
    const contours = traceContours(edge, width, height);
    expect(contours.length).toBeGreaterThanOrEqual(1);
    expect(contours[0].length).toBeGreaterThanOrEqual(4);
  });

  it('simplifies a polyline', () => {
    const points = [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }, { x: 3, y: 0 }];
    const simplified = simplifyPolyline(points, 0.5);
    expect(simplified.length).toBeLessThanOrEqual(points.length);
    expect(simplified[0]).toEqual({ x: 0, y: 0 });
    expect(simplified[simplified.length - 1]).toEqual({ x: 3, y: 0 });
  });

  it('normalizes strokes to [0,1]', () => {
    const strokes = [{
      id: 's0',
      type: 'outline',
      points: [{ x: 10, y: 10 }, { x: 20, y: 20 }],
      length: 14.14
    }];
    const normalized = normalizeStrokes(strokes, 30, 30);
    expect(normalized[0].points[0].x).toBeCloseTo(10 / 30, 4);
    expect(normalized[0].points[1].y).toBeCloseTo(20 / 30, 4);
  });

  it('processes a tiny image into strokes', () => {
    const width = 16;
    const height = 16;
    const data = new Uint8ClampedArray(width * height * 4).fill(255);
    for (let y = 4; y < 12; y++) {
      for (let x = 4; x < 12; x++) {
        const i = (y * width + x) * 4;
        data[i] = 20;
        data[i + 1] = 20;
        data[i + 2] = 20;
      }
    }
    const result = processImageData({ data, width, height }, { targetSize: 16, maxStrokes: 100 });
    expect(result.strokes.length).toBeGreaterThan(0);
    expect(result.totalLength).toBeGreaterThan(0);
    expect(result.width).toBe(16);
    expect(result.height).toBe(16);
  });
});
