import { P0, P1, P2 } from '../lib/severity.js';
import { parseColor, hsl } from '../lib/color.js';
import { shadowLayers, shadowSignature, TW_SHADOWS } from '../lib/shadow.js';

export const surfaceRules = [
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
