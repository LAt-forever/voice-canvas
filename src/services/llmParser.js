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
