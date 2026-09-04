// Names verified against lucide-static v0.400 + v1.40 and heroicons v2.2.
export const AI_ICON_RE = /(sparkle|wand|brain|robot|magic|auto-awesome|smart-toy|shining|\bbot\b|-bot\b)/;
export const HYPE_ICON_RE = /lucide-(zap|rocket|stars|cpu|flame|trending-up|lightbulb)/;

// The sparkles glyph, for inline SVGs pasted without a class. Lucide changed
// its path between v0 and v1, so both generations are listed, plus heroicons
// outline and solid. Fragments are taken from the real sources, not recalled.
export const AI_PATHS = [
  '9.937 15.5',    // lucide v0.x sparkles
  '11.017 2.814',  // lucide v1.x sparkles
  '9.813 15.904',  // heroicons 24 outline sparkles
  '9 4.5a.75',     // heroicons 24 solid sparkles
  '.721.544',      // heroicons 24 solid sparkles (alt segment)
];

export const svgInfo = svg => ({
  cls: [svg.getAttribute('class'), svg.getAttribute('data-lucide'),
        svg.getAttribute('data-icon'), svg.getAttribute('aria-label')]
        .filter(Boolean).join(' ').toLowerCase(),
  paths: Array.from(svg.querySelectorAll('path')).map(p => p.getAttribute('d') || '').join(' '),
});

export const EMOJI_RE =
  /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2190}-\u{21FF}\u{2B00}-\u{2BFF}\u{FE0F}]/u;
