function drawRect(primitive) {
  var pos = getActualPos(primitive);
  var w = resolveCoord(primitive.w);
  var h = resolveCoord(primitive.h);
  ctx.fillStyle = primitive.fill;
  ctx.fillRect(pos.x, pos.y, w, h);
  if (primitive.stroke) {
    ctx.strokeStyle = primitive.stroke;
    ctx.lineWidth = primitive.strokeWidth || 1;
    ctx.strokeRect(pos.x, pos.y, w, h);
  }
  drawResizeHandles(primitive, shouldShowResizeHandles(primitive));
}
