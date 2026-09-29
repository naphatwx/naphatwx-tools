// Mock-only stand-in for the real operations, named exactly as in contract/types.ts.
// Serves contract/data.js through contract/rules.js; swap for the real client and pages stay the same.
// Writes and the side-effect log persist in sessionStorage, so they survive page changes.

var FakeApi = (function () {
    const D = MOCK_DATA, sc = Scenarios.current;
    const STORE = 'mock:<feature-slug>';
    const LATENCY = 450;
    const TIMEOUT_SIM_MS = 2600; // stands in for the real call bound, so the demo doesn't stall

    const load = (k, d) => { try { return JSON.parse(sessionStorage.getItem(`${STORE}:${k}`)) ?? d; } catch { return d; } };
    const save = (k, v) => { try { sessionStorage.setItem(`${STORE}:${k}`, JSON.stringify(v)); } catch { /* storage blocked: in-memory only */ } };
    const mem = { created: load('created', {}), log: load('log', []), reads: 0 };
    const persist = () => { save('created', mem.created); save('log', mem.log); };
    const wait = ms => new Promise(r => setTimeout(r, ms));
    const fail = err => { throw err; };

    /** Side effects the real service writes (audit rows, events). Shown on index.html. */
    const record = message => { mem.log.unshift({ at: new Date().toISOString(), message }); persist(); };

    const rows = ownerId => [...(mem.created[ownerId] || []), ...(D.things[ownerId] || [])];

    // ---------------------------------------------------------------- operations (real names)

    async function GetThings(req) {
        await wait(LATENCY);
        if (!D.owners.some(o => o.id === req.ownerId)) fail({ code: 'NotFound', message: 'owner not found' });
        if (sc.faults.readUnavailableOnce && ++mem.reads === 1) fail(Rules.UNREACHABLE);
        const limit = Math.min(req.limit || 20, Rules.MAX_LIMIT);
        let list = rows(req.ownerId).map(Rules.toResponse);
        if (req.status) list = list.filter(t => t.status === req.status);
        const totalPages = Math.max(1, Math.ceil(list.length / limit));
        const page = Math.min(Math.max(1, req.page || 1), totalPages);
        return { entities: list.slice((page - 1) * limit, page * limit), totalPages, page, limit };
    }

    async function CreateThing(req) {
        await wait(LATENCY);
        const invalid = Rules.validateCreate(req);
        if (invalid) { record(`refused: ${invalid}`); fail({ code: 'InvalidArgument', message: invalid }); }
        const row = { id: Date.now() % 100000, owner_id: req.ownerId, name: req.name, state: 'QUEUED', created_at: new Date().toISOString() };
        (mem.created[req.ownerId] = mem.created[req.ownerId] || []).unshift(row);
        if (sc.faults.createTimeout) { persist(); await wait(TIMEOUT_SIM_MS); record('timeout, outcome unknown'); fail({ code: 'Unavailable', outcomeUnknown: true, message: 'No answer in time. It may have been created — check the list before trying again.' }); }
        record(`created thing #${row.id}`);
        return Rules.toResponse(row);
    }

    /** Sample requests for the index.html console, one per operation. */
    const SAMPLES = {
        GetThings: { ownerId: sc.ownerId, page: 1, limit: 10 },
        CreateThing: { ownerId: sc.ownerId, name: 'Third thing' },
    };

    return {
        GetThings, CreateThing, SAMPLES,
        owner: () => D.owners.find(o => o.id === sc.ownerId),
        log: () => mem.log,
        reset: () => { mem.created = {}; mem.log = []; persist(); },
    };
})();
