# Portrait Sketch Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a voice-triggered "pencil sketch portrait" feature: generate a portrait via Stability AI, extract sketch strokes in the browser, and animate a virtual pencil drawing them onto the canvas.

**Architecture:** A new `drawPortrait` action flows through the existing command parser/executor/plan-panel pipeline. Image generation happens in `stabilityClient`, heavy image-to-stroke processing runs in a Web Worker (`portraitProcessor`), and animation is driven by `portraitAnimator` rendering through `drawPortrait` and a `PencilCursor` overlay. The portrait is stored as a single `portrait` shape with normalized strokes and an `animationProgress` field.

**Tech Stack:** React 18, Vite, Vitest, native Canvas 2D, Web Workers (module), native `fetch`, Stability AI / Stable Diffusion API.

---

## Files Created / Modified

| File | Type | Responsibility |
|---|---|---|
| `src/services/portraitCommandBuilder.js` | Create | Detect portrait voice commands and build a Stability-friendly prompt |
| `src/services/stabilityClient.js` | Create | Call Stability AI endpoint and return an `ImageBitmap` |
| `src/workers/portraitProcessor.js` | Create | Web Worker: edge detection → contour tracing → hatching → normalized strokes |
| `src/services/portraitAnimator.js` | Create | Track animation progress and compute current pencil tip position |
| `src/shapes/drawPortrait.js` | Create | Canvas renderer for `portrait` shape, respects `animationProgress` |
| `src/components/PencilCursor.jsx` | Create | Absolute-positioned pencil icon following the animator |
| `src/services/commandParser.js` | Modify | Add portrait command detection and route to LLM |
| `src/utils/describeCommand.js` | Modify | Describe `drawPortrait` for the plan panel |
| `src/services/llmParser.js` | Modify | Add `drawPortrait` to the LLM system prompt |
| `src/services/executor.js` | Modify | Add `drawPortrait` action that returns a placeholder portrait shape |
| `src/components/CanvasBoard.jsx` | Modify | Register `portrait` drawer |
| `src/App.jsx` | Modify | Orchestrate async generate → process → animate pipeline and status messages |
| `.env.example` | Create | Document new Stability env vars |
| `tests/portraitCommandBuilder.test.js` | Create | Unit tests for command builder |
| `tests/stabilityClient.test.js` | Create | Unit tests with mocked fetch |
| `tests/portraitProcessor.test.js` | Create | Worker algorithm tests |
| `tests/portraitAnimator.test.js` | Create | Progress / tip position tests |
| `tests/drawPortrait.test.js` | Create | Canvas rendering tests |
| `tests/App.portrait.test.jsx` | Create | App-level portrait button/status test |
| `tests/portraitPipeline.test.js` | Create | Pipeline orchestration unit tests |

---

## Design Reference

Full spec: [docs/superpowers/specs/2026-06-14-portrait-sketch-design.md](../specs/2026-06-14-portrait-sketch-design.md)

---

### Task 1: Detect portrait commands in `commandParser.js`

**Files:**
- Modify: `src/services/commandParser.js`
- Test: `tests/commandParser.portrait.test.js`

Voice commands like `画一个人物肖像`, `画一个戴眼镜的女孩`, `给我画个头像` should be detected locally as a portrait command so the flow reaches `executor.js` and the async pipeline. We will not generate strokes locally; we just return a `drawPortrait` command object.

- [ ] **Step 1: Write the failing test**

```javascript
import { describe, it, expect } from 'vitest';
import { parseCommand } from '../src/services/commandParser';

describe('portrait command parsing', () => {
  it('detects Chinese portrait commands', () => {
    const result = parseCommand('画一个戴眼镜的女孩');
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      action: 'drawPortrait',
      description: '戴眼镜的女孩',
      position: 'center',
      size: 'medium'
    });
  });

  it('detects position and size keywords', () => {
    const result = parseCommand('在左上角画一个小号的人物肖像');
    expect(result[0]).toMatchObject({
      action: 'drawPortrait',
      position: 'top-left',
      size: 'small'
    });
  });

  it('uses default description when no noun is extractable', () => {
    const result = parseCommand('画肖像');
    expect(result[0].action).toBe('drawPortrait');
    expect(result[0].description).toBe('portrait');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/commandParser.portrait.test.js`

Expected: FAIL with `action: 'drawPortrait'` not matching `draw`.

- [ ] **Step 3: Implement portrait detection**

Add the following helpers before `parseCommand` in `src/services/commandParser.js`:

```javascript
const PORTRAIT_MARKERS = ['肖像', '头像', '人像', '人物'];
const PORTRAIT_TRIGGERS = ['画', '画一个', '画个', 'draw a', 'draw an'];

function isPortraitCommand(text) {
  const normalized = text.toLowerCase();
  return PORTRAIT_MARKERS.some(marker => normalized.includes(marker));
}

function extractPortraitDescription(text) {
  const patterns = [
    /画(?:一个|个|一)?(.+?)(?:的|人物|肖像|头像|人像|$)/,
    /画(?:一个|个|一)?(.+)/
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1].trim()) {
      return match[1].trim();
    }
  }
  return 'portrait';
}

function parsePortraitCommand(text) {
  return {
    action: 'drawPortrait',
    description: extractPortraitDescription(text),
    position: detectPosition(text),
    size: detectSize(text),
    color: detectColor(text) || '#333333'
  };
}
```

Then insert into `parseCommand` before the shape-detection block:

```javascript
  if (isPortraitCommand(normalized)) {
    return [parsePortraitCommand(normalized)];
  }
```

Also update `needsLLM` so portrait commands go through LLM when the marker is weak but the command is complex. For this task, keep `needsLLM` as-is; Task 3 will refine it.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/commandParser.portrait.test.js`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/services/commandParser.js tests/commandParser.portrait.test.js
git commit -m "feat: detect portrait voice commands"
```

---

### Task 2: Describe `drawPortrait` for the plan panel

**Files:**
- Modify: `src/utils/describeCommand.js`
- Test: `tests/describeCommand.test.js`

- [ ] **Step 1: Write the failing test**

Append to `tests/describeCommand.test.js` (or create if missing):

```javascript
import { describe, it, expect } from 'vitest';
import { describeCommand } from '../src/utils/describeCommand';

describe('describeCommand portrait', () => {
  it('describes a portrait command', () => {
    const desc = describeCommand({
      action: 'drawPortrait',
      description: '戴眼镜的女孩',
      position: 'center',
      size: 'medium'
    });
    expect(desc).toContain('戴眼镜的女孩');
    expect(desc).toContain('肖像');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/describeCommand.test.js`

Expected: FAIL because `drawPortrait` falls to default case.

- [ ] **Step 3: Add portrait case**

In `src/utils/describeCommand.js`, add this case to the `describeCommand` switch before `default`:

```javascript
    case 'drawPortrait': {
      const subject = command.description || '人物';
      const size = SIZE_NAMES[command.size] || '中号';
      const pos = POSITION_NAMES[command.position] || '中心';
      return `在${pos}用铅笔绘制${size}“${subject}”肖像`;
    }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/describeCommand.test.js`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/utils/describeCommand.js tests/describeCommand.test.js
git commit -m "feat: describe portrait commands in plan panel"
```

---

### Task 3: Update LLM system prompt to understand `drawPortrait`

**Files:**
- Modify: `src/services/llmParser.js`

- [ ] **Step 1: Modify `SYSTEM_PROMPT` in `src/services/llmParser.js`**

Update the action list and draw rules:

```javascript
const SYSTEM_PROMPT = `你是一个语音绘图助手的指令解析器。请把用户自然语言转换为 JSON。

输出格式：
{
  "status": "complete" | "needs_clarification",
  "commands": [命令数组],
  "clarifications": [缺失/模糊参数列表]  // 仅在 status = "needs_clarification" 时存在
}

命令数组中每个对象的 action 支持：draw、drawPortrait、setColor、undo、redo、clear、save、delete、setBackground、setGrid、setSnap、setGridSize、createLayer、switchLayer、renameLayer、toggleLayerVisibility、deleteLayer。

draw 命令必须包含 shape（rect/circle/line/triangle），可选 color（颜色名或 #hex）、position（center/top-left/...）、size（small/medium/large）。

drawPortrait 命令包含 action: 'drawPortrait'、description（用户描述，如"戴眼镜的女孩"）、position（默认 center）、size（默认 medium），不需要 shape。

当参数缺失或模糊时，status 设置为 "needs_clarification"，并在 clarifications 中为每个缺失参数提供：
- commandIndex: 对应命令在 commands 数组中的索引
- param: 缺失参数名，只能是 color / size / position / shape / description
- question: 向用户提问的简短中文问题
- options: 3-4 个中文选项数组

规则：
- draw 命令缺失 shape 或 color 时必须列入 clarifications；shape 可选 rect/circle/line/triangle。
- drawPortrait 命令缺失 description 时必须列入 clarifications。
- position 缺失时默认 center，不列入 clarifications。
- size 缺失时默认 medium，不列入 clarifications。
- 只输出 JSON，不要任何解释。

示例 1：
输入："先画一个红色的圆，再在旁边画一个蓝色的方块"
输出：{"status":"complete","commands":[{"action":"draw","shape":"circle","color":"red","position":"center","size":"medium"},{"action":"draw","shape":"rect","color":"blue","position":"right","size":"medium"}]}

示例 2：
输入："画一个戴眼镜的女孩"
输出：{"status":"complete","commands":[{"action":"drawPortrait","description":"戴眼镜的女孩","position":"center","size":"medium"}]}

示例 3：
输入："画一个圆"
输出：{"status":"needs_clarification","commands":[{"action":"draw","shape":"circle","color":null,"position":"center","size":"medium"}],"clarifications":[{"commandIndex":0,"param":"color","question":"想用什么颜色？","options":["红色","蓝色","绿色","黄色"]}]}`;
```

- [ ] **Step 2: Run existing LLM parser tests**

Run: `npx vitest run tests/llmParser.clarification.test.js`

Expected: PASS (prompt change should not break existing behavior).

- [ ] **Step 3: Commit**

```bash
git add src/services/llmParser.js
git commit -m "feat: teach LLM parser about drawPortrait commands"
```

---

### Task 4: Build `portraitCommandBuilder.js`

**Files:**
- Create: `src/services/portraitCommandBuilder.js`
- Test: `tests/portraitCommandBuilder.test.js`

This module converts a raw `drawPortrait` command into an enhanced Stability prompt. It also adds default sketch/portrait style modifiers.

- [ ] **Step 1: Write the failing test**

```javascript
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/portraitCommandBuilder.test.js`

Expected: FAIL with module not found.

- [ ] **Step 3: Implement the module**

Create `src/services/portraitCommandBuilder.js`:

```javascript
const DEFAULT_STYLE_MODIFIERS = [
  'pencil sketch',
  'portrait',
  'monochrome',
  'clean lines',
  'white background',
  'high contrast'
];

export function enrichDescription(description) {
  const subject = (description || 'portrait').trim();
  if (!subject) return 'a pencil sketch portrait';

  const lower = subject.toLowerCase();
  const modifiers = [...DEFAULT_STYLE_MODIFIERS];

  if (lower.includes('pencil') || lower.includes('素描')) {
    modifiers.splice(modifiers.indexOf('pencil sketch'), 1);
  }
  if (lower.includes('portrait') || lower.includes('肖像')) {
    modifiers.splice(modifiers.indexOf('portrait'), 1);
  }

  return `${subject}, ${modifiers.join(', ')}`;
}

export function buildPortraitPrompt(command) {
  const description = command?.description || 'portrait';
  return enrichDescription(description);
}

export function buildPortraitCommand(rawCommand) {
  return {
    action: 'drawPortrait',
    description: rawCommand.description || 'portrait',
    prompt: buildPortraitPrompt(rawCommand),
    position: rawCommand.position || 'center',
    size: rawCommand.size || 'medium',
    color: rawCommand.color || '#333333'
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/portraitCommandBuilder.test.js`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/services/portraitCommandBuilder.js tests/portraitCommandBuilder.test.js
git commit -m "feat: add portrait command builder for prompt enrichment"
```

---

### Task 5: Implement `stabilityClient.js`

**Files:**
- Create: `src/services/stabilityClient.js`
- Test: `tests/stabilityClient.test.js`

- [ ] **Step 1: Write the failing test**

```javascript
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/stabilityClient.test.js`

Expected: FAIL with module not found.

- [ ] **Step 3: Implement the client**

Create `src/services/stabilityClient.js`:

```javascript
export async function blobToImageBitmap(blob) {
  const bitmap = await createImageBitmap(blob);
  return bitmap;
}

export async function generatePortraitImage(prompt, apiKey, apiEndpoint, model = 'sd3-medium') {
  if (!apiKey) {
    throw new Error('Stability API key is not configured');
  }

  const formData = new FormData();
  formData.append('prompt', prompt);
  formData.append('model', model);
  formData.append('output_format', 'png');
  formData.append('aspect_ratio', '1:1');

  const response = await fetch(apiEndpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: 'application/json'
    },
    body: formData
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`Stability API error: ${response.status} ${text.slice(0, 200)}`);
  }

  const contentType = response.headers.get('content-type') || '';

  if (contentType.includes('application/json')) {
    const data = await response.json();
    const base64 = data.image || data.images?.[0];
    if (!base64) {
      throw new Error('Stability API returned no image');
    }
    const byteString = atob(base64);
    const bytes = new Uint8Array(byteString.length);
    for (let i = 0; i < byteString.length; i++) {
      bytes[i] = byteString.charCodeAt(i);
    }
    const blob = new Blob([bytes], { type: 'image/png' });
    return blobToImageBitmap(blob);
  }

  const blob = await response.blob();
  return blobToImageBitmap(blob);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/stabilityClient.test.js`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/services/stabilityClient.js tests/stabilityClient.test.js
git commit -m "feat: add Stability AI client for portrait generation"
```

---

### Task 6: Implement `portraitProcessor` Web Worker

**Files:**
- Create: `src/workers/portraitProcessor.js`
- Test: `tests/portraitProcessor.test.js`

The worker receives an `ImageBitmap`, processes it, and returns normalized strokes. For testability in Node/jsdom, expose the pure functions on a testable module path and guard `self.onmessage` with `typeof self !== 'undefined'`.

- [ ] **Step 1: Write the failing test**

```javascript
import { describe, it, expect, vi } from 'vitest';

// Worker files are not directly importable in jsdom; test the algorithm module separately.
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
    // Draw a hollow square at [2,2] to [7,7]
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
    // Draw a dark square
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/portraitProcessor.test.js`

Expected: FAIL with module not found.

- [ ] **Step 3: Implement the worker with exportable helpers**

Create `src/workers/portraitProcessor.js`:

```javascript
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
  return strokes.slice().sort((a, b) => {
    const typeOrder = { outline: 0, hatching: 1, detail: 2 };
    const ta = typeOrder[a.type] ?? 1;
    const tb = typeOrder[b.type] ?? 1;
    if (ta !== tb) return ta - tb;

    const centerA = a.boundingBox;
    const centerB = b.boundingBox;
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/portraitProcessor.test.js`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/workers/portraitProcessor.js tests/portraitProcessor.test.js
git commit -m "feat: add portrait image processing worker"
```

---

### Task 7: Implement `portraitAnimator.js`

**Files:**
- Create: `src/services/portraitAnimator.js`
- Test: `tests/portraitAnimator.test.js`

- [ ] **Step 1: Write the failing test**

```javascript
import { describe, it, expect } from 'vitest';
import { createAnimator, getTipPosition } from '../src/services/portraitAnimator';

describe('portraitAnimator', () => {
  const strokes = [
    {
      id: 's0',
      type: 'outline',
      points: [{ x: 0, y: 0 }, { x: 1, y: 0 }],
      length: 1
    },
    {
      id: 's1',
      type: 'outline',
      points: [{ x: 1, y: 0 }, { x: 1, y: 1 }],
      length: 1
    }
  ];

  it('initial progress is 0', () => {
    const anim = createAnimator(strokes, { x: 100, y: 100, width: 100, height: 100 }, 200);
    expect(anim.getProgress()).toBe(0);
  });

  it('advances progress by pixel distance', () => {
    const anim = createAnimator(strokes, { x: 100, y: 100, width: 100, height: 100 }, 200);
    anim.advance(500); // 0.5 seconds at 200 px/s
    // total normalized length = 2; mapped length = 2 * 100 (width) = 200px
    expect(anim.getProgress()).toBeCloseTo(0.5, 2);
  });

  it('computes tip position at partial stroke', () => {
    const anim = createAnimator(strokes, { x: 100, y: 100, width: 100, height: 100 }, 200);
    anim.advance(250); // quarter of total mapped length
    const tip = getTipPosition(anim);
    expect(tip.x).toBeCloseTo(150, 0);
    expect(tip.y).toBeCloseTo(100, 0);
  });

  it('completes at end', () => {
    const anim = createAnimator(strokes, { x: 100, y: 100, width: 100, height: 100 }, 200);
    anim.advance(2000);
    expect(anim.isComplete()).toBe(true);
    expect(anim.getProgress()).toBe(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/portraitAnimator.test.js`

Expected: FAIL with module not found.

- [ ] **Step 3: Implement the animator**

Create `src/services/portraitAnimator.js`:

```javascript
export function mapPoint(point, shape) {
  return {
    x: shape.x + (point.x - 0.5) * shape.width,
    y: shape.y + (point.y - 0.5) * shape.height
  };
}

export function createAnimator(strokes, shape, speedPixelsPerSecond = 200) {
  let elapsedPixels = 0;

  const mappedStrokes = strokes.map(stroke => ({
    ...stroke,
    mappedPoints: stroke.points.map(p => mapPoint(p, shape)),
    mappedLength: stroke.length * Math.max(shape.width, shape.height)
  }));

  const totalMappedLength = mappedStrokes.reduce((sum, s) => sum + s.mappedLength, 0);

  return {
    advance(deltaMs) {
      const deltaPixels = (speedPixelsPerSecond * deltaMs) / 1000;
      elapsedPixels = Math.min(totalMappedLength, elapsedPixels + deltaPixels);
    },
    getProgress() {
      return totalMappedLength === 0 ? 1 : elapsedPixels / totalMappedLength;
    },
    isComplete() {
      return elapsedPixels >= totalMappedLength;
    },
    getStrokeStates() {
      const states = [];
      let accumulated = 0;
      for (const stroke of mappedStrokes) {
        const start = accumulated;
        const end = accumulated + stroke.mappedLength;
        let progress = 0;
        if (elapsedPixels >= end) {
          progress = 1;
        } else if (elapsedPixels > start) {
          progress = (elapsedPixels - start) / stroke.mappedLength;
        }
        states.push({ stroke, progress });
        accumulated = end;
      }
      return states;
    },
    getTotalLength() {
      return totalMappedLength;
    }
  };
}

export function getTipPosition(animator) {
  const states = animator.getStrokeStates();
  for (const { stroke, progress } of states) {
    if (progress <= 0 || progress >= 1) continue;
    const points = stroke.mappedPoints;
    if (points.length < 2) return points[0];

    const targetLength = progress * stroke.mappedLength;
    let currentLength = 0;
    for (let i = 1; i < points.length; i++) {
      const dx = points[i].x - points[i - 1].x;
      const dy = points[i].y - points[i - 1].y;
      const segLen = Math.sqrt(dx * dx + dy * dy);
      if (currentLength + segLen >= targetLength) {
        const t = segLen === 0 ? 0 : (targetLength - currentLength) / segLen;
        return {
          x: points[i - 1].x + dx * t,
          y: points[i - 1].y + dy * t
        };
      }
      currentLength += segLen;
    }
    return points[points.length - 1];
  }

  // If fully complete, return last point
  const lastStroke = states[states.length - 1]?.stroke;
  if (lastStroke?.mappedPoints?.length) {
    const last = lastStroke.mappedPoints[lastStroke.mappedPoints.length - 1];
    return last;
  }

  return null;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/portraitAnimator.test.js`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/services/portraitAnimator.js tests/portraitAnimator.test.js
git commit -m "feat: add portrait animation progress service"
```

---

### Task 8: Implement `drawPortrait.js`

**Files:**
- Create: `src/shapes/drawPortrait.js`
- Test: `tests/drawPortrait.test.js`

- [ ] **Step 1: Write the failing test**

```javascript
import { describe, it, expect, vi } from 'vitest';
import { drawPortrait } from '../src/shapes/drawPortrait';

describe('drawPortrait', () => {
  it('draws visible portion of strokes based on progress', () => {
    const ctx = {
      save: vi.fn(),
      restore: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      stroke: vi.fn(),
      setLineDash: vi.fn(),
      closePath: vi.fn()
    };

    const shape = {
      x: 100,
      y: 100,
      width: 100,
      height: 100,
      color: '#333333',
      animationProgress: 0.5,
      strokes: [
        {
          id: 's0',
          type: 'outline',
          points: [{ x: 0, y: 0 }, { x: 1, y: 0 }],
          length: 1
        },
        {
          id: 's1',
          type: 'outline',
          points: [{ x: 1, y: 0 }, { x: 1, y: 1 }],
          length: 1
        }
      ]
    };

    drawPortrait(ctx, shape);
    expect(ctx.save).toHaveBeenCalled();
    expect(ctx.stroke).toHaveBeenCalled();
    expect(ctx.restore).toHaveBeenCalled();
  });

  it('draws full strokes when progress is 1', () => {
    const ctx = {
      save: vi.fn(),
      restore: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      stroke: vi.fn(),
      setLineDash: vi.fn(),
      closePath: vi.fn()
    };

    const shape = {
      x: 100,
      y: 100,
      width: 100,
      height: 100,
      color: '#333333',
      animationProgress: 1,
      strokes: [
        {
          id: 's0',
          type: 'outline',
          points: [{ x: 0, y: 0 }, { x: 1, y: 0 }],
          length: 1
        }
      ]
    };

    drawPortrait(ctx, shape);
    expect(ctx.setLineDash).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/drawPortrait.test.js`

Expected: FAIL with module not found.

- [ ] **Step 3: Implement the renderer**

Create `src/shapes/drawPortrait.js`:

```javascript
export function mapPoint(point, shape) {
  return {
    x: shape.x + (point.x - 0.5) * shape.width,
    y: shape.y + (point.y - 0.5) * shape.height
  };
}

function renderStroke(ctx, stroke, shape, progress) {
  const points = stroke.points.map(p => mapPoint(p, shape));
  if (points.length < 2) return;

  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);

  const totalLength = stroke.length * Math.max(shape.width, shape.height);
  const targetLength = progress * totalLength;
  let currentLength = 0;

  for (let i = 1; i < points.length; i++) {
    const dx = points[i].x - points[i - 1].x;
    const dy = points[i].y - points[i - 1].y;
    const segLen = Math.sqrt(dx * dx + dy * dy);

    if (currentLength + segLen <= targetLength + 0.001) {
      ctx.lineTo(points[i].x, points[i].y);
      currentLength += segLen;
    } else {
      const t = segLen === 0 ? 0 : (targetLength - currentLength) / segLen;
      ctx.lineTo(points[i - 1].x + dx * t, points[i - 1].y + dy * t);
      break;
    }
  }

  ctx.stroke();
}

export function drawPortrait(ctx, shape) {
  ctx.save();
  ctx.strokeStyle = shape.color || '#333333';
  ctx.lineWidth = shape.strokeWidth || 1.5;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const progress = shape.animationProgress ?? 1;
  const totalLength = shape.strokes?.reduce((sum, s) => sum + s.length * Math.max(shape.width, shape.height), 0) || 1;
  const targetPixels = progress * totalLength;
  let accumulated = 0;

  for (const stroke of shape.strokes || []) {
    const strokeLength = stroke.length * Math.max(shape.width, shape.height);
    if (accumulated >= targetPixels) break;

    const strokeProgress = Math.min(1, (targetPixels - accumulated) / strokeLength);
    renderStroke(ctx, stroke, shape, strokeProgress);
    accumulated += strokeLength;
  }

  ctx.restore();
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/drawPortrait.test.js`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/shapes/drawPortrait.js tests/drawPortrait.test.js
git commit -m "feat: add portrait shape canvas renderer"
```

---

### Task 9: Implement `PencilCursor.jsx`

**Files:**
- Create: `src/components/PencilCursor.jsx`
- Test: `tests/PencilCursor.test.jsx`

- [ ] **Step 1: Write the failing test**

```javascript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import PencilCursor from '../src/components/PencilCursor';

describe('PencilCursor', () => {
  it('renders at given position', () => {
    render(<PencilCursor x={120} y={80} visible />);
    const el = screen.getByTestId('pencil-cursor');
    expect(el).toHaveStyle({ left: '120px', top: '80px' });
  });

  it('is hidden when not visible', () => {
    render(<PencilCursor x={0} y={0} visible={false} />);
    const el = screen.getByTestId('pencil-cursor');
    expect(el).toHaveClass('hidden');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/PencilCursor.test.jsx`

Expected: FAIL with module not found.

- [ ] **Step 3: Implement the component**

Create `src/components/PencilCursor.jsx`:

```javascript
export default function PencilCursor({ x = 0, y = 0, visible = true }) {
  return (
    <div
      data-testid="pencil-cursor"
      className={`pencil-cursor ${visible ? '' : 'hidden'}`}
      style={{
        position: 'absolute',
        left: `${x}px`,
        top: `${y}px`,
        pointerEvents: 'none',
        transform: 'translate(-10%, -90%) rotate(-15deg)',
        transition: visible ? 'left 50ms linear, top 50ms linear' : 'none',
        zIndex: 100
      }}
      aria-hidden={!visible}
    >
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
        <path d="m15 5 4 4" />
      </svg>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/PencilCursor.test.jsx`

Expected: PASS.

- [ ] **Step 5: Add minimal styles**

Append to `src/styles/index.css`:

```css
.pencil-cursor {
  color: #334155;
  filter: drop-shadow(1px 1px 2px rgba(0, 0, 0, 0.2));
}

.pencil-cursor.hidden {
  opacity: 0;
  visibility: hidden;
}
```

- [ ] **Step 6: Commit**

```bash
git add src/components/PencilCursor.jsx tests/PencilCursor.test.jsx src/styles/index.css
git commit -m "feat: add pencil cursor overlay component"
```

---

### Task 10: Update `executor.js` for `drawPortrait`

**Files:**
- Modify: `src/services/executor.js`
- Test: `tests/executor.portrait.test.js`

`executor.js` does not run the async pipeline; it just creates the initial placeholder shape so the rest of the app can show it. The actual strokes and animation are filled in by `App.jsx` after processing.

- [ ] **Step 1: Write the failing test**

```javascript
import { describe, it, expect } from 'vitest';
import { executeCommand, createInitialState } from '../src/services/executor';

describe('executor portrait', () => {
  it('creates a portrait shape', () => {
    const state = createInitialState();
    const command = {
      action: 'drawPortrait',
      description: '戴眼镜的女孩',
      prompt: 'a girl with glasses, pencil sketch, portrait',
      position: 'center',
      size: 'medium',
      color: '#333333'
    };
    const result = executeCommand(command, state, { width: 800, height: 600 });
    expect(result.shapes).toHaveLength(1);
    const portrait = result.shapes[0];
    expect(portrait.type).toBe('portrait');
    expect(portrait.description).toBe('戴眼镜的女孩');
    expect(portrait.animationProgress).toBe(0);
    expect(portrait.isAnimating).toBe(false);
    expect(portrait.strokes).toEqual([]);
  });

  it('maps size to portrait dimensions', () => {
    const state = createInitialState();
    const small = executeCommand({ action: 'drawPortrait', description: 'x', size: 'small' }, state, { width: 800, height: 600 });
    expect(small.shapes[0].width).toBe(256);

    const large = executeCommand({ action: 'drawPortrait', description: 'x', size: 'large' }, state, { width: 800, height: 600 });
    expect(large.shapes[0].width).toBe(512);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/executor.portrait.test.js`

Expected: FAIL because `drawPortrait` is not handled.

- [ ] **Step 3: Implement `drawPortrait` branch**

Add a constant near the top of `src/services/executor.js`:

```javascript
export const PORTRAIT_SIZE_PRESETS = {
  small: { width: 256, height: 256 },
  medium: { width: 384, height: 384 },
  large: { width: 512, height: 512 }
};
```

Add a case in `executeCommand` after the `draw` case:

```javascript
    case 'drawPortrait': {
      let position = resolvePosition(command.position, canvasSize.width, canvasSize.height);
      if (grid?.snap) {
        position = snapPosition(position.x, position.y, grid.spacing);
      }
      const size = PORTRAIT_SIZE_PRESETS[command.size] || PORTRAIT_SIZE_PRESETS.medium;
      const newShape = {
        id: generateId(),
        type: 'portrait',
        x: position.x,
        y: position.y,
        width: size.width,
        height: size.height,
        color: resolveColor(command.color || currentColor),
        layerId: state.currentLayerId,
        description: command.description || 'portrait',
        prompt: command.prompt,
        strokes: [],
        animationProgress: 0,
        isAnimating: false,
        sourcePrompt: command.prompt
      };
      return { shapes: [...shapes, newShape], currentColor: newShape.color, grid, background, layers, currentLayerId };
    }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/executor.portrait.test.js`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/services/executor.js tests/executor.portrait.test.js
git commit -m "feat: add drawPortrait action to executor"
```

---

### Task 11: Register `portrait` drawer in `CanvasBoard.jsx`

**Files:**
- Modify: `src/components/CanvasBoard.jsx`

- [ ] **Step 1: Add import and register drawer**

```javascript
import { drawPortrait } from '../shapes/drawPortrait';

const DRAWERS = {
  rect: drawRect,
  circle: drawCircle,
  line: drawLine,
  triangle: drawTriangle,
  portrait: drawPortrait
};
```

- [ ] **Step 2: Run existing CanvasBoard tests**

Run: `npx vitest run tests/ --run` (or just the relevant component tests)

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/components/CanvasBoard.jsx
git commit -m "feat: register portrait drawer in CanvasBoard"
```

---

### Task 12: Orchestrate the async pipeline in `App.jsx`

**Files:**
- Modify: `src/App.jsx`
- Test: `tests/App.portrait.test.jsx`

This is the most complex integration. We will:
1. Add env vars for Stability API.
2. Add a `portraitPipeline` async function.
3. Hook it into `runCommand` / plan execution when a `drawPortrait` command appears.
4. Show status messages and pencil cursor.

- [ ] **Step 1: Write the integration test**

```javascript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';

vi.mock('../src/services/speechService', () => ({
  createSpeechRecognizer: vi.fn(() => ({
    start: vi.fn(),
    stop: vi.fn()
  })),
  isSpeechSupported: vi.fn(() => true)
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
```

For practical unit testing, we will also export `portraitPipeline` as a pure function from `src/services/portraitPipeline.js` and test that in `tests/portraitPipeline.test.js`.

- [ ] **Step 2: Create `src/services/portraitPipeline.js`**

```javascript
import { buildPortraitCommand } from './portraitCommandBuilder';
import { generatePortraitImage } from './stabilityClient';

let worker = null;

export function getWorker() {
  if (!worker) {
    worker = new Worker(new URL('../workers/portraitProcessor.js', import.meta.url), { type: 'module' });
  }
  return worker;
}

export function terminateWorker() {
  if (worker) {
    worker.terminate();
    worker = null;
  }
}

export function processImageInWorker(imageBitmap, config = {}) {
  return new Promise((resolve, reject) => {
    const w = getWorker();

    function handler(event) {
      w.removeEventListener('message', handler);
      if (event.data.type === 'PROCESS_COMPLETE') {
        resolve(event.data.result);
      } else {
        reject(new Error(event.data.error || 'Worker processing failed'));
      }
    }

    w.addEventListener('message', handler);
    w.postMessage({ type: 'PROCESS_IMAGE', imageBitmap, config });
  });
}

export async function portraitPipeline(rawCommand, env, callbacks = {}) {
  const { onStatus, onShapeUpdate, onComplete, onError } = callbacks;
  const command = buildPortraitCommand(rawCommand);
  const apiKey = env.VITE_STABILITY_API_KEY;
  const endpoint = env.VITE_STABILITY_API_ENDPOINT;
  const model = env.VITE_PORTRAIT_MODEL;

  if (!apiKey) {
    throw new Error('请配置 VITE_STABILITY_API_KEY');
  }

  onStatus?.('Generating portrait...');
  const imageBitmap = await generatePortraitImage(command.prompt, apiKey, endpoint, model);

  onStatus?.('Processing sketch...');
  const result = await processImageInWorker(imageBitmap, {
    targetSize: 256,
    edgeThreshold: { low: 20, high: 60 },
    simplifyTolerance: 1.2,
    hatchingDensity: 6,
    maxStrokes: 2000
  });

  onStatus?.('Drawing portrait...');
  onComplete?.({ ...command, strokes: result.strokes, totalLength: result.totalLength });
}
```

- [ ] **Step 3: Add integration test for pipeline**

```javascript
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

    // Mock worker by intercepting Worker construction
    const postMessage = vi.fn();
    const addEventListener = vi.fn((event, handler) => {
      if (event === 'message') {
        setTimeout(() => {
          handler({ data: { type: 'PROCESS_COMPLETE', result: { strokes: [], totalLength: 0 } } });
        }, 10);
      }
    });
    global.Worker = vi.fn().mockImplementation(() => ({
      postMessage,
      addEventListener,
      removeEventListener: vi.fn(),
      terminate: vi.fn()
    }));

    await portraitPipeline(
      { description: 'a girl' },
      { VITE_STABILITY_API_KEY: 'key', VITE_STABILITY_API_ENDPOINT: 'https://api.test', VITE_PORTRAIT_MODEL: 'sd3-medium' },
      { onStatus, onComplete }
    );

    expect(statuses).toEqual(['Generating portrait...', 'Processing sketch...', 'Drawing portrait...']);
    expect(onComplete).toHaveBeenCalled();
  });
});
```

- [ ] **Step 4: Run test to verify it fails**

Run: `npx vitest run tests/portraitPipeline.test.js`

Expected: FAIL with module not found.

- [ ] **Step 5: Wire pipeline into `App.jsx`**

Add imports at the top:

```javascript
import { portraitPipeline } from './services/portraitPipeline';
```

Add state:

```javascript
  const [pencilTip, setPencilTip] = useState({ x: 0, y: 0, visible: false });
  const [isPortraitProcessing, setIsPortraitProcessing] = useState(false);
  const portraitAbortRef = useRef(false);
```

Add env vars near the LLM vars:

```javascript
  const STABILITY_API_KEY = import.meta.env.VITE_STABILITY_API_KEY || '';
  const STABILITY_API_ENDPOINT = import.meta.env.VITE_STABILITY_API_ENDPOINT || 'https://api.stability.ai/v2beta/stable-image/generate/sd3';
  const PORTRAIT_MODEL = import.meta.env.VITE_PORTRAIT_MODEL || 'sd3-medium';
```

Create a helper to run the pipeline after a `drawPortrait` command:

```javascript
  const startPortraitPipeline = useCallback(async (command) => {
    if (!STABILITY_API_KEY) {
      setStatusMessage('请配置 VITE_STABILITY_API_KEY');
      return;
    }

    portraitAbortRef.current = false;
    setIsPortraitProcessing(true);

    try {
      await portraitPipeline(command, {
        VITE_STABILITY_API_KEY: STABILITY_API_KEY,
        VITE_STABILITY_API_ENDPOINT: STABILITY_API_ENDPOINT,
        VITE_PORTRAIT_MODEL: PORTRAIT_MODEL
      }, {
        onStatus: (msg) => {
          if (!portraitAbortRef.current) setStatusMessage(msg);
        },
        onComplete: (completed) => {
          if (portraitAbortRef.current) return;

          setState(prev => {
            const shapes = prev.shapes.slice();
            const last = shapes[shapes.length - 1];
            if (!last || last.type !== 'portrait') return prev;

            const updated = {
              ...last,
              strokes: completed.strokes,
              totalLength: completed.totalLength,
              sourcePrompt: completed.prompt,
              isAnimating: true,
              animationProgress: 0
            };
            shapes[shapes.length - 1] = updated;
            return { ...prev, shapes };
          });

          setPencilTip(prev => ({ ...prev, visible: true }));
          setStatusMessage('Drawing portrait...');
        },
        onError: (err) => {
          if (!portraitAbortRef.current) {
            setStatusMessage(`Portrait failed: ${err.message}`);
          }
          setIsPortraitProcessing(false);
        }
      });
    } catch (err) {
      setStatusMessage(`Portrait failed: ${err.message}`);
      setIsPortraitProcessing(false);
    }
  }, [STABILITY_API_KEY, STABILITY_API_ENDPOINT, PORTRAIT_MODEL]);
```

Modify `runCommand` to detect `drawPortrait` and trigger the pipeline:

```javascript
  const runCommand = useCallback((command) => {
    if (command.action === 'drawPortrait') {
      setState(prev => {
        const { removed, ...next } = executeCommand(command, prev, canvasSize);
        return {
          ...next,
          lastRemoved: removed || [],
          undoStack: [...prev.undoStack, { shapes: prev.shapes, layers: prev.layers, currentLayerId: prev.currentLayerId }],
          redoStack: [],
          history: [...(prev.history || []), command]
        };
      });
      startPortraitPipeline(command);
      return;
    }

    setState(prev => {
      const { removed, ...next } = executeCommand(command, prev, canvasSize);
      const feedback = getCommandFeedback(command, { ...next, removed })
        || getGridFeedback(command)
        || getLayerFeedback(command, next);
      feedbackRef.current = feedback;
      return {
        ...next,
        lastRemoved: removed || [],
        shouldSave: next.shouldSave || false,
        undoStack: [...prev.undoStack, { shapes: prev.shapes, layers: prev.layers, currentLayerId: prev.currentLayerId }],
        redoStack: [],
        history: [...(prev.history || []), command]
      };
    });
    if (feedbackRef.current) {
      setStatusMessage(feedbackRef.current);
      feedbackRef.current = null;
    }
  }, [canvasSize, startPortraitPipeline]);
```

Add an animation effect after the imports/state:

Add a `stateRef` so the animation loop can read the latest shapes without restarting the effect, and a `portraitAnimRef` to keep the animator alive across frames:

```javascript
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const portraitAnimRef = useRef(null);

  useEffect(() => {
    let rafId;
    let lastTime = performance.now();
    const speed = 200; // pixels per second

    function tick(now) {
      const dt = now - lastTime;
      lastTime = now;

      const currentState = stateRef.current;
      const portrait = currentState.shapes.find(s => s.type === 'portrait' && s.isAnimating);
      if (!portrait) {
        setPencilTip(t => ({ ...t, visible: false }));
        rafId = requestAnimationFrame(tick);
        return;
      }

      if (!portraitAnimRef.current || portraitAnimRef.current.shapeId !== portrait.id) {
        const { createAnimator } = portraitAnimatorModule;
        portraitAnimRef.current = {
          shapeId: portrait.id,
          animator: createAnimator(portrait.strokes, portrait, speed)
        };
      }

      const { animator } = portraitAnimRef.current;
      animator.advance(dt);
      const nextProgress = animator.getProgress();
      const { getTipPosition } = portraitAnimatorModule;
      const tip = getTipPosition(animator);
      if (tip) setPencilTip({ x: tip.x, y: tip.y, visible: true });

      if (animator.isComplete()) {
        setStatusMessage('Portrait drawn');
        setIsPortraitProcessing(false);
        portraitAnimRef.current = null;
      }

      setState(prev => ({
        ...prev,
        shapes: prev.shapes.map(s =>
          s.id === portrait.id
            ? { ...s, animationProgress: nextProgress, isAnimating: !animator.isComplete() }
            : s
        )
      }));

      rafId = requestAnimationFrame(tick);
    }

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, []);
```

Add a module-level import for the animator:

```javascript
import * as portraitAnimatorModule from './services/portraitAnimator';
```

Render the pencil cursor inside the app:

```javascript
      <PencilCursor x={pencilTip.x} y={pencilTip.y} visible={pencilTip.visible} />
```

Place it inside the `<div className="app">` near the end, before `</div>`.

Also import `PencilCursor`:

```javascript
import PencilCursor from './components/PencilCursor';
```

- [ ] **Step 6: Handle cancellation**

In `clearPlanState`, also abort portrait:

```javascript
  const clearPlanState = useCallback(() => {
    planStateRef.current = null;
    setPlanState(null);
    portraitAbortRef.current = true;
    setIsPortraitProcessing(false);
    setStatusMessage('Cancelled');
  }, []);
```

- [ ] **Step 7: Add a debug button for manual testing**

In `src/App.jsx`, add a portrait debug button inside the existing `.debug-actions` block:

```javascript
            <button
              type="button"
              onClick={() => runCommand({ action: 'drawPortrait', description: '戴眼镜的女孩', size: 'small' })}
              className="btn-debug"
            >
              Draw Portrait
            </button>
```

- [ ] **Step 8: Run tests**

Run: `npx vitest run tests/portraitPipeline.test.js`

Expected: PASS.

Then run all tests:

Run: `npx vitest run`

Expected: All existing tests still pass (fix any regressions).

- [ ] **Step 9: Commit**

```bash
git add src/services/portraitPipeline.js tests/portraitPipeline.test.js src/App.jsx
git commit -m "feat: integrate async portrait pipeline into App"
```

---

### Task 13: Update plan panel descriptions for multi-stage portrait plan

**Files:**
- Modify: `src/services/llmParser.js` (optional) or `src/utils/describeCommand.js`

The spec says the plan panel should show:

```
Draw Portrait
1. Generate image from "a girl with glasses, pencil sketch"
2. Extract sketch strokes
3. Animate drawing with pencil
```

Our `drawPortrait` is a single command, so `describeCommand` returns one description. To show the three stages, we can keep the single description for now and rely on status messages. If the user wants a richer plan, extend `describeCommand` to return an array or add a special portrait plan renderer. For this plan, keep it simple: the single description from Task 2 is sufficient.

- [ ] **Step 1: Verify plan panel renders portrait description**

Add a test in `tests/CommandPlanPanel.test.jsx`:

```javascript
  it('renders portrait command description', () => {
    render(
      <CommandPlanPanel
        mode="awaiting_confirmation"
        descriptions={['在中心用铅笔绘制中号“戴眼镜的女孩”肖像']}
        interpretedCommand="画一个戴眼镜的女孩"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );
    expect(screen.getByText(/戴眼镜的女孩/)).toBeInTheDocument();
  });
```

- [ ] **Step 2: Run test**

Run: `npx vitest run tests/CommandPlanPanel.test.jsx`

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add tests/CommandPlanPanel.test.jsx
git commit -m "test: verify portrait description in plan panel"
```

---

### Task 14: Add environment variable documentation

**Files:**
- Create: `.env.example`

- [ ] **Step 1: Create `.env.example`**

```bash
# LLM API (used for advanced command parsing)
VITE_LLM_API_KEY=your-llm-key
VITE_LLM_API_ENDPOINT=https://api.deepseek.com/v1/chat/completions
VITE_LLM_MODEL=deepseek-chat

# Stability AI (used for portrait generation)
VITE_STABILITY_API_KEY=your-stability-key
VITE_STABILITY_API_ENDPOINT=https://api.stability.ai/v2beta/stable-image/generate/sd3
VITE_PORTRAIT_MODEL=sd3-medium
```

- [ ] **Step 2: Update README (if exists)**

Search for the existing env section and append the Stability variables. If no README env section exists, add a short note:

```markdown
## Environment Variables

Copy `.env.example` to `.env` and fill in your API keys.

| Variable | Purpose |
|---|---|
| `VITE_LLM_API_KEY` | DeepSeek / OpenAI-compatible API key for command parsing |
| `VITE_STABILITY_API_KEY` | Stability AI key for portrait generation |
| `VITE_PORTRAIT_MODEL` | Stability model, e.g. `sd3-medium` |
```

- [ ] **Step 3: Commit**

```bash
git add .env.example README.md
git commit -m "docs: document Stability API environment variables"
```

---

### Task 15: Self-review and full test run

- [ ] **Step 1: Spec coverage check**

Verify each spec section has a task:

| Spec Section | Task |
|---|---|
| 1. Goal / LLM prompt enhancement | Task 3 |
| 2. User flow / plan panel | Task 13 |
| 3.1 New modules | Tasks 4-9 |
| 3.2 Existing system integration | Tasks 1, 10, 11, 12 |
| 4. Data model | Task 10 |
| 5. Image processing pipeline | Task 6 |
| 6. Animation | Tasks 7, 8, 9, 12 |
| 7. UI/UX | Tasks 2, 9, 13 |
| 8. Configuration | Task 14 |
| 9. Error handling | Tasks 5, 12 |
| 11. Testing | All test files |

- [ ] **Step 2: Placeholder scan**

Search the plan for:
- "TBD", "TODO", "implement later", "fill in details" → must be 0.
- Vague steps like "add appropriate error handling" → must be replaced with concrete code.

- [ ] **Step 3: Type consistency check**

Confirm property names are consistent across tasks:
- `command.action === 'drawPortrait'`
- shape fields: `type`, `x`, `y`, `width`, `height`, `color`, `layerId`, `description`, `prompt`, `strokes`, `animationProgress`, `isAnimating`, `sourcePrompt`
- stroke fields: `id`, `type`, `points`, `length`, `boundingBox`

- [ ] **Step 4: Run full test suite**

Run: `npx vitest run`

Expected: All tests pass.

- [ ] **Step 5: Run dev build**

Run: `npx vite build`

Expected: Build succeeds with no errors.

- [ ] **Step 6: Commit any final fixes**

```bash
git add -A
git commit -m "fix: address self-review findings for portrait feature"
```

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-06-14-portrait-sketch.md`. Two execution options:

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration.

**2. Inline Execution** — Execute tasks in this session using `executing-plans`, batch execution with checkpoints.

Which approach?
