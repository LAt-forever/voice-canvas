export function mapPoint(point, shape) {
  return {
    x: shape.x + (point.x - 0.5) * shape.width,
    y: shape.y + (point.y - 0.5) * shape.height
  };
}

export function createAnimator(strokes, shape, speedPixelsPerSecond = 200) {
  let elapsedPixels = 0;

  const mappedStrokes = strokes.map(stroke => ({
    ...stroke,
    mappedPoints: stroke.points.map(p => mapPoint(p, shape)),
    mappedLength: stroke.length * Math.max(shape.width, shape.height)
  }));

  const totalMappedLength = mappedStrokes.reduce((sum, s) => sum + s.mappedLength, 0);

  return {
    advance(deltaMs) {
      const deltaPixels = (speedPixelsPerSecond * deltaMs) / 1000;
      elapsedPixels = Math.min(totalMappedLength, elapsedPixels + deltaPixels);
    },
    getProgress() {
      return totalMappedLength === 0 ? 1 : elapsedPixels / totalMappedLength;
    },
    isComplete() {
      return elapsedPixels >= totalMappedLength;
    },
    getStrokeStates() {
      const states = [];
      let accumulated = 0;
      for (const stroke of mappedStrokes) {
        const start = accumulated;
        const end = accumulated + stroke.mappedLength;
        let progress = 0;
        if (elapsedPixels >= end) {
          progress = 1;
        } else if (elapsedPixels > start) {
          progress = (elapsedPixels - start) / stroke.mappedLength;
        }
        states.push({ stroke, progress });
        accumulated = end;
      }
      return states;
    },
    getTotalLength() {
      return totalMappedLength;
    }
  };
}

export function getTipPosition(animator) {
  const states = animator.getStrokeStates();
  for (const { stroke, progress } of states) {
    if (progress <= 0 || progress >= 1) continue;
    const points = stroke.mappedPoints;
    if (points.length < 2) return points[0];

    const targetLength = progress * stroke.mappedLength;
    let currentLength = 0;
    for (let i = 1; i < points.length; i++) {
      const dx = points[i].x - points[i - 1].x;
      const dy = points[i].y - points[i - 1].y;
      const segLen = Math.sqrt(dx * dx + dy * dy);
      if (currentLength + segLen >= targetLength) {
        const t = segLen === 0 ? 0 : (targetLength - currentLength) / segLen;
        return {
          x: points[i - 1].x + dx * t,
          y: points[i - 1].y + dy * t
        };
      }
      currentLength += segLen;
    }
    return points[points.length - 1];
  }

  const lastStroke = states[states.length - 1]?.stroke;
  if (lastStroke?.mappedPoints?.length) {
    const last = lastStroke.mappedPoints[lastStroke.mappedPoints.length - 1];
    return last;
  }

  return null;
}
