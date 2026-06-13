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
- "First draw a red circle, then draw a blue square next to it" (requires LLM API key)

## LLM Configuration

For complex multi-step commands, copy `.env.example` to `.env` and add your API key:

```bash
VITE_LLM_API_KEY=your-api-key
VITE_LLM_API_ENDPOINT=https://api.deepseek.com/v1/chat/completions
```

You can use DeepSeek, OpenAI, or any OpenAI-compatible API.

## Browser Support

- Chrome / Edge: full support
- Safari: partial support
- Firefox desktop: speech recognition not supported

## Design Document

See [docs/superpowers/specs/2026-06-12-voicecanvas-design.md](docs/superpowers/specs/2026-06-12-voicecanvas-design.md).

## License

MIT
