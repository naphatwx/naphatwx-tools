const root = document.documentElement;

// ===== Text size picker (small 14 / medium 16 / large 18, remembers choice) =====
const fsButtons = [...document.querySelectorAll(".fs-btn")];
const savedFs = localStorage.getItem("docs-fs");
if (fsButtons.some(b => b.dataset.fs === savedFs)) root.setAttribute("data-fs", savedFs);
function paintFs() {
    const current = root.getAttribute("data-fs") || "medium";
    fsButtons.forEach(b => {
        b.classList.toggle("active", b.dataset.fs === current);
        b.setAttribute("aria-pressed", String(b.dataset.fs === current));
    });
}
paintFs();
fsButtons.forEach(b => b.addEventListener("click", () => {
    root.setAttribute("data-fs", b.dataset.fs);
    localStorage.setItem("docs-fs", b.dataset.fs);
    paintFs();
}));

// ===== Mobile sidebar (☰ opens the drawer; a nav click or a tap outside it closes it; a parent click keeps it open) =====
const sidebar = document.getElementById("sidebar");
const small = matchMedia("(max-width: 880px)");
const menuBtn = document.getElementById("menuBtn");
menuBtn?.addEventListener("click", () => sidebar.classList.toggle("open"));
sidebar.addEventListener("click", (e) => {
    if (e.target.matches(".nav-link:not(.nav-parent)")) sidebar.classList.remove("open");
});
document.addEventListener("click", (e) => {
    if (!sidebar.classList.contains("open") || sidebar.contains(e.target) || menuBtn?.contains(e.target)) return;
    sidebar.classList.remove("open");
});

// ===== Desktop sidebar collapse (edge button or "[" key, remembers choice) =====
const collapseBtn = document.getElementById("collapseBtn");
if (localStorage.getItem("docs-sidebar") === "collapsed") root.setAttribute("data-sidebar", "collapsed");
function paintCollapse() {
    const collapsed = root.getAttribute("data-sidebar") === "collapsed";
    const label = collapsed ? "Show sidebar" : "Hide sidebar";
    collapseBtn.setAttribute("aria-expanded", String(!collapsed));
    collapseBtn.setAttribute("aria-label", label);
    collapseBtn.title = label + " ( [ )";
}
function toggleCollapse() {
    if (small.matches) return sidebar.classList.toggle("open");
    const next = root.getAttribute("data-sidebar") === "collapsed" ? "expanded" : "collapsed";
    root.setAttribute("data-sidebar", next);
    localStorage.setItem("docs-sidebar", next);
    paintCollapse();
}
paintCollapse();
collapseBtn.addEventListener("click", toggleCollapse);
document.addEventListener("keydown", (e) => {
    const typing = e.target.closest("input, textarea, [contenteditable]");
    if (e.key === "[" && !typing && !e.metaKey && !e.ctrlKey && !e.altKey) toggleCollapse();
});

// ===== Sidebar accordion (a parent click jumps to its section and toggles its sub-links; any other link closes the rest) =====
const trees = [...document.querySelectorAll(".nav-tree")];
const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)");
const isTreeOpen = (tree) => tree.querySelector(".nav-parent").getAttribute("aria-expanded") === "true";
// aria-expanded is the state; `hidden` lags it until a close animation ends, so a mid-animation flip stays correct
function setTreeOpen(tree, open, animate = true) {
    if (isTreeOpen(tree) === open) return;
    const kids = tree.querySelector(".nav-children");
    tree.querySelector(".nav-parent").setAttribute("aria-expanded", String(open));
    kids.getAnimations({ subtree: true }).forEach(a => a.cancel());
    if (!animate || reduceMotion.matches) { kids.hidden = !open; return; }
    kids.hidden = false;
    // the list grows from 0 while its links slide down from above, riding the bottom edge (reverse to close)
    const h = kids.scrollHeight;
    const timing = { duration: 250, easing: "cubic-bezier(0.2, 0, 0, 1)" };
    const dir = (shut, full) => (open ? [shut, full] : [full, shut]);
    const anim = kids.animate(dir(
        { height: "0px", marginTop: "0px", marginBottom: "0px" },
        { height: h + "px", marginTop: "2px", marginBottom: "4px" }), timing);
    [...kids.children].forEach(l => l.animate(dir(
        { transform: `translateY(-${h}px)`, opacity: 0 },
        { transform: "translateY(0)", opacity: 1 }), timing));
    if (!open) anim.onfinish = () => { kids.hidden = true; };
}
trees.forEach(t => t.querySelector(".nav-parent").addEventListener("click", () => {
    const open = !isTreeOpen(t);
    trees.forEach(o => setTreeOpen(o, o === t && open));
}));
// any other in-page link closes every section except the one it sits in
document.querySelectorAll('.nav-link:not(.nav-parent)[href^="#"]').forEach(l => l.addEventListener("click", () => {
    const own = l.closest(".nav-tree");
    trees.forEach(t => setTreeOpen(t, t === own));
}));
// opened from a sub-link URL (#api-…) → start with its section open
const startTree = [...document.querySelectorAll(".nav-children .nav-link")]
    .find(l => l.getAttribute("href") === location.hash)?.closest(".nav-tree");
if (startTree) setTreeOpen(startTree, true, false);

// ===== Active section highlight on scroll =====
// Active = the last section whose top has passed just under the top bar (the last one at the page bottom).
// A clicked link stays active until the user scrolls again, so a section that can't reach the top still lights up.
const links = [...document.querySelectorAll(".nav-link")];
const byId = new Map(links.map(l => [l.getAttribute("href").slice(1), l]));
const headings = [...document.querySelectorAll(".content [id]")]
    .filter(h => byId.has(h.id));
const setActive = (link) => {
    links.forEach(l => l.classList.toggle("active", l === link));
};
let pinned = false;
function spy() {
    if (pinned) return;
    const atBottom = innerHeight + scrollY >= document.documentElement.scrollHeight - 2;
    const passed = headings.filter(h => h.getBoundingClientRect().top <= 80);
    const h = atBottom ? headings[headings.length - 1] : passed[passed.length - 1] || headings[0];
    setActive(byId.get(h?.id));
}
links.forEach(l => l.addEventListener("click", () => {
    if (!l.getAttribute("href").startsWith("#")) return;
    pinned = true;
    setActive(l);
}));
["wheel", "touchstart", "keydown"].forEach(ev => addEventListener(ev, () => { pinned = false; }, { passive: true }));
addEventListener("scroll", spy, { passive: true });
spy();

// ===== Show / hide every flowchart and sequence diagram at once (remembers choice) =====
const diagramAll = document.getElementById("diagramAll");
const toggles = [...document.querySelectorAll(".diagram-toggle")];
const paintDiagramAll = () => {
    if (diagramAll) diagramAll.textContent = toggles.every(d => d.open) ? "Hide all diagrams" : "Show all diagrams";
};
toggles.forEach(d => d.addEventListener("toggle", paintDiagramAll));
if (localStorage.getItem("docs-diagrams") === "open") toggles.forEach(d => { d.open = true; });
diagramAll?.addEventListener("click", () => {
    const open = !toggles.every(d => d.open);
    toggles.forEach(d => { d.open = open; });
    localStorage.setItem("docs-diagrams", open ? "open" : "closed");
});

// ===== Fit each diagram-design iframe to the height its file posts (works on file://) =====
window.addEventListener("message", (e) => {
    if (!e.data || e.data.type !== "diagram-height") return;
    const frame = [...document.querySelectorAll(".diagram-frame")].find(f => f.contentWindow === e.source);
    if (frame) frame.style.height = Math.ceil(e.data.height) + "px";
});

// ===== Diagram zoom (wheel over a diagram zooms at the cursor, drag pans, ↺ resets; switch remembers choice) =====
// ⛶ opens one diagram in a lightbox over the page, where zoom works even with the switch off.
// Runs on DOMContentLoaded so SeqDiagrams.renderAll() has already drawn every .seq.
const zoomToggle = document.getElementById("zoomToggle");
const zooms = [];
const zoomOn = () => root.getAttribute("data-zoom") === "on";
root.setAttribute("data-zoom", localStorage.getItem("docs-zoom") === "on" ? "on" : "off");
function paintZoomToggle() {
    const on = zoomOn();
    zoomToggle.classList.toggle("on", on);
    zoomToggle.setAttribute("aria-pressed", String(on));
    zoomToggle.textContent = on ? "Zoom: on" : "Zoom: off";
}
paintZoomToggle();
zoomToggle.addEventListener("click", () => {
    const next = zoomOn() ? "off" : "on";
    root.setAttribute("data-zoom", next);
    localStorage.setItem("docs-zoom", next);
    if (next === "off") zooms.forEach(z => z.reset());
    paintZoomToggle();
});

function makeZoomable(box) {
    const stage = document.createElement("div");
    stage.className = "zoom-stage";
    stage.append(...box.childNodes);
    box.append(stage);
    box.classList.add("zoomable");
    if (stage.querySelector("iframe")) box.insertAdjacentHTML("beforeend", '<div class="zoom-shield"></div>');
    const tools = document.createElement("div");
    tools.className = "zoom-tools";
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "zoom-reset";
    btn.title = "Reset zoom";
    const fsBtn = document.createElement("button");
    fsBtn.type = "button";
    fsBtn.className = "zoom-fullscreen";
    tools.append(btn, fsBtn);
    box.append(tools);

    const active = () => zoomOn() || box.classList.contains("in-lightbox");
    let s = 1, x = 0, y = 0;
    const paint = () => {
        stage.style.transform = s === 1 && !x && !y ? "" : `translate(${x}px, ${y}px) scale(${s})`;
        box.classList.toggle("zoomed", s !== 1 || x !== 0 || y !== 0);
        btn.textContent = `↺ ${Math.round(s * 100)}%`;
    };
    const reset = () => { s = 1; x = 0; y = 0; paint(); };
    paint();

    box.addEventListener("wheel", (e) => {
        if (!active()) return;
        e.preventDefault();
        const r = box.getBoundingClientRect();
        // from the stage's own corner: the lightbox centres the stage inside its frame
        const px = e.clientX - r.left - box.clientLeft - stage.offsetLeft;
        const py = e.clientY - r.top - box.clientTop - stage.offsetTop;
        const next = Math.min(5, Math.max(0.5, s * Math.exp(-e.deltaY * 0.0015)));
        // keep the point under the cursor fixed while scaling
        x = px - (px - x) * next / s;
        y = py - (py - y) * next / s;
        s = next;
        paint();
    }, { passive: false });

    // stop the browser's native image / SVG drag, which would grab the picture instead of panning it
    stage.querySelectorAll("img").forEach(img => { img.draggable = false; });
    box.addEventListener("dragstart", (e) => e.preventDefault());

    // a pan starts only after the pointer moves, so a plain click still reaches links and "Step details"
    let drag = null, dragged = false;
    box.addEventListener("pointerdown", (e) => {
        dragged = false;
        if (!active() || e.button !== 0 || e.target.closest(".zoom-tools") || !box.classList.contains("zoomed")) return;
        drag = { id: e.pointerId, cx: e.clientX, cy: e.clientY, sx: e.clientX - x, sy: e.clientY - y, on: false };
    });
    box.addEventListener("pointermove", (e) => {
        if (!drag || e.pointerId !== drag.id) return;
        if (!drag.on) {
            if (Math.hypot(e.clientX - drag.cx, e.clientY - drag.cy) < 4) return;
            drag.on = true;
            box.setPointerCapture(e.pointerId);
            box.classList.add("panning");
            getSelection().removeAllRanges();
        }
        x = e.clientX - drag.sx;
        y = e.clientY - drag.sy;
        paint();
    });
    const endDrag = () => { dragged = !!drag?.on; drag = null; box.classList.remove("panning"); };
    // swallow the click that ends a pan, so releasing over a summary does not toggle it
    box.addEventListener("click", (e) => {
        if (dragged) { e.stopPropagation(); e.preventDefault(); dragged = false; }
    }, true);
    box.addEventListener("pointerup", endDrag);
    box.addEventListener("pointercancel", endDrag);
    btn.addEventListener("click", reset);

    fsBtn.textContent = "⛶";
    fsBtn.title = "Open in lightbox";
    fsBtn.addEventListener("click", () => openLightbox(box, stage, reset));
    zooms.push({ reset });
}
// One shared <dialog>: the diagram moves into it while open (the top layer escapes .main's container), then back.
// Moving an iframe reloads it; its height reporter posts again, so it still fits.
const lightbox = document.createElement("dialog");
lightbox.className = "lightbox";
lightbox.innerHTML = '<button type="button" class="lightbox-close" title="Close (Esc)">✕</button><p class="lightbox-caption"></p>';
let lit = null;
function lightboxCaption(box) {
    const toggle = box.closest("details");
    let h = toggle;
    while (h && !/^H[2-4]$/.test(h.tagName)) h = h.previousElementSibling;
    const title = h ? [...h.childNodes].filter(n => !n.classList?.contains("meta")).map(n => n.textContent).join("").trim() : "";
    const kind = toggle?.querySelector(":scope > summary")?.textContent.trim() || "";
    return [title, kind].filter(Boolean).join(" — ");
}
function openLightbox(box, stage, reset) {
    // the frame is always 80% x 90% of the window; the diagram fits inside it, capped by height over its aspect
    const ratio = stage.offsetHeight / stage.offsetWidth || 1;
    const spot = document.createElement("div");
    spot.style.height = box.offsetHeight + "px";
    lightbox.querySelector(".lightbox-caption").textContent = lightboxCaption(box);
    box.replaceWith(spot);
    lightbox.insertBefore(box, lightbox.querySelector(".lightbox-caption"));
    box.classList.add("in-lightbox");
    reset();
    lit = { box, stage, spot, reset };
    lightbox.showModal();
    const cs = getComputedStyle(box);
    const roomW = box.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    const roomH = box.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
    stage.style.width = Math.min(roomW, roomH / ratio) + "px";
}
lightbox.addEventListener("close", () => {
    if (!lit) return;
    const { box, stage, spot, reset } = lit;
    lit = null;
    box.classList.remove("in-lightbox");
    stage.style.width = "";
    spot.replaceWith(box);
    reset();
});
lightbox.querySelector(".lightbox-close").addEventListener("click", () => lightbox.close());
// a click on the dim backdrop (the dialog itself, outside the diagram) closes it, like an image lightbox
lightbox.addEventListener("click", (e) => { if (e.target === lightbox) lightbox.close(); });

document.addEventListener("DOMContentLoaded", () => {
    document.body.append(lightbox);
    document.querySelectorAll(".flowchart, .seq").forEach(makeZoomable);
});

// ===== Sidebar search filter =====
document.getElementById("navSearch").addEventListener("input", (e) => {
    const q = e.target.value.toLowerCase().trim();
    links.forEach(l => {
        const hit = l.textContent.toLowerCase().includes(q);
        l.classList.toggle("hidden", q && !hit);
    });
    // keep a section visible and open while one of its sub-links matches
    trees.forEach(t => {
        const kids = [...t.querySelectorAll(".nav-children .nav-link")];
        const kidHit = q && kids.some(k => !k.classList.contains("hidden"));
        const head = t.querySelector(".nav-parent");
        if (kidHit) { head.classList.remove("hidden"); setTreeOpen(t, true); }
        t.classList.toggle("hidden", q && !kidHit && head.classList.contains("hidden"));
    });
});
