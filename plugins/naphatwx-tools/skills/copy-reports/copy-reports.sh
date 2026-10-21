#!/usr/bin/env bash
# Copies report output (e2e-test, smoke-test, deploy-plan) from a git worktree into the main checkout.
# Never deletes anything in the worktree.
# e2e-results/ and scripts/smoke/results/ hold one folder per spec: on a clash the newer copy wins.
# Usage: copy-reports.sh [--dry-run] [extra report folder ...]   (folders are repo-relative)
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

# A name in main: <name>-wt-<branch>[-N][.ext]; a run folder keeps no extension split.
# Returns an existing one with the same content, so a rerun does not copy again.
free_name() {
  local parent=$1 name=$2 base ext candidate n=2
  if [ -d "$top/$3" ] || [[ "$name" != *.* ]]; then base=$name; ext=""; else base=${name%.*}; ext=".${name##*.}"; fi
  candidate="$base-wt-$branch$ext"
  while [ -e "$parent/$candidate" ] && ! diff -rq "$3" "$parent/$candidate" >/dev/null 2>&1; do
    candidate="$base-wt-$branch-$n$ext"; n=$((n + 1))
  done
  echo "$candidate"
}

# Newest file time (epoch seconds) inside a file or folder; BSD and GNU stat.
newest() {
  find "$1" -type f -exec stat -f %m {} + 2>/dev/null | sort -n | tail -1 ||
    find "$1" -type f -exec stat -c %Y {} + | sort -n | tail -1
}

# e2e-results/ and scripts/smoke/results/ hold one folder per spec (or _adhoc): one report each, so the newer copy wins.
one_per_spec() { [ "$1" = scripts/smoke/results ] || [ "$(basename "$1")" = e2e-results ]; }

copied=0 same=0 renamed=0 replaced=0 kept=0 skipped=0
for folder in ${folders[@]+"${folders[@]}"}; do
  if [ -L "$folder" ]; then echo "skip  $folder (symlink, already points elsewhere)"; skipped=$((skipped + 1)); continue; fi
  for entry in "$folder"/* "$folder"/.[!.]*; do
    [ -e "$entry" ] || continue
    if [ -n "$(git ls-files -- "$entry")" ]; then echo "skip  $entry (tracked by git)"; skipped=$((skipped + 1)); continue; fi
    dest_dir="$main/$folder"
    dest="$dest_dir/$(basename "$entry")"
    if [ -e "$dest" ]; then
      if diff -rq "$entry" "$dest" >/dev/null 2>&1; then
        echo "same  $entry (already in main)"
        same=$((same + 1)); continue
      fi
      if one_per_spec "$folder"; then
        wt_time=$(newest "$entry"); main_time=$(newest "$dest")
        if [ "${main_time:-0}" -ge "${wt_time:-0}" ]; then
          echo "keep  $entry (main's copy is newer; worktree copy left in place)"
          kept=$((kept + 1)); continue
        fi
        echo "replace $entry in main (worktree copy is newer)"
        replaced=$((replaced + 1))
        [ $dry = 1 ] && continue
        staging="$dest.keep-reports-$$"
        cp -Rp "$entry" "$staging"
        if ! diff -rq "$entry" "$staging" >/dev/null; then
          rm -rf "$staging"; echo "FAILED copy check for $entry; nothing replaced, worktree copy unchanged." >&2; exit 1
        fi
        rm -rf "$dest"; mv "$staging" "$dest"
        continue
      fi
      dest="$dest_dir/$(free_name "$dest_dir" "$(basename "$entry")" "$entry")"
      if [ -e "$dest" ]; then
        echo "same  $entry (already in main as ${dest#"$main"/})"
        same=$((same + 1)); continue
      fi
      renamed=$((renamed + 1))
      echo "copy  $entry -> ${dest#"$main"/} (name taken in main)"
    else
      echo "copy  $entry -> ${dest#"$main"/}"
    fi
    [ $dry = 1 ] && { copied=$((copied + 1)); continue; }
    mkdir -p "$dest_dir"
    cp -Rp "$entry" "$dest"
    if ! diff -rq "$entry" "$dest" >/dev/null; then
      echo "FAILED copy check for $entry; worktree copy unchanged." >&2
      exit 1
    fi
    copied=$((copied + 1))
  done
done

[ $dry = 1 ] && mode="dry run, nothing changed" || mode="done"
echo "main: $main"
echo "$mode: copied $copied ($renamed renamed), replaced $replaced, kept newer in main $kept, already there $same, skipped $skipped"
