export function mapPoint(point, shape) {
  return {
    x: shape.x + (point.x - 0.5) * shape.width,
    y: shape.y + (point.y - 0.5) * shape.height
  };
}

function renderStroke(ctx, stroke, shape, progress) {
  const points = stroke.points.map(p => mapPoint(p, shape));
  if (points.length < 2) return;

  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);

  const totalLength = stroke.length * Math.max(shape.width, shape.height);
  const targetLength = progress * totalLength;
  let currentLength = 0;

  for (let i = 1; i < points.length; i++) {
    const dx = points[i].x - points[i - 1].x;
    const dy = points[i].y - points[i - 1].y;
    const segLen = Math.sqrt(dx * dx + dy * dy);

    if (currentLength + segLen <= targetLength + 0.001) {
      ctx.lineTo(points[i].x, points[i].y);
      currentLength += segLen;
    } else {
      const t = segLen === 0 ? 0 : (targetLength - currentLength) / segLen;
      ctx.lineTo(points[i - 1].x + dx * t, points[i - 1].y + dy * t);
      break;
    }
  }

  ctx.stroke();
}

export function drawPortrait(ctx, shape) {
  ctx.save();
  ctx.strokeStyle = shape.color || '#333333';
  ctx.lineWidth = shape.strokeWidth || 1.5;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const progress = shape.animationProgress ?? 1;
  const totalLength = shape.strokes?.reduce((sum, s) => sum + s.length * Math.max(shape.width, shape.height), 0) || 1;
  const targetPixels = progress * totalLength;
  let accumulated = 0;

  for (const stroke of shape.strokes || []) {
    const strokeLength = stroke.length * Math.max(shape.width, shape.height);
    if (accumulated >= targetPixels) break;

    const strokeProgress = Math.min(1, (targetPixels - accumulated) / strokeLength);
    renderStroke(ctx, stroke, shape, strokeProgress);
    accumulated += strokeLength;
  }

  ctx.restore();
}
