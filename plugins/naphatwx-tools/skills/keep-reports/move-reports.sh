#!/usr/bin/env bash
# Moves report output (e2e-test, smoke-test, deploy-plan) from a git worktree into the main checkout.
# Usage: move-reports.sh [--dry-run] [extra report folder ...]   (folders are repo-relative)
set -euo pipefail

dry=0
extra=()
for arg in "$@"; do
  case "$arg" in
    --dry-run) dry=1 ;;
    *) extra+=("${arg%/}") ;;
  esac
done

top=$(git rev-parse --show-toplevel)
common=$(git rev-parse --path-format=absolute --git-common-dir)
main=$(dirname "$common")
if [ "$top" = "$main" ]; then
  echo "Not a worktree: $top is the main checkout. Run this from inside a worktree." >&2
  exit 2
fi
branch=$(git rev-parse --abbrev-ref HEAD | tr '/' '-')
cd "$top"

folders=()
[ -d deploy-plans ] && folders+=(deploy-plans)
[ -d scripts/smoke/results ] && folders+=(scripts/smoke/results)
while IFS= read -r dir; do folders+=("${dir#./}"); done < <(
  find . -type d \( -name node_modules -o -name .git \) -prune -o -type d -name e2e-results -print 2>/dev/null
)
for dir in ${extra[@]+"${extra[@]}"}; do
  [ -d "$dir" ] && folders+=("$dir") || echo "skip  $dir (no such folder)"
done

# A free name in main: <name>-wt-<branch>[-N][.ext]; a run folder keeps no extension split.
free_name() {
  local parent=$1 name=$2 base ext candidate n=2
  if [ -d "$top/$3" ] || [[ "$name" != *.* ]]; then base=$name; ext=""; else base=${name%.*}; ext=".${name##*.}"; fi
  candidate="$base-wt-$branch$ext"
  while [ -e "$parent/$candidate" ]; do candidate="$base-wt-$branch-$n$ext"; n=$((n + 1)); done
  echo "$candidate"
}

moved=0 same=0 renamed=0 skipped=0
for folder in ${folders[@]+"${folders[@]}"}; do
  if [ -L "$folder" ]; then echo "skip  $folder (symlink, already points elsewhere)"; skipped=$((skipped + 1)); continue; fi
  for entry in "$folder"/* "$folder"/.[!.]*; do
    [ -e "$entry" ] || continue
    if [ -n "$(git ls-files -- "$entry")" ]; then echo "skip  $entry (tracked by git)"; skipped=$((skipped + 1)); continue; fi
    dest_dir="$main/$folder"
    dest="$dest_dir/$(basename "$entry")"
    if [ -e "$dest" ]; then
      if diff -rq "$entry" "$dest" >/dev/null 2>&1; then
        echo "same  $entry (already in main, removing worktree copy)"
        [ $dry = 1 ] || rm -rf "$entry"
        same=$((same + 1)); continue
      fi
      dest="$dest_dir/$(free_name "$dest_dir" "$(basename "$entry")" "$entry")"
      renamed=$((renamed + 1))
      echo "move  $entry -> ${dest#"$main"/} (name taken in main)"
    else
      echo "move  $entry -> ${dest#"$main"/}"
    fi
    [ $dry = 1 ] && { moved=$((moved + 1)); continue; }
    mkdir -p "$dest_dir"
    cp -Rp "$entry" "$dest"
    if diff -rq "$entry" "$dest" >/dev/null; then
      rm -rf "$entry"
    else
      echo "FAILED copy check for $entry; worktree copy kept." >&2
      exit 1
    fi
    moved=$((moved + 1))
  done
done

[ $dry = 1 ] && mode="dry run, nothing changed" || mode="done"
echo "main: $main"
echo "$mode: moved $moved ($renamed renamed), already there $same, skipped $skipped"
