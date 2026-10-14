/* Fits every diagram label to its rendered text, so no box is guessed from a character count.
   Markup: <g class="edge-label" data-cx="X"><rect class="edge-label-background"/><text>…</text><g class="edge-label-number">…</g></g>
   The text centers on data-cx (the line's midpoint), the box fits the text, the step badge sits just left of the box. */
function fitDiagramLabels(root = document) {
    const PAD = 6, GAP = 4, roundTo1 = value => Math.round(value * 10) / 10;
    let done = true;
    root.querySelectorAll('g.edge-label').forEach(group => {
        const text = group.querySelector(':scope > text');
        if (!text) return;
        const width = text.getComputedTextLength();
        // 0: not laid out yet (a hidden panel or frame), so the next call fits it
        if (!width) { done = false; return; }
        let centerX = parseFloat(group.dataset.cx);
        if (Number.isNaN(centerX)) {
            const x = text.x.baseVal[0]?.value || 0, anchor = getComputedStyle(text).textAnchor;
            centerX = anchor === 'start' ? x + width / 2 : anchor === 'end' ? x - width / 2 : x;
        }
        text.setAttribute('x', roundTo1(centerX));
        text.setAttribute('text-anchor', 'middle');
        const left = centerX - width / 2 - PAD;
        const background = group.querySelector(':scope > .edge-label-background');
        if (background) { background.setAttribute('x', roundTo1(left)); background.setAttribute('width', roundTo1(width + 2 * PAD)); }
        const badge = group.querySelector(':scope > .edge-label-number');
        if (badge) {
            badge.removeAttribute('transform');
            try {
                const box = badge.getBBox();
                badge.setAttribute('transform', `translate(${roundTo1(left - GAP - (box.x + box.width))} 0)`);
            } catch { done = false; }
        }
    });
    return done;
}
