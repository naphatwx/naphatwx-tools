---
name: check-job
description: Watch a Jenkins build from its URL until it ends, then explain any failure. Use when the user pastes a build link or says "why did the build fail". Read-only.
argument-hint: <jenkins-build-url>
context: fork
background: false
allowed-tools: Bash(sleep:*)
---

# Check Jenkins Job

## User Input

```text
$ARGUMENTS
```

If `$ARGUMENTS` above is not filled in (agents other than Claude Code), use the text the user gave with this request as the input.

## Hard Rules

- Never call `build_item`, `stop_build`, `cancel_queue_item`,
  `set_item_config`, or `set_node_config`.
- Never edit files, run git, or "try a fix". Explain only.
- Never guess a cause the logs do not support. Say "not enough log evidence"
  instead.
- Use the user's Jenkins MCP server, whatever its name. If there are several,
  use the one the repo guide (`AGENTS.md`, `CLAUDE.md`) names, else the one
  whose host matches the build URL. Still unclear → name the servers found
  and stop.
- Tool names below are the first choice. If the server lacks one, use its
  full console output tool (e.g. `get_build_console_output`) and search it
  yourself.
- If the MCP returns an authentication error, tell the user the Jenkins MCP
  needs credentials (Jenkins URL, user, API token) and stop.

## Workflow

### 1. Parse the URL

Accept only a Jenkins build URL. Shape:

```text
http(s)://<host>/job/<name>[/job/<sub-name>...]/<build-number>/
```

- `fullname` = every `/job/<x>` segment joined with `/`
  (e.g. `/job/folder/job/app/` -> `folder/app`).
- `number` = the trailing integer.
- Trailing `/`, `console`, `pipeline-graph`, etc. after the number can be
  ignored.
- If the URL has no build number, call `get_item` with `fullname` and use
  `lastBuild.number`. Tell the user which build was picked.
- If the URL does not match this shape, say so and stop. Do not accept job
  names or MR references.

### 2. Fetch the build

Call `get_build` with `fullname` and `number`. Record:

- `building` (true while running)
- `result` (`SUCCESS`, `FAILURE`, `UNSTABLE`, `ABORTED`, `NOT_BUILT`, or null)
- `duration`, `estimatedDuration`, `timestamp`
- trigger cause (from `actions[].causes[].shortDescription`)
- `url`

If the build does not exist, report that and stop.

### 3. Poll while running

While `building` is true:

1. Print one short line: build number, elapsed time vs. estimated, and the
   current stage if the console tail shows one.
2. Sleep 30 seconds (`sleep 30`).
3. Call `get_build` again.

Limits:

- Stop polling after 30 minutes. Report "still running" with the last known
  state and the build URL. Do not keep waiting.
- If the user interrupts, stop immediately.

### 4. Verify the result

| `result`    | Meaning                                  | Next step                |
|-------------|------------------------------------------|--------------------------|
| `SUCCESS`   | All stages passed                        | Report success, stop     |
| `UNSTABLE`  | Passed but tests failed or a gate warned | Go to step 5             |
| `FAILURE`   | A stage failed                           | Go to step 5             |
| `ABORTED`   | Stopped by a user or timeout             | Report who/why, stop     |
| `NOT_BUILT` | Skipped                                  | Report, stop             |

If the job runs a quality gate (e.g. SonarQube, per the repo guide or the
log), then even on `SUCCESS` run one `search_build_console` for
`Quality Gate` and `FAILED`. Some gates fail without failing the build. If
found, mention it as a warning.

### 5. Investigate the failure (read-only)

Gather evidence in this order. Stop early once the cause is clear.

1. `get_build_failure_excerpt` - first failing block and failing tests.
2. `search_build_console` with targeted queries, `context_lines: 5`:
   - `ERROR`, `FAILED`, `Quality Gate`, `exit code`, `panic:`, `Exception`
   - the name of the failing stage if known
3. `get_build_test_report` (or the server's test-failures tool, e.g.
   `get_build_test_failures`) when the failure is in a test stage or
   `result` is `UNSTABLE`.
4. `get_build_console_tail` (`max_bytes: 8000`) as the last fallback.

Do not dump whole logs. Quote only the lines that prove the cause.

### 6. Report

Use this shape:

**Build**: `<fullname> #<number>` - `<result>` - `<duration>`
**Trigger**: `<cause>`
**Link**: `<url>`

**Failed stage**: `<stage name or "unknown">`

**What happened**
- One to three bullets in plain words. Name the module, test, or gate.

**Evidence**

```text
<the exact log lines, trimmed>
```

**Where to look**
- File, module, config, or dashboard most likely involved.
- Mark each as "confirmed by log" or "likely".

**Next step**
- End with: "Review the evidence above before any fix is made."

## Common Failure Patterns

- **SonarQube Quality Gate `Failed`**: coverage on new code below threshold,
  new issues, or duplicated lines. Point to the Sonar project for the module.
- **Build / compile error**: quote the compiler line with file and line
  number.
- **Docker / image build error**: quote the failing `RUN` step.
- **Timeout or agent lost**: say the pipeline was cut off. Not a code issue.
