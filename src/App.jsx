import { useRef, useState, useCallback, useEffect } from 'react';
import CanvasBoard from './components/CanvasBoard';
import LayerPanel from './components/LayerPanel';
import CommandPanel from './components/CommandPanel';
import VoiceBar from './components/VoiceBar';
import { executeCommand, createInitialState, GRID_SIZE_PRESETS } from './services/executor';
import { createSpeechRecognizer, isSpeechSupported } from './services/speechService';
import { parseCommand, needsLLM, extractParameter } from './services/commandParser';
import { parseWithClarification, createPlanDescription } from './services/llmParser';
import { isConfirm, isCancel, isSkip } from './utils/confirmationMatcher';
import CommandPlanPanel from './components/CommandPlanPanel';
import { portraitPipeline } from './services/portraitPipeline';
import * as portraitAnimatorModule from './services/portraitAnimator';
import PencilCursor from './components/PencilCursor';

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

function applyAnswerToCommand(command, param, value, currentColor) {
  if (param === 'shape') return { ...command, shape: value };
  if (param === 'color') return { ...command, color: value || currentColor };
  if (param === 'position') return { ...command, position: value || 'center' };
  if (param === 'size') return { ...command, size: value || 'medium' };
  return command;
}

function getDefaultForParam(param, currentColor) {
  if (param === 'color') return currentColor;
  if (param === 'position') return 'center';
  if (param === 'size') return 'medium';
  return undefined;
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
  const [planState, setPlanState] = useState(null);
  const planStateRef = useRef(null);
  const LLM_API_KEY = import.meta.env.VITE_LLM_API_KEY || '';
  const LLM_API_ENDPOINT = import.meta.env.VITE_LLM_API_ENDPOINT || 'https://api.deepseek.com/v1/chat/completions';
  const LLM_MODEL = import.meta.env.VITE_LLM_MODEL || 'deepseek-chat';

  const STABILITY_API_KEY = import.meta.env.VITE_STABILITY_API_KEY || '';
  const STABILITY_API_ENDPOINT = import.meta.env.VITE_STABILITY_API_ENDPOINT || 'https://api.stability.ai/v2beta/stable-image/generate/sd3';
  const PORTRAIT_MODEL = import.meta.env.VITE_PORTRAIT_MODEL || 'sd3-medium';

  const [pencilTip, setPencilTip] = useState({ x: 0, y: 0, visible: false });
  const [isPortraitProcessing, setIsPortraitProcessing] = useState(false);
  const portraitAbortRef = useRef(false);

  const startPortraitPipeline = useCallback(async (command) => {
    if (!STABILITY_API_KEY) {
      setStatusMessage('请配置 VITE_STABILITY_API_KEY');
      return;
    }

    portraitAbortRef.current = false;
    setIsPortraitProcessing(true);

    try {
      await portraitPipeline(command, {
        VITE_STABILITY_API_KEY: STABILITY_API_KEY,
        VITE_STABILITY_API_ENDPOINT: STABILITY_API_ENDPOINT,
        VITE_PORTRAIT_MODEL: PORTRAIT_MODEL
      }, {
        onStatus: (msg) => {
          if (!portraitAbortRef.current) setStatusMessage(msg);
        },
        onComplete: (completed) => {
          if (portraitAbortRef.current) return;

          setState(prev => {
            const shapes = prev.shapes.slice();
            const last = shapes[shapes.length - 1];
            if (!last || last.type !== 'portrait') return prev;

            const updated = {
              ...last,
              strokes: completed.strokes,
              totalLength: completed.totalLength,
              sourcePrompt: completed.prompt,
              isAnimating: true,
              animationProgress: 0
            };
            shapes[shapes.length - 1] = updated;
            return { ...prev, shapes };
          });

          setPencilTip(prev => ({ ...prev, visible: true }));
          setStatusMessage('Drawing portrait...');
        },
        onError: (err) => {
          if (!portraitAbortRef.current) {
            setStatusMessage(`Portrait failed: ${err.message}`);
          }
          setIsPortraitProcessing(false);
        }
      });
    } catch (err) {
      setStatusMessage(`Portrait failed: ${err.message}`);
      setIsPortraitProcessing(false);
    }
  }, [STABILITY_API_KEY, STABILITY_API_ENDPOINT, PORTRAIT_MODEL]);

  const runCommand = useCallback((command) => {
    if (command.action === 'drawPortrait') {
      setState(prev => {
        const { removed, ...next } = executeCommand(command, prev, canvasSize);
        return {
          ...next,
          lastRemoved: removed || [],
          undoStack: [...prev.undoStack, { shapes: prev.shapes, layers: prev.layers, currentLayerId: prev.currentLayerId }],
          redoStack: [],
          history: [...(prev.history || []), command]
        };
      });
      startPortraitPipeline(command);
      return;
    }

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
  }, [canvasSize, startPortraitPipeline]);

  const clearPlanState = useCallback(() => {
    planStateRef.current = null;
    setPlanState(null);
    portraitAbortRef.current = true;
    setIsPortraitProcessing(false);
    setStatusMessage('Cancelled');
  }, []);

  const executePlanState = useCallback(() => {
    const plan = planStateRef.current;
    if (!plan?.commands?.length) return;

    const resolvedCommands = plan.commands.map((cmd, idx) => {
      let updated = cmd;
      for (const key of Object.keys(plan.answers || {})) {
        const [cmdIdx, param] = key.split(':');
        if (parseInt(cmdIdx, 10) === idx) {
          updated = applyAnswerToCommand(updated, param, plan.answers[key], state.currentColor);
        }
      }
      return updated;
    });

    resolvedCommands.forEach(runCommand);
    planStateRef.current = null;
    setPlanState(null);
    setStatusMessage(`Executed ${resolvedCommands.length} steps`);
  }, [runCommand, state.currentColor]);

  const askNextQuestion = useCallback((nextPlan) => {
    const question = nextPlan.missingParams[nextPlan.currentQuestionIndex];
    if (question) {
      planStateRef.current = nextPlan;
      setPlanState(nextPlan);
      setStatusMessage(question.question);
    } else {
      planStateRef.current = { ...nextPlan, mode: 'awaiting_confirmation' };
      setPlanState(planStateRef.current);
      setStatusMessage('Say "confirm" to execute or "cancel" to abort');
    }
  }, []);

  const applyAnswer = useCallback((answerText, paramType) => {
    const plan = planStateRef.current;
    if (!plan || plan.mode !== 'awaiting_clarification') return;

    const current = plan.missingParams[plan.currentQuestionIndex];
    if (!current) return;

    let value = null;
    if (isSkip(answerText)) {
      value = getDefaultForParam(current.param, state.currentColor);
    } else {
      value = extractParameter(answerText, current.param);
    }

    if (value == null) {
      setStatusMessage(`没听清，请回答：${current.question}`);
      return;
    }

    const answerKey = `${current.commandIndex}:${current.param}`;
    const nextAnswers = { ...plan.answers, [answerKey]: value };
    const nextIndex = plan.currentQuestionIndex + 1;

    if (nextIndex >= plan.missingParams.length) {
      const finalPlan = {
        ...plan,
        answers: nextAnswers,
        mode: 'awaiting_confirmation'
      };
      planStateRef.current = finalPlan;
      setPlanState(finalPlan);
      executePlanState();
    } else {
      askNextQuestion({
        ...plan,
        answers: nextAnswers,
        currentQuestionIndex: nextIndex
      });
    }
  }, [askNextQuestion, executePlanState, state.currentColor]);

  const buildPlanState = useCallback((result, originalText) => {
    const base = {
      commands: result.commands || [],
      descriptions: createPlanDescription(result.commands || []),
      answers: {},
      originalText,
      startedAt: Date.now()
    };

    if (result.status === 'needs_clarification' && result.clarifications?.length > 0) {
      return {
        ...base,
        mode: 'awaiting_clarification',
        missingParams: result.clarifications,
        currentQuestionIndex: 0
      };
    }

    return {
      ...base,
      mode: 'awaiting_confirmation',
      missingParams: [],
      currentQuestionIndex: 0
    };
  }, []);

  const executePlanStateRef = useRef(executePlanState);
  const clearPlanStateRef = useRef(clearPlanState);
  const applyAnswerRef = useRef(applyAnswer);
  executePlanStateRef.current = executePlanState;
  clearPlanStateRef.current = clearPlanState;
  applyAnswerRef.current = applyAnswer;

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
        if (!isFinal) return;

        const plan = planStateRef.current;

        if (plan) {
          if (plan.mode === 'awaiting_confirmation') {
            if (isConfirm(text)) {
              executePlanStateRef.current();
            } else if (isCancel(text)) {
              clearPlanStateRef.current();
            } else {
              clearPlanStateRef.current();
            }
            return;
          }

          if (plan.mode === 'awaiting_clarification') {
            applyAnswerRef.current(text);
            return;
          }
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
            const result = await parseWithClarification(text, LLM_API_KEY, LLM_API_ENDPOINT, LLM_MODEL);
            if (!result || !result.commands || result.commands.length === 0) {
              setStatusMessage('No plan generated');
              return;
            }
            const nextPlan = buildPlanState(result, text);
            planStateRef.current = nextPlan;
            setPlanState(nextPlan);

            if (nextPlan.mode === 'awaiting_clarification') {
              const firstQuestion = nextPlan.missingParams[0];
              setStatusMessage(firstQuestion?.question || '需要补充信息');
            } else {
              setStatusMessage('Say "confirm" to execute or "cancel" to abort');
            }
          } catch (err) {
            setStatusMessage(`Parsing failed: ${err.message}`);
          } finally {
            setIsProcessing(false);
          }
        } else {
          setStatusMessage(`Unrecognized: ${text}`);
        }
      },
      onError: (error) => {
        setStatusMessage(`Speech error: ${error}`);
        setIsListening(false);
      },
      onEnd: () => {
        if (planStateRef.current) {
          try {
            recognizerRef.current?.start();
          } catch (err) {
            setIsListening(false);
          }
        } else {
          setIsListening(false);
        }
      }
    });

    return () => {
      if (recognizerRef.current) recognizerRef.current.stop();
    };
  }, [runCommand, buildPlanState, LLM_API_KEY, LLM_API_ENDPOINT, LLM_MODEL]);

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

  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const portraitAnimRef = useRef(null);

  useEffect(() => {
    const hasAnimatingPortrait = state.shapes.some(s => s.type === 'portrait' && s.isAnimating);
    if (!hasAnimatingPortrait) {
      setPencilTip(prev => ({ ...prev, visible: false }));
      return;
    }

    let rafId;
    let lastTime = performance.now();
    const speed = 200; // pixels per second

    function tick(now) {
      const dt = now - lastTime;
      lastTime = now;

      const currentState = stateRef.current;
      const portrait = currentState.shapes.find(s => s.type === 'portrait' && s.isAnimating);
      if (!portrait) {
        setPencilTip(t => ({ ...t, visible: false }));
        return;
      }

      if (!portraitAnimRef.current || portraitAnimRef.current.shapeId !== portrait.id) {
        const { createAnimator } = portraitAnimatorModule;
        portraitAnimRef.current = {
          shapeId: portrait.id,
          animator: createAnimator(portrait.strokes, portrait, speed)
        };
      }

      const { animator } = portraitAnimRef.current;
      animator.advance(dt);
      const nextProgress = animator.getProgress();
      const { getTipPosition } = portraitAnimatorModule;
      const tip = getTipPosition(animator);
      if (tip) setPencilTip({ x: tip.x, y: tip.y, visible: true });

      if (animator.isComplete()) {
        setStatusMessage('Portrait drawn');
        setIsPortraitProcessing(false);
        portraitAnimRef.current = null;
      }

      setState(prev => ({
        ...prev,
        shapes: prev.shapes.map(s =>
          s.id === portrait.id
            ? { ...s, animationProgress: nextProgress, isAnimating: !animator.isComplete() }
            : s
        )
      }));

      rafId = requestAnimationFrame(tick);
    }

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [state.shapes]);

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

  const voiceBarPrompt = planState?.mode === 'awaiting_clarification'
    ? planState.missingParams[planState.currentQuestionIndex]?.question || '请回答'
    : null;

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
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l-.06-.06A1.65 1.65 0 0 0 4.17 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.17 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l-.06-.06A1.65 1.65 0 0 0 9 4.17a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l-.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
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
            <button
              type="button"
              onClick={() => runCommand({ action: 'drawPortrait', description: '戴眼镜的女孩', size: 'small' })}
              className="btn-debug"
            >
              Draw Portrait
            </button>
          </div>
        </aside>

        <section className="canvas-area">
          <CanvasBoard ref={canvasRef} shapes={state.shapes} background={state.background} grid={state.grid} layers={state.layers} />
        </section>

        {planState && (
          <CommandPlanPanel
            mode={planState.mode}
            descriptions={planState.descriptions}
            interpretedCommand={planState.originalText}
            missingParams={planState.missingParams}
            currentQuestionIndex={planState.currentQuestionIndex}
            answers={planState.answers}
            timeoutMs={5000}
            onAnswer={applyAnswer}
            onConfirm={executePlanState}
            onCancel={clearPlanState}
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
        prompt={voiceBarPrompt}
        onToggle={toggleListening}
        onClose={closeVoiceBar}
      />
      <PencilCursor x={pencilTip.x} y={pencilTip.y} visible={pencilTip.visible} />
    </div>
  );
}

export default App;
