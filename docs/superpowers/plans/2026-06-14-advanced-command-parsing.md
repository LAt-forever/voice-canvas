# Advanced Command Parsing Panel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an advanced command parsing panel that displays LLM-generated multi-step plans and waits for voice or button confirmation before executing them.

**Architecture:** A new `describeCommand` utility translates JSON commands into human-readable Chinese descriptions. `App.jsx` holds a `pendingPlan` state, intercepts confirmation/cancellation voice keywords, and renders the new `CommandPlanPanel` component. A 5-second auto-cancel timeout prevents stale plans.

**Tech Stack:** Vite + React 18 + Vitest + jsdom. Existing speech recognizer and LLM parser are reused.

---

## Files

| File | Responsibility |
|------|----------------|
| `src/utils/describeCommand.js` (create) | Convert one command object into a Chinese natural-language description |
| `tests/describeCommand.test.js` (create) | Unit tests for `describeCommand` |
| `src/utils/confirmationMatcher.js` (create) | Detect confirmation/cancellation keywords in voice transcript |
| `tests/confirmationMatcher.test.js` (create) | Unit tests for confirmation matcher |
| `src/components/CommandPlanPanel.jsx` (create) | UI card showing plan steps, countdown, Confirm/Cancel buttons |
| `tests/CommandPlanPanel.test.jsx` (create) | Render and interaction tests for the panel |
| `src/App.jsx` (modify) | Add `pendingPlan` state, confirmation flow, timeout, render panel |
| `src/styles/index.css` (modify) | Styles for the command plan panel |
| `README.md` (modify) | Document advanced command parsing and confirmation words |

---

### Task 1: Command description utility

**Files:**
- Create: `src/utils/describeCommand.js`
- Test: `tests/describeCommand.test.js`

- [ ] **Step 1: Write the failing test**

Create `tests/describeCommand.test.js`:

```javascript
import { describe, it, expect } from 'vitest';
import { describeCommand } from '../src/utils/describeCommand';

describe('describeCommand', () => {
  it('describes a draw command', () => {
    const cmd = { action: 'draw', shape: 'circle', color: 'red', position: 'center', size: 'medium' };
    expect(describeCommand(cmd)).toContain('画');
    expect(describeCommand(cmd)).toContain('红色');
    expect(describeCommand(cmd)).toContain('圆形');
  });

  it('describes setColor', () => {
    const cmd = { action: 'setColor', color: 'blue' };
    expect(describeCommand(cmd)).toContain('当前颜色');
    expect(describeCommand(cmd)).toContain('蓝色');
  });

  it('describes solid background', () => {
    const cmd = { action: 'setBackground', background: { type: 'solid', color: '#ff0000' } };
    expect(describeCommand(cmd)).toContain('背景');
  });

  it('describes createLayer', () => {
    const cmd = { action: 'createLayer' };
    expect(describeCommand(cmd)).toContain('新建');
    expect(describeCommand(cmd)).toContain('图层');
  });

  it('describes grid toggle', () => {
    expect(describeCommand({ action: 'setGrid', visible: true })).toContain('显示网格');
    expect(describeCommand({ action: 'setGrid', visible: false })).toContain('隐藏网格');
  });

  it('falls back to JSON for unknown commands', () => {
    const cmd = { action: 'magic', foo: 'bar' };
    expect(describeCommand(cmd)).toContain('magic');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/describeCommand.test.js`

Expected: FAIL with "Cannot find module '../src/utils/describeCommand'" or similar.

- [ ] **Step 3: Write minimal implementation**

Create `src/utils/describeCommand.js`:

```javascript
const SHAPE_NAMES = {
  rect: '矩形',
  circle: '圆形',
  line: '直线',
  triangle: '三角形'
};

const SIZE_NAMES = {
  small: '小号',
  medium: '中号',
  large: '大号'
};

const POSITION_NAMES = {
  center: '中心',
  'top-left': '左上角',
  'top-right': '右上角',
  'bottom-left': '左下角',
  'bottom-right': '右下角',
  top: '上方',
  bottom: '下方',
  left: '左边',
  right: '右边'
};

const DIRECTION_NAMES = {
  'to-right': '从左到右',
  'to-left': '从右到左',
  'to-bottom': '从上到下',
  'to-top': '从下到上',
  'to-bottom-right': '从左上到右下',
  'to-bottom-left': '从右上到左下',
  'to-top-right': '从左下到右上',
  'to-top-left': '从右下到左上'
};

const COLOR_MAP = {
  '#ef4444': '红色',
  '#22c55e': '绿色',
  '#3b82f6': '蓝色',
  '#eab308': '黄色',
  '#a855f7': '紫色',
  '#f97316': '橙色',
  '#ec4899': '粉色',
  '#06b6d4': '青色',
  '#000000': '黑色',
  '#ffffff': '白色',
  '#6b7280': '灰色'
};

function colorName(color) {
  if (!color) return '';
  const normalized = String(color).toLowerCase();
  if (COLOR_MAP[normalized]) return COLOR_MAP[normalized];
  const names = {
    red: '红色', green: '绿色', blue: '蓝色', yellow: '黄色',
    purple: '紫色', orange: '橙色', pink: '粉色', cyan: '青色',
    black: '黑色', white: '白色', gray: '灰色'
  };
  return names[normalized] || color;
}

export function describeCommand(command) {
  switch (command.action) {
    case 'draw': {
      const shape = SHAPE_NAMES[command.shape] || command.shape || '图形';
      const col = colorName(command.color);
      const pos = POSITION_NAMES[command.position] || command.position || '中心';
      const size = SIZE_NAMES[command.size] || command.size || '中号';
      return `在${pos}画一个${col}${size}${shape}`;
    }
    case 'setColor':
      return `将当前颜色设置为${colorName(command.color)}`;
    case 'setBackground': {
      const bg = command.background || {};
      if (bg.type === 'solid') {
        return `将背景设置为${colorName(bg.color)}纯色`;
      }
      if (bg.type === 'gradient') {
        const dir = DIRECTION_NAMES[bg.direction] || '';
        return `将背景设置为${dir}${colorName(bg.color)}到${colorName(bg.color2)}渐变`;
      }
      if (bg.type === 'pattern') {
        const subtype = bg.subtype === 'stripes' ? '条纹' : bg.subtype === 'checkerboard' ? '棋盘格' : '点阵';
        return `将背景设置为${subtype}${colorName(bg.color)}与${colorName(bg.color2)}图案`;
      }
      if (bg.type === 'texture') {
        const subtype = bg.subtype === 'starry' ? '星空' : '噪点';
        return `将背景设置为${subtype}${colorName(bg.color)}纹理`;
      }
      return '设置背景';
    }
    case 'setGrid':
      return command.visible ? '显示网格' : '隐藏网格';
    case 'setSnap':
      return command.snap ? '开启网格吸附' : '关闭网格吸附';
    case 'setGridSize': {
      const sizeMap = { small: '小', medium: '中', large: '大' };
      return `设置网格间距为${sizeMap[command.size] || command.size}`;
    }
    case 'createLayer':
      return '新建一个图层并切换到它';
    case 'switchLayer':
      return `切换到图层 ${command.target}`;
    case 'renameLayer':
      return `将当前图层重命名为“${command.name}”`;
    case 'toggleLayerVisibility':
      return command.visible ? '显示当前图层' : '隐藏当前图层';
    case 'deleteLayer':
      return '删除当前图层及其图形';
    case 'undo':
      return '撤销上一步';
    case 'redo':
      return '重做上一步';
    case 'clear':
      return '清空画布';
    case 'save':
      return '保存图片';
    case 'delete':
      return '删除符合条件的图形';
    default:
      return `未知命令：${JSON.stringify(command)}`;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/describeCommand.test.js`

Expected: PASS (6/6).

- [ ] **Step 5: Commit**

```bash
git add src/utils/describeCommand.js tests/describeCommand.test.js
git commit -m "feat: 添加命令描述生成工具"
```

---

### Task 2: Voice confirmation matcher

**Files:**
- Create: `src/utils/confirmationMatcher.js`
- Test: `tests/confirmationMatcher.test.js`

- [ ] **Step 1: Write the failing test**

Create `tests/confirmationMatcher.test.js`:

```javascript
import { describe, it, expect } from 'vitest';
import { isConfirm, isCancel } from '../src/utils/confirmationMatcher';

describe('confirmationMatcher', () => {
  it('detects confirm keywords', () => {
    expect(isConfirm('确认')).toBe(true);
    expect(isConfirm('执行')).toBe(true);
    expect(isConfirm('好的开始')).toBe(true);
    expect(isConfirm('取消')).toBe(false);
  });

  it('detects cancel keywords', () => {
    expect(isCancel('取消')).toBe(true);
    expect(isCancel('放弃')).toBe(true);
    expect(isCancel('不要算了')).toBe(true);
    expect(isCancel('确认')).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/confirmationMatcher.test.js`

Expected: FAIL with module not found.

- [ ] **Step 3: Write minimal implementation**

Create `src/utils/confirmationMatcher.js`:

```javascript
const CONFIRM_KEYWORDS = ['确认', '执行', '开始', '好'];
const CANCEL_KEYWORDS = ['取消', '放弃', '不', '算了'];

export function isConfirm(text) {
  return CONFIRM_KEYWORDS.some(keyword => text.includes(keyword));
}

export function isCancel(text) {
  return CANCEL_KEYWORDS.some(keyword => text.includes(keyword));
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/confirmationMatcher.test.js`

Expected: PASS (2/2).

- [ ] **Step 5: Commit**

```bash
git add src/utils/confirmationMatcher.js tests/confirmationMatcher.test.js
git commit -m "feat: 添加语音确认/取消关键词匹配"
```

---

### Task 3: Command plan panel component

**Files:**
- Create: `src/components/CommandPlanPanel.jsx`
- Test: `tests/CommandPlanPanel.test.jsx`

- [ ] **Step 1: Write the failing test**

Create `tests/CommandPlanPanel.test.jsx`:

```javascript
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import CommandPlanPanel from '../src/components/CommandPlanPanel';

describe('CommandPlanPanel', () => {
  it('renders plan steps and buttons', () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    render(
      <CommandPlanPanel
        descriptions={['画一个红色圆形', '设置背景为蓝色']}
        timeoutMs={5000}
        onConfirm={onConfirm}
        onCancel={onCancel}
      />
    );

    expect(screen.getByText('识别到多步计划')).toBeInTheDocument();
    expect(screen.getByText('画一个红色圆形')).toBeInTheDocument();
    expect(screen.getByText('设置背景为蓝色')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /确认执行/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /取消/i })).toBeInTheDocument();
  });

  it('calls onConfirm and onCancel', () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    render(
      <CommandPlanPanel
        descriptions={['步骤一']}
        timeoutMs={5000}
        onConfirm={onConfirm}
        onCancel={onCancel}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /确认执行/i }));
    expect(onConfirm).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: /取消/i }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/CommandPlanPanel.test.jsx`

Expected: FAIL with module not found.

- [ ] **Step 3: Write minimal implementation**

Create `src/components/CommandPlanPanel.jsx`:

```jsx
import { useEffect, useState } from 'react';

export default function CommandPlanPanel({ descriptions, timeoutMs = 5000, onConfirm, onCancel }) {
  const [remaining, setRemaining] = useState(timeoutMs);

  useEffect(() => {
    setRemaining(timeoutMs);
    const interval = setInterval(() => {
      setRemaining(prev => Math.max(0, prev - 100));
    }, 100);
    return () => clearInterval(interval);
  }, [timeoutMs]);

  useEffect(() => {
    if (remaining <= 0) {
      onCancel();
    }
  }, [remaining, onCancel]);

  const progress = timeoutMs > 0 ? (remaining / timeoutMs) * 100 : 0;

  return (
    <div className="command-plan-panel">
      <div className="command-plan-header">识别到多步计划</div>
      <ol className="command-plan-steps">
        {descriptions.map((desc, index) => (
          <li key={index} className="command-plan-step">
            <span className="step-index">{index + 1}</span>
            <span className="step-desc">{desc}</span>
          </li>
        ))}
      </ol>
      <div className="command-plan-timeout">
        <div className="timeout-bar" style={{ width: `${progress}%` }} />
      </div>
      <div className="command-plan-actions">
        <button type="button" className="btn-confirm" onClick={onConfirm}>确认执行</button>
        <button type="button" className="btn-cancel" onClick={onCancel}>取消</button>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/CommandPlanPanel.test.jsx`

Expected: PASS (2/2).

- [ ] **Step 5: Commit**

```bash
git add src/components/CommandPlanPanel.jsx tests/CommandPlanPanel.test.jsx
git commit -m "feat: 添加高级指令解析确认面板"
```

---

### Task 4: Wire confirmation flow into App.jsx

**Files:**
- Modify: `src/App.jsx`
- Test: existing test suite should still pass

- [ ] **Step 1: Add imports**

At the top of `src/App.jsx`, add:

```javascript
import { describeCommand } from './utils/describeCommand';
import { isConfirm, isCancel } from './utils/confirmationMatcher';
import CommandPlanPanel from './components/CommandPlanPanel';
```

- [ ] **Step 2: Add pending plan state and refs**

After the existing `isProcessing` state, add:

```javascript
const [pendingPlan, setPendingPlan] = useState(null);
const pendingPlanRef = useRef(null);
const confirmationTimerRef = useRef(null);
```

- [ ] **Step 3: Add confirmation helpers**

Before `runCommand`, add:

```javascript
const clearPendingPlan = useCallback(() => {
  if (confirmationTimerRef.current) {
    clearTimeout(confirmationTimerRef.current);
    confirmationTimerRef.current = null;
  }
  pendingPlanRef.current = null;
  setPendingPlan(null);
  setStatusMessage('已取消');
}, []);

const executePendingPlan = useCallback(() => {
  const plan = pendingPlanRef.current;
  if (!plan) return;
  if (confirmationTimerRef.current) {
    clearTimeout(confirmationTimerRef.current);
    confirmationTimerRef.current = null;
  }
  plan.commands.forEach(runCommand);
  pendingPlanRef.current = null;
  setPendingPlan(null);
  setStatusMessage(`已执行 ${plan.commands.length} 个步骤`);
}, [runCommand]);
```

Also expose refs to the latest callbacks:

```javascript
const executePendingPlanRef = useRef(executePendingPlan);
const clearPendingPlanRef = useRef(clearPendingPlan);
executePendingPlanRef.current = executePendingPlan;
clearPendingPlanRef.current = clearPendingPlan;
```

- [ ] **Step 4: Replace direct LLM execution with plan display**

Find the existing `else if (needsLLM(text) && LLM_API_KEY)` block in the `onResult` callback and replace it with:

```javascript
} else if (needsLLM(text) && LLM_API_KEY) {
  setIsProcessing(true);
  setStatusMessage('Thinking...');
  try {
    const commands = await parseWithLLM(text, LLM_API_KEY, LLM_API_ENDPOINT, LLM_MODEL);
    if (!commands || commands.length === 0) {
      setStatusMessage('未能解析出执行计划');
      return;
    }
    const descriptions = commands.map(describeCommand);
    const plan = { commands, descriptions, startedAt: Date.now() };
    pendingPlanRef.current = plan;
    setPendingPlan(plan);
    setStatusMessage('请说“确认”执行，或“取消”放弃');
    confirmationTimerRef.current = setTimeout(() => {
      pendingPlanRef.current = null;
      setPendingPlan(null);
      setStatusMessage('计划已超时取消');
    }, 5000);
  } catch (err) {
    setStatusMessage(`解析失败：${err.message}`);
  } finally {
    setIsProcessing(false);
  }
}
```

- [ ] **Step 5: Add confirmation voice interception**

At the very beginning of the `if (isFinal)` branch in `onResult`, add:

```javascript
if (isFinal) {
  if (pendingPlanRef.current) {
    if (isConfirm(text)) {
      executePendingPlanRef.current();
    } else if (isCancel(text)) {
      clearPendingPlanRef.current();
    }
    return;
  }
  // ... existing parsing logic ...
}
```

- [ ] **Step 6: Render the panel**

Inside the JSX, after the `</section>` that closes `canvas-area` and before `<LayerPanel ...>`, add:

```jsx
{pendingPlan && (
  <CommandPlanPanel
    descriptions={pendingPlan.descriptions}
    timeoutMs={5000}
    onConfirm={executePendingPlan}
    onCancel={clearPendingPlan}
  />
)}
```

- [ ] **Step 7: Run the existing test suite**

Run: `npm test`

Expected: All existing tests still pass.

- [ ] **Step 8: Commit**

```bash
git add src/App.jsx
git commit -m "feat: 集成高级指令解析确认流程"
```

---

### Task 5: Add panel styles

**Files:**
- Modify: `src/styles/index.css`

- [ ] **Step 1: Append styles**

Append to `src/styles/index.css`:

```css
.command-plan-panel {
  position: fixed;
  right: 280px;
  top: 80px;
  width: 280px;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
  padding: 16px;
  z-index: 100;
}

.command-plan-header {
  font-weight: 600;
  font-size: 15px;
  margin-bottom: 12px;
  color: #111827;
}

.command-plan-steps {
  list-style: none;
  padding: 0;
  margin: 0 0 12px 0;
  max-height: 220px;
  overflow-y: auto;
}

.command-plan-step {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 8px 0;
  border-bottom: 1px solid #f3f4f6;
  font-size: 14px;
  color: #374151;
}

.command-plan-step:last-child {
  border-bottom: none;
}

.step-index {
  flex-shrink: 0;
  width: 22px;
  height: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #3b82f6;
  color: #ffffff;
  border-radius: 50%;
  font-size: 12px;
  font-weight: 600;
}

.command-plan-timeout {
  height: 4px;
  background: #e5e7eb;
  border-radius: 2px;
  overflow: hidden;
  margin-bottom: 12px;
}

.timeout-bar {
  height: 100%;
  background: #3b82f6;
  transition: width 0.1s linear;
}

.command-plan-actions {
  display: flex;
  gap: 10px;
}

.command-plan-actions button {
  flex: 1;
  padding: 8px 12px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  cursor: pointer;
}

.command-plan-actions .btn-confirm {
  background: #3b82f6;
  color: #ffffff;
}

.command-plan-actions .btn-confirm:hover {
  background: #2563eb;
}

.command-plan-actions .btn-cancel {
  background: #f3f4f6;
  color: #374151;
}

.command-plan-actions .btn-cancel:hover {
  background: #e5e7eb;
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build`

Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/styles/index.css
git commit -m "style: 添加高级指令解析面板样式"
```

---

### Task 6: Update README

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Add advanced parsing section**

Find the voice command examples in `README.md` and append a new section:

```markdown
### 高级指令解析

当一句话包含多步操作时，VoiceCanvas 会调用 LLM 解析为执行计划，并在面板上展示每一步，等待你确认。

示例：

```text
“画一个红色的圆，再在旁边画一个蓝色的方块，然后把背景改成绿色”
```

面板会列出步骤：

1. 在中心画一个红色的中号圆形
2. 在右边画一个蓝色的中号矩形
3. 将背景设置为绿色纯色

确认词：

- `确认` / `执行` / `开始` / `好`：执行计划
- `取消` / `放弃` / `不` / `算了`：放弃计划

5 秒内未确认会自动取消。
```

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: 更新 README 高级指令解析说明"
```

---

### Task 7: Final verification

- [ ] **Step 1: Run all tests**

Run: `npm test`

Expected: All tests pass, including the new ones.

- [ ] **Step 2: Run production build**

Run: `npm run build`

Expected: Build succeeds with no errors.

- [ ] **Step 3: Commit if any last changes**

If only verification was run, no commit needed.

---

## Self-Review

- **Spec coverage:**
  - LLM plan display → Task 4 + Task 3
  - Voice confirmation/cancel → Task 2 + Task 4
  - Auto-cancel timeout → Task 3 (panel) + Task 4 (timer)
  - Human-readable descriptions → Task 1
  - Button fallback → Task 3
  - README update → Task 6
  - No gaps identified.

- **Placeholder scan:** No TBD/TODO/fill-in details. Each step includes exact code or commands.

- **Type consistency:**
  - `pendingPlan` shape is consistent across App.jsx, CommandPlanPanel props, and describeCommand usage.
  - Confirmation keywords are shared between `confirmationMatcher.js` and the README description.
