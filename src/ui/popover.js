import { SEV_COLOR, SEV_NAME, SEV_DESC } from '../lib/severity.js';

// One card at a time, anchored under the label that opened it. Built with
// textContent only: evidence quotes page text, which must never become markup.
export function makePopover(NS, layer) {
  let card = null, owner = null;

  const el = (tag, cls, text) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  };
  const describe = node => {
    const cls = String(node.el.className || '').trim().split(/\s+/).filter(Boolean).slice(0, 2);
    return node.tag.toLowerCase() + cls.map(c => '.' + c).join('');
  };

  function close() {
    if (!card) return false;
    card.remove(); card = null; owner = null;
    return true;
  }

  function open(hit, tag) {
    if (owner === tag) { close(); return; }
    close();
    const { rule, node, evidence } = hit, colour = SEV_COLOR[rule.severity];
    card = el('div', 'ss-pop');
    card.id = NS + 'pop';
    card.style.setProperty('--c', colour);

    const head = el('div', 'ss-pop-head');
    head.append(el('span', 'ss-pop-sev', SEV_NAME[rule.severity]), el('span', 'ss-pop-desc', SEV_DESC[rule.severity]));
    const found = el('div', 'ss-pop-found');
    found.append(el('span', null, 'found'), el('span', null, evidence));
    const foot = el('div', 'ss-pop-foot');
    const log = el('button', null, 'log element');
    log.onclick = () => console.log('[slopscan]', rule.id, '->', evidence, node.el);
    foot.append(el('code', null, `${rule.id} · ${describe(node)}`), log);
    card.append(head, el('div', 'ss-pop-title', rule.label), el('p', 'ss-pop-why', rule.why), found, foot);
    layer.appendChild(card);

    // under the label, flipped above when it would run off the bottom; clamped to the viewport
    const t = tag.getBoundingClientRect(), w = card.offsetWidth, h = card.offsetHeight;
    const left = Math.max(8, Math.min(t.left, window.innerWidth - w - 8));
    const top = t.bottom + 6 + h > window.innerHeight && t.top > h + 6 ? t.top - h - 6 : t.bottom + 6;
    card.style.left = left + window.scrollX + 'px';
    card.style.top = top + window.scrollY + 'px';
    owner = tag;
  }

  const onDown = e => { if (card && !card.contains(e.target) && e.target !== owner) close(); };
  document.addEventListener('mousedown', onDown, true);
  const dispose = () => document.removeEventListener('mousedown', onDown, true);

  return { open, close, dispose };
}
