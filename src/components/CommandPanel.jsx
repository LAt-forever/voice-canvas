function CommandPanel({ statusMessage, currentCommand, lastRemoved, grid, onUndo, onRedo, canUndo, canRedo, onClear, onSave }) {
  const isDelete = currentCommand?.action === 'delete';
  const subjectMatter = isDelete
    ? (lastRemoved?.length > 1 ? 'multiple' : lastRemoved?.[0]?.shape || '—')
    : currentCommand?.shape || '—';
  const aestheticStyle = isDelete
    ? lastRemoved?.[0]?.color || '—'
    : currentCommand?.color || '—';


  return (
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
          <p>{statusMessage}</p>
        </div>
      </div>

      <div className="command-cards">
        <div className="command-card">
          <span className="command-card-label">CURRENT ACTION</span>
          <span className="command-card-value">{currentCommand?.action || '—'}</span>
        </div>
        <div className="command-card">
          <span className="command-card-label">SUBJECT MATTER</span>
          <span className="command-card-value">{subjectMatter}</span>
        </div>
        <div className="command-card">
          <span className="command-card-label">AESTHETIC STYLE</span>
          <span className="command-card-value">{aestheticStyle}</span>
        </div>
        {grid && (
          <>
            <div className="command-card">
              <span className="command-card-label">GRID</span>
              <span className="command-card-value">{grid.visible ? 'On' : 'Off'}</span>
            </div>
            <div className="command-card">
              <span className="command-card-label">SNAP</span>
              <span className="command-card-value">{grid.snap ? 'On' : 'Off'}</span>
            </div>
            <div className="command-card">
              <span className="command-card-label">SPACING</span>
              <span className="command-card-value">{grid.spacing}px</span>
            </div>
          </>
        )}
      </div>

      <div className="command-actions">
        <button type="button" className="btn-secondary" onClick={onUndo} disabled={!canUndo}>Revert Last</button>
        <button type="button" className="btn-secondary" onClick={onRedo} disabled={!canRedo}>Redo</button>
        <button type="button" className="btn-secondary" onClick={onClear}>Clear Canvas</button>
        <button type="button" className="btn-secondary" onClick={onSave}>Save Image</button>
      </div>

      <div className="command-hint">
        <p>Try saying: "Draw a red circle in the center"</p>
      </div>
    </aside>
  );
}

export default CommandPanel;
