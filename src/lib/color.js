// Computed styles serialise colour as rgb()/rgba(), space- or comma-separated
// depending on the browser, so parse both.
export function parseColor(s) {
  if (!s || s === 'none' || s === 'transparent') return null;
  const m = String(s).match(/rgba?\(([^)]+)\)/);
  if (!m) return null;
  const p = m[1].split(/[\s,\/]+/).filter(Boolean).map(parseFloat);
  if (p.length < 3 || p.slice(0, 3).some(Number.isNaN)) return null;
  return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 };
}

export function hsl(c) {
  const R = c.r / 255, G = c.g / 255, B = c.b / 255;
  const mx = Math.max(R, G, B), mn = Math.min(R, G, B), d = mx - mn;
  let h = 0;
  if (d) {
    if (mx === R) h = ((G - B) / d) % 6;
    else if (mx === G) h = (B - R) / d + 2;
    else h = (R - G) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  const l = (mx + mn) / 2;
  return { h, s: d ? d / (1 - Math.abs(2 * l - 1)) : 0, l };
}

export function relativeLuminance(c) {
  const ch = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
  return 0.2126 * ch(c.r) + 0.7152 * ch(c.g) + 0.0722 * ch(c.b);
}
export function contrastRatio(a, b) {
  const l1 = relativeLuminance(a), l2 = relativeLuminance(b);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

export const rgbKey = c => `${Math.round(c.r)},${Math.round(c.g)},${Math.round(c.b)}`;
export const colorDist = (a, b) => Math.abs(a.r - b.r) + Math.abs(a.g - b.g) + Math.abs(a.b - b.b);
export const isPurpleHue = c => { const H = hsl(c); return H.h >= 235 && H.h <= 300 && H.s > 0.3; };

// Tailwind's indigo/violet/purple ramps, byte-exact. A designer who ran a pass
// nudges something; an untouched default means nobody looked at it.
export const TW_PURPLE = new Set([
  '99,102,241', '79,70,229', '67,56,202', '129,140,248', '165,180,252',
  '139,92,246', '124,58,237', '109,40,217', '167,139,250', '196,181,253',
  '168,85,247', '147,51,234', '126,34,206', '192,132,252', '216,180,254',
]);
