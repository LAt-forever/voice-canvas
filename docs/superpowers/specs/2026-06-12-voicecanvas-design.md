# VoiceCanvas 设计文档

> 比赛题目：AI 语音绘图工具  
> 版本：v1.0  
> 日期：2026-06-12  
> 状态：待实现

---

## 1. 项目概述

VoiceCanvas 是一款**纯语音控制的 Web 绘图工具**。用户无需鼠标和键盘，仅通过语音指令即可在 Canvas 上完成几何图形绘制、编辑与导出。

### 1.1 比赛要求对齐

| 比赛要求 | 本方案对应 |
|----------|------------|
| 纯语音控制，不使用鼠标键盘 | 全链路语音输入 + 语音/视觉反馈 |
| 指令理解的准确性与容错性 | 本地规则引擎 + 同义词映射 + LLM 兜底 |
| 语音到绘图操作的响应延迟 | 高频指令走本地规则，毫秒级响应 |
| 复杂指令的拆解与执行能力 | LLM 将自然语言拆分为 `Command[]` 队列执行 |

### 1.2 设计目标

- **核心体验**：说一句指令，画布上立刻出现对应图形；
- **容错体验**：说“画个红色方块”和“画一个红色的矩形”效果一致；
- **复杂体验**：说“先画红圆，再在旁边画蓝方块，然后连起来”可分步执行；
- **可安装体验**：PWA 可添加到桌面，离线可用。

---

## 2. 技术选型

| 层级 | 技术 | 说明 |
|------|------|------|
| 构建工具 | Vite | 快速、配置少、PWA 插件成熟 |
| 前端框架 | React 18 | 函数组件 + Hooks，UI 状态管理清晰 |
| 绘图引擎 | HTML5 Canvas 2D Context | 原生控制，延迟最低 |
| 语音识别 | Web Speech API | 浏览器原生，零成本 |
| 指令解析 | 本地规则 + LLM 混合 | 简单指令本地，复杂指令 LLM |
| LLM 服务 | 第三方 API（通义/DeepSeek/智谱） | 比赛 demo 使用个人 key |
| PWA | Vite PWA 插件 | manifest + Service Worker |
| 部署 | GitHub Pages / Vercel | 静态托管，零服务器成本 |
| 测试 | Vitest | Vite 生态，解析逻辑单元测试 |
| UI 设计 | Figma | 用户/AI 在 Figma 中设计，开发按稿实现 |

---

## 3. 系统架构

```
用户语音输入
    ↓
Web Speech API（浏览器语音识别）
    ↓
Command Parser（命令解析层）
  ├─ 本地规则引擎（简单、快速指令）
  └─ LLM 解析器（复杂、模糊、多步指令）
    ↓
Command Executor（命令执行层）
    ↓
Canvas Renderer（Canvas 绘制层）
    ↓
UI Feedback（React 状态反馈）
```

---

## 4. 组件结构

### 4.1 React 组件

| 组件 | 职责 |
|------|------|
| `App` | 根组件，组装模块，管理全局状态 |
| `CanvasBoard` | Canvas 初始化、图形渲染、撤销重做、导出图片 |
| `VoicePanel` | 麦克风状态、实时转写、执行结果/错误提示 |
| `CommandHistory` | 最近命令列表，增强用户信任感 |

### 4.2 服务模块

| 模块 | 职责 |
|------|------|
| `services/speechService.js` | 封装 Web Speech API，开始/停止识别 |
| `services/commandParser.js` | 本地规则解析，同义词映射 |
| `services/llmParser.js` | LLM 调用与 JSON 结果格式化 |
| `services/executor.js` | 把 `Command[]` 转成 Canvas 操作 |

### 4.3 数据模型

```javascript
// Shape 图元
{
  id: "uuid",
  type: "rect" | "circle" | "line" | "triangle",
  x: 100,
  y: 100,
  width: 200,
  height: 150,
  color: "#ef4444",
  style: "solid" | "gradient" | "shadow" // 可选
}

// Command 命令
{
  action: "draw" | "setColor" | "undo" | "redo" | "clear" | "save",
  shape: "rect" | "circle" | "line" | "triangle",
  color: "red",
  position: "center" | "top-left" | ...,
  size: "small" | "medium" | "large" | { width, height }
}
```

---

## 5. 数据流与状态管理

### 5.1 状态分层

**React State（轻量 UI 状态）：**
- `isListening`
- `transcript`
- `lastCommand`
- `statusMessage`
- `history`

**Canvas 内部 State（命令式管理，不触发 React 渲染）：**
- `shapes`：当前图形数组
- `undoStack` / `redoStack`：历史快照
- 通过 `useRef` + `useImperativeHandle` 暴露操作

### 5.2 核心流程

```
用户点击麦克风
  → speechService.start()
  → 识别文本更新到 React state
  → 用户说完后，触发 parseCommand(text)
    → 本地规则匹配成功 → 直接执行
    → 本地规则失败 → 调用 LLM
  → parser 返回 Command[] 数组
  → executor 遍历 Command[]，调用 Canvas API
  → Canvas 重绘所有 shapes
  → 更新 statusMessage 和 history
```

### 5.3 撤销重做

每次执行命令前，深拷贝当前 `shapes` 压入 `undoStack`。
- 撤销：`undoStack.pop()` → `shapes`，原 `shapes` 压入 `redoStack`；
- 重做：`redoStack.pop()` → `shapes`。

---

## 6. 语音指令解析策略

### 6.1 本地规则引擎

覆盖高频、确定性指令，毫秒级响应。

| 意图 | 示例 | 输出 |
|------|------|------|
| 绘制形状 | “画一个红色矩形” | `{action:"draw", shape:"rect", color:"red"}` |
| 设置颜色 | “把颜色改成蓝色” | `{action:"setColor", color:"blue"}` |
| 撤销/重做 | “撤销” / “重做” | `{action:"undo"}` / `{action:"redo"}` |
| 清空 | “清空画布” | `{action:"clear"}` |
| 保存 | “保存图片” | `{action:"save"}` |

**容错映射：**
- “圆” = “圆形” = “circle”
- “方块” = “矩形” = “rect”
- “大一点” = 尺寸放大 1.5 倍
- “中间” = 画布中心区域

### 6.2 LLM 兜底

触发条件：
- 本地规则无法匹配；
- 输入含复杂连接词（“先…再…然后…”）；
- 输入含多步语义。

Prompt 要求 LLM 输出标准 JSON 命令数组，例如：

```
输入："先画一个红色的圆，再在旁边画一个蓝色的方块"
输出：[{action:"draw", shape:"circle", color:"red", position:"center", size:"medium"}, {action:"draw", shape:"rect", color:"blue", position:"right", size:"medium"}]
```

### 6.3 降级策略

LLM 也失败时，给出友好提示：
> “没听懂，请试试：画一个红色的圆”

---

## 7. Canvas 渲染

### 7.1 渲染模型

- 所有图形存于 `shapes` 数组；
- 每次操作后清空 Canvas，遍历 `shapes` 重绘；
- 不保存像素状态，便于撤销重做和高清缩放。

### 7.2 高清屏适配

```javascript
const dpr = window.devicePixelRatio || 1;
canvas.width = cssWidth * dpr;
canvas.height = cssHeight * dpr;
ctx.scale(dpr, dpr);
```

### 7.3 支持的图形

- 矩形（`rect`）
- 圆形（`circle`）
- 直线（`line`）
- 三角形（`triangle`）

### 7.4 位置语义

| 用户说法 | 解析结果 |
|----------|----------|
| 左上角 | `{x: margin, y: margin}` |
| 中间 / 中央 / 中心 | 画布几何中心 |
| 右上角 | `{x: right - margin, y: margin}` |
| 大一点 | 尺寸 × 1.5 |
| 小一点 | 尺寸 × 0.75 |

### 7.5 AI 美化（可选增强）

给基础图形加本地 Canvas 效果，提升视觉质感：
- `gradient`：线性渐变填充；
- `shadow`：外发光或投影；
- 不调用图片生成 API，保持低延迟。

---

## 8. 错误处理与用户反馈

### 8.1 反馈层级

1. **语音状态反馈**：麦克风状态、聆听中、处理中、执行完成；
2. **视觉反馈**：刚执行图形高亮闪烁、命令历史更新、错误边框变红；
3. **文字提示**：执行结果、错误原因、操作建议。

### 8.2 错误分类

| 场景 | 处理方式 |
|------|----------|
| 语音识别无结果 | “没有听清，请再说一次” |
| 解析失败 | “没听懂这个指令，试试：画一个红色的圆” |
| LLM 超时/失败 | 降级本地规则，仍失败则提示网络问题 |
| Canvas 绘制异常 | 捕获错误，提示“绘制失败”，不崩溃 |
| 浏览器不支持语音 | 初始化检测，给出明确提示 |

---

## 9. PWA 与部署

### 9.1 PWA 能力

- `manifest.json`：应用名称、图标、主题色、启动方式；
- Service Worker：缓存静态资源，支持离线打开；
- 可安装到桌面。

### 9.2 部署

- 构建产物为静态文件；
- 部署到 GitHub Pages 或 Vercel；
- 无后端，零服务器成本。

### 9.3 依赖声明

README 中需声明：
- React / ReactDOM
- Vite
- Vite PWA 插件
- Vitest
- LLM 调用方式（直接 fetch 或 SDK）

### 9.4 浏览器兼容

- Chrome/Edge：完整支持；
- Safari：部分支持，提示用户；
- Firefox 桌面：不支持 Web Speech API，给出降级提示。

---

## 10. 测试策略

### 10.1 单元测试

使用 Vitest，重点测解析逻辑：
- `commandParser.test.js`
- `colorMap.test.js`
- `positionResolver.test.js`
- `executor.test.js`

### 10.2 手动测试

每个 PR 合并前验证：
- 页面可打开，Canvas 正常；
- 麦克风可启动，识别有反馈；
- 标准指令正确绘制；
- 撤销/重做/清空可用；
- 主分支始终可运行。

### 10.3 标准语音测试用例

- “画一个红色矩形”
- “画个蓝色方块”
- “在中间画个大圆”
- “先画红圆，再在旁边画蓝方块”
- “画个五角星”（未支持时给出提示）

---

## 11. 功能范围

### 11.1 MVP（必须实现）

- [ ] 基础 Canvas 画板（自适应、高清适配）
- [ ] Web Speech API 语音识别
- [ ] 本地规则指令解析
- [ ] 绘制矩形、圆形、直线、三角形
- [ ] 颜色、位置、尺寸参数
- [ ] 撤销、重做、清空、保存
- [ ] 基础错误提示
- [ ] PWA 支持
- [ ] README 与设计文档

### 11.2 亮点功能（时间允许）

- [ ] LLM 复杂指令解析
- [ ] 多步命令队列执行
- [ ] AI 美化（渐变/阴影）
- [ ] 生成式填充（如星空、木纹背景）
- [ ] 语音反馈（TTS 播报执行结果）

### 11.3 明确不做

- 鼠标/键盘绘图（违反比赛规则）；
- 完整的矢量编辑器（时间不够）；
- 后端服务/用户账号系统（超出范围）。

---

## 12. 风险与应对

| 风险 | 影响 | 应对 |
|------|------|------|
| Web Speech API 在某些浏览器不可用 | 高 | 初始化检测 + 明确提示 |
| LLM API 延迟高/失败 | 中 | 本地规则优先 + 超时降级 |
| 复杂指令理解不稳定 | 中 | 提供标准指令示例，降低 demo 风险 |
| 3 天时间紧张 | 高 | 严格按 PR 计划小步交付，先做稳 MVP |
| 生成式填充效果不可控 | 中 | 作为可选亮点，不影响主链路 |

---

## 13. 设计决策记录

1. **为什么用 React 而不是 Vanilla JS？**  
   用户选择 React，因为 UI 状态管理更清晰，组件化便于迭代。虽然 Vanilla JS 延迟更优，但在本比赛规模下差异可忽略。

2. **为什么本地规则优先 + LLM 兜底？**  
   平衡响应延迟与复杂理解能力。高频指令本地毫秒响应，复杂指令 LLM 拆解，符合比赛评分点。

3. **为什么不做后端？**  
   比赛作品应控制成本、简化部署。LLM key 由前端直接使用（比赛 demo 场景可接受），静态托管零服务器成本。

4. **为什么核心图形是几何形状？**  
   几何形状语义明确，最适合语音控制；自由手绘难以精确控制，不符合比赛强调的指令准确性。

5. **为什么 PWA？**  
   比赛要求 Web 应用，PWA 可安装到桌面，演示体验更接近原生应用，且实现成本低。

---

## 14. 附录：指令能力表

| 指令类型 | 示例 | 解析方式 | 实现优先级 |
|----------|------|----------|------------|
| 绘制矩形 | “画一个红色矩形” | 本地规则 | P0 |
| 绘制圆形 | “画个蓝色圆” | 本地规则 | P0 |
| 绘制直线 | “画一条从左上到右下的线” | 本地规则 | P0 |
| 绘制三角形 | “画一个绿色三角形” | 本地规则 | P1 |
| 设置颜色 | “把颜色改成黄色” | 本地规则 | P0 |
| 指定位置 | “在中间画个圆” | 本地规则 | P0 |
| 指定大小 | “画个大矩形” | 本地规则 | P0 |
| 撤销/重做 | “撤销” / “重做” | 本地规则 | P0 |
| 清空 | “清空画布” | 本地规则 | P0 |
| 保存 | “保存图片” | 本地规则 | P0 |
| 复杂多步 | “先画红圆，再在旁边画蓝方块” | LLM | P1 |
| 同义词容错 | “方块”=“矩形” | 本地规则 | P0 |
| 生成式填充 | “把背景变成星空” | LLM + 文生图 API | P2 |

---

*本设计文档经用户逐段确认后生成，作为后续实现计划的输入。*
