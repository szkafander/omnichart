const MATH_ENV = {
  sqrt: Math.sqrt, abs: Math.abs, floor: Math.floor, ceil: Math.ceil,
  round: Math.round, log: Math.log, log2: Math.log2, log10: Math.log10,
  sin: Math.sin, cos: Math.cos, tan: Math.tan,
  min: Math.min, max: Math.max, pow: Math.pow, exp: Math.exp,
  sign: Math.sign, trunc: Math.trunc, PI: Math.PI, E: Math.E
};

const _mathKeys = Object.keys(MATH_ENV);
const _mathVals = Object.values(MATH_ENV);

export function evaluateExpr(expr, vars) {
  try {
    const varKeys = Object.keys(vars);
    const varVals = Object.values(vars);
    const fn = new Function(..._mathKeys, ...varKeys, `"use strict"; return (${expr});`);
    return fn(..._mathVals, ...varVals);
  } catch {
    return expr;
  }
}
