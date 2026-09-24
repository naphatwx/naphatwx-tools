// Draws sequence diagrams defined in sibling files (one flow per file) as inline SVG: <div class="seq" data-flow="NN-slug">.
// Steps: phase | call | ret | hot | note | alt | else | opt | loop | end. Labels are the name only (≤ 40 chars);
// an optional last `detail` string shows on hover and in the "Step details" list under the diagram.

var SeqDiagrams = (function () {
    const flows = {};
    const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    const define = (id, spec) => { flows[id] = spec; };
    const MAX = 40;

    function svg({ actors, steps, gap = 160 }) {
        const margin = 80, TOP = 16, HEAD = 46;
        const W = margin * 2 + (actors.length - 1) * gap;
        const X = Object.fromEntries(actors.map(([k], i) => [k, margin + i * gap]));
        const body = [], frames = [], stack = [], details = [];
        const tip = d => d ? `<title>${esc(d)}</title>` : '';
        const long = (kind, text) => { if (text.length > MAX) console.warn(`[seq] ${kind} over ${MAX} chars, move the rest to detail: ${text}`); };
        let y = TOP + HEAD + 26, num = 0;
        for (const s of steps) {
            const [t] = s;
            if (t === 'phase') {
                y += 6;
                body.push(`<g class="phase"><line x1="8" x2="${W - 8}" y1="${y}" y2="${y}"/><rect x="8" y="${y - 10}" width="${s[1].length * 7 + 18}" height="20" rx="4"/><text x="17" y="${y + 4}">${esc(s[1].toUpperCase())}</text></g>`);
                y += 30;
            } else if (t === 'alt' || t === 'opt' || t === 'loop') {
                long(t, s[1]);
                stack.push({ kind: t, cond: s[1], y0: y - 4, cuts: [], inset: 14 + stack.length * 10 });
                y += 34;
            } else if (t === 'else') {
                long('else', s[1]);
                stack[stack.length - 1].cuts.push([y - 4, s[1]]);
                y += 30;
            } else if (t === 'end') {
                const f = stack.pop(); f.y1 = y - 8; frames.push(f);
                y += 12;
            } else if (t === 'note') {
                const [, a, text, to, detail] = s, b = to || a;
                long('note', text);
                if (detail) details.push(['note', text, detail]);
                const w = Math.max(text.length * 6.1 + 22, Math.abs(X[b] - X[a]) + 60);
                const x = Math.min(Math.max((X[a] + X[b]) / 2, w / 2 + 8), W - w / 2 - 8);
                body.push(`<g class="note">${tip(detail)}<rect x="${x - w / 2}" y="${y - 13}" width="${w}" height="22" rx="4"/><text x="${x}" y="${y + 2}" text-anchor="middle">${esc(text)}</text></g>`);
                y += 32;
            } else { // call | ret | hot
                const [kind, a, b, label, detail] = s;
                long(kind, label);
                const x1 = X[a], x2 = X[b], d = x2 > x1 ? 1 : -1;
                const cls = { call: 'msg', ret: 'msg ret', hot: 'msg hot' }[kind];
                const ah = { call: 'ah', ret: 'ah ret', hot: 'ah hot' }[kind];
                const lw = label.length * 6.6;
                const lx = Math.min(Math.max((x1 + x2) / 2, lw / 2 + 6), W - lw / 2 - 6);
                num++;
                if (detail) details.push([num, label, detail]);
                body.push(`<g class="step">${tip(detail)}<line class="${cls}" x1="${x1}" y1="${y}" x2="${x2 - d * 8}" y2="${y}"/>`,
                    `<path class="${ah}" d="M${x2 - d},${y} l${-d * 9},-4.5 v9 z"/>`,
                    `<text class="lbl${kind === 'hot' ? ' hot' : ''}" x="${lx}" y="${y - 6}" text-anchor="middle">${esc(label)}</text>`,
                    `<text class="num" x="${Math.min(x1, x2) + 6}" y="${y + 13}">${num}</text></g>`);
                y += 34;
            }
        }
        const H = y + 8;
        const out = [`<svg viewBox="0 0 ${W} ${H}" style="max-width:${W}px" role="img">`];
        actors.forEach(([k]) => out.push(`<line class="life" x1="${X[k]}" x2="${X[k]}" y1="${TOP + HEAD}" y2="${H - 4}"/>`));
        for (const f of frames) {
            const x0 = f.inset, x1 = W - f.inset, tabw = f.kind.length * 8 + 16;
            out.push(`<g class="frame"><rect class="box" x="${x0}" y="${f.y0}" width="${x1 - x0}" height="${f.y1 - f.y0}" rx="6"/><rect class="tab" x="${x0}" y="${f.y0}" width="${tabw}" height="20" rx="4"/><text x="${x0 + 8}" y="${f.y0 + 14}">${f.kind}</text><text class="cond" x="${x0 + tabw + 8}" y="${f.y0 + 14}">[${esc(f.cond)}]</text>`);
            f.cuts.forEach(([cy, cond]) => out.push(`<line x1="${x0}" x2="${x1}" y1="${cy}" y2="${cy}"/><text class="cond" x="${x0 + 8}" y="${cy + 15}">[${esc(cond)}]</text>`));
            out.push('</g>');
        }
        actors.forEach(([k, name, sub]) => {
            const w = Math.min(gap - 12, Math.max(118, sub.length * 6.2 + 20, name.length * 8 + 20));
            out.push(`<g class="actor"><rect x="${X[k] - w / 2}" y="${TOP}" width="${w}" height="${HEAD}" rx="8"/><text x="${X[k]}" y="${TOP + 20}" text-anchor="middle">${esc(name)}</text><text class="sub" x="${X[k]}" y="${TOP + 36}" text-anchor="middle">${esc(sub)}</text></g>`);
        });
        const list = !details.length ? '' : `<details class="seq-steps"><summary>Step details</summary><ol>${details.map(([n, label, d]) =>
            `<li><span class="n">${n === 'note' ? '·' : n}</span><code>${esc(label)}</code> ${esc(d)}</li>`).join('')}</ol></details>`;
        return out.concat(body, '</svg>', list).join('');
    }

    function renderAll(root = document) {
        root.querySelectorAll('.seq[data-flow]').forEach(el => {
            const spec = flows[el.dataset.flow];
            el.innerHTML = spec ? svg(spec) : `<p>Missing diagram file for <code>${esc(el.dataset.flow)}</code>.</p>`;
        });
    }

    return { define, renderAll };
})();
