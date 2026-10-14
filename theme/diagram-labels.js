/* Fits every diagram label to its rendered text, so no box is guessed from a character count.
   Markup: <g class="edge-label" data-cx="X"><rect class="edge-label-bg"/><text>…</text><g class="edge-label-num">…</g></g>
   The text centers on data-cx (the line's midpoint), the box fits the text, the step badge sits just left of the box. */
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
