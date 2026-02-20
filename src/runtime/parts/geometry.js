function resolveCoord(val, _depth) {
  _depth = (_depth || 0) + 1;
  if (_depth > 32) return 0;
  if (typeof val === "number") return val;
  if (typeof val !== "string") return val;
  var parts = val.split(".");
  var target, pt;
  if (parts.length === 2 && /^\w+$/.test(parts[1])) {
    target = scene.names && scene.names[parts[0]];
    if (!target) return 0;
    return resolveCoord(target[parts[1]], _depth);
  }
  if (parts.length === 3 && /^\w+$/.test(parts[1]) && (parts[2] === "x" || parts[2] === "y")) {
    target = scene.names && scene.names[parts[0]];
    if (!target) return 0;
    pt = getAnchorPoint(target, parts[1]);
    return parts[2] === "y" ? pt.y : pt.x;
  }
  // Compound expression — substitute all refs then evaluate
  var d = _depth;
  var subst = val.replace(/(\w+)\.(\w+)\.([xy])\b|(\w+)\.(\w+)\b/g, function(match, n3, a3, c3, n2, p2) {
    if (n3 !== undefined) {
      var t3 = scene.names && scene.names[n3];
      if (!t3) return "0";
      var ap = getAnchorPoint(t3, a3);
      return String(c3 === "y" ? ap.y : ap.x);
    }
    var t2 = scene.names && scene.names[n2];
    if (!t2) return "0";
    return String(resolveCoord(t2[p2], d));
  });
  try { return Function('"use strict";return(' + subst + ')')(); }
  catch(e) { return 0; }
}

function getOriginOffset(prim) {
  var w = resolveCoord(prim.w) || 0;
  var h = resolveCoord(prim.h) || 0;
  switch (prim.origin) {
    case "top_middle":    return { x: w / 2, y: 0     };
    case "top_right":     return { x: w,     y: 0     };
    case "middle_left":   return { x: 0,     y: h / 2 };
    case "center":        return { x: w / 2, y: h / 2 };
    case "middle_right":  return { x: w,     y: h / 2 };
    case "bottom_left":   return { x: 0,     y: h     };
    case "bottom_middle": return { x: w / 2, y: h     };
    case "bottom_right":  return { x: w,     y: h     };
    default:              return { x: 0,     y: 0     };
  }
}

function getActualPos(prim) {
  var x = resolveCoord(prim.x);
  var y = resolveCoord(prim.y);
  if (prim.origin && prim.origin !== "top_left" &&
      (prim.kind === "rect" || prim.kind === "text" || prim.kind === "axes")) {
    var off = getOriginOffset(prim);
    x -= off.x;
    y -= off.y;
  }
  return { x: x, y: y };
}

function getAnchorPoint(prim, anchor) {
  if (prim.kind === "rect" || prim.kind === "text" || prim.kind === "axes") {
    var pos = getActualPos(prim);
    var x = pos.x, y = pos.y;
    var w = resolveCoord(prim.w) || 0;
    var h = resolveCoord(prim.h) || 0;
    switch (anchor) {
      case "top_left":      return { x: x,         y: y         };
      case "top_middle":    return { x: x + w / 2,  y: y         };
      case "top_right":     return { x: x + w,      y: y         };
      case "middle_left":   return { x: x,           y: y + h / 2 };
      case "center":        return { x: x + w / 2,  y: y + h / 2 };
      case "middle_right":  return { x: x + w,      y: y + h / 2 };
      case "bottom_left":   return { x: x,           y: y + h     };
      case "bottom_middle": return { x: x + w / 2,  y: y + h     };
      case "bottom_right":  return { x: x + w,      y: y + h     };
    }
  }
  if (prim.kind === "circle") {
    var cx = resolveCoord(prim.x), cy = resolveCoord(prim.y), cr = resolveCoord(prim.r) || 0;
    switch (anchor) {
      case "top":    return { x: cx,      y: cy - cr };
      case "bottom": return { x: cx,      y: cy + cr };
      case "left":   return { x: cx - cr, y: cy      };
      case "right":  return { x: cx + cr, y: cy      };
      case "center": return { x: cx,      y: cy      };
    }
  }
  if (prim.kind === "ellipse") {
    var ex = resolveCoord(prim.x), ey = resolveCoord(prim.y);
    var erx = resolveCoord(prim.rx) || 0, ery = resolveCoord(prim.ry) || 0;
    switch (anchor) {
      case "top":    return { x: ex,       y: ey - ery };
      case "bottom": return { x: ex,       y: ey + ery };
      case "left":   return { x: ex - erx, y: ey       };
      case "right":  return { x: ex + erx, y: ey       };
      case "center": return { x: ex,       y: ey       };
    }
  }
  return { x: 0, y: 0 };
}

function isNearBezier(px, py, p0x, p0y, cp1x, cp1y, cp2x, cp2y, p3x, p3y, threshold) {
  var t2 = threshold * threshold;
  for (var i = 0; i <= 24; i++) {
    var t = i / 24;
    var mt = 1 - t;
    var bx = mt*mt*mt*p0x + 3*mt*mt*t*cp1x + 3*mt*t*t*cp2x + t*t*t*p3x;
    var by = mt*mt*mt*p0y + 3*mt*mt*t*cp1y + 3*mt*t*t*cp2y + t*t*t*p3y;
    var dx = px - bx, dy = py - by;
    if (dx*dx + dy*dy <= t2) return true;
  }
  return false;
}

function getPointer(event) {
  var rect = canvas.getBoundingClientRect();
  return {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top
  };
}

function getBounds(primitive) {
  if (primitive.kind === "axes" || primitive.kind === "rect" || primitive.kind === "text") {
    var pos = getActualPos(primitive);
    var w = resolveCoord(primitive.w) || 0;
    var h = resolveCoord(primitive.h) || 0;
    return { x1: pos.x, y1: pos.y, x2: pos.x + w, y2: pos.y + h };
  }
  if (primitive.kind === "ellipse") {
    var ex = resolveCoord(primitive.x), ey = resolveCoord(primitive.y);
    var erx = resolveCoord(primitive.rx) || 0, ery = resolveCoord(primitive.ry) || 0;
    return { x1: ex - erx, y1: ey - ery, x2: ex + erx, y2: ey + ery };
  }
  if (primitive.kind === "circle") {
    var cx = resolveCoord(primitive.x), cy = resolveCoord(primitive.y), cr = resolveCoord(primitive.r) || 0;
    return { x1: cx - cr, y1: cy - cr, x2: cx + cr, y2: cy + cr };
  }
  return null;
}

function getResizeHandles(primitive) {
  var bounds = getBounds(primitive);
  if (!bounds) return [];
  return [
    { key: "nw", x: bounds.x1, y: bounds.y1, cursor: "nwse-resize" },
    { key: "ne", x: bounds.x2, y: bounds.y1, cursor: "nesw-resize" },
    { key: "sw", x: bounds.x1, y: bounds.y2, cursor: "nesw-resize" },
    { key: "se", x: bounds.x2, y: bounds.y2, cursor: "nwse-resize" }
  ];
}

function getHandleAtPointer(primitive, x, y, sceneScale) {
  if (!primitive.resize) return null;
  var handles = getResizeHandles(primitive);
  var localHandleRadius = handleRadius / Math.max(sceneScale || 1, 1e-6);
  for (var j = 0; j < handles.length; j++) {
    var dx = x - handles[j].x;
    var dy = y - handles[j].y;
    if (dx * dx + dy * dy <= localHandleRadius * localHandleRadius) {
      return handles[j];
    }
  }
  return null;
}

function hitTestPrimitive(primitive, x, y) {
  if (primitive.kind === "axes") {
    var pos = getActualPos(primitive);
    var w = resolveCoord(primitive.w) || 0, h = resolveCoord(primitive.h) || 0;
    return x >= pos.x && x <= pos.x + w && y >= pos.y && y <= pos.y + h;
  }
  if (primitive.kind === "rect" || primitive.kind === "text") {
    var pos = getActualPos(primitive);
    var w = resolveCoord(primitive.w) || 0, h = resolveCoord(primitive.h) || 0;
    return x >= pos.x && x <= pos.x + w && y >= pos.y && y <= pos.y + h;
  }
  if (primitive.kind === "ellipse") {
    var ex = resolveCoord(primitive.x), ey = resolveCoord(primitive.y);
    var erx = Math.max(resolveCoord(primitive.rx) || 0, 1e-6);
    var ery = Math.max(resolveCoord(primitive.ry) || 0, 1e-6);
    var nx = (x - ex) / erx, ny = (y - ey) / ery;
    return nx * nx + ny * ny <= 1;
  }
  if (primitive.kind === "circle") {
    var cx = resolveCoord(primitive.x), cy = resolveCoord(primitive.y), cr = resolveCoord(primitive.r) || 0;
    var cdx = x - cx, cdy = y - cy;
    return cdx * cdx + cdy * cdy <= cr * cr;
  }
  return false;
}

function toLocalPoint(transform, pointerX, pointerY) {
  return {
    x: (pointerX - transform.originX) / transform.scale,
    y: (pointerY - transform.originY) / transform.scale
  };
}

function isInsideAxesViewport(axes, pointerX, pointerY, transform) {
  var pos = getActualPos(axes);
  var w = resolveCoord(axes.w) || 0, h = resolveCoord(axes.h) || 0;
  var x1 = transform.originX + transform.scale * pos.x;
  var y1 = transform.originY + transform.scale * pos.y;
  var x2 = x1 + transform.scale * w;
  var y2 = y1 + transform.scale * h;
  return pointerX >= x1 && pointerX <= x2 && pointerY >= y1 && pointerY <= y2;
}

function getAxesChildTransform(axes, parentTransform) {
  var view = axes.view || (axes.view = { tx: 0, ty: 0, scale: 1 });
  var pos = getActualPos(axes);
  return {
    originX: parentTransform.originX + parentTransform.scale * (pos.x + view.tx),
    originY: parentTransform.originY + parentTransform.scale * (pos.y + view.ty),
    scale: parentTransform.scale * view.scale
  };
}
