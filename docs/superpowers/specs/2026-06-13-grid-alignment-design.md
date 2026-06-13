# VoiceCanvas - 网格与对齐设计文档

> 版本：v1.0  
> 日期：2026-06-13  
> 状态：待实现  
> 关联需求：主画布功能增强 - 第二项 PR

---

## 1. 目标与范围

为 VoiceCanvas 主画布增加可视化网格与吸附对齐能力，帮助用户通过语音更精确地控制图形位置。

### 1.1 支持的语音指令

| 指令示例 | 预期效果 |
|----------|----------|
| "显示网格" / "打开网格" | 在画布上显示淡色线状网格 |
| "隐藏网格" / "关闭网格" | 隐藏网格 |
| "打开吸附" / "开启吸附" | 新绘制图形自动吸附到网格交点 |
| "关闭吸附" | 取消吸附 |
| "网格调大" | 网格间距切换到更大档位 |
| "网格调小" | 网格间距切换到更小档位 |
| "把网格间距设为 40" | 设置具体间距（可选） |

### 1.2 明确不做

- 不实现鼠标/键盘拖动对齐（违反纯语音控制规则）。
- 不实现多个吸附目标（如吸附到已有图形中心），仅吸附网格交点。
- 不实现导出图片时保留网格（网格仅为辅助参考线）。

---

## 2. 数据模型

### 2.1 Grid 配置

在 App state 中新增 `grid` 字段：

```javascript
grid: {
  visible: true,   // 是否显示网格
  snap: true,      // 是否开启吸附
  spacing: 40      // 网格间距（px）
}
```

### 2.2 Grid Command

```javascript
// 显示/隐藏网格
{ action: 'setGrid', visible: true }

// 开启/关闭吸附
{ action: 'setSnap', snap: true }

// 调整网格间距档位
{ action: 'setGridSize', size: 'small' | 'medium' | 'large' }
```

### 2.3 间距档位映射

| 档位 | 间距 |
|------|------|
| small | 20 px |
| medium | 40 px |
| large | 80 px |

---

## 3. 系统架构

```
用户语音输入
    ↓
commandParser.js
    ↓
识别网格/吸附/间距指令
    ↓
executor.js
    ↓
更新 state.grid
    ↓
App.jsx 将 grid 传给 CanvasBoard
    ↓
CanvasBoard 绘制网格层 + shapes 层
```

### 3.1 模块职责

| 模块 | 改动 |
|------|------|
| `services/commandParser.js` | 新增网格/吸附/间距指令解析 |
| `services/executor.js` | 处理 `setGrid` / `setSnap` / `setGridSize` |
| `utils/positionResolver.js` | 新增 `snapPosition(x, y, spacing)` 吸附函数 |
| `components/CanvasBoard.jsx` | 接收 `grid` 配置并绘制线状网格 |
| `App.jsx` | 管理 `grid` state；`draw` 命令执行前吸附位置 |
| `components/CommandPanel.jsx` | 显示当前网格/吸附状态 |
| `tests/` | 新增解析、吸附、执行单元测试 |

---

## 4. 解析层设计

### 4.1 网格显示指令

触发词：
- 显示/打开："显示网格"、"打开网格"、"show grid"
- 隐藏/关闭："隐藏网格"、"关闭网格"、"hide grid"

输出：
- `{ action: 'setGrid', visible: true }`
- `{ action: 'setGrid', visible: false }`

### 4.2 吸附指令

触发词：
- 开启："打开吸附"、"开启吸附"、"enable snap"
- 关闭："关闭吸附"、"disable snap"

输出：
- `{ action: 'setSnap', snap: true }`
- `{ action: 'setSnap', snap: false }`

### 4.3 网格间距指令

触发词：
- "网格调大" → `size: 'large'`（或向上一档）
- "网格调小" → `size: 'small'`（或向下一档）
- "网格间距 40" / "medium" → 直接设置

输出：
- `{ action: 'setGridSize', size: 'small' | 'medium' | 'large' }`

---

## 5. 执行层设计

### 5.1 Grid 状态更新

`executeCommand` 新增分支：

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

### 5.2 Draw 命令吸附

当 `command.action === 'draw'` 且 `state.grid.snap === true` 时：

1. 先调用 `resolvePosition(command.position, canvasWidth, canvasHeight)` 得到原始坐标 `(x, y)`。
2. 再调用 `snapPosition(x, y, state.grid.spacing)` 得到吸附后的坐标。
3. 使用吸附后的坐标生成 shape。

吸附规则：
- 计算最近网格交点 `(round(x / spacing) * spacing, round(y / spacing) * spacing)`。
- 若原始坐标与交点距离小于 `spacing / 2`，则吸附到交点；否则保持原坐标。

---

## 6. Canvas 渲染

### 6.1 网格绘制

`CanvasBoard` 接收 `grid` prop。在 `useEffect` 中：

1. 清空画布。
2. 若 `grid.visible` 为 true，绘制淡色线状网格。
   - 使用 `ctx.strokeStyle = '#e2e8f0'`（与现有背景点阵同色系）。
   - 使用 `ctx.lineWidth = 1`。
   - 从 `x = 0` 到 `canvasWidth`，每隔 `grid.spacing` 画竖线。
   - 从 `y = 0` 到 `canvasHeight`，每隔 `grid.spacing` 画横线。
3. 遍历 `shapes` 绘制图形。

### 6.2 高清屏适配

网格绘制在 `ctx.scale(dpr, dpr)` 之后进行，因此坐标使用 CSS 像素即可。

---

## 7. UI 反馈

### 7.1 状态提示

| 场景 | statusMessage |
|------|---------------|
| 显示网格 | "Grid shown" |
| 隐藏网格 | "Grid hidden" |
| 开启吸附 | "Snap enabled" |
| 关闭吸附 | "Snap disabled" |
| 调整间距 | "Grid spacing set to 40px" |

### 7.2 CommandPanel 显示

在 `CommandPanel` 中新增网格状态卡片，显示：
- `GRID`：`visible ? 'On' : 'Off'`
- `SNAP`：`snap ? 'On' : 'Off'`
- `SPACING`：`${spacing}px`

---

## 8. 测试策略

新增以下测试文件：

| 文件 | 覆盖内容 |
|------|----------|
| `tests/commandParser.grid.test.js` | 网格/吸附/间距语音指令解析 |
| `tests/positionResolver.snap.test.js` | `snapPosition` 吸附逻辑 |
| `tests/executor.grid.test.js` | grid 状态变更执行 |

核心测试用例：
- "显示网格" / "隐藏网格" 解析正确。
- "打开吸附" / "关闭吸附" 解析正确。
- "网格调大" / "网格调小" 切换档位。
- `snapPosition` 在阈值内吸附，阈值外保持原坐标。
- 吸附开启时 draw 命令生成图形的坐标被吸附。

---

## 9. 验收标准

- [ ] 语音说"显示网格"，画布上出现淡色线状网格。
- [ ] 语音说"隐藏网格"，网格消失。
- [ ] 语音说"打开吸附"后绘制图形，图形中心自动吸附到最近网格交点。
- [ ] 语音说"网格调大"，网格间距变大。
- [ ] 右侧面板显示当前网格/吸附/间距状态。
- [ ] 新增单元测试全部通过。
- [ ] 生产构建成功。

---

*本设计文档经用户确认后生成，作为 PR2 实现计划的输入。*
