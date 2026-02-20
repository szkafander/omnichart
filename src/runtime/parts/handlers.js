var _handleHideTimer = null;

function simpleRefTarget(val, coord) {
  if (typeof val !== "string") return null;
  var parts = val.split(".");
  if (parts.length === 2 && parts[1] === coord) return scene.names && scene.names[parts[0]];
  if (parts.length === 3 && parts[2] === coord) return scene.names && scene.names[parts[0]];
  return null;
}

function findDragRoot(primitive) {
  var xTarget = simpleRefTarget(primitive.x, "x");
  var yTarget = simpleRefTarget(primitive.y, "y");
  if (xTarget && yTarget && xTarget === yTarget) return findDragRoot(xTarget);
  if (xTarget && xTarget !== primitive) return findDragRoot(xTarget);
  if (yTarget && yTarget !== primitive) return findDragRoot(yTarget);
  return primitive;
}

function onPointerDown(event) {
  var pointer = getPointer(event);
  var target = findInteractionTarget(pointer.x, pointer.y);
  if (target) {
    var primitive = target.primitive;
    var wantsResize = Boolean(target.handle) && primitive.resize;

    if (primitive.kind === "axes") {
      if (wantsResize) {
        state.mode = "resize";
      } else if (primitive.pan && primitive.drag) {
        state.mode = event.shiftKey ? "drag" : "axes-pan";
      } else if (primitive.pan) {
        state.mode = "axes-pan";
      } else if (primitive.drag) {
        state.mode = "drag";
      } else {
        return;
      }
      state.axes = primitive;
      state.axesParentScale = target.parentScale || 1;
    } else if (primitive.kind === "line" && target.handle) {
      state.mode = "drag";
    } else {
      if (wantsResize && !primitive.resize) return;
      if (!wantsResize && !primitive.drag) return;
      state.mode = wantsResize ? "resize" : "drag";
    }

    // For plain drag (not resize, not axes-pan, not line CP), follow references
    // to the root primitive that actually holds numeric coordinates.
    var dragPrimitive = (state.mode === "drag" && !target.handle) ? findDragRoot(primitive) : primitive;
    state.primitive = dragPrimitive;
    state.handle = target.handle ? target.handle.key : null;
    state.toLocal = target.toLocal;
  }

  state.startX = pointer.x;
  state.startY = pointer.y;
  if (state.toLocal) {
    var startLocal = state.toLocal(pointer.x, pointer.y);
    state.startLocalX = startLocal.x;
    state.startLocalY = startLocal.y;
  }
  if (!state.snapshot) {
    if (state.mode === "axes-pan" && state.axes) {
      state.snapshot = {
        tx: state.axes.view ? state.axes.view.tx : 0,
        ty: state.axes.view ? state.axes.view.ty : 0
      };
      canvas.style.cursor = "grabbing";
    } else {
      state.snapshot = JSON.parse(JSON.stringify(state.primitive));
    }
  }
  canvas.setPointerCapture(event.pointerId);
}

function onPointerMove(event) {
  var pointer = getPointer(event);

  if (!state.mode) {
    var target = findInteractionTarget(pointer.x, pointer.y);
    var nextHover = target ? target.primitive : null;
    var nextAxesTarget = findAxesTarget(pointer.x, pointer.y);
    var nextAxesHover = nextAxesTarget ? nextAxesTarget.axes : null;
    if (nextHover !== state.hoverPrimitive) {
      state.hoverPrimitive = nextHover;
      draw();
    }
    if (nextAxesHover !== state.hoverAxes) {
      state.hoverAxes = nextAxesHover;
      draw();
    }

    // Bezier handle visibility: show immediately on hover, hide after a short delay
    if (nextHover && nextHover.kind === "line" && nextHover.handles) {
      if (_handleHideTimer) { clearTimeout(_handleHideTimer); _handleHideTimer = null; }
      if (state.handleVisibleFor !== nextHover) {
        state.handleVisibleFor = nextHover;
        draw();
      }
    } else if (state.handleVisibleFor && state.handleVisibleFor !== nextHover) {
      if (!_handleHideTimer) {
        _handleHideTimer = setTimeout(function () {
          _handleHideTimer = null;
          state.handleVisibleFor = null;
          draw();
        }, 400);
      }
    }

    setCursorForPointer(pointer.x, pointer.y);
    return;
  }

  var dx = pointer.x - state.startX;
  var dy = pointer.y - state.startY;
  var primitive = state.primitive;
  var snapshot = state.snapshot;
  var localPoint = state.toLocal ? state.toLocal(pointer.x, pointer.y) : { x: pointer.x, y: pointer.y };
  var localDx = localPoint.x - state.startLocalX;
  var localDy = localPoint.y - state.startLocalY;

  if (state.mode === "drag") {
    if (primitive.kind === "axes" || primitive.kind === "rect" || primitive.kind === "ellipse" ||
        primitive.kind === "circle" || primitive.kind === "text") {
      if (typeof primitive.x !== "string") primitive.x = snapshot.x + localDx;
      if (typeof primitive.y !== "string") primitive.y = snapshot.y + localDy;
    } else if (primitive.kind === "line") {
      if (state.handle === "cp1") {
        primitive.cp1 = { dx: localPoint.x - resolveCoord(primitive.x1), dy: localPoint.y - resolveCoord(primitive.y1) };
      } else if (state.handle === "cp2") {
        primitive.cp2 = { dx: localPoint.x - resolveCoord(primitive.x2), dy: localPoint.y - resolveCoord(primitive.y2) };
      }
    }
  } else if (state.mode === "resize") {
    if (primitive.kind === "axes") {
      resizeFromCorner(primitive, snapshot, state.handle, localPoint.x, localPoint.y, event.shiftKey);
    } else if (primitive.kind === "rect") {
      resizeFromCorner(primitive, snapshot, state.handle, localPoint.x, localPoint.y, event.shiftKey);
    } else if (primitive.kind === "ellipse") {
      resizeFromCorner(primitive, snapshot, state.handle, localPoint.x, localPoint.y, event.shiftKey);
    } else if (primitive.kind === "circle") {
      resizeFromCorner(primitive, snapshot, state.handle, localPoint.x, localPoint.y, true);
    } else if (primitive.kind === "text") {
      resizeFromCorner(primitive, snapshot, state.handle, localPoint.x, localPoint.y, event.shiftKey);
    }
  } else if (state.mode === "axes-pan") {
    var axes = state.axes;
    if (!axes) return;
    if (!axes.view) axes.view = { tx: 0, ty: 0, scale: 1 };
    var panScale = Math.max(state.axesParentScale || 1, 1e-6);
    axes.view.tx = state.snapshot.tx + dx / panScale;
    axes.view.ty = state.snapshot.ty + dy / panScale;
    canvas.style.cursor = "grabbing";
  }

  draw();
}

function onPointerUp() {
  state.mode = null;
  state.primitive = null;
  state.axes = null;
  state.handle = null;
  state.toLocal = null;
  state.axesParentScale = 1;
  state.snapshot = null;
  draw();
}

function onPointerLeave() {
  onPointerUp();
  if (_handleHideTimer) { clearTimeout(_handleHideTimer); _handleHideTimer = null; }
  state.hoverPrimitive = null;
  state.hoverAxes = null;
  state.handleVisibleFor = null;
  canvas.style.cursor = "default";
  draw();
}

function onWheel(event) {
  var pointer = getPointer(event);

  var scrollTarget = findScrollTextTarget(pointer.x, pointer.y);
  if (scrollTarget) {
    event.preventDefault();
    var prim = scrollTarget.primitive;
    var scale = Math.max(scrollTarget.scale, 1e-6);
    var textH = prim.h - (prim.marginTop || 0) - (prim.marginBottom || 0);
    var maxScroll = Math.max(0, (prim._contentH || 0) - textH);
    prim.scrollY = Math.max(0, Math.min(maxScroll, (prim.scrollY || 0) + event.deltaY / scale));
    draw();
    return;
  }

  var axesTarget = findAxesTarget(pointer.x, pointer.y);
  if (!axesTarget || !axesTarget.axes.zoom) return;
  var axes = axesTarget.axes;
  var parentTransform = axesTarget.transform;
  event.preventDefault();
  if (!axes.view) axes.view = { tx: 0, ty: 0, scale: 1 };

  var oldScale = axes.view.scale;
  var factor = Math.exp(-event.deltaY * 0.0015);
  var newScale = Math.max(0.1, Math.min(20, oldScale * factor));
  var parentLocal = toLocalPoint(parentTransform, pointer.x, pointer.y);
  var localX = (parentLocal.x - axes.x - axes.view.tx) / oldScale;
  var localY = (parentLocal.y - axes.y - axes.view.ty) / oldScale;

  axes.view.scale = newScale;
  axes.view.tx = parentLocal.x - axes.x - localX * newScale;
  axes.view.ty = parentLocal.y - axes.y - localY * newScale;
  draw();
}
