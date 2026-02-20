# Developer Guide

## What This Is

OmniChart compiles `.oc` mini-language files into standalone HTML files that render interactive 2D graphics via Canvas2D. Zero runtime dependencies. No build tools beyond Node 20+.

```
.oc source  -->  parse  -->  compile  -->  emit  -->  .html file
              (AST)       (scene JSON)    (self-contained HTML + JS)
```

## Project Layout

```
bin/omnichart.js          CLI entry point
src/
  cli.js                  Arg parsing, file I/O, orchestrates the build
  index.js                Public API re-exports (runCli, buildFromSource)
  pipeline/build.js       Glues parse -> compile -> emit into one call
  syntax/parse.js         .oc source -> AST
  compile/compile-scene.js  AST -> normalized scene object
  emit/emit-html.js       Scene -> standalone HTML string
  runtime/browser-runtime.js  Canvas2D renderer + interaction (runs in browser)
examples/                 Sample .oc files
test/                     node:test unit tests
```

## The Pipeline

### 1. Parse (`src/syntax/parse.js`)

- Line-oriented parser, no tokenizer/lexer split
- `#` lines are comments, blank lines are skipped
- First token on a line is the keyword (`title`, `canvas`, `axes`, `rect`, etc.)
- Remaining tokens are either `key=value` pairs or bare flags (`drag`, `resize` -> `true`)
- Indentation creates parent-child nesting (only `axes` can have children)
- Indentation is measured in spaces (tabs count as 2 spaces)
- Output: `{ kind: "Program", directives: [...], nodes: [...] }`

### 2. Compile (`src/compile/compile-scene.js`)

- Walks the AST and normalizes every node into a flat shape with explicit defaults
- Each shape type gets its own default values (see `normalizePrimitive`)
- `circle` becomes `kind: "circle"`
- Axes nodes recursively normalize their children
- Axes get a `view: { tx, ty, scale }` for pan/zoom state
- Output: `{ version: 1, meta: { title }, primitives: [...] }`

### 3. Emit (`src/emit/emit-html.js`)

- Produces a complete `<!doctype html>` document
- Inlines the browser runtime JS source as a string literal
- Inlines the scene JSON via `JSON.stringify`
- The HTML calls `OMNICHART_RUNTIME.render(canvas, scene)` on load
- No external resources, no network requests at runtime

## The Browser Runtime (`src/runtime/browser-runtime.js`)

This file is an exported string containing a self-executing JS function. It's embedded verbatim into the HTML output. Everything below runs in the browser, not in Node.

### Rendering

- Uses Canvas2D (`getContext("2d")`)
- Handles device pixel ratio for crisp rendering on HiDPI displays
- Full redraw on every frame (no dirty tracking)
- Background is `#181818`, cleared each frame
- Draw order = array order (last primitive paints on top)

### Axes rendering

- Fills the axes background rect
- `ctx.save()` -> clip to axes bounds -> translate by `(axes.x + view.tx, axes.y + view.ty)` -> scale by `view.scale`
- Draws all children in this transformed/clipped context
- `ctx.restore()` -> draws axes stroke border and resize handles on top

### Coordinate Transforms

The runtime tracks transforms as `{ originX, originY, scale }` objects:

- **`toLocalPoint(transform, px, py)`** - converts screen coords to local coords: `(px - originX) / scale`
- **`getAxesChildTransform(axes, parent)`** - computes the child transform by composing parent transform with axes position + view offset + view scale
- **`isInsideAxesViewport(axes, px, py, transform)`** - screen-space AABB test for whether a pointer is inside an axes box

### Hit Testing and Interaction Targets

`findInteractionTarget(x, y)` walks primitives back-to-front and returns the topmost interactive element under the pointer:

- For axes: checks resize handles first (in parent coords), then recurses into children (in child coords), then checks the axes body itself
- For shapes: checks resize handles, then the shape body
- Non-interactive primitives (`!drag && !resize`) are skipped
- Returns `{ primitive, handle, toLocal, parentScale }`

`findAxesTarget(x, y)` is a simpler walk that only finds axes containers (used for zoom wheel targeting and cursor display).

### Interaction State Machine

All interaction is pointer-based. State lives in a single `state` object.

**Modes** (`state.mode`):
- `null` - idle, just tracking hover
- `"drag"` - moving a primitive or axes container
- `"resize"` - resizing via a corner handle
- `"axes-pan"` - panning the axes viewport

**Flow:**
1. `pointerdown` -> find target, determine mode, snapshot current state
2. `pointermove` -> compute deltas, apply to primitive based on mode
3. `pointerup` -> reset all state

**Mode selection for axes** (in `onPointerDown`):
- Handle hit + resize -> `"resize"`
- pan + drag -> pan by default, shift+drag to move
- pan only -> `"axes-pan"`
- drag only -> `"drag"`

### Resizing

- Four corner handles: `nw`, `ne`, `sw`, `se`
- Handles are 4px visible radius, 8px hit radius
- Hit radius is scaled inversely with zoom so handles stay clickable at any zoom level
- `resizeFromCorner()` works for `rect`, `axes` (both use x/y/w/h), and `ellipse` (converts to/from center+radii)
- Shift held during resize preserves aspect ratio
- Minimum dimension is 8px (`minSize`)

### Resize Handle Visibility

Handles are drawn only when `primitive.resize` is true AND the primitive is hovered or actively being interacted with (checked in `shouldShowResizeHandles`).

### Pan and Zoom (Axes Only)

- **Pan**: pointer drag translates `axes.view.tx/ty`, scaled by parent transform
- **Zoom**: mouse wheel adjusts `axes.view.scale` (range 0.1-20x), pivoting around the cursor position so the point under the cursor stays fixed

## The .oc Mini-Language

### Directives (top-level only)

```
title My Chart          # sets HTML <title> and canvas aria-label
canvas width=800 height=600  # ignored (backward compat)
```

### Shapes

```
circle x=N y=N r=N fill=COLOR [drag] [resize]
rect x=N y=N w=N h=N fill=COLOR [stroke=COLOR] [drag] [resize]
ellipse x=N y=N rx=N ry=N fill=COLOR [stroke=COLOR] [drag] [resize]
line x1=N y1=N x2=N y2=N stroke=COLOR width=N
```

### Axes (container)

```
axes x=N y=N w=N h=N [fill=COLOR] [stroke=COLOR] [pan] [zoom] [drag] [resize]
  # indented children live in axes-local coordinates
  rect x=10 y=10 w=50 h=50 fill=#f00
```

- Children are clipped to the axes bounds
- Children use the axes coordinate system (0,0 is the top-left of the axes, affected by pan/zoom)

## Testing

```sh
node --test           # runs all tests in test/
```

Tests use `node:test` and `node:assert/strict`. No test framework dependencies.

- `compile.test.js` - verifies parse+compile for boolean flags, axes children, shape attributes
- `build.test.js` - end-to-end: reads an example .oc, builds HTML, checks for expected markers

## Building

```sh
node bin/omnichart.js build examples/scatter.oc -o out/scatter.html
# or
npm run build   # builds scatter.oc to out/scatter.html
```

Output is a single self-contained HTML file. Open it directly in a browser.
