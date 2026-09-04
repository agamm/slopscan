import { P1, P2 } from '../lib/severity.js';
import { parseColor, colorDist } from '../lib/color.js';
import { familyOf } from '../lib/fonts.js';

export const layoutRules = [
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
