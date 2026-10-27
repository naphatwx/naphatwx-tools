# Removed Response Rules

Not loaded by the hook. To restore one, copy it back into `response-rules.md` and `response-rules.sh`.

## Rule 3: `&nbsp;` between blocks (removed in 1.9.258)

`response-rules.md`, after rule 2:

```markdown
3. **Put `&nbsp;` between every block.** Chat only — never in files.
   - Block = the lead sentence, a header with the list under it, a standalone paragraph, or the closing note.
   - A header and its list are ONE block — no `&nbsp;` between them.
   - Never between bullets of one list.
   - Never nest a header, table, or code block inside a bullet.
   - Check before sending: every block boundary has an `&nbsp;` line.
```

`response-rules.md` intro line:

```markdown
Rules 1 and 2 also apply to files you write. Rule 3 is chat only.
```

`response-rules.md` target shape:

````markdown
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
````

`response-rules.sh` prompt reminder:

```text
RESPONSE RULES ACTIVE. Draft with the output style, then reshape as the last step: plain language and short answers (answer first, no filler, short sentences, common words; never shorten errors or warnings); lists only (no prose paragraphs); headers are plain bold lines, never list items; an `&nbsp;` line between every block, never between bullets of one list. Plain language and lists also apply to files; the `&nbsp;` rule is chat only.
```
