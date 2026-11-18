// Mock-only: pages, and what a screen starts with: a data set, a role and upstream faults.
// A preset (LIST) fixes one of each, has its own ?state=<id> link, and is what scenarios pick.
// Free play (?free=1&data=&role=&faults=a,b) picks each one live, so every preset is reachable there too.

var States = (function () {
    // every permission an operation in fake-api.js checks; RO lacks the write ones
    const RW = ['things.read', 'things.create'];
    const RO = ['things.read'];

    /** One entry per screen under page/; free play lists them all as nav. `extra` = default query params for a deep link. */
    const PAGES = [
        { file: 'page/example.html', label: 'Example list', icon: 'fa-list', extra: {} },
    ];
    const ROLES = [
        { id: 'editor', label: 'EDITOR', perms: RW },
        { id: 'viewer', label: 'VIEWER', perms: RO },
    ];
    /** The entity the screens open on. `blocked` = a reason the spec shows on an unavailable control (not a permission). */
    const DATA = [
        { id: 'pluto', label: 'pluto', ownerId: 1204 },
        { id: 'neptune', label: 'neptune (no rows)', ownerId: 1310 },
        { id: 'archived', label: 'pluto, archived', ownerId: 1204, blocked: Rules.ARCHIVED },
    ];
    /** fake-api.js reads each as `faults.<id>`. */
    const FAULTS = [
        { id: 'readUnavailableOnce', label: 'First read fails' },
        { id: 'createTimeout', label: 'Create times out' },
    ];

    const byId = (list, id, what) => list.find(x => x.id === id) || (() => { throw new Error(`unknown ${what} "${id}"`); })();
    /** A preset or a free pick → the shape pages and fake-api.js read: ownerId, blocked, perms, faults. */
    function build(p) {
        const data = byId(DATA, p.data, 'data'), role = byId(ROLES, p.role, 'role');
        return { ...p, ownerId: data.ownerId, blocked: data.blocked, perms: role.perms, faultIds: p.faults,
            faults: Object.fromEntries(p.faults.map(f => [byId(FAULTS, f, 'fault').id, true])) };
    }

    /** `useCase` = which plan use cases (UC<n>) this preset shows. */
    const LIST = [
        { id: 'normal', data: 'pluto', role: 'editor', faults: [], label: 'Normal — pluto', useCase: 'UC1 · UC2', hint: 'Happy path with real-looking data.' },
        { id: 'empty', data: 'neptune', role: 'editor', faults: [], label: 'Empty — neptune', useCase: 'UC1', hint: 'No rows yet: the empty state, not an error.' },
        { id: 'unreachable', data: 'pluto', role: 'editor', faults: ['readUnavailableOnce'], label: 'Upstream unreachable', useCase: 'UC1', hint: 'First read fails; Retry works. Never shown as empty.' },
        { id: 'read-only', data: 'pluto', role: 'viewer', faults: [], label: 'Read-only user — pluto', useCase: 'UC2', hint: 'No things.create: Create is hidden, as the real app hides it.' },
        { id: 'archived', data: 'archived', role: 'editor', faults: [], label: 'Archived owner — pluto', useCase: 'UC2', hint: 'Create is disabled with the reason under it, as the spec says.' },
    ].map(build);

    const params = new URLSearchParams(location.search);
    const free = params.has('free');
    const known = (list, id) => list.some(x => x.id === id);
    const current = !free ? LIST.find(s => s.id === params.get('state')) || LIST[0] : build({
        id: 'free', label: 'Free play', hint: '',
        data: known(DATA, params.get('data')) ? params.get('data') : DATA[0].id,
        role: known(ROLES, params.get('role')) ? params.get('role') : ROLES[0].id,
        faults: (params.get('faults') || '').split(',').filter(f => known(FAULTS, f)),
    });

    /** Link that keeps the state (or the free pick) and switches page. @param {string} page @param {object} [extra] */
    function href(page, extra = {}, stateId = current.id) {
        const keep = free ? { free: '1', data: current.data, role: current.role, faults: current.faultIds.join(',') } : { state: stateId };
        return `${page}?${new URLSearchParams({ ...keep, ...extra })}`;
    }
    return { PAGES, ROLES, DATA, FAULTS, LIST, current, free, params, href };
})();
