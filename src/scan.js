import { RULES } from './rules/index.js';
import { SEV_NAME } from './lib/severity.js';
import { collectNodes } from './lib/collect.js';
import { buildPageStats } from './lib/page.js';
import { selectHits, paint } from './ui/overlay.js';
import { buildHUD } from './ui/hud.js';

const NS = '__slopscan__';

export function runScan() {
  if (window[NS] && window[NS].cleanup) window[NS].cleanup();

  const started = performance.now();
  const { nodes, byEl } = collectNodes();
  const page = buildPageStats(nodes, byEl);

  const byId = {};
  for (const node of nodes) {
    for (const rule of RULES) {
      let evidence = null;
      try { evidence = rule.test(node, page); } catch (e) { evidence = null; }
      if (!evidence) continue;
      (byId[rule.id] = byId[rule.id] || []).push({ node, rule, evidence });
    }
  }

  const fired = RULES.filter(r => byId[r.id]);
  const score = Math.min(100, Math.round(fired.reduce((a, r) => a + r.weight, 0)));
  const tier = score >= 45 ? 'HEAVY SLOP' : score >= 22 ? 'MILD' : score > 0 ? 'LOW' : 'CLEAN';
  const shown = selectHits(byId);

  const report = {
    score, tier, fired, byId, page, nodes,
    ruleCount: RULES.length, shownCount: shown.length, nodeCount: nodes.length,
    ms: Math.round(performance.now() - started),
  };

  const { layer, style, sweep } = paint(NS, shown, report);
  const cleanup = () => {
    layer.remove(); style.remove(); sweep.remove(); hud.remove();
    document.removeEventListener('keydown', onKey);
    delete window[NS];
  };
  const onKey = e => { if (e.key === 'Escape') cleanup(); };
  const hud = buildHUD(NS, report, layer, cleanup);
  document.addEventListener('keydown', onKey);

  const tc = score >= 45 ? '#ff2d55' : score >= 22 ? '#ffb020' : '#4ade80';
  console.log(`%c slopscan  ${score}  ${tier} `,
    `background:${tc};color:#08080c;font-weight:700;padding:3px 7px;border-radius:3px`);
  console.table(fired.map(r => ({
    rule: r.id, sev: SEV_NAME[r.severity], weight: r.weight,
    elements: byId[r.id].length, example: byId[r.id][0].evidence,
  })));
  console.log('fonts:', page.fonts, '\ndistributions:', page, `\nscanned in ${report.ms}ms`);

  window[NS] = Object.assign(report, { cleanup, rules: RULES });
  return window[NS];
}
