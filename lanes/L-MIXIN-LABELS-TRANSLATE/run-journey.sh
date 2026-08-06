#!/usr/bin/env bash
# Run ONE journey (modal-estate-scroll-lock) at ONE edition, in THIS lane's own worktree, on ports
# nobody else holds, and RECORD WHO ANSWERED.
#
# Inherited from lanes/L-RECEIPT-JOURNEY-AT-DE/run-journey.sh — same guards, same reasons, restated
# rather than referenced because a runner nobody can read is a runner nobody checks:
#
#   CI=1                 -> playwright.config's `reuseExistingServer: !CI` becomes false, so a
#                           surviving fixture/dev server from ANY other lane can never be silently
#                           reused. Port-in-use becomes a loud error rather than stale code.
#   3853 / 4853          -> THIS lane's private pair, with a free-port precheck.
#
#                           NOT 3847/4847. Those are L-RECEIPT-JOURNEY-AT-DE's, and that lane's
#                           runner is still on disk with a documented "how to re-run" section — two
#                           lanes sharing one pair is the same failure the 4010 rule exists to
#                           prevent, one level up. 3853/4853 appear in no runner under lanes/*/ (the
#                           claimed set is 3061 3071 3777-3779 3823 3841 3847 3889 3971 4010 4061
#                           4071 4777-4779 4823 4841 4847 4889 4971) and were free at start.
#
#                           Port 4010 is held by a FOREIGN `node test/e2e/fixture/api-server.js`
#                           (pid 73160) which this lane never binds and never signals; a run served
#                           by it produced five phantom failures elsewhere in this estate.
#   no E2E_API_BASE_URL  -> setting it flips the config to live mode, which grep-inverts @fixture and
#                           would run NOTHING. Absence is load-bearing.
#   OKAM_EDITION         -> the BUILD flag, and the only thing this lane varies. It reaches the
#                           bundle through playwright -> webServer command -> dev-server.js
#                           (`Object.assign({}, process.env, ...)`) -> nuxt.config.js. No dictionary
#                           is handed to the spec: the app resolves its own locale from
#                           store/index.js, which reads the edition's market.
#   who-answered poller  -> the fixture dies with the run, so its identity is captured WHILE it is
#                           up: its own testimony (/__fixture/health) and, from outside, lsof. The
#                           port a run RECORDS must be the port that ANSWERED, not the one it asked
#                           for.
#
# THE FILE UNDER TEST IS HASHED TOO. This lane's change is in `plugins/global-mixin.js`, so the arm
# that carries the switch and the arm that carries the dictionary lookup have to be tellable apart
# from CONTENT, not from a label. Same for all three dictionaries: `utils/i18n.js` falls back
# no -> en -> de, so every dictionary is an input to a German assertion.
#
# Evidence is written OUTSIDE the worktree being measured, so a run log can never dirty the build id.
set -uo pipefail

WT=/Users/svendaneel/okam/web-mixinlabels
LANE=/Users/svendaneel/okam/Web-modules/lanes/L-MIXIN-LABELS-TRANSLATE
SPEC=test/e2e/journeys/modal-estate-scroll-lock.spec.js

LABEL="${1:?usage: run-journey.sh <label> <edition:no|ch>}"
EDITION="${2:?usage: run-journey.sh <label> <edition:no|ch>}"

OUT="$LANE/runs/${LABEL}.txt"
WHO="$LANE/runs/${LABEL}.who-answered.json"

WEB_PORT=3853
FIX_PORT=4853

export CI=1
export E2E_WEB_PORT="$WEB_PORT"
export E2E_FIXTURE_PORT="$FIX_PORT"
export OKAM_EDITION="$EDITION"
unset E2E_API_BASE_URL E2E_BASE_URL

for p in "$WEB_PORT" "$FIX_PORT"; do
  if lsof -iTCP:$p -sTCP:LISTEN -P -n >/dev/null 2>&1; then
    echo "ABORT: port $p is busy before the run started" | tee "$OUT"; exit 3
  fi
done

cd "$WT" || { echo "ABORT: no worktree at $WT" | tee "$OUT"; exit 3; }
[ -d core/services ] || { echo "ABORT: core/ is empty" | tee "$OUT"; exit 3; }
[ -e node_modules/.bin/playwright ] || { echo "ABORT: no node_modules" | tee "$OUT"; exit 3; }

# ---- who answered -----------------------------------------------------------------------------
( for _ in $(seq 1 300); do
    if lsof -iTCP:"$FIX_PORT" -sTCP:LISTEN -P -n >/dev/null 2>&1; then
      HEALTH=$(curl -s --max-time 3 "http://127.0.0.1:${FIX_PORT}/__fixture/health" 2>/dev/null)
      HOLDER=$(lsof -iTCP:"$FIX_PORT" -sTCP:LISTEN -P -n -Fpn 2>/dev/null | tr '\n' ' ')
      HPID=$(lsof -iTCP:"$FIX_PORT" -sTCP:LISTEN -P -n -t 2>/dev/null | head -1)
      HCWD=$(lsof -a -p "${HPID:-0}" -d cwd -Fn 2>/dev/null | grep '^n' | head -1 | cut -c2-)
      HCMD=$(ps -o command= -p "${HPID:-0}" 2>/dev/null | head -1)
      WPID=$(lsof -iTCP:"$WEB_PORT" -sTCP:LISTEN -P -n -t 2>/dev/null | head -1)
      WCWD=$(lsof -a -p "${WPID:-0}" -d cwd -Fn 2>/dev/null | grep '^n' | head -1 | cut -c2-)
      printf '{\n  "label": %s,\n  "edition": %s,\n  "grantedFixturePort": %s,\n  "grantedWebPort": %s,\n  "health": %s,\n  "holderPid": %s,\n  "holderCwd": %s,\n  "holderCommand": %s,\n  "webPid": %s,\n  "webCwd": %s,\n  "lsof": %s,\n  "capturedAt": %s\n}\n' \
        "\"$LABEL\"" "\"$EDITION\"" "$FIX_PORT" "$WEB_PORT" \
        "\"$(printf '%s' "${HEALTH:-}" | sed 's/"/\\"/g')\"" \
        "\"${HPID:-unresolved}\"" "\"${HCWD:-unresolved}\"" \
        "\"$(printf '%s' "${HCMD:-unresolved}" | sed 's/"/\\"/g')\"" \
        "\"${WPID:-unresolved}\"" "\"${WCWD:-unresolved}\"" \
        "\"$(printf '%s' "${HOLDER:-}" | sed 's/"/\\"/g')\"" \
        "\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"" > "$WHO"
      exit 0
    fi
    sleep 1
  done
  printf '{ "label": "%s", "edition": "%s", "unresolved": "fixture port %s never came up within 300s" }\n' \
    "$LABEL" "$EDITION" "$FIX_PORT" > "$WHO" ) &
POLLER=$!

DIRTY="$(git status --porcelain -- ':!core' ':!artifacts')"
{
  echo "=== label        : $LABEL"
  echo "=== edition      : OKAM_EDITION=$EDITION"
  echo "=== worktree     : $WT"
  echo "=== commit       : $(git rev-parse HEAD)"
  echo "=== spec sha     : $(git hash-object "$SPEC")"
  echo "=== mixin sha    : $(git hash-object plugins/global-mixin.js)"
  echo "=== de.ts sha    : $(git hash-object translations/de.ts)"
  echo "=== no.ts sha    : $(git hash-object translations/no.ts)"
  echo "=== en.ts sha    : $(git hash-object translations/en.ts)"
  echo "=== world.js sha : $(git hash-object test/e2e/fixture/world.js)"
  echo "=== ports        : web=$WEB_PORT fixture=$FIX_PORT (4010 never bound, pid 73160 never signalled; 3847/4847 not this lane's)"
  echo "=== core         : $(ls core | wc -l | tr -d ' ') entries"
  echo "=== dirty        : verbatim \`git status --porcelain -- ':!core' ':!artifacts'\` <<<"
  if [ -n "$DIRTY" ]; then printf '%s\n' "$DIRTY"; else echo "(no tracked path modified)"; fi
  echo "=== dirty end    : >>>"
} > "$OUT"

timeout 900 npx playwright test "$SPEC" --reporter=line >> "$OUT" 2>&1
RC=$?

wait "$POLLER" 2>/dev/null

# Three shapes, told apart rather than lumped into "red":
#   PASS         the walk completes
#   FAIL-ASSERT  the walk ran and an assertion/step failed  <- the only signal a mutation arm may use
#   HARNESS      the walk never started (server, port, core, compile, module load). Playwright
#                reports "No tests found" when a child dies in module load, which reads exactly like
#                an empty test directory — so anything that is neither a pass nor a fail is HARNESS
#                and never a verdict about the code.
#
# L-RECEIPT-JOURNEY-AT-DE's F2 stands and is inherited: a TypeError inside page.evaluate also
# surfaces as "1 failed", so FAIL-ASSERT alone is not proof that an ASSERTION is what failed. Every
# mutation arm in this lane therefore quotes the expected/received pair out of the run log.
if grep -qE "^  1 passed" "$OUT"; then SHAPE=PASS
elif grep -qE "^  1 failed" "$OUT"; then SHAPE=FAIL-ASSERT
else SHAPE=HARNESS; fi

echo "RESULT $LABEL edition=$EDITION $SHAPE rc=$RC" | tee -a "$OUT"
