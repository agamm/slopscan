import { parseColor } from './color.js';
import { familyOf } from './fonts.js';

const MAX_ELEMENTS = 8000;
const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'BR', 'TEMPLATE']);

const directText = el =>
  Array.from(el.childNodes).filter(n => n.nodeType === 3).map(n => n.textContent).join('').trim();

// One getComputedStyle pass per element. Everything a rule can ask for is read
// here once, because re-reading computed styles inside 23 rules is the only
// part of this that gets slow.
export function collectNodes() {
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
      text: directText(el),
    };
    node.maxRadius = Math.max(...node.radii);
    nodes.push(node);
    byEl.set(el, node);
  }
  return { nodes, byEl };
}
