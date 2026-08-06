#!/usr/bin/env bash
# ONE journey, in THIS lane's own worktree, on ports nobody else holds.
#
#   CI=1        -> `reuseExistingServer: !CI` becomes false, so no surviving fixture and no surviving
#                  dev server from another lane can be adopted. Ports 4010, 4971 and 4973 are all held
#                  by FOREIGN api-server processes right now; none is ever bound or signalled here.
#   3876 / 4876 -> this lane's private ports, prechecked before every run and named in the RETURN.
#   worktree    -> /Users/svendaneel/okam/web-sendgate, clean at the commit printed below. The primary
#                  checkout carries ~30 other lanes' uncommitted edits, and a run there would measure
#                  them rather than this walk.
#
# Every run's artifacts are lifted into this lane directory under the label given, so a later run
# cannot quietly erase the record of an earlier one (the exact hole that produced the 08-03 red).
#
# NOT the primary checkout, and this is the whole reason: on 2026-08-06 it carried 354 uncommitted
# paths from other lanes, SIX of them under test/e2e — including api-server.js, world.js and
# journey.js itself. A capture written there would name commit 8ac6f63 while driving a fixture and a
# harness that are not 8ac6f63's, which is the false-green shape this lane exists to refuse.
#
# TO RECREATE EITHER WORKTREE (they are detached and disposable):
#   git -C /Users/svendaneel/okam/Web-modules worktree add --detach <path> <commit>
#   ln -s /Users/svendaneel/okam/Web-modules/node_modules <path>/node_modules
#   git -C <path> -c protocol.file.allow=always submodule update --init core
# Never `npm ci` / `npm install`: they fail repo-wide and delete the node_modules ~124 worktrees share.
set -uo pipefail

LANE=/Users/svendaneel/okam/Web-modules/lanes/L-GROWTH-SEND-GATE-WALK-IS-GREEN
SPEC=test/e2e/journeys/growth-newsletter-send-gate.spec.js
JOURNEY=growth-newsletter-send-gate

LABEL="${1:?usage: run-journey.sh <label> [worktree] [webPort] [fixturePort]}"
WT="${2:-/Users/svendaneel/okam/web-sendgate}"
WEB_PORT="${3:-3876}"
FIX_PORT="${4:-4876}"

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
  echo "=== fixture  : $(git hash-object test/e2e/fixture/growth-newsletter.js) growth-newsletter.js"
  echo "=== page sha : $(git hash-object pages/admin/growth-newsletter.vue)"
  echo "=== gate sha : $(git hash-object utils/growth/send-gate.js)"
  echo "=== ports    : web=$WEB_PORT fixture=$FIX_PORT (4010/4971/4973 never bound, never signalled)"
  echo "=== core     : $(ls core | wc -l | tr -d ' ') entries"
  echo "=== started  : $(date -u +%FT%TZ)"
} > "$OUT"

timeout 1200 npx playwright test "$SPEC" --reporter=line >> "$OUT" 2>&1
RC=$?

# Only THIS journey's files are lifted. A blanket copy of runs/ would drag every other journey's
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
  echo "RESULT $LABEL $SHAPE rc=$RC"
} | tee -a "$OUT"
