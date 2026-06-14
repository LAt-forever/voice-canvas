# VoiceCanvas - 图层管理设计文档

> 版本：v1.0  
> 日期：2026-06-14  
> 状态：待实现  
> 关联需求：PR4 - 图层管理

---

## 1. 目标与范围

为 VoiceCanvas 增加多图层管理能力，让用户可以按图层组织图形，控制图层的显示/隐藏、切换、重命名和删除。

### 1.1 支持的语音指令

| 指令示例 | 预期效果 |
|----------|----------|
| "新建图层" | 创建一个新图层并切换为当前图层 |
| "切换到图层 2" | 将当前活动图层切换到指定图层 |
| "重命名当前图层为 XXX" | 重命名当前图层 |
| "隐藏当前图层" | 隐藏当前图层，该图层图形不渲染 |
| "显示当前图层" | 显示当前图层 |
| "删除当前图层" | 删除当前图层及其下所有图形 |

### 1.2 明确不做

- 不支持图层拖拽排序（按创建顺序固定）。
- 不支持图层透明度/混合模式。
- 锁定功能在本次实现中预留数据字段，但 UI 开关不做。

---

## 2. 数据模型

在 App state 中扩展图层相关字段：

```javascript
{
  shapes: [],
  layers: [
    { id: 'layer_1', name: '图层 1', visible: true, locked: false }
  ],
  currentLayerId: 'layer_1',
  // ... 其他已有字段
}
```

### 2.1 Layer 对象

```javascript
{
  id: string,       // 唯一标识
  name: string,     // 显示名称
  visible: boolean, // 是否可见
  locked: boolean   // 是否锁定（预留）
}
```

### 2.2 Shape 扩展

每个 shape 增加 `layerId` 字段，标识所属图层：

```javascript
{
  id: 'shape_xxx',
  type: 'rect',
  x: 100,
  y: 100,
  width: 80,
  height: 80,
  color: '#3b82f6',
  layerId: 'layer_1'
}
```

### 2.3 初始状态

默认存在一个名为 "图层 1" 的图层，所有新图形默认归属该图层。

---

## 3. 系统架构

```
用户语音输入
    ↓
commandParser.js
    ↓
识别图层操作类型与参数
    ↓
executor.js
    ↓
更新 layers / currentLayerId / shapes
    ↓
App.jsx 将 layers 和 currentLayerId 传给 CanvasBoard 与 LayerPanel
    ↓
CanvasBoard 按 currentLayerId 过滤/高亮，按 visible 过滤渲染
LayerPanel 显示图层列表、当前图层、可见性
```

### 3.1 模块职责

| 模块 | 改动 |
|------|------|
| `services/commandParser.js` | 新增图层指令解析 |
| `services/executor.js` | 新增图层操作分支；draw 时写入 `layerId`；保留 `layers` 和 `currentLayerId` |
| `components/CanvasBoard.jsx` | 渲染时过滤不可见图层的 shape；可选高亮当前图层图形 |
| `components/LayerPanel.jsx`（新建） | 显示图层列表、当前选中、可见性切换按钮 |
| `App.jsx` | 管理 `layers` 和 `currentLayerId`，传给 CanvasBoard 和 LayerPanel |
| `components/CommandPanel.jsx` | 显示当前图层名称 |
| `tests/` | 新增图层解析、执行、渲染单元测试 |

---

## 4. 解析层设计

### 4.1 触发词

- "图层" / "layer"

### 4.2 指令识别

| 用户说法 | 解析结果 |
|----------|----------|
| "新建图层" / "创建新图层" | `{ action: 'createLayer' }` |
| "切换到图层 2" / "切到图层 2" | `{ action: 'switchLayer', layerId/name: '图层 2' }` |
| "重命名当前图层为 XXX" | `{ action: 'renameLayer', name: 'XXX' }` |
| "隐藏当前图层" | `{ action: 'toggleLayerVisibility', visible: false }` |
| "显示当前图层" | `{ action: 'toggleLayerVisibility', visible: true }` |
| "删除当前图层" | `{ action: 'deleteLayer' }` |

### 4.3 图层索引解析

- "图层 2" 中的数字用于按创建顺序定位图层（`layers[1]`）。
- 也可以按名称匹配，例如 "切换到背景图层"。

---

## 5. 执行层设计

### 5.1 新增 Action

```javascript
case 'createLayer': {
  const newLayer = { id: generateId(), name: `图层 ${layers.length + 1}`, visible: true, locked: false };
  return { ...state, layers: [...layers, newLayer], currentLayerId: newLayer.id };
}

case 'switchLayer': {
  const target = findLayer(layers, command.target);
  return target ? { ...state, currentLayerId: target.id } : state;
}

case 'renameLayer': {
  return {
    ...state,
    layers: layers.map(l => l.id === currentLayerId ? { ...l, name: command.name } : l)
  };
}

case 'toggleLayerVisibility': {
  return {
    ...state,
    layers: layers.map(l => l.id === currentLayerId ? { ...l, visible: command.visible } : l)
  };
}

case 'deleteLayer': {
  if (layers.length <= 1) return state; // 至少保留一个图层
  const newLayers = layers.filter(l => l.id !== currentLayerId);
  const newCurrentId = newLayers[0].id;
  return {
    ...state,
    layers: newLayers,
    currentLayerId: newCurrentId,
    shapes: shapes.filter(s => s.layerId !== currentLayerId)
  };
}
```

### 5.2 draw 操作更新

`draw` 时给新 shape 添加 `layerId: state.currentLayerId`。

### 5.3 状态保留

所有现有分支返回时保留 `layers` 和 `currentLayerId`。

---

## 6. 渲染层设计

### 6.1 过滤规则

- `CanvasBoard` 渲染 shapes 时，只渲染 `layer.visible === true` 的图层中的 shape。
- 当前活动图层的 shape 正常渲染；非活动图层若可见也渲染，但可用较低透明度或不做高亮区分（本次不做高亮）。

### 6.2 导出图片

导出时只包含可见图层的 shape，与背景和网格规则保持一致（网格不导出）。

---

## 7. UI 设计

### 7.1 LayerPanel（新增）

位置：右侧面板 CommandPanel 上方，或左侧面板。

显示内容：
- 图层列表（按创建顺序）
- 当前选中图层高亮
- 每个图层的可见性开关（眼睛图标）
- 当前图层名称编辑框（可选，语音重命名已覆盖主要场景）

### 7.2 CommandPanel 显示

新增卡片：
- `CURRENT LAYER`：当前图层名称

---

## 8. 撤销/重做设计

采用 **完整快照** 方案：

- `undoStack` 中的每个快照包含 `{ shapes, layers, currentLayerId }`。
- `runCommand` 执行前，把当前 `{ shapes, layers, currentLayerId }` 压入 `undoStack`。
- `undo` 时弹出快照并恢复这三个字段。
- `redo` 逻辑与现有一致。

---

## 9. 测试策略

新增测试文件：

| 文件 | 覆盖内容 |
|------|----------|
| `tests/commandParser.layer.test.js` | 各类图层语音指令解析 |
| `tests/executor.layer.test.js` | 图层 CRUD、draw 归属当前图层、删除图层移除 shapes |
| `tests/CanvasBoard.layer.test.js`（可选） | 隐藏图层后 shape 不渲染 |

核心测试用例：
- "新建图层" 创建图层并切换。
- "切换到图层 2" 更新 `currentLayerId`。
- "删除当前图层" 移除图层及其 shapes。
- draw 命令生成的 shape 带有 `layerId`。
- undo 能恢复图层状态。

---

## 10. 验收标准

- [ ] 语音说"新建图层"，创建新图层并切换。
- [ ] 语音说"切换到图层 2"，当前图层变更。
- [ ] 语音说"隐藏当前图层"，该图层图形不再渲染。
- [ ] 语音说"删除当前图层"，该图层及其图形被移除。
- [ ] 新绘制的图形自动归属当前图层。
- [ ] 右侧面板显示当前图层名称和图层列表。
- [ ] 撤销/重做能恢复图层状态。
- [ ] 新增单元测试全部通过。
- [ ] 生产构建成功。

---

*本设计文档基于用户提供的 PR4 图层管理需求整理，采用完整快照撤销/重做方案。*
