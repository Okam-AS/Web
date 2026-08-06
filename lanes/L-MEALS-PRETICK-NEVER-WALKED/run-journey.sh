#!/usr/bin/env bash
# Run the meals-admin-setup journey once, in THIS lane's own worktree, on ports nobody else holds,
# with servers that are never reused. Inherited wholesale from
# lanes/L-MEALS-ENROL-JOURNEY-LOCATOR/run-journey.sh, which inherited it from
# lanes/L-JOURNEY-REGRESSION-BISECT/run-step.sh. Every guard there is load-bearing and was proved on
# this exact journey across fifteen runs with zero harness-shape failures:
#
#   CI=1                 -> playwright.config's `reuseExistingServer: !CI` becomes false. Port 4010
#                           is held by a FOREIGN api-server.js from another checkout; a default-port
#                           run would silently walk that lane's fixture and report a result about it.
#                           Never kill it — it is not ours.
#                           IT IS ALSO WHY THE ARM KNOB WORKS: with reuse off, every run starts a
#                           fresh fixture process, so E2E_MEALS_PROGRAM_MEMBERS_READ is read anew.
#                           Under a reused server the second arm would silently walk the first's.
#   3779/4779            -> this lane's own ports, asserted free before the run starts.
#                           (The bisect used 3777/4777, the locator 3778/4778; distinct so no two
#                           can collide.)
#   no E2E_API_BASE_URL  -> setting it flips the config to live mode, which grep-inverts @fixture and
#                           would run NOTHING while reporting success. Its absence is load-bearing.
#   rm -rf .nuxt         -> this worktree's own build output only. The shared node_modules/.cache is
#                           NOT touched: it is content-hash keyed and other lanes are using it.
#   core/ pre-populated  -> ensureCore() returns borrowed:false and mutates no other checkout.
#
# usage: run-journey.sh <label> [answered|unrouted]
set -uo pipefail

WT=/Users/svendaneel/okam/web-mpretick
LANE=/Users/svendaneel/okam/Web-modules/lanes/L-MEALS-PRETICK-NEVER-WALKED
LABEL="${1:?usage: run-journey.sh <label> [answered|unrouted]}"
ARM="${2:-answered}"
OUT="$LANE/runs/${LABEL}.txt"

export CI=1
export E2E_WEB_PORT=3779
export E2E_FIXTURE_PORT=4779
export E2E_MEALS_PROGRAM_MEMBERS_READ="$ARM"
unset E2E_API_BASE_URL E2E_BASE_URL

for p in 3779 4779; do
  if lsof -iTCP:$p -sTCP:LISTEN -P -n >/dev/null 2>&1; then
    echo "ABORT: port $p is busy before the run started" | tee "$OUT"; exit 3
  fi
done

cd "$WT" || exit 3
[ -d core/services ] || cp -R /Users/svendaneel/okam/Web-modules/core/. core/
rm -rf .nuxt

{
  echo "=== label $LABEL | arm $ARM | base commit $(git rev-parse HEAD) ==="
  git log -1 --format='%h %s' | cat
  echo "=== core: $(ls core | wc -l | tr -d ' ') entries ==="
  echo "=== working tree vs base ==="
  git status --short -- components test | cat
  echo "=== spec blob:    $(git hash-object test/e2e/journeys/meals-admin-setup.spec.js) ==="
  echo "=== fixture blob: $(git hash-object test/e2e/fixture/meals.js) ==="
  echo "=== panel blob:   $(git hash-object components/admin/meals/MealsProgramPanel.vue) ==="
} > "$OUT"

timeout 900 npx playwright test test/e2e/journeys/meals-admin-setup.spec.js \
  --reporter=line >> "$OUT" 2>&1
RC=$?

# Three shapes, told apart rather than lumped into "red". Only FAIL-ASSERT is signal about the
# product; HARNESS means the walk never started and says nothing at all.
if grep -qE "^  1 passed" "$OUT"; then SHAPE=PASS
elif grep -qE "^  1 failed" "$OUT"; then SHAPE=FAIL-ASSERT
else SHAPE=HARNESS; fi

echo "RESULT $LABEL arm=$ARM $(git rev-parse --short HEAD) $SHAPE rc=$RC" | tee -a "$OUT"
