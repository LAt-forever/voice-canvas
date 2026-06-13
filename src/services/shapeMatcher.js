import { resolveColor } from '../utils/colorMap';
import { resolvePosition } from '../utils/positionResolver';
import { SIZE_PRESETS } from '../utils/sizeResolver';

function distance(shape, anchor) {
  const dx = shape.x - anchor.x;
  const dy = shape.y - anchor.y;
  return Math.hypot(dx, dy);
}

function shapeMatchesBaseFilters(shape, filters) {
  if (filters.color && shape.color !== resolveColor(filters.color)) {
    return false;
  }
  if (filters.shape && shape.type !== filters.shape) {
    return false;
  }
  if (filters.size) {
    const preset = SIZE_PRESETS[filters.size];
    if (!preset) return true;
    const targetArea = preset.width * preset.height;
    const area = shape.width * shape.height;
    const ratio = Math.max(area, targetArea) / Math.max(Math.min(area, targetArea), 1);
    if (ratio > 2) return false;
  }
  return true;
}

export function findMatchingShapes(shapes, filters, canvasSize) {
  if (filters.last) {
    const last = shapes[shapes.length - 1];
    if (!last) return [];
    return shapeMatchesBaseFilters(last, filters) ? [last] : [];
  }

  let candidates = shapes.filter(s => shapeMatchesBaseFilters(s, filters));

  if (filters.position && candidates.length > 0) {
    const anchor = resolvePosition(filters.position, canvasSize.width, canvasSize.height);
    const sorted = candidates.slice().sort((a, b) => distance(a, anchor) - distance(b, anchor));
    candidates = sorted;
  }

  if (candidates.length === 0) return [];
  if (filters.all) return candidates;
  return [candidates[0]];
}
