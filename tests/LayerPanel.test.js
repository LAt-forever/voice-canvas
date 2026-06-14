import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import LayerPanel from '../src/components/LayerPanel';

describe('LayerPanel', () => {
  const layers = [
    { id: 'layer-1', name: 'Background', visible: true },
    { id: 'layer-2', name: 'Shapes', visible: false },
    { id: 'layer-3', name: 'Text', visible: true },
  ];

  it('renders layers in reverse order and highlights current layer', () => {
    render(
      React.createElement(LayerPanel, {
        layers: layers,
        currentLayerId: 'layer-2',
        onSelectLayer: vi.fn(),
        onToggleVisibility: vi.fn(),
      })
    );

    expect(screen.getByText('Layers')).toBeDefined();

    const layerNames = screen.getAllByText(/Background|Shapes|Text/);
    expect(layerNames[0].textContent).toBe('Text');
    expect(layerNames[1].textContent).toBe('Shapes');
    expect(layerNames[2].textContent).toBe('Background');

    const activeItem = screen.getByText('Shapes').closest('.layer-item');
    expect(activeItem.classList.contains('active')).toBe(true);
  });

  it('calls onToggleVisibility with correct layerId when visibility button is clicked', () => {
    const onToggleVisibility = vi.fn();
    const onSelectLayer = vi.fn();

    render(
      React.createElement(LayerPanel, {
        layers: layers,
        currentLayerId: 'layer-1',
        onSelectLayer: onSelectLayer,
        onToggleVisibility: onToggleVisibility,
      })
    );

    const buttons = screen.getAllByRole('button');
    const visibilityBtn = buttons.find((btn) => btn.title === 'Hide layer');

    fireEvent.click(visibilityBtn);

    expect(onToggleVisibility).toHaveBeenCalledTimes(1);
    expect(onToggleVisibility).toHaveBeenCalledWith('layer-3');
    expect(onSelectLayer).not.toHaveBeenCalled();
  });
});
