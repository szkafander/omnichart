function drawEllipse(primitive) {
  var x = resolveCoord(primitive.x);
  var y = resolveCoord(primitive.y);
  var rx = resolveCoord(primitive.rx);
  var ry = resolveCoord(primitive.ry);
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  ctx.fillStyle = hAttr(primitive, "fill");
  ctx.fill();
  var stroke = hAttr(primitive, "stroke");
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = hAttr(primitive, "strokeWidth") || 1;
    ctx.stroke();
  }
  drawResizeHandles(primitive, shouldShowResizeHandles(primitive));
}
