const SYSTEM_PROMPT = `你是一个语音绘图助手的指令解析器。请把用户自然语言转换为 JSON 命令数组。

支持的 action：
- draw：绘制图形。必须包含 shape（rect/circle/line/triangle），可选 color（颜色名或 #hex）、position（center/top-left/top-right/bottom-left/bottom-right/top/bottom/left/right）、size（small/medium/large）。
- setColor：设置当前颜色。必须包含 color。
- undo：撤销上一步。
- redo：重做。
- clear：清空画布。
- save：保存图片。
- delete：删除图形。可选 filters：shape、color、position、size、last、all。
- setBackground：设置背景。必须包含 background 对象：{ type: 'solid'|'gradient'|'pattern'|'texture', subtype: 'linear'|'radial'|'stripes'|'checkerboard'|'dots'|'starry'|'noise', color, color2, direction: 'to-right'|'to-bottom'|'to-left'|'to-top'|..., density: 'low'|'medium'|'high' }。
- setGrid：设置网格显示。必须包含 visible（true/false）。
- setSnap：设置网格吸附。必须包含 snap（true/false）。
- setGridSize：设置网格大小。必须包含 size（small/medium/large）。

颜色支持中文颜色名或 #RRGGBB。位置可用中文或英文。

只输出 JSON 数组，不要任何解释。

示例：
输入："先画一个红色的圆，再在旁边画一个蓝色的方块"
输出：[{"action":"draw","shape":"circle","color":"red","position":"center","size":"medium"},{"action":"draw","shape":"rect","color":"blue","position":"right","size":"medium"}]

输入："把背景改成蓝色"
输出：[{"action":"setBackground","background":{"type":"solid","color":"#3b82f6"}}]`;

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
