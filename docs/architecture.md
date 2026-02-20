# Architecture (initial)

Core pipeline:

1. Source (`.oc`) -> parser
2. AST -> scene compiler
3. Scene JSON -> static HTML emitter
4. Browser runtime renders primitives

## Directory layout

- `bin/`: CLI executable wrappers
- `src/cli.js`: CLI command handling
- `src/syntax/`: parsing and language grammar
- `src/compile/`: AST-to-scene transformation
- `src/emit/`: output generators (HTML, later SVG/image)
- `src/runtime/`: browser-side renderers
- `examples/`: sample mini-language files
- `docs/`: language and architecture docs

## Performance direction

- Keep scene format flat and numeric-heavy for fast iteration.
- Batch style/state transitions where possible.
- Start with Canvas2D, add optional WebGL backend when needed.
- Consider binary scene serialization for very large outputs.


