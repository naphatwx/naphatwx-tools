/* One diagram page: Export PDF, labels fitted to their text, each SVG at 1:1, and the embed contract with a host page
   (design-feature's overview.html). Embedded, it hides the file's .eyebrow and h1 and posts {type: "diagram-height", height, width}
   on every resize (postMessage works on file://). Needs addExportPdf (pdf.js), addFontSize (font-size.js) and fitDiagramLabels (diagram-labels.js).
   The text size picker shows only when the file is opened on its own; embedded, the frame follows the host's choice. */
(function () {
    const embedded = parent !== window;
    const style = document.createElement('style');
    // Embedded, the bottom padding stays: the fixed Export PDF bar sits in it, under the drawing.
    // Print: each drawing shrinks to the page width instead of being cut off.
    // Scrollbars as in base.css: diagram-design files carry only this kit, not base.css; thin or a scrollbar-color would turn off Chrome's 12px bar
    style.textContent = `@supports not selector(::-webkit-scrollbar) { * { scrollbar-width: auto; scrollbar-color: var(--line-3) transparent; } }
        ::-webkit-scrollbar { width: 12px; height: 12px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: var(--line-3); border-radius: var(--radius-md); }
        ::-webkit-scrollbar-thumb:hover { background: var(--text-3); }
        .embedded body { padding: 1rem 1rem var(--float-space, 1rem); }
        .embedded .eyebrow, .embedded h1 { display: none; }
        @media print { svg[viewBox]:not(svg svg) { max-width: 100% !important; height: auto !important; } }`;
    document.head.append(style);
    if (embedded) { document.documentElement.classList.add('embedded'); document.documentElement.style.overflowY = 'hidden'; }
    // Each diagram draws at its viewBox width, never scaled, so labels render at their own size; a narrow frame scrolls it sideways.
    const svgs = [...document.querySelectorAll('svg[viewBox]:not(svg svg)')];
    svgs.forEach(svg => {
        Object.assign(svg.style, { width: svg.viewBox.baseVal.width + 'px', maxWidth: 'none', height: 'auto' });
        if (getComputedStyle(svg.parentElement).overflowX === 'auto') return;
        const box = document.createElement('div');
        box.style.overflowX = 'auto';
        svg.before(box);
        box.append(svg);
    });
    if (!embedded) addFontSize();
    addExportPdf();
    // height: the body's box, padding included, not documentElement, whose scrollHeight never drops below the frame's height;
    // width: the widest drawing at 1:1 plus padding, so a lightbox can show it whole, scaled
    const postSize = () => {
        if (!embedded) return;
        const bodyStyle = getComputedStyle(document.body);
        const width = Math.max(0, ...svgs.map(s => s.viewBox.baseVal.width)) + parseFloat(bodyStyle.paddingLeft) + parseFloat(bodyStyle.paddingRight);
        parent.postMessage({ type: 'diagram-height', height: document.body.getBoundingClientRect().height, width }, '*');
    };
    const refresh = () => { fitDiagramLabels(); postSize(); };
    addEventListener('load', refresh);
    document.fonts?.ready.then(refresh);
    new ResizeObserver(refresh).observe(document.body);
})();
