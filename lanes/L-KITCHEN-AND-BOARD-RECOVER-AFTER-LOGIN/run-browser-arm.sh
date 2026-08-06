#!/bin/zsh
# Three browser arms, each against its OWN `nuxt dev` process:
#
#   A  the two pages as this lane leaves them  -> the late order must reach the board (exit 0)
#   B  the two pages exactly as they were      -> the board must stay frozen and the arm must FAIL
#      before this lane touched them
#   C  restored                                -> back to 0
#
# A SERVER PER ARM, NOT ONE WITH HMR. A single dev server kept across the mutation can serve the arm
# a bundle compiled before the edit, and the arm then passes against the defect — a green that is the
# harness lying about the product. A sleep is not a barrier either; each arm POLLS for the port to
# answer. The compiler is restarted instead of being trusted to notice.
#
# The mutation is the pages' pre-lane content, restored from `baseline/` — the defect verbatim, its
# own handler and all — not an approximation written by hand.
#
# Ports 3903 (web) and 4903 (fixture) are this lane's. 4010, 4971 and 4973 were held by other lanes
# and are not touched, and neither is any container. The EXIT trap kills both servers and puts both
# pages back on every path out, including a failure.
set -u
LANE_DIR="${0:A:h}"
ROOT="${LANE_DIR:h:h}"
RUNS="${LANE_DIR}/runs"
mkdir -p "${RUNS}"

export E2E_WEB_PORT=3903
export E2E_FIXTURE_PORT=4903
export PLAN_ACTOR=agent:L-KITCHEN-AND-BOARD-RECOVER-AFTER-LOGIN

KITCHEN="${ROOT}/pages/admin/kitchen.vue"
ONGOING="${ROOT}/pages/admin/ongoing.vue"
MINE_KITCHEN="${RUNS}/kitchen.vue.mine"
MINE_ONGOING="${RUNS}/ongoing.vue.mine"
FIXTURE_PID=""
DEV_PID=""

stop_dev () {
  [[ -n "${DEV_PID}" ]] || return 0
  kill -TERM "${DEV_PID}" 2>/dev/null
  for i in {1..25}; do
    kill -0 "${DEV_PID}" 2>/dev/null || break
    sleep 1
  done
  kill -KILL "${DEV_PID}" 2>/dev/null
  DEV_PID=""
  return 0
}

cleanup () {
  stop_dev
  if [[ -n "${FIXTURE_PID}" ]]; then
    kill -TERM "${FIXTURE_PID}" 2>/dev/null
    sleep 1
    kill -KILL "${FIXTURE_PID}" 2>/dev/null
  fi
  [[ -f "${MINE_KITCHEN}" ]] && cp "${MINE_KITCHEN}" "${KITCHEN}"
  [[ -f "${MINE_ONGOING}" ]] && cp "${MINE_ONGOING}" "${ONGOING}"
  return 0
}
trap cleanup EXIT INT TERM

cd "${ROOT}" || exit 1
cp "${KITCHEN}" "${MINE_KITCHEN}"
cp "${ONGOING}" "${MINE_ONGOING}"

node test/e2e/fixture/api-server.js > "${RUNS}/fixture.log" 2>&1 &
FIXTURE_PID=$!
for i in {1..60}; do
  curl -sf "http://127.0.0.1:${E2E_FIXTURE_PORT}/__fixture/health" > /dev/null && break
  sleep 1
done
print "fixture up on ${E2E_FIXTURE_PORT}"

arm () {
  local name="$1"
  print "\n==== ARM ${name} ===="
  node test/e2e/scripts/dev-server.js > "${RUNS}/dev-server-${name}.log" 2>&1 &
  DEV_PID=$!
  for i in {1..300}; do
    curl -sf "http://127.0.0.1:${E2E_WEB_PORT}/" > /dev/null && break
    sleep 1
  done
  print "nuxt dev up on ${E2E_WEB_PORT} for arm ${name}"
  npx playwright test --config "${LANE_DIR}/browser-arm.config.js" 2>&1 | tee "${RUNS}/arm-${name}.txt"
  # NOT `status`: zsh makes that a read-only alias for `$?`, and assigning it aborts the function
  # after the tests have already run, which reads like the arm never happened.
  local rc=${pipestatus[1]}
  stop_dev
  return ${rc}
}

arm A; A=$?

print "\n---- restoring both pages to their pre-lane content (the defect verbatim) ----"
cp "${LANE_DIR}/baseline/kitchen.vue.base" "${KITCHEN}"
cp "${LANE_DIR}/baseline/ongoing.vue.base" "${ONGOING}"
arm B; B=$?

cp "${MINE_KITCHEN}" "${KITCHEN}"
cp "${MINE_ONGOING}" "${ONGOING}"
print "\n---- both pages restored ----"
arm C; C=$?

print "\n==== VERDICT ===="
print "arm A (this lane)      exit ${A}  -- must be 0"
print "arm B (pre-lane pages) exit ${B}  -- must be NON-zero"
print "arm C (restored)       exit ${C}  -- must be 0"
if [[ ${A} -eq 0 && ${B} -ne 0 && ${C} -eq 0 ]]; then
  print "BROWSER ARM: the board going live after an in-page sign-in is load-bearing"
  exit 0
fi
print "BROWSER ARM: INCONCLUSIVE"
exit 1
