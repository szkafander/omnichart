var _greekMap = {
  "\\alpha": "\u03b1", "\\beta": "\u03b2", "\\gamma": "\u03b3", "\\delta": "\u03b4",
  "\\epsilon": "\u03b5", "\\zeta": "\u03b6", "\\eta": "\u03b7", "\\theta": "\u03b8",
  "\\iota": "\u03b9", "\\kappa": "\u03ba", "\\lambda": "\u03bb", "\\mu": "\u03bc",
  "\\nu": "\u03bd", "\\xi": "\u03be", "\\pi": "\u03c0", "\\rho": "\u03c1",
  "\\sigma": "\u03c3", "\\tau": "\u03c4", "\\upsilon": "\u03c5", "\\phi": "\u03c6",
  "\\chi": "\u03c7", "\\psi": "\u03c8", "\\omega": "\u03c9",
  "\\Gamma": "\u0393", "\\Delta": "\u0394", "\\Theta": "\u0398", "\\Lambda": "\u039b",
  "\\Xi": "\u039e", "\\Pi": "\u03a0", "\\Sigma": "\u03a3", "\\Phi": "\u03a6",
  "\\Psi": "\u03a8", "\\Omega": "\u03a9",
  "\\inf": "\u221e", "\\pm": "\u00b1", "\\neq": "\u2260", "\\leq": "\u2264",
  "\\geq": "\u2265", "\\approx": "\u2248", "\\times": "\u00d7", "\\div": "\u00f7",
  "\\deg": "\u00b0", "\\sqrt": "\u221a", "\\sum": "\u2211", "\\prod": "\u220f",
  "\\int": "\u222b", "\\partial": "\u2202", "\\nabla": "\u2207",
  "\\leftarrow": "\u2190", "\\rightarrow": "\u2192", "\\uparrow": "\u2191", "\\downarrow": "\u2193"
};
var _greekRegex = /\\[a-zA-Z]+/g;

function replaceSymbols(text) {
  return text.replace(_greekRegex, function (m) { return _greekMap[m] || m; });
}

// Markup: **bold**, *italic*, __underline__, \n for newline, \symbol for greek/math
function parseStyledText(raw) {
  var text = replaceSymbols(raw).replace(/\\n/g, "\n");
  var spans = [];
  var re = /(\*\*(.+?)\*\*)|(__(.+?)__)|(\*(.+?)\*)|(\n)|([^*_\n]+|[*_])/g;
  var match;
  while ((match = re.exec(text)) !== null) {
    if (match[1]) {
      spans.push({ text: match[2], bold: true, italic: false, underline: false });
    } else if (match[3]) {
      spans.push({ text: match[4], bold: false, italic: false, underline: true });
    } else if (match[5]) {
      spans.push({ text: match[6], bold: false, italic: true, underline: false });
    } else if (match[7]) {
      spans.push({ text: "\n", bold: false, italic: false, underline: false });
    } else if (match[8]) {
      spans.push({ text: match[8], bold: false, italic: false, underline: false });
    }
  }
  return spans;
}

function buildFont(size, family, bold, italic) {
  var s = "";
  if (italic) s += "italic ";
  if (bold) s += "bold ";
  s += size + "px " + family;
  return s;
}

function abbreviate(ctx, raw, maxWidth, fontSize, fontFamily) {
  var plain = replaceSymbols(raw)
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/__(.+?)__/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/\\n/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  ctx.font = buildFont(fontSize, fontFamily, false, false);
  if (ctx.measureText(plain).width <= maxWidth) return plain;
  var ellipsis = "\u2026";
  var ellipsisW = ctx.measureText(ellipsis).width;
  var result = "";
  for (var i = 0; i < plain.length; i++) {
    if (ctx.measureText(plain.slice(0, i + 1)).width + ellipsisW > maxWidth) {
      return result + ellipsis;
    }
    result = plain.slice(0, i + 1);
  }
  return plain;
}

function drawText(primitive) {
  var pos = getActualPos(primitive);
  var px = pos.x, py = pos.y;
  var pw = resolveCoord(primitive.w), ph = resolveCoord(primitive.h);

  var fill = hAttr(primitive, "fill");
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fillRect(px, py, pw, ph);
  }
  var stroke = hAttr(primitive, "stroke");
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = hAttr(primitive, "strokeWidth") || 1;
    ctx.strokeRect(px, py, pw, ph);
  }

  ctx.save();
  ctx.beginPath();
  ctx.rect(px, py, pw, ph);
  ctx.clip();

  var baseFontSize = primitive.fontSize || 14;
  var fontSize = primitive.zoom ? baseFontSize / _drawScale : baseFontSize;
  var lineHeight = fontSize * 1.2;
  var fontFamily = primitive.font || "sans-serif";
  ctx.textBaseline = "top";

  var mTop = primitive.marginTop || 0;
  var mRight = primitive.marginRight || 0;
  var mBottom = primitive.marginBottom || 0;
  var mLeft = primitive.marginLeft || 0;
  var textX = px + mLeft;
  var textY = py + mTop;
  var textW = pw - mLeft - mRight;
  var textH = ph - mTop - mBottom;

  // Choose content: abbreviated when fewer than 2 lines fit in the margin-inset area on screen
  var rawText = primitive.text || "";
  if (primitive.zoom && ph * _drawScale < baseFontSize * 2.4) {
    rawText = abbreviate(ctx, rawText, textW, fontSize, fontFamily);
  }

  var spans = parseStyledText(rawText);

  var chunks = [];
  for (var si = 0; si < spans.length; si++) {
    var sp = spans[si];
    var parts = sp.text.split(/( )/);
    for (var pi = 0; pi < parts.length; pi++) {
      if (parts[pi] === "") continue;
      chunks.push({ text: parts[pi], bold: sp.bold, italic: sp.italic, underline: sp.underline });
    }
  }

  var wrappedLines = [[]];
  var lineWidths = [0];
  for (var ci = 0; ci < chunks.length; ci++) {
    var chunk = chunks[ci];
    ctx.font = buildFont(fontSize, fontFamily, chunk.bold, chunk.italic);
    var cw = ctx.measureText(chunk.text).width;
    var curLine = wrappedLines.length - 1;

    if (chunk.text === "\n") {
      wrappedLines.push([]);
      lineWidths.push(0);
      continue;
    }

    if (lineWidths[curLine] + cw > textW && lineWidths[curLine] > 0 && chunk.text !== " ") {
      var prev = wrappedLines[curLine];
      if (prev.length > 0 && prev[prev.length - 1].text === " ") {
        lineWidths[curLine] -= ctx.measureText(" ").width;
        prev.pop();
      }
      wrappedLines.push([]);
      lineWidths.push(0);
      curLine++;
    }
    if (lineWidths[curLine] === 0 && chunk.text === " ") continue;
    wrappedLines[curLine].push({ text: chunk.text, bold: chunk.bold, italic: chunk.italic, underline: chunk.underline, width: cw });
    lineWidths[curLine] += cw;
  }

  var totalH = wrappedLines.length * lineHeight;
  var startY;
  if (primitive.scroll) {
    primitive._contentH = totalH;
    var maxScroll = Math.max(0, totalH - textH);
    primitive.scrollY = Math.max(0, Math.min(maxScroll, primitive.scrollY || 0));
    startY = textY - primitive.scrollY;
  } else if (primitive.va === "middle") {
    startY = textY + (textH - totalH) / 2;
  } else if (primitive.va === "bottom") {
    startY = textY + textH - totalH;
  } else {
    startY = textY;
  }

  var textColor = hAttr(primitive, "color") || "#ffffff";

  for (var li = 0; li < wrappedLines.length; li++) {
    var line = wrappedLines[li];
    var lw = lineWidths[li];

    var lineX;
    if (primitive.ha === "center") {
      lineX = textX + (textW - lw) / 2;
    } else if (primitive.ha === "right") {
      lineX = textX + textW - lw;
    } else {
      lineX = textX;
    }

    var curX = lineX;
    var curY = startY + li * lineHeight;
    for (var k = 0; k < line.length; k++) {
      var seg = line[k];
      ctx.font = buildFont(fontSize, fontFamily, seg.bold, seg.italic);
      ctx.fillStyle = textColor;
      ctx.fillText(seg.text, curX, curY);
      if (seg.underline) {
        var ulY = curY + fontSize + 1;
        ctx.beginPath();
        ctx.moveTo(curX, ulY);
        ctx.lineTo(curX + seg.width, ulY);
        ctx.strokeStyle = textColor;
        ctx.lineWidth = Math.max(1, fontSize / 14);
        ctx.stroke();
      }
      curX += seg.width;
    }
  }

  ctx.restore();
  drawResizeHandles(primitive, shouldShowResizeHandles(primitive));
}
