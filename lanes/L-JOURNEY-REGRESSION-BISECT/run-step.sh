#!/usr/bin/env bash
# Run ONE journey (meals-admin-setup) against ONE commit, in this lane's own worktree,
# on ports nobody else holds, with servers that are never reused.
#
# WHY EACH GUARD IS HERE:
#   CI=1                     -> playwright.config's `reuseExistingServer: !CI` becomes false, so a
#                               surviving fixture/dev server from ANY other lane can never be
#                               silently reused. Port-in-use becomes a loud error, not stale code.
#                               (F-SURVIVING-FIXTURE-SERVES-STALE-CODE / F-DEV-SERVERS-SHARE-BUILD)
#   E2E_WEB_PORT/FIXTURE     -> 3777/4777. Port 4010 is held by a foreign api-server.
#   no E2E_API_BASE_URL      -> setting it flips the config to live mode, which grep-inverts @fixture
#                               and would run NOTHING. Absence is load-bearing.
#   rm -rf .nuxt             -> my own build output only; never the shared node_modules/.cache,
#                               which five other lanes are using.
#   core/ pre-populated      -> ensureCore() returns borrowed:false and mutates nothing.
#                               (F-CORE-PIN-ON-NO-REMOTE)
set -uo pipefail

WT=/Users/svendaneel/okam/web-jrbisect
LANE=/Users/svendaneel/okam/Web-modules/lanes/L-JOURNEY-REGRESSION-BISECT
SHA="$1"
LABEL="${2:-$SHA}"
OUT="$LANE/runs/${LABEL}.txt"

export CI=1
export E2E_WEB_PORT=3777
export E2E_FIXTURE_PORT=4777
unset E2E_API_BASE_URL E2E_BASE_URL

for p in 3777 4777; do
  if lsof -iTCP:$p -sTCP:LISTEN -P -n >/dev/null 2>&1; then
    echo "ABORT: port $p is busy before the run started" | tee "$OUT"; exit 3
  fi
done

cd "$WT" || exit 3
git checkout --detach --force "$SHA" >/dev/null 2>&1 || { echo "ABORT: cannot check out $SHA" | tee "$OUT"; exit 3; }
# core/ is untracked-by-git here (gitlink mount), so checkout leaves it; assert it anyway.
[ -d core/services ] || cp -R /Users/svendaneel/okam/Web-modules/core/. core/
rm -rf .nuxt

{
  echo "=== commit $(git rev-parse HEAD) ==="
  git log -1 --format='%h %s' | cat
  echo "=== core: $(ls core | wc -l | tr -d ' ') entries | spec sha: $(git rev-parse HEAD:test/e2e/journeys/meals-admin-setup.spec.js) ==="
} > "$OUT"

timeout 900 npx playwright test test/e2e/journeys/meals-admin-setup.spec.js \
  --reporter=line >> "$OUT" 2>&1
RC=$?

# Three shapes, told apart rather than lumped into "red":
#   PASS            the walk completes
#   FAIL-ASSERT     the walk ran and an assertion/step failed   <- the only bisect signal
#   HARNESS         the walk never started (server, port, core, compile)
if grep -qE "^  1 passed" "$OUT"; then SHAPE=PASS
elif grep -qE "^  1 failed" "$OUT"; then SHAPE=FAIL-ASSERT
else SHAPE=HARNESS; fi

echo "RESULT $LABEL $(git rev-parse --short HEAD) $SHAPE rc=$RC" | tee -a "$OUT"
