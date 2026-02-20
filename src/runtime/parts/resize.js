function resizeFromCorner(primitive, snapshot, handleKey, px, py, preserveAspect) {
  var x1;
  var y1;
  var x2;
  var y2;

  if (primitive.kind === "rect" || primitive.kind === "axes" || primitive.kind === "text") {
    x1 = snapshot.x;
    y1 = snapshot.y;
    x2 = snapshot.x + snapshot.w;
    y2 = snapshot.y + snapshot.h;
  } else if (primitive.kind === "ellipse") {
    x1 = snapshot.x - snapshot.rx;
    y1 = snapshot.y - snapshot.ry;
    x2 = snapshot.x + snapshot.rx;
    y2 = snapshot.y + snapshot.ry;
  } else if (primitive.kind === "circle") {
    x1 = snapshot.x - snapshot.r;
    y1 = snapshot.y - snapshot.r;
    x2 = snapshot.x + snapshot.r;
    y2 = snapshot.y + snapshot.r;
  } else {
    return;
  }

  if (preserveAspect) {
    var initialWidth = Math.max(minSize, x2 - x1);
    var initialHeight = Math.max(minSize, y2 - y1);
    var minScale = Math.max(minSize / initialWidth, minSize / initialHeight);
    var aspect = initialWidth / initialHeight;
    var transform = getResizeTransform(handleKey, x1, y1, x2, y2);
    if (!transform) return;

    var rawWidth = Math.abs(px - transform.anchorX);
    var rawHeight = Math.abs(py - transform.anchorY);
    var scale = Math.max(minScale, rawWidth / initialWidth, rawHeight / initialHeight);
    var width = initialWidth * scale;
    var height = width / aspect;
    var movedX = transform.anchorX + transform.signX * width;
    var movedY = transform.anchorY + transform.signY * height;

    x1 = Math.min(transform.anchorX, movedX);
    x2 = Math.max(transform.anchorX, movedX);
    y1 = Math.min(transform.anchorY, movedY);
    y2 = Math.max(transform.anchorY, movedY);
  } else if (handleKey === "nw") {
    x1 = Math.min(px, x2 - minSize);
    y1 = Math.min(py, y2 - minSize);
  } else if (handleKey === "ne") {
    x2 = Math.max(px, x1 + minSize);
    y1 = Math.min(py, y2 - minSize);
  } else if (handleKey === "sw") {
    x1 = Math.min(px, x2 - minSize);
    y2 = Math.max(py, y1 + minSize);
  } else if (handleKey === "se") {
    x2 = Math.max(px, x1 + minSize);
    y2 = Math.max(py, y1 + minSize);
  }

  if (primitive.kind === "rect" || primitive.kind === "axes" || primitive.kind === "text") {
    primitive.x = x1;
    primitive.y = y1;
    primitive.w = x2 - x1;
    primitive.h = y2 - y1;
  } else if (primitive.kind === "ellipse") {
    primitive.x = (x1 + x2) / 2;
    primitive.y = (y1 + y2) / 2;
    primitive.rx = (x2 - x1) / 2;
    primitive.ry = (y2 - y1) / 2;
  } else if (primitive.kind === "circle") {
    primitive.x = (x1 + x2) / 2;
    primitive.y = (y1 + y2) / 2;
    primitive.r = Math.max((x2 - x1) / 2, (y2 - y1) / 2);
  }
}

function getResizeTransform(handleKey, x1, y1, x2, y2) {
  if (handleKey === "nw") return { anchorX: x2, anchorY: y2, signX: -1, signY: -1 };
  if (handleKey === "ne") return { anchorX: x1, anchorY: y2, signX: 1, signY: -1 };
  if (handleKey === "sw") return { anchorX: x2, anchorY: y1, signX: -1, signY: 1 };
  if (handleKey === "se") return { anchorX: x1, anchorY: y1, signX: 1, signY: 1 };
  return null;
}
