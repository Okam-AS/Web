#!/bin/zsh
# Three browser arms, each against its OWN `nuxt dev` process:
#
#   A  pages/admin/lang.vue as this lane leaves it  -> every route must report 1
#   B  pages/admin/lang.vue exactly as it was at    -> /admin/lang must report 2 and the arm FAILS
#      HEAD (the defect verbatim, import and all)
#   C  restored                                     -> back to 1
#
# ---- WHY A SERVER PER ARM AND NOT ONE WITH HMR ------------------------------------------------
#
# Measured, not assumed. The first version of this script mutated the page under a single running
# dev server and slept 25s for the rebuild; arm B PASSED, reporting one modal on a page that had
# two mount sites in it. A green there would have been a lie about the product told by the harness,
# and it is exactly the shape this lane exists to remove — so the harness now restarts the compiler
# instead of trusting it to notice.
#
# The mutation is `git show HEAD:pages/admin/lang.vue` rather than an inserted tag, for the same
# reason: an inserted `<LoginModal>` leans on Nuxt's auto-import, and if that resolves to nothing
# the arm measures a missing component rather than a second modal. The HEAD file carries its own
# import, its own `showLogin` and its own handler. It is the defect, not a model of it.
#
# Ports 3891/4891 are this lane's; 4010 was held by another lane and is not touched. No container is
# started, stopped or inspected. The EXIT trap kills both servers and puts lang.vue back on every
# path out, including a failure — `dev-server.js` returns the `core/` it borrows in its own handler,
# so it must be allowed to exit rather than be killed from orbit.
set -u
LANE_DIR="${0:A:h}"
ROOT="${LANE_DIR:h:h}"
RUNS="${LANE_DIR}/runs"
mkdir -p "${RUNS}"

export E2E_WEB_PORT=3891
export E2E_FIXTURE_PORT=4891
export PLAN_ACTOR=agent:L-LOGINMODAL-MOUNTED-ONCE

LANG_PAGE="${ROOT}/pages/admin/lang.vue"
BACKUP="${RUNS}/lang.vue.mine"
FIXTURE_PID=""
DEV_PID=""

stop_dev () {
  [[ -n "${DEV_PID}" ]] || return 0
  kill -TERM "${DEV_PID}" 2>/dev/null
  for i in {1..20}; do
    kill -0 "${DEV_PID}" 2>/dev/null || break
    sleep 1
  done
  kill -KILL "${DEV_PID}" 2>/dev/null
  DEV_PID=""
  return 0
}

cleanup () {
  stop_dev
  [[ -n "${FIXTURE_PID}" ]] && kill -TERM "${FIXTURE_PID}" 2>/dev/null
  sleep 1
  [[ -n "${FIXTURE_PID}" ]] && kill -KILL "${FIXTURE_PID}" 2>/dev/null
  [[ -f "${BACKUP}" ]] && cp "${BACKUP}" "${LANG_PAGE}"
  return 0
}
trap cleanup EXIT INT TERM

cd "${ROOT}" || exit 1
cp "${LANG_PAGE}" "${BACKUP}"

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
  for i in {1..240}; do
    curl -sf "http://127.0.0.1:${E2E_WEB_PORT}/" > /dev/null && break
    sleep 1
  done
  print "nuxt dev up on ${E2E_WEB_PORT} for arm ${name}"
  npx playwright test --config "${LANE_DIR}/browser-proof.config.js" 2>&1 | tee "${RUNS}/arm-${name}.txt"
  # NOT `status`: zsh makes that a read-only alias for `$?`, and assigning it aborts the function
  # with `read-only variable: status` after the tests have already run — which reads like the arm
  # never happened.
  local rc=${pipestatus[1]}
  stop_dev
  return ${rc}
}

arm A; A=$?

print "\n---- putting pages/admin/lang.vue back to its HEAD content (the defect verbatim) ----"
git show HEAD:pages/admin/lang.vue > "${LANG_PAGE}"
grep -c 'LoginModal' "${LANG_PAGE}" | read -r mutated_hits
print "lang.vue now names LoginModal on ${mutated_hits} lines"
arm B; B=$?

cp "${BACKUP}" "${LANG_PAGE}"
print "\n---- lang.vue restored ----"
arm C; C=$?

print "\n==== VERDICT ===="
print "arm A (fixed)     exit ${A}  -- must be 0"
print "arm B (HEAD lang) exit ${B}  -- must be NON-zero"
print "arm C (restored)  exit ${C}  -- must be 0"
if [[ ${A} -eq 0 && ${B} -ne 0 && ${C} -eq 0 ]]; then
  print "BROWSER ARM: the count is load-bearing"
  exit 0
fi
print "BROWSER ARM: INCONCLUSIVE"
exit 1
