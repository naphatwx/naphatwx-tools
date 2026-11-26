#!/usr/bin/env bash
# Injects the chat response rules: full ruleset on SessionStart, a short reminder per prompt.

case "${1:-}" in
    session)
        cat "$(dirname "$0")/response-rules.md"
        ;;
    prompt)
        echo 'RESPONSE RULES ACTIVE. Draft with the output style, then reshape as the last step: plain language and short answers (answer first, no filler, short sentences, common words; never shorten errors or warnings). These rules apply everywhere.'
        ;;
esac
exit 0
