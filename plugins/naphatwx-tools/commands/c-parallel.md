---
name: c-parallel
description: Split a task into independent sub-tasks and run them in parallel using multiple sub-agents.
allowed-tools: Agent, Read, Glob, Grep
---

# Parallel Sub-Agent Runner

Run a task by splitting it into independent sub-tasks and dispatching them to multiple sub-agents in parallel.

## User Input

```text
$ARGUMENTS
```

## Workflow

### 1. Validate Input

- If `$ARGUMENTS` is empty:
    - Stop and ask the user what task to run.
- If task is trivial (single file read, single grep, single edit):
    - Stop and tell the user — parallelization adds overhead, run it directly.

### 2. Plan Sub-Tasks

Break the task into 2–6 independent sub-tasks.

**Independence rules**

- No sub-task depends on another's output.
- No sub-task edits the same file as another.
- Each sub-task is self-contained (own context, own goal).

**If task cannot be split**

- Stop and tell the user why.
- Suggest running it as a single agent or sequentially.

### 3. Show Plan First

Before dispatching, output the plan:

```text
Parallel plan (<N> agents):
1. <agent-type>: <one-line goal>
2. <agent-type>: <one-line goal>
...
```

Wait for user confirmation unless `$ARGUMENTS` contains `--yes` or `--auto`.

### 4. Dispatch in Parallel

Send **one message** with multiple `Agent` tool calls — this is required for true parallel execution.

**Agent type selection**

- `Explore` — read-only search, file lookup, "where is X".
- `Plan` — design / architecture planning, no code changes.
- `general-purpose` — multi-step research or writes.
- Specialized agents (e.g. `claude-code-guide`) — when task matches their description.

**Prompt rules per sub-agent**

- Self-contained — sub-agent has no memory of this conversation.
- Include exact file paths, line numbers, and acceptance criteria.
- State expected output format and length cap (e.g. "report under 200 words").
- Say clearly: research-only OR write code.

### 5. Aggregate Results

After all sub-agents return:

- Summarize each result in one bullet.
- Merge findings into a single answer for the user.
- Flag any conflicts between sub-agent outputs.
- List any sub-task that failed or returned partial results.

## Output Format

```text
## Parallel Run Summary

**Task**: <original task>
**Agents dispatched**: <N>

### Results

1. **<agent-1 goal>** — <one-line outcome>
2. **<agent-2 goal>** — <one-line outcome>
...

### Combined Answer

<merged result for the user>

### Issues

<any failures, conflicts, or partial results — omit section if none>
```

## Rules

- Never run sub-agents sequentially when they are independent — always one message, multiple `Agent` calls.
- Never spawn more than 6 agents in one run — split into rounds if needed.
- Never delegate the final synthesis — you must merge results yourself.
- Never spawn an agent for a task you can finish with a single tool call.
