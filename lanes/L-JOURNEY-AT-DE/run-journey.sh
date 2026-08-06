#!/usr/bin/env bash
# Run ONE journey (margin-statement-week) at ONE edition, in this lane's own worktree, on ports
# nobody else holds, and RECORD WHO ANSWERED.
#
# WHY EACH GUARD IS HERE:
#   CI=1                 -> playwright.config's `reuseExistingServer: !CI` becomes false, so a
#                           surviving fixture/dev server from ANY other lane can never be silently
#                           reused. Port-in-use becomes a loud error rather than stale code.
#   3823 / 4823          -> this lane's private ports, with a precheck. Port 4010 is held by a
#                           FOREIGN api-server (pid 73160) which this lane never binds and never
#                           signals; a run served by it produced five phantom failures elsewhere.
#   no E2E_API_BASE_URL  -> setting it flips the config to live mode, which grep-inverts @fixture
#                           and would run NOTHING. Absence is load-bearing.
#   OKAM_EDITION         -> the BUILD flag, and the only thing this lane varies. It reaches the
#                           bundle through playwright -> webServer command -> dev-server.js
#                           (`Object.assign({}, process.env, ...)`) -> nuxt.config.js. No dictionary
#                           is handed to the spec: the app resolves its own locale from
#                           store/index.js:18, which reads the edition's market.
#   who-answered poller  -> the fixture dies with the run, so its identity is captured WHILE it is
#                           up: its own testimony (/__fixture/health) and, from outside, lsof. A
#                           capture without this cannot be compared with one that has it.
#
# Evidence is written OUTSIDE the worktree being measured, so a run log can never dirty the build id.
set -uo pipefail

WT=/Users/svendaneel/okam/web-atde
LANE=/Users/svendaneel/okam/Web-modules/lanes/L-JOURNEY-AT-DE
SPEC=test/e2e/journeys/margin-statement-week.spec.js

LABEL="${1:?usage: run-journey.sh <label> <edition:no|ch>}"
EDITION="${2:?usage: run-journey.sh <label> <edition:no|ch>}"

OUT="$LANE/runs/${LABEL}.txt"
WHO="$LANE/runs/${LABEL}.who-answered.json"

WEB_PORT=3823
FIX_PORT=4823

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
# Two independent oracles for the port this run was GRANTED, captured while the fixture is alive:
#   health  the server's own testimony about itself
#   lsof    who actually holds the socket, asked from outside the server
( for _ in $(seq 1 240); do
    if lsof -iTCP:"$FIX_PORT" -sTCP:LISTEN -P -n >/dev/null 2>&1; then
      HEALTH=$(curl -s --max-time 3 "http://127.0.0.1:${FIX_PORT}/__fixture/health" 2>/dev/null)
      HOLDER=$(lsof -iTCP:"$FIX_PORT" -sTCP:LISTEN -P -n -Fpn 2>/dev/null | tr '\n' ' ')
      HPID=$(lsof -iTCP:"$FIX_PORT" -sTCP:LISTEN -P -n -t 2>/dev/null | head -1)
      HCWD=$(lsof -a -p "${HPID:-0}" -d cwd -Fn 2>/dev/null | grep '^n' | head -1 | cut -c2-)
      HCMD=$(ps -o command= -p "${HPID:-0}" 2>/dev/null | head -1)
      printf '{\n  "label": %s,\n  "edition": %s,\n  "grantedFixturePort": %s,\n  "grantedWebPort": %s,\n  "health": %s,\n  "holderPid": %s,\n  "holderCwd": %s,\n  "holderCommand": %s,\n  "lsof": %s,\n  "capturedAt": %s\n}\n' \
        "\"$LABEL\"" "\"$EDITION\"" "$FIX_PORT" "$WEB_PORT" \
        "\"$(printf '%s' "${HEALTH:-}" | sed 's/"/\\"/g')\"" \
        "\"${HPID:-unresolved}\"" "\"${HCWD:-unresolved}\"" \
        "\"$(printf '%s' "${HCMD:-unresolved}" | sed 's/"/\\"/g')\"" \
        "\"$(printf '%s' "${HOLDER:-}" | sed 's/"/\\"/g')\"" \
        "\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"" > "$WHO"
      exit 0
    fi
    sleep 1
  done
  printf '{ "label": "%s", "edition": "%s", "unresolved": "fixture port %s never came up within 240s" }\n' \
    "$LABEL" "$EDITION" "$FIX_PORT" > "$WHO" ) &
POLLER=$!

# WHY EVERY DICTIONARY IS HASHED, AND WHY THE DIRTY SET IS PRINTED VERBATIM.
# Until 2026-08-05 this header printed a sha for `translations/de.ts` ONLY, and described the working
# tree as a COUNT ("3 tracked path(s) modified"). That is not enough to read an arm back:
#   * arm D2/D3 mutated `translations/no.ts`, and the only trace of it in the run record was the count
#     going 2 -> 3. A count names no file and pins no content, so the arm that carried the mutation and
#     the arm that did not were distinguishable only by trusting the label.
#   * `utils/i18n.js` falls back no -> en -> de, so all THREE dictionaries are inputs to any German
#     assertion. A German render satisfied by an English or Norwegian string is a real failure mode,
#     and it cannot be ruled out of a record that hashes one of the three.
# So: hash all three dictionaries plus both files under test, and print the dirty set as the porcelain
# itself rather than its cardinality. Provenance a reader can check beats provenance a reader is told.
DIRTY="$(git status --porcelain -- ':!core')"
{
  echo "=== label      : $LABEL"
  echo "=== edition    : OKAM_EDITION=$EDITION"
  echo "=== worktree   : $WT"
  echo "=== commit     : $(git rev-parse HEAD)"
  echo "=== spec sha   : $(git hash-object "$SPEC")"
  echo "=== flags sha  : $(git hash-object test/e2e/support/flags.js)"
  echo "=== de.ts sha  : $(git hash-object translations/de.ts)"
  echo "=== no.ts sha  : $(git hash-object translations/no.ts)"
  echo "=== en.ts sha  : $(git hash-object translations/en.ts)"
  echo "=== ports      : web=$WEB_PORT fixture=$FIX_PORT (4010 never bound, pid 73160 never signalled)"
  echo "=== core       : $(ls core | wc -l | tr -d ' ') entries"
  echo "=== dirty      : verbatim \`git status --porcelain -- ':!core'\` <<<"
  if [ -n "$DIRTY" ]; then printf '%s\n' "$DIRTY"; else echo "(no tracked path modified)"; fi
  echo "=== dirty end  : >>>"
} > "$OUT"

timeout 900 npx playwright test "$SPEC" --reporter=line >> "$OUT" 2>&1
RC=$?

wait "$POLLER" 2>/dev/null

# Three shapes, told apart rather than lumped into "red":
#   PASS         the walk completes
#   FAIL-ASSERT  the walk ran and an assertion/step failed  <- the only copy-guard signal
#   HARNESS      the walk never started (server, port, core, compile, module load)
if grep -qE "^  1 passed" "$OUT"; then SHAPE=PASS
elif grep -qE "^  1 failed" "$OUT"; then SHAPE=FAIL-ASSERT
else SHAPE=HARNESS; fi

echo "RESULT $LABEL edition=$EDITION $SHAPE rc=$RC" | tee -a "$OUT"
