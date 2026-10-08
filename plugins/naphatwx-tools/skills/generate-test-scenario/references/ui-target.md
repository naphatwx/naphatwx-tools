# `--target ui`: browser scenarios

These additions apply when the target is the web UI. The output feeds the `e2e-test` skill, which turns each case into a Playwright test with a screenshot at every step. Write each step so it maps to exactly one user action or one check.

## Step 3 additions: read the UI code

Besides the backend items, pin down:

- **Routes**: the URL of every page the feature touches, and how a user gets there (sidebar item, button, link).
- **Controls**: for every button, input, tab, menu, dialog and toast in the flow, the selector in this order:
  `data-testid` → role plus accessible name → label → exact visible text. Quote it from the code.
- **Copy**: the exact visible text of headings, empty states, errors and toasts the cases assert.
- **States**: loading, empty, error, disabled and permission-hidden variants, and what triggers each one.
- **Sign-in**: the roles that can and cannot use the feature, and how the app signs a test user in (dev-login, a token cookie, a login form).
- **Keyboard and focus**: Escape, Tab order, focus traps, shortcuts the feature defines or blocks.
- **Viewport rules**: anything that changes at phone width (a breakpoint in the code).

A control with no stable selector is still listed, marked `⚠️ no stable selector`.

## Step 4: no MCP surface

Skip it. Keep **Related read APIs** from step 3: a write case still reads its data back through the API.

## Step 5 additions: UI coverage

| Group | Cover |
|---|---|
| Happy path | The main flow, by clicks and typing, ending in what the user sees plus an API read-back |
| Navigation | Reaching the page from where users really start; deep link; back button keeps state |
| States | Empty, loading, error with retry, disabled, permission-hidden |
| Validation | Inline errors shown for each rejected input; the form keeps what was typed |
| Keyboard / focus | Escape closes, focus returns, Tab stays inside a modal, shortcuts blocked or working |
| Permission | A role without the right does not see the control, or sees it disabled with a reason |
| Viewport / theme | Only where the code has a phone-width or dark-mode rule |

## Step 6: UI case format

Header: replace **Target** with:

```markdown
- **Target**: UI `{base URL or "local dev"}` — pages: `{/route}`, `{/route}`
- **Sign-in**: `{role}` via `{dev-login | token cookie | form}`; second role for permission cases: `{role}`
- **Viewport**: `{1280×800}` (and `{375×812}` only for cases that need it)
```

Add a **Selectors** table after Preconditions:

```markdown
## Selectors

| Name | Selector | Source |
| ---- | -------- | ------ |
| New button | `data-testid=announcement-new-button` | `app/(main)/announcements/page.tsx:42` |
| Save as draft | role `button`, name "Save as draft" | `AnnouncementForm.tsx:310` |
```

Each case:

````markdown
## TC-01 — {short title}

**Depends on**: none
**Page**: `{/route}`   **Role**: `{role}`   **Viewport**: default

**Steps**
1. Open `{/route}`
2. Click **{Name}**
3. Type `{value}` into **{Name}**
4. Press `Escape`
5. Check: {what is on screen}

**Expected**
- After step 2: dialog **{Name}** is open, focus is on **{Name}**
- After step 5: text "{exact copy}" is visible; URL is `{/route}`
- API read-back: `GET {route}` → `{field}` = `{value}`

**Result**: _(fill in when run)_
````

## Step 7 additions: writing rules

- **One action or one check per step.** Each step gets its own screenshot later, so "Fill the form and save" is two steps or more.
- **Steps name controls by the Selectors table name.** Never a raw CSS selector.
- **Every Expected is visible or measurable**: exact copy, URL, open or closed, focused, enabled or disabled, a count. Never "looks right".
- **Waits are on state, never on time**, except when the feature is about time (an auto-hide after 5 s). Then state the duration.
- Test data uses the `__e2e_` prefix (not `TEST_AI_`), so the e2e-test cleanup finds it.
