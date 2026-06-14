export default function PencilCursor({ x = 0, y = 0, visible = true }) {
  return (
    <div
      data-testid="pencil-cursor"
      className={`pencil-cursor ${visible ? '' : 'hidden'}`}
      style={{
        position: 'absolute',
        left: `${x}px`,
        top: `${y}px`,
        pointerEvents: 'none',
        transform: 'translate(-10%, -90%) rotate(-15deg)',
        transition: visible ? 'left 50ms linear, top 50ms linear' : 'none',
        zIndex: 100
      }}
      aria-hidden={!visible}
    >
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
        <path d="m15 5 4 4" />
      </svg>
    </div>
  );
}
