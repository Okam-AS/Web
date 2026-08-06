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
# This script builds that world. It is deliberately the SMALLEST one that the live-tagged journeys
# need, because the point is to prove the PATH — real API, real database, real browser, an artifact
# naming the backend it reached — not to reproduce the six-module demo.
# `OkamAPI/Scripts/demo/demo-up.sh` is the big world; this is the small one, and the next journey to
# go live extends the seed section below rather than reinventing the plumbing.
#
# ---- WHAT IT SEEDS, AND WHY SO LITTLE ---------------------------------------------------------
#
#   the manager  +4799999999 / 123123, through the REAL `POST /User/login`. This is not a fixture
#                invention: it is `AppSettings.DemoPhoneNumber` / `AppSettings.DemoVerificationCode`,
#                one of exactly two no-SMS sign-ins the application has. So the credential the
#                journeys already type is real against a live backend — that was the cheapest of the
#                three blockers and it turned out to already be solved.
#
#   the store    `POST /Stores/register` under the manager's own bearer, then
#                `PUT /stores/{id}/market`. THE SAME TWO CALLS A CUSTOMER MAKES: `pages/registrer.vue:525`
#                through `core/services/store-service.ts:45` posts the first one (spelled
#                `/stores/register` there — ASP.NET routing is case-insensitive and it is the same
#                action), and the second is the only production writer of Country / CurrencyCode /
#                TimeZone there is.
#
#                THIS SCRIPT USED TO SAY "there is no admin create-store endpoint on this branch" and
#                INSERT both rows. That was false, and it was the load-bearing kind of false: the
#                registration flow is the one journey nothing else in this repo exercises, so the
#                seed's shortcut was also the reason a real defect in it could never surface here.
#                `StoresController.Register` is `[AllowAnonymous]` and hands `User?.Identity?.Name` to
#                `StoreService.RegisterAsync`, which creates the `Stores` row AND — when that name
#                resolves to a user — the caller's own `StoreAdmins` row. The login JWT sets
#                `unique_name` to the user id and ASP.NET's inbound map sends it to `Identity.Name`,
#                so an authenticated register is exactly the store-plus-admin pair this world needs.
#                It also does the things an INSERT silently skipped: an address, default opening
#                hours, the standard allergen and goods-group sets.
#
#                Registration does NOT set country, timezone or currency — nothing on that path does —
#                so `PUT /stores/{id}/market` follows, under StoreAdmin authorisation, and derives the
#                currency from the country the way the market-authority law requires.
#
#   the roster   a legal employer, the manager's own engagement, two colleagues, a role, employment
#                terms and hourly rates — everything `/admin/workforce-schedule` has to have before a
#                week can be authored at all. THREE SQL ROWS and then nothing but HTTP; see the
#                section head at step 5b for which three and why each of them has no endpoint.
#
# ---- AND THE STORE IS LEFT UNAPPROVED, WHICH IS THE POINT ------------------------------------
#
# A registered store is `Approved = false` until somebody publishes it, and the old INSERT set the
# column to 1 — so the seeded world was in a state no registration can produce. It is left false now,
# because NOTHING these journeys traverse reads it. That was checked rather than hoped, on the whole
# path each journey actually walks:
#
#   the shell's gate   `adminIn` comes from `StoreService.GetUserRoles`, whose store query carries no
#                      Approved filter at all — so an unapproved store still lets its admin in, and
#                      `utils/admin/nav-access.js` still resolves `store-admin` rather than `worker`.
#   both pages         `/admin/feature-flags` and `/admin/workforce-schedule` pick their store out of
#                      that same `adminIn` list; neither reads `store.approved`.
#   the flag routes    `StoreAdminAuthorizationHandler` succeeds on membership or PowerUser and never
#                      looks at the column.
#   the workforce API  authorises from `WorkforceStaffMember.CapabilityGrants` alone —
#                      `WorkforceAuthorizationService` has no access to Store at all.
#
# `Store.Approved` gates the CONSUMER surface (`Stores/{id}/consumer` 404s, `CartService` refuses a
# prepaid cart, the public store list hides it) and none of that is on these three journeys. The
# assertion below is the falsifiable half of this paragraph: the register response is checked to come
# back UNAPPROVED, so if registration ever starts approving, or a journey ever starts needing it, this
# claim breaks here instead of being believed.
#
# AND APPROVAL IS NOT PowerUser-ONLY EITHER, if a later journey does need it. `POST /Stores/approve/{id}`
# is `[Authorize(Roles = PowerUser)]`, but `POST /Stores/{id}/publish` sets the same column for a plain
# StoreAdmin of the store — it is what `/admin/overview`'s publish toggle calls. So the next journey
# that needs a published store adds one authenticated POST here; it does not need an elevated role and
# it does not need SQL.
#
# NO FLAG OVERRIDE, and no money-path row written from here. Two journeys' own subject is the flag
# board, so seeding a flag state would be seeding the answer — and the world does not need one:
# `workforce.setup` is the one flag in its family that ships ON (`WorkforceFeatureFlags.DefaultOn`),
# and `workforce.module` opens for this store WITHOUT a row because `WorkforceModuleGate` falls back
# to a data probe — "does this store already have an engagement" — precisely so that turning a gate on
# cannot dark a store that is already using the module. Seeding the roster is therefore what opens the
# module, and the flag board still reads deny-closed with zero overrides, which is checked below.
#
# Rates ARE a money path (a rate is what prices a payroll-bearing hour), and every one of them is
# written by `PUT .../rates` under the manager's own bearer token — so the actor on the row is the
# person who caused it, not this script (C4). Nothing here inserts a rate, a cost or a punch in SQL.
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
# then, in another terminal, what it prints — ONE journey per RUN, with a RESET between them. NOT one
# world per journey: `test/e2e/scripts/live-world-reset.sh` images this world once and puts it back in
# about nine seconds WITHOUT replaying the migration chain, so the second journey costs a restore
# rather than the whole rebuild. The closing banner prints these lines with this world's values in them.
#
#   test/e2e/scripts/live-world-reset.sh snapshot     # once, on the world this script just seeded
#
#   E2E_API_BASE_URL=http://127.0.0.1:5951 E2E_WEB_PORT=3951 \
#       npm run test:e2e -- test/e2e/journeys/workforce-flag-lever.spec.js
#
#   test/e2e/scripts/live-world-reset.sh restore      # ~9s, no migration replay, then the next journey
#
# This script's banner USED TO SAY a live world has no reset and that each journey needs its own — it
# printed two rebuilds for a pair a nine-second restore separates. That was true when it was written
# and was repealed by `live-world-reset.sh` (337f9bf) three days later. It is corrected here rather
# than only in the new script's own header because THIS is the file an operator reads at the moment of
# decision, and a stale rule in it is read as the rule.
#
# Those two variables are enough, and that is the point: once the world is healthy this script writes
# `artifacts/world/live/<host>-<port>.json` naming the checkout it built from and the process it
# started, so the run identifies the backend from what the BUILD left behind rather than by asking
# whoever holds the port. The banner still prints E2E_API_BUILD as well — it costs nothing, it works
# when the runner is on a different machine's shell, and when the two disagree the stamp wins and the
# artifact records that it did. See test/e2e/support/world-stamp.js.
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
# The log path carries the catalog name, so two worlds standing up at once (different SQL_CONTAINER,
# different API_PORT, different DB_NAME) cannot overwrite each other's log. They did share it, and a
# second world would then have printed into the first one's file. (There is no scratch file any more:
# the store id used to come back through one from SCOPE_IDENTITY, and now comes off the wire.)
LOG="${LOG:-/tmp/okam-live-world-$DB_NAME.log}"

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

# ---- WHICH BUILD THIS WORLD IS ----------------------------------------------------------------
#
# `/health` is unauthenticated and its entire body is the word "Healthy", so it tells a journey that
# SOMETHING answered and nothing about WHAT. On 2026-08-02 two live worlds stood on this machine at
# once, out of two different api worktrees at two different commits, and both satisfied it identically
# — and every artifact either produced named the FRONTEND's commit and no API build at all.
#
# This script is the only party that knows the answer for certain: it is the one that built the world.
# So it says so, in the variable `test/e2e/support/artifact-store.js` reads first, and carries it into
# the command it prints — a journey run against this world then identifies its backend without asking
# `lsof` who holds the port, and its artifact can no longer be mistaken for one from a stale world.
#
# `+dirty` is part of the answer, not noise: a dirty tree is NOT the commit it sits on, and two dirty
# trees on one commit are not each other. The store keys artifacts by this token, so dropping it would
# let a clean and a modified build overwrite each other's record under one name.
API_HEAD="$(git -C "$OKAM_API_REPO" rev-parse HEAD 2>/dev/null || true)"
if [ -n "$API_HEAD" ]; then
    [ -z "$(git -C "$OKAM_API_REPO" status --porcelain 2>/dev/null)" ] || API_HEAD="$API_HEAD+dirty"
    API_BUILD="$(basename "$OKAM_API_REPO")@$API_HEAD"
else
    # Not a checkout. Named as such rather than left empty: `unknown` in the artifact is an answer, and
    # an unset variable would silently fall back to whatever the runner's shell happened to carry.
    API_BUILD=""
fi
export E2E_API_BUILD="$API_BUILD"

# Checked here rather than at first use: every seeding step below builds its request body with jq, and
# a missing tool should stop the run before a database is dropped, not sixty seconds into it.
command -v jq >/dev/null || die "jq is required (brew install jq)"
command -v uuidgen >/dev/null || die "uuidgen is required"

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
# The world that stamp described is now dead, whatever happens to the rest of this run. A reader would
# refuse it anyway -- the pid check is what makes a stamp worth anything -- but leaving a stamp for a
# world that no longer exists is exactly the shape of file this whole mechanism exists to not have.
node "$WEB_REPO/test/e2e/support/world-stamp.js" clear "$API_BASE" >/dev/null 2>&1 || true

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

# C1, CHECKED AGAINST THE LIVE CATALOG RATHER THAN ASSUMED FROM THE DIFF. These THREE are every table
# this script writes with a direct INSERT; everything else it creates goes through the product. If any
# of them ever gains an append-only guard, the seed below becomes a C1 violation the moment it runs --
# so it is refused HERE, by asking the database, which is the one source that cannot be out of date.
# (25 such triggers exist on this chain, four of them on Workforce tables -- WorkforceClockEvents,
# WorkforceAuditEvents, WorkforceSchedulePublications and the personnel-list pair -- so the list this
# check protects is a real neighbourhood, not a hypothetical one.)
#
# It was FIVE. `Stores` and `StoreAdmins` left the list when the store pair moved onto POST /Stores/register
# -- the list shrinks only when a table stops being INSERTed into, never because a guard was inconvenient.
SEEDED_TABLES="'WorkforceLegalEmployers','WorkforcePersons','WorkforceStaffMembers'"
GUARDED="$(sqld -Q "SET NOCOUNT ON;
    SELECT ISNULL(STRING_AGG(t.name, ','), '')
    FROM sys.triggers tr JOIN sys.tables t ON t.object_id = tr.parent_id
    WHERE tr.is_ms_shipped = 0 AND t.name IN ($SEEDED_TABLES);" | tr -d ' \r\n')"
[ -z "$GUARDED" ] || die "C1: these tables now carry a trigger and must not be seeded directly: $GUARDED"
note "C1 checked on sys.triggers: the 3 directly-seeded tables carry none"

say "4/5  Starting the API on $API_BASE"
# ---- ONE MODULE CONFIG MASTER IS SET, AND IT HAD TO BE ----------------------------------------
#
# This block used to say "No module config masters are set ... Events:Enabled and Growth:Enabled would
# change nothing here", and that was TRUE OF THE THREE JOURNEYS THAT EXISTED. All three live on the
# feature-flag board and the workforce schedule; neither surface calls a `/events` route, and the flag
# CATALOG really is composed unconditionally in Program.cs, so the board renders all 18 rows -- including
# every `Events.*` row -- with the Events module completely dark behind them. The sentence was read as
# "Events needs no config", which is a different claim and a false one.
#
# `events-enquiry-to-settlement` is the journey that found the difference. `EventsController` implements
# `IActionFilter` and short-circuits EVERY /events action -- public AND admin -- to 404 EVENTS_DISABLED
# while `IEventsModuleGate.IsEnabled` is false (Controllers/EventsController.cs:68-75), and
# `EventsModuleGate` reads `Events:Enabled` with a default of FALSE
# (Services/Events/EventsModuleGate.cs:57,66). Neither appsettings.json nor appsettings.Development.json
# declares that key at all -- Growth carries an explicit `"Enabled": false`, Events does not even have
# the field -- so on a world this script built, the walk's very first act, an anonymous
# `POST /events/inquiries`, answered 404 before any action body ran. The module was not partly there; it
# was invisible.
#
# So the switch is set here, which is exactly what the line above already told the next lane to do. Set
# as an ENVIRONMENT variable rather than by editing a checkout's appsettings: `Events__Enabled` is how
# ASP.NET spells `Events:Enabled` in the environment, and it keeps this world's configuration a property
# of the world rather than a modification of somebody's OkamAPI tree.
#
# WHAT THIS DOES NOT DO IS OPEN A STORE. The outer switch is ANDed with the store-scoped `Events.Core`
# flag for every admin route (`EventsModuleGate.IsStoreEnabledAsync`), and this world still seeds NO flag
# override -- so a store here reads deny-closed exactly as before, `/admin/events-pipeline` is still
# dark, and the journey still has to pull the lever itself. Turning the master on makes the module
# DEPLOYED; it does not make any venue's booking pipeline visible, and the probe below asserts the
# distinction rather than trusting it.
#
# Growth, Meals and Margin masters are deliberately still unset: no journey needs their routes yet, and a
# world that switched on everything would stop being able to show that a dark module is dark.
#
# Launched from THIS shell rather than from a `( … & )` subshell, and with stdin closed onto
# /dev/null. Both details were learned the hard way on the first run: from a subshell `$!` reported
# the subshell's own pid, so the "stop it with" line at the bottom named a process that was not the
# API and `kill -0` was watching the wrong thing; and with stdin inherited, the API kept the caller's
# stdout pipe open, so `live-world.sh | tail` never returned even though the script had finished.
cd "$OKAM_API_REPO"
ASPNETCORE_ENVIRONMENT=Development \
ASPNETCORE_URLS="$API_BASE" \
ConnectionStrings__WebApiDatabase="$CONN" \
Events__Enabled=true \
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

# ---- AND NOW THE WORLD SAYS SO, ON DISK -------------------------------------------------------
#
# Written HERE and not a line earlier: the stamp asserts that pid $API_PID is serving $API_BASE, and
# that is only true once the health check above has passed. It names the checkout this script built
# from and the process it started, so a journey run in ANY shell -- with no E2E_API_BUILD, no
# OKAM_API_REPO and without asking lsof who holds the port -- files an artifact naming this build.
# See test/e2e/support/world-stamp.js for why a stamp may be believed and exactly when it may not.
#
# A failure here does NOT tear the world down. The world is good; only its provenance would be
# missing, and the run command below still carries E2E_API_BUILD. Said out loud rather than swallowed,
# because the difference shows up much later as an artifact filed `-unidentified`.
if node "$WEB_REPO/test/e2e/support/world-stamp.js" \
        write "$API_BASE" "$OKAM_API_REPO" "$API_PID" "test/e2e/scripts/live-world.sh" >/dev/null 2>&1; then
    note "stamped: artifacts/world/live/127-0-0-1-$API_PORT.json names $API_BUILD (pid $API_PID)"
else
    printf '   \033[33m%s\033[0m\n' "could NOT stamp this world -- a run that forgets E2E_API_BUILD will be filed unidentified.
    Reason:  node $WEB_REPO/test/e2e/support/world-stamp.js write $API_BASE $OKAM_API_REPO $API_PID"
fi

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

# ---- THE STORE AND ITS ADMIN, THROUGH THE PRODUCT'S OWN REGISTRATION PATH -----------------------
#
# `POST /Stores/register` answers a StoreModel on success and `{"message": ...}` with a 400 on refusal,
# so BOTH are checked: the HTTP status separately from the body, because AppException is caught in the
# controller and returned as a well-formed JSON 400 that curl reports as a perfectly successful request.
http_json() { # http_json METHOD URL [BODY] -> sets HTTP_BODY, HTTP_CODE
    local method="$1" url="$2" body="${3:-}" raw
    local args=(-sS -w '\n%{http_code}' -X "$method" "$url"
                -H "Authorization: Bearer $MGR_TOKEN" -H 'Content-Type: application/json')
    [ -n "$body" ] && args+=(-d "$body")
    raw="$(curl "${args[@]}")"
    HTTP_CODE="${raw##*$'\n'}"
    HTTP_BODY="${raw%$'\n'*}"
}

# VAT is the ORGANISATION NUMBER on this model (`[Range(100000000, 999999999)]`), not a tax rate -- the
# INSERT this replaced put 15 in that column, which was a nine-digit identifier holding the number 15.
# It is the same number the legal employer below carries, so the two rows agree about who this is.
STORE_ORGNR="${STORE_ORGNR:-912345678}"
http_json POST "$API_BASE/Stores/register" "$(jq -nc \
    --arg n "$STORE_NAME" --arg ln "$STORE_NAME AS" --argjson vat "$STORE_ORGNR" \
    '{name:$n, legalName:$ln, vat:$vat, fullAddress:"Storgata 1", zipCode:"0155", city:"Oslo",
      acceptedTerms:true}')"
[ "$HTTP_CODE" = "200" ] || die "POST /Stores/register answered $HTTP_CODE: $HTTP_BODY"
STORE_ID="$(printf '%s' "$HTTP_BODY" | jq -r '.id // empty')"
[ -n "$STORE_ID" ] || die "POST /Stores/register answered 200 with no store id: $HTTP_BODY"

# The register response is where the unapproved claim above is made falsifiable. `RegisterAsync` sets
# Approved = false and no journey needs it otherwise; if that ever changes, this line is what says so.
REG_APPROVED="$(printf '%s' "$HTTP_BODY" | jq -r '.approved')"
[ "$REG_APPROVED" = "false" ] || die "registration answered approved=$REG_APPROVED. The seed's claim that
    an unapproved store is enough for these journeys was written against approved=false; re-check the
    Approved sweep in this file's header before changing this line."

# The admin row is the product's, not this script's -- so it is READ BACK rather than assumed. A
# registration made without a bearer would have created the store and NO membership (RegisterAsync only
# adds the StoreAdmin when the caller resolves to a user, and then throws UserNotFound at the very end),
# which would leave a store nobody administers and every journey bouncing to /registrer.
ADMIN_COUNT="$(sqld -Q "SET NOCOUNT ON; SELECT CAST(COUNT(*) AS varchar) FROM StoreAdmins
    WHERE StoreId = $STORE_ID AND ApplicationUserId = N'$MGR_USERID';" | tr -d ' \r\n')"
[ "$ADMIN_COUNT" = "1" ] || die "POST /Stores/register created store $STORE_ID but no StoreAdmins row for
    the manager ($ADMIN_COUNT found). Registration only writes that row when the caller is authenticated;
    check that the Authorization header reached the API."
note "store '$STORE_NAME' = StoreId $STORE_ID, registered through POST /Stores/register (unapproved), with the manager as its StoreAdmin"

# ---- THE MARKET, THROUGH THE ONLY PRODUCTION WRITER THERE IS ------------------------------------
#
# Country is not decoration anywhere in this estate: several modules resolve a legal jurisdiction from
# Stores.Country and answer a typed refusal rather than defaulting when it is blank. Workforce is the
# sharpest case: publish resolves the working-time rule pack from it, and a blank country is a typed
# 409 workforce.rule-pack-unresolved -- a world that can draft and validate a week but never publish.
#
# The currency is NOT sent. Under the market-authority law the country is the single source and
# `UpdateStoreMarketModel` has no currency field at all; NOK is derived, and asserted back below.
http_json PUT "$API_BASE/stores/$STORE_ID/market" \
    "$(jq -nc --arg tz "$TZ_ID" '{country:"NO", timeZone:$tz}')"
[ "$HTTP_CODE" = "200" ] || die "PUT /stores/$STORE_ID/market answered $HTTP_CODE: $HTTP_BODY"
MKT_COUNTRY="$(printf '%s' "$HTTP_BODY" | jq -r '.country // empty')"
MKT_CURRENCY="$(printf '%s' "$HTTP_BODY" | jq -r '.currencyCode // empty')"
MKT_ZONE="$(printf '%s' "$HTTP_BODY" | jq -r '.timeZone // empty')"
MKT_CONFIGURED="$(printf '%s' "$HTTP_BODY" | jq -r '.isConfigured')"
[ "$MKT_COUNTRY" = "NO" ] && [ "$MKT_CURRENCY" = "NOK" ] && [ "$MKT_ZONE" = "$TZ_ID" ] \
    && [ "$MKT_CONFIGURED" = "true" ] \
    || die "PUT /stores/$STORE_ID/market answered 200 but the market did not take:
    country=$MKT_COUNTRY currency=$MKT_CURRENCY zone=$MKT_ZONE configured=$MKT_CONFIGURED
    (the currency is derived from the country, never sent; a blank one means the derivation failed)"
note "market NO / $MKT_CURRENCY / $TZ_ID, set through PUT /stores/$STORE_ID/market under the manager's bearer"

# ================================================================================================
say "5b/5  The roster, employment terms and rates the two workforce journeys need"
# ================================================================================================
#
# `workforce-flag-lever` and `workforce-schedule-publish` both author a shift on the schedule grid,
# and the grid's rows ARE the roster: with no staff there is no row, so there is no `+` affordance and
# both journeys stop at a selector. `workforce-schedule-publish` additionally picks the role "Barista"
# out of a select the page fills from `GET /roles`, and reads the wage chip the SERVER priced onto the
# saved shift — which exists only when a rate resolves for that shift's scope.
#
# THREE ROWS GO IN AS SQL, and each is here because no endpoint can create it:
#
#   the legal employer   `CreateWorkforceStaffRequest` REQUIRES a `LegalEmployerId` and nothing in the
#                        API mints one. Grepped rather than assumed: no `WorkforceLegalEmployers.Add`
#                        and no `new WorkforceLegalEmployer` exists outside the test tree.
#   the manager's person + engagement
#                        `POST /staff` needs the WorkforceManager capability, and capabilities are
#                        resolved from an EXISTING engagement at this store — so the first engagement
#                        is unavoidably out of band. `WorkforceAuthorizationService` reads
#                        `CapabilityGrants` and nothing else; a PowerUser with no grant is forbidden
#                        too, so there is no elevated way round it either. It is also what opens
#                        `workforce.module` for this store through the gate's grandfather probe, with
#                        no override row.
#
# THE GRANTS ON THAT ENGAGEMENT ARE THEMSELVES AN AUTHZ WRITE, and they do NOT all have to be made
# here. The bootstrap needs exactly two bits and they are named by what they unlock:
#
#   WorkforceManager(4)    the capability `PATCH /staff/{id}` itself requires.
#   WorkforceScheduler(2)  `GET /staff/{id}` requires it, and that read is the only way to obtain the
#                          If-Match revision the PATCH will not proceed without.
#
# So the INSERT grants 6, and the product grants the rest: the PATCH below replaces the set with all
# four under the manager's own bearer, with an If-Match precondition and the module's audit delta. The
# two that move onto the product path are the ones worth moving — WorkforcePayrollApprover(8) is the
# capability that gates wage on the read side and rate writes on the write side, i.e. exactly the
# money-adjacent grant that should never appear in a database with no actor attached to it (C4).
#
# WORTH RECORDING WHILE IT IS TRUE: nothing in `UpdateStaffAsync` stops a manager patching their OWN
# engagement, so this self-escalation 6 -> 15 is a path a real manager has too. That is the product's
# behaviour, not this seed's shortcut; it is used here because it is real, and it is written down here
# because a reader should not have to discover it from a seed script.
#
# EVERYTHING ELSE IS THE REAL HTTP API, under the manager's own bearer. That is not ceremony: it is
# how the seeded world gets an actor on the rows that need one (C4), and it is how the write path gets
# to PUSH BACK. `L-WF-DEMO-PRESENCE` learned this the useful way — routing seeded punches through the
# real ingest surfaced that the ingest clocks the operator's own engagement, a fact an INSERT into the
# projection would have hidden completely.
#
# AND NO SCHEDULE. The current week is left with no revision at all, because "Opprett utkast" is the
# first thing both journeys do and a seeded draft would be seeding their answer. The read-back below
# asserts the week really is unplanned rather than trusting that nothing created one.

LEGAL_EMPLOYER_ID="$(uuidgen | tr 'A-Z' 'a-z')"
MGR_PERSON_ID="$(uuidgen | tr 'A-Z' 'a-z')"
MGR_STAFF_ID="$(uuidgen | tr 'A-Z' 'a-z')"

# CapabilityGrants 6 = WorkforceScheduler(2)|WorkforceManager(4) — the bootstrap pair, and nothing else.
# WorkforceSelf(1) and WorkforcePayrollApprover(8) are added by the PATCH below, through the product.
sqld -Q "SET NOCOUNT ON;
INSERT INTO WorkforceLegalEmployers (LegalEmployerId, OrganizationNumber, Name, EffectiveFromUtc, CreatedAtUtc)
VALUES ('$LEGAL_EMPLOYER_ID', N'912345678', N'$STORE_NAME AS', '2020-01-01T00:00:00', SYSUTCDATETIME());

INSERT INTO WorkforcePersons (WorkforcePersonId, ApplicationUserId, State, DisplayName, ContactPhone, CreatedAtUtc)
VALUES ('$MGR_PERSON_ID', N'$MGR_USERID', N'Claimed', N'Ingrid Moen', N'$MANAGER_PHONE', SYSUTCDATETIME());

INSERT INTO WorkforceStaffMembers
  (StaffMemberId, StoreId, WorkforcePersonId, LegalEmployerId, EmployerEffectiveFromUtc,
   EmploymentNumber, CapabilityGrants, ActiveFromUtc, IsActive, CreatedAtUtc)
VALUES
  ('$MGR_STAFF_ID', $STORE_ID, '$MGR_PERSON_ID', '$LEGAL_EMPLOYER_ID', '2020-01-01T00:00:00',
   N'ANS-001', 6, '2020-01-01T00:00:00', 1, SYSUTCDATETIME());" >/dev/null
note "legal employer + the manager's own engagement (bootstrap capabilities 6) — the 3 rows with no endpoint"

WF="$API_BASE/workforce/stores/$STORE_ID"

# Every mutation carries a fresh `Idempotency-Key`: the module refuses a write without one with a 400,
# deliberately, so a seed that omitted it would fail at the first POST rather than silently double-write.
api() { # api METHOD URL [BODY]
    local method="$1" url="$2" body="${3:-}"
    local args=(-sS -X "$method" "$url" -H "Authorization: Bearer $MGR_TOKEN"
                -H 'Content-Type: application/json' -H "Idempotency-Key: $(uuidgen)")
    [ -n "$body" ] && args+=(-d "$body")
    curl "${args[@]}"
}
# A problem+json body is a 200-shaped FAILURE: curl exits 0, the JSON says 409, and a seed that only
# checked curl's exit status would carry on and fail three steps later somewhere unrelated.
check() { # check JSON LABEL
    printf '%s' "$1" | jq -e 'type == "object" and (.status? // 0) >= 400' >/dev/null 2>&1 \
        && die "$2 was refused: $1"
    return 0
}

# ---- 6 -> 15, THROUGH PATCH /staff/{id} ---------------------------------------------------------
#
# The read first, because its response carries the If-Match revision (an opaque base64 rowversion; it
# is null under SQLite and non-null here, which is one more reason this world is SQL Server). The read
# ALSO proves the bootstrap engagement took: a 403 here means the two grants did not land.
MGR_DETAIL="$(curl -sS "$WF/staff/$MGR_STAFF_ID" -H "Authorization: Bearer $MGR_TOKEN")"
MGR_REVISION="$(printf '%s' "$MGR_DETAIL" | jq -r '.revision // empty')"
[ -n "$MGR_REVISION" ] || die "GET /staff/$MGR_STAFF_ID answered no revision, so the capability PATCH has
    no If-Match to send. Either the bootstrap engagement did not take (WorkforceScheduler is what this
    read requires) or the rowversion is null, which on SQL Server it never is: $MGR_DETAIL"

MGR_PATCHED="$(curl -sS -X PATCH "$WF/staff/$MGR_STAFF_ID" \
    -H "Authorization: Bearer $MGR_TOKEN" -H 'Content-Type: application/json' \
    -H "Idempotency-Key: $(uuidgen)" -H "If-Match: $MGR_REVISION" \
    -d '{"capabilities":["WorkforceSelf","WorkforceScheduler","WorkforceManager","WorkforcePayrollApprover"]}')"
check "$MGR_PATCHED" "PATCH /staff/$MGR_STAFF_ID (capabilities)"
# Read back off the RESPONSE, not off the request: a 200 that echoed the submitted set without applying
# it would be indistinguishable from a working PATCH, and the whole point of this step is that the two
# money-adjacent grants are now the server's write rather than the seed's.
MGR_CAPS="$(printf '%s' "$MGR_PATCHED" | jq -r '[.capabilities // [] | .[]] | sort | join(",")')"
[ "$MGR_CAPS" = "WorkforceManager,WorkforcePayrollApprover,WorkforceScheduler,WorkforceSelf" ] \
    || die "PATCH /staff/$MGR_STAFF_ID did not grant all four capabilities. seen: [$MGR_CAPS]"
note "capabilities 6 -> Self+Scheduler+Manager+PayrollApprover, granted by PATCH /staff under the manager's bearer"

ROLES_JSON="$(api PUT "$WF/roles" "$(jq -nc '{roles:[
  {name:"Barista",  station:"Bar",     color:"#C2703D", sortOrder:1, effectiveFromUtc:"2020-01-01T00:00:00Z"},
  {name:"Kjøkken",  station:"Kjøkken", color:"#3D7AC2", sortOrder:2, effectiveFromUtc:"2020-01-01T00:00:00Z"}]}')")"
check "$ROLES_JSON" "PUT /roles"
# The upsert answers a bare ARRAY; accepted either way rather than assumed.
ROLE_BARISTA="$(printf '%s' "$ROLES_JSON" | jq -r 'if type=="array" then .[] else .roles[] end | select(.name=="Barista") | .roleId')"
[ -n "$ROLE_BARISTA" ] || die "PUT /roles did not answer a Barista role: $ROLES_JSON"
note "roles: Barista, Kjøkken  (workforce-schedule-publish picks 'Barista' by its label)"

# Named so that a COLLEAGUE, not the manager, is the first row of the grid: `GET /staff` orders by
# display name and both journeys author into `addButtons.first()`. A world where the manager sorts
# first would still pass, but every screenshot would show the manager rostered onto their own week.
mkstaff() { # mkstaff DISPLAYNAME PHONE EMPNO
    api POST "$WF/staff" "$(jq -nc --arg n "$1" --arg p "$2" --arg e "$3" --arg le "$LEGAL_EMPLOYER_ID" \
        '{displayName:$n, contactPhone:$p, employmentNumber:$e, legalEmployerId:$le,
          capabilities:["WorkforceSelf"], activeFromUtc:"2024-01-01T00:00:00Z",
          employerEffectiveFromUtc:"2024-01-01T00:00:00Z"}')"
}
ASTRID_JSON="$(mkstaff "Astrid Vik" "+4790000101" "ANS-002")"; check "$ASTRID_JSON" "POST /staff (Astrid Vik)"
JONAS_JSON="$(mkstaff  "Jonas Lie"  "+4790000102" "ANS-003")"; check "$JONAS_JSON"  "POST /staff (Jonas Lie)"
ASTRID="$(printf '%s' "$ASTRID_JSON" | jq -r '.staffMemberId // empty')"
JONAS="$(printf '%s' "$JONAS_JSON"   | jq -r '.staffMemberId // empty')"
[ -n "$ASTRID" ] && [ -n "$JONAS" ] || die "POST /staff returned no staffMemberId"
note "staff: Astrid Vik (ANS-002), Jonas Lie (ANS-003) — created through POST /staff, not INSERTed"

for pair in "$ASTRID:$ROLE_BARISTA" "$JONAS:$ROLE_BARISTA"; do
    R="$(api PUT "$WF/staff/${pair%%:*}/roles" \
        "$(jq -nc --arg r "${pair##*:}" '{roles:[{roleId:$r, effectiveFromUtc:"2024-01-01T00:00:00Z"}]}')")"
    check "$R" "PUT /staff/${pair%%:*}/roles"
done

# Employment terms are what make a rostered person a person with a CONTRACT: the working-time rules the
# publish step evaluates are stated against contracted minutes, and a roster with none leaves those
# rules with nothing to say.
for pair in "$MGR_STAFF_ID:2250" "$ASTRID:1800" "$JONAS:1800"; do
    R="$(api PUT "$WF/staff/${pair%%:*}/employment-terms" "$(jq -nc --argjson m "${pair##*:}" \
        '{effectiveFromUtc:"2024-01-01T00:00:00Z", contractMinutesPerWeek:$m,
          employmentCategory:"Fast", payCode:"100", costCenter:"SAL"}')")"
    check "$R" "PUT /staff/${pair%%:*}/employment-terms"
done
note "employment terms for all three engagements (37.5h manager, 30h each colleague)"

# THE MONEY PATH, AND THE ONE PLACE IN THIS SCRIPT THAT TOUCHES ONE. A rate is what prices a
# payroll-bearing hour, so C4 applies in full: this is a `PUT` under the manager's bearer and the row
# the server writes names them. An INSERT here would have been a seed writing money under no actor at
# all, which is the violation the constraint exists to catch — and it would also have skipped the
# effective-dating and the currency check that make the figure meaningful.
#
# ROLE default only, no engagement override: `workforce-schedule-publish` puts its shift on the Barista
# role and reads the chip the server priced, so the role default is the scope actually under test. A
# shift authored with NO role — which is what `workforce-flag-lever` does — resolves to no rate and
# draws the honest "unpriced" chip instead of a zero. That is the product being right, not a gap.
RATE_JSON="$(api PUT "$WF/roles/$ROLE_BARISTA/rates" \
    "$(jq -nc '{effectiveFromLocalDate:"2024-01-01", hourlyRateMinor:22000, currency:"NOK"}')")"
check "$RATE_JSON" "PUT /roles/$ROLE_BARISTA/rates"
note "Barista role rate 220.00 NOK/h from 2024-01-01, written by the manager through PUT .../rates"

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

# ---- THE EVENTS MASTER IS ON, AND IT DID NOT OPEN A STORE --------------------------------------
#
# Two probes, because "Events__Enabled=true was in the launch line" is not evidence that the module is
# deployed, and a master switch that ALSO opened a venue would silently seed the answer to the journey
# that pulls the lever. Both are READ-ONLY and neither creates an event, a proposal or a flag row.
#
#   1. THE MASTER IS ON. A random token on the anonymous proposal page. While the master is off, the
#      controller's action filter short-circuits it to EVENTS_DISABLED before the action body runs;
#      with the master on, the body runs, resolves nothing, and answers EVENTS_PROPOSAL_NOT_FOUND.
#      Those two codes are the whole difference between a deployed module and a dark one, on a route
#      that needs no store, no bearer and no fixture -- which is why this is the probe rather than an
#      admin read. A GUID that resolves to a real proposal would be a lottery win; the route is
#      `{token:guid}` so a malformed one would 404 on ROUTING and prove nothing, hence uuidgen.
EV_PROBE="$(curl -sS "$API_BASE/events/proposals/$(uuidgen | tr 'A-Z' 'a-z')")"
EV_PROBE_CODE="$(printf '%s' "$EV_PROBE" | jq -r '.code // .Code // empty' 2>/dev/null)"
[ "$EV_PROBE_CODE" != "EVENTS_DISABLED" ] || die "the Events module is DARK on this world: the anonymous
    proposal route answered EVENTS_DISABLED, which is the outer config master refusing before any action
    body runs. Events__Enabled did not reach the API process. Every /events route -- public and admin --
    is 404 in this state, so events-enquiry-to-settlement cannot send its first enquiry."
[ "$EV_PROBE_CODE" = "EVENTS_PROPOSAL_NOT_FOUND" ] || die "the anonymous proposal route answered
    [$EV_PROBE_CODE], which is neither EVENTS_DISABLED (module dark) nor EVENTS_PROPOSAL_NOT_FOUND (module
    deployed, token unknown). The Events module gate is not behaving as either of its two documented
    states: $EV_PROBE"
note "Events master ON: GET /events/proposals/<random> -> EVENTS_PROPOSAL_NOT_FOUND, not EVENTS_DISABLED"

#   2. ...AND THE VENUE IS STILL DARK. The admin read ANDs the master with the store-scoped
#      `Events.Core` flag, which this world deliberately leaves at its deny-closed default. So this
#      MUST still refuse, and refuse with EVENTS_DISABLED. If turning the master on ever started
#      opening stores as well, the journey's first finding -- a guest holding a reference the venue
#      cannot see -- would quietly become unprovable, and it would fail HERE instead.
EV_ADMIN="$(curl -sS "$API_BASE/events/admin/$STORE_ID/events" -H "Authorization: Bearer $MGR_TOKEN")"
EV_ADMIN_CODE="$(printf '%s' "$EV_ADMIN" | jq -r '.code // .Code // empty' 2>/dev/null)"
[ "$EV_ADMIN_CODE" = "EVENTS_DISABLED" ] || die "store $STORE_ID's Events pipeline is NOT deny-closed:
    GET /events/admin/$STORE_ID/events answered [$EV_ADMIN_CODE] rather than EVENTS_DISABLED. This world
    seeds no Events.Core override, so the store must be dark until a journey pulls the lever itself --
    a world that answers this read has already seeded the answer: $EV_ADMIN"
note "store $STORE_ID still deny-closed: GET /events/admin/$STORE_ID/events -> EVENTS_DISABLED (Events.Core off)"

# ---- ...AND THE FOUR READS THE SCHEDULE PAGE MAKES ---------------------------------------------
#
# `init()` calls `GET /context` and refuses the whole page on a 403; `load()` then fires the range,
# staff and (on the role pivot) roles reads together. Each is made here first, so a roster that did
# not take says so in one sentence instead of as `.wf-grid__add` never becoming visible.

CTX="$(curl -sS "$WF/context" -H "Authorization: Bearer $MGR_TOKEN")"
CTX_CAPS="$(printf '%s' "$CTX" | jq -r '[.capabilities // [] | .[]] | join(",")')"
case ",$CTX_CAPS," in
    *,WorkforceScheduler,*) ;;
    *) die "GET /context does not grant WorkforceScheduler, so the schedule page would refuse itself
    with 'wf_no_capability'. capabilities seen: [$CTX_CAPS]" ;;
esac
case ",$CTX_CAPS," in
    *,WorkforcePayrollApprover,*) ;;
    # Not a nicety: the wage fields are gated on this capability on the READ side, so without it the
    # range answers no per-shift cost and the grid draws no chip at all -- indistinguishable, on
    # screen, from a shift nobody could price.
    *) die "GET /context does not grant WorkforcePayrollApprover, so no wage chip would ever render.
    capabilities seen: [$CTX_CAPS]" ;;
esac
note "GET /context -> [$CTX_CAPS], timeZone $(printf '%s' "$CTX" | jq -r '.timeZone.id // .timeZoneId // "?"')"

STAFF_COUNT="$(curl -sS "$WF/staff" -H "Authorization: Bearer $MGR_TOKEN" | jq -r 'if type=="array" then length else empty end')"
[ "${STAFF_COUNT:-0}" -ge 3 ] || die "GET /staff answered $STAFF_COUNT engagements; the grid draws one row
    per engagement and both journeys author into the first of them."
ROLE_NAMES="$(curl -sS "$WF/roles" -H "Authorization: Bearer $MGR_TOKEN" | jq -r 'if type=="array" then (map(.name)|join(",")) else empty end')"
case ",$ROLE_NAMES," in
    *,Barista,*) ;;
    *) die "GET /roles does not offer 'Barista'. workforce-schedule-publish selects that option BY ITS
    LABEL, so a renamed role fails there as a select timeout. roles seen: [$ROLE_NAMES]" ;;
esac
note "GET /staff -> $STAFF_COUNT engagements; GET /roles -> [$ROLE_NAMES]"

# THE CURRENT WEEK MUST BE UNPLANNED. Both journeys open on it and their first act is `Opprett utkast`,
# which the page offers only while the range read resolves NO revision. Computed in the store's own
# zone, the same way `utils/workforce/week-range.js` does it, because a UTC Monday is a different day
# in Oslo for two hours of the year and the whole assertion would then be about the wrong week.
WEEK_FROM="$(TZ=$TZ_ID date -v-mon +%Y-%m-%d 2>/dev/null || date -d 'last monday' +%Y-%m-%d)"
WEEK_TO="$(TZ=$TZ_ID date -j -v+7d -f %Y-%m-%d "$WEEK_FROM" +%Y-%m-%d 2>/dev/null || date -d "$WEEK_FROM + 7 day" +%Y-%m-%d)"
RANGE="$(curl -sS "$WF/schedules?from=${WEEK_FROM}T00:00:00Z&to=${WEEK_TO}T00:00:00Z&view=draft" \
    -H "Authorization: Bearer $MGR_TOKEN")"
REVISION="$(printf '%s' "$RANGE" | jq -r '.scheduleRevisionId // empty')"
[ -z "$REVISION" ] || die "the current week ($WEEK_FROM..$WEEK_TO) already carries revision $REVISION.
    Both workforce journeys begin by CREATING that draft, so a week that already has one is a world
    that answers their first question for them. Rebuild from empty:   $0"
note "the current week $WEEK_FROM..$WEEK_TO has no plan -- 'Opprett utkast' will be offered"

cat <<EOF

-------------------------------------------------------------------------------
A LIVE world is up.

    API        $API_BASE           (pid $API_PID, log $LOG)
    build      ${API_BUILD:-UNKNOWN -- $OKAM_API_REPO is not a git checkout}
    database   $DB_NAME on localhost,$SQL_PORT   ($APPLIED migrations, $TABLES tables)
    store      $STORE_ID  "$STORE_NAME"   registered through POST /Stores/register, org.nr $STORE_ORGNR
    market     NO / $MKT_CURRENCY / $TZ_ID   (PUT /stores/$STORE_ID/market; currency derived)
    published  no -- Approved is left false, which is what registration produces; see the header
    manager    ${MANAGER_PHONE#+47} / $MANAGER_CODE   (the app prefixes +47 itself)
    roster     Astrid Vik, Ingrid Moen (the manager), Jonas Lie
    roles      Barista (220.00 NOK/h from 2024-01-01), Kjøkken
    week       $WEEK_FROM..$WEEK_TO, no plan

Run ONE live journey against it:

    cd $WEB_REPO
    E2E_API_BUILD="$API_BUILD" \\
    E2E_API_BASE_URL=$API_BASE E2E_WEB_PORT=$WEB_PORT \\
        npm run test:e2e -- test/e2e/journeys/events-deposit-precondition.spec.js

THE ARTIFACT NAMES THIS BUILD WITHOUT THE E2E_API_BUILD LINE, because the world was stamped:

    artifacts/world/live/127-0-0-1-$API_PORT.json   ->  ${API_BUILD:-UNKNOWN}   (pid $API_PID)

That file is what a journey reads first, and it is refused the moment pid $API_PID is gone -- so it
can lose its answer and cannot invent a wrong one. E2E_API_BUILD is kept in the line above because it
still carries the case where the runner is somewhere this file is not; when the two disagree the
stamp wins and the artifact says which declaration it overrode. Inspect it with:

    node test/e2e/support/world-stamp.js show $API_BASE

ONE PER RUN, AND A RESET BETWEEN THEM -- NOT ONE WORLD PER JOURNEY. In fixture mode every journey gets
a fresh backend from \`POST /__fixture/reset\`; live mode has nothing of the kind INSIDE THE HARNESS, so
\`@live\` journeys selected together run in file order against this one database and inherit each
other's writes. What actually reds is the FLAG, not the week: \`workforce-schedule-publish\` leaves a
\`workforce.publication\` override behind, and \`workforce-flag-lever\` opens by asserting that badge
reads "Av". The week alone does NOT red -- once a revision is published the draft view resolves none,
so the second journey still finds "Ingen plan" and quietly authors Revisjon 2. That is worse than a
failure, not better: it passes while proving less than its own header claims.

THE ANSWER IS A RESTORE, NOT A SECOND WORLD. Take the image now, while nothing has run against it:

    SQL_CONTAINER=$SQL_CONTAINER SQL_PORT=$SQL_PORT DB_NAME=$DB_NAME API_PORT=$API_PORT \\
        test/e2e/scripts/live-world-reset.sh snapshot

and put the world back between journeys -- about nine seconds, and NOT the $APPLIED-migration replay
this script just spent:

    SQL_CONTAINER=$SQL_CONTAINER SQL_PORT=$SQL_PORT DB_NAME=$DB_NAME API_PORT=$API_PORT \\
        test/e2e/scripts/live-world-reset.sh restore

It reads the same variable names with the same defaults this script does, so anything you overrode
here you must pass there too. It refuses to image a world a journey has already used; every restore
re-checks that all $TRIGGERS append-only triggers came back ENABLED with the bodies the image carried
(C1), and that the API is serving the restored catalog, before it returns. Take the snapshot BEFORE
the first journey: afterwards there is nothing clean left to image and the chain does have to be
replayed.

(\`events-deposit-precondition\` removes the override it sets, so it leaves the world as it found it and
can run either side of a restore, or be re-run against a used one.)

\`events-enquiry-to-settlement\` IS THE OPPOSITE CASE and needs a restore AFTER it, not just before. It
is the longest walk here -- eleven writes -- and it ends having left behind a booking, a sent proposal,
an accepted version, a closed statement, and TWO flag overrides it never clears (\`Events.Core\` and
\`Events.Settlement\`, both left on). None of that reds the journey itself: it tags every subject it
searches by with a per-run token, so it can be re-run against a world it has already written to. What it
reds is any journey that comes after it expecting the deny-closed board this world seeds -- which is
every one of the other three. So:

    test/e2e/scripts/live-world-reset.sh restore     # BEFORE the next journey, not optional after this one

Artifacts land in artifacts/journeys/ with "backend": "live", this API's origin on "apiBaseUrl" and
"backendBuild" naming the build above -- and support/journey.js FAILS a live run in which the browser
never reached that origin, so the label cannot be produced without the traffic. The canonical file is
the STRONGEST run on record rather than the last one written, keyed by origin AND build, so a run
against this world cannot overwrite the record of a different one. See support/artifact-store.js.

Stop it with:   kill $API_PID
-------------------------------------------------------------------------------
EOF
