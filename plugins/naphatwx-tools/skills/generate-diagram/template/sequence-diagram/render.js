// Draws sequence diagrams defined in sibling files (one flow per file) as inline SVG: <div class="seq" data-flow="NN-slug">.
// Steps: phase | call | ret | hot | note | alt | else | opt | loop | end; a call to itself (from = to) draws a loop.
// Labels are the name only (≤ 40 chars, or one bare name); an optional last `detail` shows on hover and in "Step details".

var SeqDiagrams = (function () {
    const flows = {};
    const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    const define = (id, spec) => { flows[id] = spec; };
    const MAX = 40;
    // Widths are estimated per character for 14px text (mono, sans, bold sans), on the wide side, for layout only;
    // fitDiagramLabels then sizes each label box to its rendered text. NUM: room for the step number left of the box.
    const MONO = 8.6, SANS = 7.9, BOLD = 8.8, NUM = 24, PAD = 6, GAP = 4, LOOP = 36;

    function svg(id, { title = id, actors, steps, gap = 160 }) {
        const TOP = 16, HEAD = 52;
        const idx = Object.fromEntries(actors.map(([k], i) => [k, i]));
        const aw = actors.map(([, name, sub = '']) => Math.round(Math.max(118, sub.length * SANS + 24, name.length * BOLD + 24)));
        // gap is the minimum; a pair spreads apart until its actor boxes and the message labels between them fit
        const gaps = aw.slice(1).map((w, i) => Math.max(gap, (aw[i] + w) / 2 + 16));
        // a label centers on its arrow with the step number left of its box, so it needs that room on both sides
        const side = label => label.length * MONO / 2 + PAD + GAP + NUM;
        for (const [kind, a, b, label] of steps) {
            if (!['call', 'ret', 'hot'].includes(kind)) continue;
            const i = idx[a];
            if (a === b) { // self-call: the label centers on the loop, LOOP wide, right of the lifeline
                if (i < gaps.length) gaps[i] = Math.max(gaps[i], LOOP / 2 + side(label) + 8);
                if (i > 0) gaps[i - 1] = Math.max(gaps[i - 1], side(label) - LOOP / 2 + 8);
                continue;
            }
            const lo = Math.min(i, idx[b]), hi = Math.max(i, idx[b]);
            const span = gaps.slice(lo, hi).reduce((s, g) => s + g, 0), need = 2 * side(label) + 16;
            for (let k = lo; k < hi && span < need; k++) gaps[k] += (need - span) / (hi - lo);
        }
        const xs = [Math.round(Math.max(80, aw[0] / 2 + 12))];
        gaps.forEach(g => xs.push(Math.round(xs[xs.length - 1] + g)));
        const W = Math.round(xs[xs.length - 1] + Math.max(80, aw[aw.length - 1] / 2 + 12));
        const X = Object.fromEntries(actors.map(([k], i) => [k, xs[i]]));
        const body = [], frames = [], stack = [], details = [];
        const tip = d => d ? `<title>${esc(d)}</title>` : '';
        const long = (kind, text) => { if (text.length > MAX && /\s/.test(text)) console.warn(`[seq] ${kind} over ${MAX} chars, move the rest to detail: ${text}`); };
        let y = TOP + HEAD + 26, num = 0;
        for (const s of steps) {
            const [t] = s;
            if (t === 'phase') {
                y += 4;
                body.push(`<g class="phase"><line x1="8" x2="${W - 8}" y1="${y}" y2="${y}"/><rect x="8" y="${y - 12}" width="${Math.round(s[1].length * BOLD + 20)}" height="24" rx="4"/><text x="18" y="${y + 5}">${esc(s[1])}</text></g>`);
                y += 34;
            } else if (t === 'alt' || t === 'opt' || t === 'loop') {
                long(t, s[1]);
                stack.push({ kind: t, cond: s[1], y0: y - 4, cuts: [], inset: 14 + stack.length * 10 });
                y += 36;
            } else if (t === 'else') {
                long('else', s[1]);
                stack[stack.length - 1].cuts.push([y - 4, s[1]]);
                y += 36;
            } else if (t === 'end') {
                const f = stack.pop(); f.y1 = y - 12; frames.push(f);
                y += 10;
            } else if (t === 'note') {
                const [, a, text, to, detail] = s, b = to || a;
                long('note', text);
                if (detail) details.push(['note', text, detail]);
                const w = Math.round(Math.max(text.length * MONO + 24, Math.abs(X[b] - X[a]) + 60));
                const x = Math.min(Math.max((X[a] + X[b]) / 2, w / 2 + 8), W - w / 2 - 8);
                body.push(`<g class="note">${tip(detail)}<rect x="${x - w / 2}" y="${y - 12}" width="${w}" height="24" rx="4"/><text x="${x}" y="${y + 5}" text-anchor="middle">${esc(text)}</text></g>`);
                y += 34;
            } else { // call | ret | hot
                const [kind, a, b, label, detail] = s;
                long(kind, label);
                const self = a === b, x1 = X[a], x2 = self ? x1 + LOOP : X[b], d = x2 > x1 ? 1 : -1;
                const cls = { call: 'msg', ret: 'msg ret', hot: 'msg hot' }[kind];
                const ah = { call: 'ah', ret: 'ah ret', hot: 'ah hot' }[kind];
                // centered on the arrow's midpoint (a self-call: on its loop), kept inside the drawing
                const lw = label.length * MONO, sw = lw / 2 + PAD;
                const lx = Math.round(Math.min(Math.max((x1 + x2) / 2, sw + GAP + NUM), W - sw - 6));
                num++;
                if (detail) details.push([num, label, detail]);
                body.push(`<g class="step">${tip(detail)}`, self
                    ? `<path class="${cls}" d="M${x1},${y} H${x2} V${y + 16} H${x1 + 8}"/><path class="${ah}" d="M${x1 + 1},${y + 16} l9,-4.5 v9 z"/>`
                    : `<line class="${cls}" x1="${x1}" y1="${y}" x2="${x2 - d * 8}" y2="${y}"/><path class="${ah}" d="M${x2 - d},${y} l${-d * 9},-4.5 v9 z"/>`,
                    `<g class="edge-label" data-cx="${lx}"><rect class="edge-label-bg" x="${lx - sw}" y="${y - 20}" width="${2 * sw}" height="18" rx="3"/>`,
                    `<text class="lbl${kind === 'hot' ? ' hot' : ''}" x="${lx}" y="${y - 7}" text-anchor="middle">${esc(label)}</text>`,
                    `<text class="num edge-label-num" x="${lx - sw - GAP}" y="${y - 7}" text-anchor="end">${num}</text></g></g>`);
                y += self ? 46 : 30;
            }
        }
        const H = y;
        // width / height are the 1:1 size: hosts never scale it, so 14px labels render at 14px; a wider box scrolls.
        const ariaName = `${title}: sequence diagram, ${actors.length} participants, ${num} steps`;
        const out = [`<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${esc(ariaName)}">`];
        actors.forEach(([k]) => out.push(`<line class="life" x1="${X[k]}" x2="${X[k]}" y1="${TOP + HEAD}" y2="${H - 4}"/>`));
        for (const f of frames) {
            const x0 = f.inset, x1 = W - f.inset, tabw = Math.round(f.kind.length * BOLD + 20);
            out.push(`<g class="frame"><rect class="box" x="${x0}" y="${f.y0}" width="${x1 - x0}" height="${f.y1 - f.y0}" rx="6"/><rect class="tab" x="${x0}" y="${f.y0}" width="${tabw}" height="22" rx="4"/><text x="${x0 + 10}" y="${f.y0 + 16}">${f.kind}</text><text class="cond" x="${x0 + tabw + 8}" y="${f.y0 + 16}">[${esc(f.cond)}]</text>`);
            f.cuts.forEach(([cy, cond]) => out.push(`<line x1="${x0}" x2="${x1}" y1="${cy}" y2="${cy}"/><text class="cond" x="${x0 + 8}" y="${cy + 17}">[${esc(cond)}]</text>`));
            out.push('</g>');
        }
        actors.forEach(([k, name, sub = ''], i) => {
            const w = aw[i];
            out.push(`<g class="actor"><rect x="${X[k] - w / 2}" y="${TOP}" width="${w}" height="${HEAD}" rx="8"/><text x="${X[k]}" y="${TOP + 22}" text-anchor="middle">${esc(name)}</text><text class="sub" x="${X[k]}" y="${TOP + 41}" text-anchor="middle">${esc(sub)}</text></g>`);
        });
        // numbers are the diagram's own, so a list of 2, ·, 6 reads as a selection, not a gap
        const list = !details.length ? '' : `<div class="seq-steps"><p class="label seq-steps-title">Step details · only steps with extra detail, by their number in the diagram</p><ol>${details.map(([n, label, d]) =>
            `<li><span class="n">${n === 'note' ? '·' : n}</span><code>${esc(label)}</code> ${esc(d)}</li>`).join('')}</ol></div>`;
        return [out.concat(body, '</svg>').join(''), list];
    }

    const watched = new WeakSet();
    function renderAll(root = document) {
        root.querySelectorAll('.seq[data-flow]').forEach(el => {
            const spec = flows[el.dataset.flow];
            const [drawing, list] = spec ? svg(el.dataset.flow, spec) : [`<p>Missing diagram file for <code>${esc(el.dataset.flow)}</code>.</p>`, ''];
            // a .seq-legend inside the box stays, under the drawing
            const legend = el.querySelector(':scope > .seq-legend');
            el.innerHTML = drawing;
            if (legend) el.append(legend);
            // the list sits on the page after the box, so zoom and the lightbox leave it out
            if (el.nextElementSibling?.classList.contains('seq-steps')) el.nextElementSibling.remove();
            el.insertAdjacentHTML('afterend', list);
            // label boxes fit the rendered text; a hidden panel measures 0, so fit again once it gets a size
            fitDiagramLabels(el);
            if (!watched.has(el)) { watched.add(el); new ResizeObserver(() => fitDiagramLabels(el)).observe(el); }
        });
        document.fonts?.ready.then(() => root.querySelectorAll('.seq[data-flow]').forEach(el => fitDiagramLabels(el)));
    }

    /* theme:diagram-labels-js:start */
    /* Synced from theme/diagram-labels.js by theme/sync.mjs. Do not edit here. */
    function fitDiagramLabels(root = document) {
        const PAD = 6, GAP = 4, r1 = n => Math.round(n * 10) / 10;
        let done = true;
        root.querySelectorAll('g.edge-label').forEach(g => {
            const text = g.querySelector(':scope > text');
            if (!text) return;
            const w = text.getComputedTextLength();
            // 0: not laid out yet (a hidden panel or frame), so the next call fits it
            if (!w) { done = false; return; }
            let cx = parseFloat(g.dataset.cx);
            if (Number.isNaN(cx)) {
                const x = text.x.baseVal[0]?.value || 0, anchor = getComputedStyle(text).textAnchor;
                cx = anchor === 'start' ? x + w / 2 : anchor === 'end' ? x - w / 2 : x;
            }
            text.setAttribute('x', r1(cx));
            text.setAttribute('text-anchor', 'middle');
            const left = cx - w / 2 - PAD;
            const bg = g.querySelector(':scope > .edge-label-bg');
            if (bg) { bg.setAttribute('x', r1(left)); bg.setAttribute('width', r1(w + 2 * PAD)); }
            const num = g.querySelector(':scope > .edge-label-num');
            if (num) {
                num.removeAttribute('transform');
                try {
                    const b = num.getBBox();
                    num.setAttribute('transform', `translate(${r1(left - GAP - (b.x + b.width))} 0)`);
                } catch { done = false; }
            }
        });
        return done;
    }
    /* theme:diagram-labels-js:end */

    return { define, renderAll };
})();
