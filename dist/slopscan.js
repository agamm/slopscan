/* slopscan — deterministic AI-slop UI detector. 20 modules, built 2026-10-26. */
(() => {
'use strict';

// ---- src/lib/severity.js ---------------------------------------
// P0 screams AI on sight. P1 is the obvious smell. P2 is cosmetic.
const P0 = 0, P1 = 1, P2 = 2;
const SEV_COLOR = ['#ff2d55', '#ffb020', '#38bdf8'];
const SEV_NAME = ['P0', 'P1', 'P2'];
const SEV_DESC = ['screams AI on sight', 'the obvious smell', 'cosmetic'];

// ---- src/lib/color.js ------------------------------------------
// Computed styles serialise colour as rgb()/rgba(), space- or comma-separated
// depending on the browser, so parse both.
function parseColor(s) {
  if (!s || s === 'none' || s === 'transparent') return null;
  const m = String(s).match(/rgba?\(([^)]+)\)/);
  if (!m) return null;
  const p = m[1].split(/[\s,\/]+/).filter(Boolean).map(parseFloat);
  if (p.length < 3 || p.slice(0, 3).some(Number.isNaN)) return null;
  return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 };
}

function hsl(c) {
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

function relativeLuminance(c) {
  const ch = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
  return 0.2126 * ch(c.r) + 0.7152 * ch(c.g) + 0.0722 * ch(c.b);
}
function contrastRatio(a, b) {
  const l1 = relativeLuminance(a), l2 = relativeLuminance(b);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

const rgbKey = c => `${Math.round(c.r)},${Math.round(c.g)},${Math.round(c.b)}`;
const colorDist = (a, b) => Math.abs(a.r - b.r) + Math.abs(a.g - b.g) + Math.abs(a.b - b.b);
// max channel minus min channel: near 0 is grey, 40+ reads as a colour
const spread = c => Math.max(c.r, c.g, c.b) - Math.min(c.r, c.g, c.b);
const isMidGrey = c => c && c.a >= 0.5 && spread(c) < 20 && hsl(c).l > 0.3 && hsl(c).l < 0.75;
// warm off-white: light, R >= G >= B, a small but real warmth gap (Impeccable's isCreamColor)
const isCream = c => !!c && c.a >= 0.5 && Math.min(c.r, c.g, c.b) >= 209
  && c.r >= c.g && c.g >= c.b && c.r - c.b >= 6 && c.r - c.b <= 48;
const hex = c => '#' + [c.r, c.g, c.b].map(v => Math.round(v).toString(16).padStart(2, '0')).join('');
const isPurpleHue = c => { const H = hsl(c); return H.h >= 235 && H.h <= 300 && H.s > 0.3; };

// Tailwind's indigo/violet/purple ramps, byte-exact. A designer who ran a pass
// nudges something; an untouched default means nobody looked at it.
const TW_PURPLE = new Set([
  '99,102,241', '79,70,229', '67,56,202', '129,140,248', '165,180,252',
  '139,92,246', '124,58,237', '109,40,217', '167,139,250', '196,181,253',
  '168,85,247', '147,51,234', '126,34,206', '192,132,252', '216,180,254',
]);

// ---- src/lib/fonts.js ------------------------------------------
// The published catalogues disagree on single faces: Space Grotesk, Fraunces,
// Instrument Serif and Geist each sit on one tool's blocklist and another's
// allowlist. What survives that disagreement is the deployment, not the face.
//
//   A = what a model reaches for when it is not trying.
//   B = the template display faces it reaches for when it is.
//
// B-over-A is the fingerprint. Either group alone is weak evidence.
const FONT_A = [
  'inter', 'roboto', 'open sans', 'lato', 'poppins', 'montserrat', 'raleway',
  'nunito', 'nunito sans', 'work sans', 'dm sans', 'source sans', 'helvetica',
  'helvetica neue', 'arial', 'system-ui', '-apple-system', 'segoe ui', 'ubuntu',
  'pt sans', 'mulish', 'karla', 'rubik', 'quicksand', 'josefin sans', 'noto sans',
];

const FONT_B = [
  'space grotesk', 'instrument serif', 'instrument sans', 'fraunces',
  'bricolage grotesque', 'sora', 'syne', 'young serif', 'bodoni moda', 'bodoni',
  'clash display', 'clash grotesk', 'cal sans', 'satoshi', 'general sans',
  'switzer', 'cabinet grotesk', 'outfit', 'figtree', 'lexend', 'urbanist',
  'onest', 'plus jakarta sans', 'manrope', 'epilogue', 'be vietnam pro', 'geist',
  'inter tight', 'playfair display', 'cormorant garamond', 'cormorant', 'lora',
  'merriweather', 'dm serif display', 'dm serif text', 'newsreader', 'crimson pro',
  'libre baskerville', 'spectral', 'gloock', 'unbounded', 'chillax', 'ranade',
  'zodiak', 'supreme', 'sentient', 'boska', 'melodrama', 'gambetta', 'archivo',
  'chivo', 'red hat display', 'public sans', 'schibsted grotesk', 'hanken grotesk',
  'anton', 'bebas neue', 'big shoulders display', 'tomorrow', 'gilroy', 'author',
];

const FONT_MONO = [
  'jetbrains mono', 'fira code', 'ibm plex mono', 'space mono', 'geist mono',
  'roboto mono', 'source code pro', 'courier new', 'sf mono', 'ui-monospace',
  'menlo', 'monaco', 'consolas', 'cascadia code', 'iosevka', 'fragment mono',
  'martian mono',
];

// Allow real family variants ("Inter Variable", "Inter Tight") without
// swallowing unrelated names that merely share a prefix ("Interstate").
const VARIANT = /^(variable|var|tight|display|text|sans|serif|pro|neue|new|\d+)?$/;
const inList = (name, list) => list.some(f =>
  name === f || (name.startsWith(f) && VARIANT.test(name.slice(f.length).trim())));

function fontGroup(name) {
  if (!name) return null;
  if (inList(name, FONT_MONO)) return 'mono';
  if (inList(name, FONT_B)) return 'B';   // check B first: "inter tight" is B, not A
  if (inList(name, FONT_A)) return 'A';
  return null;
}

const familyOf = cs =>
  (cs.fontFamily || '').split(',')[0].trim().replace(/^['"]|['"]$/g, '').toLowerCase();

// ---- src/lib/page.js -------------------------------------------
// Most-common value and how dominant it is. Slop is low cardinality with one
// value dominating; deliberate design spreads across a purposeful few.
function dominant(counts) {
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  if (!total) return { top: 0, share: 0, n: 0 };
  const [value, count] = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
  return { top: +value, share: count / total, n: Object.keys(counts).length };
}

// First opaque background at or above a node, falling back to the page.
function effectiveBg(n, page) {
  for (let el = n.el; el; el = el.parentElement) {
    const x = page.byEl.get(el);
    if (x && x.bg && x.bg.a >= 0.5) return x.bg;
    if (x && /gradient\(|url\(/.test(x.bgImage)) return null;   // unknown ground
  }
  return page.pageBg;
}

const isLetterAvatar = n => {
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

function buildPageStats(nodes, byEl, text = { hidden: 0, visible: 0, revealRoots: [] }) {
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

// ---- src/lib/shadow.js -----------------------------------------
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
function shadowLayers(boxShadow) {
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
const TW_SHADOWS = new Map([
  ['0,1,2,0@0.05', 'shadow-sm'],
  ['0,1,3,0@0.1|0,1,2,-1@0.1', 'shadow'],
  ['0,4,6,-1@0.1|0,2,4,-2@0.1', 'shadow-md'],
  ['0,10,15,-3@0.1|0,4,6,-4@0.1', 'shadow-lg'],
  ['0,20,25,-5@0.1|0,8,10,-6@0.1', 'shadow-xl'],
  ['0,25,50,-12@0.25', 'shadow-2xl'],
]);

function shadowSignature(layers) {
  return layers.map(x => `${x.off.join(',')}@${x.col ? +x.col.a.toFixed(2) : 1}`).join('|');
}

// ---- src/rules/color.js ----------------------------------------
const colorRules = [
  {
    id: 'gradient-purple',
    label: 'purple gradient',
    severity: P0, weight: 12,
    why: 'The indigo-to-violet gradient is the single most recognisable AI design tell.',
    test(n) {
      if (!/gradient\(/.test(n.bgImage)) return null;
      const stops = (n.bgImage.match(/rgba?\([^)]+\)/g) || [])
        .map(parseColor).filter(Boolean).filter(isPurpleHue);
      return stops.length ? `${stops.length} indigo/violet stop(s)` : null;
    },
  },
  {
    id: 'gradient-text',
    label: 'gradient-clip headline',
    severity: P0, weight: 10,
    why: 'background-clip:text on a headline is decoration standing in for hierarchy.',
    test(n) {
      const clipped = /text/.test(n.bgClip) && /gradient\(/.test(n.bgImage);
      return clipped && (!n.fg || n.fg.a < 0.1) ? 'background-clip:text' : null;
    },
  },
  {
    id: 'tw-purple',
    label: 'untouched Tailwind purple',
    severity: P0, weight: 14,
    why: 'A byte-exact framework default means nobody made a colour decision.',
    test(n) {
      for (const [slot, c] of [['bg', n.bg], ['text', n.fg]]) {
        if (c && c.a > 0.5 && TW_PURPLE.has(rgbKey(c))) return `${slot} rgb(${rgbKey(c)}) = TW default`;
      }
      return null;
    },
  },
  {
    id: 'colored-glow',
    label: 'saturated glow',
    severity: P1, weight: 8,
    why: 'A coloured halo around a surface is atmosphere doing the work of structure.',
    test(n) {
      for (const layer of shadowLayers(n.boxShadow)) {
        if (layer.inset || !layer.col || layer.col.a < 0.15 || layer.off[2] < 8) continue;
        const H = hsl(layer.col);
        if (H.s > 0.35 && H.l > 0.2 && H.l < 0.85) return `hue ${Math.round(H.h)}deg glow`;
      }
      return null;
    },
  },
  {
    id: 'cream-bg',
    label: 'warm cream page background',
    severity: P2, weight: 3,
    why: 'The beige paper ground models now reach for once told to avoid purple-on-white.',
    test(n, page) {
      if (n.tag === 'H1' && isCream(page.pageBg)) return `page background ${hex(page.pageBg)}`;
      const wide = n.rect.width >= window.innerWidth * 0.8 && n.rect.height >= 200;
      return wide && isCream(n.bg) && !isCream(page.pageBg) ? `section background ${hex(n.bg)}` : null;
    },
  },
  {
    id: 'gray-on-color',
    label: 'grey text on a coloured panel',
    severity: P2, weight: 4,
    why: 'Neutral mid-grey copy on a tinted surface washes out. The text colour was never re-picked for the panel.',
    test(n, page) {
      if (page.grayOnColor < 3 || n.text.length < 12 || !isMidGrey(n.fg)) return null;
      if (n.el.closest('a,button,[role="button"]')) return null;
      const bg = effectiveBg(n, page);
      return bg && spread(bg) >= 40 ? `${hex(n.fg)} on ${hex(bg)}` : null;
    },
  },
];

// ---- src/rules/surface.js --------------------------------------
const surfaceRules = [
  {
    id: 'glassmorphism',
    label: 'glassmorphism',
    severity: P0, weight: 10,
    why: 'Reflexive backdrop-blur on a translucent panel is a default, not a choice.',
    test(n) {
      const glassy = /blur\(/.test(n.backdrop) && n.bg && n.bg.a > 0 && n.bg.a < 0.92;
      return glassy && n.rect.width > 60 ? n.backdrop.slice(0, 30) : null;
    },
  },
  {
    id: 'tw-shadow',
    label: 'default Tailwind shadow',
    severity: P1, weight: 8,
    why: 'shadow-lg on every card is the elevation equivalent of never opening the file.',
    test(n) {
      const layers = shadowLayers(n.boxShadow).filter(l => !l.inset);
      if (!layers.length) return null;
      return TW_SHADOWS.get(shadowSignature(layers)) || null;
    },
  },
  {
    id: 'oversized-shadow',
    label: 'shadow bigger than element',
    severity: P1, weight: 7,
    why: 'A blur radius larger than the element is glow pretending to be depth.',
    test(n) {
      const layers = shadowLayers(n.boxShadow).filter(l => !l.inset);
      if (!layers.length || n.rect.height < 24) return null;
      const blur = Math.max(...layers.map(l => l.off[2]));
      return blur > n.rect.height ? `blur ${blur}px > height ${Math.round(n.rect.height)}px` : null;
    },
  },
  {
    id: 'accent-stripe',
    label: 'accent stripe callout',
    severity: P1, weight: 8,
    why: 'A thick saturated left rule on a tinted panel is the stock callout/FAQ treatment.',
    test(n) {
      if (n.rect.height < 24 || n.rect.width < 80) return null;
      const [top, right, bottom, left] = n.borders;
      // asymmetric weight is the tell: a real box has four comparable edges
      if (left >= 3 && Math.max(top, right, bottom) <= left * 0.5) {
        const c = parseColor(n.cs.borderLeftColor);
        if (c && c.a > 0.3 && (hsl(c).s > 0.2 || left >= 4)) {
          return `${Math.round(left)}px left border, hue ${Math.round(hsl(c).h)}`;
        }
      }
      // top-edge variant, only on a rounded card: a full-width top rule is a normal header bar
      if (top >= 3 && Math.max(left, right, bottom) <= top * 0.5 && n.maxRadius >= 4
          && n.rect.width < window.innerWidth * 0.9) {
        const c = parseColor(n.cs.borderTopColor);
        if (c && c.a > 0.3 && hsl(c).s > 0.2) return `${Math.round(top)}px top border, hue ${Math.round(hsl(c).h)}`;
      }
      // the same device built with an inset shadow instead of a border
      for (const layer of shadowLayers(n.boxShadow)) {
        if (!layer.inset || !layer.col || layer.col.a < 0.3) continue;
        const [ox, oy, blur] = layer.off;
        if (ox >= 3 && Math.abs(oy) <= 1 && blur <= 1 && (hsl(layer.col).s > 0.2 || ox >= 4)) {
          return `${ox}px inset stripe, hue ${Math.round(hsl(layer.col).h)}`;
        }
      }
      return null;
    },
  },
  {
    id: 'thin-border-wide-shadow',
    label: 'hairline border plus wide shadow',
    severity: P2, weight: 4,
    why: 'A 1px border and a soft 16px+ shadow on the same box: two elevation systems where one would do.',
    test(n) {
      const cols = [n.cs.borderTopColor, n.cs.borderRightColor, n.cs.borderBottomColor, n.cs.borderLeftColor];
      const thin = n.borders.filter((b, i) => {
        const c = parseColor(cols[i]);
        return b > 0 && b <= 1.5 && c && c.a >= 0.28;
      }).length;
      if (thin < 2 || n.rect.height < 24) return null;
      const layers = shadowLayers(n.boxShadow).filter(l => !l.inset && (!l.col || l.col.a >= 0.12));
      const blur = Math.max(0, ...layers.map(l => l.off[2]));
      return blur >= 16 ? `1px border + ${blur}px shadow blur` : null;
    },
  },
  {
    id: 'radius-monoculture',
    label: 'one radius everywhere',
    severity: P1, weight: 11,
    why: 'A single radius on every surface means the token was applied, not chosen.',
    test(n, page) {
      const r = page.radius;
      if (r.share < 0.7 || r.top < 10 || r.n > 4) return null;
      return n.maxRadius === r.top ? `${r.top}px on ${Math.round(r.share * 100)}% of surfaces` : null;
    },
  },
  {
    id: 'uniform-spacing',
    label: 'one spacing value everywhere',
    severity: P2, weight: 8,
    why: 'Space set by token rather than by relationship flattens every grouping.',
    test(n, page) {
      const s = page.spacing;
      if (s.share < 0.62 || s.n > 6) return null;
      const hit = n.gap === s.top || n.padding[0] === s.top;
      return hit ? `${s.top}px on ${Math.round(s.share * 100)}% of spacing` : null;
    },
  },
  {
    id: 'corner-nesting',
    label: 'corners do not nest',
    severity: P2, weight: 5,
    why: 'A nested surface should use outer radius minus padding, or the corners read wrong.',
    test(n, page) {
      const parent = n.el.parentElement && page.byEl.get(n.el.parentElement);
      if (!parent) return null;
      const outer = parent.maxRadius, inner = n.maxRadius;
      const padL = parent.padding[3], padR = parent.padding[1];
      if (outer < 8 || inner < 2 || padL < 4) return null;
      // must actually be a nested surface: a left-aligned icon tile is not one
      const contentW = parent.rect.width - padL - padR;
      if (contentW < 40 || n.rect.width < contentW - 8) return null;
      if (Math.abs(n.rect.left - (parent.rect.left + padL)) > 3) return null;
      const expected = Math.max(0, outer - padL);
      return Math.abs(inner - expected) > 3 ? `inner ${inner}px, expected ~${expected}px` : null;
    },
  },
];

// ---- src/rules/type.js -----------------------------------------
const isDisplay = (n, min = 24) => /^(H1|H2|H3)$/.test(n.tag) || n.fontSize >= min;

const typeRules = [
  {
    id: 'font-pairing',
    label: 'template display over default body',
    severity: P0, weight: 12,
    why: 'A template display face over an on-distribution body face is the canonical AI landing page. The pairing is far stronger evidence than either face alone.',
    test(n, page) {
      const p = page.fonts.pairing;
      if (!p) return null;
      if (!/^(H1|H2)$/.test(n.tag) && n.fontSize < 28) return null;
      return n.font === p.display ? `${p.display} over ${p.body}` : null;
    },
  },
  {
    id: 'font-template',
    label: 'template display face',
    severity: P1, weight: 7,
    why: 'Space Grotesk, Instrument Serif and friends are what a model picks when it is trying to look designed.',
    test(n, page) {
      if (page.fonts.pairing || fontGroup(page.fonts.display) !== 'B') return null;
      if (!isDisplay(n)) return null;
      return n.font === page.fonts.display ? `${page.fonts.display} as the display face` : null;
    },
  },
  {
    id: 'font-default',
    label: 'on-distribution default face',
    severity: P2, weight: 4,
    why: 'Inter carrying the whole page is weak evidence on its own; plenty of good sites do it.',
    test(n, page) {
      const body = page.fonts.body;
      if (!body || body.grp !== 'A' || body.pct < 60) return null;
      if (!isDisplay(n)) return null;
      return n.font === body.name ? `${body.name} @ ${body.pct}% of page text` : null;
    },
  },
  {
    id: 'mono-body',
    label: 'mono as body text',
    severity: P1, weight: 6,
    why: 'The tasteful-terminal look: monospace outside code, used as atmosphere.',
    test(n, page) {
      const mono = page.fonts.mono;
      if (!mono || n.font !== mono.name || n.text.length < 12) return null;
      if (n.el.closest('pre,code,kbd,samp')) return null;
      return `${mono.name} @ ${mono.pct}% of text`;
    },
  },
  {
    id: 'crushed-tracking',
    label: 'crushed display tracking',
    severity: P2, weight: 4,
    why: 'Headline letter-spacing past -0.05em: tight-is-premium applied until the letters collide.',
    test(n) {
      if (n.fontSize < 28 || n.text.length < 3 || n.text.length > 80) return null;
      const em = n.letterSpacing / n.fontSize;
      return em <= -0.05 ? `${em.toFixed(3)}em at ${n.fontSize}px` : null;
    },
  },
  {
    id: 'flat-hierarchy',
    label: 'flat type scale',
    severity: P2, weight: 6,
    why: 'Few sizes with small steps means hierarchy was never designed.',
    test(n, page) {
      if (n.tag !== 'H1') return null;
      return (page.scaleRatio < 2.2 && page.typeSizes <= 5)
        ? `max/min size ratio ${page.scaleRatio}` : null;
    },
  },
];

// ---- src/rules/layout.js ---------------------------------------
const layoutRules = [
  {
    id: 'hero-keyword',
    label: 'recoloured keyword in headline',
    severity: P1, weight: 8,
    why: 'Recolouring two words of the headline is emphasis applied by template.',
    test(n) {
      if (!/^(H1|H2)$/.test(n.tag) || !n.fg || n.fg.a < 0.1) return null;
      if (n.rect.top + window.scrollY > 1200) return null;
      for (const child of n.el.querySelectorAll('span,em,b,strong,i,mark,a')) {
        const text = child.textContent.trim();
        if (text.length < 2) continue;
        const cs = getComputedStyle(child);
        const c = parseColor(cs.color);
        if (c && c.a > 0.1 && colorDist(c, n.fg) > 90) return `"${text.slice(0, 26)}" recoloured`;
        const f = familyOf(cs);
        if (f && f !== n.font) return `"${text.slice(0, 26)}" other face`;
      }
      return null;
    },
  },
  {
    id: 'eyebrow-pill',
    label: 'pill badge above headline',
    severity: P1, weight: 7,
    why: 'The little capsule above the hero headline that restates the headline.',
    test(n) {
      if (n.rect.top + window.scrollY > 900) return null;
      if (n.rect.height > 44 || n.rect.height < 14) return null;
      if (n.maxRadius < n.rect.height * 0.45) return null;
      const text = n.el.textContent.trim();
      if (!text || text.length > 44) return null;
      const hasSurface = (n.bg && n.bg.a > 0.05) || n.borders[0] > 0;
      if (!hasSurface || n.el.querySelector('h1,h2') || n.el.closest('nav,header,[role="navigation"]')) return null;
      // it has to sit on the headline, or it is just a rounded nav button
      const h = document.querySelector('h1') || document.querySelector('h2');
      if (!h) return null;
      const hr = h.getBoundingClientRect(), gap = hr.top - n.rect.bottom;
      const overlaps = n.rect.left < hr.right && n.rect.right > hr.left;
      return gap >= 0 && gap <= 120 && overlaps ? `"${text.slice(0, 28)}"` : null;
    },
  },
  {
    id: 'icon-card-grid',
    label: 'identical icon-topped feature cards',
    severity: P2, weight: 4,
    why: 'Three-plus same-width cards, each an icon over a heading over a line of copy: the feature grid by default.',
    test(n, page) {
      return page.iconCards.has(n.el) ? `${page.iconCards.size} icon-topped cards` : null;
    },
  },
  {
    id: 'centered-hero',
    label: 'centered hero',
    severity: P2, weight: 5,
    why: 'Centred hero plus three cards is the default macrostructure. Weak alone.',
    test(n) {
      const centred = n.tag === 'H1' && n.textAlign === 'center' && n.fontSize >= 28;
      return centred && n.rect.top + window.scrollY < 1000 ? `centered h1, ${n.fontSize}px` : null;
    },
  },
];

// ---- src/lib/icons.js ------------------------------------------
// Names verified against lucide-static v0.400 + v1.40 and heroicons v2.2.
const AI_ICON_RE = /(sparkle|wand|brain|robot|magic|auto-awesome|smart-toy|shining|\bbot\b|-bot\b)/;
const HYPE_ICON_RE = /lucide-(zap|rocket|stars|cpu|flame|trending-up|lightbulb)/;

// The sparkles glyph, for inline SVGs pasted without a class. Lucide changed
// its path between v0 and v1, so both generations are listed, plus heroicons
// outline and solid. Fragments are taken from the real sources, not recalled.
const AI_PATHS = [
  '9.937 15.5',    // lucide v0.x sparkles
  '11.017 2.814',  // lucide v1.x sparkles
  '9.813 15.904',  // heroicons 24 outline sparkles
  '9 4.5a.75',     // heroicons 24 solid sparkles
  '.721.544',      // heroicons 24 solid sparkles (alt segment)
];

const svgInfo = svg => ({
  cls: [svg.getAttribute('class'), svg.getAttribute('data-lucide'),
        svg.getAttribute('data-icon'), svg.getAttribute('aria-label')]
        .filter(Boolean).join(' ').toLowerCase(),
  paths: Array.from(svg.querySelectorAll('path')).map(p => p.getAttribute('d') || '').join(' '),
});

// Emoji by presentation, not by code range: arrows, ticks and stars are text glyphs.
const EMOJI_RE = /\p{Emoji_Presentation}|\p{Extended_Pictographic}\uFE0F/u;

// ---- src/rules/iconography.js ----------------------------------
// :scope > svg so only the immediate wrapper fires, not every ancestor.
const ownSvg = n => n.el.querySelector(':scope > svg');

const iconRules = [
  {
    id: 'ai-icon',
    label: 'AI-tell icon',
    severity: P0, weight: 12,
    why: 'Sparkles, wand, brain and bot are the icons that announce "an AI made this".',
    test(n) {
      const svg = ownSvg(n);
      if (!svg) return null;
      const { cls, paths } = svgInfo(svg);
      const named = cls.match(AI_ICON_RE);
      if (named) return `icon "${named[1].replace(/\\b/g, '')}"`;
      return AI_PATHS.some(p => paths.includes(p)) ? 'sparkles glyph' : null;
    },
  },
  {
    id: 'hype-icon',
    label: 'hype icon',
    severity: P1, weight: 5,
    why: 'Zap, rocket and flame as feature bullets: velocity as decoration.',
    test(n) {
      const svg = ownSvg(n);
      if (!svg) return null;
      const m = svgInfo(svg).cls.match(HYPE_ICON_RE);
      return m ? m[1] : null;
    },
  },
  {
    id: 'icon-tile',
    label: 'icon in a tinted tile',
    severity: P1, weight: 7,
    why: 'The rounded square of a tint of the icon colour, once per feature card.',
    test(n) {
      const { width: w, height: h } = n.rect;
      if (w < 22 || w > 88 || h < 22 || h > 88) return null;
      if (Math.abs(w - h) > Math.max(w, h) * 0.25) return null;      // must be square-ish
      if (n.maxRadius < 6 || !n.bg || n.bg.a < 0.08) return null;
      const H = hsl(n.bg);
      if (H.s < 0.12) return null;                                    // must be tinted, not grey
      const hasGlyph = n.el.querySelector('svg') || EMOJI_RE.test(n.text);
      return hasGlyph ? `${Math.round(w)}px tile, hue ${Math.round(H.h)}` : null;
    },
  },
  {
    id: 'letter-avatar',
    label: 'initial-letter avatars',
    severity: P1, weight: 5,
    why: 'Coloured circles with initials in place of real faces: testimonials with nobody behind them.',
    test(n, page) {
      if (page.letterAvatars < 2 || !isLetterAvatar(n)) return null;
      return `"${n.el.textContent.trim()}" in a ${Math.round(n.rect.width)}px circle`;
    },
  },
  {
    id: 'emoji-ui',
    label: 'emoji in UI chrome',
    severity: P1, weight: 6,
    why: 'Emoji in navigation, buttons or headings, standing in for an icon set.',
    test(n) {
      if (!/^(BUTTON|A|LI|H1|H2|H3|SPAN)$/.test(n.tag)) return null;
      return EMOJI_RE.test(n.text) ? n.text.slice(0, 22) : null;
    },
  },
];

// ---- src/rules/effects.js --------------------------------------
// every tile of a repeating background is at most this big: a pattern, not a fill
const smallTiles = size => {
  const px = (size.match(/[\d.]+px/g) || []).map(parseFloat);
  return px.length > 0 && px.every(v => v >= 6 && v <= 160);
};

const effectRules = [
  {
    id: 'blur-orb',
    label: 'blurred gradient orb',
    severity: P0, weight: 9,
    why: 'The big soft colour blob floating behind the hero. Decoration with no content.',
    test(n) {
      const { width: w, height: h } = n.rect;
      if (w < 120 || h < 120) return null;
      if (n.maxRadius < Math.min(w, h) * 0.4) return null;        // must read as a circle
      const m = /blur\((\d+(?:\.\d+)?)px\)/.exec(n.filter);
      if (!m || parseFloat(m[1]) < 14) return null;
      const tinted = /gradient\(/.test(n.bgImage) || (n.bg && n.bg.a > 0.1 && hsl(n.bg).s > 0.2);
      return tinted ? `${Math.round(w)}px orb, blur ${m[1]}px` : null;
    },
  },
  {
    id: 'pulsing-dot',
    label: 'pulsing status dot',
    severity: P1, weight: 5,
    why: 'A tiny dot on an infinite pulse, usually beside "Live" or "Now in beta". Status as decoration.',
    test(n) {
      const { width: w, height: h } = n.rect;
      if (w < 4 || w > 16 || Math.abs(w - h) > 2 || n.maxRadius < w * 0.4) return null;
      if (n.animation !== 'infinite') return null;
      return n.bg && n.bg.a > 0.3 ? `${Math.round(w)}px dot, infinite animation` : null;
    },
  },
  {
    id: 'grid-background',
    label: 'grid or dot-grid backdrop',
    severity: P1, weight: 6,
    why: 'Faint graph-paper lines or a dot matrix behind the hero: texture that says "technical" without content.',
    test(n) {
      if (n.rect.width < 200 || n.rect.height < 150 || !smallTiles(n.bgSize)) return null;
      const lines = (n.bgImage.match(/linear-gradient\(/g) || []).length;
      if (lines >= 2) return `${lines} line gradients, tile ${n.bgSize.split(',')[0]}`;
      return /radial-gradient\(/.test(n.bgImage) ? `dot grid, tile ${n.bgSize.split(',')[0]}` : null;
    },
  },
  {
    id: 'radial-glow',
    label: 'radial spotlight glow',
    severity: P1, weight: 6,
    why: 'A faint coloured radial fade behind a section: the CSS cousin of the blurred orb.',
    test(n) {
      if (n.rect.width < 240 || n.rect.height < 160 || smallTiles(n.bgSize)) return null;
      if (!/radial-gradient\(/.test(n.bgImage)) return null;
      const stops = (n.bgImage.match(/rgba?\([^)]+\)/g) || []).map(parseColor).filter(Boolean);
      const colored = stops.filter(c => c.a > 0.02);
      if (!colored.length || colored.length > 2 || colored.some(c => c.a >= 0.45)) return null;
      const tint = colored.find(c => spread(c) >= 24);
      return tint ? `hue ${Math.round(hsl(tint).h)}deg at alpha ${tint.a}` : null;
    },
  },
  {
    id: 'scroll-reveal',
    label: 'content hidden until scroll',
    severity: P2, weight: 5,
    why: 'Sections parked at opacity 0 for a fade-in. Motion by default, and blank to anything that does not scroll.',
    test(n, page) {
      return page.reveal.parents.has(n.el)
        ? `${Math.round(page.reveal.share * 100)}% of page text invisible at rest` : null;
    },
  },
  {
    id: 'perma-dark',
    label: 'dark mode with muted text',
    severity: P1, weight: 7,
    why: 'Unrequested dark mode where the body text never reaches full contrast.',
    test(n, page) {
      if (!page.isDark) return null;
      if (n.tag !== 'P' && !/^H[1-3]$/.test(n.tag)) return null;
      if (n.text.length < 20 || !n.fg || n.fg.a < 0.3) return null;
      const cr = contrastRatio(n.fg, page.pageBg);
      return cr < 7 ? `contrast ${cr.toFixed(1)}:1 on a dark ground` : null;
    },
  },
  {
    id: 'springy-easing',
    label: 'springy overshoot easing',
    severity: P1, weight: 5,
    why: 'A bouncing cubic-bezier on ordinary UI transitions: motion as personality.',
    test(n) {
      const m = /cubic-bezier\(\s*([-\d.]+)\s*,\s*([-\d.]+)\s*,\s*([-\d.]+)\s*,\s*([-\d.]+)\s*\)/.exec(n.easing);
      if (!m) return null;
      const y1 = parseFloat(m[2]), y2 = parseFloat(m[4]);
      // y outside [0,1] means the value overshoots and springs back
      return (y1 > 1.05 || y2 > 1.05 || y1 < -0.05 || y2 < -0.05)
        ? `cubic-bezier overshoot (${y1}, ${y2})` : null;
    },
  },
  {
    id: 'hairline-everywhere',
    label: '1px grey border on every card',
    severity: P2, weight: 6,
    why: 'The same neutral hairline on every surface: boxing applied by default.',
    test(n, page) {
      if (page.hairline.share < 0.55 || page.hairline.count < 6) return null;
      const even = n.borders.every(b => b > 0 && b <= 1.5);
      if (!even || !n.bg || n.rect.width < 60 || n.rect.height < 24) return null;
      return `hairline on ${Math.round(page.hairline.share * 100)}% of ${page.hairline.surfaces} surfaces`;
    },
  },
  {
    id: 'nested-cards',
    label: 'card inside a card',
    severity: P2, weight: 5,
    why: 'A surface inside a surface, both elevated. One region should own one surface.',
    test(n, page) {
      const isCard = x => x.bg && x.bg.a > 0.2 && x.maxRadius >= 8 && x.boxShadow !== 'none';
      if (!isCard(n)) return null;
      const parent = n.el.parentElement && page.byEl.get(n.el.parentElement);
      return parent && isCard(parent) ? 'elevated surface inside an elevated surface' : null;
    },
  },
  {
    id: 'numbered-steps',
    label: '01 / 02 / 03 step markers',
    severity: P1, weight: 6,
    why: 'Numbering a sequence that is not actually sequential.',
    test(n, page) {
      if (page.steps < 3) return null;
      return (/^0?[1-9]$|^0[1-9]$/.test(n.text) && n.fontSize >= 16)
        ? `${page.steps} numbered markers on the page` : null;
    },
  },
  {
    id: 'stat-banner',
    label: 'stat banner',
    severity: P1, weight: 6,
    why: 'A row of big round numbers, usually invented, standing in for evidence.',
    test(n, page) {
      if (page.statNums < 3) return null;
      const big = n.fontSize >= 28 && /^[\d.,]+\s*[KMB%+x]{0,2}$/.test(n.text) && n.text.length <= 8;
      return big ? `${page.statNums} oversized metrics on the page` : null;
    },
  },
  {
    id: 'allcaps-label',
    label: 'all-caps tracked label',
    severity: P2, weight: 4,
    why: 'Uppercase plus letter-spacing on every section label, as a substitute for hierarchy.',
    test(n, page) {
      if (page.allcaps < 3) return null;
      const hit = n.textTransform === 'uppercase' && n.letterSpacing >= n.fontSize * 0.05
        && n.fontSize <= 15 && n.text.length >= 3 && n.text.length <= 34;
      return hit ? `${page.allcaps} tracked all-caps labels` : null;
    },
  },
];

// ---- src/rules/index.js ----------------------------------------
// Weights are a first guess, not a fitted model. They need a labelled corpus
// before the total means anything; read the per-rule list, not the number.
const RULES = [
  ...colorRules, ...surfaceRules, ...typeRules, ...layoutRules, ...iconRules, ...effectRules,
];

// ---- src/lib/collect.js ----------------------------------------
const MAX_ELEMENTS = 8000;
const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'BR', 'TEMPLATE']);

const PARKED_UI = 'nav,header,dialog,[aria-hidden="true"],[role="navigation"],[role="menu"],[role="dialog"],'
  + '[role="tooltip"],[role="tabpanel"],[role="listbox"],[aria-roledescription="slide"]';

const directText = el =>
  Array.from(el.childNodes).filter(n => n.nodeType === 3).map(n => n.textContent).join('').trim();

// One getComputedStyle pass per element. Everything a rule can ask for is read
// here once, because re-reading computed styles inside every rule is the only
// part of this that gets slow.
function collectNodes() {
  const nodes = [], byEl = new Map();
  const hidden = new Set();
  const revealRoots = [];
  let hiddenChars = 0, visibleChars = 0;
  const all = document.body ? document.body.querySelectorAll('*') : [];
  for (const el of Array.from(all).slice(0, MAX_ELEMENTS)) {
    if (SKIP_TAGS.has(el.tagName)) continue;
    if (el.closest('svg')) continue;               // shapes have no useful box styles
    const cs = getComputedStyle(el);
    if (cs.display === 'none') continue;
    const rect = el.getBoundingClientRect();
    if (rect.width < 2 || rect.height < 2) continue;
    // opacity does not inherit, so a reveal wrapper's children read as visible
    const selfHidden = cs.visibility === 'hidden' || parseFloat(cs.opacity) < 0.05;
    if (selfHidden || hidden.has(el.parentElement)) {
      hidden.add(el);
      // closed menus, dialogs, tabs and slides are hidden by design, not waiting on a scroll
      if (!el.closest(PARKED_UI)) {
        if (!hidden.has(el.parentElement) && el.textContent.trim()) revealRoots.push(el);
        hiddenChars += directText(el).length;
      }
    } else visibleChars += directText(el).length;
    if (selfHidden) continue;

    const node = {
      el, rect, cs,
      tag: el.tagName,
      bg: parseColor(cs.backgroundColor),
      fg: parseColor(cs.color),
      bgImage: cs.backgroundImage,
      boxShadow: cs.boxShadow,
      // border-radius can be a percentage; resolve it against the box or a
      // circle reads as a 50px radius instead of half its width
      radii: [cs.borderTopLeftRadius, cs.borderTopRightRadius,
              cs.borderBottomRightRadius, cs.borderBottomLeftRadius]
             .map(v => String(v).includes('%')
               ? Math.round((parseFloat(v) || 0) / 100 * Math.min(rect.width, rect.height))
               : Math.round(parseFloat(v) || 0)),
      borders: [cs.borderTopWidth, cs.borderRightWidth,
                cs.borderBottomWidth, cs.borderLeftWidth].map(v => parseFloat(v) || 0),
      padding: [cs.paddingTop, cs.paddingRight, cs.paddingBottom, cs.paddingLeft]
               .map(v => Math.round(parseFloat(v) || 0)),
      gap: Math.round(parseFloat(cs.gap) || 0),
      font: familyOf(cs),
      fontSize: Math.round(parseFloat(cs.fontSize) || 0),
      backdrop: cs.backdropFilter || cs.webkitBackdropFilter || 'none',
      bgClip: cs.backgroundClip || cs.webkitBackgroundClip || '',
      textAlign: cs.textAlign,
      textTransform: cs.textTransform,
      letterSpacing: parseFloat(cs.letterSpacing) || 0,
      filter: cs.filter || 'none',
      easing: cs.transitionTimingFunction || '',
      animation: cs.animationName && cs.animationName !== 'none' ? cs.animationIterationCount : '',
      bgSize: cs.backgroundSize || '',
      italic: cs.fontStyle === 'italic',
      text: directText(el),
    };
    node.maxRadius = Math.max(...node.radii);
    nodes.push(node);
    byEl.set(el, node);
  }
  return { nodes, byEl, text: { hidden: hiddenChars, visible: visibleChars, revealRoots } };
}

// ---- src/ui/style.js -------------------------------------------
function overlayCSS(NS) {
  return `
@keyframes ss-focus{from{opacity:0;transform:scale(1.015)}to{opacity:1;transform:none}}
@keyframes ss-lock{0%{opacity:0;inset:-16px}40%{opacity:1;inset:-4px}100%{opacity:0;inset:-1px}}
@property --ss-a{syntax:'<angle>';inherits:false;initial-value:0deg}
@keyframes ss-orbit{to{--ss-a:360deg}}
@keyframes ss-fade{from{opacity:0}to{opacity:1}}
@keyframes ss-popin{from{opacity:0;transform:translateY(-4px) scale(.98)}to{opacity:1;transform:none}}
@keyframes ss-tagin{from{opacity:0;transform:translateX(-5px) scale(.96)}to{opacity:1;transform:none}}
@keyframes ss-sweep{from{transform:translateY(-132px)}to{transform:translateY(100vh)}}
@keyframes ss-hud{from{opacity:0;transform:translateY(16px) scale(.985)}to{opacity:1;transform:none}}
@keyframes ss-rowin{from{opacity:0;transform:translateX(-7px)}to{opacity:1;transform:none}}
.ss-box{position:absolute;pointer-events:none;box-sizing:border-box;border-radius:3px;
  animation:ss-focus .4s cubic-bezier(.16,.84,.32,1) calc(var(--d) + .12s) both;
  background-image:repeating-linear-gradient(90deg,var(--c) 0 6px,transparent 6px 10px),
                   repeating-linear-gradient(90deg,var(--c) 0 6px,transparent 6px 10px),
                   repeating-linear-gradient(0deg,var(--c) 0 6px,transparent 6px 10px),
                   repeating-linear-gradient(0deg,var(--c) 0 6px,transparent 6px 10px);
  background-size:100% 1.5px,100% 1.5px,1.5px 100%,1.5px 100%;background-repeat:no-repeat;
  background-position:0 0,0 100%,0 0,100% 0}
.ss-box.tint{background-color:color-mix(in srgb,var(--c) 6%,transparent)}
/* Motion is reserved for P0: one light orbiting the outline. Everything else
   settles still so the page stops twitching once the scan is done. */
.ss-box.p0::after{content:'';position:absolute;inset:-1px;border-radius:4px;padding:2px;pointer-events:none;
  background:conic-gradient(from var(--ss-a),transparent 0 70%,var(--c) 90%,#fff 94%,transparent 97%);
  -webkit-mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);
  -webkit-mask-composite:xor;mask-composite:exclude;
  animation:ss-orbit 3.2s linear calc(var(--d) * -4) infinite,ss-fade .6s ease calc(var(--d) + .5s) both}
/* corner brackets close in on the element, then fade: the scanner locking on */
.ss-box::before{content:'';position:absolute;inset:-1px;pointer-events:none;opacity:0;
  --b:linear-gradient(var(--c),var(--c));background-repeat:no-repeat;
  background:var(--b) 0 0/12px 2px,var(--b) 0 0/2px 12px,var(--b) 100% 0/12px 2px,
    var(--b) 100% 0/2px 12px,var(--b) 0 100%/12px 2px,var(--b) 0 100%/2px 12px,
    var(--b) 100% 100%/12px 2px,var(--b) 100% 100%/2px 12px;background-repeat:no-repeat;
  animation:ss-lock .6s cubic-bezier(.16,.84,.32,1) var(--d) both}
.ss-tag{position:absolute;pointer-events:auto;cursor:pointer;
  font:600 10px/1.5 ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.02em;
  color:#08080c;background:var(--c);padding:1px 6px;border-radius:3px;white-space:nowrap;
  max-width:210px;overflow:hidden;text-overflow:ellipsis;box-shadow:0 2px 8px rgba(0,0,0,.35);
  animation:ss-tagin .34s cubic-bezier(.16,.84,.32,1) calc(var(--d) + .14s) both}
.ss-tag:hover{filter:brightness(1.15);z-index:9}
.ss-pop{position:absolute;z-index:10;pointer-events:auto;width:300px;box-sizing:border-box;
  background:rgba(12,12,18,.97);color:#e8e8ef;border:1px solid rgba(255,255,255,.12);border-radius:9px;
  padding:11px 13px 10px;box-shadow:0 14px 40px rgba(0,0,0,.5);text-align:left;
  font:12px/1.55 ui-monospace,SFMono-Regular,Menlo,monospace;text-transform:none;letter-spacing:normal;
  animation:ss-popin .16s cubic-bezier(.16,.84,.32,1) both}
.ss-pop-head{display:flex;gap:8px;align-items:center;margin-bottom:7px}
.ss-pop-sev{background:var(--c);color:#08080c;font-weight:700;font-size:10px;padding:0 6px;border-radius:3px}
.ss-pop-desc{color:#8b8b9b;font-size:11px}
.ss-pop-title{font-size:14px;font-weight:700;color:#fff;margin-bottom:4px}
.ss-pop-why{margin:0 0 9px;color:#c4c4d0;font:13px/1.5 system-ui,-apple-system,sans-serif}
.ss-pop-found{display:flex;gap:8px;padding:6px 8px;margin-bottom:9px;border-radius:5px;
  background:rgba(255,255,255,.05);overflow-wrap:anywhere}
.ss-pop-found span:first-child{color:var(--c);flex:none}
.ss-pop-foot{display:flex;justify-content:space-between;align-items:center;gap:8px;color:#6e6e7e;font-size:10.5px}
.ss-pop-foot code{font:inherit;color:inherit;background:none;padding:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.ss-pop button{all:unset;cursor:pointer;flex:none;color:#8b8b9b;font:11px ui-monospace,Menlo,monospace;
  padding:2px 7px;border:1px solid rgba(255,255,255,.14);border-radius:5px}
.ss-pop button:hover{color:#fff;border-color:rgba(255,255,255,.35)}
#${NS}sweep{position:fixed;left:0;right:0;top:0;height:132px;z-index:2147483646;pointer-events:none;
  background:linear-gradient(to bottom,transparent 0,rgba(56,189,248,.08) 40%,
             rgba(56,189,248,.26) 82%,rgba(125,211,252,.55) 96%,transparent 100%);
  animation:ss-sweep .82s cubic-bezier(.33,.02,.28,1) both}
#${NS}sweep::after{content:'';position:absolute;left:0;right:0;bottom:0;height:2px;background:#e0f2fe;
  box-shadow:0 0 6px 1px #7dd3fc,0 0 28px 8px rgba(56,189,248,.6)}
#${NS}hud{position:fixed;right:16px;bottom:16px;z-index:2147483647;width:308px;max-height:78vh;
  overflow:auto;background:rgba(9,9,14,.94);backdrop-filter:blur(14px);color:#e8e8ef;
  border:1px solid rgba(255,255,255,.1);border-radius:10px;padding:13px 14px;
  font:12px/1.55 ui-monospace,SFMono-Regular,Menlo,monospace;
  box-shadow:0 18px 50px rgba(0,0,0,.55);animation:ss-hud .46s .48s cubic-bezier(.16,.84,.32,1) both}
#${NS}hud h4{margin:0 0 9px;font-size:11px;letter-spacing:.09em;text-transform:uppercase;
  color:#8b8b9b;font-weight:600}
#${NS}hud .sc{font:700 30px/1 ui-monospace,Menlo,monospace;letter-spacing:-.02em;
  font-variant-numeric:tabular-nums}
#${NS}hud .row{display:flex;justify-content:space-between;gap:9px;padding:3px 5px;border-radius:4px;
  cursor:pointer;animation:ss-rowin .3s calc(.62s + var(--i)*26ms) both;transition:background .12s}
#${NS}hud .row:hover{background:rgba(255,255,255,.07)}
#${NS}hud .row.off{opacity:.32}
#${NS}hud .m{display:flex;justify-content:space-between;gap:8px;color:#9a9aab;padding:1px 5px}
#${NS}hud .m b{color:#d4d4e0;font-weight:600}
#${NS}hud .sep{height:1px;background:rgba(255,255,255,.1);margin:9px 0}
#${NS}hud button{all:unset;cursor:pointer;color:#8b8b9b;font:11px ui-monospace,Menlo,monospace;
  padding:3px 7px;border:1px solid rgba(255,255,255,.14);border-radius:5px;
  transition:color .12s,border-color .12s}
#${NS}hud button:hover{color:#fff;border-color:rgba(255,255,255,.35)}
@media (prefers-reduced-motion:reduce){
  .ss-box,.ss-box.p0,.ss-tag,#${NS}hud,#${NS}hud .row{animation:none!important}
  .ss-box::before,.ss-box.p0::after{display:none}
  #${NS}sweep{display:none}}`;
}

// ---- src/ui/popover.js -----------------------------------------
// One card at a time, anchored under the label that opened it. Built with
// textContent only: evidence quotes page text, which must never become markup.
function makePopover(NS, layer) {
  let card = null, owner = null;

  const el = (tag, cls, text) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  };
  const describe = node => {
    const cls = String(node.el.className || '').trim().split(/\s+/).filter(Boolean).slice(0, 2);
    return node.tag.toLowerCase() + cls.map(c => '.' + c).join('');
  };

  function close() {
    if (!card) return false;
    card.remove(); card = null; owner = null;
    return true;
  }

  function open(hit, tag) {
    if (owner === tag) { close(); return; }
    close();
    const { rule, node, evidence } = hit, colour = SEV_COLOR[rule.severity];
    card = el('div', 'ss-pop');
    card.id = NS + 'pop';
    card.style.setProperty('--c', colour);

    const head = el('div', 'ss-pop-head');
    head.append(el('span', 'ss-pop-sev', SEV_NAME[rule.severity]), el('span', 'ss-pop-desc', SEV_DESC[rule.severity]));
    const found = el('div', 'ss-pop-found');
    found.append(el('span', null, 'found'), el('span', null, evidence));
    const foot = el('div', 'ss-pop-foot');
    const log = el('button', null, 'log element');
    log.onclick = () => console.log('[slopscan]', rule.id, '->', evidence, node.el);
    foot.append(el('code', null, `${rule.id} · ${describe(node)}`), log);
    card.append(head, el('div', 'ss-pop-title', rule.label), el('p', 'ss-pop-why', rule.why), found, foot);
    layer.appendChild(card);

    // under the label, flipped above when it would run off the bottom; clamped to the viewport
    const t = tag.getBoundingClientRect(), w = card.offsetWidth, h = card.offsetHeight;
    const left = Math.max(8, Math.min(t.left, window.innerWidth - w - 8));
    const top = t.bottom + 6 + h > window.innerHeight && t.top > h + 6 ? t.top - h - 6 : t.bottom + 6;
    card.style.left = left + window.scrollX + 'px';
    card.style.top = top + window.scrollY + 'px';
    owner = tag;
  }

  const onDown = e => { if (card && !card.contains(e.target) && e.target !== owner) close(); };
  document.addEventListener('mousedown', onDown, true);
  const dispose = () => document.removeEventListener('mousedown', onDown, true);

  return { open, close, dispose };
}

// ---- src/ui/overlay.js -----------------------------------------
const PER_RULE_CAP = 40, TOTAL_CAP = 260;

function selectHits(byId) {
  const hits = [];
  for (const id of Object.keys(byId)) {
    const area = h => h.node.rect.width * h.node.rect.height;
    byId[id].sort((a, b) => area(b) - area(a));
    byId[id] = byId[id].slice(0, PER_RULE_CAP);
    hits.push(...byId[id]);
  }
  hits.sort((a, b) => a.rule.severity - b.rule.severity
    || (b.node.rect.width * b.node.rect.height) - (a.node.rect.width * a.node.rect.height));
  return hits.slice(0, TOTAL_CAP);
}

function paint(NS, shown, report) {
  const style = document.createElement('style');
  style.id = NS + 'style';
  style.textContent = overlayCSS(NS);
  document.head.appendChild(style);

  const sweep = document.createElement('div');
  sweep.id = NS + 'sweep';
  document.body.appendChild(sweep);
  setTimeout(() => sweep.remove(), 1000);

  const layer = document.createElement('div');
  layer.id = NS + 'layer';
  Object.assign(layer.style, {
    position: 'absolute', left: '0', top: '0', width: '0', height: '0',
    zIndex: '2147483645', pointerEvents: 'none',
  });
  document.body.appendChild(layer);
  const pop = makePopover(NS, layer);

  const sx = window.scrollX, sy = window.scrollY;
  const vpArea = window.innerWidth * window.innerHeight;

  // Each box lights as the scan line passes its top edge, so the reveal reads
  // as one sweep rather than N unrelated pops in DOM order.
  const revealDelay = yDoc => {
    const rel = (yDoc - sy) / Math.max(1, window.innerHeight);
    return Math.round(rel <= 1 ? Math.max(0, rel) * 620 : 620 + Math.min(400, (rel - 1) * 130));
  };

  // Labels are created first and measured in a single layout flush. Estimating
  // their width from character count let neighbouring labels overlap.
  const pending = [];
  for (const hit of shown) {
    const { rect } = hit.node, colour = SEV_COLOR[hit.rule.severity];
    const bx = rect.left + sx, by = rect.top + sy, delay = revealDelay(by);

    const box = document.createElement('div');
    box.className = `ss-box p${hit.rule.severity}` +
      (rect.width * rect.height < vpArea * 0.5 ? ' tint' : '');
    box.dataset.det = hit.rule.id;
    box.style.cssText = `--c:${colour};--d:${delay}ms;left:${bx}px;top:${by}px;` +
      `width:${rect.width}px;height:${rect.height}px`;
    layer.appendChild(box);

    const tag = document.createElement('div');
    tag.className = 'ss-tag';
    tag.dataset.det = hit.rule.id;
    tag.textContent = hit.rule.label;
    tag.title = 'Click for why this fired';
    tag.style.cssText = `--c:${colour};left:-9999px;top:0;animation:none`;
    tag.onclick = () => pop.open(hit, tag);
    layer.appendChild(tag);
    pending.push({ hit, tag, bx, by, delay, colour });
  }
  for (const p of pending) { p.w = p.tag.offsetWidth; p.h = p.tag.offsetHeight; }

  const placed = [];
  const freeAt = (x, y, w, h) => !placed.some(p =>
    x < p.x + p.w + 4 && x + w + 4 > p.x && y < p.y + p.h + 4 && y + h + 4 > p.y);

  for (const p of pending) {
    const rect = p.hit.node.rect;
    const slots = [];
    for (let k = 0; k < 7; k++) {
      slots.push([p.bx, p.by - p.h - 2 - k * (p.h + 2)]);
      slots.push([p.bx, p.by + rect.height + 3 + k * (p.h + 2)]);
    }
    slots.push([p.bx + Math.max(0, rect.width - p.w), p.by - p.h - 2], [p.bx + 4, p.by + 4]);
    const spot = slots.find(([x, y]) => y >= 0 && freeAt(x, y, p.w, p.h));
    if (!spot) { p.tag.remove(); continue; }   // no room: keep the box, drop the label
    placed.push({ x: spot[0], y: spot[1], w: p.w, h: p.h });
    p.tag.style.cssText = `--c:${p.colour};--d:${p.delay}ms;left:${spot[0]}px;top:${spot[1]}px`;
  }

  return { layer, style, sweep, pop };
}

// ---- src/ui/report.js ------------------------------------------
const clip = (s, n) => (s.length > n ? s.slice(0, n - 1) + '…' : s);
const oneLine = s => String(s || '').replace(/\s+/g, ' ').trim();

// Full path from body, so the selector resolves even on pages without ids.
function cssPath(el) {
  const parts = [];
  for (let n = el; n && n.nodeType === 1 && n !== document.body; n = n.parentElement) {
    if (n.id && document.querySelectorAll('#' + CSS.escape(n.id)).length === 1) {
      parts.unshift('#' + CSS.escape(n.id));
      return parts.join(' > ');
    }
    let part = n.tagName.toLowerCase();
    const same = n.parentElement
      ? Array.from(n.parentElement.children).filter(s => s.tagName === n.tagName) : [];
    if (same.length > 1) part += `:nth-of-type(${same.indexOf(n) + 1})`;
    parts.unshift(part);
  }
  return ['body', ...parts].join(' > ');
}

// Plain-text report meant to be pasted into a coding agent: page state first,
// then every finding with enough handles (selector, classes, text) to grep the source.
function reportText(report) {
  // rects were read at scan time, so positions use the scan-time scroll
  const { score, tier, fired, byId, page, ruleCount, nodeCount, scroll } = report;
  const f = page.fonts, pct = x => Math.round(x * 100);
  const dark = matchMedia('(prefers-color-scheme:dark)').matches;
  const out = [
    '# slopscan report',
    '',
    'slopscan flagged the UI patterns below as typical of AI-generated templates.',
    'Each finding gives the rule, why it reads as slop, and the elements it fired on.',
    'Find each element in the source by its classes, text or selector, then fix the cause in the',
    'styles or components. Do not just hide the element. Rerun slopscan afterwards to confirm.',
    '',
    '## Page',
    `- URL: ${location.href}`,
    `- Title: ${oneLine(document.title) || '(none)'}`,
    `- Scanned: ${new Date().toISOString()}`,
    `- Viewport: ${innerWidth}x${innerHeight} @${devicePixelRatio}x, scrolled to ${Math.round(scroll.x)},${Math.round(scroll.y)} at scan time`,
    `- Document: ${document.documentElement.scrollWidth}x${document.documentElement.scrollHeight}`,
    `- Colour scheme: system prefers ${dark ? 'dark' : 'light'}, page reads as ${page.isDark ? 'dark' : 'light'}`,
    `- Score: ${score}/100 ${tier}, ${fired.length} of ${ruleCount} rules fired, ${nodeCount} elements scanned`,
    '',
    '## Page-wide stats',
    `- Fonts by char share: ${f.top.map(x => `${x.name || '(inherit)'}${x.grp ? ' [' + x.grp + ']' : ''} ${x.pct}%`).join(', ') || 'none'}`,
    `- Display / body font: ${f.display || '?'} / ${(f.body && f.body.name) || '?'}`,
    `- Radius values: ${page.radius.n} distinct, top ${page.radius.top}px on ${pct(page.radius.share)}%`,
    `- Spacing values: ${page.spacing.n} distinct, top ${page.spacing.top}px on ${pct(page.spacing.share)}%`,
    `- Type sizes: ${page.typeSizes}, largest/smallest ratio ${page.scaleRatio}x`,
    `- Hue buckets: ${page.hueCount}`,
    '',
    '## Findings, most severe first',
  ];
  if (!fired.length) out.push('', 'No rules fired.');

  const ordered = fired.slice().sort((a, b) => a.severity - b.severity || b.weight - a.weight);
  ordered.forEach((rule, i) => {
    const hits = byId[rule.id];
    out.push('', `### ${i + 1}. [${SEV_NAME[rule.severity]}] ${rule.label} (${rule.id}), ${hits.length} element${hits.length === 1 ? '' : 's'}`,
      `Why: ${rule.why}`);
    for (const { node, evidence } of hits) {
      const r = node.rect, cls = oneLine(node.el.getAttribute('class'));
      const text = oneLine(node.el.textContent);
      out.push(`- ${cssPath(node.el)}`, `  found: ${evidence}`);
      if (cls) out.push(`  classes: ${clip(cls, 160)}`);
      if (text) out.push(`  text: "${clip(text, 80)}"`);
      out.push(`  box: x${Math.round(r.left + scroll.x)} y${Math.round(r.top + scroll.y)} ${Math.round(r.width)}x${Math.round(r.height)}`);
    }
  });
  return out.join('\n') + '\n';
}

// navigator.clipboard needs a secure context, which a bookmarklet on http pages lacks.
async function copyText(text) {
  try { await navigator.clipboard.writeText(text); return true; } catch (e) { /* fall through */ }
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.cssText = 'position:fixed;left:0;top:0;opacity:0';
  document.body.appendChild(ta);
  ta.select();
  let ok = false;
  try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
  ta.remove();
  return ok;
}

// ---- src/ui/hud.js ---------------------------------------------
const tierColour = score => score >= 45 ? '#ff2d55' : score >= 22 ? '#ffb020' : '#4ade80';

function buildHUD(NS, report, layer, onClose) {
  const { score, tier, fired, byId, page, ruleCount, shownCount, nodeCount } = report;
  const f = page.fonts;
  const hud = document.createElement('div');
  hud.id = NS + 'hud';
  const tc = tierColour(score);

  const fontRow = font => {
    const colour = font.grp === 'B' ? '#ffb020' : font.grp === 'mono' ? '#38bdf8' : '#9a9aab';
    const tag = font.grp ? ` <i style="opacity:.6;font-style:normal">${font.grp}</i>` : '';
    return `<div class="m"><span style="color:${colour}">${font.name || '(inherit)'}${tag}</span><b>${font.pct}%</b></div>`;
  };

  hud.innerHTML = `<h4>slopscan</h4>
<div style="display:flex;align-items:baseline;gap:9px">
  <span class="sc" style="color:${tc}">${score}</span>
  <span style="color:${tc};font-weight:600;letter-spacing:.04em">${tier}</span></div>
<div style="color:#6e6e7e;font-size:11px;margin:3px 0 9px">${fired.length}/${ruleCount} signals · ${shownCount} marked · ${nodeCount} scanned</div>
<div class="sep"></div>
${fired.map((r, i) => `<div class="row" style="--i:${i}" data-det="${r.id}" title="${r.why}">
  <span style="color:${SEV_COLOR[r.severity]}">${r.label}</span>
  <span style="color:#6e6e7e">${byId[r.id].length}</span></div>`).join('')
  || '<div class="m">no signals fired</div>'}
<div class="sep"></div><h4>fonts by char share</h4>
${f.top.map(fontRow).join('') || '<div class="m">none</div>'}
<div class="m"><span>display / body</span><b>${f.display || '?'} / ${(f.body && f.body.name) || '?'}</b></div>
<div class="sep"></div><h4>distributions</h4>
<div class="m"><span>radius values</span><b>${page.radius.n} · top ${page.radius.top}px @ ${Math.round(page.radius.share * 100)}%</b></div>
<div class="m"><span>spacing values</span><b>${page.spacing.n} · top ${page.spacing.top}px @ ${Math.round(page.spacing.share * 100)}%</b></div>
<div class="m"><span>type sizes</span><b>${page.typeSizes} · ratio ${page.scaleRatio}×</b></div>
<div class="m"><span>hue buckets</span><b>${page.hueCount}</b></div>
<div class="m"><span>icons L/H/other</span><b>${page.iconSets.lucide}/${page.iconSets.heroicons}/${page.iconSets.other}</b></div>
<div class="sep"></div>
<div style="display:flex;flex-wrap:wrap;gap:7px"><button data-a="copy" title="Copy every finding with the page URL and state, ready to paste into a coding agent">copy for AI</button><button data-a="all">show all</button><button data-a="close">close (esc)</button></div>`;
  document.body.appendChild(hud);

  const scoreEl = hud.querySelector('.sc');
  if (!matchMedia('(prefers-reduced-motion:reduce)').matches) {
    scoreEl.textContent = '0';
    const t0 = performance.now();
    const tick = () => {
      const q = Math.max(0, Math.min(1, (performance.now() - t0 - 500) / 720));
      scoreEl.textContent = Math.round(score * (1 - Math.pow(1 - q, 3)));
      if (q < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  const setFilter = id => layer.querySelectorAll('[data-det]').forEach(n => {
    n.style.display = (!id || n.dataset.det === id) ? '' : 'none';
  });
  const rows = hud.querySelectorAll('.row');
  rows.forEach(row => row.onclick = () => {
    const active = row.classList.contains('on');
    rows.forEach(r => r.classList.remove('on', 'off'));
    if (active) { setFilter(null); return; }
    rows.forEach(r => { if (r !== row) r.classList.add('off'); });
    row.classList.add('on');
    setFilter(row.dataset.det);
  });
  hud.querySelector('[data-a=all]').onclick = () => {
    rows.forEach(r => r.classList.remove('on', 'off'));
    setFilter(null);
  };
  const copyBtn = hud.querySelector('[data-a=copy]');
  copyBtn.onclick = async () => {
    const text = reportText(report);
    const ok = await copyText(text);
    if (!ok) console.log(text);
    copyBtn.textContent = ok ? 'copied' : 'blocked: see console';
    setTimeout(() => { copyBtn.textContent = 'copy for AI'; }, 1600);
  };
  hud.querySelector('[data-a=close]').onclick = onClose;
  return hud;
}

// ---- src/scan.js -----------------------------------------------
const NS = '__slopscan__';

function runScan() {
  if (window[NS] && window[NS].cleanup) window[NS].cleanup();

  const started = performance.now();
  const { nodes, byEl, text } = collectNodes();
  const page = buildPageStats(nodes, byEl, text);

  const byId = {};
  for (const node of nodes) {
    for (const rule of RULES) {
      let evidence = null;
      try { evidence = rule.test(node, page); } catch (e) { evidence = null; }
      if (!evidence) continue;
      (byId[rule.id] = byId[rule.id] || []).push({ node, rule, evidence });
    }
  }

  const fired = RULES.filter(r => byId[r.id]);
  const score = Math.min(100, Math.round(fired.reduce((a, r) => a + r.weight, 0)));
  const tier = score >= 45 ? 'HEAVY SLOP' : score >= 22 ? 'MILD' : score > 0 ? 'LOW' : 'CLEAN';
  const shown = selectHits(byId);

  const report = {
    score, tier, fired, byId, page, nodes,
    scroll: { x: window.scrollX, y: window.scrollY },
    ruleCount: RULES.length, shownCount: shown.length, nodeCount: nodes.length,
    ms: Math.round(performance.now() - started),
  };

  const { layer, style, sweep, pop } = paint(NS, shown, report);
  const cleanup = () => {
    pop.dispose(); layer.remove(); style.remove(); sweep.remove(); hud.remove();
    document.removeEventListener('keydown', onKey);
    delete window[NS];
  };
  // Esc closes an open explanation first, then the whole overlay
  const onKey = e => { if (e.key === 'Escape' && !pop.close()) cleanup(); };
  const hud = buildHUD(NS, report, layer, cleanup);
  document.addEventListener('keydown', onKey);

  const tc = score >= 45 ? '#ff2d55' : score >= 22 ? '#ffb020' : '#4ade80';
  console.log(`%c slopscan  ${score}  ${tier} `,
    `background:${tc};color:#08080c;font-weight:700;padding:3px 7px;border-radius:3px`);
  console.table(fired.map(r => ({
    rule: r.id, sev: SEV_NAME[r.severity], weight: r.weight,
    elements: byId[r.id].length, example: byId[r.id][0].evidence,
  })));
  console.log('fonts:', page.fonts, '\ndistributions:', page, `\nscanned in ${report.ms}ms`);

  window[NS] = Object.assign(report, { cleanup, rules: RULES });
  return window[NS];
}

return runScan();
})();
