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
let pinnedLink = null, activeLink;
function setActive(a) {
    if (a === activeLink) return;
    activeLink = a;
    railLinks.forEach(l => {
        l.classList.toggle("active", l === a);
        if (l === a) l.setAttribute("aria-current", "location"); else l.removeAttribute("aria-current");
    });
    railTitles(); // the active link is bold, so its label may now be cut short
}
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

// ===== Flow views: disclosure buttons (aria-expanded), all closed at first; one panel open per flow,
// and clicking the open view's button closes it.
const flows = [...document.querySelectorAll(".flow")];
const viewButtons = [...document.querySelectorAll(".views button[aria-controls]")];
function selectView(btn, force) {
    const open = force ?? btn.getAttribute("aria-expanded") !== "true";
    btn.closest(".views").querySelectorAll("button[aria-controls]").forEach(b => {
        const on = open && b === btn;
        b.setAttribute("aria-expanded", String(on));
        const panel = document.getElementById(b.getAttribute("aria-controls"));
        if (!panel) return;
        const was = !panel.hidden;
        panel.hidden = !on;
        if (on && !was) { panel.classList.remove("entering"); void panel.offsetWidth; panel.classList.add("entering"); }
    });
}
viewButtons.forEach(btn => {
    const panel = document.getElementById(btn.getAttribute("aria-controls"));
    if (panel) panel.dataset.label = btn.textContent.trim();
    btn.addEventListener("click", () => selectView(btn));
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
    const views = [...slide.querySelectorAll(".views button[aria-controls]:not(:disabled)")];
    if (views.length) return views.map(tab => ({ slide, tab, label: `${title} · ${tab.textContent.trim()}` }));
    const parts = [...slide.querySelectorAll(":scope > [data-part]")];
    if (parts.length) return [{ slide, part: null, label: title },
        ...parts.map(part => ({ slide, part, label: `${title} · ${part.dataset.part}` }))];
    return [{ slide, label: title }];
});
let current = 0;
const presenting = () => root.getAttribute("data-present") === "on";
// ===== Present fit: the step's diagram is scaled to the room above the bar, up to the box width.
// Never below 1:1 (diagrams draw every label at 12px or more): a taller one scrolls in its box with a cue.
const fitted = new Set();
const postFit = (frame, height) => frame.contentWindow?.postMessage({ type: "diagram-fit", height }, "*");
function updateCue(box) {
    const cue = box.querySelector(":scope > .more-cue");
    if (cue) cue.hidden = !fitted.has(box) || box.scrollTop + box.clientHeight >= box.scrollHeight - 4;
}
function unfit() {
    fitted.forEach(box => {
        box.style.maxHeight = "";
        box.classList.remove("fitted");
        const art = box.querySelector("img, svg");
        if (art) art.style.width = "";
        const frame = box.querySelector(".diagram-frame");
        if (frame && +frame.dataset.fit) { frame.dataset.fit = 0; postFit(frame, 0); }
    });
    const was = [...fitted];
    fitted.clear();
    was.forEach(updateCue);
}
function fitRoom() {
    unfit();
    if (!presenting()) return;
    const room = innerHeight - hudSpace();
    const slide = steps[current].slide;
    const box = slide.querySelector(".panel:not([hidden]) .flowchart, .panel:not([hidden]) .seq");
    if (!box) return;
    const sheetTop = parseFloat(getComputedStyle(document.getElementById("sheet")).paddingTop);
    const top = sheetTop + box.getBoundingClientRect().top - slide.getBoundingClientRect().top;
    const cs = getComputedStyle(box);
    const padY = parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom) + box.clientTop * 2;
    const width = box.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    const height = Math.max(200, Math.floor(room - top - padY));
    fitted.add(box);
    box.classList.add("fitted");
    box.style.maxHeight = height + padY + "px";
    const frame = box.querySelector(".diagram-frame");
    if (frame) { frame.dataset.fit = height; postFit(frame, height); }
    else {
        const art = box.querySelector("img, svg");
        const vb = art?.viewBox?.baseVal;
        const [w, h] = art?.tagName === "IMG" ? [art.naturalWidth, art.naturalHeight] : [vb?.width, vb?.height];
        if (w && h) art.style.width = Math.floor(w * Math.max(1, Math.min(width / w, height / h))) + "px";
    }
    if (!box.querySelector(":scope > .more-cue")) {
        box.insertAdjacentHTML("beforeend", '<div class="more-cue" aria-hidden="true" hidden>continues ↓</div>');
        box.addEventListener("scroll", () => updateCue(box), { passive: true });
    }
    box.scrollTop = 0;
    updateCue(box);
}
// the bar's footprint: its height plus its bottom offset; the sheet keeps 24px more below its last line
function hudSpace() {
    const space = hud.offsetHeight + parseFloat(getComputedStyle(hud).bottom);
    root.style.setProperty("--hud-space", space + "px");
    return space + 24;
}
addEventListener("resize", fitRoom);
document.querySelectorAll(".flowchart img").forEach(img => img.addEventListener("load", fitRoom));
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
    fitRoom();
    history.replaceState(null, "", "#" + (step.part?.id || step.slide.id));
    scrollTo({ top: 0, behavior: "instant" });
}
function setPresent(on) {
    if (on) {
        // the last section whose top has passed 30% of the window: a short flow at the top still counts
        const near = slides.filter(s => s.getBoundingClientRect().top <= innerHeight * 0.3).pop() || slides[0];
        root.setAttribute("data-present", "on");
        hud.hidden = false;
        show(steps.findIndex(st => st.slide === near));
    } else {
        root.removeAttribute("data-present");
        hud.hidden = true;
        unfit();
        document.querySelectorAll(".step-off").forEach(el => el.classList.remove("step-off"));
        steps[current].slide.scrollIntoView({ behavior: "instant" });
    }
    presentBtn.setAttribute("aria-pressed", String(on));
}
presentBtn.addEventListener("click", () => setPresent(true));
document.getElementById("prevSlide").addEventListener("click", () => show(current - 1));
document.getElementById("nextSlide").addEventListener("click", () => show(current + 1));
document.getElementById("exitPresent").addEventListener("click", () => setPresent(false));
// a view click while presenting jumps to that view's step
viewButtons.forEach(tab => tab.addEventListener("click", () => {
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

// ===== Shortcut sheet ( ? ) =====
const keys = document.getElementById("keys");
const keysBtn = document.getElementById("keysBtn");
function openKeys() { if (!keys.open) keys.showModal(); keys.querySelector(".keys-close").focus(); }
keysBtn.addEventListener("click", openKeys);
keys.querySelector(".keys-close").addEventListener("click", () => keys.close());
keys.addEventListener("click", (e) => { if (e.target === keys) keys.close(); });

// ===== Keys =====
document.addEventListener("keydown", (e) => {
    if (typing(e) || !bare(e) || document.querySelector("dialog[open]")) return;
    const k = e.key;
    if (k === "[") { toggleRail(); return; }
    if (k === "/") { e.preventDefault(); small.matches ? setDrawer(true) : setCollapsed(false); search.focus(); return; }
    if (k === "p" || k === "P") { setPresent(!presenting()); return; }
    if (k === "?") { openKeys(); return; }
    if (k === "1" || k === "2" || k === "3") {
        const tab = flowInView()?.querySelectorAll(".views button[aria-controls]")[+k - 1];
        if (!tab || tab.disabled) return;
        selectView(tab);
        const panel = document.getElementById(tab.getAttribute("aria-controls"));
        // the key opened a panel away from the focus, so take the focus into it
        if (!presenting() && panel && !panel.hidden) panel.focus({ preventScroll: true });
        return;
    }
    if (!presenting()) return;
    if (k === "Escape") setPresent(false);
    else if (k === "ArrowRight" || k === "PageDown" || (k === " " && !e.shiftKey)) { e.preventDefault(); show(current + 1); }
    else if (k === "ArrowLeft" || k === "PageUp" || (k === " " && e.shiftKey)) { e.preventDefault(); show(current - 1); }
});

// ===== Fit each diagram-design iframe to the height its file posts (works on file://).
// Presenting, the frame is sent a fit height; one that loaded after it was sent (lazy) gets it again.
addEventListener("message", (e) => {
    if (!e.data || e.data.type !== "diagram-height") return;
    const frame = [...document.querySelectorAll(".diagram-frame")].find(f => f.contentWindow === e.source);
    if (!frame) return;
    frame.style.height = Math.ceil(e.data.height) + "px";
    const want = +frame.dataset.fit || 0;
    if ((+e.data.fit || 0) !== want) postFit(frame, want);
    const box = frame.closest(".flowchart, .seq");
    if (box) updateCue(box);
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
    box.insertAdjacentHTML("beforeend", '<div class="zoom-tools"><button type="button" class="zoom-reset" title="Reset zoom"></button><button type="button" class="zoom-full" title="Open in lightbox" aria-label="Open diagram in lightbox">⛶</button></div>');
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
lightbox.innerHTML = '<button type="button" class="lightbox-close" title="Close (Esc)" aria-label="Close diagram">✕</button><p class="lightbox-caption"></p>';
let lit = null;
function caption(box) {
    const section = box.closest(".slide");
    const title = section?.querySelector("h2, h3")?.textContent.replace(/^[\d.]+/, "").trim() || "";
    const kind = box.closest(".panel")?.dataset.label || "";
    return [title, kind].filter(Boolean).join(" — ");
}
function openLightbox(box, stage, reset) {
    const opener = document.activeElement;
    const ratio = stage.offsetHeight / stage.offsetWidth || 1;
    const spot = document.createElement("div");
    spot.style.height = box.offsetHeight + "px";
    lightbox.querySelector(".lightbox-caption").textContent = caption(box);
    box.replaceWith(spot);
    lightbox.insertBefore(box, lightbox.querySelector(".lightbox-caption"));
    box.classList.add("in-lightbox");
    reset();
    lit = { box, stage, spot, reset, opener };
    lightbox.setAttribute("aria-label", caption(box) || "Diagram");
    lightbox.showModal();
    lightbox.querySelector(".lightbox-close").focus();
    const cs = getComputedStyle(box);
    const roomW = box.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    const roomH = box.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
    stage.style.width = Math.min(roomW, roomH / ratio) + "px";
}
lightbox.addEventListener("close", () => {
    if (!lit) return;
    const { box, stage, spot, reset, opener } = lit;
    lit = null;
    box.classList.remove("in-lightbox");
    stage.style.width = "";
    spot.replaceWith(box);
    reset();
    if (opener?.isConnected) opener.focus({ preventScroll: true });
});
lightbox.querySelector(".lightbox-close").addEventListener("click", () => lightbox.close());
lightbox.addEventListener("click", (e) => { if (e.target === lightbox) lightbox.close(); });

// a rail label cut short by the ellipsis shows in full on hover
function railTitles() {
    rail.querySelectorAll(".rail-label").forEach(l => {
        const a = l.closest("a") || l;
        if (l.scrollWidth > l.clientWidth) a.title = l.textContent.trim(); else a.removeAttribute("title");
    });
}
addEventListener("resize", railTitles);

document.addEventListener("DOMContentLoaded", () => {
    document.body.append(lightbox);
    railTitles();
    document.querySelectorAll(".flowchart, .seq").forEach(makeZoomable);
    // sequence diagrams have drawn by now, so section offsets are final
    spy();
});
