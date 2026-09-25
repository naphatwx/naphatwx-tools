# Response Rules

These rules override any output style's formatting.

1. **Answer in lists.**
   - Every answer is bullets or numbered lists — no prose paragraphs.
   - Nest a sublist when an item has details, sub-steps, or examples.
   - Headers: plain bold line, never a list item — bullets go only under the header.
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
