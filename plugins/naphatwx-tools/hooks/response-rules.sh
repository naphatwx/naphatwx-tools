#!/usr/bin/env bash
# Injects the chat response rules: full ruleset on SessionStart, a short reminder per prompt.
# Off by default; set NAPHATWX_RESPONSE_RULES=1 to turn it on.

[ "${NAPHATWX_RESPONSE_RULES:-0}" = "1" ] || exit 0

case "${1:-}" in
    session)
        cat "$(dirname "$0")/response-rules.md"
        ;;
    prompt)
        echo 'RESPONSE RULES ACTIVE. Draft with the output style, then reshape as the last step: plain language and short answers (answer first, no filler, short sentences, common words; never shorten errors or warnings); lists only (no prose paragraphs); headers are plain bold lines, never list items. Plain language and lists also apply to files.'
        ;;
esac
exit 0
