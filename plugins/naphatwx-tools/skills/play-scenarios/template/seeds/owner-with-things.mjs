// A new owner with three things, newest first. Flags: --status <S> opens the list filtered; --archived archives it.
import { api, ensure, unique, done, run } from './lib.mjs';

const args = process.argv.slice(2);
const flag = (name) => { const i = args.indexOf(name); return i < 0 ? null : args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : true; };

run(async () => {
    // shared and read-only: create once, reuse on every pick
    const org = await ensure(
        async () => (await api('GET', '/orgs?name=Astro%20Payments')).items[0],
        () => api('POST', '/orgs', { name: 'Astro Payments' }),
    );
    // written by the scenario: a new one on every pick
    const owner = await api('POST', '/owners', { orgId: org.id, name: unique('pluto'), archived: !!flag('--archived') });
    for (const [name, status] of [['First thing', 'READY'], ['Second thing', 'FAILED'], ['Third thing', 'PENDING']]) {
        await api('POST', `/owners/${owner.id}/things`, { name, status });
    }
    const status = flag('--status');
    done({ url: `/owners/${owner.id}${status ? `?status=${status}` : ''}` });
});
