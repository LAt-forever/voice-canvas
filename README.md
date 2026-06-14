# VoiceCanvas - AI Voice Drawing Tool

A pure voice-controlled Web drawing tool (PWA). Users can create geometric shapes on a canvas using only spoken commands — no mouse or keyboard required.

## Tech Stack

- Vite
- React 18
- HTML5 Canvas 2D
- Web Speech API
- Vitest
- Vite PWA

## Third-Party Dependencies

- `react` / `react-dom`
- `@vitejs/plugin-react`
- `vite-plugin-pwa`
- `vitest`
- `@testing-library/react`
- `@testing-library/jest-dom`
- `jsdom`

## Getting Started

```bash
npm install
npm run dev
```

Open `http://localhost:5173` in Chrome or Edge.

## Build

```bash
npm run build
```

## Test

```bash
npm run test
```

## Voice Commands

- "Draw a red rectangle"
- "Draw a big blue circle in the top-left"
- "Draw a green line"
- "Undo" / "Redo"
- "Clear canvas"
- "Save image"
- "删除最后一个图形"
- "删掉左上角的红方块"
- "删除所有红色的图形"
- "显示网格"
- "隐藏网格"
- "打开吸附"
- "关闭吸附"
- "网格调大"
- "网格调小"
- "把背景改成蓝色"
- "换成从左到右的红蓝渐变"
- "换成中心扩散的蓝色渐变"
- "换成黑白条纹"
- "换成棋盘格"
- "换成星空背景"
- "恢复默认背景"
- "新建图层"
- "切换到图层 2"
- "重命名当前图层为背景"
- "隐藏当前图层"
- "显示当前图层"
- "删除当前图层"
- "First draw a red circle, then draw a blue square next to it" (requires LLM API key)

## LLM Configuration

For complex multi-step commands and portrait generation, copy `.env.example` to `.env` and add your API keys:

```bash
VITE_LLM_API_KEY=your-api-key
VITE_LLM_API_ENDPOINT=https://api.deepseek.com/v1/chat/completions
VITE_STABILITY_API_KEY=your-stability-key
```

You can use DeepSeek, OpenAI, or any OpenAI-compatible API for LLM command parsing.

### Environment Variables

| Variable | Purpose |
|---|---|
| `VITE_LLM_API_KEY` | DeepSeek / OpenAI-compatible API key for command parsing |
| `VITE_LLM_API_ENDPOINT` | LLM API endpoint URL |
| `VITE_LLM_MODEL` | LLM model name, e.g. `deepseek-chat` |
| `VITE_STABILITY_API_KEY` | Stability AI key for portrait generation |
| `VITE_STABILITY_API_ENDPOINT` | Stability AI image generation endpoint |
| `VITE_PORTRAIT_MODEL` | Stability model, e.g. `sd3-medium` |

当一句话包含多步操作时，VoiceCanvas 会调用 LLM 解析为执行计划，并在面板上展示每一步，等待你确认。（需要配置 LLM API key）

示例：

```text
“画一个红色的圆，再在旁边画一个蓝色的方块，然后把背景改成绿色”
```

面板会列出步骤：

1. 在中心画一个红色的中号圆形
2. 在右边画一个蓝色的中号矩形
3. 将背景设置为绿色纯色

确认词：

- `确认` / `执行` / `开始` / `好`：执行计划
- `取消` / `放弃` / `不` / `算了`：放弃计划

5 秒内未确认会自动取消。

## Browser Support

- Chrome / Edge: full support
- Safari: partial support
- Firefox desktop: speech recognition not supported

## Design Document

See [docs/superpowers/specs/2026-06-12-voicecanvas-design.md](docs/superpowers/specs/2026-06-12-voicecanvas-design.md).

## License

MIT
