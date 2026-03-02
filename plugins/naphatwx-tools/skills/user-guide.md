---
name: user-guide
description: Generate user-facing documentation for features
allowed-tools: Read, Glob, Grep, WebSearch, AskUserQuestion, Write
---

# User Guide Generator

Generate user-friendly documentation for a given feature.

## User Input

```text
$ARGUMENTS
```

**Expected format:** `<feature-domain>` or `<feature-domain> <output-path>`

## Workflow

### 0. Ask Output Preference (if no output path provided)

Use AskUserQuestion to ask:

```
Question: "How would you like to receive the user guide?"
Options:
1. "Display as text" - Show in chat
2. "Save to default location" - docs/features/{feature-domain}/user-guide.md
3. "Save to custom path" - I will specify the path
```

If output path was provided in arguments, skip this step.

### 1. Read Feature Documentation

Use Glob and Grep to find and read relevant docs for the feature domain:
- README, architecture, spec, or any markdown files under `docs/`
- Frontend UI files related to the feature

Extract:
- Feature purpose and overview
- What users can do (user stories)
- Key concepts and terms
- UI pages, buttons, forms, and status indicators
- Permissions and roles

### 2. Write the User Guide

Use this structure:

```markdown
# [Feature Name] User Guide

## What is [Feature Name]?
[2-3 simple sentences about what it does and why it's useful]

## Key Concepts
[Table or list explaining important terms]

## How To: [Main Task 1]
📸 **[SCREENSHOT PLACEHOLDER]**
*Show: [what to highlight and where]*

1. [Step]
2. [Step]
3. [Step]

## How To: [Main Task 2]
[Repeat pattern...]

## Common Scenarios
### "[User goal]"
[Steps to achieve it]

## Troubleshooting
### "[Problem]"
- **Cause:** [Why it happens]
- **Solution:** [How to fix it]

## Quick Reference
| Action | Where | Permission |
|--------|-------|------------|

## Tips
✅ [Tip 1]
✅ [Tip 2]
```

### 3. Writing Rules

- Use simple words and short sentences
- Write in active voice ("Click Save" not "Save should be clicked")
- Address the user as "you"
- Number every step
- Add a screenshot placeholder for every UI interaction
- No technical jargon, no code, no API references

### 4. Save the Guide

- **Display as text:** Output in chat
- **Default location:** Save to `docs/features/{feature-domain}/user-guide.md`
- **Custom path:** Ask for path, then save there
- Always confirm with: "✅ User guide created at: {path}"
