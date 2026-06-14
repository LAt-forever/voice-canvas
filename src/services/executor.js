import { resolveColor } from '../utils/colorMap';
import { resolvePosition, snapPosition } from '../utils/positionResolver';
import { resolveSize } from '../utils/sizeResolver';
import { findMatchingShapes } from './shapeMatcher';

function generateId() {
  return Math.random().toString(36).slice(2, 9);
}

function generateLayerId() {
  return 'layer_' + Math.random().toString(36).slice(2, 9);
}

function findLayerByTarget(layers, target) {
  if (/^\d+$/.test(target)) {
    return layers[parseInt(target, 10) - 1];
  }
  return layers.find(l => l.name === target);
}

export const GRID_SIZE_PRESETS = {
  small: 20,
  medium: 40,
  large: 80
};

export const PORTRAIT_SIZE_PRESETS = {
  small: { width: 256, height: 256 },
  medium: { width: 384, height: 384 },
  large: { width: 512, height: 512 }
};

export function executeCommand(command, state, canvasSize) {
  const { shapes, currentColor, grid = { visible: true, snap: true, spacing: 40 }, background, layers, currentLayerId } = state;

  switch (command.action) {
    case 'draw': {
      let position = resolvePosition(command.position, canvasSize.width, canvasSize.height);
      if (grid?.snap) {
        position = snapPosition(position.x, position.y, grid.spacing);
      }
      const size = resolveSize(command.size);
      const newShape = {
        id: generateId(),
        type: command.shape,
        x: position.x,
        y: position.y,
        width: size.width,
        height: size.height,
        color: resolveColor(command.color || currentColor),
        layerId: state.currentLayerId
      };
      return { shapes: [...shapes, newShape], currentColor: newShape.color, grid, background, layers, currentLayerId };
    }
    case 'drawPortrait': {
      let position = resolvePosition(command.position, canvasSize.width, canvasSize.height);
      if (grid?.snap) {
        position = snapPosition(position.x, position.y, grid.spacing);
      }
      const size = PORTRAIT_SIZE_PRESETS[command.size] || PORTRAIT_SIZE_PRESETS.medium;
      const newShape = {
        id: generateId(),
        type: 'portrait',
        x: position.x,
        y: position.y,
        width: size.width,
        height: size.height,
        color: resolveColor(command.color || currentColor),
        layerId: state.currentLayerId,
        description: command.description || 'portrait',
        prompt: command.prompt,
        strokes: [],
        animationProgress: 0,
        isAnimating: false,
        sourcePrompt: command.prompt
      };
      return { shapes: [...shapes, newShape], currentColor: newShape.color, grid, background, layers, currentLayerId };
    }
    case 'delete': {
      const targets = findMatchingShapes(shapes, command.filters, canvasSize);
      if (targets.length === 0) {
        return { shapes, currentColor, removed: [], grid, background, layers, currentLayerId };
      }
      const targetIds = new Set(targets.map(t => t.id));
      return {
        shapes: shapes.filter(s => !targetIds.has(s.id)),
        currentColor,
        removed: targets,
        grid,
        background,
        layers,
        currentLayerId
      };
    }
    case 'setColor': {
      return { shapes, currentColor: resolveColor(command.color), grid, background, layers, currentLayerId };
    }
    case 'clear': {
      return { shapes: [], currentColor, grid, background, layers, currentLayerId };
    }
    case 'save': {
      return { shapes, currentColor, grid, background, shouldSave: true, layers, currentLayerId };
    }
    case 'setGrid': {
      return { ...state, grid: { ...grid, visible: command.visible } };
    }
    case 'setSnap': {
      return { ...state, grid: { ...grid, snap: command.snap } };
    }
    case 'setGridSize': {
      const spacing = GRID_SIZE_PRESETS[command.size] || grid.spacing;
      return { ...state, grid: { ...grid, spacing } };
    }
    case 'setBackground': {
      return { ...state, background: command.background };
    }
    case 'createLayer': {
      const newLayer = { id: generateLayerId(), name: `图层 ${layers.length + 1}`, visible: true, locked: false };
      return { ...state, layers: [...layers, newLayer], currentLayerId: newLayer.id };
    }
    case 'switchLayer': {
      const targetLayer = findLayerByTarget(layers, command.target);
      if (targetLayer) {
        return { ...state, currentLayerId: targetLayer.id };
      }
      return state;
    }
    case 'renameLayer': {
      return {
        ...state,
        layers: layers.map(l => l.id === state.currentLayerId ? { ...l, name: command.name } : l)
      };
    }
    case 'toggleLayerVisibility': {
      const layerId = command.layerId || state.currentLayerId;
      return {
        ...state,
        layers: layers.map(l => l.id === layerId ? { ...l, visible: !l.visible } : l)
      };
    }
    case 'deleteLayer': {
      if (layers.length <= 1) {
        return state;
      }
      const layerToDelete = layers.find(l => l.id === state.currentLayerId);
      const remainingLayers = layers.filter(l => l.id !== state.currentLayerId);
      const newCurrentLayerId = remainingLayers[0].id;
      return {
        ...state,
        layers: remainingLayers,
        currentLayerId: newCurrentLayerId,
        shapes: shapes.filter(s => s.layerId !== layerToDelete.id)
      };
    }
    default:
      return { shapes, currentColor, grid, background, layers, currentLayerId };
  }
}

export function createInitialState() {
  const defaultLayer = { id: generateLayerId(), name: '图层 1', visible: true, locked: false };
  return {
    shapes: [],
    currentColor: '#3b82f6',
    undoStack: [],
    redoStack: [],
    history: [],
    shouldSave: false,
    grid: { visible: true, snap: true, spacing: 40 },
    background: { type: 'solid', color: '#ffffff' },
    layers: [defaultLayer],
    currentLayerId: defaultLayer.id
  };
}
