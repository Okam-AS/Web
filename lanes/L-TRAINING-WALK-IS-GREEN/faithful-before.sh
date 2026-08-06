#!/usr/bin/env bash
# THE FAITHFUL "BEFORE" ARM.
#
# M1 in mutation-proof.sh reverted only `_training-panel.scss` and left the seven `.trn-table-scroll`
# wrapper <div>s in place. That reds step 9 — but on the SECOND instrument (`overflow-x` is
# `visible`), with the trial click still passing in 42ms. The wrapper alone, at `min-width: 0;
# max-width: 100%`, is apparently enough to keep the control reachable. Useful, and not the point.
#
# This arm reverts the WHOLE product side of 28548f96 — all seven panels and the stylesheet — and
# keeps only the repaired spec. That is exactly "the walk that can see the defect, run against the
# product that has it", and it is the arm the recorded 2026-08-04 red was taken from. If the
# diagnosis is right it must fail on the FIRST instrument, the trial click, naming
# `<p class="trn-form__hint">` as the element that intercepts pointer events — the recorded
# signature, verbatim.
#
# Red first, green last: the restored arm runs afterwards so the canonical slot ends green.
set -uo pipefail

LANE=/Users/svendaneel/okam/Web-modules/lanes/L-TRAINING-WALK-IS-GREEN
WT=/Users/svendaneel/okam/web-trainwalk-after
BEFORE_REF=e34977acebd59b223584158c33451b6f1ffd82c1
OUT="$LANE/faithful-before.txt"

cd "$WT" || exit 3

{
  echo "=== worktree   : $WT"
  echo "=== commit     : $(git rev-parse HEAD)"
  echo "=== spec kept  : $(git hash-object test/e2e/journeys/training-course-to-evidence.spec.js) (repaired, from 28548f96)"
  echo "=== product to : ${BEFORE_REF} (unrepaired, the commit the failed artifact names)"
  echo
} > "$OUT"

echo "--- ARM M0 : repaired WALK x unrepaired PRODUCT" >> "$OUT"
git checkout "${BEFORE_REF}" -- components/admin/training/
{
  echo "    reverted  : $(git diff --name-only -- components/admin/training/ | wc -l | tr -d ' ') file(s)"
  git diff --name-only -- components/admin/training/ | sed 's/^/                /'
  echo "    wrappers  : $(grep -rc 'trn-table-scroll' components/admin/training/ 2>/dev/null | grep -v ':0' | wc -l | tr -d ' ') file(s) still mention trn-table-scroll (expect 0)"
} >> "$OUT"

"$LANE/run-journey.sh" M0-faithful-before "$WT" 3082 4082 >/dev/null 2>&1
ART="$LANE/runs/M0-faithful-before.artifacts/training-course-to-evidence.playwright.json"
{
  echo "    $(grep '^RESULT' "$LANE/runs/M0-faithful-before.txt")"
  node -e "
    const a = require('$ART');
    console.log('    declared  : ' + a.status + ' (' + a.steps.length + ' steps)');
    console.log('    served    : ' + a.backendServed + ' requests, ' + a.backendSubjectServed + ' to the subject');
    const bad = a.steps.filter(s => s.status !== 'passed');
    for (const s of bad) {
      console.log('    stopped at: ' + s.n + ' ' + s.name);
      const raw = (s.error || '').replace(/\x1b\[[0-9;]*m/g, '');
      console.log('    instrument: ' + raw.split('\n')[0].trim());
      const hit = raw.split('\n').find(l => /intercepts pointer events/.test(l));
      console.log('    covered by: ' + (hit ? hit.trim().slice(0, 190) : 'NOT the trial click — no interception line'));
    }
  "
} >> "$OUT"
echo >> "$OUT"

echo "--- ARM M0R : product restored to 28548f96" >> "$OUT"
git checkout HEAD -- components/admin/training/
echo "    dirty     : $(git status --porcelain --untracked-files=no -- ':!core' | wc -l | tr -d ' ') tracked path(s)" >> "$OUT"
"$LANE/run-journey.sh" M0R-restored "$WT" 3082 4082 >/dev/null 2>&1
ART2="$LANE/runs/M0R-restored.artifacts/training-course-to-evidence.playwright.json"
{
  echo "    $(grep '^RESULT' "$LANE/runs/M0R-restored.txt")"
  node -e "
    const a = require('$ART2');
    console.log('    declared  : ' + a.status + ' (' + a.steps.length + ' steps)');
    console.log('    step 9    : ' + a.steps[8].status + ' — ' + a.steps[8].detail);
    console.log('    step 10   : ' + a.steps[9].status + ' — ' + a.steps[9].detail);
  "
} >> "$OUT"

cat "$OUT"
