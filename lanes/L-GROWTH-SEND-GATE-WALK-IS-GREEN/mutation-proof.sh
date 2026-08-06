#!/usr/bin/env bash
# Does the capture MEAN anything, or is it merely green?
#
# The walk asserts the gate's reason list WHOLE at three points, so the only way to know the green is
# load-bearing is to take one refusal away from the product and watch the walk lose it.
#
# THE MUTATION is one line of `utils/growth/send-gate.js`: the kill-switch refusal
#
#     if (flags.dispatch === false) { blocked.push(BLOCK_DISPATCH_OFF); }
#
# deleted. Nothing else moves — the module refusal, the approval rule and the audience rule all stay,
# so a red here can only be the dispatch refusal going missing.
#
# ARM M1  mutated   -> the walk must go RED
# ARM M2  restored  -> the walk must go GREEN again, and the file must hash back to HEAD's blob
#
# The restore runs in a trap, so an interrupted proof still leaves the worktree at HEAD.
set -uo pipefail

WT=/Users/svendaneel/okam/web-sendgate
LANE=/Users/svendaneel/okam/Web-modules/lanes/L-GROWTH-SEND-GATE-WALK-IS-GREEN
RUN="$LANE/run-journey.sh"
TARGET=utils/growth/send-gate.js
OUT="$LANE/mutation-proof.txt"

cd "$WT" || exit 3
BEFORE_SHA=$(git hash-object "$TARGET")

restore () { cd "$WT" && git checkout -- "$TARGET"; }
trap restore EXIT

{
  echo "=== worktree : $WT"
  echo "=== commit   : $(git rev-parse HEAD)"
  echo "=== target   : $TARGET"
  echo "=== sha@HEAD : $BEFORE_SHA"
  echo
} > "$OUT"

# ---- ARM M1 : take the kill-switch refusal away -------------------------------------------------
perl -0pi -e 's/^\s*if \(flags\.dispatch === false\) \{ blocked\.push\(BLOCK_DISPATCH_OFF\); \}\n//m' "$TARGET"
MUTATED_SHA=$(git hash-object "$TARGET")
if [ "$MUTATED_SHA" = "$BEFORE_SHA" ]; then
  echo "ABORT: the mutation changed nothing — the line was not matched" | tee -a "$OUT"; exit 3
fi
{
  echo "--- ARM M1 : mutated, dispatch refusal deleted"
  echo "    sha       : $MUTATED_SHA"
  echo "    diff      :"
  git diff -U1 -- "$TARGET" | sed -n '5,20p'
} >> "$OUT"

"$RUN" M1-mutated >/dev/null 2>&1
M1=$(grep -E "^RESULT " "$LANE/runs/M1-mutated.txt" | tail -1)
{
  echo "    $M1"
  echo "    declared  : $(node -e "try{console.log(require('$LANE/runs/M1-mutated.artifacts/growth-newsletter-send-gate.playwright.json').status)}catch(e){console.log('no-artifact')}")"
  echo "    stopped at: $(grep -m1 -E "Error:|waiting for" "$LANE/runs/M1-mutated.txt" | head -1 | cut -c1-160)"
  echo
} >> "$OUT"

# ---- ARM M2 : put it back -----------------------------------------------------------------------
restore
AFTER_SHA=$(git hash-object "$TARGET")
{
  echo "--- ARM M2 : restored"
  echo "    sha       : $AFTER_SHA  (identical to HEAD: $([ "$AFTER_SHA" = "$BEFORE_SHA" ] && echo yes || echo NO))"
} >> "$OUT"

"$RUN" M2-restored >/dev/null 2>&1
M2=$(grep -E "^RESULT " "$LANE/runs/M2-restored.txt" | tail -1)
{
  echo "    $M2"
  echo "    declared  : $(node -e "try{console.log(require('$LANE/runs/M2-restored.artifacts/growth-newsletter-send-gate.playwright.json').status)}catch(e){console.log('no-artifact')}")"
  echo
  echo "VERDICT: $(echo "$M1" | grep -q FAIL-ASSERT && echo "$M2" | grep -q PASS && echo 'MUTATION PROVEN — the green tracks the refusal' || echo 'NOT PROVEN')"
  echo "=== dirty after : $(git status --porcelain -- "$TARGET" | wc -l | tr -d ' ') path(s)"
} >> "$OUT"

tail -40 "$OUT"
