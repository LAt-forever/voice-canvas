# VoiceCanvas - 删除/擦除指定图形设计文档

> 版本：v1.0  
> 日期：2026-06-13  
> 状态：待实现  
> 关联需求：主画布功能增强 - 第一项 PR

---

## 1. 目标与范围

让 VoiceCanvas 支持通过语音删除已绘制的图形，提升画布的可编辑性。

### 1.1 支持的语音指令

| 指令示例 | 预期效果 |
|----------|----------|
| "删除最后一个图形" | 移除最近绘制的一个图形 |
| "删掉左上角的红方块" | 删除位于左上角、红色、矩形的图形 |
| "删除所有红色的图形" | 批量删除所有颜色为红色的图形 |
| "清空画布" | 已有功能，保持不动 |

### 1.2 明确不做

- 鼠标/键盘点选删除（违反比赛纯语音控制规则）。
- 模糊语义删除（如"把丑的那个删掉"），留到后续 LLM/Agent 模式再做。
- 删除动画、粒子特效等视觉增强，保持 PR 小粒度。

---

## 2. 数据模型

### 2.1 Shape 图元

复用现有模型，不新增字段：

```javascript
{
  id: "uuid",
  type: "rect" | "circle" | "line" | "triangle",
  x: 100,
  y: 100,
  width: 200,
  height: 150,
  color: "#ef4444"
}
```

### 2.2 Delete Command

```javascript
{
  action: "delete",
  filters: {
    last?: boolean,    // 是否只删最后一个
    all?: boolean,     // 是否批量删除
    color?: string,    // 颜色名称或 hex
    shape?: string,    // rect / circle / line / triangle
    position?: string, // center / top-left / ...
    size?: string      // small / medium / large（可选）
  }
}
```

---

## 3. 系统架构

```
用户语音输入
    ↓
commandParser.js
    ↓
本地规则识别删除意图 + 提取 filters
    ↓
executor.js
    ↓
findMatchingShapes(shapes, filters) 计算匹配
    ↓
返回新 shapes 数组
    ↓
CanvasBoard 重绘
    ↓
UI Feedback（状态提示）
```

### 3.1 模块职责

| 模块 | 改动 |
|------|------|
| `services/commandParser.js` | 新增删除意图识别与 filters 提取 |
| `services/executor.js` | 新增 `delete` 分支与匹配算法 |
| `components/CommandPanel.jsx` | 显示 delete 动作与相关属性 |
| `tests/` | 新增删除解析与匹配单元测试 |

---

## 4. 解析层设计

### 4.1 删除意图识别

触发词：
- 中文：删、删除、删掉、去掉、移除
- 英文：delete、remove、erase

当文本包含以上任意触发词时，进入 `parseDeleteCommand(text)`。

### 4.2 Filters 提取

复用现有 `detectColor`、`detectShape`、`detectPosition`、`detectSize`。

范围词：
- "最后一个 / 最后那个 / last one" → `last: true`
- "所有 / 全部 / all" → `all: true`

### 4.3 输出示例

| 输入 | 输出 |
|------|------|
| "删除最后一个图形" | `{ action:'delete', filters:{ last:true } }` |
| "删掉左上角的红方块" | `{ action:'delete', filters:{ color:'red', shape:'rect', position:'top-left' } }` |
| "删除所有红色的图形" | `{ action:'delete', filters:{ color:'red', all:true } }` |
| "把所有圆都删掉" | `{ action:'delete', filters:{ shape:'circle', all:true } }` |

---

## 5. 执行层设计

### 5.1 匹配算法 `findMatchingShapes`

输入：当前 `shapes` 数组 + `filters`。

步骤：
1. 若 `last: true`，直接取 `shapes` 最后一个元素；若同时存在其他 filters，则在该元素上检查是否满足，不满足则返回空。
2. 否则按 `color / shape / position / size` 逐项过滤。
   - 颜色：将 `shape.color` 与 `resolveColor(filter.color)` 比较。
   - 形状：`shape.type === filter.shape`。
   - 位置：计算目标锚点（复用 `resolvePosition`），取图形中心到锚点距离最近的匹配项。
   - 大小（可选）：将图形面积与 `SIZE_PRESETS` 比较，取最接近的预设。
3. 若 `all: true`，返回所有匹配项；否则返回最近一个匹配项（避免误删多个）。

### 5.2 执行结果

```javascript
{
  shapes: [...],       // 删除后的新数组
  currentColor,        // 不变
  removed: [...]       // 被删除的图元，用于 UI 反馈
}
```

---

## 6. 撤销/重做

复用现有快照机制：`runCommand` 在执行前会把 `prev.shapes` 压入 `undoStack`。

- 撤销：从 `undoStack` 恢复上一个 `shapes` 快照。
- 重做：从 `redoStack` 恢复。

删除命令不需要额外实现撤销逻辑。

---

## 7. UI 反馈

### 7.1 状态提示

| 场景 | statusMessage |
|------|---------------|
| 删除 1 个图形 | "Deleted 1 shape" |
| 删除多个图形 | "Deleted N shapes" |
| 无匹配目标 | "No matching shape found" |
| 匹配到多个但未指定 all | "Deleted the most recent matching shape" |

### 7.2 CommandPanel 显示

- `CURRENT ACTION` → `delete`
- `SUBJECT MATTER` → 被删图形的 `shape` 或 `all`
- `AESTHETIC STYLE` → 被删图形的 `color` 或 `—`

---

## 8. 测试策略

新增以下测试文件：

| 文件 | 覆盖内容 |
|------|----------|
| `tests/commandParser.delete.test.js` | 各类删除语句的解析结果 |
| `tests/deleteMatcher.test.js` | 匹配算法在多种图形组合下的正确性 |
| `tests/executor.delete.test.js` | 删除后撤销/重做状态正确 |

核心测试用例：
- "删除最后一个图形" 只删除最后一个。
- "删掉左上角的红方块" 在多个红方块中定位到左上角那个。
- "删除所有红色的图形" 批量删除，撤销后全部恢复。
- 无匹配时 `shapes` 不变。

---

## 9. 远期兼容性

`parseCommand` 返回的仍是 `Command[]`，`executor` 仍是纯函数。后续无论是 LLM 模式还是 Agent 模式，只要最终输出同样的 `delete` 命令对象，就能直接复用执行层。

建议保持 `filters` 结构稳定，作为本地规则与 LLM/Agent 之间的通用删除协议。

---

## 10. 验收标准

- [ ] 语音说"删除最后一个图形"，画布上最近绘制的图形消失。
- [ ] 语音说"删掉左上角的红方块"，对应图形消失。
- [ ] 语音说"删除所有红色的图形"，所有红色图形消失。
- [ ] 删除后点击"Revert Last"可恢复。
- [ ] 删除失败时有明确状态提示。
- [ ] 新增单元测试全部通过。

---

*本设计文档经用户确认后生成，作为 PR1 实现计划的输入。*
