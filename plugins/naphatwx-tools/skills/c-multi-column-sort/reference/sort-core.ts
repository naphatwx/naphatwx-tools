/**
 * Multi-column sort core — framework-agnostic, zero dependencies.
 * State is an ordered list; list order = sort priority (index 0 = primary).
 */

export type SortDir = 'asc' | 'desc'

export interface SortEntry {
  /** Stable column id — must match accessors and server field names. */
  id: string
  dir: SortDir
}

/** Ordered list of active sorts. Order is the priority. */
export type SortState = readonly SortEntry[]

/**
 * Tri-state transition for one column. Returns a new array (never mutates).
 *
 *   not sorted -> ASC (appended, lowest priority)
 *   ASC        -> DESC (in place, priority unchanged)
 *   DESC       -> not sorted (removed)
 *
 * To make the newest click the PRIMARY key instead, prepend on add:
 * `return [{ id, dir: 'asc' }, ...state]`.
 */
export function cycleSort(state: SortState, id: string): SortState {
  const idx = state.findIndex((e) => e.id === id)
  if (idx === -1) return [...state, { id, dir: 'asc' }]

  const entry = state[idx]
  if (entry.dir === 'asc') {
    const next = state.slice()
    next[idx] = { id, dir: 'desc' }
    return next
  }
  return state.filter((e) => e.id !== id)
}

/** Current direction for a column, or null if not sorted. */
export function getSortDir(state: SortState, id: string): SortDir | null {
  return state.find((e) => e.id === id)?.dir ?? null
}

/** 1-based priority for a column, or 0 if not sorted. */
export function getSortIndex(state: SortState, id: string): number {
  const idx = state.findIndex((e) => e.id === id)
  return idx === -1 ? 0 : idx + 1
}

/** Clear all sorts. */
export function clearSort(): SortState {
  return []
}

/**
 * Compare two arbitrary values. null/undefined sort last. Numbers numerically,
 * strings via localeCompare, booleans false<true, dates chronologically.
 * Pass a locale for locale-specific collation (e.g. 'th').
 */
export function compareValues(a: unknown, b: unknown, locale?: string): number {
  if (a == null && b == null) return 0
  if (a == null) return 1
  if (b == null) return -1

  if (typeof a === 'number' && typeof b === 'number') return a - b
  if (typeof a === 'boolean' && typeof b === 'boolean') return Number(a) - Number(b)

  const da = a instanceof Date ? a.getTime() : null
  const db = b instanceof Date ? b.getTime() : null
  if (da != null && db != null) return da - db

  return String(a).localeCompare(String(b), locale)
}

export type Accessor<T> = (row: T) => unknown

/**
 * Build a comparator from the sort state and one accessor per column id.
 * Walks the stack in priority order; returns on the first non-zero compare.
 * Use with a COPY of the array: `[...rows].sort(makeComparator(state, acc))`.
 */
export function makeComparator<T>(
  state: SortState,
  accessors: Record<string, Accessor<T>>,
  locale?: string,
): (a: T, b: T) => number {
  return (a, b) => {
    for (const { id, dir } of state) {
      const accessor = accessors[id]
      if (!accessor) continue
      const cmp = compareValues(accessor(a), accessor(b), locale)
      if (cmp !== 0) return dir === 'asc' ? cmp : -cmp
    }
    return 0
  }
}
