# slopscan

Finds AI-slop UI patterns on any page and marks them in place. 31 deterministic rules over
computed CSS. No dependencies, no network, nothing leaves the page.

## Install

**→ [agamm.github.io/slopscan](https://agamm.github.io/slopscan/)** — drag the button to your
bookmarks bar.

It can't be a drag link in this README: GitHub's sanitiser strips `javascript:` hrefs (verified
against this file's own rendered output). Offline, `open index.html`.

Console fallback for sites whose CSP blocks bookmarklets: paste `dist/slopscan.js` into devtools.

## Reading it

Red = **P0**, screams AI on sight. Amber = **P1**, the obvious smell. Blue = **P2**, cosmetic.
Only P0 keeps animating once the scan settles.

Click a HUD row to isolate a rule, click a label to log the element, hover for why it fired,
<kbd>Esc</kbd> to clear. Full report on `window.__slopscan__`.

The HUD's **distributions** block is the part to trust. Radius cardinality, spacing histogram and
type-scale ratio separate template output from designed pages far better than any single-feature
check:

| | slop fixture | linear.app | clean fixture |
|---|---|---|---|
| distinct radius values | 2 (top @ 73%) | 13 (top @ 18%) | 1 |
| distinct spacing values | 5 (top @ 83%) | 30 (top @ 20%) | 10 |

## Rules

31, grouped by file under `src/rules/`.

- **color** — gradient-purple, tw-purple, gradient-text, colored-glow
- **surface** — glassmorphism, radius-monoculture, tw-shadow, accent-stripe, uniform-spacing, oversized-shadow, corner-nesting
- **type** — font-pairing, font-template, mono-body, flat-hierarchy, font-default
- **layout** — hero-keyword, eyebrow-pill, centered-hero
- **iconography** — ai-icon, icon-tile, emoji-ui, hype-icon
- **effects** — blur-orb, perma-dark, numbered-steps, stat-banner, hairline-everywhere, springy-easing, nested-cards, allcaps-label

Fonts are grouped, not blocklisted, because the published catalogues contradict each other:
Space Grotesk, Fraunces, Instrument Serif and Geist each sit on one tool's slop list **and**
another's allowlist. So group A is what a model reaches for when it isn't trying (Inter, Poppins,
Montserrat), group B is the template display faces it reaches for when it is. **B over A** is the
fingerprint; either alone is weak.

## Adding a rule

Drop it into the matching file in `src/rules/`, then `node build.mjs`. Nothing to register.

```js
{
  id: 'gradient-purple',
  label: 'purple gradient',
  severity: P0, weight: 12,
  why: 'The indigo-to-violet gradient is the single most recognisable AI design tell.',
  test(node, page) {          // evidence string, or null
    return /gradient\(/.test(node.bgImage) ? 'linear-gradient' : null;
  },
}
```

`node` has every style resolved once in `src/lib/collect.js`. `page` carries the distributions and
`byEl` for parent lookups. Never call `getComputedStyle` inside a rule.

## Build

`node build.mjs`. Walks the import graph from `src/scan.js`, strips `import`/`export`,
concatenates into one IIFE, `node --check`s it. Emits `dist/slopscan.js` (console paste),
`dist/slopscan.min.js`, `dist/bookmarklet.txt`, and the install page.

## Limitations

- **The score is not calibrated.** Weights are a first guess and the sum saturates quickly at 31
  rules. Read the rule list, not the number.
- **Presence checks misfire.** linear.app trips `font-default` and `glassmorphism` while being
  well designed. The distribution rules correctly stay quiet on it. Trust those.
- **Visual mechanics only.** Nothing here judges copy, structure or taste.
- Boxes use document coordinates, so `position: fixed` elements drift on scroll. Re-run to reset.

## Licence

MIT.
