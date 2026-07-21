---
name: c-multi-column-sort
description: >-
  Implement multi-column table sorting with a tri-state per-column toggle
  (none -> ASC -> DESC -> none) and a sort priority stack. Ships a
  framework-agnostic TypeScript core plus a client-side comparator and
  server-side sort-param serializers. Use when adding sortable table headers,
  "sort by multiple columns", multi-sort, sort priority, or three-state column
  sort UX to a table/grid/list.
---

# Multi-column sort

Add sortable table headers where **every column is sortable**, each column
cycles through **three states**, and **multiple columns stack** by priority.

## Behavior contract

Per column, each header click advances one step:

```
not sorted (default)  ->  ASC  ->  DESC  ->  not sorted  ->  ...
```

Sort state is an **ordered list** — the order IS the priority:

- First entry = primary sort key, second = tie-breaker, and so on.
- Clicking an unsorted column **appends** it (becomes lowest priority).
- Clicking a sorted column flips ASC->DESC **in place** (priority unchanged).
- Clicking a DESC column **removes** it from the stack.

This "append on add" rule is the standard stack semantics. If a product wants
the newest click to become the *primary* key instead, prepend instead of
append — call it out to the user rather than switching silently.

## The core (framework-agnostic)

Copy [reference/sort-core.ts](reference/sort-core.ts) into the project. It has
zero dependencies and no framework code:

- `SortDir`, `SortEntry`, `SortState` — the types. `SortState` is an ordered
  `SortEntry[]`; order = priority.
- `cycleSort(state, id)` — the tri-state transition. Returns a **new** array
  (never mutates), so it drops straight into React `setState`, Redux, Vue
  refs, Svelte stores, or a plain variable.
- `getSortDir(state, id)` / `getSortIndex(state, id)` — read a column's
  current direction and 1-based priority for rendering the header.

Adapt names/paths to the host project's conventions; don't paste it verbatim
if the repo has an established utils location and naming style.

## Client-side sorting

When the full dataset is in memory, build a comparator from the state and an
accessor per column, then sort a **copy** of the array.

```ts
import { makeComparator } from './sort-core'

const comparator = makeComparator(sortState, {
  name: (r) => r.name,
  age: (r) => r.age,
  createdAt: (r) => r.createdAt, // Date | string | number all handled
})
const sorted = [...rows].sort(comparator)
```

`makeComparator` walks the stack in priority order and returns on the first
non-zero comparison. The shared `compareValues` handles null/undefined
(sorted last), numbers, strings (locale-aware), booleans, and dates. Empty
state -> comparator returns 0 -> original order is preserved (stable in modern
engines).

## Server-side sorting

When the backend paginates/sorts, send the stack as a sort parameter. Pick the
serializer in [reference/server-serializers.ts](reference/server-serializers.ts)
that matches the backend contract:

- `toDashPrefix(state)` -> `"name,-age"` (`-` prefix = DESC). Common REST/JSON:API.
- `toDirSuffix(state)` -> `"name asc,age desc"`. OData / SQL-ish.
- `toSortObjects(state)` -> `[{ field, direction }]`. gRPC / typed APIs.

Reset pagination to the first page whenever the sort state changes, and keep
the stack itself as the single source of truth — derive the query string from
it, don't store both.

**Hybrid (both):** keep one `SortState`. When the current view has all rows
loaded, sort client-side with `makeComparator`; when it is server-paginated,
serialize the same state and refetch. The UI/toggle code is identical either
way — only the consumer of the state differs.

## Header UI + accessibility

For each sortable header cell:

- Make it a `<button>` (or `role="button"` + keyboard handler) so it is
  focusable and Enter/Space activate it.
- Set `aria-sort` to `"ascending"`, `"descending"`, or `"none"` from
  `getSortDir`.
- Show a direction indicator (arrow up/down; neutral/greyed when unsorted).
- When more than one column is sorted, show the **priority number**
  (`getSortIndex`) as a small badge so users can read the order.
- Give a way to reset all sorts (clear the array) — a header menu item or a
  "Clear sort" control.

Minimal React example:

```tsx
function SortableTh({ id, label, sortState, onSort }: Props) {
  const dir = getSortDir(sortState, id)
  const index = getSortIndex(sortState, id)
  const ariaSort = dir === 'asc' ? 'ascending' : dir === 'desc' ? 'descending' : 'none'
  return (
    <th aria-sort={ariaSort}>
      <button type="button" onClick={() => onSort(cycleSort(sortState, id))}>
        {label}
        <SortArrow dir={dir} />
        {sortState.length > 1 && index > 0 && <span className="badge">{index}</span>}
      </button>
    </th>
  )
}
```

## Steps to apply

1. Drop `sort-core.ts` (and serializers if server-side) into the project.
2. Hold one `SortState` where the table state lives (component state, Redux
   slice, URL query, etc.).
3. Wire each header: on click call `onSort(cycleSort(state, columnId))`.
4. Consume the state — client comparator, server query, or both.
5. Render `aria-sort`, the direction arrow, and the priority badge.

## Gotchas

- **Column id must be stable** and match both the accessor keys and the
  server field names. Mismatches silently drop a column from sorting.
- **Don't mutate.** `Array.prototype.sort` sorts in place — always sort a copy
  (`[...rows]`) so change detection fires.
- **Locale for strings.** `compareValues` uses `localeCompare`; pass a locale
  if the product needs a specific one (e.g. Thai collation).
- **Server field mapping.** UI column ids are not always DB/proto field names —
  map through a lookup in the serializer if they differ.
