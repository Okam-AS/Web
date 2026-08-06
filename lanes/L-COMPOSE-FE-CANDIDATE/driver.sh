#!/bin/bash
# Composition driver. Nothing here forces a merge or resolves a conflict.
#
#   conflict          -> abort clean, record with conflicting files, continue
#   re-run red        -> revert the merge, re-run to confirm green returns, record, continue
#   red not cleared   -> STOP. A composition whose red cannot be attributed is the case the brief
#                        means by "stop and report".
set -u
WT=/Users/svendaneel/okam/web-fe-candidate
LANE=/Users/svendaneel/okam/Web-modules/lanes/L-COMPOSE-FE-CANDIDATE
cd "$WT" || exit 9

BASE_FT=2   # standing red at the tip: test/journey-artifact-store.test.js basename pin (2 tests)

while IFS=$'\t' read -r STEP BR; do
  [ -z "${STEP:-}" ] && continue
  H=$(git rev-parse HEAD)

  bash "$LANE/merge-step.sh" "$BR" "$STEP"
  RC=$?
  if [ $RC -eq 8 ]; then
    echo "  -> NOREF, recorded"
    { echo ""; echo "### $STEP  \`$BR\` — **NOT MERGED: ref does not exist**"; } >> "$LANE/compose-run.md"
    continue
  fi
  if [ $RC -eq 1 ]; then
    CONF=$(cd "$WT" && git diff --name-only --diff-filter=U 2>/dev/null | tr '\n' ' ')
    { echo ""; echo "### $STEP  \`$BR\` — **NOT MERGED: conflict, aborted clean**"; echo ""; echo "  Conflicting paths recorded in \`conflicts.md\`. Nothing was resolved."; } >> "$LANE/compose-run.md"
    echo "$STEP	$BR	CONFLICT" >> "$LANE/excluded.tsv"
    continue
  fi
  [ $RC -eq 0 ] || { echo "  -> unexpected rc=$RC"; continue; }
  if git merge-base --is-ancestor "$BR" "$H" 2>/dev/null; then
    { echo ""; echo "### $STEP  \`$BR\` — **no-op: already contained by an earlier step**"; } >> "$LANE/compose-run.md"
    echo "$STEP	$BR	CONTAINED" >> "$LANE/excluded.tsv"
    continue
  fi

  # the hub hazard, measured directly, at every step
  TR=$(node "$LANE/translations-check.js" "$H" "$BR" 2>&1)
  TRRC=$?
  echo "  TRANS: $(echo "$TR" | head -1)"
  { echo "- translations integrity: $(echo "$TR" | head -1)"; echo "$TR" | tail -n +2 | sed 's/^/    /'; } >> "$LANE/compose-run.md"

  bash "$LANE/rerun.sh" "$STEP" "$BR"

  OUT="$LANE/receipts/step-$STEP.txt"
  FT=$(grep -E '^Tests:' "$OUT" | tail -1 | grep -oE '[0-9]+ failed' | grep -oE '[0-9]+' | head -1); FT=${FT:-0}
  FS=$(grep -E '^Test Suites:' "$OUT" | tail -1 | grep -oE '[0-9]+ failed' | grep -oE '[0-9]+' | head -1); FS=${FS:-0}

  if [ "$FT" -gt "$BASE_FT" ] || { [ "$FT" -eq 0 ] && [ "$FS" -gt 0 ]; }; then
    echo "  !! RED ABOVE BASELINE ($FT failed tests, baseline $BASE_FT; $FS failed suites) -- reverting $BR"
    git reset --hard "$H" >/dev/null 2>&1
    bash "$LANE/rerun.sh" "$STEP-revert" "$BR"
    ROUT="$LANE/receipts/step-$STEP-revert.txt"
    RFT=$(grep -E '^Tests:' "$ROUT" | tail -1 | grep -oE '[0-9]+ failed' | grep -oE '[0-9]+' | head -1); RFT=${RFT:-0}
    if [ "$RFT" -le "$BASE_FT" ]; then
      { echo ""; echo "  **REVERTED.** The red is this head's: reverting restored $RFT failed test(s) (baseline $BASE_FT). Recorded as excluded on a measured reason."; } >> "$LANE/compose-run.md"
      echo "$STEP	$BR	RED	$FT-failed-tests" >> "$LANE/excluded.tsv"
      continue
    fi
    { echo ""; echo "  **STOP.** Revert did NOT restore the baseline ($RFT failed after revert). The composition carries a red that cannot be attributed to this head. Run halted here."; } >> "$LANE/compose-run.md"
    echo "$STEP	$BR	RED-UNATTRIBUTABLE" >> "$LANE/excluded.tsv"
    echo "!!! HALTED at $STEP"
    exit 3
  fi

  # once the basename pin lands the standing red is gone and the floor moves to 0
  if [ "$FT" -lt "$BASE_FT" ]; then BASE_FT=$FT; echo "  (baseline red floor now $BASE_FT)"; fi
done < "$LANE/order.tsv"
echo "DRIVER COMPLETE"
