# ER diagram

An ER diagram is its own page: tables with their columns, types and keys, and foreign-key lines from column to column. It is opened by a link, not embedded in an iframe.

## What to include

- The tables the source names. From a feature (such as a design-feature brief): every table the feature reads or writes, including external ones another service owns.
- From migrations, DDL, ORM models or a live database: the tables the user asked for, or every table in the schema. Read a live database with read-only schema queries only.
- Every FK between the included tables.
- Changes, when the source has them: new table, added / changed / dropped columns, new or changed FKs. Tags: `new table`, `altered`, `read` (read or written without a schema change), `external`.

## diagram-design mode

- Ask for a **Database Schema** diagram (`type-db-schema`: FK lines column to column, `ON DELETE` label when the source gives one), dark theme, in the theme's colors and type (SKILL.md hard rule 4); save it as `er-diagram.html`. No embed script: it is a page, not an iframe.
- Over its budget (5 tables, 8 columns each) → split by area (for example catalog, ordering) into `er-<area>.html`, one link per page. Every table appears in at least one page; a table shared by two areas appears in both.

## Manual mode

- Copy `template/er/er-diagram.html` to `er-diagram.html` in the output folder. Change only the `<title>`, the `<h1>`, the `.sub` line and the `ER` object:
    - `tables`: `{ id, name, tag, at: [col, row], cols: [[name, type, key, mark?]] }`. `key` is `PK`, `FK`, `UQ`, `NN` or empty; `mark` is `add`, `change` or `drop`, with `+ add` / `~ type` / `− drop` as the key.
    - `rels`: `[from "table.col", to "table.col", fromCard, toCard, isNew?]`, from the FK column to the column it references.
    - Layout: at most 4 grid columns; put a child next to its parent; keep FK lines short and avoid lines that cross a table.
- The `← Overview` link points at `../overview.html#database` for design-feature. No such page → remove the link.
- It draws any number of tables; split by area only when one page gets hard to read (more than about 12 tables).
- The diagram fills the page width (up to 80% of the window height) and never shrinks below 1:1, so its 12px text stays readable; hovering or tabbing to a table traces its relations.

## Checks

- Every included table and FK draws; every `rels` column exists (the console has no `[er]` warnings).
- No FK line crosses a table; no column text overlaps its type.
