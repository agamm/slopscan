import { SEV_COLOR } from '../lib/severity.js';
import { overlayCSS } from './style.js';

const PER_RULE_CAP = 40, TOTAL_CAP = 260;

export function selectHits(byId) {
  const hits = [];
  for (const id of Object.keys(byId)) {
    const area = h => h.node.rect.width * h.node.rect.height;
    byId[id].sort((a, b) => area(b) - area(a));
    byId[id] = byId[id].slice(0, PER_RULE_CAP);
    hits.push(...byId[id]);
  }
  hits.sort((a, b) => a.rule.severity - b.rule.severity
    || (b.node.rect.width * b.node.rect.height) - (a.node.rect.width * a.node.rect.height));
  return hits.slice(0, TOTAL_CAP);
}

export function paint(NS, shown, report) {
  const style = document.createElement('style');
  style.id = NS + 'style';
  style.textContent = overlayCSS(NS);
  document.head.appendChild(style);

  const sweep = document.createElement('div');
  sweep.id = NS + 'sweep';
  document.body.appendChild(sweep);
  setTimeout(() => sweep.remove(), 1000);

  const layer = document.createElement('div');
  layer.id = NS + 'layer';
  Object.assign(layer.style, {
    position: 'absolute', left: '0', top: '0', width: '0', height: '0',
    zIndex: '2147483645', pointerEvents: 'none',
  });
  document.body.appendChild(layer);

  const sx = window.scrollX, sy = window.scrollY;
  const vpArea = window.innerWidth * window.innerHeight;

  // Each box lights as the scan line passes its top edge, so the reveal reads
  // as one sweep rather than N unrelated pops in DOM order.
  const revealDelay = yDoc => {
    const rel = (yDoc - sy) / Math.max(1, window.innerHeight);
    return Math.round(rel <= 1 ? Math.max(0, rel) * 620 : 620 + Math.min(400, (rel - 1) * 130));
  };

  // Labels are created first and measured in a single layout flush. Estimating
  // their width from character count let neighbouring labels overlap.
  const pending = [];
  for (const hit of shown) {
    const { rect } = hit.node, colour = SEV_COLOR[hit.rule.severity];
    const bx = rect.left + sx, by = rect.top + sy, delay = revealDelay(by);

    const box = document.createElement('div');
    box.className = `ss-box p${hit.rule.severity}` +
      (rect.width * rect.height < vpArea * 0.5 ? ' tint' : '');
    box.dataset.det = hit.rule.id;
    box.style.cssText = `--c:${colour};--d:${delay}ms;left:${bx}px;top:${by}px;` +
      `width:${rect.width}px;height:${rect.height}px`;
    layer.appendChild(box);

    const tag = document.createElement('div');
    tag.className = 'ss-tag';
    tag.dataset.det = hit.rule.id;
    tag.textContent = hit.rule.label;
    tag.title = `${hit.rule.id} — ${hit.evidence}\n\n${hit.rule.why}`;
    tag.style.cssText = `--c:${colour};left:-9999px;top:0;animation:none`;
    tag.onclick = () => {
      console.log('[slopscan]', hit.rule.id, '->', hit.evidence, hit.node.el);
      hit.node.el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    };
    layer.appendChild(tag);
    pending.push({ hit, tag, bx, by, delay, colour });
  }
  for (const p of pending) { p.w = p.tag.offsetWidth; p.h = p.tag.offsetHeight; }

  const placed = [];
  const freeAt = (x, y, w, h) => !placed.some(p =>
    x < p.x + p.w + 4 && x + w + 4 > p.x && y < p.y + p.h + 4 && y + h + 4 > p.y);

  for (const p of pending) {
    const rect = p.hit.node.rect;
    const slots = [];
    for (let k = 0; k < 7; k++) {
      slots.push([p.bx, p.by - p.h - 2 - k * (p.h + 2)]);
      slots.push([p.bx, p.by + rect.height + 3 + k * (p.h + 2)]);
    }
    slots.push([p.bx + Math.max(0, rect.width - p.w), p.by - p.h - 2], [p.bx + 4, p.by + 4]);
    const spot = slots.find(([x, y]) => y >= 0 && freeAt(x, y, p.w, p.h));
    if (!spot) { p.tag.remove(); continue; }   // no room: keep the box, drop the label
    placed.push({ x: spot[0], y: spot[1], w: p.w, h: p.h });
    p.tag.style.cssText = `--c:${p.colour};--d:${p.delay}ms;left:${spot[0]}px;top:${spot[1]}px`;
  }

  return { layer, style, sweep };
}
