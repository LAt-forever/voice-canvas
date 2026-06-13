# Delete Shapes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add voice-controlled deletion of specific shapes on the VoiceCanvas main canvas.

**Architecture:** Introduce a small `shapeMatcher` service that selects target shapes from filters. Extend the existing local-rule `commandParser` to produce `delete` commands and the `executor` to apply them. `App` consumes the result to update status and the right panel.

**Tech Stack:** Vite, React 18, HTML5 Canvas 2D, Vitest, Web Speech API.

---

## Files

| File | Responsibility |
|------|----------------|
| `src/services/shapeMatcher.js` (create) | Pure function `findMatchingShapes(shapes, filters, canvasSize)` |
| `src/services/commandParser.js` (modify) | Detect delete intent and extract filters |
| `src/services/executor.js` (modify) | Execute `delete` command by removing matched shapes |
| `src/App.jsx` (modify) | Wire feedback/status and pass `lastRemoved` to panel |
| `src/components/CommandPanel.jsx` (modify) | Render delete action, shape, and color |
| `tests/shapeMatcher.test.js` (create) | Unit tests for matcher |
| `tests/commandParser.delete.test.js` (create) | Unit tests for delete parsing |
| `tests/executor.delete.test.js` (create) | Unit tests for delete execution |

---

### Task 1: Create the shape matcher

**Files:**
- Create: `tests/shapeMatcher.test.js`
- Create: `src/services/shapeMatcher.js`
- Test: `tests/shapeMatcher.test.js`

- [ ] **Step 1: Write the failing test**

Create `tests/shapeMatcher.test.js`:

```javascript
import { describe, it, expect } from 'vitest';
import { findMatchingShapes } from '../src/services/shapeMatcher';

const canvasSize = { width: 800, height: 600 };

function makeShape(overrides) {
  return {
    id: '1',
    type: 'rect',
    x: 400,
    y: 300,
    width: 160,
    height: 120,
    color: '#3b82f6',
    ...overrides
  };
}

describe('findMatchingShapes', () => {
  it('returns empty array for empty shapes', () => {
    expect(findMatchingShapes([], { last: true }, canvasSize)).toEqual([]);
  });

  it('matches last shape', () => {
    const s1 = makeShape({ id: 'a', color: '#ef4444' });
    const s2 = makeShape({ id: 'b', color: '#22c55e' });
    expect(findMatchingShapes([s1, s2], { last: true }, canvasSize)).toEqual([s2]);
  });

  it('filters by color', () => {
    const s1 = makeShape({ id: 'a', color: '#ef4444' });
    const s2 = makeShape({ id: 'b', color: '#22c55e' });
    expect(findMatchingShapes([s1, s2], { color: 'red' }, canvasSize)).toEqual([s1]);
  });

  it('filters by shape type', () => {
    const s1 = makeShape({ id: 'a', type: 'rect' });
    const s2 = makeShape({ id: 'b', type: 'circle' });
    expect(findMatchingShapes([s1, s2], { shape: 'circle' }, canvasSize)).toEqual([s2]);
  });

  it('picks nearest shape to position', () => {
    const s1 = makeShape({ id: 'a', x: 40, y: 40 });
    const s2 = makeShape({ id: 'b', x: 760, y: 40 });
    expect(findMatchingShapes([s1, s2], { position: 'top-left' }, canvasSize)).toEqual([s1]);
  });

  it('returns all matches when all flag set', () => {
    const s1 = makeShape({ id: 'a', color: '#ef4444' });
    const s2 = makeShape({ id: 'b', color: '#ef4444' });
    const s3 = makeShape({ id: 'c', color: '#22c55e' });
    expect(findMatchingShapes([s1, s2, s3], { color: 'red', all: true }, canvasSize)).toEqual([s1, s2]);
  });

  it('combines multiple filters', () => {
    const s1 = makeShape({ id: 'a', type: 'rect', color: '#ef4444', x: 40, y: 40 });
    const s2 = makeShape({ id: 'b', type: 'rect', color: '#ef4444', x: 760, y: 40 });
    const s3 = makeShape({ id: 'c', type: 'circle', color: '#ef4444', x: 40, y: 40 });
    const result = findMatchingShapes([s1, s2, s3], { shape: 'rect', color: 'red', position: 'top-left' }, canvasSize);
    expect(result).toEqual([s1]);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
npx vitest run tests/shapeMatcher.test.js
```

Expected: FAIL — `findMatchingShapes is not exported` or module not found.

- [ ] **Step 3: Write the minimal implementation**

Create `src/services/shapeMatcher.js`:

```javascript
import { resolveColor } from '../utils/colorMap';
import { resolvePosition } from '../utils/positionResolver';
import { SIZE_PRESETS } from '../utils/sizeResolver';

function distance(shape, anchor) {
  const dx = shape.x - anchor.x;
  const dy = shape.y - anchor.y;
  return Math.hypot(dx, dy);
}

function shapeMatchesBaseFilters(shape, filters) {
  if (filters.color && shape.color !== resolveColor(filters.color)) {
    return false;
  }
  if (filters.shape && shape.type !== filters.shape) {
    return false;
  }
  if (filters.size) {
    const preset = SIZE_PRESETS[filters.size] || SIZE_PRESETS.medium;
    const targetArea = preset.width * preset.height;
    const area = shape.width * shape.height;
    const ratio = Math.max(area, targetArea) / Math.max(Math.min(area, targetArea), 1);
    if (ratio > 2) return false;
  }
  return true;
}

export function findMatchingShapes(shapes, filters, canvasSize) {
  if (filters.last) {
    const last = shapes[shapes.length - 1];
    if (!last) return [];
    return shapeMatchesBaseFilters(last, filters) ? [last] : [];
  }

  let candidates = shapes.filter(s => shapeMatchesBaseFilters(s, filters));

  if (filters.position && candidates.length > 0) {
    const anchor = resolvePosition(filters.position, canvasSize.width, canvasSize.height);
    candidates = candidates.slice().sort((a, b) => distance(a, anchor) - distance(b, anchor));
  }

  if (candidates.length === 0) return [];
  if (filters.all) return candidates;
  return [candidates[0]];
}
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
npx vitest run tests/shapeMatcher.test.js
```

Expected: 7 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add tests/shapeMatcher.test.js src/services/shapeMatcher.js
git commit -m "feat: add shape matcher for delete commands"
```

---

### Task 2: Parse delete commands

**Files:**
- Create: `tests/commandParser.delete.test.js`
- Modify: `src/services/commandParser.js`
- Test: `tests/commandParser.delete.test.js`

- [ ] **Step 1: Write the failing test**

Create `tests/commandParser.delete.test.js`:

```javascript
import { describe, it, expect } from 'vitest';
import { parseCommand } from '../src/services/commandParser';

describe('parseCommand - delete', () => {
  it('deletes last shape by default', () => {
    expect(parseCommand('删除')).toEqual([{ action: 'delete', filters: { last: true } }]);
  });

  it('deletes last shape explicitly', () => {
    expect(parseCommand('删除最后一个图形')).toEqual([{ action: 'delete', filters: { last: true } }]);
  });

  it('deletes by color, shape and position', () => {
    expect(parseCommand('删掉左上角的红方块')).toEqual([{
      action: 'delete',
      filters: { color: '#ef4444', shape: 'rect', position: '左上角' }
    }]);
  });

  it('deletes all matching color', () => {
    expect(parseCommand('删除所有红色的图形')).toEqual([{
      action: 'delete',
      filters: { color: '#ef4444', all: true }
    }]);
  });

  it('deletes all matching shape', () => {
    expect(parseCommand('把所有圆都删掉')).toEqual([{
      action: 'delete',
      filters: { shape: 'circle', all: true }
    }]);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
npx vitest run tests/commandParser.delete.test.js
```

Expected: FAIL — delete commands return `null`.

- [ ] **Step 3: Extend `commandParser.js`**

Modify `src/services/commandParser.js`:

1. Add helper functions after `detectSize`:

```javascript
const POSITION_KEYWORDS = [
  '左上角', '右上角', '左下角', '右下角',
  '左上', '右上', '左下', '右下',
  '上方', '下方', '左边', '右边',
  '上', '下', '左', '右',
  '中间', '中央', '中心', 'center'
];

function extractPosition(text) {
  for (const pos of POSITION_KEYWORDS) {
    if (text.includes(pos)) return pos;
  }
  return null;
}

function extractSize(text) {
  if (text.includes('大')) return 'large';
  if (text.includes('小')) return 'small';
  return null;
}

function isDeleteCommand(text) {
  const keywords = ['删', 'remove', 'delete', 'erase'];
  return keywords.some(k => text.includes(k));
}

function parseDeleteCommand(text) {
  const normalized = text.toLowerCase().trim();
  const filters = {};

  if (normalized.includes('最后一个') || normalized.includes('last')) {
    filters.last = true;
  }
  if (normalized.includes('所有') || normalized.includes('全部') || normalized.includes('all')) {
    filters.all = true;
  }

  const color = detectColor(normalized);
  if (color) filters.color = color;

  const shape = detectShape(normalized);
  if (shape) filters.shape = shape;

  const position = extractPosition(normalized);
  if (position) filters.position = position;

  const size = extractSize(normalized);
  if (size) filters.size = size;

  if (Object.keys(filters).length === 0) {
    filters.last = true;
  }

  return { action: 'delete', filters };
}
```

2. Insert delete handling at the top of `parseCommand` before the undo/redo checks:

```javascript
export function parseCommand(text) {
  const normalized = text.toLowerCase().trim();

  if (isDeleteCommand(normalized)) {
    return [parseDeleteCommand(normalized)];
  }

  // existing undo/redo/clear/save checks...
```

The rest of `parseCommand` stays unchanged.

- [ ] **Step 4: Run the test to verify it passes**

```bash
npx vitest run tests/commandParser.delete.test.js
```

Expected: 5 tests PASS.

- [ ] **Step 5: Regression check**

```bash
npx vitest run tests/commandParser.test.js
```

Expected: existing parser tests still PASS.

- [ ] **Step 6: Commit**

```bash
git add tests/commandParser.delete.test.js src/services/commandParser.js
git commit -m "feat: parse voice delete commands"
```

---

### Task 3: Execute delete commands

**Files:**
- Create: `tests/executor.delete.test.js`
- Modify: `src/services/executor.js`
- Test: `tests/executor.delete.test.js`

- [ ] **Step 1: Write the failing test**

Create `tests/executor.delete.test.js`:

```javascript
import { describe, it, expect } from 'vitest';
import { executeCommand } from '../src/services/executor';

describe('executeCommand - delete', () => {
  it('removes the last shape when filters.last is true', () => {
    const state = {
      shapes: [
        { id: 'a', type: 'rect', x: 100, y: 100, width: 100, height: 100, color: '#ef4444' },
        { id: 'b', type: 'circle', x: 200, y: 200, width: 100, height: 100, color: '#3b82f6' }
      ],
      currentColor: '#000000'
    };
    const result = executeCommand({ action: 'delete', filters: { last: true } }, state, { width: 800, height: 600 });
    expect(result.shapes).toHaveLength(1);
    expect(result.shapes[0].id).toBe('a');
    expect(result.removed).toHaveLength(1);
    expect(result.removed[0].id).toBe('b');
  });

  it('removes all shapes matching color when filters.all is true', () => {
    const state = {
      shapes: [
        { id: 'a', type: 'rect', x: 100, y: 100, width: 100, height: 100, color: '#ef4444' },
        { id: 'b', type: 'circle', x: 200, y: 200, width: 100, height: 100, color: '#ef4444' },
        { id: 'c', type: 'rect', x: 300, y: 300, width: 100, height: 100, color: '#22c55e' }
      ],
      currentColor: '#000000'
    };
    const result = executeCommand({ action: 'delete', filters: { color: 'red', all: true } }, state, { width: 800, height: 600 });
    expect(result.shapes).toHaveLength(1);
    expect(result.shapes[0].id).toBe('c');
    expect(result.removed).toHaveLength(2);
  });

  it('returns empty removed array when no match', () => {
    const state = {
      shapes: [{ id: 'a', type: 'rect', x: 100, y: 100, width: 100, height: 100, color: '#ef4444' }],
      currentColor: '#000000'
    };
    const result = executeCommand({ action: 'delete', filters: { color: 'blue' } }, state, { width: 800, height: 600 });
    expect(result.shapes).toHaveLength(1);
    expect(result.removed).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
npx vitest run tests/executor.delete.test.js
```

Expected: FAIL — `delete` action falls through to default.

- [ ] **Step 3: Extend `executor.js`**

Modify `src/services/executor.js`:

1. Add import at the top:

```javascript
import { findMatchingShapes } from './shapeMatcher';
```

2. Add `delete` case inside `executeCommand`:

```javascript
    case 'delete': {
      const targets = findMatchingShapes(shapes, command.filters, canvasSize);
      if (targets.length === 0) {
        return { shapes, currentColor, removed: [] };
      }
      const targetIds = new Set(targets.map(t => t.id));
      return {
        shapes: shapes.filter(s => !targetIds.has(s.id)),
        currentColor,
        removed: targets
      };
    }
```

Place it after the `draw` case and before `setColor`.

3. Update `createInitialState` to include `lastRemoved`:

```javascript
export function createInitialState() {
  return {
    shapes: [],
    currentColor: '#3b82f6',
    undoStack: [],
    redoStack: [],
    history: [],
    shouldSave: false,
    lastRemoved: []
  };
}
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
npx vitest run tests/executor.delete.test.js
```

Expected: 3 tests PASS.

- [ ] **Step 5: Regression check**

```bash
npx vitest run tests/executor.test.js
```

Expected: existing executor tests still PASS.

- [ ] **Step 6: Commit**

```bash
git add tests/executor.delete.test.js src/services/executor.js
git commit -m "feat: execute delete commands with matching"
```

---

### Task 4: Wire status and panel feedback

**Files:**
- Modify: `src/App.jsx`
- Modify: `src/components/CommandPanel.jsx`
- Test: `npm test`

- [ ] **Step 1: Add a status feedback helper**

Add this helper above the `App` component in `src/App.jsx`:

```javascript
function getCommandFeedback(command, result) {
  if (command.action === 'delete') {
    const count = result.removed?.length || 0;
    if (count === 0) return 'No matching shape found';
    return `Deleted ${count} shape${count > 1 ? 's' : ''}`;
  }
  return null;
}
```

- [ ] **Step 2: Update `runCommand` in `App.jsx`**

Replace the existing `runCommand` callback with:

```javascript
  const runCommand = useCallback((command) => {
    let feedback = null;
    setState(prev => {
      const next = executeCommand(command, prev, canvasSize);
      feedback = getCommandFeedback(command, next);
      return {
        shapes: next.shapes,
        currentColor: next.currentColor,
        shouldSave: next.shouldSave || false,
        lastRemoved: next.removed || [],
        undoStack: [...prev.undoStack, prev.shapes],
        redoStack: [],
        history: [...(prev.history || []), command]
      };
    });
    if (feedback) setStatusMessage(feedback);
  }, [canvasSize]);
```

- [ ] **Step 3: Avoid overwriting delete feedback in speech results**

In `src/App.jsx`, find the two places where `setStatusMessage(\`Executed: ${text}\`)` is called and guard them so delete feedback is preserved.

First location (local parse):

```javascript
          if (command) {
            command.forEach(runCommand);
            const lastCmd = command[command.length - 1];
            if (lastCmd?.action !== 'delete') {
              setStatusMessage(`Executed: ${text}`);
            }
          }
```

Second location (LLM parse):

```javascript
              const commands = await parseWithLLM(text, LLM_API_KEY, LLM_API_ENDPOINT);
              commands.forEach(runCommand);
              const lastCmd = commands[commands.length - 1];
              if (lastCmd?.action !== 'delete') {
                setStatusMessage(`Executed: ${text}`);
              }
```

- [ ] **Step 4: Pass `lastRemoved` to `CommandPanel`**

Update the `CommandPanel` JSX in `src/App.jsx`:

```jsx
        <CommandPanel
          statusMessage={statusMessage}
          currentCommand={lastCommand}
          lastRemoved={state.lastRemoved}
          onUndo={undo}
          onRedo={redo}
          canUndo={state.undoStack.length > 0}
          canRedo={state.redoStack.length > 0}
          onClear={() => runCommand({ action: 'clear' })}
          onSave={saveCanvas}
        />
```

- [ ] **Step 5: Update `CommandPanel.jsx`**

Modify `src/components/CommandPanel.jsx`:

1. Update the component signature:

```javascript
function CommandPanel({ statusMessage, currentCommand, lastRemoved, onUndo, onRedo, canUndo, canRedo, onClear, onSave }) {
```

2. Compute display labels before the return statement:

```javascript
  const isDelete = currentCommand?.action === 'delete';
  const subjectMatter = isDelete
    ? (lastRemoved?.length > 1 ? 'multiple' : lastRemoved?.[0]?.shape || '—')
    : currentCommand?.shape || '—';
  const aestheticStyle = isDelete
    ? lastRemoved?.[0]?.color || '—'
    : currentCommand?.color || '—';
```

3. Use the computed labels in JSX:

Replace:

```jsx
        <div className="command-card">
          <span className="command-card-label">SUBJECT MATTER</span>
          <span className="command-card-value">{currentCommand?.shape || '—'}</span>
        </div>
        <div className="command-card">
          <span className="command-card-label">AESTHETIC STYLE</span>
          <span className="command-card-value">{currentCommand?.color || '—'}</span>
        </div>
```

With:

```jsx
        <div className="command-card">
          <span className="command-card-label">SUBJECT MATTER</span>
          <span className="command-card-value">{subjectMatter}</span>
        </div>
        <div className="command-card">
          <span className="command-card-label">AESTHETIC STYLE</span>
          <span className="command-card-value">{aestheticStyle}</span>
        </div>
```

- [ ] **Step 6: Run the full test suite**

```bash
npm test
```

Expected: all tests PASS.

- [ ] **Step 7: Start dev server and smoke test**

```bash
npm run dev
```

Open `http://localhost:5173`. Use the debug buttons to draw a few shapes, then try the browser console:

```javascript
window.__runCommand({ action: 'delete', filters: { last: true } });
```

If `runCommand` is not exposed, test by adding a temporary debug button in `App.jsx` or by using voice.

Verify:
- Last shape disappears.
- Status shows "Deleted 1 shape".
- Revert Last restores it.

- [ ] **Step 8: Commit**

```bash
git add src/App.jsx src/components/CommandPanel.jsx
git commit -m "feat: wire delete feedback into UI"
```

---

## Self-Review Checklist

1. **Spec coverage:**
   - Delete last shape → Task 3 + Task 4.
   - Delete by description → Task 2 (parsing) + Task 1/3 (matching).
   - Batch delete → Task 1 `all` flag + Task 3.
   - UI feedback → Task 4.
   - Tests → Every task includes tests.

2. **Placeholder scan:** No TBD/TODO/fill-in details.

3. **Type consistency:** `delete` command uses `filters` object across parser, executor, matcher, and UI. `removed` array is produced by executor and consumed by App as `lastRemoved`.

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-06-13-delete-shapes.md`.

Two execution options:

1. **Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration.
2. **Inline Execution** — Execute tasks in this session using `superpowers:executing-plans`, batch execution with checkpoints.

Which approach would you like?
