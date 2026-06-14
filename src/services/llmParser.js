import { describeCommand } from '../utils/describeCommand';

const SYSTEM_PROMPT = `你是一个语音绘图助手的指令解析器。请把用户自然语言转换为 JSON。

输出格式：
{
  "status": "complete" | "needs_clarification",
  "commands": [命令数组],
  "clarifications": [缺失/模糊参数列表]  // 仅在 status = "needs_clarification" 时存在
}

命令数组中每个对象的 action 支持：draw、setColor、undo、redo、clear、save、delete、setBackground、setGrid、setSnap、setGridSize、createLayer、switchLayer、renameLayer、toggleLayerVisibility、deleteLayer。

draw 命令必须包含 shape（rect/circle/line/triangle），可选 color（颜色名或 #hex）、position（center/top-left/...）、size（small/medium/large）。

当参数缺失或模糊时，status 设置为 "needs_clarification"，并在 clarifications 中为每个缺失参数提供：
- commandIndex: 对应命令在 commands 数组中的索引
- param: 缺失参数名，只能是 color / size / position / shape
- question: 向用户提问的简短中文问题
- options: 3-4 个中文选项数组

规则：
- draw 命令缺失 shape 或 color 时必须列入 clarifications；shape 可选 rect/circle/line/triangle。
- position 缺失时默认 center，不列入 clarifications。
- size 缺失时默认 medium，不列入 clarifications。
- 只输出 JSON，不要任何解释。

示例 1：
输入："先画一个红色的圆，再在旁边画一个蓝色的方块"
输出：{"status":"complete","commands":[{"action":"draw","shape":"circle","color":"red","position":"center","size":"medium"},{"action":"draw","shape":"rect","color":"blue","position":"right","size":"medium"}]}

示例 2：
输入："画一个圆"
输出：{"status":"needs_clarification","commands":[{"action":"draw","shape":"circle","color":null,"position":"center","size":"medium"}],"clarifications":[{"commandIndex":0,"param":"color","question":"想用什么颜色？","options":["红色","蓝色","绿色","黄色"]}]}`;

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
  const trimmed = content.trim();
  const pattern = trimmed.startsWith('[') ? /\[[\s\S]*\]/ : /\{[\s\S]*\}/;
  const match = content.match(pattern);
  if (!match) throw new Error('LLM 返回格式错误');

  return JSON.parse(match[0]);
}

export async function parseWithClarification(text, apiKey, apiEndpoint, model) {
  const raw = await parseWithLLM(text, apiKey, apiEndpoint, model);

  if (Array.isArray(raw)) {
    return { status: 'complete', commands: raw };
  }

  if (!raw || typeof raw !== 'object') {
    throw new Error('LLM 返回格式错误');
  }

  const status = raw.status === 'needs_clarification' ? 'needs_clarification' : 'complete';
  const commands = Array.isArray(raw.commands) ? raw.commands : [];
  const clarifications = status === 'needs_clarification'
    ? (Array.isArray(raw.clarifications) ? raw.clarifications : [])
    : [];

  return { status, commands, clarifications };
}

export function createPlanDescription(commands) {
  return commands.map(describeCommand);
}
