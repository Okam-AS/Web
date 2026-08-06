#!/usr/bin/env bash
# Run the meals-admin-setup journey once, in THIS lane's own worktree, on ports nobody else holds,
# with servers that are never reused. Inherited wholesale from
# lanes/L-JOURNEY-REGRESSION-BISECT/run-step.sh — the guards there are load-bearing and were proved
# on this exact journey:
#
#   CI=1                 -> playwright.config's `reuseExistingServer: !CI` becomes false. Port 4010
#                           is held by a FOREIGN api-server.js (pid 73160, another checkout); a
#                           default-port run would silently walk that lane's fixture and report a
#                           result about it. Never kill it — it is not ours.
#   3778/4778            -> this lane's own ports, asserted free before the run starts.
#                           (The bisect used 3777/4777; distinct so the two can never collide.)
#   no E2E_API_BASE_URL  -> setting it flips the config to live mode, which grep-inverts @fixture and
#                           would run NOTHING while reporting success. Its absence is load-bearing.
#   rm -rf .nuxt         -> this worktree's own build output only. The shared node_modules/.cache is
#                           NOT touched: it is content-hash keyed and five other lanes are using it.
#   core/ pre-populated  -> ensureCore() returns borrowed:false and mutates no other checkout.
set -uo pipefail

WT=/Users/svendaneel/okam/web-mjloc
LANE=/Users/svendaneel/okam/Web-modules/lanes/L-MEALS-ENROL-JOURNEY-LOCATOR
LABEL="${1:?usage: run-journey.sh <label>}"
OUT="$LANE/runs/${LABEL}.txt"

export CI=1
export E2E_WEB_PORT=3778
export E2E_FIXTURE_PORT=4778
unset E2E_API_BASE_URL E2E_BASE_URL

for p in 3778 4778; do
  if lsof -iTCP:$p -sTCP:LISTEN -P -n >/dev/null 2>&1; then
    echo "ABORT: port $p is busy before the run started" | tee "$OUT"; exit 3
  fi
done

cd "$WT" || exit 3
[ -d core/services ] || cp -R /Users/svendaneel/okam/Web-modules/core/. core/
rm -rf .nuxt

{
  echo "=== label $LABEL | base commit $(git rev-parse HEAD) ==="
  git log -1 --format='%h %s' | cat
  echo "=== core: $(ls core | wc -l | tr -d ' ') entries ==="
  echo "=== working tree vs base ==="
  git status --short -- components test | cat
  echo "=== spec blob: $(git hash-object test/e2e/journeys/meals-admin-setup.spec.js) ==="
  echo "=== panel blob: $(git hash-object components/admin/meals/MealsProgramPanel.vue) ==="
} > "$OUT"

timeout 900 npx playwright test test/e2e/journeys/meals-admin-setup.spec.js \
  --reporter=line >> "$OUT" 2>&1
RC=$?

# Three shapes, told apart rather than lumped into "red". Only FAIL-ASSERT is signal about the
# product; HARNESS means the walk never started and says nothing at all.
if grep -qE "^  1 passed" "$OUT"; then SHAPE=PASS
elif grep -qE "^  1 failed" "$OUT"; then SHAPE=FAIL-ASSERT
else SHAPE=HARNESS; fi

echo "RESULT $LABEL $(git rev-parse --short HEAD) $SHAPE rc=$RC" | tee -a "$OUT"
