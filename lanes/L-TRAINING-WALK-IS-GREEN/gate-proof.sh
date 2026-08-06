#!/usr/bin/env bash
# Does the exit gate actually refuse the failed capture, and actually admit the green one?
#
# "Prove the gate still refuses before your repair and passes after, so the capture means something
# rather than merely being green." The checker L-EVIDENCE-IS-CHECKED-WHEN-CLAIMED repaired reads the
# artifact's OWN DECLARED FIELD, so this is a real test of a real refusal — not a reading of the code.
#
# IN A SANDBOX, and deliberately: this lane may not run `plan accept`/`plan decide`, and `plan verify`
# against the live docs/plan would move a lane's state as a side effect of measuring the gate. So the
# whole plan directory is copied to a lane-local root, both artifacts are fed to the SAME lane row
# there, and the real docs/plan is never opened for writing.
set -uo pipefail

LANE=/Users/svendaneel/okam/Web-modules/lanes/L-TRAINING-WALK-IS-GREEN
REPO=/Users/svendaneel/okam/Web-modules
SB="$LANE/gate-sandbox"
OUT="$LANE/gate-proof.txt"
ID=L-TRAINING-WALK-IS-GREEN
EV=artifacts/journeys/training-course-to-evidence.playwright.json

FAILED="$LANE/before/training-course-to-evidence.playwright.json"     # the capture as found on disk
GREEN="$LANE/runs/M0R-restored.artifacts/training-course-to-evidence.playwright.json"

export PLAN_ACTOR=agent:L-TRAINING-WALK-IS-GREEN

rm -rf "$SB"; mkdir -p "$SB/docs" "$SB/artifacts/journeys"
cp -R "$REPO/docs/plan" "$SB/docs/plan"
# The sandbox must be its OWN repo root. Without this, `plan` walks up past the sandbox to the real
# Web-modules checkout to resolve a relative evidence path, and both arms then read the SAME file —
# the real one on disk — which is how the first run of this script reported `status: failed` for a
# green artifact it had just copied in. The refusal was real; the file it refused was the wrong one.
git init -q "$SB"
printf 'gate sandbox\n' > "$SB/.gitignore"

{
  echo "=== sandbox : $SB   (the live docs/plan is never written)"
  echo "=== lane    : $ID, exit reads: $EV"
  echo "=== failed  : $FAILED"
  echo "===           declared $(node -e "console.log(require('$FAILED').status)"), $(node -e "console.log(require('$FAILED').steps.length)") steps, commit $(node -e "console.log(require('$FAILED').commit.slice(0,8))")"
  echo "=== green   : $GREEN"
  echo "===           declared $(node -e "console.log(require('$GREEN').status)"), $(node -e "console.log(require('$GREEN').steps.length)") steps, commit $(node -e "console.log(require('$GREEN').commit.slice(0,8))")"
  echo
} > "$OUT"

arm () {  # label artifact
  local label="$1" art="$2"
  cp "$art" "$SB/$EV"
  cd "$SB"
  echo "--- ARM $label" >> "$OUT"
  echo "    artifact declares: $(node -e "console.log(require('$SB/$EV').status)")" >> "$OUT"
  plan unverify "$ID" --reason "gate arm $label" >/dev/null 2>&1
  plan start "$ID" --agent gate >/dev/null 2>&1
  plan built "$ID" --evidence "$EV" >/dev/null 2>&1
  echo "    plan built  -> state $(plan render --view lanes 2>/dev/null | grep -c . >/dev/null; grep -A9 "^### Lane $ID " docs/plan/plan.md | grep '^state:' | head -1 | sed 's/state: //')" >> "$OUT"
  local vout rc
  vout=$(plan verify "$ID" --evidence "$EV" 2>&1); rc=$?
  {
    echo "    plan verify -> rc=$rc"
    echo "$vout" | grep -viE '^\s*$' | head -4 | sed 's/^/      /'
    echo "    state after : $(grep -A9 "^### Lane $ID " docs/plan/plan.md | grep '^state:' | head -1 | sed 's/state: //')"
  } >> "$OUT"
  echo >> "$OUT"
}

arm "A — the capture as found on disk (status failed)" "$FAILED"
arm "B — this lane's capture (status passed)"          "$GREEN"

{
  echo "=== live plan untouched: $(cd "$REPO" && git status --porcelain -- docs/plan | wc -l | tr -d ' ') path(s) changed under docs/plan"
} >> "$OUT"

cat "$OUT"
