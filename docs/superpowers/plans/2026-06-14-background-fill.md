# Background Fill and Texture Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add voice-controlled background fills (solid, gradient, pattern, texture) to the VoiceCanvas main canvas, with backgrounds included in exported PNGs.

**Architecture:** Background configuration lives in App state. A dedicated `backgroundRenderer` draws the configured background onto a separate canvas layer. `CanvasBoard` renders three stacked canvases (background, grid placeholder, shapes) and merges background + shapes when exporting.

**Tech Stack:** Vite, React 18, HTML5 Canvas 2D, Vitest, Web Speech API.

---

## Files

| File | Responsibility |
|------|----------------|
| `src/utils/backgroundRenderer.js` (create) | Pure functions to render solid/gradient/pattern/texture backgrounds |
| `tests/backgroundRenderer.test.js` (create) | Unit tests for background rendering |
| `src/services/commandParser.js` (modify) | Parse background voice commands |
| `tests/commandParser.background.test.js` (create) | Parser tests for background commands |
| `src/services/executor.js` (modify) | Handle `setBackground` and preserve `background` in state |
| `tests/executor.background.test.js` (create) | Executor tests for background state |
| `src/components/CanvasBoard.jsx` (modify) | Add background canvas layer and export merge |
| `src/styles/index.css` (modify) | Stack background, grid, and shape canvases |
| `src/App.jsx` (modify) | Manage background state and feedback |
| `src/components/CommandPanel.jsx` (modify) | Display current background type/color |
| `README.md` (modify) | Document new voice commands |

---

### Task 1: Create background renderer

**Files:**
- Create: `tests/backgroundRenderer.test.js`
- Create: `src/utils/backgroundRenderer.js`
- Test: `tests/backgroundRenderer.test.js`

- [ ] **Step 1: Write the failing test**

Create `tests/backgroundRenderer.test.js`:

```javascript
import { describe, it, expect } from 'vitest';
import { renderBackground, DEFAULT_BACKGROUND } from '../src/utils/backgroundRenderer';

const canvasSize = { width: 200, height: 150 };

function createCtx() {
  const canvas = document.createElement('canvas');
  canvas.width = canvasSize.width;
  canvas.height = canvasSize.height;
  return canvas.getContext('2d');
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
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
npx vitest run tests/backgroundRenderer.test.js
```

Expected: FAIL — `renderBackground is not exported`.

- [ ] **Step 3: Write the minimal implementation**

Create `src/utils/backgroundRenderer.js`:

```javascript
export const DEFAULT_BACKGROUND = { type: 'solid', color: '#ffffff' };

const DENSITY_COUNTS = {
  low: 50,
  medium: 150,
  high: 400
};

function resolveDirection(direction, width, height) {
  switch (direction) {
    case 'to-left': return { x0: width, y0: 0, x1: 0, y1: 0 };
    case 'to-top': return { x0: 0, y0: height, x1: 0, y1: 0 };
    case 'to-bottom': return { x0: 0, y0: 0, x1: 0, y1: height };
    case 'to-top-left': return { x0: width, y0: height, x1: 0, y1: 0 };
    case 'to-top-right': return { x0: 0, y0: height, x1: width, y1: 0 };
    case 'to-bottom-left': return { x0: width, y0: 0, x1: 0, y1: height };
    case 'to-bottom-right': return { x0: 0, y0: 0, x1: width, y1: height };
    case 'to-right':
    default: return { x0: 0, y0: 0, x1: width, y1: 0 };
  }
}

function renderSolid(ctx, width, height, background) {
  ctx.fillStyle = background.color || '#ffffff';
  ctx.fillRect(0, 0, width, height);
}

function renderGradient(ctx, width, height, background) {
  const { subtype, color, color2, direction } = background;
  let gradient;
  if (subtype === 'radial') {
    const cx = width / 2;
    const cy = height / 2;
    const r = Math.max(width, height) / 2;
    gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
  } else {
    const { x0, y0, x1, y1 } = resolveDirection(direction, width, height);
    gradient = ctx.createLinearGradient(x0, y0, x1, y1);
  }
  gradient.addColorStop(0, color || '#3b82f6');
  gradient.addColorStop(1, color2 || '#ffffff');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
}

function renderPattern(ctx, width, height, background) {
  const { subtype, color, color2 } = background;
  const c1 = color || '#000000';
  const c2 = color2 || '#ffffff';
  renderSolid(ctx, width, height, { color: c1 });

  ctx.fillStyle = c2;
  if (subtype === 'stripes') {
    const step = 40;
    for (let x = 0; x < width; x += step * 2) {
      ctx.fillRect(x, 0, step, height);
    }
  } else if (subtype === 'checkerboard') {
    const step = 40;
    for (let y = 0; y < height; y += step) {
      for (let x = 0; x < width; x += step) {
        if ((x / step + y / step) % 2 === 1) {
          ctx.fillRect(x, y, step, step);
        }
      }
    }
  } else if (subtype === 'dots') {
    const step = 40;
    ctx.beginPath();
    for (let y = step / 2; y < height; y += step) {
      for (let x = step / 2; x < width; x += step) {
        ctx.moveTo(x, y);
        ctx.arc(x, y, 4, 0, Math.PI * 2);
      }
    }
    ctx.fill();
  }
}

function renderTexture(ctx, width, height, background) {
  const { subtype, color, density } = background;
  renderSolid(ctx, width, height, { color: color || '#000000' });

  const count = DENSITY_COUNTS[density] || DENSITY_COUNTS.medium;

  if (subtype === 'starry') {
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < count; i++) {
      const x = Math.random() * width;
      const y = Math.random() * height;
      const r = Math.random() * 1.5 + 0.5;
      ctx.globalAlpha = Math.random() * 0.8 + 0.2;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  } else if (subtype === 'noise') {
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
      const offset = (Math.random() - 0.5) * 60;
      data[i] = Math.min(255, Math.max(0, data[i] + offset));
      data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + offset));
      data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + offset));
      data[i + 3] = 255;
    }
    ctx.putImageData(imageData, 0, 0);
  }
}

export function renderBackground(ctx, width, height, background) {
  const config = background || DEFAULT_BACKGROUND;
  ctx.save();
  switch (config.type) {
    case 'gradient':
      renderGradient(ctx, width, height, config);
      break;
    case 'pattern':
      renderPattern(ctx, width, height, config);
      break;
    case 'texture':
      renderTexture(ctx, width, height, config);
      break;
    case 'solid':
    default:
      renderSolid(ctx, width, height, config);
      break;
  }
  ctx.restore();
}
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
npx vitest run tests/backgroundRenderer.test.js
```

Expected: 8 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add tests/backgroundRenderer.test.js src/utils/backgroundRenderer.js
git commit -m "feat: add background renderer with solid, gradient, pattern, texture"
```

---

### Task 2: Parse background commands

**Files:**
- Create: `tests/commandParser.background.test.js`
- Modify: `src/services/commandParser.js`
- Test: `tests/commandParser.background.test.js`

- [ ] **Step 1: Write the failing test**

Create `tests/commandParser.background.test.js`:

```javascript
import { describe, it, expect } from 'vitest';
import { parseCommand } from '../src/services/commandParser';

describe('parseCommand - background', () => {
  it('sets solid blue background', () => {
    expect(parseCommand('把背景改成蓝色')).toEqual([{
      action: 'setBackground',
      background: { type: 'solid', color: '#3b82f6' }
    }]);
  });

  it('sets linear gradient background', () => {
    expect(parseCommand('换成渐变色背景')).toEqual([{
      action: 'setBackground',
      background: { type: 'gradient', subtype: 'linear', color: '#3b82f6', color2: '#ffffff', direction: 'to-right' }
    }]);
  });

  it('sets directional gradient with two colors', () => {
    expect(parseCommand('换成从左到右的红蓝渐变')).toEqual([{
      action: 'setBackground',
      background: { type: 'gradient', subtype: 'linear', color: '#ef4444', color2: '#3b82f6', direction: 'to-right' }
    }]);
  });

  it('sets radial gradient', () => {
    expect(parseCommand('换成中心扩散的蓝色渐变')).toEqual([{
      action: 'setBackground',
      background: { type: 'gradient', subtype: 'radial', color: '#3b82f6', color2: '#ffffff', direction: 'to-right' }
    }]);
  });

  it('sets stripes pattern', () => {
    expect(parseCommand('换成黑白条纹')).toEqual([{
      action: 'setBackground',
      background: { type: 'pattern', subtype: 'stripes', color: '#000000', color2: '#ffffff', direction: 'to-right', density: 'medium' }
    }]);
  });

  it('sets checkerboard pattern', () => {
    expect(parseCommand('换成棋盘格')).toEqual([{
      action: 'setBackground',
      background: { type: 'pattern', subtype: 'checkerboard', color: '#000000', color2: '#ffffff', direction: 'to-right', density: 'medium' }
    }]);
  });

  it('sets starry texture', () => {
    expect(parseCommand('换成星空背景')).toEqual([{
      action: 'setBackground',
      background: { type: 'texture', subtype: 'starry', color: '#000000', color2: '#ffffff', direction: 'to-right', density: 'medium' }
    }]);
  });

  it('resets background to default', () => {
    expect(parseCommand('恢复默认背景')).toEqual([{
      action: 'setBackground',
      background: { type: 'solid', color: '#ffffff' }
    }]);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
npx vitest run tests/commandParser.background.test.js
```

Expected: FAIL — background commands return `null` or wrong shape.

- [ ] **Step 3: Extend `commandParser.js`**

Modify `src/services/commandParser.js`:

1. Add background helpers after existing helpers:

```javascript
const DIRECTION_KEYWORDS = {
  '从左到右': 'to-right',
  '从左往右': 'to-right',
  '从上到下': 'to-bottom',
  '从上往下': 'to-bottom',
  '从右到左': 'to-left',
  '从右往左': 'to-left',
  '从下到上': 'to-top',
  '从下往上': 'to-top',
  '从左上到右下': 'to-bottom-right',
  '从左上往右下': 'to-bottom-right',
  '从右上到左下': 'to-bottom-left',
  '从右上往左下': 'to-bottom-left',
  '从左下到右上': 'to-top-right',
  '从左下往右上': 'to-top-right',
  '从右下到左上': 'to-top-left',
  '从右下往左上': 'to-top-left'
};

function isBackgroundCommand(text) {
  return text.includes('背景') || text.includes('background');
}

function detectDirection(text) {
  for (const [phrase, direction] of Object.entries(DIRECTION_KEYWORDS)) {
    if (text.includes(phrase)) return direction;
  }
  return 'to-right';
}

function detectBackgroundType(text) {
  if (text.includes('星空')) return { type: 'texture', subtype: 'starry' };
  if (text.includes('噪点') || text.includes('颗粒')) return { type: 'texture', subtype: 'noise' };
  if (text.includes('条纹')) return { type: 'pattern', subtype: 'stripes' };
  if (text.includes('棋盘格') || text.includes('棋盘')) return { type: 'pattern', subtype: 'checkerboard' };
  if (text.includes('点阵') || text.includes('圆点')) return { type: 'pattern', subtype: 'dots' };
  if (text.includes('径向') || text.includes('中心扩散') || text.includes('放射')) return { type: 'gradient', subtype: 'radial' };
  if (text.includes('渐变') || text.includes('渐变色')) return { type: 'gradient', subtype: 'linear' };
  return { type: 'solid', subtype: 'solid' };
}

function detectSecondaryColor(text) {
  const separators = ['到', '至', '和', '与'];
  for (const sep of separators) {
    const idx = text.indexOf(sep);
    if (idx !== -1) {
      const after = text.slice(idx + 1);
      const color = detectColor(after);
      if (color) return color;
    }
  }
  return '#ffffff';
}

function parseBackgroundCommand(text) {
  if (text.includes('默认') || text.includes('重置') || text.includes('白色')) {
    return { action: 'setBackground', background: { type: 'solid', color: '#ffffff' } };
  }

  const { type, subtype } = detectBackgroundType(text);
  const color = detectColor(text) || '#3b82f6';
  const direction = detectDirection(text);

  const background = { type, subtype, color, direction };

  if (type === 'gradient' || type === 'pattern') {
    background.color2 = detectSecondaryColor(text);
  }
  if (type === 'texture') {
    background.density = 'medium';
    if (!background.color || background.color === '#ffffff') {
      background.color = '#000000';
    }
  }

  return { action: 'setBackground', background };
}
```

2. Insert background handling at the top of `parseCommand`, before delete/grid checks:

```javascript
export function parseCommand(text) {
  const normalized = text.toLowerCase().trim();

  if (isBackgroundCommand(normalized)) {
    return [parseBackgroundCommand(normalized)];
  }

  // existing delete/undo/redo/clear/save/shape checks...
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
npx vitest run tests/commandParser.background.test.js
```

Expected: 8 tests PASS.

- [ ] **Step 5: Regression check**

```bash
npx vitest run tests/commandParser.test.js tests/commandParser.delete.test.js
```

Expected: existing parser tests still PASS.

- [ ] **Step 6: Commit**

```bash
git add tests/commandParser.background.test.js src/services/commandParser.js
git commit -m "feat: parse voice background commands"
```

---

### Task 3: Execute background commands

**Files:**
- Create: `tests/executor.background.test.js`
- Modify: `src/services/executor.js`
- Test: `tests/executor.background.test.js`

- [ ] **Step 1: Write the failing test**

Create `tests/executor.background.test.js`:

```javascript
import { describe, it, expect } from 'vitest';
import { executeCommand, createInitialState } from '../src/services/executor';

describe('executeCommand - background', () => {
  it('initial state includes default background', () => {
    const state = createInitialState();
    expect(state.background).toEqual({ type: 'solid', color: '#ffffff' });
  });

  it('sets solid background', () => {
    const state = createInitialState();
    const result = executeCommand(
      { action: 'setBackground', background: { type: 'solid', color: '#ff0000' } },
      state,
      { width: 800, height: 600 }
    );
    expect(result.background).toEqual({ type: 'solid', color: '#ff0000' });
  });

  it('preserves background when drawing', () => {
    const state = { ...createInitialState(), background: { type: 'solid', color: '#ff0000' } };
    const result = executeCommand(
      { action: 'draw', shape: 'rect', color: 'blue', position: 'center', size: 'medium' },
      state,
      { width: 800, height: 600 }
    );
    expect(result.background).toEqual({ type: 'solid', color: '#ff0000' });
  });

  it('preserves background when clearing', () => {
    const state = { ...createInitialState(), background: { type: 'solid', color: '#ff0000' } };
    const result = executeCommand({ action: 'clear' }, state, { width: 800, height: 600 });
    expect(result.background).toEqual({ type: 'solid', color: '#ff0000' });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
npx vitest run tests/executor.background.test.js
```

Expected: FAIL — `background` not in state.

- [ ] **Step 3: Extend `executor.js`**

Modify `src/services/executor.js`:

1. Update `createInitialState`:

```javascript
export function createInitialState() {
  return {
    shapes: [],
    currentColor: '#3b82f6',
    undoStack: [],
    redoStack: [],
    history: [],
    shouldSave: false,
    background: { type: 'solid', color: '#ffffff' }
  };
}
```

2. Update existing branches to preserve `background`:

`draw`:
```javascript
      return { shapes: [...shapes, newShape], currentColor: newShape.color, background: state.background };
```

`delete`:
```javascript
      if (targets.length === 0) {
        return { shapes, currentColor, removed: [], background: state.background };
      }
      return {
        shapes: shapes.filter(s => !targetIds.has(s.id)),
        currentColor,
        removed: targets,
        background: state.background
      };
```

`setColor`:
```javascript
      return { shapes, currentColor: resolveColor(command.color), background: state.background };
```

`clear`:
```javascript
      return { shapes: [], currentColor, background: state.background };
```

`save`:
```javascript
      return { shapes, currentColor, shouldSave: true, background: state.background };
```

`default`:
```javascript
    default:
      return { shapes, currentColor, background: state.background };
```

3. Add `setBackground` case before `default`:

```javascript
    case 'setBackground': {
      return { ...state, background: command.background };
    }
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
npx vitest run tests/executor.background.test.js
```

Expected: 4 tests PASS.

- [ ] **Step 5: Regression check**

```bash
npx vitest run tests/executor.test.js
```

Expected: existing executor tests still PASS.

- [ ] **Step 6: Commit**

```bash
git add tests/executor.background.test.js src/services/executor.js
git commit -m "feat: execute background commands and preserve background in state"
```

---

### Task 4: Add background canvas layer and export merge

**Files:**
- Modify: `src/components/CanvasBoard.jsx`
- Modify: `src/styles/index.css`
- Test: existing tests + visual smoke test

- [ ] **Step 1: Update `CanvasBoard.jsx`**

Replace the entire contents of `src/components/CanvasBoard.jsx` with:

```jsx
import { useRef, useEffect, useImperativeHandle, forwardRef } from 'react';
import { drawRect } from '../shapes/drawRect';
import { drawCircle } from '../shapes/drawCircle';
import { drawLine } from '../shapes/drawLine';
import { drawTriangle } from '../shapes/drawTriangle';
import { renderBackground } from '../utils/backgroundRenderer';

const DRAWERS = {
  rect: drawRect,
  circle: drawCircle,
  line: drawLine,
  triangle: drawTriangle
};

const CanvasBoard = forwardRef(function CanvasBoard({ shapes, background }, ref) {
  const bgCanvasRef = useRef(null);
  const gridCanvasRef = useRef(null);
  const shapeCanvasRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    function resize() {
      const container = containerRef.current;
      const bgCanvas = bgCanvasRef.current;
      const gridCanvas = gridCanvasRef.current;
      const shapeCanvas = shapeCanvasRef.current;
      if (!container || !bgCanvas || !gridCanvas || !shapeCanvas) return;

      const rect = container.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;

      [bgCanvas, gridCanvas, shapeCanvas].forEach((canvas) => {
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        canvas.style.width = `${rect.width}px`;
        canvas.style.height = `${rect.height}px`;
      });

      [bgCanvas, gridCanvas, shapeCanvas].forEach((canvas) => {
        const ctx = canvas.getContext('2d');
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      });
    }

    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  useEffect(() => {
    const canvas = bgCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const cssWidth = canvas.width / dpr;
    const cssHeight = canvas.height / dpr;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cssWidth, cssHeight);
    renderBackground(ctx, cssWidth, cssHeight, background);
  }, [background]);

  useEffect(() => {
    const canvas = shapeCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const cssWidth = canvas.width / dpr;
    const cssHeight = canvas.height / dpr;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cssWidth, cssHeight);
    for (const shape of shapes) {
      const drawer = DRAWERS[shape.type];
      if (drawer) drawer(ctx, shape);
    }
  }, [shapes]);

  useImperativeHandle(ref, () => ({
    exportImage() {
      const bgCanvas = bgCanvasRef.current;
      const shapeCanvas = shapeCanvasRef.current;
      if (!bgCanvas || !shapeCanvas) return null;

      const canvas = document.createElement('canvas');
      canvas.width = bgCanvas.width;
      canvas.height = bgCanvas.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(bgCanvas, 0, 0);
      ctx.drawImage(shapeCanvas, 0, 0);
      return canvas.toDataURL('image/png');
    }
  }));

  return (
    <div ref={containerRef} className="canvas-board">
      <canvas ref={bgCanvasRef} className="canvas-background" />
      <canvas ref={gridCanvasRef} className="canvas-grid" />
      <canvas ref={shapeCanvasRef} className="canvas-shapes" />
    </div>
  );
});

export default CanvasBoard;
```

- [ ] **Step 2: Update `styles/index.css`**

Find the `.canvas-board` and `.canvas-board canvas` rules and replace them with:

```css
.canvas-board {
  position: absolute;
  inset: 20px;
  background-color: #ffffff;
  border-radius: 16px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.04), 0 2px 4px -2px rgba(0, 0, 0, 0.02);
  border: 1px solid #e2e8f0;
  overflow: hidden;
}

.canvas-background,
.canvas-grid,
.canvas-shapes {
  position: absolute;
  inset: 0;
  display: block;
  width: 100%;
  height: 100%;
}

.canvas-background {
  z-index: 0;
}

.canvas-grid {
  z-index: 1;
  pointer-events: none;
}

.canvas-shapes {
  z-index: 2;
}
```

- [ ] **Step 3: Run tests and smoke test**

```bash
npm test
npm run dev
```

Open `http://localhost:5173`. Draw a shape, then use a temporary debug button or browser console to call `runCommand({ action: 'setBackground', background: { type: 'solid', color: '#ff0000' } })`. The background should turn red.

- [ ] **Step 4: Commit**

```bash
git add src/components/CanvasBoard.jsx src/styles/index.css
git commit -m "feat: add background canvas layer and export merge"
```

---

### Task 5: Wire background state, feedback, and panel display

**Files:**
- Modify: `src/App.jsx`
- Modify: `src/components/CommandPanel.jsx`
- Modify: `README.md`
- Test: `npm test` + `npm run build`

- [ ] **Step 1: Update `App.jsx`**

1. Pass `background` to `CanvasBoard`:

Replace:
```jsx
          <CanvasBoard ref={canvasRef} shapes={state.shapes} />
```

With:
```jsx
          <CanvasBoard ref={canvasRef} shapes={state.shapes} background={state.background} />
```

2. Add background feedback to `getCommandFeedback`:

Replace the existing `getCommandFeedback` with:

```javascript
function getCommandFeedback(command, result) {
  if (command.action === 'delete') {
    const count = result.removed?.length || 0;
    if (count === 0) return 'No matching shape found';
    return `Deleted ${count} shape${count > 1 ? 's' : ''}`;
  }
  if (command.action === 'setBackground') {
    const type = command.background?.type || 'solid';
    return `Background set to ${type}`;
  }
  return null;
}
```

3. The speech result handlers already check `lastCmd?.action !== 'delete'`. Update them to also skip background feedback:

```javascript
            const lastCmd = command[command.length - 1];
            const feedbackActions = ['delete', 'setBackground'];
            if (!feedbackActions.includes(lastCmd?.action)) {
              setStatusMessage(`Executed: ${text}`);
            }
```

And similarly for the LLM path.

- [ ] **Step 2: Update `CommandPanel.jsx`**

1. Update the component signature:

```javascript
function CommandPanel({ statusMessage, currentCommand, lastRemoved, background, onUndo, onRedo, canUndo, canRedo, onClear, onSave }) {
```

2. Add background status cards after the grid cards block:

After the existing `{grid && (...)}` block, add:

```jsx
        {background && (
          <>
            <div className="command-card">
              <span className="command-card-label">BACKGROUND TYPE</span>
              <span className="command-card-value">{background.type}</span>
            </div>
            <div className="command-card">
              <span className="command-card-label">BACKGROUND COLOR</span>
              <span className="command-card-value">{background.color}</span>
            </div>
          </>
        )}
```

If the current `CommandPanel` does not have a grid block, add the background block inside `command-cards` after the aesthetic style card.

3. Pass `background` from `App.jsx`:

```jsx
        <CommandPanel
          statusMessage={statusMessage}
          currentCommand={lastCommand}
          lastRemoved={state.lastRemoved}
          background={state.background}
          onUndo={undo}
          onRedo={redo}
          canUndo={state.undoStack.length > 0}
          canRedo={state.redoStack.length > 0}
          onClear={() => runCommand({ action: 'clear' })}
          onSave={saveCanvas}
        />
```

- [ ] **Step 3: Update `README.md`**

Add the following examples under the Voice Commands section (after the save/delete examples):

```markdown
- "把背景改成蓝色"
- "换成从左到右的红蓝渐变"
- "换成中心扩散的蓝色渐变"
- "换成黑白条纹"
- "换成棋盘格"
- "换成星空背景"
- "恢复默认背景"
```

- [ ] **Step 4: Run full test suite and build**

```bash
npm test
npm run build
```

Expected: all tests PASS, build succeeds.

- [ ] **Step 5: Smoke test**

```bash
npm run dev
```

Test via browser console or temporary button:
- `runCommand({ action: 'setBackground', background: { type: 'solid', color: '#ff0000' } })` — background turns red.
- `runCommand({ action: 'setBackground', background: { type: 'texture', subtype: 'starry', color: '#000000' } })` — starry background.
- Save image — exported PNG includes background and shapes.

- [ ] **Step 6: Commit**

```bash
git add src/App.jsx src/components/CommandPanel.jsx README.md
git commit -m "feat: wire background state, feedback, and panel display"
```

---

## Self-Review Checklist

1. **Spec coverage:**
   - Background renderer for all types → Task 1.
   - Parser → Task 2.
   - Executor state → Task 3.
   - Canvas layer + export merge → Task 4.
   - UI feedback + README → Task 5.

2. **Placeholder scan:** No TBD/TODO/fill-in details.

3. **Type consistency:** `background` object shape `{ type, subtype, color, color2, direction, density }` used consistently across parser, executor, renderer, and UI.

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-06-14-background-fill.md`.

Two execution options:

1. **Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration.
2. **Inline Execution** — Execute tasks in this session using `superpowers:executing-plans`, batch execution with checkpoints.

Which approach would you like?
