#!/bin/bash
# How many worktrees of this repository are in a state where the suite cannot run whole.
# Counts only; touches nothing. Run from anywhere: bash census.sh
set -u
cd /Users/svendaneel/okam/Web-modules || exit 1

total=0; nm_missing=0; nm_symlink=0; nm_real=0; core_empty=0; core_ok=0
declare -a MISSING_NM=() EMPTY_CORE=() FOREIGN_LINK=()

while IFS= read -r w; do
  [ -f "$w/package.json" ] || continue
  total=$((total + 1))

  if [ -L "$w/node_modules" ]; then
    nm_symlink=$((nm_symlink + 1))
    target=$(readlink "$w/node_modules")
    # A link is only as good as the lock the tree behind it was installed from.
    owner=${target%/node_modules}
    if [ -f "$owner/package-lock.json" ] && [ -f "$w/package-lock.json" ]; then
      a=$(shasum -a 256 < "$owner/package-lock.json" | cut -d' ' -f1)
      b=$(shasum -a 256 < "$w/package-lock.json" | cut -d' ' -f1)
      [ "$a" = "$b" ] || FOREIGN_LINK+=("$w -> $target")
    fi
  elif [ -d "$w/node_modules" ]; then
    nm_real=$((nm_real + 1))
  else
    nm_missing=$((nm_missing + 1)); MISSING_NM+=("$w")
  fi

  if [ -f "$w/.gitmodules" ]; then
    if [ -d "$w/core" ] && [ -z "$(ls -A "$w/core" 2>/dev/null)" ]; then
      core_empty=$((core_empty + 1)); EMPTY_CORE+=("$w")
    else
      core_ok=$((core_ok + 1))
    fi
  fi
done < <(git worktree list --porcelain | sed -n 's/^worktree //p')

printf 'measured %s\n' "$(date -u '+%Y-%m-%dT%H:%M:%SZ')"
printf 'worktrees carrying a package.json ......... %s\n' "$total"
printf '  node_modules ABSENT ..................... %s   (the suite cannot start)\n' "$nm_missing"
printf '  node_modules symlinked elsewhere ........ %s\n' "$nm_symlink"
printf '    ...of those, linked at a checkout whose package-lock.json DIFFERS: %s\n' "${#FOREIGN_LINK[@]}"
printf '  node_modules a real directory ........... %s\n' "$nm_real"
printf '  core/ present but EMPTY ................. %s   (the suite runs and undercounts)\n' "$core_empty"
printf '  core/ populated ......................... %s\n' "$core_ok"

printf '\n-- node_modules absent --\n'; printf '%s\n' "${MISSING_NM[@]}"
printf '\n-- symlinked at a lock that differs --\n'; printf '%s\n' "${FOREIGN_LINK[@]:-(none)}"
printf '\n-- core/ present but empty --\n'; printf '%s\n' "${EMPTY_CORE[@]}"
