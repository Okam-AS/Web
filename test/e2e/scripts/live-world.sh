#!/usr/bin/env bash
#
# Stands up a LIVE world for the browser journeys: a real SQL Server catalog, the whole migration
# chain applied from empty, a real WebApi process, and the smallest seeded world a journey can honestly
# run against. Then it prints the one command that runs the journeys against it.
#
# ---- WHY THIS EXISTS --------------------------------------------------------------------------
#
# Every journey in this repo carried `@fixture`, and `playwright.config.js` excludes that tag in live
# mode — so `E2E_API_BASE_URL=... npm run test:e2e` selected ZERO tests. That exclusion was right:
# the fixture hard-codes a store id, a demo phone and one-time code and specific request ids, and a
# journey that asserted on those against a real database would either fail confusingly or, worse,
# pass against the wrong world while its artifact claimed `"backend": "live"`. Un-tagging a journey
# without first building the world it needs is the one outcome worse than having no live run at all.
#
# This script builds that world. It is deliberately the SMALLEST one: it seeds what
# `events-deposit-precondition` needs and nothing else, because the point is to prove the PATH — real
# API, real database, real browser, an artifact naming the backend it reached — not to reproduce the
# six-module demo. `OkamAPI/Scripts/demo/demo-up.sh` is the big world; this is the small one, and the
# next journey to go live extends the seed section below rather than reinventing the plumbing.
#
# ---- WHAT IT SEEDS, AND WHY SO LITTLE ---------------------------------------------------------
#
#   the manager  +4799999999 / 123123, through the REAL `POST /User/login`. This is not a fixture
#                invention: it is `AppSettings.DemoPhoneNumber` / `AppSettings.DemoVerificationCode`,
#                one of exactly two no-SMS sign-ins the application has. So the credential the
#                journeys already type is real against a live backend — that was the cheapest of the
#                three blockers and it turned out to already be solved.
#
#   the store    a `Stores` row and a `StoreAdmins` row, in SQL. These are the only two writes here
#                that do not go through the product, and they are unavoidable rather than convenient:
#                there is no admin create-store endpoint on this branch, and the Nuxt admin shell
#                redirects a user whose `adminIn` is empty to /registrer — so without the membership
#                row the manager cannot reach a single admin page. `Scripts/demo/seed-workforce-demo.sh`
#                reached the same conclusion and says so in the same words.
#
# NOTHING ELSE. No flag override, no money-path row, no projection. The journey's own subject is the
# feature-flag board, so seeding a flag state would be seeding the answer; and a seed that constructed
# a deposit, capture or settlement line would need an actor to name and would be the C4 violation it
# was meant to guard against. The flag writes the journey makes are made BY THE BROWSER, under the
# manager's own bearer token, which is what puts a real actor on them.
#
# ---- THE ABSOLUTE RULES -----------------------------------------------------------------------
#
#   * The migration chain runs against localhost or it does not run. Checked on the resolved
#     connection string itself, below, before anything is created.
#   * This script starts a SQL container only if you point it at one. It BORROWS the container named
#     by SQL_CONTAINER and creates its own catalog on it — this host OOM-kills past about three mssql
#     containers, and a container somebody else started is never ours to touch.
#
# ---- USAGE ------------------------------------------------------------------------------------
#
#   OKAM_API_REPO=/path/to/OkamAPI SQL_CONTAINER=my-sql SQL_PORT=15433 test/e2e/scripts/live-world.sh
#
# then, in another terminal, what it prints:
#
#   E2E_API_BASE_URL=http://127.0.0.1:5951 E2E_WEB_PORT=3951 npm run test:e2e
#
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WEB_REPO="$(cd "$HERE/../../.." && pwd)"

OKAM_API_REPO="${OKAM_API_REPO:-}"
SQL_CONTAINER="${SQL_CONTAINER:-okam-lws-sql}"
SQL_PORT="${SQL_PORT:-15433}"
SQL_SA_PASSWORD="${SQL_SA_PASSWORD:-Velkommen123!}"
DB_NAME="${DB_NAME:-OkamLiveJourney}"
API_PORT="${API_PORT:-5951}"
WEB_PORT="${WEB_PORT:-3951}"
MANAGER_PHONE="${MANAGER_PHONE:-+4799999999}"   # AppSettings.DemoPhoneNumber
MANAGER_CODE="${MANAGER_CODE:-123123}"          # AppSettings.DemoVerificationCode
STORE_NAME="${STORE_NAME:-Live Journey Kafé}"
TZ_ID="${TZ_ID:-Europe/Oslo}"
LOG="${LOG:-/tmp/okam-live-world-api.log}"

API_BASE="http://127.0.0.1:$API_PORT"
CONN="Server=localhost,${SQL_PORT};Database=${DB_NAME};User Id=sa;Password=${SQL_SA_PASSWORD};TrustServerCertificate=True;Encrypt=False;Connect Timeout=60"

say() { printf '\n\033[1m== %s\033[0m\n' "$*"; }
note() { printf '   %s\n' "$*"; }
die() { printf '\033[31mFAILED: %s\033[0m\n' "$*" >&2; exit 1; }
# Never print the SA password, not even in an error path: this output gets pasted into reviews.
safe_conn() { printf '%s' "$CONN" | sed 's/Password=[^;]*/Password=***/'; }

[ -n "$OKAM_API_REPO" ] || die "OKAM_API_REPO is not set. Point it at the OkamAPI checkout whose
    migration chain and WebApi this world should be built from, e.g.
        OKAM_API_REPO=/Users/you/okam/OkamAPI $0"
[ -f "$OKAM_API_REPO/WebApi.csproj" ] || die "no WebApi.csproj under OKAM_API_REPO=$OKAM_API_REPO"

# -----------------------------------------------------------------------------------------------
# THE ABSOLUTE RULE. Checked on the RESOLVED connection string, not on a variable somebody meant to
# set, and before a single statement runs.
# -----------------------------------------------------------------------------------------------
case "$CONN" in
    *"Server=localhost,"*|*"Server=127.0.0.1,"*) ;;
    *) die "connection string is not localhost -- refusing to migrate:
    $(safe_conn)" ;;
esac
case "$CONN" in
    *database.windows.net*|*okam.prod*|*okamtest*)
        die "connection string looks like a DEPLOYED database. Stop." ;;
esac
note "target: $(safe_conn)"

sqlm() { # against master
    docker exec -i "$SQL_CONTAINER" /opt/mssql-tools18/bin/sqlcmd \
        -S localhost -U sa -P "$SQL_SA_PASSWORD" -C -b -I -h -1 -W "$@"
}
sqld() { sqlm -d "$DB_NAME" "$@"; }

docker ps --format '{{.Names}}' | grep -qx "$SQL_CONTAINER" \
    || die "SQL container '$SQL_CONTAINER' is not running.
    This script BORROWS a SQL server that is already up and creates its own catalog on it, rather
    than starting another mssql container -- this host OOM-kills past about three. Start one you own,
    or point SQL_CONTAINER/SQL_PORT at it."

# -----------------------------------------------------------------------------------------------
say "1/5  Stopping any API this script previously started on :$API_PORT"
# By PORT, and only after confirming the holder is a WebApi. `dotnet run` execs a child named plainly
# `WebApi`, so a pkill pattern matches the launcher and misses the process holding the socket -- and a
# stale API then keeps answering the health check below against the OLD database, which makes a seed
# bug out of a process bug.
for pid in $(lsof -nP -iTCP:"$API_PORT" -sTCP:LISTEN -t 2>/dev/null); do
    if ps -o command= -p "$pid" 2>/dev/null | grep -q "WebApi"; then
        kill "$pid" 2>/dev/null || true
    fi
done
for _ in $(seq 1 20); do
    lsof -nP -iTCP:"$API_PORT" -sTCP:LISTEN -t >/dev/null 2>&1 || break
    sleep 1
done
lsof -nP -iTCP:"$API_PORT" -sTCP:LISTEN -t >/dev/null 2>&1 \
    && die "port $API_PORT is still held and its holder is not ours to kill. Set API_PORT to a free port."
note ":$API_PORT is free"

say "2/5  Recreating an EMPTY database [$DB_NAME]"
sqlm -Q "IF DB_ID('$DB_NAME') IS NOT NULL
         BEGIN ALTER DATABASE [$DB_NAME] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE [$DB_NAME]; END;
         CREATE DATABASE [$DB_NAME];"
TABLES="$(sqld -Q "SET NOCOUNT ON; SELECT CAST(COUNT(*) AS varchar) FROM sys.tables;" | tr -d ' \r\n')"
[ "$TABLES" = "0" ] || die "the new database is not empty (has $TABLES tables)"
note "empty: 0 tables"

say "3/5  Applying the migration chain from empty"
# This lane AUTHORS no migration (C2): it applies the chain that is already on the branch. Rebuilding
# from empty every time is also the only way the run re-proves the chain still replays.
export PATH="$HOME/.dotnet/tools:$PATH"
command -v dotnet-ef >/dev/null || die "dotnet-ef not installed: dotnet tool install -g dotnet-ef --version 8.0.26"
( cd "$OKAM_API_REPO" && dotnet build WebApi.csproj -v q --nologo >/dev/null \
  && dotnet ef database update --project WebApi.csproj --connection "$CONN" --no-build >/dev/null 2>&1 ) \
  || die "migration failed -- rerun the dotnet ef command without output suppressed to see it"
APPLIED="$(sqld -Q "SET NOCOUNT ON; SELECT CAST(COUNT(*) AS varchar) FROM __EFMigrationsHistory;" | tr -d ' \r\n')"
TABLES="$(sqld -Q "SET NOCOUNT ON; SELECT CAST(COUNT(*) AS varchar) FROM sys.tables;" | tr -d ' \r\n')"
TRIGGERS="$(sqld -Q "SET NOCOUNT ON; SELECT CAST(COUNT(*) AS varchar) FROM sys.triggers WHERE is_ms_shipped=0;" | tr -d ' \r\n')"
note "$APPLIED migrations, $TABLES tables, $TRIGGERS append-only triggers"

# C1, CHECKED AGAINST THE LIVE CATALOG RATHER THAN ASSUMED FROM THE DIFF. The only two tables this
# script writes directly are Stores and StoreAdmins. If either ever gains an append-only guard, the
# seed below becomes a C1 violation the moment it runs -- so it is refused HERE, by asking the
# database, which is the one source that cannot be out of date.
GUARDED="$(sqld -Q "SET NOCOUNT ON;
    SELECT ISNULL(STRING_AGG(t.name, ','), '')
    FROM sys.triggers tr JOIN sys.tables t ON t.object_id = tr.parent_id
    WHERE tr.is_ms_shipped = 0 AND t.name IN ('Stores','StoreAdmins');" | tr -d ' \r\n')"
[ -z "$GUARDED" ] || die "C1: these tables now carry a trigger and must not be seeded directly: $GUARDED"
note "C1 checked on sys.triggers: Stores and StoreAdmins carry none"

say "4/5  Starting the API on $API_BASE"
# No module config masters are set. This world exists for the feature-flag board, whose controller is
# gated on StoreAdmin alone -- the flag CATALOG is composed unconditionally in Program.cs, so
# Events:Enabled and Growth:Enabled would change nothing here. A journey that needs a module's ROUTES
# to answer adds its switch here and says why, the way demo-up.sh does.
# Launched from THIS shell rather than from a `( … & )` subshell, and with stdin closed onto
# /dev/null. Both details were learned the hard way on the first run: from a subshell `$!` reported
# the subshell's own pid, so the "stop it with" line at the bottom named a process that was not the
# API and `kill -0` was watching the wrong thing; and with stdin inherited, the API kept the caller's
# stdout pipe open, so `live-world.sh | tail` never returned even though the script had finished.
cd "$OKAM_API_REPO"
ASPNETCORE_ENVIRONMENT=Development \
ASPNETCORE_URLS="$API_BASE" \
ConnectionStrings__WebApiDatabase="$CONN" \
    nohup dotnet run --project WebApi.csproj --no-build --no-launch-profile </dev/null > "$LOG" 2>&1 &
API_PID=$!
cd "$WEB_REPO"
for _ in $(seq 1 60); do
    # A dead launcher must not be waited on, and -- the sharper trap -- a healthy answer from somebody
    # ELSE's process must not be mistaken for ours coming up.
    kill -0 "$API_PID" 2>/dev/null || die "the API process exited during startup; see $LOG"
    if curl -fsS -o /dev/null "$API_BASE/health" 2>/dev/null; then break; fi
    sleep 2
done
curl -fsS -o /dev/null "$API_BASE/health" || die "API did not come up; see $LOG"
grep -q "Failed to bind to address" "$LOG" && die "the API could not bind :$API_PORT; see $LOG"
note "healthy (pid $API_PID, log: $LOG)"

say "5/5  Seeding the smallest world a journey can run against"

MGR_JSON="$(curl -sS -X POST "$API_BASE/User/login" -H 'Content-Type: application/json' \
    -d "{\"phoneNumber\":\"$MANAGER_PHONE\",\"token\":\"$MANAGER_CODE\"}")"
MGR_TOKEN="$(printf '%s' "$MGR_JSON" | jq -r '.token // empty')"
MGR_USERID="$(printf '%s' "$MGR_JSON" | jq -r '.id // empty')"
# The RESPONSE is not echoed on failure: it carries a bearer token on success and this output is read
# by people and pasted into reviews (C7). The two things a reader needs are which field was missing
# and which number was used.
[ -n "$MGR_TOKEN" ]  || die "manager login ($MANAGER_PHONE) returned no token. The demo sign-in needs
    AppSettings.DemoPhoneNumber/DemoVerificationCode to match MANAGER_PHONE/MANAGER_CODE."
[ -n "$MGR_USERID" ] || die "manager login ($MANAGER_PHONE) returned no user id"
note "manager signed in: applicationUserId = $MGR_USERID"

# NOT idempotent by deletion, on purpose. A world is rebuilt by recreating the DATABASE (step 2), never
# by unpicking it: once any journey has written through an append-only surface, an in-place delete is
# blocked by the guard and by the foreign keys that reach it. That is the schema working.
EXISTING="$(sqld -Q "SET NOCOUNT ON; SELECT ISNULL(CAST((SELECT TOP 1 StoreId FROM Stores WHERE Name = N'$STORE_NAME') AS varchar), '');" | tr -d ' \r\n')"
[ -z "$EXISTING" ] || die "store '$STORE_NAME' already exists (StoreId $EXISTING) in $DB_NAME.
    Rebuild from empty instead of overwriting a world:   $0"

sqld -Q "SET NOCOUNT ON;
-- Country is not decoration anywhere in this estate: several modules resolve a legal jurisdiction from
-- Stores.Country and answer a typed refusal rather than defaulting when it is blank.
INSERT INTO Stores (Name, Country, TimeZone, VAT, SelfCheckout, Approved, Registered)
VALUES (N'$STORE_NAME', N'NO', N'$TZ_ID', 15, 0, 1, SYSDATETIME());
SELECT CAST(SCOPE_IDENTITY() AS int);" > /tmp/okam-live-world-storeid.txt
STORE_ID="$(tr -d ' \r\n' < /tmp/okam-live-world-storeid.txt)"
[ -n "$STORE_ID" ] || die "could not create the store"

sqld -Q "SET NOCOUNT ON;
INSERT INTO StoreAdmins (ApplicationUserId, StoreId) VALUES (N'$MGR_USERID', $STORE_ID);" >/dev/null
note "store '$STORE_NAME' = StoreId $STORE_ID, with the manager as its StoreAdmin"

# ---- READ THE WORLD BACK OFF THE WIRE ----------------------------------------------------------
#
# Not "the inserts returned no error" -- the seed is only finished when the PRODUCT can see it. Each
# read below is one the browser is about to make, made first from here, so a broken world fails at the
# seed with a sentence rather than inside a journey as a selector timeout.

# The membership, read the way the BROWSER reads it. `adminIn` on the signed-in user is what the Nuxt
# shell branches on -- `utils/admin/nav-access.js` calls an empty list a positive "worker" answer and
# the shell then redirects every store-admin page to /registrer. So this signs in AGAIN, after the
# membership row exists, and asserts the store is in the list. A `StoreAdmins` INSERT that returned no
# error but is not visible here would leave every journey failing at a selector.
MGR_JSON2="$(curl -sS -X POST "$API_BASE/User/login" -H 'Content-Type: application/json' \
    -d "{\"phoneNumber\":\"$MANAGER_PHONE\",\"token\":\"$MANAGER_CODE\"}")"
MGR_TOKEN="$(printf '%s' "$MGR_JSON2" | jq -r '.token // empty')"
ADMIN_IN="$(printf '%s' "$MGR_JSON2" | jq -r --arg id "$STORE_ID" '[.adminIn // [] | .[] | select((.id|tostring) == $id)] | length')"
[ "$ADMIN_IN" = "1" ] || die "after the StoreAdmins insert the manager's adminIn still does not carry
    store $STORE_ID. The admin shell reads exactly this and would redirect every page to /registrer.
    adminIn ids seen: $(printf '%s' "$MGR_JSON2" | jq -c '[.adminIn // [] | .[] | .id]')"
note "the manager's adminIn carries store $STORE_ID -- the shell will let them in"

CATALOG="$(curl -sS "$API_BASE/feature-flags/catalog" -H "Authorization: Bearer $MGR_TOKEN")"
CATALOG_COUNT="$(printf '%s' "$CATALOG" | jq -r 'if type=="array" then length else empty end')"
[ -n "$CATALOG_COUNT" ] || die "GET /feature-flags/catalog did not answer a list: $CATALOG"
[ "$CATALOG_COUNT" -gt 1 ] || die "the flag catalog has $CATALOG_COUNT entries; the board needs more than one"
note "GET /feature-flags/catalog -> $CATALOG_COUNT flags"

STATES="$(curl -sS "$API_BASE/stores/$STORE_ID/feature-flags" -H "Authorization: Bearer $MGR_TOKEN")"
STATE_COUNT="$(printf '%s' "$STATES" | jq -r 'if type=="array" then length else empty end')"
[ -n "$STATE_COUNT" ] || die "GET /stores/$STORE_ID/feature-flags did not answer a list -- this route
    Forbids a caller who is not a StoreAdmin of the store, so a refusal here means the membership row
    did not take: $STATES"
note "GET /stores/$STORE_ID/feature-flags -> $STATE_COUNT states (the manager IS a StoreAdmin)"

OVERRIDES="$(printf '%s' "$STATES" | jq -r '[ .[] | select(.isOverridden == true) ] | length')"
[ "$OVERRIDES" = "0" ] || die "the fresh world already carries $OVERRIDES flag override(s). A journey whose
    subject is the flag board must start from a store with none, or it is asserting the seed's answer."
note "no flag overrides: every flag reads its module default, deny-closed"

cat <<EOF

-------------------------------------------------------------------------------
A LIVE world is up.

    API        $API_BASE           (pid $API_PID, log $LOG)
    database   $DB_NAME on localhost,$SQL_PORT   ($APPLIED migrations, $TABLES tables)
    store      $STORE_ID  "$STORE_NAME"
    manager    ${MANAGER_PHONE#+47} / $MANAGER_CODE   (the app prefixes +47 itself)

Run the live journeys against it:

    cd $WEB_REPO
    E2E_API_BASE_URL=$API_BASE E2E_WEB_PORT=$WEB_PORT npm run test:e2e

Playwright starts no fixture in that mode and runs only the journeys that do NOT carry \`@fixture\`.
Their artifacts land in artifacts/journeys/ with "backend": "live" and this API's origin on
"apiBaseUrl" -- and support/journey.js FAILS a live run in which the browser never reached that
origin, so the label cannot be produced without the traffic.

Stop it with:   kill $API_PID
-------------------------------------------------------------------------------
EOF
