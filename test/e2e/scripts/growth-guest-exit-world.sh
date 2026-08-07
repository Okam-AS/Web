#!/usr/bin/env bash
#
# Stands up the GUEST-EXIT world and walks it: the real backend composition root on real Kestrel over
# real TLS on one origin, this app on another, and one browser that holds no session opening the link
# a dispatched newsletter actually carried.
#
# ---- WHY THIS IS NOT `live-world.sh` ----------------------------------------------------------
#
# `live-world.sh` is the big live world: a SQL Server container, the whole migration chain replayed
# from empty, `dotnet run` on the real WebApi. It is the right instrument for the journeys that need a
# durable multi-module world, and it needs a Docker slot to exist.
#
# This one needs no container, and that is a property rather than a shortcut. The question it exists
# to answer — is a browser on the consumer-web origin PERMITTED by the API's CORS policy to complete a
# session-free withdrawal — is decided by the composition root, the CORS registration, TLS, and two
# origins. None of those is a database. So the world here is the wire tier's in-process host moved
# onto a real socket (`WebApi.Tests/Growth/GrowthGuestExitWorld.cs`), which boots the same
# `Program.Main` and keeps the same containment: machine-local secrets stripped out of configuration,
# every egress setting blanked, outbound HTTP denied, the Fake mail provider.
#
# ---- WHAT IT DOES, IN ORDER --------------------------------------------------------------------
#
#   1. the backend world      seeds Growth, dispatches a campaign through the real dispatch service,
#                             copies the exit link out of the body the provider received, and
#                             publishes it in `world.json` together with a per-run TLS certificate
#   2. `nuxt dev`             started exactly as every other journey starts it, on loopback http,
#                             compiled with API_BASE_URL pointed at the world's API origin
#   3. a TLS front end        in front of `nuxt dev`, under the world's certificate, so the page is
#                             served from an https origin on a DIFFERENT host from the API
#   4. the journey            one browser, no session, opening the link out of `world.json`
#   5. the C7 sweep           the artifacts are searched for the token, and a hit fails the run
#
# ---- USAGE -------------------------------------------------------------------------------------
#
#   OKAM_API_REPO=/path/to/OkamAPI-modules test/e2e/scripts/growth-guest-exit-world.sh
#
# Optional: GUEST_EXIT_API_PORT (5943) GUEST_EXIT_WEB_PORT (3943) GUEST_EXIT_UPSTREAM_PORT (3944)
#           GUEST_EXIT_KEEP=1  leaves the world standing after the journey, for a headed re-run.
#
# NOTHING IS EVER KILLED BY NAME. Every process this script starts is killed by the pid it recorded,
# and nothing else on the machine is touched — there are other lanes' worlds and other lanes'
# containers on this host, and a pattern kill has already taken one down.

set -uo pipefail

WEB_REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
LANE_DIR="$WEB_REPO/lanes/L-A-GUEST-CAN-LEAVE-A-MAILING-LIST"
RUN_DIR="$LANE_DIR/world"

API_PORT="${GUEST_EXIT_API_PORT:-5943}"
WEB_PORT="${GUEST_EXIT_WEB_PORT:-3943}"
UPSTREAM_PORT="${GUEST_EXIT_UPSTREAM_PORT:-3944}"

API_ORIGIN="https://127.0.0.1:$API_PORT"
WEB_ORIGIN="https://localhost:$WEB_PORT"

note () { printf '\n== %s\n' "$*"; }
die  () { printf '\nFAILED: %s\n' "$*" >&2; exit 1; }

# ---- refusals, before anything is started ------------------------------------------------------

[ -n "${OKAM_API_REPO:-}" ] || die "OKAM_API_REPO is not set. Point it at the OkamAPI checkout whose
    WebApi and WebApi.Tests this world should be built from, e.g.
        OKAM_API_REPO=/Users/you/okam/OkamAPI-modules $0"
[ -f "$OKAM_API_REPO/WebApi.Tests/WebApi.Tests.csproj" ] || die "no WebApi.Tests/WebApi.Tests.csproj under OKAM_API_REPO=$OKAM_API_REPO"

# Two ports this machine reserves for another lane's world. Named rather than assumed, because the
# failure of binding one of them is somebody else's run breaking, not this one's.
for reserved in 3971 5971; do
  for chosen in "$API_PORT" "$WEB_PORT" "$UPSTREAM_PORT"; do
    [ "$chosen" != "$reserved" ] || die "port $reserved belongs to another lane and must not be bound."
  done
done

for chosen in "$API_PORT" "$WEB_PORT" "$UPSTREAM_PORT"; do
  if lsof -nP -iTCP:"$chosen" -sTCP:LISTEN >/dev/null 2>&1; then
    die "port $chosen is already held by another process. Pick different ports with
    GUEST_EXIT_API_PORT / GUEST_EXIT_WEB_PORT / GUEST_EXIT_UPSTREAM_PORT — and do not kill the holder,
    it belongs to somebody."
  fi
done

mkdir -p "$RUN_DIR"
[ -f "$RUN_DIR/.gitignore" ] || die "$RUN_DIR/.gitignore is missing. It is what keeps the handshake —
    which carries a working unsubscribe token — out of every commit (C7). The backend world refuses
    to start without it."
rm -f "$RUN_DIR/world.json" "$RUN_DIR/outcome.json" "$RUN_DIR/withdrawn" "$RUN_DIR/stop" "$RUN_DIR/world.log"

WORLD_PID=""
NUXT_PID=""
TLS_PID=""

cleanup () {
  local code=$?
  if [ "${GUEST_EXIT_KEEP:-}" = "1" ] && [ "$code" = "0" ]; then
    note "GUEST_EXIT_KEEP=1 — the world is still standing:"
    printf '   page  %s/preferences/unsubscribe\n   API   %s\n   stop  touch %s\n' \
      "$WEB_ORIGIN" "$API_ORIGIN" "$RUN_DIR/stop"
    return
  fi
  [ -z "$TLS_PID" ]   || kill "$TLS_PID"   2>/dev/null
  [ -z "$NUXT_PID" ]  || kill "$NUXT_PID"  2>/dev/null
  # The world stops on its own file rather than on a signal, so its `finally` runs and the two hosts
  # are disposed rather than abandoned holding a socket.
  [ -z "$WORLD_PID" ] || { touch "$RUN_DIR/stop"; sleep 2; kill "$WORLD_PID" 2>/dev/null; }
}
trap cleanup EXIT

# ---- 1. the backend world ----------------------------------------------------------------------

note "building the backend world from $OKAM_API_REPO"
( cd "$OKAM_API_REPO/WebApi.Tests" && dotnet build -v q --nologo ) >/dev/null 2>&1 \
  || die "the backend test project does not build; run dotnet build in $OKAM_API_REPO/WebApi.Tests to see it"

note "starting the world: real composition root, real Kestrel, TLS, on $API_ORIGIN"
(
  cd "$OKAM_API_REPO/WebApi.Tests" &&
  exec env \
    GROWTH_GUEST_EXIT_WORLD_DIR="$RUN_DIR" \
    GROWTH_GUEST_EXIT_API_PORT="$API_PORT" \
    GROWTH_GUEST_EXIT_WEB_ORIGIN="$WEB_ORIGIN" \
    GROWTH_GUEST_EXIT_TIMEOUT_SECONDS="${GUEST_EXIT_TIMEOUT_SECONDS:-900}" \
    dotnet test --no-build --filter "FullyQualifiedName~GrowthGuestExitWorldTests"
) > "$RUN_DIR/world.log" 2>&1 &
WORLD_PID=$!

for _ in $(seq 1 180); do
  [ -f "$RUN_DIR/world.json" ] && break
  kill -0 "$WORLD_PID" 2>/dev/null || break
  sleep 1
done
[ -f "$RUN_DIR/world.json" ] || die "the world never published $RUN_DIR/world.json — read $RUN_DIR/world.log"

curl -sk --cacert "$RUN_DIR/tls/cert.pem" -o /dev/null "$API_ORIGIN/health" \
  || die "the world published a handshake but $API_ORIGIN/health does not answer under its own certificate"
note "the world is up; a campaign has been dispatched and its exit link published"

# ---- 2 + 3. the app, and TLS in front of it ----------------------------------------------------

# `exec` inside each subshell, so `$!` is the pid of NODE ITSELF rather than of a shell that happens
# to have node as a child. Without it `cleanup` signals the wrapper, the wrapper dies, and the server
# keeps the port — which is exactly what happened on the first run of this script and cost the second
# run its ports. Killing the leftovers by pattern is not the fix; not orphaning them is.
note "starting nuxt dev on 127.0.0.1:$UPSTREAM_PORT with API_BASE_URL=$API_ORIGIN"
(
  cd "$WEB_REPO" &&
  exec env \
    E2E_WEB_PORT="$UPSTREAM_PORT" \
    E2E_API_BASE_URL="$API_ORIGIN" \
    NODE_EXTRA_CA_CERTS="$RUN_DIR/tls/cert.pem" \
    node test/e2e/scripts/dev-server.js
) > "$RUN_DIR/nuxt.log" 2>&1 &
NUXT_PID=$!

note "starting the TLS front end on $WEB_ORIGIN"
(
  cd "$WEB_REPO" &&
  exec env \
    GROWTH_GUEST_EXIT_WORLD_DIR="$RUN_DIR" \
    GROWTH_GUEST_EXIT_WEB_PORT="$WEB_PORT" \
    GROWTH_GUEST_EXIT_UPSTREAM_PORT="$UPSTREAM_PORT" \
    node test/e2e/scripts/growth-guest-exit-web-tls.js
) > "$RUN_DIR/tls.log" 2>&1 &
TLS_PID=$!

note "waiting for the app to compile (nuxt dev builds a route the first time it is asked for)"
READY=""
for _ in $(seq 1 360); do
  if curl -sk --max-time 5 -o /dev/null "$WEB_ORIGIN/preferences/unsubscribe"; then READY=1; break; fi
  kill -0 "$NUXT_PID" 2>/dev/null || die "nuxt dev exited — read $RUN_DIR/nuxt.log"
  kill -0 "$TLS_PID"  2>/dev/null || die "the TLS front end exited — read $RUN_DIR/tls.log"
  sleep 2
done
[ -n "$READY" ] || die "$WEB_ORIGIN never answered — read $RUN_DIR/nuxt.log and $RUN_DIR/tls.log"

# ---- 4. the journey ----------------------------------------------------------------------------

note "walking the journey"
(
  cd "$WEB_REPO" &&
  E2E_BASE_URL="$WEB_ORIGIN" \
  E2E_API_BASE_URL="$API_ORIGIN" \
  E2E_API_BUILD="$(basename "$OKAM_API_REPO")@$(git -C "$OKAM_API_REPO" rev-parse HEAD 2>/dev/null || echo unknown)" \
  GROWTH_GUEST_EXIT_WORLD_DIR="$RUN_DIR" \
  NODE_EXTRA_CA_CERTS="$RUN_DIR/tls/cert.pem" \
  npx playwright test --config playwright.growth-guest-exit.config.js "$@"
)
JOURNEY_STATUS=$?

# ---- 5. the C7 sweep ---------------------------------------------------------------------------
#
# The handshake carries a working unsubscribe token and the journey handles it. Nothing it writes is
# supposed to carry it out — the steps quote lengths and paths, never the credential — but "supposed
# to" is not a check. This is the check, and it runs whether the journey passed or failed, because a
# failed run's artifact is exactly where a leaked token would hide.
note "sweeping the artifacts for the credential"
TOKEN="$(node -e '
  const fs = require("fs");
  const world = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
  process.stdout.write(decodeURIComponent(world.exitFragment.replace("#token=", "")));
' "$RUN_DIR/world.json")"
[ -n "$TOKEN" ] || die "could not read the token back out of the handshake, so the C7 sweep would pass vacuously"

if grep -rlF "$TOKEN" "$WEB_REPO/artifacts" 2>/dev/null | grep -q .; then
  printf '\nC7 VIOLATION: the unsubscribe token appears in:\n' >&2
  grep -rlF "$TOKEN" "$WEB_REPO/artifacts" >&2
  exit 1
fi
note "no artifact carries the token"

exit $JOURNEY_STATUS
