import { SEV_NAME } from '../lib/severity.js';

const clip = (s, n) => (s.length > n ? s.slice(0, n - 1) + '…' : s);
const oneLine = s => String(s || '').replace(/\s+/g, ' ').trim();

// Full path from body, so the selector resolves even on pages without ids.
function cssPath(el) {
  const parts = [];
  for (let n = el; n && n.nodeType === 1 && n !== document.body; n = n.parentElement) {
    if (n.id && document.querySelectorAll('#' + CSS.escape(n.id)).length === 1) {
      parts.unshift('#' + CSS.escape(n.id));
      return parts.join(' > ');
    }
    let part = n.tagName.toLowerCase();
    const same = n.parentElement
      ? Array.from(n.parentElement.children).filter(s => s.tagName === n.tagName) : [];
    if (same.length > 1) part += `:nth-of-type(${same.indexOf(n) + 1})`;
    parts.unshift(part);
  }
  return ['body', ...parts].join(' > ');
}

// Plain-text report meant to be pasted into a coding agent: page state first,
// then every finding with enough handles (selector, classes, text) to grep the source.
export function reportText(report) {
  // rects were read at scan time, so positions use the scan-time scroll
  const { score, tier, fired, byId, page, ruleCount, nodeCount, scroll } = report;
  const f = page.fonts, pct = x => Math.round(x * 100);
  const dark = matchMedia('(prefers-color-scheme:dark)').matches;
  const out = [
    '# slopscan report',
    '',
    'slopscan flagged the UI patterns below as typical of AI-generated templates.',
    'Each finding gives the rule, why it reads as slop, and the elements it fired on.',
    'Find each element in the source by its classes, text or selector, then fix the cause in the',
    'styles or components. Do not just hide the element. Rerun slopscan afterwards to confirm.',
    '',
    '## Page',
    `- URL: ${location.href}`,
    `- Title: ${oneLine(document.title) || '(none)'}`,
    `- Scanned: ${new Date().toISOString()}`,
    `- Viewport: ${innerWidth}x${innerHeight} @${devicePixelRatio}x, scrolled to ${Math.round(scroll.x)},${Math.round(scroll.y)} at scan time`,
    `- Document: ${document.documentElement.scrollWidth}x${document.documentElement.scrollHeight}`,
    `- Colour scheme: system prefers ${dark ? 'dark' : 'light'}, page reads as ${page.isDark ? 'dark' : 'light'}`,
    `- Score: ${score}/100 ${tier}, ${fired.length} of ${ruleCount} rules fired, ${nodeCount} elements scanned`,
    '',
    '## Page-wide stats',
    `- Fonts by char share: ${f.top.map(x => `${x.name || '(inherit)'}${x.grp ? ' [' + x.grp + ']' : ''} ${x.pct}%`).join(', ') || 'none'}`,
    `- Display / body font: ${f.display || '?'} / ${(f.body && f.body.name) || '?'}`,
    `- Radius values: ${page.radius.n} distinct, top ${page.radius.top}px on ${pct(page.radius.share)}%`,
    `- Spacing values: ${page.spacing.n} distinct, top ${page.spacing.top}px on ${pct(page.spacing.share)}%`,
    `- Type sizes: ${page.typeSizes}, largest/smallest ratio ${page.scaleRatio}x`,
    `- Hue buckets: ${page.hueCount}`,
    '',
    '## Findings, most severe first',
  ];
  if (!fired.length) out.push('', 'No rules fired.');

  const ordered = fired.slice().sort((a, b) => a.severity - b.severity || b.weight - a.weight);
  ordered.forEach((rule, i) => {
    const hits = byId[rule.id];
    out.push('', `### ${i + 1}. [${SEV_NAME[rule.severity]}] ${rule.label} (${rule.id}), ${hits.length} element${hits.length === 1 ? '' : 's'}`,
      `Why: ${rule.why}`);
    for (const { node, evidence } of hits) {
      const r = node.rect, cls = oneLine(node.el.getAttribute('class'));
      const text = oneLine(node.el.textContent);
      out.push(`- ${cssPath(node.el)}`, `  found: ${evidence}`);
      if (cls) out.push(`  classes: ${clip(cls, 160)}`);
      if (text) out.push(`  text: "${clip(text, 80)}"`);
      out.push(`  box: x${Math.round(r.left + scroll.x)} y${Math.round(r.top + scroll.y)} ${Math.round(r.width)}x${Math.round(r.height)}`);
    }
  });
  return out.join('\n') + '\n';
}

// navigator.clipboard needs a secure context, which a bookmarklet on http pages lacks.
export async function copyText(text) {
  try { await navigator.clipboard.writeText(text); return true; } catch (e) { /* fall through */ }
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.cssText = 'position:fixed;left:0;top:0;opacity:0';
  document.body.appendChild(ta);
  ta.select();
  let ok = false;
  try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
  ta.remove();
  return ok;
}
