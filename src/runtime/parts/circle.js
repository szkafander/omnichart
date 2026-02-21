function drawCircle(primitive) {
  var x = resolveCoord(primitive.x);
  var y = resolveCoord(primitive.y);
  var r = resolveCoord(primitive.r);
  ctx.fillStyle = hAttr(primitive, "fill");
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  drawResizeHandles(primitive, shouldShowResizeHandles(primitive));
}
