var _drawScale = 1;

function draw() {
  _drawScale = 1;
  var dpr = window.devicePixelRatio || 1;
  var width = Math.max(1, Math.floor(window.innerWidth));
  var height = Math.max(1, Math.floor(window.innerHeight));

  canvas.style.width = width + "px";
  canvas.style.height = height + "px";
  canvas.width = Math.floor(width * dpr);
  canvas.height = Math.floor(height * dpr);

  // Keep scene coordinates in CSS pixels; no resize scaling is applied.
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#181818";
  ctx.fillRect(0, 0, width, height);

  for (var j = 0; j < scene.primitives.length; j++) {
    drawPrimitive(scene.primitives[j]);
  }
}

function drawPrimitive(primitive) {
  if (primitive.kind === "axes")    { drawAxes(primitive);    return; }
  if (primitive.kind === "circle")  { drawCircle(primitive);  return; }
  if (primitive.kind === "rect")    { drawRect(primitive);    return; }
  if (primitive.kind === "ellipse") { drawEllipse(primitive); return; }
  if (primitive.kind === "text")    { drawText(primitive);    return; }
  if (primitive.kind === "line")    { drawLine(primitive);    return; }
}

function drawResizeHandles(primitive, visible) {
  if (!primitive.resize || !visible) return;
  var handles = getResizeHandles(primitive);
  for (var j = 0; j < handles.length; j++) {
    ctx.beginPath();
    ctx.arc(handles[j].x, handles[j].y, 4, 0, Math.PI * 2);
    ctx.fillStyle = "#f6f6f6";
    ctx.fill();
    ctx.strokeStyle = "#161616";
    ctx.lineWidth = 1;
    ctx.stroke();
  }
}

function shouldShowResizeHandles(primitive) {
  return primitive.resize && (state.primitive === primitive || state.hoverPrimitive === primitive || state.hoverAxes === primitive || state.axes === primitive);
}
