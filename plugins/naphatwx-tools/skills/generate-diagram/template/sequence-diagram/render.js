// Draws sequence diagrams defined in sibling files (one flow per file) as inline SVG: <div class="seq" data-flow="NN-slug">.
// Steps: phase | call | ret | hot | note | alt | else | opt | loop | end. Labels are the name only (≤ 40 chars, or one bare name);
// an optional last `detail` string shows on hover and in the "Step details" list drawn after the .seq box.

var SeqDiagrams = (function () {
    const flows = {};
    const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    const define = (id, spec) => { flows[id] = spec; };
    const MAX = 40;
    // Text is 14px; widths are estimated per character (mono, sans, bold sans), on the wide side.
    const MONO = 8.6, SANS = 7.9, BOLD = 8.8, NUM = 24;

    function svg(id, { title = id, actors, steps, gap = 160 }) {
        const TOP = 16, HEAD = 52;
        const idx = Object.fromEntries(actors.map(([k], i) => [k, i]));
        const aw = actors.map(([, name, sub = '']) => Math.round(Math.max(118, sub.length * SANS + 24, name.length * BOLD + 24)));
        // gap is the minimum; a pair spreads apart until its actor boxes and the message labels between them fit
        const gaps = aw.slice(1).map((w, i) => Math.max(gap, (aw[i] + w) / 2 + 16));
        for (const [kind, a, b, label] of steps) {
            if (!['call', 'ret', 'hot'].includes(kind)) continue;
            const lo = Math.min(idx[a], idx[b]), hi = Math.max(idx[a], idx[b]);
            // NUM: the step number shares the label's row, at the arrow's left end
            const span = gaps.slice(lo, hi).reduce((s, g) => s + g, 0), need = label.length * MONO + NUM + 28;
            for (let i = lo; i < hi && span < need; i++) gaps[i] += (need - span) / (hi - lo);
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
                const x1 = X[a], x2 = X[b], d = x2 > x1 ? 1 : -1;
                const cls = { call: 'msg', ret: 'msg ret', hot: 'msg hot' }[kind];
                const ah = { call: 'ah', ret: 'ah ret', hot: 'ah hot' }[kind];
                const lw = label.length * MONO, lo = Math.min(x1, x2) + NUM + 4, hi = Math.max(x1, x2) - 6;
                const lx = Math.min(Math.max((lo + hi) / 2, lw / 2 + 6), W - lw / 2 - 6);
                num++;
                if (detail) details.push([num, label, detail]);
                body.push(`<g class="step">${tip(detail)}<line class="${cls}" x1="${x1}" y1="${y}" x2="${x2 - d * 8}" y2="${y}"/>`,
                    `<path class="${ah}" d="M${x2 - d},${y} l${-d * 9},-4.5 v9 z"/>`,
                    `<text class="lbl${kind === 'hot' ? ' hot' : ''}" x="${lx}" y="${y - 7}" text-anchor="middle">${esc(label)}</text>`,
                    `<text class="num" x="${Math.min(x1, x2) + 6}" y="${y - 7}">${num}</text></g>`);
                y += 30;
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
        const list = !details.length ? '' : `<div class="seq-steps"><p class="seq-steps-title">Step details · only steps with extra detail, by their number in the diagram</p><ol>${details.map(([n, label, d]) =>
            `<li><span class="n">${n === 'note' ? '·' : n}</span><code>${esc(label)}</code> ${esc(d)}</li>`).join('')}</ol></div>`;
        return [out.concat(body, '</svg>').join(''), list];
    }

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
        });
    }

    return { define, renderAll };
})();
