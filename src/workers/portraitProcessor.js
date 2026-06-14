export function imageDataToGrayscale(imageData) {
  const { data, width, height } = imageData;
  const gray = new Float32Array(width * height);
  for (let i = 0; i < width * height; i++) {
    const r = data[i * 4];
    const g = data[i * 4 + 1];
    const b = data[i * 4 + 2];
    gray[i] = 0.299 * r + 0.587 * g + 0.114 * b;
  }
  return gray;
}

export function gaussianBlur(gray, width, height) {
  const kernel = [
    1, 4, 7, 4, 1,
    4, 16, 26, 16, 4,
    7, 26, 41, 26, 7,
    4, 16, 26, 16, 4,
    1, 4, 7, 4, 1
  ];
  const denom = 273;
  const output = new Float32Array(width * height);
  for (let y = 2; y < height - 2; y++) {
    for (let x = 2; x < width - 2; x++) {
      let sum = 0;
      for (let ky = -2; ky <= 2; ky++) {
        for (let kx = -2; kx <= 2; kx++) {
          sum += gray[(y + ky) * width + (x + kx)] * kernel[(ky + 2) * 5 + (kx + 2)];
        }
      }
      output[y * width + x] = sum / denom;
    }
  }
  return output;
}

export function detectEdges(gray, width, height, lowThreshold = 30, highThreshold = 70) {
  // Simple Sobel + threshold for edge map
  const edges = new Uint8Array(width * height).fill(0);
  const sobelX = [-1, 0, 1, -2, 0, 2, -1, 0, 1];
  const sobelY = [-1, -2, -1, 0, 0, 0, 1, 2, 1];

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      let gx = 0;
      let gy = 0;
      for (let ky = -1; ky <= 1; ky++) {
        for (let kx = -1; kx <= 1; kx++) {
          const val = gray[(y + ky) * width + (x + kx)];
          const ki = (ky + 1) * 3 + (kx + 1);
          gx += val * sobelX[ki];
          gy += val * sobelY[ki];
        }
      }
      const mag = Math.sqrt(gx * gx + gy * gy);
      const idx = y * width + x;
      if (mag >= highThreshold) {
        edges[idx] = 255;
      } else if (mag >= lowThreshold) {
        edges[idx] = 128;
      }
    }
  }

  // Hysteresis: connect weak to strong
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = y * width + x;
      if (edges[idx] === 128) {
        let hasStrong = false;
        for (let ky = -1; ky <= 1 && !hasStrong; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            if (edges[(y + ky) * width + (x + kx)] === 255) {
              hasStrong = true;
              break;
            }
          }
        }
        edges[idx] = hasStrong ? 255 : 0;
      }
    }
  }

  return edges;
}

export function traceContours(edges, width, height, minLength = 5) {
  const visited = new Uint8Array(width * height).fill(0);
  const contours = [];
  const directions = [
    { dx: 1, dy: 0 }, { dx: 1, dy: 1 }, { dx: 0, dy: 1 }, { dx: -1, dy: 1 },
    { dx: -1, dy: 0 }, { dx: -1, dy: -1 }, { dx: 0, dy: -1 }, { dx: 1, dy: -1 }
  ];

  function findNext(x, y) {
    for (let i = 0; i < directions.length; i++) {
      const nx = x + directions[i].dx;
      const ny = y + directions[i].dy;
      if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
        const idx = ny * width + nx;
        if (edges[idx] === 255 && !visited[idx]) {
          return { x: nx, y: ny, dir: i };
        }
      }
    }
    return null;
  }

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      if (edges[idx] !== 255 || visited[idx]) continue;

      const contour = [];
      let cx = x;
      let cy = y;
      visited[idx] = 1;
      contour.push({ x: cx, y: cy });

      let next;
      while ((next = findNext(cx, cy))) {
        cx = next.x;
        cy = next.y;
        visited[cy * width + cx] = 1;
        contour.push({ x: cx, y: cy });
      }

      if (contour.length >= minLength) {
        contours.push(contour);
      }
    }
  }

  return contours;
}

export function simplifyPolyline(points, tolerance = 1.5) {
  if (points.length <= 2) return points;

  function perpendicularDistance(p, lineStart, lineEnd) {
    const dx = lineEnd.x - lineStart.x;
    const dy = lineEnd.y - lineStart.y;
    const mag = Math.sqrt(dx * dx + dy * dy);
    if (mag === 0) return Math.sqrt((p.x - lineStart.x) ** 2 + (p.y - lineStart.y) ** 2);
    return Math.abs(dy * p.x - dx * p.y + lineEnd.x * lineStart.y - lineEnd.y * lineStart.x) / mag;
  }

  function rdp(start, end, eps, out) {
    let maxDist = 0;
    let index = -1;
    for (let i = start + 1; i < end; i++) {
      const dist = perpendicularDistance(points[i], points[start], points[end]);
      if (dist > maxDist) {
        maxDist = dist;
        index = i;
      }
    }
    if (maxDist > eps && index !== -1) {
      rdp(start, index, eps, out);
      rdp(index, end, eps, out);
    } else {
      out.push(points[end]);
    }
  }

  const out = [points[0]];
  rdp(0, points.length - 1, tolerance, out);
  return out;
}

export function generateHatching(gray, edges, width, height, density = 8, angleDeg = 45) {
  const lines = [];
  const angle = (angleDeg * Math.PI) / 180;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const diagonal = Math.sqrt(width * width + height * height);
  const step = Math.max(2, Math.round(20 / density));

  for (let offset = -diagonal; offset < diagonal; offset += step) {
    const line = [];
    for (let t = -diagonal; t < diagonal; t += 2) {
      const x = Math.round(width / 2 + (offset * cos - t * sin));
      const y = Math.round(height / 2 + (offset * sin + t * cos));
      if (x < 0 || x >= width || y < 0 || y >= height) continue;
      const idx = y * width + x;
      if (edges[idx]) continue;
      if (gray[idx] < 120) {
        if (line.length === 0 || line[line.length - 1].x !== x || line[line.length - 1].y !== y) {
          line.push({ x, y });
        }
      } else if (line.length > 0) {
        if (line.length >= 4) lines.push(line);
        line.length = 0;
      }
    }
    if (line.length >= 4) lines.push(line);
  }

  return lines;
}

export function sortStrokes(strokes, width, height) {
  function getBoundingBox(stroke) {
    if (stroke.boundingBox) return stroke.boundingBox;
    const points = stroke.points;
    if (!points || points.length === 0) return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
    const xs = points.map(p => p.x);
    const ys = points.map(p => p.y);
    return {
      minX: Math.min(...xs),
      minY: Math.min(...ys),
      maxX: Math.max(...xs),
      maxY: Math.max(...ys)
    };
  }

  return strokes.slice().sort((a, b) => {
    const typeOrder = { outline: 0, hatching: 1, detail: 2 };
    const ta = typeOrder[a.type] ?? 1;
    const tb = typeOrder[b.type] ?? 1;
    if (ta !== tb) return ta - tb;

    const centerA = getBoundingBox(a);
    const centerB = getBoundingBox(b);
    const ay = (centerA.minY + centerA.maxY) / 2;
    const by = (centerB.minY + centerB.maxY) / 2;
    if (Math.abs(ay - by) > 5) return ay - by;

    const ax = (centerA.minX + centerA.maxX) / 2;
    const bx = (centerB.minX + centerB.maxX) / 2;
    return ax - bx;
  });
}

export function normalizeStrokes(strokes, width, height) {
  return strokes.map((stroke, index) => {
    const points = stroke.points.map(p => ({
      x: p.x / width,
      y: p.y / height
    }));

    let length = 0;
    for (let i = 1; i < points.length; i++) {
      const dx = points[i].x - points[i - 1].x;
      const dy = points[i].y - points[i - 1].y;
      length += Math.sqrt(dx * dx + dy * dy);
    }

    const minX = Math.min(...points.map(p => p.x));
    const minY = Math.min(...points.map(p => p.y));
    const maxX = Math.max(...points.map(p => p.x));
    const maxY = Math.max(...points.map(p => p.y));

    return {
      id: stroke.id || `s${index}`,
      type: stroke.type || 'outline',
      points,
      length,
      boundingBox: { minX, minY, maxX, maxY }
    };
  });
}

export function scaleImageData(imageData, targetSize) {
  const { data, width, height } = imageData;
  const size = targetSize;
  const output = new Uint8ClampedArray(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const srcX = Math.min(width - 1, Math.floor((x * width) / size));
      const srcY = Math.min(height - 1, Math.floor((y * height) / size));
      const srcIdx = (srcY * width + srcX) * 4;
      const dstIdx = (y * size + x) * 4;
      output[dstIdx] = data[srcIdx];
      output[dstIdx + 1] = data[srcIdx + 1];
      output[dstIdx + 2] = data[srcIdx + 2];
      output[dstIdx + 3] = data[srcIdx + 3];
    }
  }
  return { data: output, width: size, height: size };
}

export function processImageData(imageData, config = {}) {
  const start = performance.now();
  const {
    targetSize = 256,
    edgeThreshold = { low: 20, high: 60 },
    simplifyTolerance = 1.2,
    hatchingDensity = 6,
    maxStrokes = 2000
  } = config;

  const scaled = scaleImageData(imageData, targetSize);
  const gray = imageDataToGrayscale(scaled);
  const blurred = gaussianBlur(gray, scaled.width, scaled.height);
  const edges = detectEdges(blurred, scaled.width, scaled.height, edgeThreshold.low, edgeThreshold.high);
  const contours = traceContours(edges, scaled.width, scaled.height, 6);

  let strokes = [];
  for (let i = 0; i < contours.length; i++) {
    const simplified = simplifyPolyline(contours[i], simplifyTolerance);
    if (simplified.length >= 2) {
      strokes.push({
        id: `outline-${i}`,
        type: 'outline',
        points: simplified
      });
    }
  }

  const hatchingLines = generateHatching(blurred, edges, scaled.width, scaled.height, hatchingDensity, 45);
  for (let i = 0; i < hatchingLines.length; i++) {
    strokes.push({
      id: `hatch-45-${i}`,
      type: 'hatching',
      points: hatchingLines[i]
    });
  }

  const hatchingLines2 = generateHatching(blurred, edges, scaled.width, scaled.height, hatchingDensity, -45);
  for (let i = 0; i < hatchingLines2.length; i++) {
    strokes.push({
      id: `hatch-135-${i}`,
      type: 'hatching',
      points: hatchingLines2[i]
    });
  }

  strokes = sortStrokes(strokes, scaled.width, scaled.height);

  if (strokes.length > maxStrokes) {
    const outlines = strokes.filter(s => s.type === 'outline');
    const hatchings = strokes.filter(s => s.type === 'hatching');
    const allowedHatchings = Math.max(0, maxStrokes - outlines.length);
    strokes = [...outlines, ...hatchings.slice(0, allowedHatchings)];
  }

  const normalized = normalizeStrokes(strokes, scaled.width, scaled.height);
  const totalLength = normalized.reduce((sum, s) => sum + s.length, 0);

  return {
    strokes: normalized,
    width: scaled.width,
    height: scaled.height,
    totalLength,
    processingTimeMs: performance.now() - start
  };
}

async function processImageBitmap(imageBitmap, config) {
  const canvas = new OffscreenCanvas(imageBitmap.width, imageBitmap.height);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(imageBitmap, 0, 0);
  const imageData = ctx.getImageData(0, 0, imageBitmap.width, imageBitmap.height);
  return processImageData(imageData, config);
}

if (typeof self !== 'undefined' && typeof importScripts === 'function') {
  self.onmessage = async function (event) {
    const { type, imageBitmap, config } = event.data;
    if (type !== 'PROCESS_IMAGE') return;

    try {
      const result = await processImageBitmap(imageBitmap, config);
      self.postMessage({ type: 'PROCESS_COMPLETE', result });
    } catch (err) {
      self.postMessage({ type: 'PROCESS_ERROR', error: err.message });
    }
  };
}
