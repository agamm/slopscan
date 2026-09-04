import { parseColor } from './color.js';

// Split on commas that are not inside rgb()/rgba().
function splitLayers(s) {
  const out = [];
  let depth = 0, cur = '';
  for (const ch of s) {
    if (ch === '(') depth++;
    else if (ch === ')') depth--;
    if (ch === ',' && depth === 0) { out.push(cur); cur = ''; }
    else cur += ch;
  }
  if (cur.trim()) out.push(cur);
  return out.map(x => x.trim()).filter(Boolean);
}

// -> [{ off: [x, y, blur, spread], col, inset }]
export function shadowLayers(boxShadow) {
  if (!boxShadow || boxShadow === 'none') return [];
  return splitLayers(boxShadow).map(layer => {
    const col = parseColor(layer);
    const n = (layer.replace(/rgba?\([^)]*\)/g, '').match(/-?[\d.]+px/g) || [])
      .map(x => Math.round(parseFloat(x)));
    while (n.length < 4) n.push(0);
    return { off: n.slice(0, 4), col, inset: /inset/.test(layer) };
  });
}

// Normalised signature -> Tailwind's default shadow scale.
export const TW_SHADOWS = new Map([
  ['0,1,2,0@0.05', 'shadow-sm'],
  ['0,1,3,0@0.1|0,1,2,-1@0.1', 'shadow'],
  ['0,4,6,-1@0.1|0,2,4,-2@0.1', 'shadow-md'],
  ['0,10,15,-3@0.1|0,4,6,-4@0.1', 'shadow-lg'],
  ['0,20,25,-5@0.1|0,8,10,-6@0.1', 'shadow-xl'],
  ['0,25,50,-12@0.25', 'shadow-2xl'],
]);

export function shadowSignature(layers) {
  return layers.map(x => `${x.off.join(',')}@${x.col ? +x.col.a.toFixed(2) : 1}`).join('|');
}
