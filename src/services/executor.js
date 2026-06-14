import { resolveColor } from '../utils/colorMap';
import { resolvePosition, snapPosition } from '../utils/positionResolver';
import { resolveSize } from '../utils/sizeResolver';
import { findMatchingShapes } from './shapeMatcher';

function generateId() {
  return Math.random().toString(36).slice(2, 9);
}

export const GRID_SIZE_PRESETS = {
  small: 20,
  medium: 40,
  large: 80
};

export function executeCommand(command, state, canvasSize) {
  const { shapes, currentColor, grid = { visible: true, snap: true, spacing: 40 }, background } = state;

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
        color: resolveColor(command.color || currentColor)
      };
      return { shapes: [...shapes, newShape], currentColor: newShape.color, grid, background };
    }
    case 'delete': {
      const targets = findMatchingShapes(shapes, command.filters, canvasSize);
      if (targets.length === 0) {
        return { shapes, currentColor, removed: [], grid, background };
      }
      const targetIds = new Set(targets.map(t => t.id));
      return {
        shapes: shapes.filter(s => !targetIds.has(s.id)),
        currentColor,
        removed: targets,
        grid,
        background
      };
    }
    case 'setColor': {
      return { shapes, currentColor: resolveColor(command.color), grid, background };
    }
    case 'clear': {
      return { shapes: [], currentColor, grid, background };
    }
    case 'save': {
      return { shapes, currentColor, grid, background, shouldSave: true };
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
    default:
      return { shapes, currentColor, grid, background };
  }
}

export function createInitialState() {
  return {
    shapes: [],
    currentColor: '#3b82f6',
    undoStack: [],
    redoStack: [],
    history: [],
    shouldSave: false,
    grid: { visible: true, snap: true, spacing: 40 },
    background: { type: 'solid', color: '#ffffff' }
  };
}
