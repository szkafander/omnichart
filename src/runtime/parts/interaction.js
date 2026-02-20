function findInteractionTarget(x, y) {
  return findInteractionTargetInList(scene.primitives, x, y, { originX: 0, originY: 0, scale: 1 });
}

function findInteractionTargetInList(primitives, pointerX, pointerY, transform) {
  for (var i = primitives.length - 1; i >= 0; i -= 1) {
    var primitive = primitives[i];
    if (primitive.kind === "axes") {
      var local = toLocalPoint(transform, pointerX, pointerY);
      var handle = getHandleAtPointer(primitive, local.x, local.y, transform.scale);
      if (handle && primitive.resize) {
        return {
          primitive: primitive,
          handle: handle,
          toLocal: function (t) { return function (x, y) { return toLocalPoint(t, x, y); }; }(transform),
          parentScale: transform.scale
        };
      }
      if (!isInsideAxesViewport(primitive, pointerX, pointerY, transform)) continue;

      var childTransform = getAxesChildTransform(primitive, transform);
      var childTarget = findInteractionTargetInList(primitive.children || [], pointerX, pointerY, childTransform);
      if (childTarget) return childTarget;
      var isInside = hitTestPrimitive(primitive, local.x, local.y);
      var interactiveAxes = primitive.pan || primitive.drag || primitive.resize;
      if (interactiveAxes && (handle || isInside)) {
        return {
          primitive: primitive,
          handle: handle,
          toLocal: function (t) { return function (x, y) { return toLocalPoint(t, x, y); }; }(transform),
          parentScale: transform.scale
        };
      }
      continue;
    }

    if (primitive.kind === "line" && primitive.handles && primitive.cp1 && primitive.cp2) {
      var local = toLocalPoint(transform, pointerX, pointerY);
      var lp0x = resolveCoord(primitive.x1), lp0y = resolveCoord(primitive.y1);
      var lp3x = resolveCoord(primitive.x2), lp3y = resolveCoord(primitive.y2);
      var lcp1x = lp0x + primitive.cp1.dx, lcp1y = lp0y + primitive.cp1.dy;
      var lcp2x = lp3x + primitive.cp2.dx, lcp2y = lp3y + primitive.cp2.dy;
      var hr = handleRadius / Math.max(transform.scale, 1e-6);
      var d1x = local.x - lcp1x, d1y = local.y - lcp1y;
      var d2x = local.x - lcp2x, d2y = local.y - lcp2y;
      var toLocalFn = function (t) { return function (x, y) { return toLocalPoint(t, x, y); }; }(transform);
      if (d1x * d1x + d1y * d1y <= hr * hr) {
        return { primitive: primitive, handle: { key: "cp1", cursor: "crosshair" }, toLocal: toLocalFn, parentScale: transform.scale };
      }
      if (d2x * d2x + d2y * d2y <= hr * hr) {
        return { primitive: primitive, handle: { key: "cp2", cursor: "crosshair" }, toLocal: toLocalFn, parentScale: transform.scale };
      }
      var curveR = Math.max(primitive.width / 2 + 4, 6) / Math.max(transform.scale, 1e-6);
      if (isNearBezier(local.x, local.y, lp0x, lp0y, lcp1x, lcp1y, lcp2x, lcp2y, lp3x, lp3y, curveR)) {
        return { primitive: primitive, handle: null, toLocal: toLocalFn, parentScale: transform.scale };
      }
    }

    var interactive = primitive.drag || primitive.resize;
    if (!interactive) continue;
    var local = toLocalPoint(transform, pointerX, pointerY);
    var handle = getHandleAtPointer(primitive, local.x, local.y, transform.scale);
    if (handle) {
      return {
        primitive: primitive,
        handle: handle,
        toLocal: function (t) { return function (x, y) { return toLocalPoint(t, x, y); }; }(transform),
        parentScale: transform.scale
      };
    }
    if (hitTestPrimitive(primitive, local.x, local.y)) {
      return {
        primitive: primitive,
        handle: null,
        toLocal: function (t) { return function (x, y) { return toLocalPoint(t, x, y); }; }(transform),
        parentScale: transform.scale
      };
    }
  }
  return null;
}

function findAxesTarget(x, y) {
  return findAxesTargetInList(scene.primitives, x, y, { originX: 0, originY: 0, scale: 1 });
}

function findAxesTargetInList(primitives, pointerX, pointerY, transform) {
  for (var i = primitives.length - 1; i >= 0; i -= 1) {
    var primitive = primitives[i];
    if (primitive.kind !== "axes") continue;
    var local = toLocalPoint(transform, pointerX, pointerY);
    var onHandle = Boolean(getHandleAtPointer(primitive, local.x, local.y, transform.scale));
    if (!onHandle && !isInsideAxesViewport(primitive, pointerX, pointerY, transform)) continue;

    var childTransform = getAxesChildTransform(primitive, transform);
    var nested = findAxesTargetInList(primitive.children || [], pointerX, pointerY, childTransform);
    if (nested) return nested;
    return { axes: primitive, transform: transform };
  }
  return null;
}

function findScrollTextTarget(x, y) {
  return findScrollTextTargetInList(scene.primitives, x, y, { originX: 0, originY: 0, scale: 1 });
}

function findScrollTextTargetInList(primitives, pointerX, pointerY, transform) {
  for (var i = primitives.length - 1; i >= 0; i -= 1) {
    var primitive = primitives[i];
    if (primitive.kind === "axes") {
      if (!isInsideAxesViewport(primitive, pointerX, pointerY, transform)) continue;
      var childTransform = getAxesChildTransform(primitive, transform);
      var found = findScrollTextTargetInList(primitive.children || [], pointerX, pointerY, childTransform);
      if (found) return found;
      continue;
    }
    if (primitive.kind !== "text" || !primitive.scroll) continue;
    var local = toLocalPoint(transform, pointerX, pointerY);
    if (hitTestPrimitive(primitive, local.x, local.y)) {
      return { primitive: primitive, scale: transform.scale };
    }
  }
  return null;
}

function setCursorForPointer(x, y) {
  var target = findInteractionTarget(x, y);
  if (target) {
    if (target.handle) {
      canvas.style.cursor = target.handle.cursor;
      return;
    }
    if (target.primitive.kind === "axes" && target.primitive.pan) {
      canvas.style.cursor = "grab";
      return;
    }
    canvas.style.cursor = "move";
    return;
  }
  var axesTarget = findAxesTarget(x, y);
  if (axesTarget && axesTarget.axes.pan) {
    canvas.style.cursor = "grab";
    return;
  }
  canvas.style.cursor = "default";
}
