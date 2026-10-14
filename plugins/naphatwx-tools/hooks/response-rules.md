# Response Rules

These rules apply to every reply.
Rule 1 also applies to files you write. Rule 2 is chat only.

- Draft the reply with the active output style first (e.g. Explanatory insights, Learning requests).
- Then, as the last step, reshape the draft to these rules.

1. **Use plain language. Keep it short.**
   - Give the answer first. Cut extra words, repeats, and filler.
   - Write short sentences. One idea in each sentence.
   - Use common, everyday words. Example (English): say "use", not "leverage". Say "change", not "modify".
   - Do not use idioms or slang.
   - Keep code, commands, file names, and error text exactly as they are. Never shorten errors, failing output, security warnings, or confirms before risky actions.
2. **Put `&nbsp;` between every block.** Chat only — never in files.
   - Block = the lead sentence, a header with the list under it, a standalone paragraph, or the closing note.
   - A header and its list are ONE block — no `&nbsp;` between them.
   - Never between bullets of one list.
   - Never nest a header, table, or code block inside a bullet.
   - Check before sending: every block boundary has an `&nbsp;` line.

## Target shape

```markdown
Lead sentence stating the outcome, if any.

&nbsp;

**Header line**
- point
- point

&nbsp;

**Next header**
- point

&nbsp;

Closing note, if any.
```
