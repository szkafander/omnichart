export function parseDocument(source, options = {}) {
  const directives = [];
  const nodes = [];
  const root = { type: "root", children: nodes };
  const stack = [{ indent: -1, node: root }];

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
        params: parseTokens(tokens, { sourcePath: options.sourcePath, line: trimmed }),
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
          ...parseTokens(paramTokens, { sourcePath: options.sourcePath, line: trimmed })
        }
      });
      continue;
    }

    if (isShape(head)) {
      parent.children.push({
        type: "shape",
        shape: head,
        params: parseTokens(tokens, { sourcePath: options.sourcePath, line: trimmed })
      });
      continue;
    }

    throw new Error(`Unsupported statement "${head}" in: ${trimmed}`);
  }

  return { kind: "Program", directives, nodes };
}

function parseTokens(tokens, context) {
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
    out[key] = parseValue(rawValue);
  }

  return out;
}

function parseValue(value) {
  if ((value.startsWith("'") && value.endsWith("'")) ||
      (value.startsWith('"') && value.endsWith('"'))) {
    return value.slice(1, -1);
  }
  if (/^-?\d+(\.\d+)?$/.test(value)) {
    return Number(value);
  }
  if (value === "true") return true;
  if (value === "false") return false;
  return value;
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
    if (char === " ") {
      count += 1;
      continue;
    }
    if (char === "\t") {
      count += 2;
      continue;
    }
    break;
  }
  return count;
}
