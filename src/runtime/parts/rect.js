function drawRect(primitive) {
  var pos = getActualPos(primitive);
  var w = resolveCoord(primitive.w);
  var h = resolveCoord(primitive.h);
  ctx.fillStyle = hAttr(primitive, "fill");
  ctx.fillRect(pos.x, pos.y, w, h);
  var stroke = hAttr(primitive, "stroke");
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = hAttr(primitive, "strokeWidth") || 1;
    ctx.strokeRect(pos.x, pos.y, w, h);
  }
  drawResizeHandles(primitive, shouldShowResizeHandles(primitive));
}
