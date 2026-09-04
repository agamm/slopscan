/* slopscan — deterministic AI-slop UI detector. 17 modules, built 2026-09-04. */
(() => {
'use strict';

// ---- src/lib/severity.js ---------------------------------------
// P0 screams AI on sight. P1 is the obvious smell. P2 is cosmetic.
const P0 = 0, P1 = 1, P2 = 2;
const SEV_COLOR = ['#ff2d55', '#ffb020', '#38bdf8'];
const SEV_NAME = ['P0', 'P1', 'P2'];

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

const rgbKey = c => `${Math.round(c.r)},${Math.round(c.g)},${Math.round(c.b)}`;
const colorDist = (a, b) => Math.abs(a.r - b.r) + Math.abs(a.g - b.g) + Math.abs(a.b - b.b);
const isPurpleHue = c => { const H = hsl(c); return H.h >= 235 && H.h <= 300 && H.s > 0.3; };

// Tailwind's indigo/violet/purple ramps, byte-exact. A designer who ran a pass
// nudges something; an untouched default means nobody looked at it.
const TW_PURPLE = new Set([
  '99,102,241', '79,70,229', '67,56,202', '129,140,248', '165,180,252',
  '139,92,246', '124,58,237', '109,40,217', '167,139,250', '196,181,253',
  '168,85,247', '147,51,234', '126,34,206', '192,132,252', '216,180,254',
]);

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
      return hasSurface && !n.el.querySelector('h1,h2') ? `"${text.slice(0, 28)}"` : null;
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

const EMOJI_RE =
  /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2190}-\u{21FF}\u{2B00}-\u{2BFF}\u{FE0F}]/u;

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

// ---- src/rules/index.js ----------------------------------------
// Weights are a first guess, not a fitted model. They need a labelled corpus
// before the total means anything; read the per-rule list, not the number.
const RULES = [
  ...colorRules, ...surfaceRules, ...typeRules, ...layoutRules, ...iconRules,
];

// ---- src/lib/collect.js ----------------------------------------
const MAX_ELEMENTS = 8000;
const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'BR', 'TEMPLATE']);

const directText = el =>
  Array.from(el.childNodes).filter(n => n.nodeType === 3).map(n => n.textContent).join('').trim();

// One getComputedStyle pass per element. Everything a rule can ask for is read
// here once, because re-reading computed styles inside 23 rules is the only
// part of this that gets slow.
function collectNodes() {
  const nodes = [], byEl = new Map();
  const all = document.body ? document.body.querySelectorAll('*') : [];
  for (const el of Array.from(all).slice(0, MAX_ELEMENTS)) {
    if (SKIP_TAGS.has(el.tagName)) continue;
    if (el.closest('svg')) continue;               // shapes have no useful box styles
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden' || parseFloat(cs.opacity) < 0.05) continue;
    const rect = el.getBoundingClientRect();
    if (rect.width < 2 || rect.height < 2) continue;

    const node = {
      el, rect, cs,
      tag: el.tagName,
      bg: parseColor(cs.backgroundColor),
      fg: parseColor(cs.color),
      bgImage: cs.backgroundImage,
      boxShadow: cs.boxShadow,
      radii: [cs.borderTopLeftRadius, cs.borderTopRightRadius,
              cs.borderBottomRightRadius, cs.borderBottomLeftRadius]
             .map(v => Math.round(parseFloat(v) || 0)),
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
      text: directText(el),
    };
    node.maxRadius = Math.max(...node.radii);
    nodes.push(node);
    byEl.set(el, node);
  }
  return { nodes, byEl };
}

// ---- src/lib/page.js -------------------------------------------
// Most-common value and how dominant it is. Slop is low cardinality with one
// value dominating; deliberate design spreads across a purposeful few.
function dominant(counts) {
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  if (!total) return { top: 0, share: 0, n: 0 };
  const [value, count] = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
  return { top: +value, share: count / total, n: Object.keys(counts).length };
}

function buildPageStats(nodes, byEl) {
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

// ---- src/ui/style.js -------------------------------------------
function overlayCSS(NS) {
  return `
@keyframes ss-focus{from{opacity:0;transform:scale(1.045);filter:blur(1.5px)}
                    to{opacity:1;transform:none;filter:blur(0)}}
@keyframes ss-ants{to{background-position:36px 0,-36px 0,0 -36px,0 36px}}
@keyframes ss-breathe{0%,100%{opacity:.6}50%{opacity:1}}
@keyframes ss-tagin{from{opacity:0;transform:translateX(-5px) scale(.96)}to{opacity:1;transform:none}}
@keyframes ss-sweep{from{transform:translateY(-132px)}to{transform:translateY(100vh)}}
@keyframes ss-hud{from{opacity:0;transform:translateY(16px) scale(.985)}to{opacity:1;transform:none}}
@keyframes ss-rowin{from{opacity:0;transform:translateX(-7px)}to{opacity:1;transform:none}}
.ss-box{position:absolute;pointer-events:none;box-sizing:border-box;border-radius:3px;
  animation:ss-focus .42s cubic-bezier(.16,.84,.32,1) var(--d) both;
  background-image:repeating-linear-gradient(90deg,var(--c) 0 9px,transparent 9px 18px),
                   repeating-linear-gradient(90deg,var(--c) 0 9px,transparent 9px 18px),
                   repeating-linear-gradient(0deg,var(--c) 0 9px,transparent 9px 18px),
                   repeating-linear-gradient(0deg,var(--c) 0 9px,transparent 9px 18px);
  background-size:100% 2px,100% 2px,2px 100%,2px 100%;background-repeat:no-repeat;
  background-position:0 0,0 100%,0 0,100% 0}
/* Motion is reserved for P0. Everything else settles still so the page stops
   twitching once the scan is done. */
.ss-box.p0{animation:ss-focus .42s cubic-bezier(.16,.84,.32,1) var(--d) both,
                     ss-ants 2.4s linear var(--d) infinite,
                     ss-breathe 3.6s ease-in-out calc(var(--d) + .5s) infinite}
.ss-box.tint::after{content:'';position:absolute;inset:0;background:var(--c);opacity:.05;border-radius:inherit}
.ss-tag{position:absolute;pointer-events:auto;cursor:pointer;
  font:600 10px/1.5 ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.02em;
  color:#08080c;background:var(--c);padding:1px 6px;border-radius:3px;white-space:nowrap;
  max-width:210px;overflow:hidden;text-overflow:ellipsis;box-shadow:0 2px 8px rgba(0,0,0,.35);
  animation:ss-tagin .34s cubic-bezier(.16,.84,.32,1) calc(var(--d) + .14s) both}
.ss-tag:hover{filter:brightness(1.15);z-index:9}
#${NS}sweep{position:fixed;left:0;right:0;top:0;height:132px;z-index:2147483646;pointer-events:none;
  background:linear-gradient(to bottom,transparent 0,rgba(56,189,248,.05) 52%,
             rgba(56,189,248,.2) 86%,rgba(125,211,252,.7) 97%,#e0f2fe 100%);
  animation:ss-sweep .82s cubic-bezier(.33,.02,.28,1) both}
#${NS}sweep::after{content:'';position:absolute;left:0;right:0;bottom:0;height:1px;background:#fff;
  box-shadow:0 0 20px 4px rgba(56,189,248,.65)}
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
  #${NS}sweep{display:none}}`;
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
    tag.title = `${hit.rule.id} — ${hit.evidence}\n\n${hit.rule.why}`;
    tag.style.cssText = `--c:${colour};left:-9999px;top:0;animation:none`;
    tag.onclick = () => {
      console.log('[slopscan]', hit.rule.id, '->', hit.evidence, hit.node.el);
      hit.node.el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    };
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

  return { layer, style, sweep };
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
<div style="display:flex;gap:7px"><button data-a="all">show all</button><button data-a="close">close (esc)</button></div>`;
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
  hud.querySelector('[data-a=close]').onclick = onClose;
  return hud;
}

// ---- src/scan.js -----------------------------------------------
const NS = '__slopscan__';

function runScan() {
  if (window[NS] && window[NS].cleanup) window[NS].cleanup();

  const started = performance.now();
  const { nodes, byEl } = collectNodes();
  const page = buildPageStats(nodes, byEl);

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
    ruleCount: RULES.length, shownCount: shown.length, nodeCount: nodes.length,
    ms: Math.round(performance.now() - started),
  };

  const { layer, style, sweep } = paint(NS, shown, report);
  const cleanup = () => {
    layer.remove(); style.remove(); sweep.remove(); hud.remove();
    document.removeEventListener('keydown', onKey);
    delete window[NS];
  };
  const onKey = e => { if (e.key === 'Escape') cleanup(); };
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
