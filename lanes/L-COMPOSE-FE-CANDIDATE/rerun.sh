#!/bin/bash
# The re-run point. "A branch's own green does not transfer" -- so this RUNS, it never
# reads a recorded result.
#
# Reports the two shapes distinctly, per the collection-artifact heuristic:
#   failed suites > 0 with failed tests == 0  -> COLLECTION/IMPORT break, not behaviour
#   failed tests  > 0                         -> a real behaviour red
set -u
WT=/Users/svendaneel/okam/web-fe-candidate
LANE=/Users/svendaneel/okam/Web-modules/lanes/L-COMPOSE-FE-CANDIDATE
STEP="$1"; BR="${2:-}"
cd "$WT" || exit 9

CORE=$(ls -A core 2>/dev/null | wc -l | tr -d ' ')
[ "$CORE" -gt 0 ] && CORESTATE="populated@$(git -C core rev-parse --short HEAD)" || CORESTATE="EMPTY"

OUT="$LANE/receipts/step-$STEP.txt"
npx jest --ci --coverage=false > "$OUT" 2>&1
RC=$?

SUITES=$(grep -E '^Test Suites:' "$OUT" | tail -1)
TESTS=$(grep -E '^Tests:' "$OUT" | tail -1)
FT=$(echo "$TESTS" | grep -oE '[0-9]+ failed' | grep -oE '[0-9]+' | head -1); FT=${FT:-0}
FS=$(echo "$SUITES" | grep -oE '[0-9]+ failed' | grep -oE '[0-9]+' | head -1); FS=${FS:-0}

if [ "$FT" -gt 0 ]; then SHAPE="BEHAVIOUR-RED"
elif [ "$FS" -gt 0 ]; then SHAPE="COLLECTION-ARTIFACT"
else SHAPE="GREEN"; fi

echo "  RERUN step=$STEP $SHAPE | $SUITES | $TESTS | core=$CORESTATE"
{
  echo "- re-run (full jest, \`npx jest --ci --coverage=false\`): **$SHAPE** — $SUITES; $TESTS"
  echo "  core submodule: **$CORESTATE**  ·  receipt: \`lanes/L-COMPOSE-FE-CANDIDATE/receipts/step-$STEP.txt\`"
  if [ "$FT" -gt 0 ]; then
    echo ""
    echo "  Failing tests:"
    grep -E '^\s+●' "$OUT" | grep -v 'Console' | sort -u | head -20 | sed 's/^\s*● /  - /'
  fi
} >> "$LANE/compose-run.md"
exit $RC
