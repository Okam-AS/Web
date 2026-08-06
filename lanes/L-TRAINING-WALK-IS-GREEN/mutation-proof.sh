#!/usr/bin/env bash
# Does the green track the PRODUCT repair, or only the spec rewrite that rode in on the same commit?
#
# 28548f96 changed two things at once: the CSS that makes the publish control reachable, and the
# journey step that measures it (step 9 used to file a defect and pass anyway; step 10 used to
# `dispatchEvent`). A green at 28548f96 alone therefore proves nothing about which half earned it.
#
# So the AFTER worktree keeps the repaired SPEC and has ONLY the CSS reverted:
#   .trn-table-scroll { overflow-x: auto }  ->  visible
# That is the unrepaired product measured by the repaired walk — the arm the exit criterion calls
# "the step that fails today, shown red before the repair".
#
# ARM ORDER IS DELIBERATE. The red runs FIRST and the restored green runs LAST, so the canonical slot
# ends holding the passing run. Running it the other way round is precisely the defect this lane
# diagnosed: on 2026-08-04 a mutation arm finished 20:05, one minute after the green arm at 20:04,
# and the canonical slot took the deliberately-broken run and kept it for two days.
set -uo pipefail

LANE=/Users/svendaneel/okam/Web-modules/lanes/L-TRAINING-WALK-IS-GREEN
WT=/Users/svendaneel/okam/web-trainwalk-after
SCSS="$WT/components/admin/training/_training-panel.scss"
OUT="$LANE/mutation-proof.txt"

cd "$WT" || exit 3
HEAD_SHA=$(git rev-parse HEAD)
CLEAN_SHA=$(git hash-object "$SCSS")

{
  echo "=== worktree : $WT"
  echo "=== commit   : $HEAD_SHA"
  echo "=== target   : components/admin/training/_training-panel.scss"
  echo "=== sha@HEAD : $CLEAN_SHA"
  echo
} > "$OUT"

run_arm () {  # label
  local label="$1"
  "$LANE/run-journey.sh" "$label" "$WT" 3082 4082 >/dev/null 2>&1
  local art="$LANE/runs/${label}.artifacts/training-course-to-evidence.playwright.json"
  {
    echo "    sha       : $(git hash-object "$SCSS")"
    echo "    overflow  : $(sed -n '/^\.trn-table-scroll/,/^}/p' "$SCSS" | grep overflow-x | tr -d ' ')"
    echo "    $(grep '^RESULT' "$LANE/runs/${label}.txt")"
    node -e "
      try {
        const a = require('$art');
        console.log('    declared  : ' + a.status + ' (' + a.steps.length + ' steps)');
        const bad = a.steps.filter(s => s.status !== 'passed');
        if (!bad.length) { console.log('    step 9    : ' + a.steps[8].status + ' — ' + a.steps[8].detail); }
        for (const s of bad) {
          console.log('    stopped at: ' + s.n + ' ' + s.name);
          const line = (s.error || '').split('\n').find(l => /intercepts pointer events|Timeout|expect\(/.test(l));
          console.log('    signature : ' + (line || '').replace(/\[[0-9;]*m/g, '').trim().slice(0, 150));
        }
        const d = a.findings || [];
        for (const f of d.filter(x => x.severity === 'defect')) { console.log('    finding   : ' + f.summary.slice(0, 120)); }
      } catch (e) { console.log('    declared  : NO ARTIFACT (' + e.message.slice(0, 60) + ')'); }
    "
  } >> "$OUT"
}

echo "--- ARM M1 : mutated, the table overflow escapes its column again" >> "$OUT"
perl -0pi -e 's/(\.trn-table-scroll \{\n)(\s*)overflow-x: auto;/$1$2overflow-x: visible;/' "$SCSS"
git diff --unified=0 -- "$SCSS" | grep -E '^[-+]\s*overflow-x' >> "$OUT"
run_arm M1-mutated
echo >> "$OUT"

echo "--- ARM M2 : restored" >> "$OUT"
git checkout -- "$SCSS"
echo "    identical to HEAD: $([ "$(git hash-object "$SCSS")" = "$CLEAN_SHA" ] && echo yes || echo NO)" >> "$OUT"
run_arm M2-restored
echo >> "$OUT"

echo "=== dirty after : $(git status --porcelain --untracked-files=no -- ':!core' | wc -l | tr -d ' ') tracked path(s)" >> "$OUT"
cat "$OUT"
