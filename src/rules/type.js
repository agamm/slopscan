import { P0, P1, P2 } from '../lib/severity.js';
import { fontGroup } from '../lib/fonts.js';

const isDisplay = (n, min = 24) => /^(H1|H2|H3)$/.test(n.tag) || n.fontSize >= min;

export const typeRules = [
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
