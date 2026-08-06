#!/usr/bin/env bash
# Run ONE journey (modal-estate-scroll-lock) at ONE edition, in THIS lane's own worktree, on ports
# nobody else holds, and RECORD WHO ANSWERED.
#
# Inherited wholesale from lanes/L-JOURNEY-AT-DE/run-journey.sh — same guards, same reasons, and the
# reasons are restated rather than referenced because a runner nobody can read is a runner nobody
# checks:
#
#   CI=1                 -> playwright.config's `reuseExistingServer: !CI` becomes false, so a
#                           surviving fixture/dev server from ANY other lane can never be silently
#                           reused. Port-in-use becomes a loud error rather than stale code.
#   3847 / 4847          -> THIS lane's private ports (the sibling holds 3823/4823), with a precheck.
#                           Port 4010 is held by a FOREIGN api-server (pid 73160) which this lane
#                           never binds and never signals; a run served by it produced five phantom
#                           failures and one phantom statutory gap elsewhere.
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
# Evidence is written OUTSIDE the worktree being measured, so a run log can never dirty the build id.
set -uo pipefail

WT=/Users/svendaneel/okam/web-rcptde
LANE=/Users/svendaneel/okam/Web-modules/lanes/L-RECEIPT-JOURNEY-AT-DE
SPEC=test/e2e/journeys/modal-estate-scroll-lock.spec.js

LABEL="${1:?usage: run-journey.sh <label> <edition:no|ch>}"
EDITION="${2:?usage: run-journey.sh <label> <edition:no|ch>}"

OUT="$LANE/runs/${LABEL}.txt"
WHO="$LANE/runs/${LABEL}.who-answered.json"

WEB_PORT=3847
FIX_PORT=4847

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

# ALL THREE DICTIONARIES ARE HASHED, AND THE DIRTY SET IS PRINTED VERBATIM.
# `utils/i18n.js` falls back no -> en -> de, so every dictionary is an input to a German assertion and
# a record that hashes one of them cannot rule the other two out. And a dirty COUNT names no file and
# pins no content: the arm carrying a mutation and the arm that did not would be told apart only by
# trusting the label. Provenance a reader can check beats provenance a reader is told.
# (Arms A..G in runs/ were recorded before `en.ts` and the verbatim dirty set were added here; the
# de.ts and no.ts shas in those headers already pin both mutated dictionaries by content, which is
# what the D-arms turn on.)
DIRTY="$(git status --porcelain -- ':!core' ':!artifacts')"
{
  echo "=== label        : $LABEL"
  echo "=== edition      : OKAM_EDITION=$EDITION"
  echo "=== worktree     : $WT"
  echo "=== commit       : $(git rev-parse HEAD)"
  echo "=== spec sha     : $(git hash-object "$SPEC")"
  echo "=== de.ts sha    : $(git hash-object translations/de.ts)"
  echo "=== no.ts sha    : $(git hash-object translations/no.ts)"
  echo "=== en.ts sha    : $(git hash-object translations/en.ts)"
  echo "=== OrderCard sha: $(git hash-object components/molecules/OrderCard.vue)"
  echo "=== world.js sha : $(git hash-object test/e2e/fixture/world.js)"
  echo "=== ports        : web=$WEB_PORT fixture=$FIX_PORT (4010 never bound, pid 73160 never signalled)"
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
#   FAIL-ASSERT  the walk ran and an assertion/step failed  <- the only copy-guard signal
#   HARNESS      the walk never started (server, port, core, compile, module load). Playwright
#                reports "No tests found" when a child dies in module load, which reads exactly like
#                an empty test directory — so anything that is neither a pass nor a fail is HARNESS
#                and never a copy verdict.
if grep -qE "^  1 passed" "$OUT"; then SHAPE=PASS
elif grep -qE "^  1 failed" "$OUT"; then SHAPE=FAIL-ASSERT
else SHAPE=HARNESS; fi

echo "RESULT $LABEL edition=$EDITION $SHAPE rc=$RC" | tee -a "$OUT"
