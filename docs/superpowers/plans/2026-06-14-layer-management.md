# Layer Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add multi-layer management to VoiceCanvas so users can organize shapes into layers via voice commands, with layer visibility, switching, renaming, and deletion.

**Architecture:** Extend App state with `layers` and `currentLayerId`. Each shape carries a `layerId`. The executor handles layer CRUD actions. CanvasBoard filters rendering by layer visibility. A new `LayerPanel` component displays the layer list. Undo/redo snapshots include `{ shapes, layers, currentLayerId }`.

**Tech Stack:** Vite, React 18, HTML5 Canvas 2D, Vitest, Web Speech API.

---

## Files

| File | Responsibility |
|------|----------------|
| `src/services/commandParser.js` (modify) | Parse layer voice commands |
| `tests/commandParser.layer.test.js` (create) | Parser tests for layer commands |
| `src/services/executor.js` (modify) | Handle layer actions, attach `layerId` on draw, preserve layer state |
| `tests/executor.layer.test.js` (create) | Executor tests for layer CRUD and draw attribution |
| `src/components/CanvasBoard.jsx` (modify) | Filter shapes by layer visibility before rendering |
| `src/components/LayerPanel.jsx` (create) | Display layer list, current layer, visibility toggles |
| `src/App.jsx` (modify) | Manage `layers`/`currentLayerId`, pass to CanvasBoard/LayerPanel/CommandPanel, snapshot for undo/redo |
| `src/components/CommandPanel.jsx` (modify) | Show current layer name |
| `src/styles/index.css` (modify) | LayerPanel styles |
| `README.md` (modify) | Document new layer voice commands |

---

### Task 1: Parse layer commands

**Files:**
- Create: `tests/commandParser.layer.test.js`
- Modify: `src/services/commandParser.js`
- Test: `tests/commandParser.layer.test.js`

- [ ] **Step 1: Write the failing test**

Create `tests/commandParser.layer.test.js`:

```javascript
import { describe, it, expect } from 'vitest';
import { parseCommand } from '../src/services/commandParser';

describe('parseCommand - layer', () => {
  it('creates a new layer', () => {
    expect(parseCommand('新建图层')).toEqual([{ action: 'createLayer' }]);
    expect(parseCommand('创建新图层')).toEqual([{ action: 'createLayer' }]);
  });

  it('switches layer by index', () => {
    expect(parseCommand('切换到图层 2')).toEqual([{ action: 'switchLayer', target: '2' }]);
    expect(parseCommand('切到图层 3')).toEqual([{ action: 'switchLayer', target: '3' }]);
  });

  it('renames current layer', () => {
    expect(parseCommand('重命名当前图层为背景')).toEqual([{ action: 'renameLayer', name: '背景' }]);
  });

  it('hides current layer', () => {
    expect(parseCommand('隐藏当前图层')).toEqual([{ action: 'toggleLayerVisibility', visible: false }]);
  });

  it('shows current layer', () => {
    expect(parseCommand('显示当前图层')).toEqual([{ action: 'toggleLayerVisibility', visible: true }]);
  });

  it('deletes current layer', () => {
    expect(parseCommand('删除当前图层')).toEqual([{ action: 'deleteLayer' }]);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
npx vitest run tests/commandParser.layer.test.js
```

Expected: FAIL — layer commands return `null` or wrong shape.

- [ ] **Step 3: Extend `commandParser.js`**

Add helpers after existing helpers:

```javascript
function isLayerCommand(text) {
  return text.includes('图层') || text.includes('layer');
}

function parseLayerCommand(text) {
  if (text.includes('新建') || text.includes('创建')) {
    return { action: 'createLayer' };
  }

  if (text.includes('切换') || text.includes('切到')) {
    const match = text.match(/图层\s*(\d+)|layer\s*(\d+)/);
    if (match) return { action: 'switchLayer', target: match[1] };
    const nameMatch = text.match(/到\s*([^\s]+)$/);
    if (nameMatch) return { action: 'switchLayer', target: nameMatch[1] };
  }

  if (text.includes('重命名')) {
    const match = text.match(/为\s*(.+)/);
    return { action: 'renameLayer', name: match ? match[1].trim() : '未命名' };
  }

  if (text.includes('隐藏') || text.includes('关闭')) {
    return { action: 'toggleLayerVisibility', visible: false };
  }

  if (text.includes('显示') || text.includes('打开')) {
    return { action: 'toggleLayerVisibility', visible: true };
  }

  if (text.includes('删除')) {
    return { action: 'deleteLayer' };
  }

  return null;
}
```

Insert layer handling at the top of `parseCommand`, before background checks:

```javascript
export function parseCommand(text) {
  const normalized = text.toLowerCase().trim();

  if (isLayerCommand(normalized)) {
    const layerCmd = parseLayerCommand(normalized);
    if (layerCmd) return [layerCmd];
  }

  if (isBackgroundCommand(normalized)) {
    return [parseBackgroundCommand(normalized)];
  }

  // existing checks...
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
npx vitest run tests/commandParser.layer.test.js
```

Expected: 6 tests PASS.

- [ ] **Step 5: Regression check**

```bash
npx vitest run tests/commandParser.test.js tests/commandParser.background.test.js tests/commandParser.delete.test.js tests/commandParser.grid.test.js
```

Expected: existing parser tests still PASS.

- [ ] **Step 6: Commit**

```bash
git add tests/commandParser.layer.test.js src/services/commandParser.js
git commit -m "feat: parse voice layer commands"
```

---

### Task 2: Execute layer commands and attach layerId on draw

**Files:**
- Create: `tests/executor.layer.test.js`
- Modify: `src/services/executor.js`
- Test: `tests/executor.layer.test.js`

- [ ] **Step 1: Write the failing test**

Create `tests/executor.layer.test.js`:

```javascript
import { describe, it, expect } from 'vitest';
import { executeCommand, createInitialState } from '../src/services/executor';

describe('executeCommand - layer', () => {
  it('initial state includes default layer', () => {
    const state = createInitialState();
    expect(state.layers).toHaveLength(1);
    expect(state.layers[0].name).toBe('图层 1');
    expect(state.currentLayerId).toBe(state.layers[0].id);
  });

  it('creates a new layer and switches to it', () => {
    const state = createInitialState();
    const result = executeCommand({ action: 'createLayer' }, state, { width: 800, height: 600 });
    expect(result.layers).toHaveLength(2);
    expect(result.currentLayerId).toBe(result.layers[1].id);
  });

  it('switches layer by index', () => {
    const state = createInitialState();
    const created = executeCommand({ action: 'createLayer' }, state, { width: 800, height: 600 });
    const result = executeCommand({ action: 'switchLayer', target: '2' }, created, { width: 800, height: 600 });
    expect(result.currentLayerId).toBe(created.layers[1].id);
  });

  it('renames current layer', () => {
    const state = createInitialState();
    const result = executeCommand({ action: 'renameLayer', name: '背景' }, state, { width: 800, height: 600 });
    expect(result.layers[0].name).toBe('背景');
  });

  it('toggles layer visibility', () => {
    const state = createInitialState();
    const result = executeCommand({ action: 'toggleLayerVisibility', visible: false }, state, { width: 800, height: 600 });
    expect(result.layers[0].visible).toBe(false);
  });

  it('deletes current layer and its shapes', () => {
    const state = createInitialState();
    const withShape = executeCommand(
      { action: 'draw', shape: 'rect', color: 'red', position: 'center', size: 'medium' },
      state,
      { width: 800, height: 600 }
    );
    const created = executeCommand({ action: 'createLayer' }, withShape, { width: 800, height: 600 });
    const result = executeCommand({ action: 'deleteLayer' }, created, { width: 800, height: 600 });
    expect(result.layers).toHaveLength(1);
    expect(result.shapes).toHaveLength(0);
    expect(result.currentLayerId).toBe(result.layers[0].id);
  });

  it('does not delete the last layer', () => {
    const state = createInitialState();
    const result = executeCommand({ action: 'deleteLayer' }, state, { width: 800, height: 600 });
    expect(result.layers).toHaveLength(1);
  });

  it('attaches layerId when drawing', () => {
    const state = createInitialState();
    const result = executeCommand(
      { action: 'draw', shape: 'rect', color: 'red', position: 'center', size: 'medium' },
      state,
      { width: 800, height: 600 }
    );
    expect(result.shapes[0].layerId).toBe(state.currentLayerId);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
npx vitest run tests/executor.layer.test.js
```

Expected: FAIL — `layers`/`currentLayerId` not in state.

- [ ] **Step 3: Extend `executor.js`**

1. Add a helper to generate layer IDs and find layers:

```javascript
function generateLayerId() {
  return 'layer_' + Math.random().toString(36).slice(2, 9);
}

function findLayerByTarget(layers, target) {
  const index = parseInt(target, 10);
  if (!isNaN(index) && index >= 1 && index <= layers.length) {
    return layers[index - 1];
  }
  return layers.find(l => l.name === target) || null;
}
```

2. Update `createInitialState`:

```javascript
export function createInitialState() {
  const defaultLayer = { id: generateLayerId(), name: '图层 1', visible: true, locked: false };
  return {
    shapes: [],
    currentColor: '#3b82f6',
    undoStack: [],
    redoStack: [],
    history: [],
    shouldSave: false,
    grid: { visible: true, snap: true, spacing: 40 },
    background: { type: 'solid', color: '#ffffff' },
    layers: [defaultLayer],
    currentLayerId: defaultLayer.id
  };
}
```

3. Update existing branches to preserve `layers` and `currentLayerId`:

`draw`:
```javascript
      const newShape = {
        id: generateId(),
        type: command.shape,
        x: position.x,
        y: position.y,
        width: size.width,
        height: size.height,
        color: resolveColor(command.color || currentColor),
        layerId: state.currentLayerId
      };
      return { shapes: [...shapes, newShape], currentColor: newShape.color, grid, background, layers, currentLayerId: state.currentLayerId };
```

`delete`:
```javascript
      return { shapes, currentColor, removed: [], grid, background, layers, currentLayerId: state.currentLayerId };
```
and
```javascript
      return {
        shapes: shapes.filter(s => !targetIds.has(s.id)),
        currentColor,
        removed: targets,
        grid,
        background,
        layers,
        currentLayerId: state.currentLayerId
      };
```

`setColor`:
```javascript
      return { shapes, currentColor: resolveColor(command.color), grid, background, layers, currentLayerId: state.currentLayerId };
```

`clear`:
```javascript
      return { shapes: [], currentColor, grid, background, layers, currentLayerId: state.currentLayerId };
```

`save`:
```javascript
      return { shapes, currentColor, grid, background, layers, currentLayerId: state.currentLayerId, shouldSave: true };
```

`setGrid`/`setSnap`/`setGridSize` already use `{ ...state }` so they preserve layers automatically.

`setBackground` already uses `{ ...state }`.

`default`:
```javascript
    default:
      return { shapes, currentColor, grid, background, layers, currentLayerId: state.currentLayerId };
```

4. Add layer action cases before `default`:

```javascript
    case 'createLayer': {
      const newLayer = { id: generateLayerId(), name: `图层 ${layers.length + 1}`, visible: true, locked: false };
      return { ...state, layers: [...layers, newLayer], currentLayerId: newLayer.id };
    }
    case 'switchLayer': {
      const target = findLayerByTarget(layers, command.target);
      if (!target) return { ...state };
      return { ...state, currentLayerId: target.id };
    }
    case 'renameLayer': {
      return {
        ...state,
        layers: layers.map(l => l.id === state.currentLayerId ? { ...l, name: command.name } : l)
      };
    }
    case 'toggleLayerVisibility': {
      return {
        ...state,
        layers: layers.map(l => l.id === state.currentLayerId ? { ...l, visible: command.visible } : l)
      };
    }
    case 'deleteLayer': {
      if (layers.length <= 1) return { ...state };
      const newLayers = layers.filter(l => l.id !== state.currentLayerId);
      const newCurrentId = newLayers[0].id;
      return {
        ...state,
        layers: newLayers,
        currentLayerId: newCurrentId,
        shapes: shapes.filter(s => s.layerId !== state.currentLayerId)
      };
    }
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
npx vitest run tests/executor.layer.test.js
```

Expected: 8 tests PASS.

- [ ] **Step 5: Regression check**

```bash
npx vitest run tests/executor.test.js tests/executor.background.test.js tests/executor.delete.test.js tests/executor.grid.test.js
```

Expected: existing executor tests still PASS.

- [ ] **Step 6: Commit**

```bash
git add tests/executor.layer.test.js src/services/executor.js
git commit -m "feat: execute layer commands and attach layerId on draw"
```

---

### Task 3: Filter shapes by layer visibility in CanvasBoard

**Files:**
- Modify: `src/components/CanvasBoard.jsx`
- Test: existing tests + visual smoke test

- [ ] **Step 1: Update `CanvasBoard.jsx`**

Accept `layers` prop and filter shapes by visible layers before rendering:

```jsx
const CanvasBoard = forwardRef(function CanvasBoard({ shapes, background, grid, layers }, ref) {
```

Inside the shape rendering `useEffect`, compute visible layer IDs:

```javascript
  useEffect(() => {
    const canvas = shapeCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const cssWidth = canvas.width / dpr;
    const cssHeight = canvas.height / dpr;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cssWidth, cssHeight);

    const visibleLayerIds = new Set((layers || []).filter(l => l.visible).map(l => l.id));
    for (const shape of shapes) {
      if (!visibleLayerIds.has(shape.layerId)) continue;
      const drawer = DRAWERS[shape.type];
      if (drawer) drawer(ctx, shape);
    }
  }, [shapes, layers]);
```

- [ ] **Step 2: Run tests**

```bash
npm test
```

Expected: all tests PASS.

- [ ] **Step 3: Commit**

```bash
git add src/components/CanvasBoard.jsx
git commit -m "feat: filter rendered shapes by layer visibility"
```

---

### Task 4: Build LayerPanel component

**Files:**
- Create: `src/components/LayerPanel.jsx`
- Create: `tests/LayerPanel.test.js` (optional but recommended)
- Modify: `src/styles/index.css`
- Test: `tests/LayerPanel.test.js` and existing tests

- [ ] **Step 1: Create `LayerPanel.jsx`**

```jsx
function LayerPanel({ layers, currentLayerId, onSelectLayer, onToggleVisibility }) {
  return (
    <div className="layer-panel">
      <div className="layer-panel-header">
        <span className="layer-panel-title">Layers</span>
      </div>
      <ul className="layer-list">
        {[...layers].reverse().map((layer) => (
          <li
            key={layer.id}
            className={`layer-item ${layer.id === currentLayerId ? 'active' : ''}`}
            onClick={() => onSelectLayer(layer.id)}
          >
            <button
              type="button"
              className="layer-visibility-btn"
              onClick={(e) => {
                e.stopPropagation();
                onToggleVisibility(layer.id);
              }}
              aria-label={layer.visible ? 'Hide layer' : 'Show layer'}
            >
              {layer.visible ? '👁' : '🚫'}
            </button>
            <span className="layer-name">{layer.name}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default LayerPanel;
```

- [ ] **Step 2: Add styles**

Append to `src/styles/index.css`:

```css
.layer-panel {
  padding: 12px;
  background-color: #ffffff;
  border-radius: 12px;
  border: 1px solid #f1f5f9;
  margin-bottom: 12px;
}

.layer-panel-header {
  margin-bottom: 10px;
}

.layer-panel-title {
  font-size: 0.75rem;
  font-weight: 600;
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.layer-list {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.layer-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border-radius: 8px;
  cursor: pointer;
  transition: background-color 0.15s;
}

.layer-item:hover {
  background-color: #f8fafc;
}

.layer-item.active {
  background-color: #eef2ff;
}

.layer-visibility-btn {
  border: none;
  background: transparent;
  cursor: pointer;
  font-size: 0.9rem;
  padding: 0;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.layer-name {
  font-size: 0.85rem;
  font-weight: 500;
  color: #475569;
}
```

- [ ] **Step 3: Write a basic test**

Create `tests/LayerPanel.test.js`:

```javascript
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import LayerPanel from '../src/components/LayerPanel';

describe('LayerPanel', () => {
  it('renders layers and highlights current', () => {
    const layers = [
      { id: 'l1', name: '图层 1', visible: true, locked: false },
      { id: 'l2', name: '图层 2', visible: false, locked: false }
    ];
    render(
      <LayerPanel
        layers={layers}
        currentLayerId="l1"
        onSelectLayer={vi.fn()}
        onToggleVisibility={vi.fn()}
      />
    );
    expect(screen.getByText('图层 1')).toBeInTheDocument();
    expect(screen.getByText('图层 2')).toBeInTheDocument();
  });

  it('calls onToggleVisibility when visibility button clicked', () => {
    const layers = [{ id: 'l1', name: '图层 1', visible: true, locked: false }];
    const onToggle = vi.fn();
    render(
      <LayerPanel
        layers={layers}
        currentLayerId="l1"
        onSelectLayer={vi.fn()}
        onToggleVisibility={onToggle}
      />
    );
    fireEvent.click(screen.getByLabelText('Hide layer'));
    expect(onToggle).toHaveBeenCalledWith('l1');
  });
});
```

- [ ] **Step 4: Run tests**

```bash
npx vitest run tests/LayerPanel.test.js
```

Expected: 2 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/LayerPanel.jsx src/styles/index.css tests/LayerPanel.test.js
git commit -m "feat: add LayerPanel component"
```

---

### Task 5: Wire layer state, feedback, and panel display

**Files:**
- Modify: `src/App.jsx`
- Modify: `src/components/CommandPanel.jsx`
- Modify: `README.md`
- Test: `npm test` + `npm run build`

- [ ] **Step 1: Update `App.jsx`**

1. Import `LayerPanel`:

```javascript
import LayerPanel from './components/LayerPanel';
```

2. Add layer feedback helper:

```javascript
function getLayerFeedback(command, state) {
  switch (command.action) {
    case 'createLayer':
      return 'Layer created';
    case 'switchLayer': {
      const layer = state.layers.find(l => l.id === state.currentLayerId);
      return layer ? `Switched to ${layer.name}` : 'Layer switched';
    }
    case 'renameLayer':
      return `Layer renamed to ${command.name}`;
    case 'toggleLayerVisibility':
      return command.visible ? 'Layer shown' : 'Layer hidden';
    case 'deleteLayer':
      return 'Layer deleted';
    default:
      return null;
  }
}
```

3. Update `runCommand` to snapshot layers for undo/redo:

```javascript
  const runCommand = useCallback((command) => {
    setState(prev => {
      const { removed, ...next } = executeCommand(command, prev, canvasSize);
      feedbackRef.current = getCommandFeedback(command, { ...next, removed })
        || getLayerFeedback(command, next);
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
  }, [canvasSize]);
```

4. Update `undo` to restore layers:

```javascript
  const undo = useCallback(() => {
    setState(prev => {
      if (prev.undoStack.length === 0) return prev;
      const last = prev.undoStack[prev.undoStack.length - 1];
      return {
        ...prev,
        shapes: last.shapes,
        layers: last.layers,
        currentLayerId: last.currentLayerId,
        undoStack: prev.undoStack.slice(0, -1),
        redoStack: [...prev.redoStack, { shapes: prev.shapes, layers: prev.layers, currentLayerId: prev.currentLayerId }],
        shouldSave: false,
        lastRemoved: []
      };
    });
  }, []);
```

5. Update `redo`:

```javascript
  const redo = useCallback(() => {
    setState(prev => {
      if (prev.redoStack.length === 0) return prev;
      const next = prev.redoStack[prev.redoStack.length - 1];
      return {
        ...prev,
        shapes: next.shapes,
        layers: next.layers,
        currentLayerId: next.currentLayerId,
        redoStack: prev.redoStack.slice(0, -1),
        undoStack: [...prev.undoStack, { shapes: prev.shapes, layers: prev.layers, currentLayerId: prev.currentLayerId }],
        shouldSave: false,
        lastRemoved: []
      };
    });
  }, []);
```

6. Pass `layers` to `CanvasBoard`:

```jsx
          <CanvasBoard ref={canvasRef} shapes={state.shapes} background={state.background} grid={state.grid} layers={state.layers} />
```

7. Add layer handlers:

```javascript
  const handleToggleLayerVisibility = useCallback((layerId) => {
    const layer = state.layers.find(l => l.id === layerId);
    if (layer) {
      runCommand({ action: 'toggleLayerVisibility', visible: !layer.visible });
    }
  }, [state.layers, runCommand]);
```

Wait — `toggleLayerVisibility` currently toggles the *current* layer. To toggle any layer from the panel, we need to either switch first or extend the command. For simplicity, switch to the layer first then toggle:

```javascript
  const handleToggleLayerVisibility = useCallback((layerId) => {
    const layer = state.layers.find(l => l.id === layerId);
    if (!layer) return;
    if (state.currentLayerId !== layerId) {
      runCommand({ action: 'switchLayer', target: layerId });
    }
    runCommand({ action: 'toggleLayerVisibility', visible: !layer.visible });
  }, [state.layers, state.currentLayerId, runCommand]);
```

Better: extend executor to accept `layerId` in toggleLayerVisibility. Update the plan to support toggling any layer:

In executor:
```javascript
    case 'toggleLayerVisibility': {
      const targetId = command.layerId || state.currentLayerId;
      return {
        ...state,
        layers: layers.map(l => l.id === targetId ? { ...l, visible: command.visible } : l)
      };
    }
```

Update parser to still produce commands for current layer (no layerId), and panel to pass layerId.

8. Insert `LayerPanel` into the layout, in the right sidebar before `CommandPanel`:

```jsx
        <LayerPanel
          layers={state.layers}
          currentLayerId={state.currentLayerId}
          onSelectLayer={(id) => runCommand({ action: 'switchLayer', target: id })}
          onToggleVisibility={handleToggleLayerVisibility}
        />
        <CommandPanel
          ...
          currentLayerId={state.currentLayerId}
          layers={state.layers}
        />
```

- [ ] **Step 2: Update `CommandPanel.jsx`**

1. Accept `layers` and `currentLayerId`:

```javascript
function CommandPanel({ statusMessage, currentCommand, lastRemoved, background, grid, layers, currentLayerId, onUndo, onRedo, canUndo, canRedo, onClear, onSave }) {
```

2. Compute current layer name:

```javascript
  const currentLayer = layers?.find(l => l.id === currentLayerId);
```

3. Add current layer card inside `command-cards`:

```jsx
        <div className="command-card">
          <span className="command-card-label">CURRENT LAYER</span>
          <span className="command-card-value">{currentLayer?.name || '—'}</span>
        </div>
```

- [ ] **Step 3: Update `README.md`**

Add under Voice Commands:

```markdown
- "新建图层"
- "切换到图层 2"
- "重命名当前图层为背景"
- "隐藏当前图层"
- "显示当前图层"
- "删除当前图层"
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

Open `http://localhost:5173`. Try:
- Click "Draw Red Rect" — shape appears on current layer.
- Say "新建图层" — new layer created and selected.
- Say "切换到图层 1" — switches back.
- Say "隐藏当前图层" — shapes on current layer disappear.
- Say "删除当前图层" — layer and its shapes removed.

- [ ] **Step 6: Commit**

```bash
git add src/App.jsx src/components/CommandPanel.jsx README.md
git commit -m "feat: wire layer state, feedback, and panel display"
```

---

## Self-Review Checklist

1. **Spec coverage:**
   - Layer command parsing → Task 1.
   - Layer state execution + draw attribution → Task 2.
   - Layer visibility filtering in CanvasBoard → Task 3.
   - LayerPanel UI → Task 4.
   - App state wiring + undo/redo snapshots + README → Task 5.

2. **Placeholder scan:** No TBD/TODO/fill-in details.

3. **Type consistency:** `layers` shape `{ id, name, visible, locked }`, `currentLayerId` string, `shape.layerId` string used consistently across parser, executor, CanvasBoard, App, LayerPanel, and CommandPanel.

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-06-14-layer-management.md`. Two execution options:

1. **Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration.
2. **Inline Execution** — Execute tasks in this session using `superpowers:executing-plans`, batch execution with checkpoints.

Which approach would you like?
