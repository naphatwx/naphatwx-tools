const root = document.documentElement;

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

// ===== Sidebar accordion (a parent click jumps to its section and toggles its sub-links; one open at a time) =====
const trees = [...document.querySelectorAll(".nav-tree")];
function setTreeOpen(tree, open) {
    tree.querySelector(".nav-children").hidden = !open;
    tree.querySelector(".nav-parent").setAttribute("aria-expanded", String(open));
}
trees.forEach(t => t.querySelector(".nav-parent").addEventListener("click", () => {
    const open = t.querySelector(".nav-children").hidden;
    trees.forEach(o => setTreeOpen(o, o === t && open));
}));
// opened from a sub-link URL (#api-…) → start with its section open
const startTree = [...document.querySelectorAll(".nav-children .nav-link")]
    .find(l => l.getAttribute("href") === location.hash)?.closest(".nav-tree");
if (startTree) setTreeOpen(startTree, true);

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

// ===== Show / hide every flowchart and sequence diagram at once =====
const diagramAll = document.getElementById("diagramAll");
const toggles = [...document.querySelectorAll(".diagram-toggle")];
const paintDiagramAll = () => {
    if (diagramAll) diagramAll.textContent = toggles.every(d => d.open) ? "Hide all diagrams" : "Show all diagrams";
};
toggles.forEach(d => d.addEventListener("toggle", paintDiagramAll));
diagramAll?.addEventListener("click", () => {
    const open = !toggles.every(d => d.open);
    toggles.forEach(d => { d.open = open; });
});

// ===== Fit each diagram-design iframe to the height its file posts (works on file://) =====
window.addEventListener("message", (e) => {
    if (!e.data || e.data.type !== "diagram-height") return;
    const frame = [...document.querySelectorAll(".diagram-frame")].find(f => f.contentWindow === e.source);
    if (frame) frame.style.height = Math.ceil(e.data.height) + "px";
});

// ===== Diagram zoom (wheel over a diagram zooms at the cursor, drag pans, ↺ resets; switch remembers choice) =====
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
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "zoom-reset";
    btn.title = "Reset zoom";
    box.append(btn);

    let s = 1, x = 0, y = 0;
    const paint = () => {
        stage.style.transform = s === 1 && !x && !y ? "" : `translate(${x}px, ${y}px) scale(${s})`;
        box.classList.toggle("zoomed", s !== 1 || x !== 0 || y !== 0);
        btn.textContent = `↺ ${Math.round(s * 100)}%`;
    };
    const reset = () => { s = 1; x = 0; y = 0; paint(); };
    paint();

    box.addEventListener("wheel", (e) => {
        if (!zoomOn()) return;
        e.preventDefault();
        const r = box.getBoundingClientRect();
        const px = e.clientX - r.left, py = e.clientY - r.top;
        const next = Math.min(5, Math.max(0.5, s * Math.exp(-e.deltaY * 0.0015)));
        // keep the point under the cursor fixed while scaling
        x = px - (px - x) * next / s;
        y = py - (py - y) * next / s;
        s = next;
        paint();
    }, { passive: false });

    let drag = null;
    box.addEventListener("pointerdown", (e) => {
        if (!zoomOn() || e.button !== 0 || e.target === btn || !box.classList.contains("zoomed")) return;
        drag = { id: e.pointerId, sx: e.clientX - x, sy: e.clientY - y };
        box.setPointerCapture(e.pointerId);
        box.classList.add("panning");
    });
    box.addEventListener("pointermove", (e) => {
        if (!drag || e.pointerId !== drag.id) return;
        x = e.clientX - drag.sx;
        y = e.clientY - drag.sy;
        paint();
    });
    const endDrag = () => { drag = null; box.classList.remove("panning"); };
    box.addEventListener("pointerup", endDrag);
    box.addEventListener("pointercancel", endDrag);
    btn.addEventListener("click", reset);
    zooms.push({ reset });
}
document.addEventListener("DOMContentLoaded", () => {
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
