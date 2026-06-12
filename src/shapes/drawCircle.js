export function drawCircle(ctx, shape) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(shape.x, shape.y, Math.min(shape.width, shape.height) / 2, 0, Math.PI * 2);
  ctx.fillStyle = shape.color || '#3b82f6';
  ctx.fill();
  ctx.restore();
}
