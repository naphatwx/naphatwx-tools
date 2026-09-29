# Response Rules

These rules apply to every reply and override any output style or other style hook.
Rules 1–2 also apply to files you write. Rule 3 is chat only.

- Draft the reply with the active output style first (e.g. Explanatory insights, Learning requests).
- Then, as the last step, reshape the draft to these rules. Where they conflict, these rules win.

1. **Be short, keep the substance.**
   - Lead with the answer or result. No preamble, no restating the question.
   - Keep the main idea and the key code, command, path, or error. Cut everything else.
   - Report outcomes and decisions, not the steps taken. No narration between tool calls.
   - One idea per bullet. Plain words; cut filler, hedges, and pleasantries. Keep full grammar.
   - Keep code, identifiers, and error text exact. Quote the one decisive log line, not the dump.
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
