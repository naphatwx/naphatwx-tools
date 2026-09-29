# Sequence diagram

A sequence diagram shows how one flow's services talk: who calls whom, in what order, what comes back, and which writes leave the service. Every branch of the flow that reaches a service shows up as an `alt` / `opt`.

- One flow = one file, `NN-<slug>`. When a flowchart of the same flow exists, use its `NN-<slug>`.
- Participants: user, frontend, backend services, databases, external systems. At most 7.

## Labels (both modes)

- Labels are the name only, ≤ 40 chars: RPC (`TriggerRedeployment`), endpoint (`POST /things`), table op (`INSERT infra.redeployment`), queue (`publish infra.redeployment.create`), job (`build app-redeployment`), status or error code (`FAILED_PRECONDITION`).
- Arguments, example values, messages and reasons go in `detail`. It shows on hover and in the "Step details" list under the diagram.
- Notes and `alt` / `else` conditions are a short phrase that names the real value, not a generic word: `permission redeployment.redeploy`, not `guards`; `status not AVAILABLE`, not `env unavailable`. Use simple words, not symbols (`not in`, never `∉` or `!=`; see the table in the flowchart reference). The full rule goes in `detail` or in the caller's rules list.
- Every `detail` holds real values from the source: field names, permission keys, enum values, config keys, timeouts. Never a vague summary like `permission check, validation`. Same words-not-symbols rule.
- Mark only writes that leave the service or must be audited as side effects (`hot`), so readers can scan for them.

## diagram-design mode

- Ask for a Sequence diagram with the labels above, dark theme; save to `NN-<slug>.html`; add the height reporter (SKILL.md step 3). Skip the `.js` format.

## Manual mode

- Copy `template/sequence-diagram/render.js` to the output folder unchanged, if it is not there yet.
- Write one `NN-<slug>.js` per flow. Header comment (max 3 lines): flow number, name, user story; the step format line from `template/sequence-diagram/01-example-flow.js`.

```js
SeqDiagrams.define("01-cut-new-version", {
    actors: [["eng", "Engineer", "browser"], ["api", "api-service", "VersionService"]],
    steps: [
        ["phase", "1 · Open the form"],
        ["call", "eng", "api", "GetBases", "repositoryId 1204"],
        ["ret", "api", "eng", "GetBasesResponse", "latestVersion 2.3.2-1"],
        ["note", "api", "permission version.create", null, "needs permission version.create; the base must be ACTIVE"],
        ["alt", "upstream accepts"], ["hot", "api", "db", "INSERT audit"], ["else", "refused"], ["ret", "api", "eng", "reason"], ["end"],
    ],
});
```

| Step | Meaning |
|------|---------|
| `["phase", text]` | Section band across the diagram |
| `["call", from, to, label, detail?]` | Request (solid arrow) |
| `["ret", from, to, label, detail?]` | Response (dashed arrow) |
| `["hot", from, to, label, detail?]` | Side effect: external write, audit, job trigger (accent arrow) |
| `["note", at, text, to?, detail?]` | Note over one participant, or spanning to `to` (`null` for none) |
| `["alt", cond]` … `["else", cond]` … `["end"]` | Branches |
| `["opt", cond]` / `["loop", cond]` … `["end"]` | Optional or repeated block |

- The `.js` files need a host page. A caller with its own page (plan-feature's `overview.html`) loads them there.
- No host page → also copy `template/sequence-diagram/index.html` to the output folder: set its title, and add one `<h2>` + `<div class="seq" data-flow="NN-<slug>">` and one `<script src="NN-<slug>.js">` per flow.

## Checks

- Every `alt` / `opt` / `loop` has its `end`; every actor used in a step is in `actors`.
- The page draws with no "Missing diagram file" text and no `[seq]` length warnings in the console (a single long name such as an RPC is fine).
