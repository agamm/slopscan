import { SEV_COLOR } from '../lib/severity.js';

const tierColour = score => score >= 45 ? '#ff2d55' : score >= 22 ? '#ffb020' : '#4ade80';

export function buildHUD(NS, report, layer, onClose) {
  const { score, tier, fired, byId, page, ruleCount, shownCount, nodeCount } = report;
  const f = page.fonts;
  const hud = document.createElement('div');
  hud.id = NS + 'hud';
  const tc = tierColour(score);

  const fontRow = font => {
    const colour = font.grp === 'B' ? '#ffb020' : font.grp === 'mono' ? '#38bdf8' : '#9a9aab';
    const tag = font.grp ? ` <i style="opacity:.6;font-style:normal">${font.grp}</i>` : '';
    return `<div class="m"><span style="color:${colour}">${font.name || '(inherit)'}${tag}</span><b>${font.pct}%</b></div>`;
  };

  hud.innerHTML = `<h4>slopscan</h4>
<div style="display:flex;align-items:baseline;gap:9px">
  <span class="sc" style="color:${tc}">${score}</span>
  <span style="color:${tc};font-weight:600;letter-spacing:.04em">${tier}</span></div>
<div style="color:#6e6e7e;font-size:11px;margin:3px 0 9px">${fired.length}/${ruleCount} signals · ${shownCount} marked · ${nodeCount} scanned</div>
<div class="sep"></div>
${fired.map((r, i) => `<div class="row" style="--i:${i}" data-det="${r.id}" title="${r.why}">
  <span style="color:${SEV_COLOR[r.severity]}">${r.label}</span>
  <span style="color:#6e6e7e">${byId[r.id].length}</span></div>`).join('')
  || '<div class="m">no signals fired</div>'}
<div class="sep"></div><h4>fonts by char share</h4>
${f.top.map(fontRow).join('') || '<div class="m">none</div>'}
<div class="m"><span>display / body</span><b>${f.display || '?'} / ${(f.body && f.body.name) || '?'}</b></div>
<div class="sep"></div><h4>distributions</h4>
<div class="m"><span>radius values</span><b>${page.radius.n} · top ${page.radius.top}px @ ${Math.round(page.radius.share * 100)}%</b></div>
<div class="m"><span>spacing values</span><b>${page.spacing.n} · top ${page.spacing.top}px @ ${Math.round(page.spacing.share * 100)}%</b></div>
<div class="m"><span>type sizes</span><b>${page.typeSizes} · ratio ${page.scaleRatio}×</b></div>
<div class="m"><span>hue buckets</span><b>${page.hueCount}</b></div>
<div class="m"><span>icons L/H/other</span><b>${page.iconSets.lucide}/${page.iconSets.heroicons}/${page.iconSets.other}</b></div>
<div class="sep"></div>
<div style="display:flex;gap:7px"><button data-a="all">show all</button><button data-a="close">close (esc)</button></div>`;
  document.body.appendChild(hud);

  const scoreEl = hud.querySelector('.sc');
  if (!matchMedia('(prefers-reduced-motion:reduce)').matches) {
    scoreEl.textContent = '0';
    const t0 = performance.now();
    const tick = () => {
      const q = Math.max(0, Math.min(1, (performance.now() - t0 - 500) / 720));
      scoreEl.textContent = Math.round(score * (1 - Math.pow(1 - q, 3)));
      if (q < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  const setFilter = id => layer.querySelectorAll('[data-det]').forEach(n => {
    n.style.display = (!id || n.dataset.det === id) ? '' : 'none';
  });
  const rows = hud.querySelectorAll('.row');
  rows.forEach(row => row.onclick = () => {
    const active = row.classList.contains('on');
    rows.forEach(r => r.classList.remove('on', 'off'));
    if (active) { setFilter(null); return; }
    rows.forEach(r => { if (r !== row) r.classList.add('off'); });
    row.classList.add('on');
    setFilter(row.dataset.det);
  });
  hud.querySelector('[data-a=all]').onclick = () => {
    rows.forEach(r => r.classList.remove('on', 'off'));
    setFilter(null);
  };
  hud.querySelector('[data-a=close]').onclick = onClose;
  return hud;
}
