/**
 * Serialize SortState into common backend sort-param shapes.
 * Pick the one that matches the API contract; delete the rest.
 */

import type { SortState } from './sort-core'

/** Optional map from UI column id -> backend field name (when they differ). */
export type FieldMap = Record<string, string>

function field(id: string, map?: FieldMap): string {
  return map?.[id] ?? id
}

/** `"name,-age"` — `-` prefix means DESC. REST / JSON:API style. */
export function toDashPrefix(state: SortState, map?: FieldMap): string {
  return state.map((e) => (e.dir === 'desc' ? '-' : '') + field(e.id, map)).join(',')
}

/** `"name asc,age desc"` — OData / SQL-ish style. */
export function toDirSuffix(state: SortState, map?: FieldMap): string {
  return state.map((e) => `${field(e.id, map)} ${e.dir}`).join(',')
}

/** `[{ field, direction }]` — typed gRPC / JSON body style. */
export function toSortObjects(
  state: SortState,
  map?: FieldMap,
): Array<{ field: string; direction: 'ASC' | 'DESC' }> {
  return state.map((e) => ({
    field: field(e.id, map),
    direction: e.dir === 'desc' ? 'DESC' : 'ASC',
  }))
}
