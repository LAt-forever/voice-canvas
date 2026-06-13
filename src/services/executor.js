import { resolveColor } from '../utils/colorMap';
import { resolvePosition } from '../utils/positionResolver';
import { resolveSize } from '../utils/sizeResolver';
import { findMatchingShapes } from './shapeMatcher';

function generateId() {
  return Math.random().toString(36).slice(2, 9);
}

export function executeCommand(command, state, canvasSize) {
  const { shapes, currentColor } = state;

  switch (command.action) {
    case 'draw': {
      const position = resolvePosition(command.position, canvasSize.width, canvasSize.height);
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
      return { shapes: [...shapes, newShape], currentColor: newShape.color };
    }
    case 'delete': {
      const targets = findMatchingShapes(shapes, command.filters, canvasSize);
      if (targets.length === 0) {
        return { shapes, currentColor, removed: [] };
      }
      const targetIds = new Set(targets.map(t => t.id));
      return {
        shapes: shapes.filter(s => !targetIds.has(s.id)),
        currentColor,
        removed: targets
      };
    }
    case 'setColor': {
      return { shapes, currentColor: resolveColor(command.color) };
    }
    case 'clear': {
      return { shapes: [], currentColor };
    }
    case 'save': {
      return { shapes, currentColor, shouldSave: true };
    }
    default:
      return { shapes, currentColor };
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
    lastRemoved: []
  };
}
