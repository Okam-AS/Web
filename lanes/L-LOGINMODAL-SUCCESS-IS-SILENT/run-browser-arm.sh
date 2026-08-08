#!/usr/bin/env bash
# Run ONE browser arm against a freshly compiled dev server.
#
#   ./run-browser-arm.sh stock   # the original defect restored in the file, then compiled
#   ./run-browser-arm.sh fixed   # the tree as it stands
#
# THE COMPILER IS RESTARTED FOR EVERY ARM. A dev server started before a source edit keeps serving
# the bundle it already built, so an arm that reuses one across a mutation measures the PREVIOUS
# arm's code and passes against the defect. Nuxt's watcher would eventually rebuild, but "eventually"
# is a race and a sleep is not a barrier — so the server is started AFTER the edit and torn down
# after the arm, and readiness is decided by POLLING the port, never by waiting a fixed time.
#
# PORTS. 3897 = this lane's dev server. 4897 = the API base the app is pointed at, deliberately with
# NOTHING BOUND: every backend call is fulfilled inside the browser by page.route, so no sign-in
# attempt reaches a real server. Both chosen to avoid 4010/4971/4973 (foreign fixtures) and
# 3881/3882, 4881/4882, 3891/4891 (recent sibling lanes).

set -euo pipefail

ARM="${1:?usage: run-browser-arm.sh stock|fixed [success|wrongcode]}"
SCENARIO="${2:-success}"
ROOT="/Users/svendaneel/okam/web-loginsuccess"
LANE="${ROOT}/lanes/L-LOGINMODAL-SUCCESS-IS-SILENT"
PORT=3897
API_PORT=4897
TARGET="components/molecules/LoginModal.vue"
OUT="${LANE}/runs/arm-${ARM}-${SCENARIO}.txt"

mkdir -p "${LANE}/runs"
cd "${ROOT}"

# RESTORE FROM THE BUFFER THIS SCRIPT READ, NEVER FROM GIT.
#
# This used to `git checkout -- "${TARGET}"`, in the trap and again before each arm, with a comment
# saying it restored "only from git" as though that were the safe choice. It is the opposite: a
# checkout reverts to HEAD, so run while this lane had uncommitted work in LoginModal.vue it would
# not undo the arm's edit, it would DELETE the lane's own edits and call it a restore. That is the
# defect `test/support/mutate.js` was rewritten to remove, and this script is a mutation driver in
# everything but its name — it patches a source, compiles it, measures it, and puts it back.
ORIGINAL="$(mktemp)"
cp "${TARGET}" "${ORIGINAL}"

cleanup () {
  if [ -n "${DEV_PID:-}" ]; then
    kill "${DEV_PID}" 2>/dev/null || true
    wait "${DEV_PID}" 2>/dev/null || true
  fi
  # The file as it stood when this script started — clean tree, dirty tree or neither.
  if [ -f "${ORIGINAL}" ]; then
    cp "${ORIGINAL}" "${TARGET}"
    rm -f "${ORIGINAL}"
  fi
}
trap cleanup EXIT

# ---- 1. put the source in the state this arm is measuring -------------------------------------
cp "${ORIGINAL}" "${TARGET}"
if [ "${ARM}" = "stock" ]; then
  python3 - <<'PY'
import io
TARGET = "/Users/svendaneel/okam/web-loginsuccess/components/molecules/LoginModal.vue"
with io.open(TARGET, encoding="utf-8") as handle:
    src = handle.read()

# The defect, verbatim: no reset at the top of `login`, and the response serialized into the error
# slot on the success branch.
reset = '      this.code = code;\n      this.errorMessage = "";\n      this.isLoading = true;'
assert src.count(reset) == 1, "reset anchor not unique"
src = src.replace(reset, '      this.code = code;\n      this.isLoading = true;')

branch = ('          if(Boolean(response)) {\n'
          '            this.codeSent = true;\n'
          '            this.$emit("close", true);\n'
          '          } else {')
assert src.count(branch) == 1, "success-branch anchor not unique"
src = src.replace(branch, ('          if(Boolean(response)) {\n'
                           '            this.codeSent = true;\n'
                           '            this.errorMessage = JSON.stringify(response);\n'
                           '            this.$emit("close", true);\n'
                           '          } else {'))

with io.open(TARGET, "w", encoding="utf-8") as handle:
    handle.write(src)
print("[arm] stock defect restored in the source")
PY
else
  echo "[arm] source left as committed (fixed)"
fi

echo "[arm] the login method this arm will compile:"
sed -n '/^    login(code) {/,/^    },/p' "${TARGET}" | sed 's/^/    | /'

# ---- 2. compile and serve, from scratch, for this arm only -------------------------------------
: > "${LANE}/runs/dev-${ARM}.log"
API_BASE_URL="http://127.0.0.1:${API_PORT}" PORT="${PORT}" NODE_ENV=development \
  npx nuxt-ts >>"${LANE}/runs/dev-${ARM}.log" 2>&1 &
DEV_PID=$!

echo "[arm] dev server pid ${DEV_PID}, polling :${PORT} for a real answer"
READY=""
for _ in $(seq 1 240); do
  if ! kill -0 "${DEV_PID}" 2>/dev/null; then
    echo "[arm] dev server exited early; last log lines:"
    tail -30 "${LANE}/runs/dev-${ARM}.log"
    exit 1
  fi
  # Readiness is a 200 for the page under test, not a banner in a log and not a duration.
  if curl -sf -o /dev/null "http://127.0.0.1:${PORT}/admin"; then READY="yes"; break; fi
  sleep 1
done
if [ -z "${READY}" ]; then
  echo "[arm] :${PORT} never served /admin; last log lines:"
  tail -30 "${LANE}/runs/dev-${ARM}.log"
  exit 1
fi
echo "[arm] :${PORT} is serving /admin"

# ---- 3. drive the browser ----------------------------------------------------------------------
set +e
ARM_NAME="${ARM}" ARM_SCENARIO="${SCENARIO}" ARM_BASE_URL="http://127.0.0.1:${PORT}" \
  npx playwright test "${LANE}/browser-arm.playwright.js" \
  --config="${LANE}/browser-proof.config.js" --reporter=list 2>&1 | tee "${OUT}"
STATUS=${PIPESTATUS[0]}
set -e

echo "[arm] ${ARM}/${SCENARIO} finished with status ${STATUS}; recording in ${OUT}"
exit "${STATUS}"
