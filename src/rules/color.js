import { P0, P1, P2 } from '../lib/severity.js';
import { parseColor, hsl, rgbKey, isPurpleHue, TW_PURPLE, isCream, isMidGrey, spread, hex } from '../lib/color.js';
import { effectiveBg } from '../lib/page.js';
import { shadowLayers } from '../lib/shadow.js';

export const colorRules = [
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
