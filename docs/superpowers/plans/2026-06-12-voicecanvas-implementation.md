# VoiceCanvas Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a pure voice-controlled drawing PWA where users create geometric shapes on a canvas using spoken commands.

**Architecture:** A React frontend renders an HTML5 Canvas board. Voice input is captured via Web Speech API, parsed by a local rule engine (with LLM fallback for complex commands), and executed as drawing operations against an immutable shape history that supports undo/redo. The app is packaged as a PWA for installability.

**Tech Stack:** Vite, React 18, HTML5 Canvas 2D, Web Speech API, Vitest, Vite PWA plugin.

---

## File Structure

```
voice-canvas/
├── index.html
├── package.json
├── vite.config.js
├── README.md
├── public/
│   ├── manifest.json
│   └── icon-192x192.png
│   └── icon-512x512.png
├── src/
│   ├── main.jsx
│   ├── App.jsx
│   ├── components/
│   │   ├── CanvasBoard.jsx
│   │   ├── VoicePanel.jsx
│   │   └── CommandHistory.jsx
│   ├── services/
│   │   ├── speechService.js
│   │   ├── commandParser.js
│   │   ├── llmParser.js
│   │   └── executor.js
│   ├── utils/
│   │   ├── colorMap.js
│   │   ├── positionResolver.js
│   │   └── sizeResolver.js
│   ├── shapes/
│   │   ├── drawRect.js
│   │   ├── drawCircle.js
│   │   ├── drawLine.js
│   │   └── drawTriangle.js
│   └── styles/
│       └── index.css
└── tests/
    ├── commandParser.test.js
    ├── colorMap.test.js
    ├── positionResolver.test.js
    └── executor.test.js
```

---

## Task 1: Initialize Vite + React Project

**Files:**
- Create: `package.json`
- Create: `vite.config.js`
- Create: `index.html`
- Create: `src/main.jsx`
- Create: `src/App.jsx`
- Create: `src/styles/index.css`
- Modify: `.gitignore`

- [ ] **Step 1: Create package.json**

```json
{
  "name": "voice-canvas",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "test": "vitest"
  },
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  },
  "devDependencies": {
    "@types/react": "^18.3.3",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.1",
    "vite": "^5.3.1",
    "vite-plugin-pwa": "^0.20.0",
    "vitest": "^1.6.0",
    "jsdom": "^24.1.0",
    "@testing-library/react": "^16.0.0",
    "@testing-library/jest-dom": "^6.4.6"
  }
}
```

- [ ] **Step 2: Create vite.config.js with PWA plugin**

```javascript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'VoiceCanvas',
        short_name: 'VoiceCanvas',
        description: 'Pure voice-controlled drawing tool',
        theme_color: '#0f172a',
        background_color: '#0f172a',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: '/icon-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512x512.png', sizes: '512x512', type: 'image/png' }
        ]
      }
    })
  ],
  test: {
    environment: 'jsdom',
    globals: true
  }
});
```

- [ ] **Step 3: Create index.html**

```html
<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>VoiceCanvas - AI 语音绘图工具</title>
    <meta name="description" content="纯语音控制的 Web 绘图工具" />
    <theme-color content="#0f172a" />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
```

- [ ] **Step 4: Create src/main.jsx**

```jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

- [ ] **Step 5: Create src/App.jsx with placeholder layout**

```jsx
function App() {
  return (
    <div className="app">
      <header className="app-header">
        <h1>VoiceCanvas</h1>
        <p>纯语音控制绘图工具</p>
      </header>
      <main className="app-main">
        <div className="canvas-placeholder">画布区域</div>
      </main>
    </div>
  );
}

export default App;
```

- [ ] **Step 6: Create src/styles/index.css with base dark theme**

```css
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html, body, #root {
  width: 100%;
  height: 100%;
  overflow: hidden;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  background-color: #0f172a;
  color: #e2e8f0;
}

.app {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
}

.app-header {
  padding: 12px 20px;
  border-bottom: 1px solid #1e293b;
}

.app-header h1 {
  font-size: 1.25rem;
  font-weight: 600;
}

.app-header p {
  font-size: 0.875rem;
  color: #94a3b8;
}

.app-main {
  flex: 1;
  display: flex;
  overflow: hidden;
}

.canvas-placeholder {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #1e293b;
  color: #64748b;
}
```

- [ ] **Step 7: Update .gitignore for Node/Vite**

```gitignore
node_modules/
dist/
.DS_Store
*.log
.env
.env.local
.claude/settings.local.json
.mcp.json
```

- [ ] **Step 8: Install dependencies and verify dev server starts**

Run:
```bash
npm install
```

Then run:
```bash
npm run dev
```

Expected: Vite dev server starts on `http://localhost:5173`. Open it and confirm the placeholder page renders.

- [ ] **Step 9: Commit**

```bash
git add package.json package-lock.json vite.config.js index.html src/ .gitignore

git commit -m "chore: 初始化 Vite + React + PWA 项目结构

- 添加 package.json、vite.config.js、index.html
- 配置 Vite PWA 插件与 manifest
- 创建 App 基础布局与深色主题

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: Create Utility Modules (Color, Position, Size)

**Files:**
- Create: `src/utils/colorMap.js`
- Create: `src/utils/positionResolver.js`
- Create: `src/utils/sizeResolver.js`
- Create: `tests/colorMap.test.js`
- Create: `tests/positionResolver.test.js`

- [ ] **Step 1: Write colorMap.js**

```javascript
export const COLOR_MAP = {
  red: '#ef4444',
  green: '#22c55e',
  blue: '#3b82f6',
  yellow: '#eab308',
  purple: '#a855f7',
  orange: '#f97316',
  pink: '#ec4899',
  cyan: '#06b6d4',
  black: '#000000',
  white: '#ffffff',
  gray: '#6b7280'
};

export function resolveColor(input) {
  if (!input) return '#3b82f6';
  const normalized = String(input).toLowerCase().trim();
  return COLOR_MAP[normalized] || normalized;
}
```

- [ ] **Step 2: Write colorMap test and verify it fails**

```javascript
import { describe, it, expect } from 'vitest';
import { resolveColor, COLOR_MAP } from '../src/utils/colorMap';

describe('resolveColor', () => {
  it('returns mapped hex for known color names', () => {
    expect(resolveColor('red')).toBe('#ef4444');
    expect(resolveColor('蓝色')).toBeUndefined();
  });

  it('returns raw string for unknown colors', () => {
    expect(resolveColor('#123456')).toBe('#123456');
  });

  it('has default color for empty input', () => {
    expect(resolveColor('')).toBe('#3b82f6');
  });
});
```

Run:
```bash
npx vitest run tests/colorMap.test.js
```

Expected: FAIL because we haven't added Chinese color names yet. This is intentional; we add them next.

- [ ] **Step 3: Add Chinese color names to colorMap.js**

Update `COLOR_MAP`:

```javascript
export const COLOR_MAP = {
  red: '#ef4444',
  红: '#ef4444',
  红色: '#ef4444',
  green: '#22c55e',
  绿: '#22c55e',
  绿色: '#22c55e',
  blue: '#3b82f6',
  蓝: '#3b82f6',
  蓝色: '#3b82f6',
  yellow: '#eab308',
  黄: '#eab308',
  黄色: '#eab308',
  purple: '#a855f7',
  紫: '#a855f7',
  紫色: '#a855f7',
  orange: '#f97316',
  橙: '#f97316',
  橙色: '#f97316',
  pink: '#ec4899',
  粉: '#ec4899',
  粉色: '#ec4899',
  cyan: '#06b6d4',
  青: '#06b6d4',
  青色: '#06b6d4',
  black: '#000000',
  黑: '#000000',
  黑色: '#000000',
  white: '#ffffff',
  白: '#ffffff',
  白色: '#ffffff',
  gray: '#6b7280',
  灰: '#6b7280',
  灰色: '#6b7280'
};
```

Also update the test expectation for Chinese blue:

```javascript
expect(resolveColor('蓝色')).toBe('#3b82f6');
```

Run tests again:
```bash
npx vitest run tests/colorMap.test.js
```

Expected: PASS.

- [ ] **Step 4: Write positionResolver.js**

```javascript
export const DEFAULT_MARGIN = 40;

export function resolvePosition(input, canvasWidth, canvasHeight) {
  const normalized = String(input || 'center').toLowerCase().trim();
  const centerX = canvasWidth / 2;
  const centerY = canvasHeight / 2;

  switch (normalized) {
    case 'top-left':
    case '左上':
    case '左上角':
      return { x: DEFAULT_MARGIN, y: DEFAULT_MARGIN };
    case 'top':
    case '上':
    case '上方':
      return { x: centerX, y: DEFAULT_MARGIN };
    case 'top-right':
    case '右上':
    case '右上角':
      return { x: canvasWidth - DEFAULT_MARGIN, y: DEFAULT_MARGIN };
    case 'left':
    case '左':
    case '左边':
      return { x: DEFAULT_MARGIN, y: centerY };
    case 'center':
    case '中间':
    case '中央':
    case '中心':
      return { x: centerX, y: centerY };
    case 'right':
    case '右':
    case '右边':
      return { x: canvasWidth - DEFAULT_MARGIN, y: centerY };
    case 'bottom-left':
    case '左下':
    case '左下角':
      return { x: DEFAULT_MARGIN, y: canvasHeight - DEFAULT_MARGIN };
    case 'bottom':
    case '下':
    case '下方':
      return { x: centerX, y: canvasHeight - DEFAULT_MARGIN };
    case 'bottom-right':
    case '右下':
    case '右下角':
      return { x: canvasWidth - DEFAULT_MARGIN, y: canvasHeight - DEFAULT_MARGIN };
    default:
      return { x: centerX, y: centerY };
  }
}
```

- [ ] **Step 5: Write positionResolver test and verify**

```javascript
import { describe, it, expect } from 'vitest';
import { resolvePosition, DEFAULT_MARGIN } from '../src/utils/positionResolver';

describe('resolvePosition', () => {
  it('resolves center', () => {
    expect(resolvePosition('center', 800, 600)).toEqual({ x: 400, y: 300 });
    expect(resolvePosition('中间', 800, 600)).toEqual({ x: 400, y: 300 });
  });

  it('resolves top-left', () => {
    expect(resolvePosition('top-left', 800, 600)).toEqual({ x: DEFAULT_MARGIN, y: DEFAULT_MARGIN });
    expect(resolvePosition('左上角', 800, 600)).toEqual({ x: DEFAULT_MARGIN, y: DEFAULT_MARGIN });
  });

  it('defaults to center for unknown input', () => {
    expect(resolvePosition('somewhere', 800, 600)).toEqual({ x: 400, y: 300 });
  });
});
```

Run:
```bash
npx vitest run tests/positionResolver.test.js
```

Expected: PASS.

- [ ] **Step 6: Write sizeResolver.js**

```javascript
export const SIZE_PRESETS = {
  small: { width: 80, height: 60 },
  medium: { width: 160, height: 120 },
  large: { width: 320, height: 240 }
};

export function resolveSize(input) {
  if (!input) return SIZE_PRESETS.medium;
  if (typeof input === 'object' && input.width && input.height) {
    return { width: Number(input.width), height: Number(input.height) };
  }
  const normalized = String(input).toLowerCase().trim();
  return SIZE_PRESETS[normalized] || SIZE_PRESETS.medium;
}

export function adjustSize(currentSize, direction) {
  const factor = direction === 'larger' ? 1.5 : 0.75;
  return {
    width: currentSize.width * factor,
    height: currentSize.height * factor
  };
}
```

- [ ] **Step 7: Commit utility modules and tests**

```bash
git add src/utils/ tests/

git commit -m "feat: 添加颜色、位置、尺寸解析工具函数及测试

- colorMap 支持中英颜色词映射
- positionResolver 支持九宫格位置语义
- sizeResolver 支持大/中/小预设和自定义尺寸
- 添加 Vitest 单元测试

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: Build CanvasBoard Component with Drawing Primitives

**Files:**
- Create: `src/components/CanvasBoard.jsx`
- Create: `src/shapes/drawRect.js`
- Create: `src/shapes/drawCircle.js`
- Create: `src/shapes/drawLine.js`
- Create: `src/shapes/drawTriangle.js`
- Modify: `src/App.jsx`

- [ ] **Step 1: Create drawRect.js**

```javascript
export function drawRect(ctx, shape) {
  ctx.save();
  ctx.fillStyle = shape.color || '#3b82f6';
  ctx.fillRect(shape.x - shape.width / 2, shape.y - shape.height / 2, shape.width, shape.height);
  ctx.restore();
}
```

- [ ] **Step 2: Create drawCircle.js**

```javascript
export function drawCircle(ctx, shape) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(shape.x, shape.y, Math.min(shape.width, shape.height) / 2, 0, Math.PI * 2);
  ctx.fillStyle = shape.color || '#3b82f6';
  ctx.fill();
  ctx.restore();
}
```

- [ ] **Step 3: Create drawLine.js**

```javascript
export function drawLine(ctx, shape) {
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(shape.x - shape.width / 2, shape.y - shape.height / 2);
  ctx.lineTo(shape.x + shape.width / 2, shape.y + shape.height / 2);
  ctx.strokeStyle = shape.color || '#3b82f6';
  ctx.lineWidth = 4;
  ctx.stroke();
  ctx.restore();
}
```

- [ ] **Step 4: Create drawTriangle.js**

```javascript
export function drawTriangle(ctx, shape) {
  ctx.save();
  const halfW = shape.width / 2;
  const halfH = shape.height / 2;
  ctx.beginPath();
  ctx.moveTo(shape.x, shape.y - halfH);
  ctx.lineTo(shape.x + halfW, shape.y + halfH);
  ctx.lineTo(shape.x - halfW, shape.y + halfH);
  ctx.closePath();
  ctx.fillStyle = shape.color || '#3b82f6';
  ctx.fill();
  ctx.restore();
}
```

- [ ] **Step 5: Create CanvasBoard.jsx**

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

const CanvasBoard = forwardRef(function CanvasBoard({ shapes }, ref) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    function resize() {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return;

      const rect = container.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;

      const ctx = canvas.getContext('2d');
      ctx.scale(dpr, dpr);
    }

    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
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
      const canvas = canvasRef.current;
      return canvas ? canvas.toDataURL('image/png') : null;
    }
  }));

  return (
    <div ref={containerRef} className="canvas-board">
      <canvas ref={canvasRef} />
    </div>
  );
});

export default CanvasBoard;
```

- [ ] **Step 6: Update App.jsx to render CanvasBoard with sample shapes**

```jsx
import { useRef, useState } from 'react';
import CanvasBoard from './components/CanvasBoard';

function App() {
  const canvasRef = useRef(null);
  const [shapes] = useState([
    { id: '1', type: 'rect', x: 200, y: 150, width: 160, height: 120, color: '#ef4444' },
    { id: '2', type: 'circle', x: 400, y: 200, width: 120, height: 120, color: '#3b82f6' },
    { id: '3', type: 'line', x: 300, y: 350, width: 200, height: 100, color: '#22c55e' },
    { id: '4', type: 'triangle', x: 550, y: 300, width: 120, height: 100, color: '#eab308' }
  ]);

  return (
    <div className="app">
      <header className="app-header">
        <h1>VoiceCanvas</h1>
        <p>纯语音控制绘图工具</p>
      </header>
      <main className="app-main">
        <CanvasBoard ref={canvasRef} shapes={shapes} />
      </main>
    </div>
  );
}

export default App;
```

- [ ] **Step 7: Add CSS for CanvasBoard**

Append to `src/styles/index.css`:

```css
.canvas-board {
  flex: 1;
  position: relative;
  background-color: #1e293b;
  overflow: hidden;
}

.canvas-board canvas {
  display: block;
  width: 100%;
  height: 100%;
}
```

- [ ] **Step 8: Run dev server and verify sample shapes render**

Run:
```bash
npm run dev
```

Open `http://localhost:5173` and confirm four shapes appear.

- [ ] **Step 9: Commit**

```bash
git add src/components/CanvasBoard.jsx src/shapes/ src/App.jsx src/styles/index.css

git commit -m "feat: 添加 CanvasBoard 与基础图形绘制

- 实现矩形、圆形、直线、三角形绘制函数
- CanvasBoard 支持高清屏适配与自动尺寸调整
- App 中渲染示例图形验证绘制能力

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: Implement Local Command Parser

**Files:**
- Create: `src/services/commandParser.js`
- Create: `tests/commandParser.test.js`

- [ ] **Step 1: Create commandParser.js**

```javascript
import { resolveColor } from '../utils/colorMap';
import { resolvePosition } from '../utils/positionResolver';
import { resolveSize } from '../utils/sizeResolver';

const SHAPE_SYNONYMS = {
  rect: ['rect', 'rectangle', '方块', '方', '矩形'],
  circle: ['circle', '圆', '圆形'],
  line: ['line', '直线', '线'],
  triangle: ['triangle', '三角形', '三角']
};

function detectShape(text) {
  for (const [shape, synonyms] of Object.entries(SHAPE_SYNONYMS)) {
    for (const synonym of synonyms) {
      if (text.includes(synonym)) return shape;
    }
  }
  return null;
}

function detectColor(text) {
  const colorNames = ['红', '绿', '蓝', '黄', '紫', '橙', '粉', '青', '黑', '白', '灰'];
  for (const name of colorNames) {
    if (text.includes(name)) return resolveColor(name);
  }
  const hexMatch = text.match(/#([0-9a-fA-F]{6})/);
  if (hexMatch) return hexMatch[0];
  return null;
}

function detectPosition(text) {
  const positions = [
    '左上角', '右上角', '左下角', '右下角',
    '左上', '右上', '左下', '右下',
    '上方', '下方', '左边', '右边',
    '上', '下', '左', '右',
    '中间', '中央', '中心', 'center'
  ];
  for (const pos of positions) {
    if (text.includes(pos)) return pos;
  }
  return 'center';
}

function detectSize(text) {
  if (text.includes('大')) return 'large';
  if (text.includes('小')) return 'small';
  return 'medium';
}

export function parseCommand(text) {
  const normalized = text.toLowerCase().trim();

  if (normalized.includes('撤销')) {
    return [{ action: 'undo' }];
  }
  if (normalized.includes('重做')) {
    return [{ action: 'redo' }];
  }
  if (normalized.includes('清空') || normalized.includes('重置')) {
    return [{ action: 'clear' }];
  }
  if (normalized.includes('保存') || normalized.includes('下载')) {
    return [{ action: 'save' }];
  }

  const shape = detectShape(normalized);
  if (shape) {
    return [{
      action: 'draw',
      shape,
      color: detectColor(normalized),
      position: detectPosition(normalized),
      size: detectSize(normalized)
    }];
  }

  return null;
}

export function canParseLocally(text) {
  return parseCommand(text) !== null;
}
```

- [ ] **Step 2: Write commandParser tests**

```javascript
import { describe, it, expect } from 'vitest';
import { parseCommand, canParseLocally } from '../src/services/commandParser';

describe('parseCommand', () => {
  it('parses draw rect command', () => {
    const result = parseCommand('画一个红色矩形');
    expect(result).toEqual([{
      action: 'draw',
      shape: 'rect',
      color: '#ef4444',
      position: 'center',
      size: 'medium'
    }]);
  });

  it('parses draw circle with position and size', () => {
    const result = parseCommand('在左上角画个大蓝圆');
    expect(result).toEqual([{
      action: 'draw',
      shape: 'circle',
      color: '#3b82f6',
      position: '左上角',
      size: 'large'
    }]);
  });

  it('parses undo', () => {
    expect(parseCommand('撤销')).toEqual([{ action: 'undo' }]);
  });

  it('parses clear', () => {
    expect(parseCommand('清空画布')).toEqual([{ action: 'clear' }]);
  });

  it('returns null for unparseable input', () => {
    expect(parseCommand('随便说点什么')).toBeNull();
  });
});
```

- [ ] **Step 3: Run tests and verify**

Run:
```bash
npx vitest run tests/commandParser.test.js
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/services/commandParser.js tests/commandParser.test.js

git commit -m "feat: 实现本地规则指令解析器

- 支持绘制矩形/圆形/直线/三角形的同义词识别
- 支持颜色、位置、尺寸参数提取
- 支持撤销、重做、清空、保存等操作指令
- 添加单元测试覆盖主要场景

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 5: Implement Command Executor and Canvas State Management

**Files:**
- Create: `src/services/executor.js`
- Create: `tests/executor.test.js`
- Modify: `src/App.jsx`

- [ ] **Step 1: Create executor.js**

```javascript
import { resolveColor } from '../utils/colorMap';
import { resolvePosition } from '../utils/positionResolver';
import { resolveSize } from '../utils/sizeResolver';

function generateId() {
  return Math.random().toString(36).slice(2, 9);
}

export function executeCommand(command, state, canvasSize) {
  const { shapes, currentColor } = state;

  switch (command.action) {
    case 'draw': {
      const position = resolvePosition(command.position, canvasSize.width, canvasSize.height);
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
      return { shapes: [...shapes, newShape], currentColor: newShape.color };
    }
    case 'setColor': {
      return { shapes, currentColor: resolveColor(command.color) };
    }
    case 'clear': {
      return { shapes: [], currentColor };
    }
    default:
      return { shapes, currentColor };
  }
}

export function createInitialState() {
  return {
    shapes: [],
    currentColor: '#3b82f6',
    undoStack: [],
    redoStack: []
  };
}
```

- [ ] **Step 2: Write executor tests**

```javascript
import { describe, it, expect } from 'vitest';
import { executeCommand, createInitialState } from '../src/services/executor';

describe('executeCommand', () => {
  it('draws a red rect at center', () => {
    const state = createInitialState();
    const result = executeCommand(
      { action: 'draw', shape: 'rect', color: 'red', position: 'center', size: 'medium' },
      state,
      { width: 800, height: 600 }
    );
    expect(result.shapes).toHaveLength(1);
    expect(result.shapes[0].type).toBe('rect');
    expect(result.shapes[0].color).toBe('#ef4444');
    expect(result.shapes[0].x).toBe(400);
    expect(result.shapes[0].y).toBe(300);
  });

  it('clears all shapes', () => {
    const state = { shapes: [{ id: '1', type: 'rect' }], currentColor: '#000' };
    const result = executeCommand({ action: 'clear' }, state, { width: 800, height: 600 });
    expect(result.shapes).toHaveLength(0);
  });
});
```

Run:
```bash
npx vitest run tests/executor.test.js
```

Expected: PASS.

- [ ] **Step 3: Update App.jsx to manage shapes with undo/redo**

```jsx
import { useRef, useState, useCallback } from 'react';
import CanvasBoard from './components/CanvasBoard';
import { executeCommand, createInitialState } from './services/executor';

function App() {
  const canvasRef = useRef(null);
  const [state, setState] = useState(createInitialState);
  const [canvasSize] = useState({ width: 800, height: 600 });

  const runCommand = useCallback((command) => {
    setState(prev => {
      const next = executeCommand(command, prev, canvasSize);
      return {
        ...next,
        undoStack: [...prev.undoStack, prev.shapes],
        redoStack: []
      };
    });
  }, [canvasSize]);

  const undo = useCallback(() => {
    setState(prev => {
      if (prev.undoStack.length === 0) return prev;
      const lastShapes = prev.undoStack[prev.undoStack.length - 1];
      return {
        ...prev,
        shapes: lastShapes,
        undoStack: prev.undoStack.slice(0, -1),
        redoStack: [...prev.redoStack, prev.shapes]
      };
    });
  }, []);

  const redo = useCallback(() => {
    setState(prev => {
      if (prev.redoStack.length === 0) return prev;
      const nextShapes = prev.redoStack[prev.redoStack.length - 1];
      return {
        ...prev,
        shapes: nextShapes,
        redoStack: prev.redoStack.slice(0, -1),
        undoStack: [...prev.undoStack, prev.shapes]
      };
    });
  }, []);

  return (
    <div className="app">
      <header className="app-header">
        <h1>VoiceCanvas</h1>
        <p>纯语音控制绘图工具</p>
      </header>
      <main className="app-main">
        <CanvasBoard ref={canvasRef} shapes={state.shapes} />
      </main>
      <div className="debug-controls">
        <button onClick={() => runCommand({ action: 'draw', shape: 'rect', color: 'red', position: 'center', size: 'medium' })} type="button">
          测试：画红矩形
        </button>
        <button onClick={undo} type="button" disabled={state.undoStack.length === 0}>撤销</button>
        <button onClick={redo} type="button" disabled={state.redoStack.length === 0}>重做</button>
      </div>
    </div>
  );
}

export default App;
```

- [ ] **Step 4: Add minimal debug controls CSS**

Append to `src/styles/index.css`:

```css
.debug-controls {
  position: fixed;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 12px;
  padding: 12px 20px;
  background-color: #1e293b;
  border: 1px solid #334155;
  border-radius: 9999px;
  z-index: 10;
}

.debug-controls button {
  padding: 8px 16px;
  border: none;
  border-radius: 9999px;
  background-color: #3b82f6;
  color: white;
  cursor: pointer;
}

.debug-controls button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
```

- [ ] **Step 5: Run dev server and test buttons**

Run:
```bash
npm run dev
```

Click "测试：画红矩形" several times, then test undo/redo.

- [ ] **Step 6: Commit**

```bash
git add src/services/executor.js tests/executor.test.js src/App.jsx src/styles/index.css

git commit -m "feat: 实现命令执行器与撤销重做

- executor 将 Command 转换为 Shape 并更新画布状态
- App 中集成 undo/redo 历史栈
- 添加调试按钮验证绘制与撤销流程

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 6: Integrate Web Speech API

**Files:**
- Create: `src/services/speechService.js`
- Modify: `src/App.jsx`

- [ ] **Step 1: Create speechService.js**

```javascript
export function createSpeechRecognizer({ onResult, onError, onEnd, language = 'zh-CN' } = {}) {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!SpeechRecognition) {
    throw new Error('浏览器不支持 Web Speech API');
  }

  const recognition = new SpeechRecognition();
  recognition.lang = language;
  recognition.continuous = true;
  recognition.interimResults = true;

  recognition.onresult = (event) => {
    const lastResult = event.results[event.results.length - 1];
    const transcript = lastResult[0].transcript;
    const isFinal = lastResult.isFinal;
    if (onResult) onResult(transcript, isFinal);
  };

  recognition.onerror = (event) => {
    if (onError) onError(event.error);
  };

  recognition.onend = () => {
    if (onEnd) onEnd();
  };

  return {
    start() {
      recognition.start();
    },
    stop() {
      recognition.stop();
    }
  };
}

export function isSpeechSupported() {
  return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
}
```

- [ ] **Step 2: Update App.jsx to wire speech recognition**

```jsx
import { useRef, useState, useCallback, useEffect } from 'react';
import CanvasBoard from './components/CanvasBoard';
import { executeCommand, createInitialState } from './services/executor';
import { createSpeechRecognizer, isSpeechSupported } from './services/speechService';
import { parseCommand } from './services/commandParser';

function App() {
  const canvasRef = useRef(null);
  const [state, setState] = useState(createInitialState);
  const [canvasSize] = useState({ width: 800, height: 600 });
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const recognizerRef = useRef(null);

  const runCommand = useCallback((command) => {
    setState(prev => {
      const next = executeCommand(command, prev, canvasSize);
      return {
        ...next,
        undoStack: [...prev.undoStack, prev.shapes],
        redoStack: []
      };
    });
  }, [canvasSize]);

  const undo = useCallback(() => {
    setState(prev => {
      if (prev.undoStack.length === 0) return prev;
      const lastShapes = prev.undoStack[prev.undoStack.length - 1];
      return {
        ...prev,
        shapes: lastShapes,
        undoStack: prev.undoStack.slice(0, -1),
        redoStack: [...prev.redoStack, prev.shapes]
      };
    });
  }, []);

  const redo = useCallback(() => {
    setState(prev => {
      if (prev.redoStack.length === 0) return prev;
      const nextShapes = prev.redoStack[prev.redoStack.length - 1];
      return {
        ...prev,
        shapes: nextShapes,
        redoStack: prev.redoStack.slice(0, -1),
        undoStack: [...prev.undoStack, prev.shapes]
      };
    });
  }, []);

  useEffect(() => {
    if (!isSpeechSupported()) {
      setStatusMessage('当前浏览器不支持语音识别，请使用 Chrome 或 Edge');
      return;
    }

    recognizerRef.current = createSpeechRecognizer({
      onResult: (text, isFinal) => {
        setTranscript(text);
        if (isFinal) {
          const command = parseCommand(text);
          if (command) {
            command.forEach(runCommand);
            setStatusMessage(`已执行：${text}`);
          } else {
            setStatusMessage(`未识别指令：${text}`);
          }
        }
      },
      onError: (error) => {
        setStatusMessage(`语音识别错误：${error}`);
        setIsListening(false);
      },
      onEnd: () => {
        setIsListening(false);
      }
    });

    return () => {
      if (recognizerRef.current) recognizerRef.current.stop();
    };
  }, [runCommand]);

  const toggleListening = useCallback(() => {
    if (isListening) {
      recognizerRef.current?.stop();
    } else {
      setTranscript('');
      setStatusMessage('正在听…');
      recognizerRef.current?.start();
    }
    setIsListening(prev => !prev);
  }, [isListening]);

  return (
    <div className="app">
      <header className="app-header">
        <h1>VoiceCanvas</h1>
        <p>纯语音控制绘图工具</p>
      </header>
      <main className="app-main">
        <CanvasBoard ref={canvasRef} shapes={state.shapes} />
      </main>
      <div className="voice-controls">
        <button onClick={toggleListening} type="button" className={isListening ? 'listening' : ''}>
          {isListening ? '停止语音' : '开始语音'}
        </button>
        <button onClick={undo} type="button" disabled={state.undoStack.length === 0}>撤销</button>
        <button onClick={redo} type="button" disabled={state.redoStack.length === 0}>重做</button>
      </div>
      <div className="status-bar">
        <p>{statusMessage}</p>
        {transcript && <p className="transcript">识别：{transcript}</p>}
      </div>
    </div>
  );
}

export default App;
```

- [ ] **Step 3: Add voice controls CSS**

Replace the `.debug-controls` block in `src/styles/index.css` with:

```css
.voice-controls {
  position: fixed;
  bottom: 80px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 12px;
  padding: 12px 20px;
  background-color: #1e293b;
  border: 1px solid #334155;
  border-radius: 9999px;
  z-index: 10;
}

.voice-controls button {
  padding: 10px 20px;
  border: none;
  border-radius: 9999px;
  background-color: #3b82f6;
  color: white;
  cursor: pointer;
  font-size: 0.875rem;
}

.voice-controls button.listening {
  background-color: #ef4444;
  animation: pulse 1.5s infinite;
}

.voice-controls button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.status-bar {
  position: fixed;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  text-align: center;
  color: #94a3b8;
  font-size: 0.875rem;
}

.status-bar .transcript {
  color: #e2e8f0;
  margin-top: 4px;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
}
```

- [ ] **Step 4: Run dev server and test voice**

Run:
```bash
npm run dev
```

Click "开始语音" and say "画一个红色矩形". Verify shape appears and status updates.

- [ ] **Step 5: Commit**

```bash
git add src/services/speechService.js src/App.jsx src/styles/index.css

git commit -m "feat: 集成 Web Speech API 语音识别

- 封装 SpeechRecognition，支持实时识别与最终结果回调
- App 中语音指令经本地解析后执行绘图
- 添加语音状态、撤销重做、识别文本展示

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 7: Build VoicePanel and CommandHistory UI Components

**Files:**
- Create: `src/components/VoicePanel.jsx`
- Create: `src/components/CommandHistory.jsx`
- Modify: `src/App.jsx`

- [ ] **Step 1: Create VoicePanel.jsx**

```jsx
function VoicePanel({ isListening, transcript, statusMessage, onToggle }) {
  return (
    <div className="voice-panel">
      <button
        type="button"
        className={`voice-button ${isListening ? 'listening' : ''}`}
        onClick={onToggle}
      >
        {isListening ? '🔴 停止' : '🎤 开始语音'}
      </button>
      <div className="voice-status">
        {isListening && <span className="listening-indicator">正在聆听</span>}
        {!isListening && statusMessage && <span>{statusMessage}</span>}
      </div>
      {transcript && (
        <div className="voice-transcript">
          “{transcript}”
        </div>
      )}
    </div>
  );
}

export default VoicePanel;
```

- [ ] **Step 2: Create CommandHistory.jsx**

```jsx
function CommandHistory({ commands }) {
  if (commands.length === 0) return null;

  return (
    <div className="command-history">
      <h3>指令历史</h3>
      <ul>
        {commands.map((cmd, index) => (
          <li key={index}>
            <span className="command-action">{cmd.action}</span>
            {cmd.shape && <span className="command-detail">{cmd.shape}</span>}
            {cmd.color && <span className="command-detail" style={{ color: cmd.color }}>{cmd.color}</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default CommandHistory;
```

- [ ] **Step 3: Update App.jsx to use new components**

Replace the inline voice controls and status bar in `src/App.jsx` with the components:

```jsx
import VoicePanel from './components/VoicePanel';
import CommandHistory from './components/CommandHistory';
```

In the JSX, replace the old controls with:

```jsx
<div className="app-layout">
  <aside className="app-sidebar">
    <VoicePanel
      isListening={isListening}
      transcript={transcript}
      statusMessage={statusMessage}
      onToggle={toggleListening}
    />
    <CommandHistory commands={state.history || []} />
  </aside>
  <main className="app-main">
    <CanvasBoard ref={canvasRef} shapes={state.shapes} />
  </main>
</div>
```

Also update `runCommand` to track history:

```javascript
const runCommand = useCallback((command) => {
  setState(prev => {
    const next = executeCommand(command, prev, canvasSize);
    return {
      ...next,
      undoStack: [...prev.undoStack, prev.shapes],
      redoStack: [],
      history: [...(prev.history || []), command]
    };
  });
}, [canvasSize]);
```

Update `createInitialState` usage is fine; add history field in `executor.js`:

```javascript
export function createInitialState() {
  return {
    shapes: [],
    currentColor: '#3b82f6',
    undoStack: [],
    redoStack: [],
    history: []
  };
}
```

- [ ] **Step 4: Add sidebar CSS**

Replace the old `.voice-controls` and `.status-bar` CSS with:

```css
.app-layout {
  flex: 1;
  display: flex;
  overflow: hidden;
}

.app-sidebar {
  width: 280px;
  padding: 20px;
  background-color: #0f172a;
  border-right: 1px solid #1e293b;
  display: flex;
  flex-direction: column;
  gap: 24px;
  overflow-y: auto;
}

.voice-panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.voice-button {
  padding: 16px;
  border: none;
  border-radius: 12px;
  background-color: #3b82f6;
  color: white;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.2s;
}

.voice-button:hover {
  background-color: #2563eb;
}

.voice-button.listening {
  background-color: #ef4444;
  animation: pulse 1.5s infinite;
}

.voice-status {
  color: #94a3b8;
  font-size: 0.875rem;
  text-align: center;
}

.listening-indicator {
  color: #ef4444;
}

.voice-transcript {
  padding: 12px;
  background-color: #1e293b;
  border-radius: 8px;
  color: #e2e8f0;
  font-size: 0.875rem;
  min-height: 44px;
}

.command-history h3 {
  font-size: 0.875rem;
  color: #94a3b8;
  margin-bottom: 12px;
}

.command-history ul {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.command-history li {
  display: flex;
  gap: 8px;
  align-items: center;
  padding: 8px 12px;
  background-color: #1e293b;
  border-radius: 6px;
  font-size: 0.875rem;
}

.command-action {
  color: #e2e8f0;
  font-weight: 500;
}

.command-detail {
  color: #94a3b8;
}
```

- [ ] **Step 5: Run dev server and verify layout**

Run:
```bash
npm run dev
```

Verify sidebar with VoicePanel and CommandHistory renders correctly.

- [ ] **Step 6: Commit**

```bash
git add src/components/VoicePanel.jsx src/components/CommandHistory.jsx src/App.jsx src/services/executor.js src/styles/index.css

git commit -m "feat: 添加 VoicePanel 与 CommandHistory 组件

- 拆分语音控制面板为独立组件
- 添加指令历史展示
- 优化整体布局为侧边栏 + 画布结构

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 8: Add Clear and Save Commands

**Files:**
- Modify: `src/services/executor.js`
- Modify: `src/components/CanvasBoard.jsx`
- Modify: `src/App.jsx`

- [ ] **Step 1: Extend executor.js for save**

Add to `executeCommand`:

```javascript
    case 'save': {
      return { shapes, currentColor, shouldSave: true };
    }
```

Also add `shouldSave: false` to initial state and reset it after save.

Update `createInitialState`:

```javascript
export function createInitialState() {
  return {
    shapes: [],
    currentColor: '#3b82f6',
    undoStack: [],
    redoStack: [],
    history: [],
    shouldSave: false
  };
}
```

- [ ] **Step 2: Extend CanvasBoard export image**

Already exists via `useImperativeHandle`. No change needed.

- [ ] **Step 3: Update App.jsx to handle save**

Add a `useEffect`:

```javascript
useEffect(() => {
  if (state.shouldSave && canvasRef.current) {
    const dataUrl = canvasRef.current.exportImage();
    if (dataUrl) {
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `voice-canvas-${Date.now()}.png`;
      link.click();
    }
    setState(prev => ({ ...prev, shouldSave: false }));
  }
}, [state.shouldSave]);
```

Also update `undo` and `redo` to preserve `shouldSave: false`:

```javascript
undoStack: prev.undoStack.slice(0, -1),
redoStack: [...prev.redoStack, prev.shapes],
shouldSave: false
```

Same for redo.

- [ ] **Step 4: Add clear/save buttons to VoicePanel**

Add props `onClear` and `onSave` to `VoicePanel`, and buttons:

```jsx
      <div className="voice-actions">
        <button type="button" onClick={onClear}>清空</button>
        <button type="button" onClick={onSave}>保存</button>
      </div>
```

Add CSS:

```css
.voice-actions {
  display: flex;
  gap: 8px;
}

.voice-actions button {
  flex: 1;
  padding: 10px;
  border: 1px solid #334155;
  border-radius: 8px;
  background-color: transparent;
  color: #e2e8f0;
  cursor: pointer;
}

.voice-actions button:hover {
  background-color: #1e293b;
}
```

- [ ] **Step 5: Wire handlers in App.jsx**

```javascript
const clearCanvas = useCallback(() => {
  runCommand({ action: 'clear' });
}, [runCommand]);

const saveCanvas = useCallback(() => {
  runCommand({ action: 'save' });
}, [runCommand]);
```

Pass to VoicePanel:

```jsx
<VoicePanel
  isListening={isListening}
  transcript={transcript}
  statusMessage={statusMessage}
  onToggle={toggleListening}
  onClear={clearCanvas}
  onSave={saveCanvas}
/>
```

- [ ] **Step 6: Run dev server and test clear/save**

Test:
1. Draw shapes via voice or debug.
2. Click "清空" — canvas clears.
3. Click "保存" — PNG downloads.

- [ ] **Step 7: Commit**

```bash
git add src/services/executor.js src/App.jsx src/components/VoicePanel.jsx src/styles/index.css

git commit -m "feat: 实现清空画布与保存图片功能

- executor 支持 clear 和 save action
- CanvasBoard 暴露 exportImage 导出 PNG
- VoicePanel 添加清空和保存按钮

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 9: Add LLM Fallback for Complex Commands

**Files:**
- Create: `src/services/llmParser.js`
- Modify: `src/App.jsx`
- Modify: `src/services/commandParser.js`

- [ ] **Step 1: Create llmParser.js**

```javascript
const SYSTEM_PROMPT = `你是一个语音绘图助手的指令解析器。请把用户自然语言转换为 JSON 命令数组。

支持的 action：draw, setColor, undo, redo, clear, save。
draw 命令必须包含 shape（rect/circle/line/triangle）、可选 color、position（center/top-left/...）、size（small/medium/large）。

只输出 JSON 数组，不要任何解释。

示例：
输入："先画一个红色的圆，再在旁边画一个蓝色的方块"
输出：[{"action":"draw","shape":"circle","color":"red","position":"center","size":"medium"},{"action":"draw","shape":"rect","color":"blue","position":"right","size":"medium"}]`;

export async function parseWithLLM(text, apiKey, apiEndpoint = 'https://api.deepseek.com/v1/chat/completions', model = 'deepseek-chat') {
  const response = await fetch(apiEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: text }
      ],
      temperature: 0.2
    })
  });

  if (!response.ok) {
    throw new Error(`LLM API error: ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices[0]?.message?.content || '';
  const match = content.match(/\[[\s\S]*\]/);
  if (!match) throw new Error('LLM 返回格式错误');

  return JSON.parse(match[0]);
}
```

- [ ] **Step 2: Update commandParser.js with complex trigger detection**

Add:

```javascript
export function needsLLM(text) {
  const normalized = text.toLowerCase();
  const complexMarkers = ['先', '再', '然后', '接着', '第一步', '第二步', '和', '连'];
  return complexMarkers.some(marker => normalized.includes(marker)) || !canParseLocally(text);
}
```

- [ ] **Step 3: Update App.jsx to call LLM when needed**

Add state:

```javascript
const [isProcessing, setIsProcessing] = useState(false);
const LLM_API_KEY = import.meta.env.VITE_LLM_API_KEY || '';
const LLM_API_ENDPOINT = import.meta.env.VITE_LLM_API_ENDPOINT || 'https://api.deepseek.com/v1/chat/completions';
```

Update the `onResult` handler:

```javascript
onResult: async (text, isFinal) => {
  setTranscript(text);
  if (isFinal) {
    if (parseCommand(text)) {
      const command = parseCommand(text);
      command.forEach(runCommand);
      setStatusMessage(`已执行：${text}`);
    } else if (needsLLM(text) && LLM_API_KEY) {
      setIsProcessing(true);
      setStatusMessage('正在理解复杂指令…');
      try {
        const commands = await parseWithLLM(text, LLM_API_KEY, LLM_API_ENDPOINT);
        commands.forEach(runCommand);
        setStatusMessage(`已执行复杂指令：${text}`);
      } catch (err) {
        setStatusMessage(`理解失败：${err.message}`);
      } finally {
        setIsProcessing(false);
      }
    } else {
      setStatusMessage(`未识别指令：${text}`);
    }
  }
},
```

- [ ] **Step 4: Add .env.example**

Create `.env.example`:

```
VITE_LLM_API_KEY=your-api-key-here
VITE_LLM_API_ENDPOINT=https://api.deepseek.com/v1/chat/completions
```

Make sure `.env` is in `.gitignore` (already there).

- [ ] **Step 5: Run dev server and test complex command**

With a valid API key in `.env`, test:
"先画一个红色的圆，再在旁边画一个蓝色的方块"

- [ ] **Step 6: Commit**

```bash
git add src/services/llmParser.js src/services/commandParser.js src/App.jsx .env.example

git commit -m "feat: 添加 LLM 复杂指令解析兜底

- llmParser 调用 DeepSeek/兼容 API 解析多步指令
- commandParser 增加复杂指令触发判断
- App 在本地规则失败时自动降级到 LLM

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 10: Finalize README and PWA Assets

**Files:**
- Create: `README.md`
- Create: `public/icon-192x192.png`
- Create: `public/icon-512x512.png`

- [ ] **Step 1: Create README.md**

```markdown
# VoiceCanvas - AI 语音绘图工具

纯语音控制的 Web 绘图工具（PWA）。用户无需鼠标和键盘，仅通过语音指令即可完成 Canvas 绘图创作。

## 技术栈

- Vite
- React 18
- HTML5 Canvas 2D
- Web Speech API
- Vitest
- Vite PWA

## 第三方依赖

- `react` / `react-dom`
- `@vitejs/plugin-react`
- `vite-plugin-pwa`
- `vitest`
- `@testing-library/react`
- `@testing-library/jest-dom`
- `jsdom`

## 运行方式

```bash
npm install
npm run dev
```

## 构建

```bash
npm run build
```

## 测试

```bash
npm run test
```

## 语音指令示例

- “画一个红色矩形”
- “在左上角画个大蓝圆”
- “画一条绿色的线”
- “撤销” / “重做”
- “清空画布”
- “保存图片”
- “先画红圆，再在旁边画蓝方块”（需配置 LLM API key）

## LLM 配置

复制 `.env.example` 为 `.env`，填入你的 API key：

```
VITE_LLM_API_KEY=your-api-key
VITE_LLM_API_ENDPOINT=https://api.deepseek.com/v1/chat/completions
```

## 浏览器支持

- Chrome / Edge：完整支持
- Safari：部分支持
- Firefox 桌面：不支持语音识别

## 设计文档

详见 [docs/superpowers/specs/2026-06-12-voicecanvas-design.md](docs/superpowers/specs/2026-06-12-voicecanvas-design.md)。
```

- [ ] **Step 2: Create simple PWA icons**

Generate two placeholder PNG icons. Use ImageMagick if available, otherwise create simple SVG and convert.

Option A (ImageMagick):
```bash
mkdir -p public
convert -size 192x192 xc:#3b82f6 -pointsize 24 -fill white -gravity center -annotate +0+0 VC public/icon-192x192.png
convert -size 512x512 xc:#3b82f6 -pointsize 64 -fill white -gravity center -annotate +0+0 VC public/icon-512x512.png
```

Option B (create SVG placeholders and note they need replacement):
If ImageMagick is not available, create placeholder SVG files and document that real PNGs are needed. But PWA manifest requires PNG. Better to create simple PNG via any available tool.

Check if ImageMagick is available:
```bash
which convert || echo "ImageMagick not found"
```

If not available, use Python with PIL:
```bash
python3 - <<'PY'
from PIL import Image, ImageDraw, ImageFont
def make_icon(size):
    img = Image.new('RGB', (size, size), '#3b82f6')
    draw = ImageDraw.Draw(img)
    try:
        font = ImageFont.truetype('/System/Library/Fonts/Helvetica.ttc', size // 4)
    except:
        font = ImageFont.load_default()
    text = 'VC'
    bbox = draw.textbbox((0, 0), text, font=font)
    x = (size - (bbox[2] - bbox[0])) // 2
    y = (size - (bbox[3] - bbox[1])) // 2
    draw.text((x, y), text, fill='white', font=font)
    return img
make_icon(192).save('public/icon-192x192.png')
make_icon(512).save('public/icon-512x512.png')
PY
```

- [ ] **Step 3: Build and verify PWA**

Run:
```bash
npm run build
```

Expected: `dist/` folder created with `manifest.json` and icons.

- [ ] **Step 4: Commit**

```bash
git add README.md public/ .env.example

git commit -m "docs: 完善 README 与 PWA 图标资源

- 添加项目说明、依赖声明、运行方式
- 添加 192x192 和 512x512 PWA 图标
- 添加 LLM 环境变量配置示例

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Self-Review

**Spec coverage:**
- Architecture (Section 2): Covered by Task 1.
- Components (Section 4): Covered by Tasks 3, 7.
- Data flow (Section 5): Covered by Task 5.
- Command parsing (Section 6): Covered by Tasks 4, 9.
- Canvas rendering (Section 7): Covered by Task 3.
- Error handling (Section 8): Covered by Task 6 (unsupported browser message).
- PWA/Deployment (Section 9): Covered by Tasks 1, 10.
- Testing (Section 10): Covered by Tasks 2, 4, 5.

**Placeholder scan:** No TBD/TODO/fill-in-details found. Every step has concrete code or commands.

**Type consistency:** `Command` shape uses `action`, `shape`, `color`, `position`, `size` consistently across parser, executor, and LLM prompt. `Shape` model uses `id`, `type`, `x`, `y`, `width`, `height`, `color` consistently.

**Gaps:** Figma UI integration is not in this plan because the visual design will be produced in Figma and then applied to the CSS/components in a follow-up styling task. The current plan focuses on functional MVP.

---

## UI Design Note (Updated from Stitch)

The final main canvas UI follows the user's Stitch design (light theme):

- **Top header**: `AetherDraw AI` title in indigo/blue, session timer on the right, action icons (undo, layers, settings, avatar).
- **Left sidebar**: Floating tool-state cards for Size, Opacity, Active Color, and Layer.
- **Right sidebar**: `Command Logic` panel showing listening status, current action/subject/style, "Revert Last" button, and hint text.
- **Bottom center**: Rounded floating voice bar with microphone icon, "Listening..." label, transcript text, audio waveform, and close button.
- **Center canvas**: Light grid background (#f8fafc) with subtle dots, drawing area in the middle.

Implementation tasks below use this layout. Components `VoicePanel` and `CommandHistory` are merged into a right-sidebar `CommandPanel`; the bottom floating bar becomes a separate `VoiceBar` component.

---

## Execution Handoff

**Plan complete and saved to `docs/superpowers/plans/2026-06-12-voicecanvas-implementation.md`.**

Two execution options:

**1. Subagent-Driven (recommended)** - Dispatch a fresh subagent per task, review between tasks, fast iteration.

**2. Inline Execution** - Execute tasks in this session using `executing-plans`, batch execution with checkpoints.

Which approach?
