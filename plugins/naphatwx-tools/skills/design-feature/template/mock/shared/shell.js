// App shell shared by every page: the app's real chrome (nav, header) plus the mock-only scenario panel.
// Shell.mount() writes it and returns the #page element. Replace the chrome markup with the app's real layout.

var Shell = (function () {
    const root = document.documentElement;
    try { if (localStorage.getItem('mock:theme') === 'light') root.classList.remove('dark'); } catch { /* storage blocked */ }
    function toggleTheme() {
        root.classList.toggle('dark');
        try { localStorage.setItem('mock:theme', root.classList.contains('dark') ? 'dark' : 'light'); } catch { /* storage blocked */ }
    }

    // ---- app chrome: copy from the app's layout, sidebar and page header components
    const chrome = owner => `
      <aside class="hidden lg:flex w-64 shrink-0 flex-col border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4">
        <div class="font-bold mb-6">App name</div>
        <a class="rounded-md px-3 py-2 text-sm font-medium bg-purple-500 text-white">Current section</a>
      </aside>
      <main class="h-screen min-w-0 flex-1 overflow-y-auto p-6">
        <h1 class="text-xl font-semibold mb-4">${UI.esc(owner.name)}</h1>
        <div id="page"></div>
      </main>`;

    // ---- mock-only: dashed pink so nobody mistakes it for product UI; keep as-is.
    // ?uc=<id> shows that use case's steps instead of the scenario picker; ?embed=1 (inside a use-case card) shows nothing.
    const head = title => `
        <div class="flex items-center justify-between mb-2">
          <span class="font-bold text-pink-600 dark:text-pink-400 uppercase tracking-wider">${title}</span>
          <div class="flex gap-1">
            <button onclick="Shell.toggleTheme()" class="px-2 py-1 rounded border border-gray-300 dark:border-gray-600" title="Toggle theme">◐</button>
            <button onclick="document.getElementById('scBody').classList.toggle('hidden')" class="px-2 py-1 rounded border border-gray-300 dark:border-gray-600" title="Collapse">–</button>
          </div>
        </div>`;
    const box = 'fixed bottom-4 right-4 z-[400] rounded-xl border-2 border-dashed border-pink-500 bg-white/95 dark:bg-gray-950/95 p-3 text-xs text-gray-900 dark:text-gray-100 shadow-2xl';
    const list = (tag, items) => `<${tag} class="mt-1 ${tag === 'ol' ? 'list-decimal' : 'list-disc'} pl-4 space-y-1 leading-relaxed">${items.map(i => `<li>${UI.esc(i)}</li>`).join('')}</${tag}>`;

    const useCasePanel = uc => `
      <div class="${box} w-96 max-h-[70vh] overflow-y-auto">
        ${head('Use case · ' + UI.esc(uc.story))}
        <div class="text-sm font-semibold">${UI.esc(uc.title)}</div>
        <div id="scBody">
          <div class="mt-3 font-semibold">How to play</div>${list('ol', uc.steps)}
          <div class="mt-3 font-semibold">What you should see</div>${list('ul', uc.expect)}
          <div class="mt-3 flex items-center justify-between">
            <a href="../index.html#uc-${uc.id}" class="text-purple-600 dark:text-purple-400 underline">← All use cases</a>
            <button onclick="FakeApi.reset();location.reload()" class="text-gray-500 hover:text-red-500">Start over</button>
          </div>
        </div>
      </div>`;

    const scenarioPicker = () => `
      <div class="${box} w-80">
        ${head('Mock scenario')}
        <div id="scBody">
          <select onchange="location.href=Scenarios.href(location.pathname.split('/').pop(), {}, this.value)" class="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 py-1.5 text-xs">
            ${Scenarios.LIST.map(s => `<option value="${s.id}" ${s.id === Scenarios.current.id ? 'selected' : ''}>${UI.esc(s.label)}</option>`).join('')}
          </select>
          <p class="mt-2 text-gray-600 dark:text-gray-400 leading-relaxed">${UI.esc(Scenarios.current.hint)}</p>
          <div class="mt-2 flex items-center justify-between">
            <a href="../index.html" class="text-purple-600 dark:text-purple-400 underline">Mock index</a>
            <button onclick="FakeApi.reset();location.reload()" class="text-gray-500 hover:text-red-500">Reset mock state</button>
          </div>
        </div>
      </div>`;

    function scenarioPanel() {
        if (Scenarios.params.get('embed')) return '';
        const uc = (window.USE_CASES || []).find(u => u.id === Scenarios.params.get('uc'));
        return uc ? useCasePanel(uc) : scenarioPicker();
    }

    function mount() {
        const owner = FakeApi.owner();
        document.body.innerHTML = `
          <div class="flex h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-white">${chrome(owner)}</div>
          <div id="modalRoot"></div>
          <div id="toastRoot" class="fixed top-6 right-6 z-[300] flex flex-col gap-2"></div>
          ${scenarioPanel()}`;
        return { page: document.getElementById('page'), owner };
    }

    return { mount, toggleTheme };
})();
