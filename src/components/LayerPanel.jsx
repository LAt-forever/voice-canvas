import React from 'react';

function LayerPanel({ layers, currentLayerId, onSelectLayer, onToggleVisibility }) {
  const reversedLayers = [...layers].reverse();

  return (
    <div className="layer-panel">
      <div className="layer-panel-header">
        <h3 className="layer-panel-title">Layers</h3>
      </div>
      <ul className="layer-list">
        {reversedLayers.map((layer) => {
          const isActive = layer.id === currentLayerId;
          return (
            <li
              key={layer.id}
              className={`layer-item ${isActive ? 'active' : ''}`}
              onClick={() => onSelectLayer(layer.id)}
            >
              <button
                type="button"
                className="layer-visibility-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleVisibility(layer.id);
                }}
                title={layer.visible ? 'Hide layer' : 'Show layer'}
              >
                {layer.visible ? '👁' : '🚫'}
              </button>
              <span className="layer-name">{layer.name}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default LayerPanel;
