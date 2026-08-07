#!/bin/sh
# Reproduces the defect this lane closed, against any ref, WITHOUT keeping a copy of a runner in the
# tree. A COPY IS THE HAZARD: the tree-wide sweep exists because lanes copied a runner from each
# other and propagated a `git checkout --` restore that deletes uncommitted work. So the historical
# file is fetched on demand and deleted again.
#
#   sh reproduce.sh c65b19c   # the ref the brief names — certifies 2/2 kills from runs of nothing
#   sh reproduce.sh 05c160a   # a partial fix — still certifies 2/2 in the exit-1 direction
#   sh reproduce.sh HEAD      # this lane's tip — refuses to certify, and mutates nothing
#
# Neither `false` nor `true` executes a single test. That is the whole point: an exit status is not
# a measurement.
set -e
REF="${1:-c65b19c}"
HERE="$(cd "$(dirname "$0")" && pwd)"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

git -C "$HERE" show "$REF":"test/support/mutate.js" > "$TMP/mutate.js"
cp "$HERE/package.json" "$TMP/"
mkdir -p "$TMP/src"
cp "$HERE/src/target.js" "$TMP/src/"
cp "$HERE/spec.json" "$TMP/"
BEFORE="$(cat "$TMP/src/target.js")"

for cmd in false true; do
  echo "--- $REF  with MUTATE_TEST_COMMAND=$cmd  (exits $([ "$cmd" = false ] && echo 1 || echo 0), executes no test)"
  MUTATE_TEST_COMMAND=$cmd node "$TMP/mutate.js" "$TMP/spec.json" 2>&1 \
    | grep -E "reddened the suite|SURVIVED|UNUSABLE BASELINE" | cut -c1-170 \
    || echo "    (no verdict of any kind)"
  if [ "$BEFORE" = "$(cat "$TMP/src/target.js")" ]; then
    echo "    source intact"
  else
    echo "    SOURCE LEFT MUTATED"
  fi
  if [ -f "$TMP/spec.results.json" ]; then
    echo "    results file written (a certificate exists)"
    rm -f "$TMP/spec.results.json"
  else
    echo "    no results file (nothing certified)"
  fi
done
