# AI tester agent prompt (mcp and job scenarios, one agent per use case)

Spawn one agent per use case that has a `.ai-tests.json`, when SKILL.md step 4 says. Each needs the MCP tools of the app under test and a shell. A fresh agent, not a writer.

```text
Play the mcp and job scenarios of ONE use case on the app under test, and record every call.
Do not edit any file except the results file. Never change app code or test files.

Repo: <repo-root>   Guide files to follow: <paths>
Use cases file: <plan>/use-cases.js   Your use case: <UC id> <title>
Test file: <e2e-dir>/<domain>/<goal>.ai-tests.json
Results file to write: <run>/ai-results-<UC id>.json
MCP server: <name of the MCP server for the app under test>   Environment: <local url / env name>

Before you start
1. Check the MCP server is the app under test, not production. If its name or URL points to
   production, or it is not connected, stop and report it. Do not fall back to another server.
2. Read the test file and, for each scenario, its given / when / expect in use-cases.js.

For each scenario in the test file, in order
3. Act as the scenario's role. When the MCP server has a who-am-I call (e.g. GetMe), call it first
   and record it. If the signed-in user does not hold that role and you cannot switch to it, mark the
   scenario skipped with reason "role <X> not available over MCP". Never play it as another role.
4. Run each step in order:
   - mcp: call the named tool and operation with the params. Fill "<from step N: field>" from that
     step's response. If the tool needs a schema call first (e.g. GetInputSchema), do it, but record
     only the scenario's calls.
   - job: run the command from the repo root. Record the command, exit code and the output lines that
     matter (the summary line, the error), at most about 40 lines.
   - setup / cleanup steps run like the others, with the commands in the test file's `runner` block.
     Run cleanup even when an earlier step failed.
   - Each step's `call.response` comes from that step's own call or command output, never another step's.
5. Compare each response with the step's `expect` and the scenario's `expect`, exactly: quoted
   messages word for word, numbers, statuses, error codes. A step fails when it does not match.
   Never mark an error as passed unless the scenario expects that error.
6. After cleanup, check every copy you made (`-e2e<N>-` in its name) is gone. Leftovers fail the scenario.

Record
7. Mask secrets: replace the value of any key named like token, secret, password, cookie,
   authorization, api key or session with "***". Never write a credential anywhere.
8. Write the results file as strict JSON:
   { "useCase": "<UC id>", "tests": [ { "scenario": "<id>", "role": "<role>", "status": "passed" | "failed" | "skipped",
       "ms": <total>, "error"?: "<first mismatch, one or two lines>", "reason"?: "<why skipped>",
       "steps": [ { "title": "<from the test file>", "status": "passed" | "failed", "ms": <n>, "error"?: "<mismatch>",
                    "call": { "target": "<Service> · <Operation>" | "$ <command>",
                              "request": <params object, or the command string>,
                              "response": <response object, or "exit <code>\n<output>"> } } ] } ] }
9. Before you return, re-read the results file: it holds only your use case, and every step's
   `call.target` matches its title. Fix any that don't.

Return:
- the results file path
- per scenario: id, status, and the first mismatch if failed
- anything you could not run (tool missing, role not available, server down), and whether cleanup is confirmed
```
