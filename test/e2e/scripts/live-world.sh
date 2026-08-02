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
#   the store    a `Stores` row and a `StoreAdmins` row, in SQL. These are the only two writes here
#                that do not go through the product, and they are unavoidable rather than convenient:
#                there is no admin create-store endpoint on this branch, and the Nuxt admin shell
#                redirects a user whose `adminIn` is empty to /registrer — so without the membership
#                row the manager cannot reach a single admin page. `Scripts/demo/seed-workforce-demo.sh`
#                reached the same conclusion and says so in the same words.
#
#   the roster   a legal employer, the manager's own engagement, two colleagues, a role, employment
#                terms and hourly rates — everything `/admin/workforce-schedule` has to have before a
#                week can be authored at all. THREE MORE SQL ROWS and then nothing but HTTP; see the
#                section head at step 5b for which three and why each of them has no endpoint.
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
# then, in another terminal, what it prints — ONE journey per world, for the reason the closing banner
# gives in full: a live run has no `/__fixture/reset`, and the two workforce journeys each consume the
# current week.
#
#   E2E_API_BASE_URL=http://127.0.0.1:5951 E2E_WEB_PORT=3951 \
#       npm run test:e2e -- test/e2e/journeys/workforce-flag-lever.spec.js
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
# Scratch paths carry the catalog name, so two worlds standing up at once (different SQL_CONTAINER,
# different API_PORT, different DB_NAME) cannot overwrite each other's store id or each other's log.
# They did share both, and a second world would then have printed the first one's numbers.
LOG="${LOG:-/tmp/okam-live-world-$DB_NAME.log}"
SCRATCH="/tmp/okam-live-world-$DB_NAME.tmp"

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

# C1, CHECKED AGAINST THE LIVE CATALOG RATHER THAN ASSUMED FROM THE DIFF. These five are every table
# this script writes with a direct INSERT; everything else it creates goes through the product. If any
# of them ever gains an append-only guard, the seed below becomes a C1 violation the moment it runs --
# so it is refused HERE, by asking the database, which is the one source that cannot be out of date.
# (25 such triggers exist on this chain, four of them on Workforce tables -- WorkforceClockEvents,
# WorkforceAuditEvents, WorkforceSchedulePublications and the personnel-list pair -- so the list this
# check protects is a real neighbourhood, not a hypothetical one.)
SEEDED_TABLES="'Stores','StoreAdmins','WorkforceLegalEmployers','WorkforcePersons','WorkforceStaffMembers'"
GUARDED="$(sqld -Q "SET NOCOUNT ON;
    SELECT ISNULL(STRING_AGG(t.name, ','), '')
    FROM sys.triggers tr JOIN sys.tables t ON t.object_id = tr.parent_id
    WHERE tr.is_ms_shipped = 0 AND t.name IN ($SEEDED_TABLES);" | tr -d ' \r\n')"
[ -z "$GUARDED" ] || die "C1: these tables now carry a trigger and must not be seeded directly: $GUARDED"
note "C1 checked on sys.triggers: the 5 directly-seeded tables carry none"

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
-- Stores.Country and answer a typed refusal rather than defaulting when it is blank. Workforce is the
-- sharpest case: publish resolves the working-time rule pack from it, and a blank country is a typed
-- 409 workforce.rule-pack-unresolved -- a world that can draft and validate a week but never publish.
INSERT INTO Stores (Name, Country, TimeZone, VAT, SelfCheckout, Approved, Registered)
VALUES (N'$STORE_NAME', N'NO', N'$TZ_ID', 15, 0, 1, SYSDATETIME());
SELECT CAST(SCOPE_IDENTITY() AS int);" > "$SCRATCH"
STORE_ID="$(tr -d ' \r\n' < "$SCRATCH")"
rm -f "$SCRATCH"
[ -n "$STORE_ID" ] || die "could not create the store"

sqld -Q "SET NOCOUNT ON;
INSERT INTO StoreAdmins (ApplicationUserId, StoreId) VALUES (N'$MGR_USERID', $STORE_ID);" >/dev/null
note "store '$STORE_NAME' = StoreId $STORE_ID, with the manager as its StoreAdmin"

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
#                        API mints one.
#   the manager's person + engagement
#                        `POST /staff` needs the WorkforceManager capability, and capabilities are
#                        resolved from an EXISTING engagement at this store — so the first engagement
#                        is unavoidably out of band. It is also what opens `workforce.module` for this
#                        store through the gate's grandfather probe, with no override row.
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

command -v jq >/dev/null || die "jq is required (brew install jq)"
command -v uuidgen >/dev/null || die "uuidgen is required"

LEGAL_EMPLOYER_ID="$(uuidgen | tr 'A-Z' 'a-z')"
MGR_PERSON_ID="$(uuidgen | tr 'A-Z' 'a-z')"
MGR_STAFF_ID="$(uuidgen | tr 'A-Z' 'a-z')"

# CapabilityGrants 15 = WorkforceSelf(1)|WorkforceScheduler(2)|WorkforceManager(4)|WorkforcePayrollApprover(8).
# PayrollApprover is not optional decoration here: the wage fields are gated on it on the READ side too,
# so without it the schedule range answers with no per-shift cost at all and the grid draws no wage chip
# — which looks exactly like an unpriced shift and is not.
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
   N'ANS-001', 15, '2020-01-01T00:00:00', 1, SYSUTCDATETIME());" >/dev/null
note "legal employer + the manager's own engagement (capabilities 15) — the 3 rows with no endpoint"

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
    database   $DB_NAME on localhost,$SQL_PORT   ($APPLIED migrations, $TABLES tables)
    store      $STORE_ID  "$STORE_NAME"
    manager    ${MANAGER_PHONE#+47} / $MANAGER_CODE   (the app prefixes +47 itself)
    roster     Astrid Vik, Ingrid Moen (the manager), Jonas Lie
    roles      Barista (220.00 NOK/h from 2024-01-01), Kjøkken
    week       $WEEK_FROM..$WEEK_TO, no plan

Run ONE live journey against it:

    cd $WEB_REPO
    E2E_API_BASE_URL=$API_BASE E2E_WEB_PORT=$WEB_PORT \\
        npm run test:e2e -- test/e2e/journeys/events-deposit-precondition.spec.js

ONE, and the file path is not a convenience. In fixture mode every journey gets a fresh backend from
\`POST /__fixture/reset\`; a live world has no such thing, so the journeys share one database in the
order Playwright runs them. \`workforce-flag-lever\` and \`workforce-schedule-publish\` each CONSUME the
current week -- both create the draft, both publish it -- so whichever runs second finds a week that
already has a plan and no "Opprett utkast" to press. They are not flaky together; they are
incompatible, and each needs its own world:

    test/e2e/scripts/live-world.sh   &&  npm run test:e2e -- test/e2e/journeys/workforce-flag-lever.spec.js
    test/e2e/scripts/live-world.sh   &&  npm run test:e2e -- test/e2e/journeys/workforce-schedule-publish.spec.js

(\`events-deposit-precondition\` is the exception: it removes the override it sets, so it leaves the
world as it found it and can share one with either of the others, or be re-run against a used one.)

Artifacts land in artifacts/journeys/ with "backend": "live" and this API's origin on "apiBaseUrl" --
and support/journey.js FAILS a live run in which the browser never reached that origin, so the label
cannot be produced without the traffic.

Stop it with:   kill $API_PID
-------------------------------------------------------------------------------
EOF
