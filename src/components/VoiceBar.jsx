function VoiceBar({ isListening, transcript, prompt, onToggle, onClose }) {
  return (
    <div className={`voice-bar ${isListening ? 'listening' : ''}`}>
      <button type="button" className={`mic-btn ${isListening ? 'active' : ''}`} aria-label="Toggle voice" onClick={onToggle}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
          <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
          <line x1="12" y1="19" x2="12" y2="23" />
          <line x1="8" y1="23" x2="16" y2="23" />
        </svg>
      </button>
      <div className="voice-info">
        <span className="voice-label">{isListening ? 'LISTENING...' : 'VOICE ACTIVE'}</span>
        <span className="voice-transcript">{transcript || prompt || 'Say something to start drawing'}</span>
      </div>
      <div className="voice-waveform">
        {[1, 2, 3, 4, 5].map((i) => (
          <span key={i} className={`wave-bar ${isListening ? 'animating' : ''}`} />
        ))}
      </div>
      <button type="button" className="close-btn" aria-label="Close voice bar" onClick={onClose}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>
  );
}

export default VoiceBar;
