function drawAxes(axes) {
  var pos = getActualPos(axes);
  var x = pos.x, y = pos.y;
  var w = resolveCoord(axes.w), h = resolveCoord(axes.h);
  var view = axes.view || (axes.view = { tx: 0, ty: 0, scale: 1 });

  var axesFill = hAttr(axes, "fill");
  if (axesFill) {
    ctx.fillStyle = axesFill;
    ctx.fillRect(x, y, w, h);
  }

  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.translate(x + view.tx, y + view.ty);
  ctx.scale(view.scale, view.scale);
  var prevScale = _drawScale;
  _drawScale = _drawScale * view.scale;
  for (var j = 0; j < (axes.children || []).length; j++) {
    drawPrimitive(axes.children[j]);
  }
  _drawScale = prevScale;
  ctx.restore();

  var axesStroke = hAttr(axes, "stroke");
  if (axesStroke) {
    ctx.strokeStyle = axesStroke;
    ctx.lineWidth = axes.strokeWidth || 1;
    ctx.strokeRect(x, y, w, h);
  }
  drawResizeHandles(axes, shouldShowResizeHandles(axes));
}
