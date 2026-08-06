#!/bin/bash
# L-MODULES-PREFLIGHT-FAILS-LOUD — the falsification.
#
# Drives two worktrees of this repository, at the same commit, differing only in whether their
# module trees are present, and records exactly what each run does — exit code, reported total, and
# whether anything names the cause. Evidence is written HERE, in the plan repo's lane directory,
# never into either tree under measurement: a sibling lane's build id gained `+dirty` from two
# untracked run logs alone.
#
#   HEALTHY  a worktree with node_modules symlinked at the shared tree and the core submodule
#            populated — the state a lane needs and cannot currently tell it is in.
#   MISSING  a worktree with neither. Created deliberately; NOT repaired.
#
# Each pair is run at BEFORE (the tip this lane cut from) and at AFTER (the tip carrying the
# preflight), in the same directories, so nothing is compared across trees.
#
# Usage: bash falsify.sh            (assumes the two worktrees below already exist)

set -u

HEALTHY=/Users/svendaneel/okam/web-preflight
MISSING=/Users/svendaneel/okam/web-preflight-missing
BEFORE=e34977a
AFTER=eb9d52e
OUT="$(cd "$(dirname "$0")" && pwd)"

hr () { printf '\n================================================================================\n%s\n================================================================================\n' "$1"; }

# Assert the premise of every number below, rather than assuming it.
hr "PREMISE — the two trees, asserted, not assumed"
for tree in "$HEALTHY" "$MISSING"; do
  printf '%s\n' "$tree"
  printf '  HEAD             %s\n' "$(git -C "$tree" rev-parse --short HEAD)"
  printf '  dirty files      %s\n' "$(git -C "$tree" status --porcelain | wc -l | tr -d ' ')"
  if [ -L "$tree/node_modules" ]; then
    printf '  node_modules     symlink -> %s\n' "$(readlink "$tree/node_modules")"
  elif [ -d "$tree/node_modules" ]; then
    printf '  node_modules     real directory\n'
  else
    printf '  node_modules     ABSENT\n'
  fi
  printf '  core/ entries    %s\n' "$(ls "$tree/core" 2>/dev/null | wc -l | tr -d ' ')"
done

run () { # run <label> <dir> <command...>
  local label="$1" dir="$2"; shift 2
  hr "$label"
  printf '$ cd %s && %s\n\n' "$dir" "$*"
  ( cd "$dir" && "$@" ) 2>&1
  printf '\n[exit %s]\n' "$?"
}

for rev in "$BEFORE" "$AFTER"; do
  git -C "$HEALTHY" checkout -q --detach "$rev" || exit 1
  git -C "$MISSING" checkout -q --detach "$rev" || exit 1
  stage=$([ "$rev" = "$BEFORE" ] && echo BEFORE || echo AFTER)

  hr "########## $stage — both worktrees at $rev ##########"

  run "$stage / MISSING / npm test" "$MISSING" npm test
  run "$stage / MISSING / npx jest --ci" "$MISSING" npx jest --ci

  # The measured escape hatch: zsh and bash both return the tail's status, not the run's. Shown
  # deliberately, because a preflight cannot fix a caller that discards $? — it can only make sure
  # the verdict is still on screen when it happens.
  hr "$stage / MISSING / npx jest --ci 2>&1 | tail -3   (the exit-code trap)"
  ( cd "$MISSING" && npx jest --ci 2>&1 | tail -3 )
  printf '\n[exit of the PIPELINE: %s]\n' "$?"

  run "$stage / HEALTHY / npm test" "$HEALTHY" npm test
  run "$stage / HEALTHY / one green file, to show a sound tree still exits 0" \
      "$HEALTHY" npm test -- test/chf-format.test.js
done

git -C "$HEALTHY" checkout -q --detach "$AFTER"
git -C "$MISSING" checkout -q --detach "$AFTER"
hr "left both worktrees at $AFTER"
printf 'evidence written under %s\n' "$OUT"
