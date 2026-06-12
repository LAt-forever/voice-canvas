export function drawTriangle(ctx, shape) {
  ctx.save();
  const halfW = shape.width / 2;
  const halfH = shape.height / 2;
  ctx.beginPath();
  ctx.moveTo(shape.x, shape.y - halfH);
  ctx.lineTo(shape.x + halfW, shape.y + halfH);
  ctx.lineTo(shape.x - halfW, shape.y + halfH);
  ctx.closePath();
  ctx.fillStyle = shape.color || '#3b82f6';
  ctx.fill();
  ctx.restore();
}
