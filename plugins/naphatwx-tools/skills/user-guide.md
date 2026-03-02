---
name: user-guide
description: Generate user-facing documentation for features with annotated screenshot placeholders, step-by-step instructions, and troubleshooting. Follows 2026 best practices for user guides.
allowed-tools: Read, Glob, Grep, WebSearch, AskUserQuestion, Write
---

# User Guide Generator

Generate comprehensive, user-friendly documentation for end users who interact with features through the UI.

## User Input

```text
$ARGUMENTS
```

**Expected format:** `<feature-domain>` or `<feature-domain> <output-path>`

**Examples:**
- `version-system`
- `deployment-system`
- `app-config-system docs/user-guides/app-config-user-guide.md`

## Workflow

### 0. Ask User Preference (IF no output path provided)

**IMPORTANT:** If the user provided ONLY the feature domain (no output path), you MUST ask what they want to do with the guide.

Use the AskUserQuestion tool to ask:

```
Question: "How would you like to receive the user guide?"
Header: "Output format"
Options:
1. "Display as text" - Show the guide in the chat for review (no file created)
2. "Save to default location" - Create file at docs/features/{feature-domain}/user-guide.md
3. "Save to custom path" - Let me specify the file path

Multi-select: false
```

**Based on their answer:**
- **Option 1 (Display as text):** Generate the guide and output as text. User can manually save later.
- **Option 2 (Save to default location):** Generate and save to `docs/features/{feature-domain}/user-guide.md`
- **Option 3 (Save to custom path):** Ask for the path, then generate and save to that path.

**If output path WAS provided in arguments:** Skip this step and save to the specified path.

### 1. Analyze Feature Documentation

Read the following sources to understand the feature:

```
docs/features/<feature-domain>/README.md        # User stories, access control
docs/features/<feature-domain>/architecture.md  # Technical architecture, UI components
specs/*/spec.md                                 # Detailed requirements, edge cases
```

**Key information to extract:**
- Feature overview and purpose
- User stories (what users can do)
- Key concepts and terminology
- UI components and page locations
- Status indicators and visual elements
- Permissions and role requirements
- Common workflows and scenarios

### 2. Identify UI Components

Search for frontend implementation to understand UI structure:

```bash
# Find page components
apps/thanos-web/app/(main)/<feature-pages>/**/*.tsx

# Find related components
apps/thanos-web/app/(main)/**/*<Feature>*.tsx
```

**Extract UI details:**
- Page navigation paths
- Button locations and labels
- Modal dialogs and their triggers
- Filter/sort controls
- Table columns and their meanings
- Form fields and inputs
- Status badges and colors

### 3. Structure the User Guide

Follow this mandatory structure (based on 2026 user guide best practices):

```markdown
# [Feature Name] User Guide

## What is [Feature Name]?
[2-3 sentences explaining purpose in simple terms]
[Bulleted list of key capabilities]

## Understanding Key Concepts
[Explain terminology with examples]
[Use tables for clarity]

## Getting Started: Accessing [Feature]
### Step 1: Navigate to [Page]
📸 **[SCREENSHOT PLACEHOLDER]**
*Screenshot should show: [Detailed annotation instructions]*

1. [Action with UI element]
2. [Action with UI element]

[Continue with numbered steps...]

## [Main Task 1 - from User Story]
### Step 1: [Action]
📸 **[SCREENSHOT PLACEHOLDER]**
*Screenshot should show: [annotations with numbers/arrows/circles]*

1. [Detailed instruction]
2. [Detailed instruction]

### Step 2: [Next Action]
[Continue pattern...]

## [Main Task 2 - from User Story]
[Repeat pattern...]

## Filtering/Sorting/Advanced Features
[If applicable - explain filters, sorts, search]

## Common Scenarios
### Scenario 1: "[User goal in quotes]"
[Step-by-step solution]

### Scenario 2: "[User goal in quotes]"
[Step-by-step solution]

## Troubleshooting
### "[Problem description]"
- **Cause:** [Why this happens]
- **Solution:** [How to fix]

[Repeat for common issues from edge cases...]

## Quick Reference: What Can You Do?
| Action | Where | Permission Required |
|--------|-------|---------------------|
[Extract from access control table in README.md]

## Tips for Efficient Use
✅ [Best practice tip 1]
✅ [Best practice tip 2]
[...]

---

**Questions or Need Help?**
Contact your system administrator or refer to your team's documentation.
```

### 4. Screenshot Placeholder Guidelines

**CRITICAL:** Every screenshot placeholder MUST include:

1. **Visual location marker:** `📸 **[SCREENSHOT PLACEHOLDER]**`
2. **Detailed annotation instructions:** What should be highlighted and how
3. **Numbered elements:** When multiple UI elements need attention

**Annotation types to specify:**
- 🎯 **Arrows** - Point to buttons, links, menu items
- ⭕ **Circles** - Highlight specific fields or areas
- 🔢 **Numbers** - Show sequence of actions (1, 2, 3...)
- 🟨 **Highlight boxes** - Emphasize important sections
- 📝 **Tooltips/labels** - Explain what each element does

**Example format:**
```markdown
📸 **[SCREENSHOT PLACEHOLDER]**
*Screenshot should show: Main versions page with table. Annotate with:*
1. *Arrow pointing to "Filters" button (top left)*
2. *Circle around active filter chips below the button*
3. *Arrow pointing to "Refresh" button (top right)*
4. *Highlight the status badge column with numbered annotations for each color*
5. *Arrow pointing to pagination controls at bottom*
```

### 5. Language Guidelines

**DO:**
- ✅ Use simple, conversational language
- ✅ Write in active voice ("Click the button" not "The button should be clicked")
- ✅ Use "you" to address the user
- ✅ Explain WHY, not just WHAT (e.g., "Click Refresh to see the latest status updates")
- ✅ Use visual indicators (🟢 🔴 🟠 🔵 for status colors)
- ✅ Include context hints ("Look for...", "You'll see...")
- ✅ Break complex tasks into small, numbered steps
- ✅ Use tables for structured information
- ✅ Add tips and notes in callout format

**DON'T:**
- ❌ Use technical jargon without explanation
- ❌ Reference code, APIs, or technical implementation
- ❌ Assume users know where things are
- ❌ Write paragraphs longer than 3-4 sentences
- ❌ Skip obvious steps (e.g., "Click the X to close")
- ❌ Use passive voice
- ❌ Mention internal system details

### 6. Content Extraction Rules

**From README.md:**
- Overview section → "What is [Feature]?" section
- Key Concepts table → "Understanding Key Concepts" section
- User Stories → Main task sections (one section per story)
- Access Control table → "Quick Reference" table
- Role Categories → Explain in "Quick Reference"

**From architecture.md:**
- App Responsibilities > thanos-web → UI component locations
- Data Model → Explain key entities in simple terms (avoid technical DB details)
- Status diagrams → "Understanding Status" sections with visual indicators

**From spec.md:**
- Edge Cases section → "Troubleshooting" section
- Acceptance Scenarios → Validate task steps match these scenarios
- Requirements → Ensure all FR requirements are covered in guide

### 7. Quality Checklist

Before outputting, verify:

- [ ] Every main user story has a dedicated section
- [ ] Every UI interaction has a screenshot placeholder with annotations
- [ ] All status indicators explained with visual markers (🟢🔴🟠🔵)
- [ ] Permission requirements clearly stated
- [ ] At least 5 common scenarios included
- [ ] At least 5 troubleshooting entries
- [ ] Quick Reference table matches access control from docs
- [ ] No technical jargon without explanation
- [ ] All steps are numbered and actionable
- [ ] Tips section has 5+ actionable best practices

### 8. Output Format

Follow the user's preference from Step 0:

**Option 1 - Display as text:**
- Output the complete markdown guide as text in the chat
- User can review and manually save if they want
- Add a note: "Guide generated successfully! You can copy and save this to any location."

**Option 2 - Save to default location:**
- Save to `docs/features/{feature-domain}/user-guide.md`
- Use the Write tool to create the file
- Confirm: "✅ User guide created at: docs/features/{feature-domain}/user-guide.md"

**Option 3 - Save to custom path:**
- Use AskUserQuestion to get the custom path
- Save to the user-specified path using Write tool
- Confirm: "✅ User guide created at: {custom-path}"

**If output path was provided in arguments:**
- Save directly to the specified path (no question needed)
- Confirm file location

## Reference: 2026 User Guide Best Practices

Based on research, user guides with annotated screenshots achieve **67% better task completion** rates.

**Key principles:**
1. **Visual support is mandatory** - Never describe a UI without a screenshot placeholder
2. **Annotations prevent confusion** - Always specify arrows, circles, numbers
3. **Progressive disclosure** - Start simple, add complexity gradually
4. **Scenario-based learning** - Users learn better from real-world examples
5. **Troubleshooting is essential** - Address common failures proactively

## Example Screenshot Annotation

**Good example:**
```markdown
📸 **[SCREENSHOT PLACEHOLDER]**
*Screenshot should show: Filter drawer opened on right side of screen. Annotate with:*
1. *Arrow pointing to "Repository" dropdown field with label "Step 1: Select repository"*
2. *Arrow pointing to "Status" dropdown field with label "Step 2: Choose status"*
3. *Circle around "Apply" button at bottom with label "Step 3: Click to apply"*
4. *Arrow pointing to X close button in top right corner*
```

**Bad example:**
```markdown
📸 **[SCREENSHOT PLACEHOLDER]**
*Screenshot of filter drawer*
```

## Feature Domain Locations

Common feature domains in this project:

- `version-system` → `docs/features/version-system/`
- `repository-system` → `docs/features/repository-system/`
- `deployment-system` → `docs/features/deployment-system/`
- `app-status-management` → `docs/features/app-status-management/`
- `app-config-system` → `docs/features/app-config-system/`

## Final Notes

- **ALWAYS ask user preference** if no output path is provided (Step 0)
- **DO create files** only when user chooses save option or provides output path
- **DO include source URLs** if you used WebSearch for format references
- **DO ask clarifying questions** if feature documentation is incomplete
- **DO validate** that all user stories from README.md are covered
- **Default save location:** `docs/features/{feature-domain}/user-guide.md`
