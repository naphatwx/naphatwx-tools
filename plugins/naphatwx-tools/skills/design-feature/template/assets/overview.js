// ===== Theme toggle (default dark, remembers choice) =====
const root = document.documentElement;
const toggle = document.getElementById("themeToggle");
const saved = localStorage.getItem("docs-theme");
if (saved) root.setAttribute("data-theme", saved);
function paintToggle() {
    toggle.textContent = root.getAttribute("data-theme") === "light" ? "☀️" : "🌙";
}
paintToggle();
toggle.addEventListener("click", () => {
    const next = root.getAttribute("data-theme") === "light" ? "dark" : "light";
    root.setAttribute("data-theme", next);
    localStorage.setItem("docs-theme", next);
    paintToggle();
});

// ===== Base font size (small 14 / normal 16 / big 18, remembers choice) =====
const fsButtons = [...document.querySelectorAll(".fs-btn")];
const savedFs = localStorage.getItem("docs-fs");
if (savedFs && fsButtons.some(b => b.dataset.fs === savedFs)) root.setAttribute("data-fs", savedFs);
function paintFs() {
    const current = root.getAttribute("data-fs") || "normal";
    fsButtons.forEach(b => b.classList.toggle("active", b.dataset.fs === current));
}
paintFs();
fsButtons.forEach(b => b.addEventListener("click", () => {
    root.setAttribute("data-fs", b.dataset.fs);
    localStorage.setItem("docs-fs", b.dataset.fs);
    paintFs();
}));

// ===== Mobile sidebar (☰ opens the drawer; a nav click or a tap outside it closes it) =====
const sidebar = document.getElementById("sidebar");
const small = matchMedia("(max-width: 880px)");
const menuBtn = document.getElementById("menuBtn");
menuBtn?.addEventListener("click", () => sidebar.classList.toggle("open"));
sidebar.addEventListener("click", (e) => {
    if (e.target.classList.contains("nav-link")) sidebar.classList.remove("open");
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

// ===== Active section highlight on scroll =====
const links = [...document.querySelectorAll(".nav-link")];
const byId = new Map(links.map(l => [l.getAttribute("href").slice(1), l]));
const headings = [...document.querySelectorAll(".content h1, .content h2, .content h3")]
    .filter(h => byId.has(h.id));
const obs = new IntersectionObserver((entries) => {
    entries.forEach(e => {
        if (e.isIntersecting) {
            links.forEach(l => l.classList.remove("active"));
            byId.get(e.target.id)?.classList.add("active");
        }
    });
}, { rootMargin: "-10% 0px -80% 0px" });
headings.forEach(h => obs.observe(h));

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
root.setAttribute("data-zoom", localStorage.getItem("docs-zoom") === "off" ? "off" : "on");
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
});
