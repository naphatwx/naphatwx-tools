# Reviewer agent prompt (one fresh agent per run)

Spawn **one new agent** after the run. It must not be a writer or a tester of this run: a fresh pair of eyes catches a test that "passed" without showing anything. After a re-run, spawn another fresh one for just the re-run scenarios.

```text
Review every step of one e2e run. You did not write or run these tests. Do not edit any file
except the review file. Do not re-run anything.

Use cases file: <plan>/use-cases.js
Run folder: <run>
  - run-data.json       ui + api tests from Playwright; ui steps have "shot": "shots/…" image files
  - ai-results-*.json   mcp + job tests from the AI tester; steps have "call" with request + response
Scenarios to review: <all | id, id, …>
Review file to write: <run>/review.json   (after a re-run: <run>/review-2.json)

For each test, read its scenario's given / when / expect in use-cases.js. Then check every step, in
order, including steps that failed. Open every screenshot and look at it.

ui steps (screenshot)
1. The shot is a real screen: not blank, not all white, not a spinner or skeleton only, not the
   sign-in page, not an error page (404, 500, "Something went wrong"), unless the scenario expects it.
2. The right screen: URL in the shot, page heading and tab match the step and the scenario.
3. It shows what the step title says ("The draft shows under My drafts" → the draft is there) and, on
   the checking steps, what the scenario's expect says: quoted text word for word, counts, statuses.
4. Status matches the picture: a passed step whose shot shows a failure, error or wrong value, or a
   failed step whose shot shows the expected result.
5. The same image repeated for steps that should change the screen.

mcp / api / job steps (call)
6. The response is not empty and not cut off where the answer should be.
7. It matches expect exactly: quoted messages word for word, values, counts, error codes.
8. No error marked as passed, unless the scenario expects that error.
9. The right role: the who-am-I call, or the role the test signed in as, matches the scenario's given.
10. No secret in the request or response (token, cookie, password). If you see one, flag it.

Whole test
11. Every expect line of the scenario is checked by some step. A missing check is a test problem.

Flag each step
- ok       everything above holds
- test     the test is wrong: shot taken too early, wrong wait, weak or wrong assertion, wrong role,
           a missing check, a secret recorded. The product may be fine.
- product  the app is wrong: the screen or response differs from the scenario's expect
- unsure   you cannot tell from the proof; say what a person should look at

Write the review file as strict JSON, one entry per step of every reviewed test:
{ "reviewer": "fresh agent", "steps": [ { "scenario": "<id>", "step": <1-based, the index in the test's "steps">,
    "flag": "ok" | "test" | "product" | "unsure", "check": "<short checklist item, e.g. spinner, quoted message>",
    "note": "<what you saw, and for test / product what is wrong, one or two sentences>" } ] }
A test's "finalShot" (page at failure) is not a step: look at it, but put what you see in the note of the failed step.

Return:
- the review file path
- counts per flag
- each test, product and unsure flag: scenario id, step, note
```
