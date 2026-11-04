// A new owner with no things: the empty state.
import { api, ensure, unique, done, run } from './lib.mjs';

run(async () => {
    const org = await ensure(
        async () => (await api('GET', '/orgs?name=Astro%20Payments')).items[0],
        () => api('POST', '/orgs', { name: 'Astro Payments' }),
    );
    const name = unique('neptune');
    const owner = await api('POST', '/owners', { orgId: org.id, name });
    done({ url: `/owners/${owner.id}`, values: { ownerId: owner.id, ownerName: name } });
});
