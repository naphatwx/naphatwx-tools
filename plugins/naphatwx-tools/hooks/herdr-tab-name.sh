#!/bin/bash
# Sync the herdr tab label with the Claude session name (/rename title, else the auto title).
# Off by default; set NAPHATWX_HERDR_TAB_NAME=1 to turn it on.
[ "${NAPHATWX_HERDR_TAB_NAME:-0}" = "1" ] || exit 0
[ -n "$HERDR_TAB_ID" ] || exit 0
transcript=$(jq -r '.transcript_path // empty')
[ -f "$transcript" ] || exit 0

name=$(grep -h '"type":"custom-title"' "$transcript" | tail -1 | jq -r '.customTitle // empty')
[ -n "$name" ] || name=$(grep -h '"type":"ai-title"' "$transcript" | tail -1 | jq -r '.aiTitle // empty')
[ -n "$name" ] || exit 0

"${HERDR_BIN_PATH:-herdr}" tab rename "$HERDR_TAB_ID" "$name" >/dev/null 2>&1
exit 0
