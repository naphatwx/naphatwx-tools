// Draws sequence diagrams defined in sibling files (one flow per file) as inline SVG: <div class="sequence" data-flow="NN-slug">.
// Steps: phase | call | ret | hot | note | alt | else | opt | loop | end; a call to itself (from = to) draws a loop.
// Labels are the name only (≤ 40 chars, or one bare name); an optional last `detail` shows on hover and in "Step details".

var SeqDiagrams = (function () {
    const flows = {};
    const escapeHtml = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    const define = (id, spec) => { flows[id] = spec; };
    const MAX_LABEL_LENGTH = 40;
    // Widths are estimated per character for 14px text (mono, sans, bold sans), on the wide side, for layout only;
    // fitDiagramLabels then sizes each label box to its rendered text. NUMBER_WIDTH: room for the step number left of the box.
    const MONO_CHAR_WIDTH = 8.6, SANS_CHAR_WIDTH = 7.9, BOLD_CHAR_WIDTH = 8.8, NUMBER_WIDTH = 24, LABEL_PADDING = 6, NUMBER_GAP = 4, LOOP_WIDTH = 36;

    function buildSvg(id, { title = id, actors, steps, gap = 160 }) {
        const TOP_MARGIN = 16, HEAD_HEIGHT = 52;
        const actorIndex = Object.fromEntries(actors.map(([actorId], i) => [actorId, i]));
        const actorWidths = actors.map(([, name, subtitle = '']) => Math.round(Math.max(118, subtitle.length * SANS_CHAR_WIDTH + 24, name.length * BOLD_CHAR_WIDTH + 24)));
        // gap is the minimum; a pair spreads apart until its actor boxes and the message labels between them fit
        const gaps = actorWidths.slice(1).map((actorWidth, i) => Math.max(gap, (actorWidths[i] + actorWidth) / 2 + 16));
        // a label centers on its arrow with the step number left of its box, so it needs that room on both sides
        const labelSideRoom = label => label.length * MONO_CHAR_WIDTH / 2 + LABEL_PADDING + NUMBER_GAP + NUMBER_WIDTH;
        for (const [kind, from, to, label] of steps) {
            if (!['call', 'ret', 'hot'].includes(kind)) continue;
            const fromIndex = actorIndex[from];
            if (from === to) { // self-call: the label centers on the loop, LOOP_WIDTH wide, right of the lifeline
                if (fromIndex < gaps.length) gaps[fromIndex] = Math.max(gaps[fromIndex], LOOP_WIDTH / 2 + labelSideRoom(label) + 8);
                if (fromIndex > 0) gaps[fromIndex - 1] = Math.max(gaps[fromIndex - 1], labelSideRoom(label) - LOOP_WIDTH / 2 + 8);
                continue;
            }
            const low = Math.min(fromIndex, actorIndex[to]), high = Math.max(fromIndex, actorIndex[to]);
            const span = gaps.slice(low, high).reduce((s, g) => s + g, 0), needed = 2 * labelSideRoom(label) + 16;
            for (let k = low; k < high && span < needed; k++) gaps[k] += (needed - span) / (high - low);
        }
        const actorPositions = [Math.round(Math.max(80, actorWidths[0] / 2 + 12))];
        gaps.forEach(g => actorPositions.push(Math.round(actorPositions[actorPositions.length - 1] + g)));
        const width = Math.round(actorPositions[actorPositions.length - 1] + Math.max(80, actorWidths[actorWidths.length - 1] / 2 + 12));
        const actorX = Object.fromEntries(actors.map(([actorId], i) => [actorId, actorPositions[i]]));
        const body = [], frames = [], stack = [], details = [];
        const titleTag = detail => detail ? `<title>${escapeHtml(detail)}</title>` : '';
        const warnIfLong = (kind, text) => { if (text.length > MAX_LABEL_LENGTH && /\s/.test(text)) console.warn(`[seq] ${kind} over ${MAX_LABEL_LENGTH} chars, move the rest to detail: ${text}`); };
        let y = TOP_MARGIN + HEAD_HEIGHT + 26, stepNumber = 0;
        for (const step of steps) {
            const [stepKind] = step;
            if (stepKind === 'phase') {
                y += 4;
                body.push(`<g class="phase"><line x1="8" x2="${width - 8}" y1="${y}" y2="${y}"/><rect x="8" y="${y - 12}" width="${Math.round(step[1].length * BOLD_CHAR_WIDTH + 20)}" height="24" rx="4"/><text x="18" y="${y + 5}">${escapeHtml(step[1])}</text></g>`);
                y += 34;
            } else if (stepKind === 'alt' || stepKind === 'opt' || stepKind === 'loop') {
                warnIfLong(stepKind, step[1]);
                stack.push({ kind: stepKind, cond: step[1], y0: y - 4, cuts: [], inset: 14 + stack.length * 10 });
                y += 36;
            } else if (stepKind === 'else') {
                warnIfLong('else', step[1]);
                stack[stack.length - 1].cuts.push([y - 4, step[1]]);
                y += 36;
            } else if (stepKind === 'end') {
                const frame = stack.pop(); frame.y1 = y - 12; frames.push(frame);
                y += 10;
            } else if (stepKind === 'note') {
                const [, from, text, to, detail] = step, target = to || from;
                warnIfLong('note', text);
                if (detail) details.push(['note', text, detail]);
                const noteWidth = Math.round(Math.max(text.length * MONO_CHAR_WIDTH + 24, Math.abs(actorX[target] - actorX[from]) + 60));
                const x = Math.min(Math.max((actorX[from] + actorX[target]) / 2, noteWidth / 2 + 8), width - noteWidth / 2 - 8);
                body.push(`<g class="note">${titleTag(detail)}<rect x="${x - noteWidth / 2}" y="${y - 12}" width="${noteWidth}" height="24" rx="4"/><text x="${x}" y="${y + 5}" text-anchor="middle">${escapeHtml(text)}</text></g>`);
                y += 34;
            } else { // call | ret | hot
                const [kind, from, to, label, detail] = step;
                warnIfLong(kind, label);
                const isSelfCall = from === to, x1 = actorX[from], x2 = isSelfCall ? x1 + LOOP_WIDTH : actorX[to], direction = x2 > x1 ? 1 : -1;
                const lineClass = { call: 'message', ret: 'message return', hot: 'message hot' }[kind];
                const arrowheadClass = { call: 'arrowhead', ret: 'arrowhead return', hot: 'arrowhead hot' }[kind];
                // centered on the arrow's midpoint (a self-call: on its loop), kept inside the drawing
                const labelWidth = label.length * MONO_CHAR_WIDTH, labelHalfWidth = labelWidth / 2 + LABEL_PADDING;
                const labelX = Math.round(Math.min(Math.max((x1 + x2) / 2, labelHalfWidth + NUMBER_GAP + NUMBER_WIDTH), width - labelHalfWidth - 6));
                stepNumber++;
                if (detail) details.push([stepNumber, label, detail]);
                body.push(`<g class="step">${titleTag(detail)}`, isSelfCall
                    ? `<path class="${lineClass}" d="M${x1},${y} H${x2} V${y + 16} H${x1 + 8}"/><path class="${arrowheadClass}" d="M${x1 + 1},${y + 16} l9,-4.5 v9 z"/>`
                    : `<line class="${lineClass}" x1="${x1}" y1="${y}" x2="${x2 - direction * 8}" y2="${y}"/><path class="${arrowheadClass}" d="M${x2 - direction},${y} l${-direction * 9},-4.5 v9 z"/>`,
                    `<g class="edge-label" data-cx="${labelX}"><rect class="edge-label-background" x="${labelX - labelHalfWidth}" y="${y - 20}" width="${2 * labelHalfWidth}" height="18" rx="3"/>`,
                    `<text class="label-text${kind === 'hot' ? ' hot' : ''}" x="${labelX}" y="${y - 7}" text-anchor="middle">${escapeHtml(label)}</text>`,
                    `<text class="number edge-label-number" x="${labelX - labelHalfWidth - NUMBER_GAP}" y="${y - 7}" text-anchor="end">${stepNumber}</text></g></g>`);
                y += isSelfCall ? 46 : 30;
            }
        }
        const height = y;
        // width / height are the 1:1 size: hosts never scale it, so 14px labels render at 14px; a wider box scrolls.
        const ariaName = `${title}: sequence diagram, ${actors.length} participants, ${stepNumber} steps`;
        const svgParts = [`<svg viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" role="img" aria-label="${escapeHtml(ariaName)}">`];
        actors.forEach(([actorId]) => svgParts.push(`<line class="lifeline" x1="${actorX[actorId]}" x2="${actorX[actorId]}" y1="${TOP_MARGIN + HEAD_HEIGHT}" y2="${height - 4}"/>`));
        for (const frame of frames) {
            const x0 = frame.inset, x1 = width - frame.inset, tabWidth = Math.round(frame.kind.length * BOLD_CHAR_WIDTH + 20);
            svgParts.push(`<g class="frame"><rect class="box" x="${x0}" y="${frame.y0}" width="${x1 - x0}" height="${frame.y1 - frame.y0}" rx="6"/><rect class="tab" x="${x0}" y="${frame.y0}" width="${tabWidth}" height="22" rx="4"/><text x="${x0 + 10}" y="${frame.y0 + 16}">${frame.kind}</text><text class="condition" x="${x0 + tabWidth + 8}" y="${frame.y0 + 16}">[${escapeHtml(frame.cond)}]</text>`);
            frame.cuts.forEach(([cutY, condition]) => svgParts.push(`<line x1="${x0}" x2="${x1}" y1="${cutY}" y2="${cutY}"/><text class="condition" x="${x0 + 8}" y="${cutY + 17}">[${escapeHtml(condition)}]</text>`));
            svgParts.push('</g>');
        }
        actors.forEach(([actorId, name, subtitle = ''], i) => {
            const actorWidth = actorWidths[i];
            svgParts.push(`<g class="actor"><rect x="${actorX[actorId] - actorWidth / 2}" y="${TOP_MARGIN}" width="${actorWidth}" height="${HEAD_HEIGHT}" rx="8"/><text x="${actorX[actorId]}" y="${TOP_MARGIN + 22}" text-anchor="middle">${escapeHtml(name)}</text><text class="subtitle" x="${actorX[actorId]}" y="${TOP_MARGIN + 41}" text-anchor="middle">${escapeHtml(subtitle)}</text></g>`);
        });
        // numbers are the diagram's own, so a list of 2, ·, 6 reads as a selection, not a gap
        const stepList = !details.length ? '' : `<div class="sequence-steps"><p class="label sequence-steps-title">Step details <span class="label-note">· only steps with extra detail, by their number in the diagram</span></p><ol>${details.map(([number, label, detail]) =>
            `<li><span class="number">${number === 'note' ? '·' : number}</span><code>${escapeHtml(label)}</code> ${escapeHtml(detail)}</li>`).join('')}</ol></div>`;
        return [svgParts.concat(body, '</svg>').join(''), stepList];
    }

    const watched = new WeakSet();
    function renderAll(root = document) {
        root.querySelectorAll('.sequence[data-flow]').forEach(element => {
            const spec = flows[element.dataset.flow];
            const [drawing, stepList] = spec ? buildSvg(element.dataset.flow, spec) : [`<p>Missing diagram file for <code>${escapeHtml(element.dataset.flow)}</code>.</p>`, ''];
            // a .sequence-legend inside the box stays, under the drawing
            const legend = element.querySelector(':scope > .sequence-legend');
            element.innerHTML = drawing;
            if (legend) element.append(legend);
            // the list sits on the page after the box, so zoom and the lightbox leave it out
            if (element.nextElementSibling?.classList.contains('sequence-steps')) element.nextElementSibling.remove();
            element.insertAdjacentHTML('afterend', stepList);
            // label boxes fit the rendered text; a hidden panel measures 0, so fit again once it gets a size
            fitDiagramLabels(element);
            if (!watched.has(element)) { watched.add(element); new ResizeObserver(() => fitDiagramLabels(element)).observe(element); }
        });
        document.fonts?.ready.then(() => root.querySelectorAll('.sequence[data-flow]').forEach(element => fitDiagramLabels(element)));
    }

    /* theme:diagram-labels-js:start */
    /* Synced from theme/diagram-labels.js by theme/sync.mjs. Do not edit here. */
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
    /* theme:diagram-labels-js:end */

    return { define, renderAll };
})();
