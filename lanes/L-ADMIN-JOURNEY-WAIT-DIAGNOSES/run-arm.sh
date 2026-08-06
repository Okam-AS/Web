#!/usr/bin/env bash
# ONE admin journey, in a clean detached worktree, on ports nobody else holds — optionally with the
# server KILLED mid-run so the failure message can be read under a real fault rather than reasoned
# about from the source.
#
#   CI=1          -> `reuseExistingServer: !CI` becomes false, so no surviving fixture and no
#                    surviving dev server from another lane can be adopted.
#   3877 / 4877   -> the CHANGED worktree's private ports.  3878 / 4878 -> the STOCK control's.
#                    Ports 4010, 4971 and 4973 are held by FOREIGN api-server processes and are
#                    never bound, never probed and never signalled here.
#   worktree      -> never the primary checkout: on 2026-08-06 it carried 354 uncommitted paths,
#                    SIX under test/e2e (api-server.js, world.js, journey.js), so a capture written
#                    there would name a commit while driving a harness that is not that commit's.
#
# ---- HOW THE KILL IS TIMED --------------------------------------------------------------------
#
# The harness POSTs `/__fixture/reset` BEFORE the browser opens and throws if it fails, so a server
# killed before the run aborts pre-browser and never reaches the helper under test. The kill has to
# land mid-journey, and it is timed off `/__fixture/stats.served` — which the fixture does NOT
# increment for its own `/__fixture/*` control surface (api-server.js: the control routes return
# before `state.served += 1`). So `served >= 1` means one thing only: the BROWSER has made a real
# API call. That call is `SendVerificationToken`, and killing on it puts the fault precisely where
# the 2026-08-03 red was — in `page.waitForURL` after the OTP was entered.
#
# Polling `/__fixture/stats` cannot itself move the counter, which is why it is a usable signal.
#
# TO RECREATE EITHER WORKTREE (both detached and disposable):
#   git -C /Users/svendaneel/okam/Web-modules worktree add --detach <path> 8ac6f63
#   ln -s /Users/svendaneel/okam/Web-modules/node_modules <path>/node_modules
#   git -C <path> -c protocol.file.allow=always submodule update --init core
# Never `npm ci` / `npm install`: they delete the node_modules ~124 worktrees share.
set -uo pipefail

LANE=/Users/svendaneel/okam/Web-modules/lanes/L-ADMIN-JOURNEY-WAIT-DIAGNOSES
SPEC=test/e2e/journeys/growth-newsletter-send-gate.spec.js
JOURNEY=growth-newsletter-send-gate

LABEL="${1:?usage: run-arm.sh <label> <worktree> <webPort> <fixPort> <kill: none|api|app>}"
WT="${2:?worktree}"
WEB_PORT="${3:?web port}"
FIX_PORT="${4:?fixture port}"
KILL="${5:-none}"

OUT="$LANE/runs/${LABEL}.txt"
KEEP="$LANE/runs/${LABEL}.artifacts"

export CI=1
export E2E_WEB_PORT="$WEB_PORT"
export E2E_FIXTURE_PORT="$FIX_PORT"
unset E2E_API_BASE_URL E2E_BASE_URL

mkdir -p "$LANE/runs"

for p in "$WEB_PORT" "$FIX_PORT"; do
  case "$p" in 4010|4971|4973) echo "ABORT: $p is a FOREIGN fixture port" | tee "$OUT"; exit 3;; esac
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
  echo "=== helper   : $(git hash-object test/e2e/support/admin.js) test/e2e/support/admin.js"
  echo "=== spec sha : $(git hash-object "$SPEC")"
  echo "=== ports    : web=$WEB_PORT fixture=$FIX_PORT (4010/4971/4973 never bound, never signalled)"
  echo "=== kill arm : $KILL"
  echo "=== started  : $(date -u +%FT%TZ)"
} > "$OUT"

# ---- the killer ------------------------------------------------------------------------------
# Only ever signals the PIDs listening on THIS run's own two ports, which this script's own
# `npx playwright test` started. Nothing else is ever looked at, let alone signalled.
#
# TIMING, AND WHY IT IS NOT `served >= 1`. The first attempt polled the served counter every 500ms
# and first observed it at TWO — both sign-in calls had already been answered, the journey was signed
# in, and the kill landed harmlessly eighty lines later (see runs/C0-api-killed-stock.txt). The two
# calls are separated only by six `fill()`s, so no poll is reliably between them.
#
# The window that IS wide is the one between the harness's `/__fixture/reset` — a local fetch that
# completes in milliseconds at test start — and the browser's first API call, which needs a page
# load, a route compile, a hydrate, a modal and a click. Playwright's line reporter prints `[1/1]`
# when the test starts, so: wait for that line, give reset a two-second head start, then kill. The
# fault then lands on the OTP wait, which is the first point at which the backend must have answered.
# A kill that somehow beat the reset does not produce a misleading pass — the harness throws
# `fixture reset failed` before the browser opens, which is a different and unmistakable outcome.
KILLER=""
if [ "$KILL" != "none" ]; then
  (
    for _ in $(seq 1 20000); do
      # `applate` kills BOTH origins once the browser has made its first API call, so the page is
      # loaded and hydrated and the fault lands inside signIn rather than at `page.goto` — which is
      # what the `app` arm produced, and which needed no diagnosis because `net::ERR_EMPTY_RESPONSE`
      # already names its own cause. Polled tight rather than every 500ms: the window is the six
      # `fill()`s between the two sign-in calls.
      if [ "$KILL" = "applate" ]; then
        s=$(curl -s --max-time 1 "http://127.0.0.1:${FIX_PORT}/__fixture/stats" 2>/dev/null \
            | sed -n 's/.*"served"[: ]*\([0-9]*\).*/\1/p')
        [ -n "$s" ] && [ "$s" -ge 1 ] 2>/dev/null || continue
        echo "[killer] served=$s -> killing app+api at $(date -u +%FT%TZ)" >> "$OUT"
        for pid in $(lsof -t -nP -iTCP:${WEB_PORT} -sTCP:LISTEN 2>/dev/null); do
          echo "[killer] SIGTERM web pid $pid" >> "$OUT"; kill -TERM "$pid" 2>/dev/null
        done
        for pid in $(lsof -t -nP -iTCP:${FIX_PORT} -sTCP:LISTEN 2>/dev/null); do
          echo "[killer] SIGTERM fixture pid $pid" >> "$OUT"; kill -TERM "$pid" 2>/dev/null
        done
        exit 0
      fi
      # `staged` is the only arm that reaches the APPLICATION-IS-NOT-LISTENING branch, and the two
      # arms it replaces are why it has to be staged. Killing the web server early (`app`) stops the
      # run at `page.goto` with `net::ERR_EMPTY_RESPONSE`, which never reaches signIn and needs no
      # diagnosis. Killing it after the page has loaded breaks nothing at all, because a hydrated SPA
      # does not ask the origin for anything else. So: kill the API on the K1 timing to put a pending
      # 30s wait on the board, then kill the web server ten seconds into that wait, so BOTH origins
      # are down at the moment the diagnosis probes them.
      if [ "$KILL" = "staged" ] && grep -q '^\[1/1\]' "$OUT" 2>/dev/null; then
        sleep 0.4
        echo "[killer] stage 1: killing api at $(date -u +%FT%TZ)" >> "$OUT"
        for pid in $(lsof -t -nP -iTCP:${FIX_PORT} -sTCP:LISTEN 2>/dev/null); do
          echo "[killer] SIGTERM fixture pid $pid" >> "$OUT"; kill -TERM "$pid" 2>/dev/null
        done
        sleep 12
        echo "[killer] stage 2: killing app at $(date -u +%FT%TZ)" >> "$OUT"
        for pid in $(lsof -t -nP -iTCP:${WEB_PORT} -sTCP:LISTEN 2>/dev/null); do
          echo "[killer] SIGTERM web pid $pid" >> "$OUT"; kill -TERM "$pid" 2>/dev/null
        done
        exit 0
      fi
      if [ "$KILL" != "staged" ] && grep -q '^\[1/1\]' "$OUT" 2>/dev/null; then
        sleep 2
        served=$(curl -s --max-time 2 "http://127.0.0.1:${FIX_PORT}/__fixture/stats" 2>/dev/null \
                 | sed -n 's/.*"served"[: ]*\([0-9]*\).*/\1/p')
        echo "[killer] test started, served=${served:-?} -> killing $KILL at $(date -u +%FT%TZ)" >> "$OUT"
        if [ "$KILL" = "app" ]; then
          for pid in $(lsof -t -nP -iTCP:${WEB_PORT} -sTCP:LISTEN 2>/dev/null); do
            echo "[killer] SIGTERM web pid $pid" >> "$OUT"; kill -TERM "$pid" 2>/dev/null
          done
        fi
        for pid in $(lsof -t -nP -iTCP:${FIX_PORT} -sTCP:LISTEN 2>/dev/null); do
          echo "[killer] SIGTERM fixture pid $pid" >> "$OUT"; kill -TERM "$pid" 2>/dev/null
        done
        sleep 1
        echo "[killer] after: web=$(lsof -t -nP -iTCP:${WEB_PORT} -sTCP:LISTEN 2>/dev/null | tr '\n' ' ')none fixture=$(lsof -t -nP -iTCP:${FIX_PORT} -sTCP:LISTEN 2>/dev/null | tr '\n' ' ')none" >> "$OUT"
        exit 0
      fi
      sleep 0.5
    done
    echo "[killer] gave up: nothing was ever served" >> "$OUT"
  ) &
  KILLER=$!
fi

timeout 900 npx playwright test "$SPEC" --reporter=line >> "$OUT" 2>&1
RC=$?
[ -n "$KILLER" ] && kill "$KILLER" 2>/dev/null

rm -rf "$KEEP"; mkdir -p "$KEEP/runs"
cp artifacts/journeys/runs/"$JOURNEY".*.playwright.json "$KEEP/runs/" 2>/dev/null
cp artifacts/journeys/"$JOURNEY".playwright.json "$KEEP/" 2>/dev/null

if grep -qE "^  1 passed" "$OUT"; then SHAPE=PASS
elif grep -qE "^  1 failed" "$OUT"; then SHAPE=FAIL-ASSERT
else SHAPE=HARNESS; fi

{
  echo "=== finished : $(date -u +%FT%TZ)"
  echo "=== dirty after : $(git status --porcelain --untracked-files=all -- ':!core' | wc -l | tr -d ' ') path(s)"
  echo "RESULT $LABEL $SHAPE rc=$RC"
} | tee -a "$OUT"
