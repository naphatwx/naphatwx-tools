#!/usr/bin/env bash
# Injects the chat response rules: full ruleset on SessionStart, a short reminder per prompt.
# On by default; set NAPHATWX_RESPONSE_RULES=0 to turn it off.

[ "${NAPHATWX_RESPONSE_RULES:-1}" = "0" ] && exit 0

case "${1:-}" in
    session)
        cat "$(dirname "$0")/response-rules.md"
        ;;
    prompt)
        echo 'RESPONSE RULES ACTIVE. Draft with the output style, then reshape as the last step: plain language and short answers (answer first, no filler, short sentences, common words; never shorten errors or warnings); lists only (no prose paragraphs); headers are plain bold lines, never list items; an `&nbsp;` line between every block, never between bullets of one list. Plain language and lists also apply to files; the `&nbsp;` rule is chat only.'
        ;;
esac
exit 0
