#!/usr/bin/env bash
# ONE journey — training-course-to-evidence — in a CLEAN DETACHED worktree, on ports nobody else holds.
#
#   CI=1        -> `reuseExistingServer: !CI` is false, so no surviving dev server or fixture belonging
#                  to another lane can be adopted into this run.
#   3082 / 4082 -> this lane's private ports, prechecked before every run and named in the RETURN.
#                  Ports 4010, 4971 and 4973 are held by FOREIGN fixtures; none is ever bound or
#                  signalled here, and no process or container this lane did not start is touched.
#   worktree    -> NOT the primary checkout. On 2026-08-06 that carried 354 uncommitted paths from
#                  other lanes, six of them under test/e2e. A capture written there names a commit
#                  while driving a harness that is not that commit's — the false-green shape.
#
# ARMS
#   BEFORE  /Users/svendaneel/okam/web-trainwalk-before  @ e34977ac — the exact commit the failed
#           artifact on disk names, spec and product both unrepaired. Reproduces the recorded red.
#   AFTER   /Users/svendaneel/okam/web-trainwalk-after   @ 28548f96 — e34977ac + the single repair
#           commit (`.trn-table-scroll { overflow-x: auto }` on all seven Training tables).
#   MUTATED AFTER with overflow-x forced back to `visible` at rest, to show the green tracks the
#           product repair rather than the spec rewrite that rode in on the same commit.
#
# Every run's artifacts are lifted into this lane directory under its label, so a later run cannot
# quietly erase the record of an earlier one.
#
# TO RECREATE EITHER WORKTREE (detached, disposable):
#   git -C /Users/svendaneel/okam/Web-modules worktree add --detach <path> <commit>
#   ln -s /Users/svendaneel/okam/Web-modules/node_modules <path>/node_modules
#   git -C <path> -c protocol.file.allow=always submodule update --init core
# Never `npm ci` / `npm install`: they fail repo-wide and delete the node_modules ~124 worktrees share.
set -uo pipefail

LANE=/Users/svendaneel/okam/Web-modules/lanes/L-TRAINING-WALK-IS-GREEN
SPEC=test/e2e/journeys/training-course-to-evidence.spec.js
JOURNEY=training-course-to-evidence

LABEL="${1:?usage: run-journey.sh <label> [worktree] [webPort] [fixturePort]}"
WT="${2:-/Users/svendaneel/okam/web-trainwalk-after}"
WEB_PORT="${3:-3082}"
FIX_PORT="${4:-4082}"

OUT="$LANE/runs/${LABEL}.txt"
KEEP="$LANE/runs/${LABEL}.artifacts"

export CI=1
export E2E_WEB_PORT="$WEB_PORT"
export E2E_FIXTURE_PORT="$FIX_PORT"
unset E2E_API_BASE_URL E2E_BASE_URL

mkdir -p "$LANE/runs"

for p in "$WEB_PORT" "$FIX_PORT"; do
  if lsof -nP -iTCP:$p -sTCP:LISTEN >/dev/null 2>&1; then
    echo "ABORT: port $p is busy before the run started" | tee "$OUT"; exit 3
  fi
done

cd "$WT" || { echo "ABORT: no worktree at $WT" | tee "$OUT"; exit 3; }
[ -d core/services ] || { echo "ABORT: core/ is empty" | tee "$OUT"; exit 3; }
[ -e node_modules/.bin/playwright ] || { echo "ABORT: no node_modules" | tee "$OUT"; exit 3; }

{
  echo "=== label    : $LABEL"
  echo "=== worktree : $WT"
  echo "=== commit   : $(git rev-parse HEAD)"
  echo "=== dirty    : $(git status --porcelain --untracked-files=all -- ':!core' | wc -l | tr -d ' ') path(s) before the run"
  echo "=== spec sha : $(git hash-object "$SPEC")"
  echo "=== panel sha: $(git hash-object components/admin/training/TrainingVersionPanel.vue)"
  echo "=== scss sha : $(git hash-object components/admin/training/_training-panel.scss)"
  echo "=== overflow : $(grep -A2 '^\.trn-table-scroll' components/admin/training/_training-panel.scss 2>/dev/null | tr '\n' ' ' | sed 's/  */ /g')"
  echo "=== ports    : web=$WEB_PORT fixture=$FIX_PORT (4010/4971/4973 never bound, never signalled)"
  echo "=== core     : $(ls core | wc -l | tr -d ' ') entries"
  echo "=== started  : $(date -u +%FT%TZ)"
} > "$OUT"

timeout 1200 npx playwright test "$SPEC" --reporter=line >> "$OUT" 2>&1
RC=$?

# Only THIS journey's files are lifted; a blanket copy of runs/ would drag every other journey's
# record into this lane directory and make the lane look like it had measured them.
rm -rf "$KEEP"; mkdir -p "$KEEP/runs"
cp artifacts/journeys/runs/"$JOURNEY".*.playwright.json "$KEEP/runs/" 2>/dev/null
cp artifacts/journeys/"$JOURNEY".playwright.json "$KEEP/" 2>/dev/null
cp -R artifacts/journeys/"$JOURNEY" "$KEEP/screenshots" 2>/dev/null
grep '"'"$JOURNEY"'"' artifacts/journeys/runs/ledger.jsonl 2>/dev/null | tail -4 > "$KEEP/runs/ledger.tail.jsonl"

if grep -qE "^  1 passed" "$OUT"; then SHAPE=PASS
elif grep -qE "^  1 failed" "$OUT"; then SHAPE=FAIL-ASSERT
else SHAPE=HARNESS; fi

{
  echo "=== finished : $(date -u +%FT%TZ)"
  echo "=== declared : $(node -e "try{console.log(require('$WT/artifacts/journeys/$JOURNEY.playwright.json').status)}catch(e){console.log('no-artifact')}")"
  echo "=== failedStep: $(node -e "try{const a=require('$WT/artifacts/journeys/$JOURNEY.playwright.json');const s=a.steps.filter(x=>x.status!=='passed').map(x=>x.n+':'+x.name);console.log(s.length?s.join(' | '):'none — '+a.steps.length+' steps all passed')}catch(e){console.log('no-artifact')}")"
  echo "RESULT $LABEL $SHAPE rc=$RC"
} | tee -a "$OUT"
