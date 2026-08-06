#!/usr/bin/env bash
# ONE arm of the login-modal proof, in a clean detached worktree, on ports nobody else holds.
#
# THE POINT OF THE `dead` MODE. `playwright.config.js` starts the throwaway fixture ONLY when
# E2E_API_BASE_URL is unset; set it, and the config's webServer list is the dev server alone. Point
# it at a port nothing is bound to and the application is running against NOTHING LISTENING — every
# API call it makes is refused by the OS. No process is killed to arrange that, so there is no race
# to lose and no foreign process anywhere near it. The dead port is asserted unbound before the run
# and again after, because an arm that silently found a listener would prove the opposite of what it
# claims.
#
# `fixture` mode is the ordinary world: the fixture answers, and it is what the regression arm uses
# to show the SUCCESS path is untouched.
#
# Ports 4010, 4971 and 4973 are held by FOREIGN fixtures and are never bound, never probed and never
# signalled here. Nothing is ever killed by this script.
#
# TO RECREATE EITHER WORKTREE (both detached and disposable):
#   git -C /Users/svendaneel/okam/Web-modules worktree add --detach <path> 8ac6f63
#   ln -s /Users/svendaneel/okam/Web-modules/node_modules <path>/node_modules
#   git -C <path> -c protocol.file.allow=always submodule update --init core
# Never `npm ci` / `npm install`: they delete the node_modules ~124 worktrees share.
set -uo pipefail

LANE=/Users/svendaneel/okam/Web-modules/lanes/L-LOGIN-MODAL-REPORTS-A-FAILED-SEND

LABEL="${1:?usage: run-arm.sh <label> <worktree> <webPort> <mode: dead|fixture> <apiPort> <spec>}"
WT="${2:?worktree}"
WEB_PORT="${3:?web port}"
MODE="${4:?dead|fixture}"
API_PORT="${5:?api port}"
SPEC="${6:?spec path}"

OUT="$LANE/runs/${LABEL}.txt"
mkdir -p "$LANE/runs"

export CI=1
export E2E_WEB_PORT="$WEB_PORT"
unset E2E_BASE_URL
if [ "$MODE" = "dead" ]; then
  export E2E_API_BASE_URL="http://127.0.0.1:${API_PORT}"
  unset E2E_FIXTURE_PORT
else
  unset E2E_API_BASE_URL
  export E2E_FIXTURE_PORT="$API_PORT"
fi

for p in "$WEB_PORT" "$API_PORT"; do
  case "$p" in 4010|4971|4973) echo "ABORT: $p is a FOREIGN fixture port" | tee "$OUT"; exit 3;; esac
  if lsof -nP -iTCP:$p -sTCP:LISTEN >/dev/null 2>&1; then
    echo "ABORT: port $p is busy before the run started" | tee "$OUT"; exit 3
  fi
done

cd "$WT" || { echo "ABORT: no worktree at $WT" | tee "$OUT"; exit 3; }
[ -d core/services ] || { echo "ABORT: core/ is empty" | tee "$OUT"; exit 3; }
[ -e node_modules/.bin/playwright ] || { echo "ABORT: no node_modules" | tee "$OUT"; exit 3; }
[ -f "$SPEC" ] || { echo "ABORT: no spec at $SPEC" | tee "$OUT"; exit 3; }

{
  echo "=== label     : $LABEL"
  echo "=== worktree  : $WT"
  echo "=== commit    : $(git rev-parse HEAD)"
  echo "=== dirty     : $(git status --porcelain --untracked-files=all -- ':!core' | wc -l | tr -d ' ') path(s) before the run"
  echo "=== modal sha : $(git hash-object components/molecules/LoginModal.vue) components/molecules/LoginModal.vue"
  echo "=== spec sha  : $(git hash-object "$SPEC")  $SPEC"
  echo "=== mode      : $MODE   api=127.0.0.1:$API_PORT   web=127.0.0.1:$WEB_PORT"
  if [ "$MODE" = "dead" ]; then
    echo "=== api before: $(lsof -nP -iTCP:$API_PORT -sTCP:LISTEN 2>/dev/null | wc -l | tr -d ' ') listener(s) on the API port — 0 means nothing is listening"
    echo "=== api probe : $(curl -s -o /dev/null -w '%{http_code}' --max-time 3 "http://127.0.0.1:${API_PORT}/user" 2>&1 || echo 'no answer (curl rc='$?')')"
  fi
  echo "=== ports     : 4010/4971/4973 never bound, never probed, never signalled"
  echo "=== started   : $(date -u +%FT%TZ)"
} > "$OUT"

timeout 900 npx playwright test "$SPEC" --reporter=line >> "$OUT" 2>&1
RC=$?

if grep -qE "^  [0-9]+ passed" "$OUT"; then SHAPE=PASS
elif grep -qE "^  [0-9]+ failed" "$OUT"; then SHAPE=FAIL-ASSERT
else SHAPE=HARNESS; fi

{
  if [ "$MODE" = "dead" ]; then
    echo "=== api after : $(lsof -nP -iTCP:$API_PORT -sTCP:LISTEN 2>/dev/null | wc -l | tr -d ' ') listener(s) — still nothing listening if 0"
  fi
  echo "=== finished  : $(date -u +%FT%TZ)"
  echo "RESULT $LABEL $SHAPE rc=$RC"
} | tee -a "$OUT"
