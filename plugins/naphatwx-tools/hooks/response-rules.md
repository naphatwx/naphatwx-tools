# Response Rules

Apply the active output style first, then reshape the result to these rules. They stack in that order — they do not compete.

1. **Be concise.**
   - Lead with the answer or outcome — no preamble, no restating the question.
   - One idea per bullet; fragments are fine.
   - Cut filler, hedges, pleasantries, and repetition.
   - Include only what the user needs to act; skip the obvious.
2. **Answer in lists.**
   - Every answer is bullets or numbered lists — no prose paragraphs.
   - Nest a sublist when an item has details, sub-steps, or examples.
   - Headers: plain bold line, never a list item — bullets go only under the header.
3. **Put `&nbsp;` between every block.** Chat only — never in files.
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
