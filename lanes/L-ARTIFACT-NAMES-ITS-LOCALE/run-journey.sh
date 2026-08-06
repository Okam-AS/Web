#!/usr/bin/env bash
# ONE journey, ONE edition, in this lane's own worktree, on ports nobody else holds — and the
# artifacts it produced lifted OUT of the tree afterwards so the tree it measured stays clean.
#
# WHY EACH GUARD IS HERE:
#   CI=1              -> `reuseExistingServer: !CI` becomes false, so neither a surviving fixture nor
#                        a surviving DEV SERVER from another lane can be adopted. The second half
#                        matters more here than anywhere else: an adopted dev server is compiled at
#                        whatever edition its owner chose, and the whole subject of this lane is a run
#                        that reports an edition it did not drive.
#   3841 / 4841       -> this lane's private ports, prechecked. Port 4010 is held by a FOREIGN
#                        api-server (pid 73160); it is never bound and never signalled here.
#   OKAM_EDITION      -> the BUILD flag, and the only thing varied between arms A1 and A2. It reaches
#                        the bundle the way a real build does: runner env -> playwright -> webServer
#                        command -> dev-server.js (`Object.assign({}, process.env, ...)`) -> nuxt-ts
#                        -> nuxt.config.js `env.EDITION` -> config/edition.js -> store/index.js.
#                        NOTHING is handed to the spec, and the spec under test asserts no copy at all.
#   artifact lift     -> `artifacts/journeys/` is tracked, so a run dirties the tree it just measured
#                        and the NEXT run's `fixtureBuild` would read `+dirty`. Each run's files are
#                        copied into this lane directory and the worktree is restored to HEAD, so
#                        every arm starts from the same committed tree.
set -uo pipefail

WT=/Users/svendaneel/okam/web-artloc
LANE=/Users/svendaneel/okam/Web-modules/lanes/L-ARTIFACT-NAMES-ITS-LOCALE
SPEC=test/e2e/journeys/modal-scroll-lock.spec.js
JOURNEY=modal-scroll-lock

LABEL="${1:?usage: run-journey.sh <label> <edition:no|ch>}"
EDITION="${2:?usage: run-journey.sh <label> <edition:no|ch>}"

OUT="$LANE/runs/${LABEL}.txt"
KEEP="$LANE/runs/${LABEL}.artifacts"

WEB_PORT=3841
FIX_PORT=4841

export CI=1
export E2E_WEB_PORT="$WEB_PORT"
export E2E_FIXTURE_PORT="$FIX_PORT"
export OKAM_EDITION="$EDITION"
unset E2E_API_BASE_URL E2E_BASE_URL

mkdir -p "$LANE/runs"

for p in "$WEB_PORT" "$FIX_PORT"; do
  if lsof -iTCP:$p -sTCP:LISTEN -P -n >/dev/null 2>&1; then
    echo "ABORT: port $p is busy before the run started" | tee "$OUT"; exit 3
  fi
done

cd "$WT" || { echo "ABORT: no worktree at $WT" | tee "$OUT"; exit 3; }
[ -d core/services ] || { echo "ABORT: core/ is empty" | tee "$OUT"; exit 3; }
[ -e node_modules/.bin/playwright ] || { echo "ABORT: no node_modules" | tee "$OUT"; exit 3; }

{
  echo "=== label      : $LABEL"
  echo "=== edition    : OKAM_EDITION=$EDITION"
  echo "=== worktree   : $WT"
  echo "=== commit     : $(git rev-parse HEAD)"
  echo "=== dirty      : $(git status --porcelain --untracked-files=all -- ':!core' | wc -l | tr -d ' ') path(s) before the run"
  echo "=== spec sha   : $(git hash-object "$SPEC")"
  echo "=== support    : $(git hash-object test/e2e/support/journey.js) journey.js"
  echo "===            : $(git hash-object test/e2e/support/edition.js) edition.js"
  echo "===            : $(git hash-object test/e2e/support/artifact-store.js) artifact-store.js"
  echo "=== edition.js : $(git hash-object config/edition.js) config/edition.js"
  echo "=== ports      : web=$WEB_PORT fixture=$FIX_PORT (4010 never bound, pid 73160 never signalled)"
  echo "=== core       : $(ls core | wc -l | tr -d ' ') entries"
} > "$OUT"

timeout 900 npx playwright test "$SPEC" --reporter=line >> "$OUT" 2>&1
RC=$?

# Lift the evidence OUT before restoring, or restoring would destroy it.
rm -rf "$KEEP"; mkdir -p "$KEEP"
cp -R artifacts/journeys/runs "$KEEP/runs" 2>/dev/null
cp artifacts/journeys/"$JOURNEY".playwright.json "$KEEP/" 2>/dev/null
cp -R artifacts/journeys/"$JOURNEY" "$KEEP/screenshots" 2>/dev/null

# LANE_KEEP_TREE=1 leaves `artifacts/` exactly as this run left it, so the NEXT arm runs into the
# previous arm's evidence instead of into a restored HEAD. That is the only way to demonstrate the
# collision itself — two editions of one journey, in one tree, at the same time.
if [ "${LANE_KEEP_TREE:-0}" != "1" ]; then
  git checkout -- artifacts 2>/dev/null
  git clean -qfd -- artifacts 2>/dev/null
fi

# Three shapes, told apart rather than lumped into "red":
#   PASS         the walk completes
#   FAIL-ASSERT  the walk ran and an assertion, a step or a guard failed
#   HARNESS      the walk never started (server, port, core, compile, module load)
if grep -qE "^  1 passed" "$OUT"; then SHAPE=PASS
elif grep -qE "^  1 failed" "$OUT"; then SHAPE=FAIL-ASSERT
else SHAPE=HARNESS; fi

{
  echo "=== after      : $(git status --porcelain --untracked-files=all -- ':!core' | wc -l | tr -d ' ') path(s) left dirty"
  echo "RESULT $LABEL edition=$EDITION $SHAPE rc=$RC"
} | tee -a "$OUT"
