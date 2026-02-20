function getAnchorDirection(anchor) {
  switch (anchor) {
    case "top_middle":    case "top":    return { dx:  0, dy: -1 };
    case "bottom_middle": case "bottom": return { dx:  0, dy: +1 };
    case "middle_left":   case "left":  return { dx: -1, dy:  0 };
    case "middle_right":  case "right": return { dx: +1, dy:  0 };
    case "top_left":     return { dx: -1, dy: -1 };
    case "top_right":    return { dx: +1, dy: -1 };
    case "bottom_left":  return { dx: -1, dy: +1 };
    case "bottom_right": return { dx: +1, dy: +1 };
    default:             return { dx:  0, dy:  0 };
  }
}

function resolveAnchorDirection(refString) {
  if (typeof refString !== "string") return { dx: 0, dy: 0 };
  var parts = refString.split(".");
  if (parts.length !== 3) return { dx: 0, dy: 0 };
  return getAnchorDirection(parts[1]);
}

// Draw an arrowhead with its tip at (tipX, tipY).
// (dirX, dirY): unit vector pointing in the direction of travel (toward the tip).
// Supported types: "filled", "open", "hollow", "diamond", "odiamond", "circle", "ocircle".
function drawArrowhead(tipX, tipY, dirX, dirY, type, size, color, lineWidth) {
  var px = -dirY, py = dirX;       // perpendicular to direction
  var hw = size * 0.4;             // half-width of base
  // Base corners of the arrowhead triangle
  var lx = tipX - dirX * size + px * hw;
  var ly = tipY - dirY * size + py * hw;
  var rx = tipX - dirX * size - px * hw;
  var ry = tipY - dirY * size - py * hw;

  ctx.save();
  ctx.setLineDash([]);
  ctx.lineJoin = "miter";
  ctx.miterLimit = 10;

  if (type === "open") {
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.beginPath();
    ctx.moveTo(lx, ly);
    ctx.lineTo(tipX, tipY);
    ctx.lineTo(rx, ry);
    ctx.stroke();

  } else if (type === "hollow") {
    ctx.beginPath();
    ctx.moveTo(tipX, tipY);
    ctx.lineTo(lx, ly);
    ctx.lineTo(rx, ry);
    ctx.closePath();
    ctx.fillStyle = "#181818";   // match canvas background
    ctx.fill();
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.stroke();

  } else if (type === "diamond" || type === "odiamond") {
    // Diamond: tip → left-wing → back-point → right-wing
    var mx = tipX - dirX * size * 0.5, my = tipY - dirY * size * 0.5;
    var wlx = mx + px * hw, wly = my + py * hw;
    var wrx = mx - px * hw, wry = my - py * hw;
    var bx  = tipX - dirX * size, by  = tipY - dirY * size;
    ctx.beginPath();
    ctx.moveTo(tipX, tipY);
    ctx.lineTo(wlx, wly);
    ctx.lineTo(bx, by);
    ctx.lineTo(wrx, wry);
    ctx.closePath();
    if (type === "diamond") {
      ctx.fillStyle = color;
      ctx.fill();
    } else {
      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth;
      ctx.stroke();
    }

  } else if (type === "circle" || type === "ocircle") {
    var r = hw;
    ctx.beginPath();
    ctx.arc(tipX - dirX * r, tipY - dirY * r, r, 0, Math.PI * 2);
    if (type === "circle") {
      ctx.fillStyle = color;
      ctx.fill();
    } else {
      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth;
      ctx.stroke();
    }

  } else {
    // "filled" — solid triangle (default)
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(tipX, tipY);
    ctx.lineTo(lx, ly);
    ctx.lineTo(rx, ry);
    ctx.closePath();
    ctx.fill();
  }

  ctx.restore();
}

function drawLine(primitive) {
  var x1 = resolveCoord(primitive.x1);
  var y1 = resolveCoord(primitive.y1);
  var x2 = resolveCoord(primitive.x2);
  var y2 = resolveCoord(primitive.y2);
  var isCB = primitive.route === "cb" || primitive.route === "cubic-bezier";

  // Arrowhead direction unit vectors (computed below)
  var hdx, hdy, tdx, tdy, len;

  if (isCB) {
    if (!primitive.cp1 || !primitive.cp2) {
      var dir1 = resolveAnchorDirection(primitive.x1);
      var dir2 = resolveAnchorDirection(primitive.x2);
      var dist = Math.sqrt((x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1)) || 1;
      if (dir1.dx === 0 && dir1.dy === 0) dir1 = { dx: (x2 - x1) / dist, dy: (y2 - y1) / dist };
      if (dir2.dx === 0 && dir2.dy === 0) dir2 = { dx: -(x2 - x1) / dist, dy: -(y2 - y1) / dist };
      var t = dist * 0.4;
      if (!primitive.cp1) primitive.cp1 = { dx: dir1.dx * t, dy: dir1.dy * t };
      if (!primitive.cp2) primitive.cp2 = { dx: dir2.dx * t, dy: dir2.dy * t };
    }

    var cp1x = x1 + primitive.cp1.dx;
    var cp1y = y1 + primitive.cp1.dy;
    var cp2x = x2 + primitive.cp2.dx;
    var cp2y = y2 + primitive.cp2.dy;

    ctx.strokeStyle = primitive.stroke;
    ctx.lineWidth = primitive.width;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, x2, y2);
    ctx.stroke();

    if (primitive.handles && (state.handleVisibleFor === primitive || state.primitive === primitive)) {
      ctx.save();
      ctx.setLineDash([3, 3]);
      ctx.strokeStyle = "#64748b";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x1, y1);   ctx.lineTo(cp1x, cp1y);
      ctx.moveTo(x2, y2);   ctx.lineTo(cp2x, cp2y);
      ctx.stroke();
      ctx.restore();

      ctx.beginPath();
      ctx.arc(cp1x, cp1y, 4, 0, Math.PI * 2);
      ctx.fillStyle = "#f6f6f6";
      ctx.fill();
      ctx.strokeStyle = "#161616";
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(cp2x, cp2y, 4, 0, Math.PI * 2);
      ctx.fillStyle = "#f6f6f6";
      ctx.fill();
      ctx.strokeStyle = "#161616";
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // Bezier tangent directions at endpoints
    hdx = x2 - cp2x; hdy = y2 - cp2y;
    len = Math.sqrt(hdx * hdx + hdy * hdy) || 1;
    hdx /= len; hdy /= len;

    tdx = x1 - cp1x; tdy = y1 - cp1y;
    len = Math.sqrt(tdx * tdx + tdy * tdy) || 1;
    tdx /= len; tdy /= len;

  } else {
    ctx.strokeStyle = primitive.stroke;
    ctx.lineWidth = primitive.width;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();

    // Straight-line directions
    hdx = x2 - x1; hdy = y2 - y1;
    len = Math.sqrt(hdx * hdx + hdy * hdy) || 1;
    hdx /= len; hdy /= len;
    tdx = -hdx; tdy = -hdy;
  }

  // Draw arrowheads on top of the line
  if (primitive.head || primitive.tail) {
    var color = primitive.arrowFill || primitive.stroke;
    var size  = primitive.arrowSize || 10;
    var lw    = primitive.width || 1;
    if (primitive.head) drawArrowhead(x2, y2,  hdx,  hdy, primitive.head, size, color, lw);
    if (primitive.tail) drawArrowhead(x1, y1,  tdx,  tdy, primitive.tail, size, color, lw);
  }
}
