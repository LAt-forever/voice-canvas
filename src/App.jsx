import { useRef, useState, useCallback } from 'react';
import CanvasBoard from './components/CanvasBoard';
import { executeCommand, createInitialState } from './services/executor';

function App() {
  const canvasRef = useRef(null);
  const [state, setState] = useState(createInitialState);
  const [canvasSize] = useState({ width: 800, height: 600 });

  const runCommand = useCallback((command) => {
    setState(prev => {
      const next = executeCommand(command, prev, canvasSize);
      return {
        ...next,
        undoStack: [...prev.undoStack, prev.shapes],
        redoStack: [],
        history: [...(prev.history || []), command],
        shouldSave: false
      };
    });
  }, [canvasSize]);

  const undo = useCallback(() => {
    setState(prev => {
      if (prev.undoStack.length === 0) return prev;
      const lastShapes = prev.undoStack[prev.undoStack.length - 1];
      return {
        ...prev,
        shapes: lastShapes,
        undoStack: prev.undoStack.slice(0, -1),
        redoStack: [...prev.redoStack, prev.shapes],
        shouldSave: false
      };
    });
  }, []);

  const redo = useCallback(() => {
    setState(prev => {
      if (prev.redoStack.length === 0) return prev;
      const nextShapes = prev.redoStack[prev.redoStack.length - 1];
      return {
        ...prev,
        shapes: nextShapes,
        redoStack: prev.redoStack.slice(0, -1),
        undoStack: [...prev.undoStack, prev.shapes],
        shouldSave: false
      };
    });
  }, []);

  return (
    <div className="app">
      {/* Top Header */}
      <header className="app-header">
        <div className="header-left">
          <h1>VoiceCanvas</h1>
        </div>
        <div className="header-right">
          <span className="session-timer">Session: 00:00:00</span>
          <div className="header-actions">
            <button type="button" className="icon-btn" aria-label="Undo" onClick={undo} disabled={state.undoStack.length === 0}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 7v6h6" />
                <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13" />
              </svg>
            </button>
            <button type="button" className="icon-btn" aria-label="Layers">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="12 2 2 7 12 12 22 7 12 2" />
                <polyline points="2 17 12 22 22 17" />
                <polyline points="2 12 12 17 22 12" />
              </svg>
            </button>
            <button type="button" className="icon-btn" aria-label="Settings">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.17 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.17 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.17a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
            </button>
            <button type="button" className="icon-btn avatar-btn" aria-label="User">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* Main Area */}
      <main className="app-main">
        {/* Left Sidebar: Tool State Cards */}
        <aside className="sidebar-left">
          <div className="tool-card">
            <span className="tool-label">Size</span>
            <span className="tool-value">24px</span>
          </div>
          <div className="tool-card">
            <span className="tool-label">Opacity</span>
            <span className="tool-value">85%</span>
          </div>
          <div className="tool-card">
            <span className="tool-label">Active Color</span>
            <div className="color-swatch" style={{ backgroundColor: state.currentColor }} />
          </div>
          <div className="tool-card">
            <span className="tool-label">Layer</span>
            <span className="tool-value">Base_02</span>
          </div>

          <div className="debug-actions">
            <button type="button" onClick={() => runCommand({ action: 'draw', shape: 'rect', color: 'red', position: 'center', size: 'medium' })} className="btn-debug">
              Draw Red Rect
            </button>
            <button type="button" onClick={() => runCommand({ action: 'draw', shape: 'circle', color: 'blue', position: 'center', size: 'medium' })} className="btn-debug">
              Draw Blue Circle
            </button>
            <button type="button" onClick={() => runCommand({ action: 'draw', shape: 'line', color: 'green', position: 'center', size: 'medium' })} className="btn-debug">
              Draw Green Line
            </button>
          </div>
        </aside>

        {/* Center Canvas Area */}
        <section className="canvas-area">
          <CanvasBoard ref={canvasRef} shapes={state.shapes} />
        </section>

        {/* Right Sidebar: Command Logic Panel */}
        <aside className="sidebar-right">
          <div className="command-panel-header">
            <div className="robot-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#4f46e5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="10" rx="2" />
                <circle cx="12" cy="5" r="2" />
                <path d="M12 7v4" />
                <line x1="8" y1="16" x2="8" y2="16" />
                <line x1="16" y1="16" x2="16" y2="16" />
              </svg>
            </div>
            <div className="command-panel-titles">
              <h2>Command Logic</h2>
              <p>Listening for instructions...</p>
            </div>
          </div>

          <div className="command-cards">
            <div className="command-card">
              <span className="command-card-label">CURRENT ACTION</span>
              <span className="command-card-value">{state.history.length > 0 ? state.history[state.history.length - 1].action : '—'}</span>
            </div>
            <div className="command-card">
              <span className="command-card-label">SUBJECT MATTER</span>
              <span className="command-card-value">{state.history.length > 0 ? (state.history[state.history.length - 1].shape || '—') : '—'}</span>
            </div>
            <div className="command-card">
              <span className="command-card-label">AESTHETIC STYLE</span>
              <span className="command-card-value">{state.history.length > 0 ? (state.history[state.history.length - 1].color || '—') : '—'}</span>
            </div>
          </div>

          <div className="command-actions">
            <button type="button" className="btn-secondary" onClick={undo} disabled={state.undoStack.length === 0}>Revert Last</button>
            <button type="button" className="btn-secondary" onClick={redo} disabled={state.redoStack.length === 0}>Redo</button>
          </div>

          <div className="command-hint">
            <p>Try saying: "Draw a red circle in the center"</p>
          </div>
        </aside>
      </main>

      {/* Bottom Floating Voice Bar */}
      <div className="voice-bar">
        <button type="button" className="mic-btn" aria-label="Toggle voice">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
            <line x1="12" y1="19" x2="12" y2="23" />
            <line x1="8" y1="23" x2="16" y2="23" />
          </svg>
        </button>
        <div className="voice-info">
          <span className="voice-label">LISTENING...</span>
          <span className="voice-transcript">Say something to start drawing</span>
        </div>
        <div className="voice-waveform">
          <span className="wave-bar" />
          <span className="wave-bar" />
          <span className="wave-bar" />
          <span className="wave-bar" />
          <span className="wave-bar" />
        </div>
        <button type="button" className="close-btn" aria-label="Close voice bar">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
    </div>
  );
}

export default App;
