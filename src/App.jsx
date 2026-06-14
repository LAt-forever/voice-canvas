import { useRef, useState, useCallback, useEffect } from 'react';
import CanvasBoard from './components/CanvasBoard';
import LayerPanel from './components/LayerPanel';
import CommandPanel from './components/CommandPanel';
import VoiceBar from './components/VoiceBar';
import { executeCommand, createInitialState, GRID_SIZE_PRESETS } from './services/executor';
import { createSpeechRecognizer, isSpeechSupported } from './services/speechService';
import { parseCommand, needsLLM } from './services/commandParser';
import { parseWithLLM } from './services/llmParser';
import { describeCommand } from './utils/describeCommand';
import { isConfirm, isCancel } from './utils/confirmationMatcher';
import CommandPlanPanel from './components/CommandPlanPanel';

function getCommandFeedback(command, result) {
  if (command.action === 'delete') {
    const count = result.removed?.length || 0;
    if (count === 0) return 'No matching shape found';
    return `Deleted ${count} shape${count > 1 ? 's' : ''}`;
  }
  if (command.action === 'setBackground') {
    const type = command.background?.type || 'solid';
    return `Background set to ${type}`;
  }
  return null;
}

function getGridFeedback(command) {
  switch (command.action) {
    case 'setGrid':
      return command.visible ? 'Grid shown' : 'Grid hidden';
    case 'setSnap':
      return command.snap ? 'Snap enabled' : 'Snap disabled';
    case 'setGridSize':
      return `Grid spacing set to ${GRID_SIZE_PRESETS[command.size] || GRID_SIZE_PRESETS.medium}px`;
    default:
      return null;
  }
}

function getLayerFeedback(command, state) {
  switch (command.action) {
    case 'createLayer':
      return 'Layer created';
    case 'switchLayer': {
      const targetLayer = state.layers.find(l => l.id === command.target);
      return `Switched to ${targetLayer?.name || command.target}`;
    }
    case 'renameLayer':
      return `Layer renamed to ${command.name}`;
    case 'toggleLayerVisibility':
      return command.visible ? 'Layer shown' : 'Layer hidden';
    case 'deleteLayer':
      return 'Layer deleted';
    default:
      return null;
  }
}

function App() {
  const canvasRef = useRef(null);
  const [state, setState] = useState(() => ({
    ...createInitialState(),
    lastRemoved: []
  }));
  const [canvasSize] = useState({ width: 800, height: 600 });
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [statusMessage, setStatusMessage] = useState(
    isSpeechSupported() ? 'Ready' : 'Speech recognition not supported'
  );
  const recognizerRef = useRef(null);
  const feedbackRef = useRef(null);

  const [isProcessing, setIsProcessing] = useState(false);
  const [pendingPlan, setPendingPlan] = useState(null);
  const pendingPlanRef = useRef(null);
  const LLM_API_KEY = import.meta.env.VITE_LLM_API_KEY || '';
  const LLM_API_ENDPOINT = import.meta.env.VITE_LLM_API_ENDPOINT || 'https://api.deepseek.com/v1/chat/completions';
  const LLM_MODEL = import.meta.env.VITE_LLM_MODEL || 'deepseek-chat';

  const runCommand = useCallback((command) => {
    setState(prev => {
      const { removed, ...next } = executeCommand(command, prev, canvasSize);
      const feedback = getCommandFeedback(command, { ...next, removed })
        || getGridFeedback(command)
        || getLayerFeedback(command, next);
      feedbackRef.current = feedback;
      return {
        ...next,
        lastRemoved: removed || [],
        shouldSave: next.shouldSave || false,
        undoStack: [...prev.undoStack, { shapes: prev.shapes, layers: prev.layers, currentLayerId: prev.currentLayerId }],
        redoStack: [],
        history: [...(prev.history || []), command]
      };
    });
    if (feedbackRef.current) {
      setStatusMessage(feedbackRef.current);
      feedbackRef.current = null;
    }
  }, [canvasSize]);

  const clearPendingPlan = useCallback(() => {
    pendingPlanRef.current = null;
    setPendingPlan(null);
    setStatusMessage('Cancelled');
  }, []);

  const executePendingPlan = useCallback(() => {
    const plan = pendingPlanRef.current;
    if (!plan?.commands?.length) return;
    plan.commands.forEach(runCommand);
    pendingPlanRef.current = null;
    setPendingPlan(null);
    setStatusMessage(`Executed ${plan.commands.length} steps`);
  }, [runCommand]);

  const executePendingPlanRef = useRef(executePendingPlan);
  const clearPendingPlanRef = useRef(clearPendingPlan);
  executePendingPlanRef.current = executePendingPlan;
  clearPendingPlanRef.current = clearPendingPlan;

  const undo = useCallback(() => {
    setState(prev => {
      if (prev.undoStack.length === 0) return prev;
      const lastSnapshot = prev.undoStack[prev.undoStack.length - 1];
      return {
        ...prev,
        shapes: lastSnapshot.shapes,
        layers: lastSnapshot.layers,
        currentLayerId: lastSnapshot.currentLayerId,
        undoStack: prev.undoStack.slice(0, -1),
        redoStack: [...prev.redoStack, { shapes: prev.shapes, layers: prev.layers, currentLayerId: prev.currentLayerId }],
        shouldSave: false,
        lastRemoved: []
      };
    });
  }, []);

  const redo = useCallback(() => {
    setState(prev => {
      if (prev.redoStack.length === 0) return prev;
      const nextSnapshot = prev.redoStack[prev.redoStack.length - 1];
      return {
        ...prev,
        shapes: nextSnapshot.shapes,
        layers: nextSnapshot.layers,
        currentLayerId: nextSnapshot.currentLayerId,
        redoStack: prev.redoStack.slice(0, -1),
        undoStack: [...prev.undoStack, { shapes: prev.shapes, layers: prev.layers, currentLayerId: prev.currentLayerId }],
        shouldSave: false,
        lastRemoved: []
      };
    });
  }, []);

  useEffect(() => {
    if (!isSpeechSupported()) {
      setStatusMessage('Speech recognition is not supported in this browser. Please use Chrome or Edge.');
      return;
    }

    recognizerRef.current = createSpeechRecognizer({
      onResult: async (text, isFinal) => {
        setTranscript(text);
        if (isFinal) {
          if (pendingPlanRef.current) {
            if (isConfirm(text)) {
              executePendingPlanRef.current();
              return;
            }
            if (isCancel(text)) {
              clearPendingPlanRef.current();
              return;
            }
            clearPendingPlanRef.current();
          }
          const command = parseCommand(text);
          if (command) {
            command.forEach(runCommand);
            const lastCmd = command[command.length - 1];
            const feedbackActions = ['delete', 'setGrid', 'setSnap', 'setGridSize', 'setBackground', 'createLayer', 'switchLayer', 'renameLayer', 'toggleLayerVisibility', 'deleteLayer'];
            if (!feedbackActions.includes(lastCmd?.action)) {
              setStatusMessage(`Executed: ${text}`);
            }
          } else if (needsLLM(text) && LLM_API_KEY) {
            setIsProcessing(true);
            setStatusMessage('Thinking...');
            try {
              const commands = await parseWithLLM(text, LLM_API_KEY, LLM_API_ENDPOINT, LLM_MODEL);
              if (!commands || commands.length === 0) {
                setStatusMessage('No plan generated');
                return;
              }
              const descriptions = commands.map(describeCommand);
              const plan = { commands, descriptions, startedAt: Date.now() };
              pendingPlanRef.current = plan;
              setPendingPlan(plan);
              setStatusMessage('Say "confirm" to execute or "cancel" to abort');
            } catch (err) {
              setStatusMessage(`Parsing failed: ${err.message}`);
            } finally {
              setIsProcessing(false);
            }
          } else {
            setStatusMessage(`Unrecognized: ${text}`);
          }
        }
      },
      onError: (error) => {
        setStatusMessage(`Speech error: ${error}`);
        setIsListening(false);
      },
      onEnd: () => {
        setIsListening(false);
      }
    });

    return () => {
      if (recognizerRef.current) recognizerRef.current.stop();
    };
  }, [runCommand]);

  const toggleListening = useCallback(() => {
    if (isListening) {
      recognizerRef.current?.stop();
    } else {
      setTranscript('');
      setStatusMessage('Listening...');
      try {
        recognizerRef.current?.start();
      } catch (err) {
        setStatusMessage(`Could not start listening: ${err.message}`);
        return;
      }
    }
    setIsListening(prev => !prev);
  }, [isListening]);

  const closeVoiceBar = useCallback(() => {
    if (isListening) toggleListening();
  }, [isListening, toggleListening]);

  const saveCanvas = useCallback(() => {
    runCommand({ action: 'save' });
  }, [runCommand]);

  useEffect(() => {
    if (state.shouldSave && canvasRef.current) {
      const dataUrl = canvasRef.current.exportImage();
      if (dataUrl) {
        const link = document.createElement('a');
        link.href = dataUrl;
        link.download = `voice-canvas-${Date.now()}.png`;
        link.click();
      }
      setState(prev => ({ ...prev, shouldSave: false }));
    }
  }, [state.shouldSave]);

  const handleToggleLayerVisibility = useCallback((layerId) => {
    const layer = state.layers.find(l => l.id === layerId);
    if (!layer) return;
    runCommand({ action: 'toggleLayerVisibility', visible: !layer.visible, layerId });
  }, [state.layers, runCommand]);

  const lastCommand = state.history.length > 0 ? state.history[state.history.length - 1] : null;

  return (
    <div className="app">
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
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l-.06-.06A1.65 1.65 0 0 0 4.17 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.17 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l-.06-.06A1.65 1.65 0 0 0 9 4.17a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l-.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06-.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
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

      <main className="app-main">
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

        <section className="canvas-area">
          <CanvasBoard ref={canvasRef} shapes={state.shapes} background={state.background} grid={state.grid} layers={state.layers} />
        </section>

        {pendingPlan && (
          <CommandPlanPanel
            descriptions={pendingPlan.descriptions}
            timeoutMs={5000}
            onConfirm={executePendingPlan}
            onCancel={clearPendingPlan}
          />
        )}

        <LayerPanel
          layers={state.layers}
          currentLayerId={state.currentLayerId}
          onSelectLayer={(id) => runCommand({ action: 'switchLayer', target: id })}
          onToggleVisibility={handleToggleLayerVisibility}
        />

        <CommandPanel
          statusMessage={statusMessage}
          currentCommand={lastCommand}
          lastRemoved={state.lastRemoved}
          background={state.background}
          grid={state.grid}
          layers={state.layers}
          currentLayerId={state.currentLayerId}
          onUndo={undo}
          onRedo={redo}
          canUndo={state.undoStack.length > 0}
          canRedo={state.redoStack.length > 0}
          onClear={() => runCommand({ action: 'clear' })}
          onSave={saveCanvas}
        />
      </main>

      <VoiceBar
        isListening={isListening}
        transcript={transcript}
        onToggle={toggleListening}
        onClose={closeVoiceBar}
      />
    </div>
  );
}

export default App;
