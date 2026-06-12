export function drawLine(ctx, shape) {
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(shape.x - shape.width / 2, shape.y - shape.height / 2);
  ctx.lineTo(shape.x + shape.width / 2, shape.y + shape.height / 2);
  ctx.strokeStyle = shape.color || '#3b82f6';
  ctx.lineWidth = 4;
  ctx.stroke();
  ctx.restore();
}
