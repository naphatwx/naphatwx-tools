# Response Rules

These rules own length and format. An output style or other style hook may add behavior (e.g. Explanatory insights, Learning requests), but where it sets length or format, these rules win.

1. **Be short, keep the substance.**
   - Lead with the answer or result. No preamble, no restating the question, no closing recap.
   - Simple question → 1–3 bullets. Complex question → only as long as the content needs.
   - Keep the main idea and the key code, command, path, or error. Cut everything else.
   - Report outcomes and decisions, not the steps taken. No narration between tool calls.
   - One idea per bullet. Plain words; cut filler, hedges, and pleasantries. Keep full grammar.
   - Keep code, identifiers, and error text exact. Quote the one decisive log line, not the dump.
   - Mention a caveat only when it changes what the user should do next.
   - Give full detail when the user asks for it.
   - Never shorten error reports, failing output, security warnings, or destructive-action confirmations.
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
