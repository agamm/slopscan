import { P0, P1 } from '../lib/severity.js';
import { hsl } from '../lib/color.js';
import { AI_ICON_RE, HYPE_ICON_RE, AI_PATHS, svgInfo, EMOJI_RE } from '../lib/icons.js';

// :scope > svg so only the immediate wrapper fires, not every ancestor.
const ownSvg = n => n.el.querySelector(':scope > svg');

export const iconRules = [
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
