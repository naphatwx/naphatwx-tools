const root = document.documentElement;
const typing = (e) => e.target.closest("input, textarea, select, [contenteditable]");
const bare = (e) => !e.metaKey && !e.ctrlKey && !e.altKey;
const store = {
    get: (k) => { try { return localStorage.getItem(k); } catch { return null; } },
    set: (k, v) => { try { localStorage.setItem(k, v); } catch { /* private window */ } },
};

// ===== Rail: always open; the edge button or "[" hides it (remembered). On phones ☰ opens it as a drawer. =====
const rail = document.getElementById("rail");
const railEdge = document.getElementById("railEdge");
const small = matchMedia("(max-width: 880px)");
function setCollapsed(on, remember = true) {
    if (on) root.setAttribute("data-rail", "collapsed"); else root.removeAttribute("data-rail");
    const label = on ? "Show index" : "Hide index";
    railEdge.setAttribute("aria-expanded", String(!on));
    railEdge.setAttribute("aria-label", label);
    railEdge.title = label + " ( [ )";
    if (remember) store.set("plan-rail", on ? "collapsed" : "");
}
setCollapsed(store.get("plan-rail") === "collapsed", false);
const collapsed = () => root.getAttribute("data-rail") === "collapsed";
const setDrawer = (on) => on ? root.setAttribute("data-drawer", "open") : root.removeAttribute("data-drawer");
function toggleRail() { small.matches ? setDrawer(!root.hasAttribute("data-drawer")) : setCollapsed(!collapsed()); }
railEdge.addEventListener("click", toggleRail);
document.getElementById("menuBtn").addEventListener("click", () => setDrawer(true));
rail.addEventListener("click", (e) => { if (small.matches && e.target.closest("a")) setDrawer(false); });
document.addEventListener("click", (e) => {
    if (root.hasAttribute("data-drawer") && !rail.contains(e.target) && !e.target.closest("#menuBtn")) setDrawer(false);
});

// ===== Search ("/" focuses it): filters rail links, keeps a parent visible while a child matches =====
const search = document.getElementById("railSearch");
const railLinks = [...rail.querySelectorAll(".rail-list a")];
search.addEventListener("input", () => {
    const q = search.value.toLowerCase().trim();
    railLinks.forEach(a => a.classList.toggle("hidden", !!q && !a.textContent.toLowerCase().includes(q)));
    rail.querySelectorAll(".rail-list > li").forEach(li => {
        const kidHit = [...li.querySelectorAll("ol a")].some(a => !a.classList.contains("hidden"));
        if (kidHit) li.querySelector(":scope > a").classList.remove("hidden");
    });
});
search.addEventListener("keydown", (e) => {
    if (e.key === "Enter") rail.querySelector(".rail-list a:not(.hidden)")?.click();
    if (e.key === "Escape") { search.value = ""; search.dispatchEvent(new Event("input")); search.blur(); }
});

// ===== Active link on scroll: the last target whose top passed 120px; a clicked link wins until the next scroll gesture =====
const byId = new Map(railLinks.map(a => [a.getAttribute("href").slice(1), a]));
const targets = [...byId.keys()].map(id => document.getElementById(id)).filter(Boolean);
let pinnedLink = null;
const setActive = (a) => railLinks.forEach(l => l.classList.toggle("active", l === a));
function spy() {
    if (pinnedLink) return;
    const atBottom = innerHeight + scrollY >= root.scrollHeight - 2;
    const passed = targets.filter(t => t.offsetParent && t.getBoundingClientRect().top <= 120);
    const t = atBottom ? targets[targets.length - 1] : passed[passed.length - 1] || targets[0];
    setActive(byId.get(t?.id));
}
railLinks.forEach(a => a.addEventListener("click", () => { pinnedLink = a; setActive(a); }));
["wheel", "touchstart", "keydown"].forEach(ev => addEventListener(ev, () => { pinnedLink = null; }, { passive: true }));
addEventListener("scroll", spy, { passive: true });
spy();

// ===== Flow views: one panel at a time, all closed at first; clicking the open tab closes it =====
const flows = [...document.querySelectorAll(".flow")];
function selectView(tab, force) {
    const list = tab.closest("[role=tablist]");
    const open = force ?? tab.getAttribute("aria-selected") !== "true";
    list.querySelectorAll("[role=tab]").forEach(t => {
        const on = open && t === tab;
        t.setAttribute("aria-selected", String(on));
        const panel = document.getElementById(t.getAttribute("aria-controls"));
        if (!panel) return;
        const was = !panel.hidden;
        panel.hidden = !on;
        if (on && !was) { panel.classList.remove("entering"); void panel.offsetWidth; panel.classList.add("entering"); }
    });
}
document.querySelectorAll("[role=tab]").forEach(tab => {
    const panel = document.getElementById(tab.getAttribute("aria-controls"));
    if (panel) panel.dataset.label = tab.textContent.trim();
    tab.addEventListener("click", () => selectView(tab));
    tab.addEventListener("keydown", (e) => {
        if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
        e.stopPropagation();
        const tabs = [...tab.parentElement.querySelectorAll("[role=tab]:not(:disabled)")];
        const next = tabs[(tabs.indexOf(tab) + (e.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length];
        next.focus();
    });
});
document.querySelectorAll(".panel").forEach(p => p.addEventListener("animationend", () => p.classList.remove("entering")));
// the flow a 1/2/3 key acts on: the current slide when presenting, else the flow nearest the top of the screen
function flowInView() {
    if (presenting()) return steps[current]?.slide.classList.contains("flow") ? steps[current].slide : null;
    let best = null;
    for (const f of flows) { if (f.getBoundingClientRect().top < innerHeight * 0.5) best = f; }
    return best && best.getBoundingClientRect().bottom > 0 ? best : null;
}

// ===== Open all: shows every flow view stacked (remembered) =====
const openAll = document.getElementById("openAll");
function setAll(on) {
    root.setAttribute("data-all", on ? "on" : "off");
    openAll.setAttribute("aria-pressed", String(on));
    openAll.textContent = on ? "Close all" : "Open all";
    store.set("plan-all", on ? "on" : "off");
}
setAll(store.get("plan-all") === "on");
openAll.addEventListener("click", () => setAll(root.getAttribute("data-all") !== "on"));

// ===== Present: one step per screen. A flow gives one step per view; an API section one per RPC.
// Long steps scroll down; nothing scrolls sideways. ← → or Space step, Esc leaves.
const slides = [...document.querySelectorAll(".slide")];
const hud = document.getElementById("hud");
const hudLabel = document.getElementById("hudLabel");
const presentBtn = document.getElementById("presentBtn");
const steps = slides.flatMap(slide => {
    const title = slide.dataset.title;
    const tabs = [...slide.querySelectorAll("[role=tab]:not(:disabled)")];
    if (tabs.length) return tabs.map(tab => ({ slide, tab, label: `${title} · ${tab.textContent.trim()}` }));
    const parts = [...slide.querySelectorAll(":scope > [data-part]")];
    if (parts.length) return [{ slide, part: null, label: title },
        ...parts.map(part => ({ slide, part, label: `${title} · ${part.dataset.part}` }))];
    return [{ slide, label: title }];
});
let current = 0;
const presenting = () => root.getAttribute("data-present") === "on";
function show(i) {
    current = Math.max(0, Math.min(steps.length - 1, i));
    const step = steps[current];
    slides.forEach(s => s.classList.toggle("current", s === step.slide));
    step.slide.querySelectorAll(".step-off").forEach(el => el.classList.remove("step-off"));
    if (step.tab) selectView(step.tab, true);
    if ("part" in step) {
        [...step.slide.children].forEach(el => {
            const off = step.part ? !el.matches("h2") && el !== step.part : el.hasAttribute("data-part");
            el.classList.toggle("step-off", off);
        });
    }
    hudLabel.textContent = `${current + 1} / ${steps.length} · ${step.label}`;
    history.replaceState(null, "", "#" + (step.part?.id || step.slide.id));
    scrollTo({ top: 0, behavior: "instant" });
}
function setPresent(on) {
    if (on) {
        const near = slides.find(s => s.getBoundingClientRect().bottom > innerHeight * 0.3) || slides[0];
        root.setAttribute("data-present", "on");
        hud.hidden = false;
        show(steps.findIndex(st => st.slide === near));
    } else {
        root.removeAttribute("data-present");
        hud.hidden = true;
        document.querySelectorAll(".step-off").forEach(el => el.classList.remove("step-off"));
        steps[current].slide.scrollIntoView({ behavior: "instant" });
    }
    presentBtn.setAttribute("aria-pressed", String(on));
}
presentBtn.addEventListener("click", () => setPresent(true));
document.getElementById("prevSlide").addEventListener("click", () => show(current - 1));
document.getElementById("nextSlide").addEventListener("click", () => show(current + 1));
document.getElementById("exitPresent").addEventListener("click", () => setPresent(false));
// a tab click while presenting jumps to that view's step
document.querySelectorAll("[role=tab]").forEach(tab => tab.addEventListener("click", () => {
    if (!presenting()) return;
    const i = steps.findIndex(st => st.tab === tab);
    if (i >= 0) show(i);
}));
// a link while presenting jumps to the first step that holds the target
addEventListener("hashchange", () => {
    if (!presenting()) return;
    const el = document.getElementById(location.hash.slice(1));
    const i = steps.findIndex(st => (st.part || st.slide).contains(el));
    if (i >= 0 && i !== current) show(i);
});

// ===== Keys =====
document.addEventListener("keydown", (e) => {
    if (typing(e) || !bare(e) || document.querySelector(".lightbox[open]")) return;
    const k = e.key;
    if (k === "[") { toggleRail(); return; }
    if (k === "/") { e.preventDefault(); small.matches ? setDrawer(true) : setCollapsed(false); search.focus(); return; }
    if (k === "p" || k === "P") { setPresent(!presenting()); return; }
    if (k === "1" || k === "2" || k === "3") {
        const tab = flowInView()?.querySelectorAll("[role=tab]")[+k - 1];
        if (tab && !tab.disabled) selectView(tab);
        return;
    }
    if (!presenting()) return;
    if (k === "Escape") setPresent(false);
    else if (k === "ArrowRight" || k === "PageDown" || (k === " " && !e.shiftKey)) { e.preventDefault(); show(current + 1); }
    else if (k === "ArrowLeft" || k === "PageUp" || (k === " " && e.shiftKey)) { e.preventDefault(); show(current - 1); }
});

// ===== Fit each diagram-design iframe to the height its file posts (works on file://) =====
addEventListener("message", (e) => {
    if (!e.data || e.data.type !== "diagram-height") return;
    const frame = [...document.querySelectorAll(".diagram-frame")].find(f => f.contentWindow === e.source);
    if (frame) frame.style.height = Math.ceil(e.data.height) + "px";
});

// ===== Diagram zoom: with Zoom on, wheel zooms at the cursor and drag pans; ⛶ opens a lightbox where zoom always works =====
const zoomToggle = document.getElementById("zoomToggle");
const zooms = [];
const zoomOn = () => root.getAttribute("data-zoom") === "on";
function setZoom(on) {
    root.setAttribute("data-zoom", on ? "on" : "off");
    zoomToggle.setAttribute("aria-pressed", String(on));
    store.set("plan-zoom", on ? "on" : "off");
    if (!on) zooms.forEach(z => z.reset());
}
setZoom(store.get("plan-zoom") === "on");
zoomToggle.addEventListener("click", () => setZoom(!zoomOn()));

function makeZoomable(box) {
    const stage = document.createElement("div");
    stage.className = "zoom-stage";
    stage.append(...box.childNodes);
    box.append(stage);
    box.classList.add("zoomable");
    if (stage.querySelector("iframe")) box.insertAdjacentHTML("beforeend", '<div class="zoom-shield"></div>');
    box.insertAdjacentHTML("beforeend", '<div class="zoom-tools"><button type="button" class="zoom-reset" title="Reset zoom"></button><button type="button" class="zoom-full" title="Open in lightbox">⛶</button></div>');
    const btn = box.querySelector(".zoom-reset");
    const active = () => box.classList.contains("in-lightbox") || (zoomOn() && !presenting());
    let s = 1, x = 0, y = 0;
    const paint = () => {
        stage.style.transform = s === 1 && !x && !y ? "" : `translate(${x}px, ${y}px) scale(${s})`;
        btn.textContent = `↺ ${Math.round(s * 100)}%`;
    };
    const reset = () => { s = 1; x = 0; y = 0; paint(); };
    paint();
    box.addEventListener("wheel", (e) => {
        if (!active()) return;
        e.preventDefault();
        const r = box.getBoundingClientRect();
        const px = e.clientX - r.left - box.clientLeft - stage.offsetLeft;
        const py = e.clientY - r.top - box.clientTop - stage.offsetTop;
        const next = Math.min(5, Math.max(0.5, s * Math.exp(-e.deltaY * 0.0015)));
        x = px - (px - x) * next / s;
        y = py - (py - y) * next / s;
        s = next;
        paint();
    }, { passive: false });
    stage.querySelectorAll("img").forEach(img => { img.draggable = false; });
    let drag = null;
    box.addEventListener("pointerdown", (e) => {
        if (!active() || e.button !== 0 || e.target.closest(".zoom-tools")) return;
        drag = { id: e.pointerId, sx: e.clientX - x, sy: e.clientY - y };
        box.setPointerCapture(e.pointerId);
        box.classList.add("panning");
    });
    box.addEventListener("pointermove", (e) => {
        if (!drag || e.pointerId !== drag.id) return;
        x = e.clientX - drag.sx; y = e.clientY - drag.sy; paint();
    });
    const end = () => { drag = null; box.classList.remove("panning"); };
    box.addEventListener("pointerup", end);
    box.addEventListener("pointercancel", end);
    btn.addEventListener("click", reset);
    box.querySelector(".zoom-full").addEventListener("click", () => openLightbox(box, stage, reset));
    zooms.push({ reset });
}

const lightbox = document.createElement("dialog");
lightbox.className = "lightbox";
lightbox.innerHTML = '<button type="button" class="lightbox-close" title="Close (Esc)">✕</button><p class="lightbox-caption"></p>';
let lit = null;
function caption(box) {
    const section = box.closest(".slide");
    const title = section?.querySelector("h2, h3")?.textContent.replace(/^[\d.]+/, "").trim() || "";
    const kind = box.closest(".panel")?.dataset.label || "";
    return [title, kind].filter(Boolean).join(" — ");
}
function openLightbox(box, stage, reset) {
    const ratio = stage.offsetHeight / stage.offsetWidth || 1;
    const spot = document.createElement("div");
    spot.style.height = box.offsetHeight + "px";
    lightbox.querySelector(".lightbox-caption").textContent = caption(box);
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
lightbox.addEventListener("click", (e) => { if (e.target === lightbox) lightbox.close(); });

document.addEventListener("DOMContentLoaded", () => {
    document.body.append(lightbox);
    document.querySelectorAll(".flowchart, .seq").forEach(makeZoomable);
    // sequence diagrams have drawn by now, so section offsets are final
    spy();
});
