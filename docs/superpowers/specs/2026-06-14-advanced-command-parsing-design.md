# VoiceCanvas - 高级指令解析面板设计文档

> 版本：v1.0
> 日期：2026-06-14
> 状态：待实现
> 关联需求：高级指令解析（AetherDraw AI 未实现功能之一）

---

## 1. 目标与范围

为 VoiceCanvas 增加一个“高级指令解析”面板。当用户说出需要 LLM 解析的复杂指令时，系统先把 LLM 生成的执行计划以人类可读的方式展示出来，等待用户语音确认后再执行。

### 1.1 支持的语音指令

| 指令示例 | 预期效果 |
|----------|----------|
| "画一座城堡" | LLM 解析为多个 draw 命令，面板展示计划，用户确认后执行 |
| "把背景改成蓝色，再画一个红色的圆" | 多步骤计划展示并确认执行 |
| "确认" / "执行" | 在确认态下执行面板中的计划 |
| "取消" / "放弃" | 在确认态下放弃计划 |

### 1.2 明确不做

- 不直接执行未经确认的计划（默认取消）。
- 不支持在确认态下追加新指令（必须先确认或取消）。
- 本次不实现复杂的多轮对话或计划编辑。

---

## 2. 数据模型

在 App state 中扩展确认态字段：

```javascript
{
  // ... 已有字段
  pendingPlan: null | {
    commands: Command[],      // LLM 返回的 JSON 命令数组
    descriptions: string[],   // 每步中文描述
    startedAt: number         // 时间戳，用于超时倒计时
  },
  isConfirming: boolean       // 是否处于确认监听态
}
```

### 2.1 pendingPlan 生命周期

- **创建**：LLM 解析成功且命令数组非空时写入。
- **执行**：用户说“确认”或点击“确认执行”按钮时，按顺序执行 `commands`。
- **清除**：用户说“取消”、点击“取消”按钮或超时未确认时清除。

---

## 3. 系统架构

```
用户语音输入
    ↓
commandParser.js（无法本地识别）
    ↓
needsLLM(text) === true
    ↓
parseWithLLM(text) 返回命令数组
    ↓
describeCommand(commands) 生成中文步骤描述
    ↓
App.jsx 设置 pendingPlan + isConfirming
    ↓
CommandPlanPanel 展示计划、倒计时、确认/取消按钮
    ↓
用户语音说“确认”/“取消”或点击按钮
    ↓
执行全部命令 或 放弃计划
```

### 3.1 模块职责

| 模块 | 改动 |
|------|------|
| `services/llmParser.js` | 无需改动，已返回命令数组 |
| `utils/describeCommand.js`（新建） | 将命令对象转换为中文自然语言描述 |
| `components/CommandPlanPanel.jsx`（新建） | 展示计划步骤、倒计时、确认/取消按钮 |
| `App.jsx` | 管理 `pendingPlan` / `isConfirming`，处理确认/取消语音分支 |
| `styles/index.css` | 新增面板样式 |
| `tests/describeCommand.test.js`（新建） | 描述生成单元测试 |
| `README.md` | 补充高级指令解析与确认词说明 |

---

## 4. 语音识别改造

### 4.1 确认态拦截

在 `App.jsx` 的 `createSpeechRecognizer.onResult` 中，优先判断确认态：

```javascript
if (pendingPlanRef.current && isFinal) {
  if (isConfirm(text)) executePendingPlan();
  else if (isCancel(text)) clearPendingPlan();
  return;
}
```

### 4.2 确认词与取消词

- **确认**：`确认`、`执行`、`开始`、`好`
- **取消**：`取消`、`放弃`、`不`、`算了`

匹配不区分大小写，包含任一关键词即生效。

### 4.3 超时机制

- 进入确认态后启动 5 秒倒计时。
- 超时自动调用 `clearPendingPlan()`，状态回到正常监听。
- 用户确认或取消时清理定时器。

---

## 5. UI 设计

### 5.1 CommandPlanPanel

**位置**：右侧面板 `CommandPanel` 上方，浮动卡片形式。

**显示内容**：

- 标题："识别到多步计划"
- 步骤列表（带序号的中文描述）
- 倒计时进度条
- "确认执行" 按钮（语音确认优先，按钮兜底）
- "取消" 按钮

**状态提示**：

- 等待确认时：`statusMessage` 显示 "请说“确认”执行，或“取消”放弃"
- 执行后：显示 "已执行 N 个步骤"
- 取消/超时后：显示 "已取消"

### 5.2 面板关闭时机

- 计划执行完毕
- 用户取消
- 超时

---

## 6. 描述生成设计

### 6.1 describeCommand 输出示例

| 命令 | 描述 |
|------|------|
| `draw` shape=circle color=red size=medium position=center | "在中心画一个红色的中号圆形" |
| `setColor` color=blue | "将当前颜色设置为蓝色" |
| `setBackground` type=gradient color=blue color2=green direction=to-right | "将背景设置为从左到右的蓝色到绿色渐变" |
| `createLayer` | "新建一个图层并切换到它" |
| `switchLayer` target="图层 2" | "切换到图层 2" |
| `setGrid` visible=true | "显示网格" |
| `setSnap` snap=true | "开启网格吸附" |
| `undo` | "撤销上一步" |
| `clear` | "清空画布" |

### 6.2 未知命令处理

遇到无法描述的命令时，返回原始 JSON 字符串作为兜底，确保面板始终有内容。

---

## 7. 执行与撤销行为

### 7.1 执行计划

用户确认后，按 `commands` 顺序逐个调用现有的 `runCommand`。

### 7.2 撤销行为

保持现有快照机制：每个命令执行都会压入一次 `undoStack`。因此撤销一个多步骤计划需要连续调用多次撤销。这样改动最小，不破坏现有撤销逻辑。

后续如需“一键回退整个计划”，可扩展为 `executePlan` 批量动作。

---

## 8. 测试策略

| 文件 | 覆盖内容 |
|------|----------|
| `tests/describeCommand.test.js` | 各类命令的中文描述生成、未知命令兜底 |

核心测试用例：

- `draw` 命令生成正确的位置/颜色/大小/形状描述。
- `setBackground` 渐变类型生成方向与颜色描述。
- 图层命令生成正确描述。
- 未知命令返回原始 JSON。

---

## 9. 验收标准

- [ ] 说出复杂指令后，LLM 计划显示在面板中。
- [ ] 说出“确认”后，计划中的命令依次执行。
- [ ] 说出“取消”或超时后，计划不执行并关闭面板。
- [ ] 面板中的步骤描述为人类可读中文。
- [ ] 点击“确认执行”和“取消”按钮效果与语音一致。
- [ ] `describeCommand` 单元测试全部通过。
- [ ] 生产构建成功。

---

*本设计文档基于用户选择优先实现“高级指令解析面板”整理，采用语音确认 + 按钮兜底的交互方案。*
