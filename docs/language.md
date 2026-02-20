# Mini-language draft

The v0 language is line-oriented and whitespace-separated:

- Comments start with `#`
- Statements are one-per-line
- Shape params are `key=value`
- Bare tokens are boolean flags (example: `drag`)

## Directives

- `title <text ...>`

`canvas width=<number> height=<number>` is accepted for backward compatibility but ignored.
Output is always a single fullscreen canvas that follows browser window size.

## Primitives

- `circle x=<n> y=<n> r=<n> fill=<css-color> [drag] [resize]`
- `rect x=<n> y=<n> w=<n> h=<n> fill=<css-color> stroke=<css-color> [drag] [resize]`
- `ellipse x=<n> y=<n> rx=<n> ry=<n> fill=<css-color> stroke=<css-color> [drag] [resize]`
- `line x1=<n> y1=<n> x2=<n> y2=<n> stroke=<css-color> width=<n>`

## Axes container

`axes` defines a clipped rectangular plotting scope with optional pan and zoom behavior:

- `axes x=<n> y=<n> w=<n> h=<n> [fill=<css-color>] [stroke=<css-color>] [pan] [zoom]`
- `axes x=<n> y=<n> w=<n> h=<n> [fill=<css-color>] [stroke=<css-color>] [pan] [zoom] [drag] [resize]`
- Child statements are indented under the `axes` line.
- If both `pan` and `drag` are enabled, drag pans by default and `Shift+drag` moves the axes container.

Example:

```
axes x=80 y=80 w=900 h=500 pan zoom
  line x1=0 y1=0 x2=900 y2=0 stroke=#666 width=1
  rect x=120 y=200 w=140 h=90 fill=#3b82f6 stroke=#dbeafe
  ellipse x=420 y=240 rx=100 ry=55 fill=#34d399 stroke=#d1fae5
```

## Philosophy

- Keep authoring terse.
- Avoid punctuation-heavy syntax.
- Favor readable defaults to minimize required params.


