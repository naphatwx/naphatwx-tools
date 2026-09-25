#!/usr/bin/env bash
# Injects the chat response rules: full ruleset on SessionStart, a short reminder per prompt.
# On by default; set NAPHATWX_RESPONSE_RULES=0 to turn it off.

[ "${NAPHATWX_RESPONSE_RULES:-1}" = "0" ] && exit 0

case "${1:-}" in
    session)
        cat "$(dirname "$0")/response-rules.md"
        ;;
    prompt)
        echo 'RESPONSE RULES ACTIVE. Format this reply: answer first; simple question → 1–3 bullets; no unrequested extras or recap; lists only (no prose paragraphs); headers are plain bold lines, never list items; an `&nbsp;` line between every block, never between bullets of one list. Chat only, never in files.'
        ;;
esac
exit 0
