#!/bin/zsh
# ONE server, ONE pass, NO mutation — so the "a reused dev server can pass against the defect"
# hazard does not apply: nothing is edited between compiles. This run only observes what the
# pages in this worktree do.
set -u
LANE_DIR="${0:A:h}"
ROOT="${LANE_DIR:h:h}"
RUNS="${LANE_DIR}/runs"
mkdir -p "${RUNS}"
export E2E_WEB_PORT=3903
export E2E_FIXTURE_PORT=4903
FIXTURE_PID=""; DEV_PID=""
cleanup () {
  [[ -n "${DEV_PID}" ]] && { kill -TERM "${DEV_PID}" 2>/dev/null; sleep 3; kill -KILL "${DEV_PID}" 2>/dev/null; }
  [[ -n "${FIXTURE_PID}" ]] && { kill -TERM "${FIXTURE_PID}" 2>/dev/null; sleep 1; kill -KILL "${FIXTURE_PID}" 2>/dev/null; }
  return 0
}
trap cleanup EXIT INT TERM
cd "${ROOT}" || exit 1
node test/e2e/fixture/api-server.js > "${RUNS}/fixture.log" 2>&1 &
FIXTURE_PID=$!
for i in {1..60}; do curl -sf "http://127.0.0.1:${E2E_FIXTURE_PORT}/__fixture/health" > /dev/null && break; sleep 1; done
print "fixture up on ${E2E_FIXTURE_PORT}"
node test/e2e/scripts/dev-server.js > "${RUNS}/dev-server-diag.log" 2>&1 &
DEV_PID=$!
for i in {1..300}; do curl -sf "http://127.0.0.1:${E2E_WEB_PORT}/" > /dev/null && break; sleep 1; done
print "nuxt dev up on ${E2E_WEB_PORT}"
grep -c "Failed to compile" "${RUNS}/dev-server-diag.log" | read -r compile_errors
print "compile-error lines in the dev-server log: ${compile_errors}  (must be 0)"
npx playwright test --config "${LANE_DIR}/browser-arm.config.js" 2>&1 | tee "${RUNS}/diagnostic.txt"
exit ${pipestatus[1]}
