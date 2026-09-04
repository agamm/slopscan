# slopscan

Finds AI-slop UI patterns on any page and marks them in place. 23 deterministic rules over
computed CSS. No network calls, no dependencies, nothing leaves the page.

## Install as a bookmarklet

### → [agamm.github.io/slopscan](https://agamm.github.io/slopscan/)

Open that page and drag the button to your bookmarks bar.

It cannot be a drag link in this README. GitHub's Markdown sanitiser strips
`javascript:` hrefs, verified against the rendered output of this very file: a raw-HTML
`<a href="javascript:...">` came back as bare text with the anchor removed, and the
Markdown form came back as nothing. So the drag target has to live on a real HTML page.

Locally, without the network:

```sh
open index.html          # macOS
xdg-open index.html      # Linux
```

## Or paste it into the console

```sh
pbcopy < dist/slopscan.js       # macOS
```

Then paste into devtools. Chrome blocks console paste until you type `allow pasting` once.

Use this on sites where the bookmarklet does nothing: some pages block `javascript:` URLs via
Content Security Policy.

## Reading the output

| | |
|---|---|
| Red outline | **P0** — screams AI on sight |
| Amber outline | **P1** — the obvious smell |
| Blue outline | **P2** — cosmetic |
| Click a HUD row | isolate that rule |
| Click a label | log the element to console, scroll to it |
| Hover a label | why it fired |
| <kbd>Esc</kbd> | remove the overlay |

Only P0 boxes keep animating after the scan settles. `window.__slopscan__` holds the full report.

The HUD's **distributions** block is the part worth reading. Radius cardinality, spacing
histogram, type-scale ratio and hue count separate template output from designed pages far more
reliably than any single-feature check:

| | slop fixture | linear.app | clean fixture |
|---|---|---|---|
| distinct radius values | 2 (top @ 73%) | 13 (top @ 18%) | 1 |
| distinct spacing values | 5 (top @ 83%) | 30 (top @ 20%) | 10 |
| type sizes / ratio | 4 / 4.3× | 12 / 7.2× | 6 / 3.6× |

## The rules

Grouped by file under `src/rules/`. Weight in brackets.

**`color.js`** — gradient-purple `[12]`, tw-purple `[14]`, gradient-text `[10]`, colored-glow `[8]`

**`surface.js`** — glassmorphism `[10]`, radius-monoculture `[11]`, tw-shadow `[8]`,
accent-stripe `[8]`, uniform-spacing `[8]`, oversized-shadow `[7]`, corner-nesting `[5]`

**`type.js`** — font-pairing `[12]`, font-template `[7]`, mono-body `[6]`, flat-hierarchy `[6]`,
font-default `[4]`

**`layout.js`** — hero-keyword `[8]`, eyebrow-pill `[7]`, centered-hero `[5]`

**`iconography.js`** — ai-icon `[12]`, icon-tile `[7]`, emoji-ui `[6]`, hype-icon `[5]`

### Why fonts are grouped, not blocklisted

The published catalogues contradict each other. Space Grotesk, Fraunces, Instrument Serif,
Bricolage Grotesque and Geist each appear on one tool's slop list **and** another's allowlist.
A flat blocklist cannot survive that.

So `src/lib/fonts.js` splits them: **group A** is what a model reaches for when it is not trying
(Inter, Roboto, Poppins, Montserrat…), **group B** is the template display faces it reaches for
when it is (Space Grotesk, Instrument Serif, Fraunces…). Either alone is weak. **B over A** is
the fingerprint, and `font-pairing` scores it highest.

This matters in practice: on a page where Instrument Serif carries only 7% of the characters,
a character-share test misses it entirely. Measuring the display slot separately catches it.

## Adding a rule

Drop it into the matching file in `src/rules/`. The shape is the whole contract:

```js
{
  id: 'gradient-purple',
  label: 'purple gradient',        // shown on the overlay tag
  severity: P0, weight: 12,
  why:  'The indigo-to-violet gradient is the single most recognisable AI design tell.',
  test(node, page) {
    // node: one element, styles already resolved. page: whole-document stats.
    // return an evidence string, or null.
    return /gradient\(/.test(node.bgImage) ? 'linear-gradient' : null;
  },
}
```

`node` fields are resolved once in `src/lib/collect.js` (`rect`, `bg`, `fg`, `radii`, `borders`,
`padding`, `font`, `fontSize`, `boxShadow`, `text`, …). Re-reading computed styles inside a rule
is the only thing here that gets slow.

`page` carries the distributions and `page.byEl` for parent lookups.

Then `node build.mjs`.

## Build

```sh
node build.mjs
```

No dependencies. `build.mjs` walks the import graph from `src/scan.js`, topologically sorts it,
strips the `import`/`export` keywords, concatenates into one IIFE, and `node --check`s the
result. Output:

| file | size | use |
|---|---|---|
| `dist/slopscan.js` | 39.6 KB | console paste, readable |
| `dist/slopscan.min.js` | 33.3 KB | comment/indent-stripped |
| `dist/bookmarklet.txt` | 35.1 KB | `javascript:` URL |
| `dist/install.html` | | drag-to-bookmark page |

The minifier is deliberately conservative: whole-line comments and indentation only, and only
outside template literals. It never touches anything that could be a regex literal.

## Limitations, stated plainly

- **The score is not calibrated.** Weights are a first guess. They need a labelled corpus before
  the total means anything. Read the rule list, not the number.
- **Presence checks have poor precision.** linear.app trips `font-default`, `gradient-text` and
  `glassmorphism` while being well designed. The distribution rules correctly stay quiet on it.
  That asymmetry is the point: trust `radius-monoculture` over `gradient-purple`.
- **It says nothing about copy, structure or taste.** This is the visual-mechanics half only.
  A page can pass every rule and still be bad.
- **Absolute positioning.** Boxes are placed in document coordinates, so `position: fixed`
  elements drift when you scroll. Re-run to re-place them.
