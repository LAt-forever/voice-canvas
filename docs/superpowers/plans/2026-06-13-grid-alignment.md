# Grid and Snap Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a toggleable line grid and snap-to-grid behavior to the VoiceCanvas main canvas.

**Architecture:** Grid configuration lives in App state and is passed to `CanvasBoard`, which renders grid and shapes on two stacked canvases so the grid never appears in exported images. The executor applies snapping when drawing new shapes if snap is enabled.

**Tech Stack:** Vite, React 18, HTML5 Canvas 2D, Vitest, Web Speech API.

---

## Files

| File | Responsibility |
|------|----------------|
| `src/utils/positionResolver.js` (modify) | Add `snapPosition(x, y, spacing)` helper |
| `src/services/commandParser.js` (modify) | Parse grid/snap/spacing voice commands |
| `src/services/executor.js` (modify) | Update grid state and apply snap during draw |
| `src/components/CanvasBoard.jsx` (modify) | Render grid canvas + shape canvas |
| `src/styles/index.css` (modify) | Stack the two canvases with z-index |
| `src/App.jsx` (modify) | Manage grid state, wire feedback, pass grid down |
| `src/components/CommandPanel.jsx` (modify) | Display current grid/snap/spacing |
| `tests/positionResolver.snap.test.js` (create) | Snap helper tests |
| `tests/commandParser.grid.test.js` (create) | Grid command parsing tests |
| `tests/executor.grid.test.js` (create) | Grid state + snap execution tests |
| `README.md` (modify) | Document new voice commands |

---

### Task 1: Add snap helper

**Files:**
- Create: `tests/positionResolver.snap.test.js`
- Modify: `src/utils/positionResolver.js`
- Test: `tests/positionResolver.snap.test.js`

- [ ] **Step 1: Write the failing test**

Create `tests/positionResolver.snap.test.js`:

```javascript
import { describe, it, expect } from 'vitest';
import { snapPosition } from '../src/utils/positionResolver';

describe('snapPosition', () => {
  it('snaps to nearest intersection when within threshold', () => {
    expect(snapPosition(42, 38, 40)).toEqual({ x: 40, y: 40 });
  });

  it('keeps original coordinate when beyond threshold', () => {
    expect(snapPosition(60, 60, 40)).toEqual({ x: 60, y: 60 });
  });

  it('snaps to origin when near zero', () => {
    expect(snapPosition(10, 10, 40)).toEqual({ x: 0, y: 0 });
  });

  it('handles exact multiples of spacing', () => {
    expect(snapPosition(80, 120, 40)).toEqual({ x: 80, y: 120 });
  });

  it('returns original coordinates for invalid spacing', () => {
    expect(snapPosition(42, 38, 0)).toEqual({ x: 42, y: 38 });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
npx vitest run tests/positionResolver.snap.test.js
```

Expected: FAIL — `snapPosition is not exported`.

- [ ] **Step 3: Write the minimal implementation**

Modify `src/utils/positionResolver.js`. Add at the bottom:

```javascript
export function snapPosition(x, y, spacing) {
  if (!spacing || spacing <= 0) return { x, y };

  function snap(value) {
    const nearest = Math.round(value / spacing) * spacing;
    const distance = Math.abs(value - nearest);
    return distance < spacing / 2 ? nearest : value;
  }

  return { x: snap(x), y: snap(y) };
}
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
npx vitest run tests/positionResolver.snap.test.js
```

Expected: 5 tests PASS.

- [ ] **Step 5: Regression check**

```bash
npx vitest run tests/positionResolver.test.js
```

Expected: existing position resolver tests still PASS.

- [ ] **Step 6: Commit**

```bash
git add tests/positionResolver.snap.test.js src/utils/positionResolver.js
git commit -m "feat: add snapPosition helper for grid alignment"
```

---

### Task 2: Parse grid commands

**Files:**
- Create: `tests/commandParser.grid.test.js`
- Modify: `src/services/commandParser.js`
- Test: `tests/commandParser.grid.test.js`

- [ ] **Step 1: Write the failing test**

Create `tests/commandParser.grid.test.js`:

```javascript
import { describe, it, expect } from 'vitest';
import { parseCommand } from '../src/services/commandParser';

describe('parseCommand - grid', () => {
  it('shows grid', () => {
    expect(parseCommand('显示网格')).toEqual([{ action: 'setGrid', visible: true }]);
    expect(parseCommand('打开网格')).toEqual([{ action: 'setGrid', visible: true }]);
  });

  it('hides grid', () => {
    expect(parseCommand('隐藏网格')).toEqual([{ action: 'setGrid', visible: false }]);
    expect(parseCommand('关闭网格')).toEqual([{ action: 'setGrid', visible: false }]);
  });

  it('enables snap', () => {
    expect(parseCommand('打开吸附')).toEqual([{ action: 'setSnap', snap: true }]);
    expect(parseCommand('开启吸附')).toEqual([{ action: 'setSnap', snap: true }]);
  });

  it('disables snap', () => {
    expect(parseCommand('关闭吸附')).toEqual([{ action: 'setSnap', snap: false }]);
  });

  it('increases grid size', () => {
    expect(parseCommand('网格调大')).toEqual([{ action: 'setGridSize', size: 'large' }]);
  });

  it('decreases grid size', () => {
    expect(parseCommand('网格调小')).toEqual([{ action: 'setGridSize', size: 'small' }]);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
npx vitest run tests/commandParser.grid.test.js
```

Expected: FAIL — grid commands return `null`.

- [ ] **Step 3: Extend `commandParser.js`**

Modify `src/services/commandParser.js`:

1. Add helpers after the existing helpers:

```javascript
function isGridCommand(text) {
  return text.includes('网格') || text.includes('吸附') || text.includes('grid') || text.includes('snap');
}

function parseGridCommand(text) {
  if (text.includes('网格')) {
    if (text.includes('显示') || text.includes('打开') || text.includes('show')) {
      return { action: 'setGrid', visible: true };
    }
    if (text.includes('隐藏') || text.includes('关闭') || text.includes('hide')) {
      return { action: 'setGrid', visible: false };
    }
    if (text.includes('调大') || text.includes('大一点') || text.includes('bigger')) {
      return { action: 'setGridSize', size: 'large' };
    }
    if (text.includes('调小') || text.includes('小一点') || text.includes('smaller')) {
      return { action: 'setGridSize', size: 'small' };
    }
  }

  if (text.includes('吸附') || text.includes('snap')) {
    if (text.includes('打开') || text.includes('开启') || text.includes('enable')) {
      return { action: 'setSnap', snap: true };
    }
    if (text.includes('关闭') || text.includes('disable')) {
      return { action: 'setSnap', snap: false };
    }
  }

  return null;
}
```

2. Insert grid handling at the top of `parseCommand`, before undo/redo checks:

```javascript
export function parseCommand(text) {
  const normalized = text.toLowerCase().trim();

  if (isGridCommand(normalized)) {
    const gridCmd = parseGridCommand(normalized);
    if (gridCmd) return [gridCmd];
  }

  // existing undo/redo/clear/save/shape checks...
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
npx vitest run tests/commandParser.grid.test.js
```

Expected: 6 tests PASS.

- [ ] **Step 5: Regression check**

```bash
npx vitest run tests/commandParser.test.js
```

Expected: existing parser tests still PASS.

- [ ] **Step 6: Commit**

```bash
git add tests/commandParser.grid.test.js src/services/commandParser.js
git commit -m "feat: parse voice grid and snap commands"
```

---

### Task 3: Execute grid commands and apply snap

**Files:**
- Create: `tests/executor.grid.test.js`
- Modify: `src/services/executor.js`
- Test: `tests/executor.grid.test.js`

- [ ] **Step 1: Write the failing test**

Create `tests/executor.grid.test.js`:

```javascript
import { describe, it, expect } from 'vitest';
import { executeCommand, createInitialState } from '../src/services/executor';

describe('executeCommand - grid', () => {
  it('initial state includes grid config', () => {
    const state = createInitialState();
    expect(state.grid).toEqual({ visible: true, snap: true, spacing: 40 });
  });

  it('toggles grid visibility', () => {
    const state = createInitialState();
    const result = executeCommand({ action: 'setGrid', visible: false }, state, { width: 800, height: 600 });
    expect(result.grid.visible).toBe(false);
    expect(result.grid.snap).toBe(true);
    expect(result.grid.spacing).toBe(40);
  });

  it('toggles snap', () => {
    const state = createInitialState();
    const result = executeCommand({ action: 'setSnap', snap: false }, state, { width: 800, height: 600 });
    expect(result.grid.snap).toBe(false);
  });

  it('sets grid size', () => {
    const state = createInitialState();
    const result = executeCommand({ action: 'setGridSize', size: 'large' }, state, { width: 800, height: 600 });
    expect(result.grid.spacing).toBe(80);
  });

  it('snaps draw position when snap enabled', () => {
    const state = { ...createInitialState(), grid: { visible: true, snap: true, spacing: 40 } };
    const result = executeCommand(
      { action: 'draw', shape: 'rect', color: 'red', position: 'left', size: 'medium' },
      state,
      { width: 800, height: 620 }
    );
    // left gives x=40 (on grid), y=310 (snaps to 320)
    expect(result.shapes[0].x).toBe(40);
    expect(result.shapes[0].y).toBe(320);
  });

  it('does not snap when snap disabled', () => {
    const state = { ...createInitialState(), grid: { visible: true, snap: false, spacing: 40 } };
    const result = executeCommand(
      { action: 'draw', shape: 'rect', color: 'red', position: 'left', size: 'medium' },
      state,
      { width: 800, height: 620 }
    );
    expect(result.shapes[0].x).toBe(40);
    expect(result.shapes[0].y).toBe(310);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
npx vitest run tests/executor.grid.test.js
```

Expected: FAIL — `grid` not present or snap not applied.

- [ ] **Step 3: Extend `executor.js`**

Modify `src/services/executor.js`:

1. Add import at the top:

```javascript
import { snapPosition } from '../utils/positionResolver';
```

2. Add grid presets constant:

```javascript
const GRID_SIZE_PRESETS = {
  small: 20,
  medium: 40,
  large: 80
};
```

3. Update `createInitialState` to include `grid`:

```javascript
export function createInitialState() {
  return {
    shapes: [],
    currentColor: '#3b82f6',
    undoStack: [],
    redoStack: [],
    history: [],
    shouldSave: false,
    grid: { visible: true, snap: true, spacing: 40 }
  };
}
```

4. Update the `draw` case to apply snapping:

```javascript
    case 'draw': {
      let position = resolvePosition(command.position, canvasSize.width, canvasSize.height);
      if (state.grid?.snap) {
        position = snapPosition(position.x, position.y, state.grid.spacing);
      }
      const size = resolveSize(command.size);
      const newShape = {
        id: generateId(),
        type: command.shape,
        x: position.x,
        y: position.y,
        width: size.width,
        height: size.height,
        color: resolveColor(command.color || currentColor)
      };
      return { shapes: [...shapes, newShape], currentColor: newShape.color, grid: state.grid };
    }
```

5. Update other branches to preserve `grid`:

`setColor`:
```javascript
    case 'setColor': {
      return { shapes, currentColor: resolveColor(command.color), grid: state.grid };
    }
```

`clear`:
```javascript
    case 'clear': {
      return { shapes: [], currentColor, grid: state.grid };
    }
```

`save`:
```javascript
    case 'save': {
      return { shapes, currentColor, grid: state.grid, shouldSave: true };
    }
```

`default`:
```javascript
    default:
      return { shapes, currentColor, grid: state.grid };
```

6. Add new grid command cases after `save` and before `default`:

```javascript
    case 'setGrid': {
      return { ...state, grid: { ...state.grid, visible: command.visible } };
    }
    case 'setSnap': {
      return { ...state, grid: { ...state.grid, snap: command.snap } };
    }
    case 'setGridSize': {
      const spacing = GRID_SIZE_PRESETS[command.size] || state.grid.spacing;
      return { ...state, grid: { ...state.grid, spacing } };
    }
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
npx vitest run tests/executor.grid.test.js
```

Expected: 6 tests PASS.

- [ ] **Step 5: Regression check**

```bash
npx vitest run tests/executor.test.js
```

Expected: existing executor tests still PASS.

- [ ] **Step 6: Commit**

```bash
git add tests/executor.grid.test.js src/services/executor.js
git commit -m "feat: execute grid commands and snap shapes to grid"
```

---

### Task 4: Render grid on a separate canvas

**Files:**
- Modify: `src/components/CanvasBoard.jsx`
- Modify: `src/styles/index.css`
- Test: existing tests still pass, visual smoke test

- [ ] **Step 1: Update `CanvasBoard.jsx`**

Replace the entire contents of `src/components/CanvasBoard.jsx` with:

```jsx
import { useRef, useEffect, useImperativeHandle, forwardRef } from 'react';
import { drawRect } from '../shapes/drawRect';
import { drawCircle } from '../shapes/drawCircle';
import { drawLine } from '../shapes/drawLine';
import { drawTriangle } from '../shapes/drawTriangle';

const DRAWERS = {
  rect: drawRect,
  circle: drawCircle,
  line: drawLine,
  triangle: drawTriangle
};

function drawGrid(ctx, width, height, spacing) {
  ctx.save();
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = 0; x <= width; x += spacing) {
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
  }
  for (let y = 0; y <= height; y += spacing) {
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
  }
  ctx.stroke();
  ctx.restore();
}

const CanvasBoard = forwardRef(function CanvasBoard({ shapes, grid }, ref) {
  const gridCanvasRef = useRef(null);
  const shapeCanvasRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    function resize() {
      const container = containerRef.current;
      const gridCanvas = gridCanvasRef.current;
      const shapeCanvas = shapeCanvasRef.current;
      if (!container || !gridCanvas || !shapeCanvas) return;

      const rect = container.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;

      [gridCanvas, shapeCanvas].forEach((canvas) => {
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        canvas.style.width = `${rect.width}px`;
        canvas.style.height = `${rect.height}px`;
      });

      const shapeCtx = shapeCanvas.getContext('2d');
      shapeCtx.scale(dpr, dpr);

      const gridCtx = gridCanvas.getContext('2d');
      gridCtx.scale(dpr, dpr);
    }

    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  useEffect(() => {
    const gridCanvas = gridCanvasRef.current;
    if (!gridCanvas) return;

    const ctx = gridCanvas.getContext('2d');
    const cssWidth = gridCanvas.width / (window.devicePixelRatio || 1);
    const cssHeight = gridCanvas.height / (window.devicePixelRatio || 1);

    ctx.clearRect(0, 0, cssWidth, cssHeight);
    if (grid?.visible) {
      drawGrid(ctx, cssWidth, cssHeight, grid.spacing);
    }
  }, [grid]);

  useEffect(() => {
    const canvas = shapeCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const cssWidth = canvas.width / (window.devicePixelRatio || 1);
    const cssHeight = canvas.height / (window.devicePixelRatio || 1);

    ctx.clearRect(0, 0, cssWidth, cssHeight);
    for (const shape of shapes) {
      const drawer = DRAWERS[shape.type];
      if (drawer) drawer(ctx, shape);
    }
  }, [shapes]);

  useImperativeHandle(ref, () => ({
    exportImage() {
      const canvas = shapeCanvasRef.current;
      return canvas ? canvas.toDataURL('image/png') : null;
    }
  }));

  return (
    <div ref={containerRef} className="canvas-board">
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

.canvas-grid,
.canvas-shapes {
  position: absolute;
  inset: 0;
  display: block;
  width: 100%;
  height: 100%;
}

.canvas-grid {
  z-index: 0;
}

.canvas-shapes {
  z-index: 1;
}
```

- [ ] **Step 3: Run tests and smoke test**

```bash
npm test
npm run dev
```

Open `http://localhost:5173`. The canvas should still show drawn shapes. Grid should be visible by default (light gray lines).

- [ ] **Step 4: Commit**

```bash
git add src/components/CanvasBoard.jsx src/styles/index.css
git commit -m "feat: render grid on separate canvas layer"
```

---

### Task 5: Wire grid state, feedback, and panel display

**Files:**
- Modify: `src/App.jsx`
- Modify: `src/components/CommandPanel.jsx`
- Modify: `README.md`
- Test: `npm test` + `npm run build`

- [ ] **Step 1: Update `App.jsx`**

1. Pass `grid` to `CanvasBoard`:

Replace:
```jsx
          <CanvasBoard ref={canvasRef} shapes={state.shapes} />
```

With:
```jsx
          <CanvasBoard ref={canvasRef} shapes={state.shapes} grid={state.grid} />
```

2. Add a status helper above the `App` component:

```javascript
function getGridFeedback(command) {
  switch (command.action) {
    case 'setGrid':
      return command.visible ? 'Grid shown' : 'Grid hidden';
    case 'setSnap':
      return command.snap ? 'Snap enabled' : 'Snap disabled';
    case 'setGridSize': {
      const presets = { small: 20, medium: 40, large: 80 };
      return `Grid spacing set to ${presets[command.size] || 40}px`;
    }
    default:
      return null;
  }
}
```

3. Update the speech result handler to show grid feedback:

Local parse path:
```javascript
          if (command) {
            command.forEach(runCommand);
            const lastCmd = command[command.length - 1];
            const feedback = getGridFeedback(lastCmd);
            setStatusMessage(feedback || `Executed: ${text}`);
          }
```

LLM parse path:
```javascript
              const commands = await parseWithLLM(text, LLM_API_KEY, LLM_API_ENDPOINT);
              commands.forEach(runCommand);
              const lastCmd = commands[commands.length - 1];
              const feedback = getGridFeedback(lastCmd);
              setStatusMessage(feedback || `Executed: ${text}`);
```

- [ ] **Step 2: Update `CommandPanel.jsx`**

1. Update the component signature:

```javascript
function CommandPanel({ statusMessage, currentCommand, grid, onUndo, onRedo, canUndo, canRedo, onClear, onSave }) {
```

2. Add grid status cards after the existing `command-cards` block:

Replace the closing `</div>` of `command-cards` (after the aesthetic style card) with grid cards included inside the same `command-cards` div:

```jsx
      <div className="command-cards">
        <div className="command-card">
          <span className="command-card-label">CURRENT ACTION</span>
          <span className="command-card-value">{currentCommand?.action || '—'}</span>
        </div>
        <div className="command-card">
          <span className="command-card-label">SUBJECT MATTER</span>
          <span className="command-card-value">{currentCommand?.shape || '—'}</span>
        </div>
        <div className="command-card">
          <span className="command-card-label">AESTHETIC STYLE</span>
          <span className="command-card-value">{currentCommand?.color || '—'}</span>
        </div>
        {grid && (
          <>
            <div className="command-card">
              <span className="command-card-label">GRID</span>
              <span className="command-card-value">{grid.visible ? 'On' : 'Off'}</span>
            </div>
            <div className="command-card">
              <span className="command-card-label">SNAP</span>
              <span className="command-card-value">{grid.snap ? 'On' : 'Off'}</span>
            </div>
            <div className="command-card">
              <span className="command-card-label">SPACING</span>
              <span className="command-card-value">{grid.spacing}px</span>
            </div>
          </>
        )}
      </div>
```

3. Pass `grid` from `App.jsx`:

```jsx
        <CommandPanel
          statusMessage={statusMessage}
          currentCommand={lastCommand}
          grid={state.grid}
          onUndo={undo}
          onRedo={redo}
          canUndo={state.undoStack.length > 0}
          canRedo={state.redoStack.length > 0}
          onClear={() => runCommand({ action: 'clear' })}
          onSave={saveCanvas}
        />
```

- [ ] **Step 3: Update `README.md`**

Add the following examples under the Voice Commands section (after the save example):

```markdown
- "显示网格"
- "隐藏网格"
- "打开吸附"
- "关闭吸附"
- "网格调大"
- "网格调小"
```

- [ ] **Step 4: Run full test suite and build**

```bash
npm test
npm run build
```

Expected: all tests PASS, build succeeds.

- [ ] **Step 5: Smoke test voice commands**

```bash
npm run dev
```

Open `http://localhost:5173`. Try:
- Draw a red rect.
- Use a temporary debug button or browser console to call `runCommand({ action: 'setGrid', visible: false })` — grid should hide.
- Call `runCommand({ action: 'setSnap', snap: true })` and draw again — shape should snap.
- Call `runCommand({ action: 'setGridSize', size: 'large' })` — grid spacing should increase.

- [ ] **Step 6: Commit**

```bash
git add src/App.jsx src/components/CommandPanel.jsx README.md
git commit -m "feat: wire grid state, feedback, and panel display"
```

---

## Self-Review Checklist

1. **Spec coverage:**
   - Snap helper → Task 1.
   - Grid command parsing → Task 2.
   - Grid state execution + draw snapping → Task 3.
   - Grid rendering on separate canvas → Task 4.
   - UI feedback and panel display → Task 5.
   - README → Task 5.

2. **Placeholder scan:** No TBD/TODO/fill-in details.

3. **Type consistency:** `grid` object shape `{ visible, snap, spacing }` used consistently across parser, executor, CanvasBoard, App, and CommandPanel.

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-06-13-grid-alignment.md`.

Two execution options:

1. **Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration.
2. **Inline Execution** — Execute tasks in this session using `superpowers:executing-plans`, batch execution with checkpoints.

Which approach would you like?
