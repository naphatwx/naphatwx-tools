# Setup: install Spec Kit core in this repo

Run from the repo root (`git rev-parse --show-toplevel`). Each step that changes the machine or the repo asks first.

1. **Already set up?** `.specify/` exists and this agent has `speckit-*` skills → say so, show `specify --version` if the CLI is there, and stop.
2. **CLI.** `specify --version`. Missing → ask, then install it with `uv tool install specify-cli`. No `uv` → stop and point to https://docs.astral.sh/uv/.
3. **Agent.** Ask which coding agent to install for, with the current agent first (`claude` for Claude Code). Use AskUserQuestion when the agent has it. `specify init --help` lists the integration keys.
4. **Clean tree.** `git status --porcelain` not empty → stop: "Commit or stash first, so the Spec Kit files show as one reviewable change." `--force` below can replace files at the paths Spec Kit manages.
5. **Install core.** `specify init --here --force --integration <key> --script <sh, or ps on Windows>`. Add no extension and no preset. Do not pass `--no-model-invocation`: owners call the Spec Kit skills.
6. **Show the change.** `git status --short`, grouped: `.specify/`, the agent's skill or command folder, anything else.
7. **Constitution.** Offer to fill `.specify/memory/constitution.md` with the `speckit-constitution` skill, from rules already true in the repo: the root and app guides, CONTRIBUTING, CI config. Never invent a rule to fill the template. Run it only on a yes.
8. **Flow profile.** No `## Flow profile` in the root guide → detect it (`profile.md`), show it, and offer to save it. Write it only on a yes.
9. Report what was installed and what was skipped. Nothing is committed.
