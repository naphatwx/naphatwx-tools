#!/bin/sh
# herdr tab.created hook: run claude in the new tab's only pane.
# Wait for the shell prompt first: text typed while .zshrc still loads reaches the shell raw and claude exits at once.
# No prompt within 15s: send nothing.
herdr="$HERDR_BIN_PATH"
pane=$("$herdr" pane list --workspace "$HERDR_WORKSPACE_ID" |
  python3 -c 'import json,sys,os;print(next(p["pane_id"] for p in json.load(sys.stdin)["result"]["panes"] if p["tab_id"]==os.environ["HERDR_TAB_ID"]))') || exit 1
"$herdr" pane wait-output "$pane" --regex '[%$#>❯] *$' --timeout 15000 >/dev/null 2>&1 || exit 0
"$herdr" pane run "$pane" claude
