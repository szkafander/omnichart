function drawEllipse(primitive) {
  var x = resolveCoord(primitive.x);
  var y = resolveCoord(primitive.y);
  var rx = resolveCoord(primitive.rx);
  var ry = resolveCoord(primitive.ry);
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  ctx.fillStyle = primitive.fill;
  ctx.fill();
  if (primitive.stroke) {
    ctx.strokeStyle = primitive.stroke;
    ctx.lineWidth = primitive.strokeWidth || 1;
    ctx.stroke();
  }
  drawResizeHandles(primitive, shouldShowResizeHandles(primitive));
}
