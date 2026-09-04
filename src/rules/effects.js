import { P0, P1, P2 } from '../lib/severity.js';
import { hsl, contrastRatio } from '../lib/color.js';

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
