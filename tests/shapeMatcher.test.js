import { describe, it, expect } from 'vitest';
import { findMatchingShapes } from '../src/services/shapeMatcher';

const canvasSize = { width: 800, height: 600 };

function makeShape(overrides) {
  return {
    id: '1',
    type: 'rect',
    x: 400,
    y: 300,
    width: 160,
    height: 120,
    color: '#3b82f6',
    ...overrides
  };
}

describe('findMatchingShapes', () => {
  it('returns empty array for empty shapes', () => {
    expect(findMatchingShapes([], { last: true }, canvasSize)).toEqual([]);
  });

  it('matches last shape', () => {
    const s1 = makeShape({ id: 'a', color: '#ef4444' });
    const s2 = makeShape({ id: 'b', color: '#22c55e' });
    expect(findMatchingShapes([s1, s2], { last: true }, canvasSize)).toEqual([s2]);
  });

  it('filters by color', () => {
    const s1 = makeShape({ id: 'a', color: '#ef4444' });
    const s2 = makeShape({ id: 'b', color: '#22c55e' });
    expect(findMatchingShapes([s1, s2], { color: 'red' }, canvasSize)).toEqual([s1]);
  });

  it('filters by shape type', () => {
    const s1 = makeShape({ id: 'a', type: 'rect' });
    const s2 = makeShape({ id: 'b', type: 'circle' });
    expect(findMatchingShapes([s1, s2], { shape: 'circle' }, canvasSize)).toEqual([s2]);
  });

  it('picks nearest shape to position', () => {
    const s1 = makeShape({ id: 'a', x: 40, y: 40 });
    const s2 = makeShape({ id: 'b', x: 760, y: 40 });
    expect(findMatchingShapes([s1, s2], { position: 'top-left' }, canvasSize)).toEqual([s1]);
  });

  it('returns all matches when all flag set', () => {
    const s1 = makeShape({ id: 'a', color: '#ef4444' });
    const s2 = makeShape({ id: 'b', color: '#ef4444' });
    const s3 = makeShape({ id: 'c', color: '#22c55e' });
    expect(findMatchingShapes([s1, s2, s3], { color: 'red', all: true }, canvasSize)).toEqual([s1, s2]);
  });

  it('returns empty when last shape fails base filter', () => {
    const redRect = makeShape({ id: 'a', color: '#ef4444' });
    const blueCircle = makeShape({ id: 'b', color: '#3b82f6', type: 'circle' });
    expect(findMatchingShapes([redRect, blueCircle], { last: true, color: 'red' }, canvasSize)).toEqual([]);
  });

  it('filters by size preset (matching)', () => {
    const smallRect = makeShape({ id: 'a', width: 80, height: 60 });
    const mediumRect = makeShape({ id: 'b', width: 160, height: 120 });
    expect(findMatchingShapes([smallRect, mediumRect], { size: 'small' }, canvasSize)).toEqual([smallRect]);
  });

  it('filters by size preset (far from requested)', () => {
    const smallRect = makeShape({ id: 'a', width: 80, height: 60 });
    const largeRect = makeShape({ id: 'b', width: 320, height: 240 });
    expect(findMatchingShapes([smallRect, largeRect], { size: 'small' }, canvasSize)).toEqual([smallRect]);
    expect(findMatchingShapes([smallRect, largeRect], { size: 'large' }, canvasSize)).toEqual([largeRect]);
  });

  it('combines multiple filters', () => {
    const s1 = makeShape({ id: 'a', type: 'rect', color: '#ef4444', x: 40, y: 40 });
    const s2 = makeShape({ id: 'b', type: 'rect', color: '#ef4444', x: 760, y: 40 });
    const s3 = makeShape({ id: 'c', type: 'circle', color: '#ef4444', x: 40, y: 40 });
    const result = findMatchingShapes([s1, s2, s3], { shape: 'rect', color: 'red', position: 'top-left' }, canvasSize);
    expect(result).toEqual([s1]);
  });
});
