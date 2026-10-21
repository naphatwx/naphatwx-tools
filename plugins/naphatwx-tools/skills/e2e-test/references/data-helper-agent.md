# Data helper agent prompt (one agent per feature, before the writers)

Spawn **one** agent after the harness and before the writers. The writers import what it writes.

```text
Write the shared test-data helper for ONE feature's e2e tests and prove it works. Never edit app code.

Repo: <repo-root>   Guide files to follow: <paths>
Use cases file: <plan>/use-cases.js   Feature: <feature>
E2E folder: <e2e-dir>   Login: <storageState path / fixture name>
Write: <e2e-dir>/<domain>/helpers/<feature>.ts   (exists → add only what the new scenarios need)

Naming
1. Each test copies the seed records its scenario names. A copy is named `<seed name>-e2e<N>-<tag>`:
   N = the use case number, tag = 4 base36 characters, new per fixture build. E.g. `delta-super-e2e1-k7q2`.
   Step titles then quote the scenario word for word, the screen shows a name that reads the same, and
   a cut-off name still shows the meaningful part.
2. Before you fix the shape, read the repo's name rules (characters, length, unique keys) for every
   record type you copy. A type that can't take the shape gets the nearest one that keeps
   `-e2e<N>-<tag>`; say which and why.

What the helper exports
3. A fixture builder that copies the named seed records for one use case and returns them with one
   name map, seed name → copy (e.g. `fixture.names['delta-super']`), plus a cleanup that deletes exactly
   those copies and checks they are gone.
4. `sweep(request, uc)`: deletes leftovers of aborted runs for that use case, found by the `-e2e<N>-`
   marker. It must never match a name without the marker.
5. State that only CI or a worker would set (deploys, builds): the helper sets it itself after a short,
   configurable wait (env var, default about 10 s, not 90 s).
6. A record stuck in "preparing": move it on to its next state first; cancel it only if that fails.
7. Copy through the app's API (REST, or the MCP-backed route). Read routes and request shapes from the code.

Runner for mcp and job scenarios
8. Pick ONE way to run setup / cleanup outside Playwright, the same for every use case (e.g. a small
   `.mts` script run with `npx tsx` that imports this helper, `setup <seed names…>` prints the copies as
   JSON, `cleanup` deletes them and sweeps). Give the writers the exact pattern.

Prove it
9. Write a throwaway spec that builds a fixture, checks the copies and their names, runs sweep, and
   cleans up. Run it once, fix until it passes, then delete it. Run the runner's setup and cleanup once too.

Return:
- the helper path and its exports, with one-line signatures
- the name shape per record type, and any repo name rule that changed it
- the runner pattern for the writers, with one example command
- the throwaway run result and whether cleanup is confirmed
```
