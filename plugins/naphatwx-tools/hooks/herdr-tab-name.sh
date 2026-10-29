#!/bin/bash
# Sync the herdr tab label with the Claude session title, once per reply (Stop).
# Reads the pane's terminal title from herdr, where Claude shows the session title.
# Off by default; set NAPHATWX_HERDR_TAB_NAME=1 to turn it on.
[ "${NAPHATWX_HERDR_TAB_NAME:-0}" = "1" ] || exit 0
[ -n "$HERDR_TAB_ID" ] && [ -n "$HERDR_PANE_ID" ] || exit 0
herdr="${HERDR_BIN_PATH:-herdr}"

# Print a JSON string field's value: $1 = field name, stdin = JSON.
field() { sed -nE "s/.*\"$1\":\"(([^\"\\\\]|\\\\.)*)\".*/\1/p" | sed 's/\\"/"/g; s/\\\\/\\/g'; }

name=$("$herdr" pane get "$HERDR_PANE_ID" 2>/dev/null | field terminal_title_stripped)
[ -n "$name" ] || exit 0
label=$("$herdr" tab get "$HERDR_TAB_ID" 2>/dev/null | field label)
[ "$name" = "$label" ] || "$herdr" tab rename "$HERDR_TAB_ID" "$name" >/dev/null 2>&1
exit 0
