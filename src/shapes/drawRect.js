export function drawRect(ctx, shape) {
  ctx.save();
  ctx.fillStyle = shape.color || '#3b82f6';
  ctx.fillRect(shape.x - shape.width / 2, shape.y - shape.height / 2, shape.width, shape.height);
  ctx.restore();
}
