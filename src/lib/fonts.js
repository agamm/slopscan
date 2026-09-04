// The published catalogues disagree on single faces: Space Grotesk, Fraunces,
// Instrument Serif and Geist each sit on one tool's blocklist and another's
// allowlist. What survives that disagreement is the deployment, not the face.
//
//   A = what a model reaches for when it is not trying.
//   B = the template display faces it reaches for when it is.
//
// B-over-A is the fingerprint. Either group alone is weak evidence.
export const FONT_A = [
  'inter', 'roboto', 'open sans', 'lato', 'poppins', 'montserrat', 'raleway',
  'nunito', 'nunito sans', 'work sans', 'dm sans', 'source sans', 'helvetica',
  'helvetica neue', 'arial', 'system-ui', '-apple-system', 'segoe ui', 'ubuntu',
  'pt sans', 'mulish', 'karla', 'rubik', 'quicksand', 'josefin sans', 'noto sans',
];

export const FONT_B = [
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

export const FONT_MONO = [
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

export function fontGroup(name) {
  if (!name) return null;
  if (inList(name, FONT_MONO)) return 'mono';
  if (inList(name, FONT_B)) return 'B';   // check B first: "inter tight" is B, not A
  if (inList(name, FONT_A)) return 'A';
  return null;
}

export const familyOf = cs =>
  (cs.fontFamily || '').split(',')[0].trim().replace(/^['"]|['"]$/g, '').toLowerCase();
