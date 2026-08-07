#!/bin/sh
# Reproduces the defect this lane closed, against any ref, without keeping a copy of a runner in the
# tree. A COPY IS THE HAZARD: the tree-wide sweep exists because lanes copied a runner from each
# other and propagated a `git checkout --` restore that deletes uncommitted work. So the historical
# file is fetched on demand and deleted again.
#
#   sh reproduce.sh c65b19c    # the ref the brief names — certifies 2/2 kills from runs of nothing
#   sh reproduce.sh HEAD       # this lane's tip — refuses to certify anything
set -e
REF="${1:-c65b19c}"
HERE="$(cd "$(dirname "$0")" && pwd)"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
git -C "$HERE" show "$REF":"test/support/mutate.js" > "$TMP/mutate.js"
cp "$HERE/package.json" "$TMP/" && mkdir -p "$TMP/src"
cp "$HERE/src/target.js" "$TMP/src/" && cp "$HERE/spec.json" "$TMP/"
for cmd in false true; do
  echo "--- $REF with MUTATE_TEST_COMMAND=$cmd (executes no test)"
  MUTATE_TEST_COMMAND=$cmd node "$TMP/mutate.js" "$TMP/spec.json" 2>&1 | tail -3
done
