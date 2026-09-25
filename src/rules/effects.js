import { P0, P1, P2 } from '../lib/severity.js';
import { hsl, contrastRatio, parseColor, spread } from '../lib/color.js';

// every tile of a repeating background is at most this big: a pattern, not a fill
const smallTiles = size => {
  const px = (size.match(/[\d.]+px/g) || []).map(parseFloat);
  return px.length > 0 && px.every(v => v >= 6 && v <= 160);
};

export const effectRules = [
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
