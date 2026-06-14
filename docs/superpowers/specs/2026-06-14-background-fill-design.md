# VoiceCanvas - 背景填充与纹理设计文档

> 版本：v1.0  
> 日期：2026-06-14  
> 状态：待实现  
> 关联需求：主画布功能增强 - 第三项 PR

---

## 1. 目标与范围

为 VoiceCanvas 主画布增加可语音切换的背景填充与纹理能力，丰富画布视觉效果。

### 1.1 支持的语音指令

| 指令示例 | 预期效果 |
|----------|----------|
| "把背景改成蓝色" | 纯色背景填充为蓝色 |
| "换成渐变色背景" | 使用默认颜色生成线性渐变 |
| "换成从左到右的红蓝渐变" | 线性渐变，方向从左到右，颜色红到蓝 |
| "换成中心扩散的蓝色渐变" | 径向渐变 |
| "换成黑白条纹" | 黑白相间的条纹图案 |
| "换成棋盘格" | 棋盘格图案 |
| "换成星空背景" | 深色底 + 随机白点模拟星空 |
| "恢复默认背景" | 恢复为白色默认背景 |

### 1.2 明确不做

- 不调用外部图片或文生图 API，所有效果均由 Canvas 2D 本地生成。
- 不支持用户上传图片作为背景。
- 背景不支持进入 `shapes` 数组参与撤销重做（背景切换本身是一次命令，可撤销到上一种背景）。

---

## 2. 数据模型

### 2.1 Background 配置

在 App state 中新增 `background` 字段：

```javascript
background: {
  type: 'solid',      // 'solid' | 'gradient' | 'pattern' | 'texture'
  subtype: 'linear',  // 'linear' | 'radial' | 'stripes' | 'checkerboard' | 'dots' | 'starry' | 'noise'
  color: '#3b82f6',   // 主色
  color2: '#ffffff',  // 副色（渐变/图案使用）
  direction: 'to-right', // 渐变方向
  density: 'medium'   // 'low' | 'medium' | 'high'（纹理密度）
}
```

默认背景：

```javascript
{ type: 'solid', subtype: 'solid', color: '#ffffff' }
```

### 2.2 Background Command

```javascript
{ action: 'setBackground', background: { type, subtype, color, color2, direction, density } }
```

---

## 3. 系统架构

```
用户语音输入
    ↓
commandParser.js
    ↓
识别背景类型、颜色、方向、密度
    ↓
executor.js
    ↓
更新 state.background
    ↓
App.jsx 将 background 传给 CanvasBoard
    ↓
CanvasBoard 绘制 backgroundCanvas + shapeCanvas
    ↓
导出时合并两层为一张 PNG
```

### 3.1 模块职责

| 模块 | 改动 |
|------|------|
| `services/commandParser.js` | 新增背景指令解析 |
| `services/executor.js` | 处理 `setBackground`，更新 `state.background` |
| `utils/backgroundRenderer.js`（新建） | 根据配置绘制背景到 canvas |
| `components/CanvasBoard.jsx` | 新增 `backgroundCanvas` 层；导出时合并背景与图形 |
| `App.jsx` | 管理 `background` state，传给 `CanvasBoard` |
| `components/CommandPanel.jsx` | 显示当前背景类型与主色 |
| `tests/` | 新增解析、渲染、执行单元测试 |

---

## 4. 解析层设计

### 4.1 触发词

- "背景" / "background"
- "改成" / "换成" / "设为" / "set"
- "恢复默认背景" / "重置背景"

### 4.2 类型识别

| 用户说法 | 解析结果 |
|----------|----------|
| "蓝色" / "红色" / "#ff0000" | `type: 'solid', color: resolvedColor` |
| "渐变" / "渐变色" | `type: 'gradient', subtype: 'linear'` |
| "径向渐变" / "中心扩散" | `type: 'gradient', subtype: 'radial'` |
| "条纹" / "黑白条纹" | `type: 'pattern', subtype: 'stripes'` |
| "棋盘格" | `type: 'pattern', subtype: 'checkerboard'` |
| "点阵" | `type: 'pattern', subtype: 'dots'` |
| "星空" | `type: 'texture', subtype: 'starry'` |
| "噪点" / "颗粒" | `type: 'texture', subtype: 'noise'` |
| "默认" / "白色" / "恢复默认" | `type: 'solid', color: '#ffffff'` |

### 4.3 方向识别

仅用于线性渐变：

| 用户说法 | direction |
|----------|-----------|
| "从左到右" | `to-right` |
| "从上到下" | `to-bottom` |
| "从左上到右下" | `to-bottom-right` |
| 未指定 | `to-right`（默认） |

### 4.4 颜色提取

复用 `detectColor` 提取 `color` 和 `color2`。第二个颜色通常通过“和”“到”分隔，例如“红到蓝的渐变”。

---

## 5. 执行层设计

### 5.1 Background 状态更新

`executeCommand` 新增分支：

```javascript
case 'setBackground': {
  return { ...state, background: command.background };
}
```

### 5.2 默认分支与现有分支

所有返回分支都需保留 `background: state.background`。

---

## 6. 渲染层设计

### 6.1 三层 Canvas 结构

`CanvasBoard` 使用三个叠放的 canvas：

1. **backgroundCanvas**（z-index: 0）：绘制背景。
2. **gridCanvas**（z-index: 1，可选）：预留，PR2 合并后启用。
3. **shapeCanvas**（z-index: 2）：绘制图形，导出时与 backgroundCanvas 合并。

### 6.2 backgroundRenderer.js

提供纯函数 `renderBackground(ctx, width, height, background)`：

- `solid`：直接 `fillRect`。
- `gradient`：
  - `linear`：根据 direction 创建 `CanvasGradient`。
  - `radial`：创建以画布中心为圆心的径向渐变。
- `pattern`：
  - `stripes`：绘制等宽条纹。
  - `checkerboard`：绘制棋盘格。
  - `dots`：绘制点阵。
- `texture`：
  - `starry`：深色底 + 随机白点。
  - `noise`：随机灰点模拟噪点。

### 6.3 导出合并

`exportImage()` 创建临时 canvas：

```javascript
function mergeCanvases(bgCanvas, shapeCanvas) {
  const canvas = document.createElement('canvas');
  canvas.width = bgCanvas.width;
  canvas.height = bgCanvas.height;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(bgCanvas, 0, 0);
  ctx.drawImage(shapeCanvas, 0, 0);
  return canvas.toDataURL('image/png');
}
```

---

## 7. UI 反馈

### 7.1 状态提示

| 场景 | statusMessage |
|------|---------------|
| 纯色背景 | "Background set to blue" |
| 渐变背景 | "Background set to linear gradient" |
| 图案背景 | "Background set to stripes" |
| 纹理背景 | "Background set to starry" |
| 恢复默认 | "Background reset to default" |

### 7.2 CommandPanel 显示

新增背景状态卡片：
- `BACKGROUND TYPE`：`solid` / `gradient` / `pattern` / `texture`
- `BACKGROUND COLOR`：主色颜色块或 hex 字符串

---

## 8. 测试策略

新增以下测试文件：

| 文件 | 覆盖内容 |
|------|----------|
| `tests/commandParser.background.test.js` | 各类背景语音指令解析 |
| `tests/backgroundRenderer.test.js` | 渲染函数不抛错、生成非空 canvas |
| `tests/executor.background.test.js` | background 状态变更执行 |

核心测试用例：
- "把背景改成蓝色" 解析为纯色。
- "星空背景" 解析为纹理。
- `renderBackground` 对每种类型都能绘制且不抛错。
- `setBackground` 更新 state 后保留其他字段。

---

## 9. 验收标准

- [ ] 语音说"把背景改成蓝色"，画布背景变为蓝色。
- [ ] 语音说"换成星空背景"，画布出现星空效果。
- [ ] 语音说"恢复默认背景"，背景恢复白色。
- [ ] 导出 PNG 包含背景。
- [ ] 清空画布后背景保持不变。
- [ ] 右侧面板显示当前背景类型与颜色。
- [ ] 新增单元测试全部通过。
- [ ] 生产构建成功。

---

*本设计文档经用户确认后生成，作为 PR3 实现计划的输入。*
