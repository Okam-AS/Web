#!/usr/bin/env bash
#
# Runs EVERY live-eligible journey against a world `live-world.sh` already stood up, resetting between
# them — the loop `live-world.sh` and `live-world-reset.sh` describe in prose and leave to be typed.
#
# ---- WHY THIS EXISTS ---------------------------------------------------------------------------
#
# `npm run test:e2e` with nothing set boots `test/e2e/fixture/api-server.js` and proves the UI against
# canned payloads. That is the default on purpose — an instrument that needs a stack nobody has
# running is an instrument nobody runs — but it means the repository's 42 green journeys are evidence
# about the fixture, not about Okam. The live path has existed for a while and is genuinely good; what
# it did not have is a command. It had a procedure: stand the world up, take an image, then, per
# journey, restore and invoke Playwright with the right two variables, in the right order, remembering
# which journeys are eligible. A procedure that long is run once by the person who wrote it.
#
# ---- WHAT IT DOES, AND WHAT IT REFUSES TO DO ---------------------------------------------------
#
# It never stands a world up and never tears one down. `live-world.sh` owns that, because standing one
# up replays the whole migration chain — a proof about the BRANCH that is worth once per session and
# ruinous once per journey.
#
# The journey list is DERIVED, by asking Playwright what live mode selects, rather than listed here. A
# list here would be a second answer to a question `playwright.config.js` already answers with
# `grepInvert: /@fixture/`, and the two would part company the first time a journey earned its `@live`
# tag. It also refuses a selection of ZERO: live mode selected nothing at all for most of this repo's
# history, and a runner that reports success having run no tests is the exact defect the `@fixture`
# exclusion was invented to prevent.
#
# One Nuxt process for the whole loop, started here rather than by Playwright. Playwright kills a
# server it started, so a per-journey invocation would pay the cold webpack-4 build seven times over;
# `reuseExistingServer` in the config is what makes one process serve them all — and it is disabled
# when CI is set, which is one of the two reasons this script refuses to run under CI. The other is
# that live mode needs Docker, a SQL Server catalog and a built backend binary, and a hosted runner
# has none of them.
#
#   test/e2e/scripts/live-world.sh          # once: the world, and the variables it prints
#   test/e2e/scripts/live-journeys.sh       # this: every live journey, reset in between
#
# Anything overridden for `live-world.sh` must be passed here too — the variables below carry the same
# names and the same defaults, and are handed on to `live-world-reset.sh` unchanged.
set -euo pipefail

cd "$(dirname "$0")/../../.."

SQL_CONTAINER="${SQL_CONTAINER:-okam-lws-sql}"
SQL_PORT="${SQL_PORT:-15433}"
DB_NAME="${DB_NAME:-OkamLiveJourney}"
API_PORT="${API_PORT:-5951}"
WEB_PORT="${WEB_PORT:-3951}"
API_BASE="${E2E_API_BASE_URL:-http://127.0.0.1:$API_PORT}"

RESET="test/e2e/scripts/live-world-reset.sh"

say()  { printf '\n\033[1m== %s\033[0m\n' "$*"; }
note() { printf '   %s\n' "$*"; }
die()  { printf '\033[31mFAILED: %s\033[0m\n' "$*" >&2; exit 1; }

[ -z "${CI:-}" ] || die "CI is set. Live mode needs Docker, a SQL Server catalog and a built WebApi
    binary, and \`reuseExistingServer\` is disabled under CI — so this loop would rebuild the Nuxt
    bundle once per journey. The CI path is fixture mode: npm run test:e2e"

reset() { SQL_CONTAINER="$SQL_CONTAINER" SQL_PORT="$SQL_PORT" DB_NAME="$DB_NAME" API_PORT="$API_PORT" "$RESET" "$@"; }

# ---------------------------------------------------------------------------------------------
# 1. The image. `snapshot` refuses a world a journey has already written to, so this succeeds on a
#    world straight out of live-world.sh and falls through to a restore on one that already has an
#    image. Both failing means there is nothing clean to run against and the chain does have to be
#    replayed — which is live-world.sh's job, not this script's.
# ---------------------------------------------------------------------------------------------
say "Preparing the world at $API_BASE"
reset snapshot || reset restore \
    || die "this world is neither pristine nor imaged, so there is nothing clean to run against.
    Rebuild it:  test/e2e/scripts/live-world.sh"

# ---------------------------------------------------------------------------------------------
# 2. The selection, asked of the runner rather than repeated here.
# ---------------------------------------------------------------------------------------------
export E2E_API_BASE_URL="$API_BASE"
export E2E_WEB_PORT="$WEB_PORT"

say "Asking Playwright which journeys live mode selects"
SPECS="$(npx playwright test --list --reporter=json 2>/dev/null | node -e '
    let raw = "";
    process.stdin.on("data", d => raw += d).on("end", () => {
        const report = JSON.parse(raw);
        const files = [];
        (function walk(suite) {
            (suite.suites || []).forEach(walk);
            if (suite.file && (suite.specs || []).length) files.push(suite.file);
        })({ suites: report.suites });
        console.log([...new Set(files)].join("\n"));
    });
')" || die "could not list the journeys. Is \`npm ci\` done and \`npx playwright install chromium\` run?"

SPECS="$(printf '%s\n' "$SPECS" | sed '/^[[:space:]]*$/d')"
COUNT="$(printf '%s\n' "$SPECS" | grep -c . || true)"

# The floor. Live mode excludes every `@fixture` journey, and for most of this repo's history that was
# all of them — so a run selecting nothing is the failure mode this whole harness exists to avoid, and
# it must never be reported as success.
[ "$COUNT" -gt 0 ] || die "live mode selected NO journeys. Every journey still carries @fixture, so
    there is nothing here that can honestly run against a real backend, and a green exit would be a
    claim about a run that never happened."

note "$COUNT journey(s):"
printf '%s\n' "$SPECS" | sed 's/^/     /'

# ---------------------------------------------------------------------------------------------
# 3. One Nuxt for the whole loop.
# ---------------------------------------------------------------------------------------------
say "Starting nuxt dev on :$WEB_PORT against $API_BASE"
node test/e2e/scripts/dev-server.js &
DEV_PID=$!
trap 'kill $DEV_PID 2>/dev/null || true' EXIT

for _ in $(seq 1 150); do
    curl -fsS -o /dev/null "http://127.0.0.1:$WEB_PORT/" && break
    kill -0 $DEV_PID 2>/dev/null || die "the dev server exited before it served anything."
    sleep 2
done
curl -fsS -o /dev/null "http://127.0.0.1:$WEB_PORT/" \
    || die "nuxt dev did not serve :$WEB_PORT within five minutes."
note "serving"

# ---------------------------------------------------------------------------------------------
# 4. Restore, then one journey. In that order every time, including the first: these journeys write,
#    and several of them open by asserting a state an earlier one has already consumed.
# ---------------------------------------------------------------------------------------------
FAILED=""
for spec in $SPECS; do
    say "$spec"
    reset restore > /dev/null || die "the restore before $spec failed; the world is not in a state a
    journey can be run against. Diagnose with:  $RESET verify"

    if npx playwright test "$spec"; then
        note "PASSED  $spec"
    else
        FAILED="$FAILED $spec"
        note "FAILED  $spec"
    fi
done

say "Live journeys: $((COUNT - $(printf '%s' "$FAILED" | wc -w))) of $COUNT passed"
note "artifacts: artifacts/journeys/ — each names the origin and the backend build it reached"

[ -z "$FAILED" ] || die "failed:$FAILED"
