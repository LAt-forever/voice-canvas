import { useEffect, useRef, useState } from 'react';

export default function CommandPlanPanel({
  mode = 'awaiting_confirmation',
  descriptions = [],
  interpretedCommand = '',
  missingParams = [],
  currentQuestionIndex = 0,
  answers = {},
  timeoutMs = 5000,
  onAnswer,
  onConfirm,
  onCancel
}) {
  const [remaining, setRemaining] = useState(timeoutMs);
  const calledRef = useRef(false);
  const isConfirmation = mode === 'awaiting_confirmation';

  useEffect(() => {
    calledRef.current = false;
    setRemaining(timeoutMs);
    if (!isConfirmation) return;

    const interval = setInterval(() => {
      setRemaining(prev => {
        const next = Math.max(0, prev - 100);
        if (next <= 0 && !calledRef.current) {
          calledRef.current = true;
          onCancel();
        }
        return next;
      });
    }, 100);
    return () => clearInterval(interval);
  }, [timeoutMs, onCancel, isConfirmation]);

  const progress = timeoutMs > 0 ? (remaining / timeoutMs) * 100 : 0;
  const currentQuestion = missingParams[currentQuestionIndex];

  function handleOptionClick(option) {
    if (!currentQuestion || !onAnswer) return;
    onAnswer(option, currentQuestion.param);
  }

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-label="命令执行计划">
      <div className={`command-plan-panel ${!isConfirmation ? 'clarification-mode' : ''}`}>
        <button type="button" className="command-plan-close" aria-label="关闭" onClick={onCancel}>×</button>

        <div className="command-plan-header">
          {isConfirmation ? '识别到多步计划' : '需要补充信息'}
        </div>

        {interpretedCommand && (
          <div className="command-plan-interpreted">
            <span className="command-plan-label">INTERPRETING COMMAND</span>
            <p data-testid="interpreted-command">{interpretedCommand}</p>
          </div>
        )}

        <ol className="command-plan-steps">
          {descriptions.map((desc, index) => (
            <li key={index} className="command-plan-step">
              <span className="step-index">{index + 1}</span>
              <span className="step-desc">{desc}</span>
            </li>
          ))}
        </ol>

        {!isConfirmation && currentQuestion && (
          <div className="clarification-section">
            <div className="command-plan-label">CLARIFICATION NEEDED</div>
            <div className="clarification-question">{currentQuestion.question}</div>
            <div className="clarification-options">
              {currentQuestion.options.map((option) => (
                <button
                  key={option}
                  type="button"
                  className="option-chip"
                  onClick={() => handleOptionClick(option)}
                >
                  {option}
                </button>
              ))}
            </div>

            <div className="clarification-progress">
              {missingParams.map((_, idx) => (
                <span
                  key={idx}
                  className={`progress-dot ${
                    idx < currentQuestionIndex ? 'answered' : idx === currentQuestionIndex ? 'current' : ''
                  }`}
                />
              ))}
            </div>

            <div className="clarification-listening-hint">
              正在聆听您的回答…
            </div>
          </div>
        )}

        {isConfirmation && (
          <div className="command-plan-timeout">
            <div
              className="timeout-bar"
              role="timer"
              aria-live="polite"
              aria-label={`剩余 ${remaining} 毫秒`}
              style={{ width: `${progress}%` }}
            />
          </div>
        )}

        <div className="command-plan-actions">
          {isConfirmation ? (
            <>
              <button type="button" className="btn-confirm" onClick={onConfirm}>确认执行</button>
              <button type="button" className="btn-cancel" onClick={onCancel}>取消</button>
            </>
          ) : (
            <button type="button" className="btn-cancel" onClick={onCancel}>取消命令</button>
          )}
        </div>
      </div>
    </div>
  );
}
