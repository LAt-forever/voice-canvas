import { useEffect, useState } from 'react';

export default function CommandPlanPanel({ descriptions, timeoutMs = 5000, onConfirm, onCancel }) {
  const [remaining, setRemaining] = useState(timeoutMs);

  useEffect(() => {
    setRemaining(timeoutMs);
    const interval = setInterval(() => {
      setRemaining(prev => Math.max(0, prev - 100));
    }, 100);
    return () => clearInterval(interval);
  }, [timeoutMs]);

  useEffect(() => {
    if (remaining <= 0) {
      onCancel();
    }
  }, [remaining, onCancel]);

  const progress = timeoutMs > 0 ? (remaining / timeoutMs) * 100 : 0;

  return (
    <div className="command-plan-panel">
      <div className="command-plan-header">识别到多步计划</div>
      <ol className="command-plan-steps">
        {descriptions.map((desc, index) => (
          <li key={index} className="command-plan-step">
            <span className="step-index">{index + 1}</span>
            <span className="step-desc">{desc}</span>
          </li>
        ))}
      </ol>
      <div className="command-plan-timeout">
        <div className="timeout-bar" style={{ width: `${progress}%` }} />
      </div>
      <div className="command-plan-actions">
        <button type="button" className="btn-confirm" onClick={onConfirm}>确认执行</button>
        <button type="button" className="btn-cancel" onClick={onCancel}>取消</button>
      </div>
    </div>
  );
}
