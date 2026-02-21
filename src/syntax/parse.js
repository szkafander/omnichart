// Anchor abbreviations — _prefix is reserved, cannot be used as variable names.
const _ABBREVS = {
  _tl: "top_left",    _tm: "top_middle",   _tr: "top_right",
  _ml: "middle_left", _c:  "center",       _mr: "middle_right",
  _bl: "bottom_left", _bm: "bottom_middle", _br: "bottom_right",
  _cb: "cubic-bezier"
};

function expandAbbreviations(str) {
  return str.replace(/_(?:tl|tm|tr|ml|c|mr|bl|bm|br|cb)\b/g, m => _ABBREVS[m]);
}

export function parseDocument(source, options = {}) {
  const directives = [];
  const nodes = [];
  const root = { type: "root", children: nodes };
  const stack = [{ indent: -1, node: root }];
  const vars = {};  // file-level variable definitions

  for (const rawLine of source.split(/\r?\n/)) {
    if (!rawLine.trim()) continue;
    const trimmed = rawLine.trim();
    if (trimmed.startsWith("#")) continue;

    const indent = getIndent(rawLine);
    while (stack.length > 1 && indent <= stack[stack.length - 1].indent) {
      stack.pop();
    }

    const parent = stack[stack.length - 1].node;
    const allTokens = tokenize(trimmed);
    const head = allTokens[0];
    const tokens = allTokens.slice(1);

    if (head === "canvas" || head === "title") {
      if (parent !== root) {
        throw new Error(`Directive "${head}" must be at top-level: ${trimmed}`);
      }
      directives.push({ type: head, tokens });
      continue;
    }

    // Variable definition: top-level bare "key=value" token.
    // Keys starting with _ are reserved for abbreviations and cannot be variables.
    if (parent === root && head.includes("=")) {
      const eqIdx = head.indexOf("=");
      const varKey = head.slice(0, eqIdx);
      const varRaw = head.slice(eqIdx + 1);
      if (/^\w+$/.test(varKey) && !varKey.startsWith("_") && varRaw) {
        vars[varKey] = parseValue(varRaw, vars);
        continue;
      }
    }

    if (head === "bind") {
      const token = tokens[0];
      if (!token || !token.includes("=")) {
        throw new Error(`Invalid bind syntax: ${trimmed}`);
      }
      const eqIndex = token.indexOf("=");
      const name = token.slice(0, eqIndex);
      const filePath = token.slice(eqIndex + 1);
      if (!name || !filePath) {
        throw new Error(`Invalid bind syntax: ${trimmed}`);
      }
      const bindNode = {
        type: "bind",
        name,
        path: filePath,
        data: null,
        children: []
      };
      parent.children.push(bindNode);
      stack.push({ indent, node: bindNode });
      continue;
    }

    if (head === "each") {
      if (tokens.length < 3 || tokens[1] !== "in") {
        throw new Error(`Invalid each syntax (expected "each <var> in <collection>"): ${trimmed}`);
      }
      const eachNode = {
        type: "each",
        variable: tokens[0],
        collection: tokens[2],
        children: []
      };
      parent.children.push(eachNode);
      stack.push({ indent, node: eachNode });
      continue;
    }

    if (head === "for") {
      const rest = tokens.join("").replace(/\s/g, "");
      const match = rest.match(/^(\w+)=\[(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)(?:,(-?\d+(?:\.\d+)?))?\]$/);
      if (!match) {
        throw new Error(`Invalid for syntax: ${trimmed}`);
      }
      const forNode = {
        type: "for",
        variable: match[1],
        start: Number(match[2]),
        end: Number(match[3]),
        step: match[4] != null ? Number(match[4]) : 1,
        children: []
      };
      parent.children.push(forNode);
      stack.push({ indent, node: forNode });
      continue;
    }

    if (head === "axes") {
      const axesNode = {
        type: "axes",
        params: parseTokens(tokens, { sourcePath: options.sourcePath, line: trimmed }, vars),
        children: []
      };
      parent.children.push(axesNode);
      stack.push({ indent, node: axesNode });
      continue;
    }

    if (head === "text") {
      let textValue = "";
      let paramTokens = tokens;
      if (tokens.length > 0) {
        const first = tokens[0];
        if ((first.startsWith("'") && first.endsWith("'")) ||
            (first.startsWith('"') && first.endsWith('"'))) {
          textValue = first.slice(1, -1);
          paramTokens = tokens.slice(1);
        }
      }
      parent.children.push({
        type: "shape",
        shape: "text",
        params: {
          text: textValue,
          ...parseTokens(paramTokens, { sourcePath: options.sourcePath, line: trimmed }, vars)
        }
      });
      continue;
    }

    if (isShape(head)) {
      parent.children.push({
        type: "shape",
        shape: head,
        params: parseTokens(tokens, { sourcePath: options.sourcePath, line: trimmed }, vars)
      });
      continue;
    }

    throw new Error(`Unsupported statement "${head}" in: ${trimmed}`);
  }

  return { kind: "Program", directives, nodes };
}

function parseTokens(tokens, context, vars) {
  const out = {};

  for (const token of tokens) {
    if (!token.includes("=")) {
      // Bare tokens are boolean feature flags, e.g. "drag".
      out[token] = true;
      continue;
    }

    const eqIndex = token.indexOf("=");
    const key = token.slice(0, eqIndex);
    const rawValue = token.slice(eqIndex + 1);
    if (!rawValue) {
      throw new Error(`Expected key=value token, got "${token}" in ${context.line}`);
    }
    if (key.startsWith("hover:")) {
      const hoverKey = key.slice(6);
      if (!out.hover) out.hover = {};
      out.hover[hoverKey] = parseValue(rawValue, vars);
      continue;
    }
    out[key] = parseValue(rawValue, vars);
  }

  return expandLocation(out, vars);
}

// Expand l / l1 / l2 location shorthands into coordinate pairs.
//   l=name.anchor  →  x=name.anchor.x  y=name.anchor.y
//   l=name         →  x=name.x         y=name.y
//   l=n,m          →  x=n              y=m
// l1/l2 expand to x1/y1 and x2/y2 respectively (for lines).
// Explicit x/y always take precedence over l.
function expandLocation(params, vars) {
  for (const [lk, xk, yk] of [["l", "x", "y"], ["l1", "x1", "y1"], ["l2", "x2", "y2"]]) {
    if (!(lk in params)) continue;
    const val = params[lk];
    delete params[lk];
    if (typeof val === "string" && val.includes(",")) {
      const [a, b] = val.split(",");
      if (!(xk in params)) params[xk] = parseValue(a.trim(), vars);
      if (!(yk in params)) params[yk] = parseValue(b.trim(), vars);
    } else {
      const base = String(val);
      if (!(xk in params)) params[xk] = base + ".x";
      if (!(yk in params)) params[yk] = base + ".y";
    }
  }
  return params;
}

// Parse a raw value string into the appropriate JS type.
// Order: quoted string → abbreviation expansion → variable lookup → number → bool → string.
function parseValue(rawValue, vars) {
  // Quoted string: expand abbreviations inside and return the inner string.
  if ((rawValue.startsWith("'") && rawValue.endsWith("'")) ||
      (rawValue.startsWith('"') && rawValue.endsWith('"'))) {
    return expandAbbreviations(rawValue.slice(1, -1));
  }
  // Expand anchor abbreviations, then try variable substitution.
  const expanded = expandAbbreviations(rawValue);
  if (vars && Object.prototype.hasOwnProperty.call(vars, expanded)) return vars[expanded];
  if (/^-?\d+(\.\d+)?$/.test(expanded)) return Number(expanded);
  if (expanded === "true") return true;
  if (expanded === "false") return false;
  return expanded;
}

function tokenize(str) {
  var out = [];
  var re = /\w+='[^']*'|\w+="[^"]*"|'[^']*'|"[^"]*"|\S+/g;
  var m;
  while ((m = re.exec(str)) !== null) out.push(m[0]);
  return out;
}

function isShape(head) {
  return head === "circle" || head === "line" || head === "rect" || head === "ellipse" || head === "text";
}

function getIndent(line) {
  let count = 0;
  for (const char of line) {
    if (char === " ") { count += 1; continue; }
    if (char === "\t") { count += 2; continue; }
    break;
  }
  return count;
}
