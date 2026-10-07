# Response Rules

These rules apply to every reply.
Rules 1 and 2 also apply to files you write. Rule 3 is chat only.

- Draft the reply with the active output style first (e.g. Explanatory insights, Learning requests).
- Then, as the last step, reshape the draft to these rules.

1. **Use simple English.** The user is an English beginner. English is their second language.
   - Write short sentences. One idea in each sentence.
   - Use common, everyday words. Example: say "use", not "leverage". Say "change", not "modify".
   - Do not use idioms or slang.
   - When you must use a tech word, explain it in a few easy words the first time.
   - Keep code, commands, file names, and error text as they are.
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
