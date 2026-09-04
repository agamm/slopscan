import { hsl } from './color.js';
import { fontGroup } from './fonts.js';

// Most-common value and how dominant it is. Slop is low cardinality with one
// value dominating; deliberate design spreads across a purposeful few.
function dominant(counts) {
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  if (!total) return { top: 0, share: 0, n: 0 };
  const [value, count] = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
  return { top: +value, share: count / total, n: Object.keys(counts).length };
}

export function buildPageStats(nodes, byEl) {
  const radii = {}, spacing = {}, sizes = {}, bodyChars = {}, headChars = {}, hues = new Set();
  let totalChars = 0;

  for (const n of nodes) {
    if (n.maxRadius > 0 && n.maxRadius < 900) radii[n.maxRadius] = (radii[n.maxRadius] || 0) + 1;
    for (const v of [n.gap, n.padding[0], n.padding[3]]) if (v > 0) spacing[v] = (spacing[v] || 0) + 1;
    if (n.text.length > 2 && n.fontSize >= 9) sizes[n.fontSize] = (sizes[n.fontSize] || 0) + n.text.length;
    if (n.text.length && n.font) {
      bodyChars[n.font] = (bodyChars[n.font] || 0) + n.text.length;
      totalChars += n.text.length;
      // display slot is measured separately: a hero face can be a tiny share of
      // page characters and still be the thing you notice first.
      if (/^(H1|H2)$/.test(n.tag) || n.fontSize >= 28) {
        headChars[n.font] = (headChars[n.font] || 0) + n.text.length;
      }
    }
    for (const c of [n.bg, n.fg]) {
      if (c && c.a > 0.2) { const H = hsl(c); if (H.s > 0.15) hues.add(Math.round(H.h / 30)); }
    }
  }

  const sizeList = Object.keys(sizes).map(Number).sort((a, b) => a - b);
  const topFonts = Object.entries(bodyChars).sort((a, b) => b[1] - a[1]).slice(0, 4)
    .map(([name, c]) => ({ name, pct: totalChars ? Math.round(100 * c / totalChars) : 0, grp: fontGroup(name) }));
  const body = topFonts[0] || null;
  const display = (Object.entries(headChars).sort((a, b) => b[1] - a[1])[0] || [null])[0];
  const pairing = (fontGroup(display) === 'B' && body && body.grp === 'A' && display !== body.name)
    ? { display, body: body.name } : null;

  const iconSets = { lucide: 0, heroicons: 0, other: 0 };
  for (const svg of document.querySelectorAll('svg')) {
    const cls = (svg.getAttribute('class') || '').toLowerCase();
    if (/lucide/.test(cls)) iconSets.lucide++;
    else if (svg.getAttribute('data-slot') === 'icon' || svg.getAttribute('stroke-width') === '1.5') iconSets.heroicons++;
    else iconSets.other++;
  }

  return {
    byEl,
    radius: dominant(radii),
    spacing: dominant(spacing),
    typeSizes: sizeList.length,
    scaleRatio: sizeList.length > 1 ? +(sizeList[sizeList.length - 1] / sizeList[0]).toFixed(2) : 1,
    hueCount: hues.size,
    fonts: { top: topFonts, body, display, pairing, mono: topFonts.find(f => f.grp === 'mono' && f.pct >= 25) || null },
    iconSets,
  };
}
