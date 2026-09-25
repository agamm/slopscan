import { hsl, parseColor, relativeLuminance, spread, isMidGrey } from './color.js';
import { fontGroup } from './fonts.js';

// Most-common value and how dominant it is. Slop is low cardinality with one
// value dominating; deliberate design spreads across a purposeful few.
function dominant(counts) {
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  if (!total) return { top: 0, share: 0, n: 0 };
  const [value, count] = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
  return { top: +value, share: count / total, n: Object.keys(counts).length };
}

// First opaque background at or above a node, falling back to the page.
export function effectiveBg(n, page) {
  for (let el = n.el; el; el = el.parentElement) {
    const x = page.byEl.get(el);
    if (x && x.bg && x.bg.a >= 0.5) return x.bg;
    if (x && /gradient\(|url\(/.test(x.bgImage)) return null;   // unknown ground
  }
  return page.pageBg;
}

export const isLetterAvatar = n => {
  const { width: w, height: h } = n.rect;
  if (w < 28 || w > 96 || Math.abs(w - h) > 8 || n.maxRadius < w / 3) return false;
  if (!/^[A-Za-z]{1,3}$/.test(n.el.textContent.trim()) || n.el.querySelector('img')) return false;
  return /gradient\(/.test(n.bgImage) || (n.bg && n.bg.a > 0.3 && hsl(n.bg).s > 0.2);
};

// A small icon sitting in the top 40% of a card-sized box.
function hasTopIcon(n) {
  const { width: w, height: h, top } = n.rect;
  if (w < 150 || w > 600 || h < 100 || h > 700) return false;
  const icon = n.el.querySelector(':scope > svg, :scope > img, :scope > * > svg, :scope > * > img');
  if (!icon) return false;
  const r = icon.getBoundingClientRect();
  return r.width > 0 && r.width <= 80 && r.height <= 80 && r.top <= top + h * 0.4;
}

// 3+ same-width siblings each with a top icon. Outermost group only, so a
// card and its inner wrapper do not both count.
function iconCardGrid(nodes) {
  const groups = new Map();
  for (const n of nodes) {
    if (!n.el.parentElement || !hasTopIcon(n)) continue;
    const key = n.el.parentElement;
    const bucket = Math.round(n.rect.width / 20);
    const k = groups.get(key) || new Map();
    k.set(bucket, [...(k.get(bucket) || []), n.el]);
    groups.set(key, k);
  }
  const cards = new Set();
  for (const buckets of groups.values()) {
    for (const els of buckets.values()) if (els.length >= 3) els.forEach(e => cards.add(e));
  }
  for (const el of cards) {
    for (let a = el.parentElement; a; a = a.parentElement) if (cards.has(a)) { cards.delete(el); break; }
  }
  return cards;
}

export function buildPageStats(nodes, byEl, text = { hidden: 0, visible: 0, revealRoots: [] }) {
  const radii = {}, spacing = {}, sizes = {}, bodyChars = {}, headChars = {}, hues = new Set();
  let totalChars = 0;

  for (const n of nodes) {
    const circleish = n.maxRadius >= Math.min(n.rect.width, n.rect.height) * 0.4;
    if (n.maxRadius > 0 && n.maxRadius < 900 && !circleish) radii[n.maxRadius] = (radii[n.maxRadius] || 0) + 1;
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

  // page-level counters for the rules that only mean something in aggregate
  let hairlines = 0, surfaces = 0, steps = 0, statNums = 0, allcaps = 0;
  for (const n of nodes) {
    const hasSurface = (n.bg && n.bg.a > 0.05) || n.borders.some(b => b > 0);
    if (hasSurface && n.rect.width > 60 && n.rect.height > 24) {
      surfaces++;
      const even = n.borders.every(b => b > 0 && b <= 1.5);
      if (even && n.bg) hairlines++;
    }
    if (/^0?[1-9]$|^0[1-9]$/.test(n.text) && n.fontSize >= 16) steps++;
    if (n.fontSize >= 28 && /^[\d.,]+\s*[KMB%+x]{0,2}$/.test(n.text) && n.text.length <= 8) statNums++;
    if (n.textTransform === 'uppercase' && n.letterSpacing >= n.fontSize * 0.05
        && n.fontSize <= 15 && n.text.length >= 3 && n.text.length <= 34) allcaps++;
  }
  // collect() walks body's descendants, so body itself is never in `nodes`
  let pageBg = document.body ? parseColor(getComputedStyle(document.body).backgroundColor) : null;
  if (!pageBg || pageBg.a < 0.5) pageBg = parseColor(getComputedStyle(document.documentElement).backgroundColor);
  if (!pageBg || pageBg.a < 0.5) pageBg = { r: 255, g: 255, b: 255, a: 1 };
  const isDark = relativeLuminance(pageBg) < 0.2;

  let letterAvatars = 0, grayOnColor = 0;
  const partial = { byEl, pageBg };
  for (const n of nodes) {
    if (isLetterAvatar(n)) letterAvatars++;
    if (n.text.length >= 12 && isMidGrey(n.fg) && !n.el.closest('a,button,[role="button"]')) {
      const bg = effectiveBg(n, partial);
      if (bg && spread(bg) >= 40) grayOnColor++;
    }
  }
  const totalText = text.hidden + text.visible;
  const hiddenShare = totalText ? text.hidden / totalText : 0;
  const revealParents = new Set(
    text.hidden >= 150 && hiddenShare > 0.3 ? text.revealRoots.map(e => e.parentElement) : []);

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
    hairline: { count: hairlines, share: surfaces ? hairlines / surfaces : 0, surfaces },
    steps, statNums, allcaps, isDark, pageBg,
    iconCards: iconCardGrid(nodes), letterAvatars, grayOnColor,
    reveal: { share: hiddenShare, chars: text.hidden, parents: revealParents },
  };
}
