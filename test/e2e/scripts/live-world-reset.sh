#!/usr/bin/env bash
#
# Resets a LIVE world to the state `live-world.sh` left it in, WITHOUT replaying the migration chain.
#
#   live-world-reset.sh snapshot    take the image, once, right after the world is seeded
#   live-world-reset.sh restore     put the world back, between journeys      (~4s, not ~60s)
#   live-world-reset.sh verify      assert the state a journey needs is actually there
#   live-world-reset.sh forget      delete the image
#
# ---- WHY THIS EXISTS ---------------------------------------------------------------------------
#
# `live-world.sh` closes with the rule that a live world hosts ONE journey. That rule was correct
# documentation of the shape at the time and it is expensive: `workforce-flag-lever` and
# `workforce-schedule-publish` each begin by needing the current week UNPLANNED and each end having
# created and published it, and one of them also leaves a `workforce.publication` override behind. So
# whichever runs second fails — on the missing "Opprett utkast", or on a flag badge that reads "På"
# before anybody flipped it. Neither failure is about the product. Rebuilding between them costs a
# migration replay each time (measured: 60s on this host, 127 migrations from empty), which is the
# cost that decides whether eleven live journeys are affordable.
#
# The replay is not the price of a CLEAN world. It is the price of proving the chain still replays
# from empty, and that is a property of the branch, not of the journey: it needs proving once per
# session. This script separates the two.
#
# ---- WHY RESTORE AND NOT PARAMETERISATION ------------------------------------------------------
#
# There were two shapes available and they are not equivalent.
#
#   PARAMETERISATION would give each journey its own week (or its own store) and let them accumulate
#   in one world without colliding. It is cheaper still — no SQL operation at all between journeys —
#   and it is the right answer for journeys that merely need somewhere of their own to write.
#   It does not solve THIS collision. `workforce-schedule-publish` does not need *a* week with no
#   plan; it needs THE CURRENT WEEK to have no plan, because the page opens on the current week and
#   the journey's first assertion is the `wf_state_none` badge. Two journeys that must both start
#   from an unplanned current week cannot be separated by a parameter, because the parameter they
#   would have to vary is the one thing the page fixes for them. Handing the spec a week offset would
#   also change what the journey proves: a manager plans this week, and a journey that plans a week
#   in September is evidence about a different act. The store is the same story one level up —
#   varying it means a second seeded roster, a second rate, a second membership row, i.e. rebuilding
#   most of the world anyway, per journey, to avoid a four-second operation.
#
#   RESTORE resets everything and is indifferent to what a journey did, which is exactly the property
#   the harder journeys need — the ones still to come discover ids and write through several tables,
#   and a per-journey parameter for each of those is a per-journey seed in disguise.
#
# So: restore here, and parameterisation stays available and unspent for the id-discovery group,
# where journeys need room rather than a clean slate. What restore costs that parameterisation does
# not: about four seconds per journey, one 10 MB file inside the SQL container, and the discipline
# below that the image is only ever taken from a world nobody has run a journey against yet.
#
# ---- A RESTORE IS NOT AN UNPICK ----------------------------------------------------------------
#
# C1 says append-only tables are never backfilled, repaired in place or purged, and 25 deny-triggers
# on this chain make that checkable rather than promised. A restore must not become the way around
# them, so the distinction is worth stating precisely:
#
#   * It is not row surgery. There is no UPDATE and no DELETE anywhere in this file, against a
#     guarded table or any other. The catalog is replaced WHOLE, from an image of a point in time, by
#     the engine — the same operation a DBA performs on any database and the same one that runs in a
#     disaster recovery. Nothing here can remove one journal row and leave its neighbours, which is
#     the act C1 exists to forbid.
#   * The guards come back WITH it. `verify` fingerprints every non-shipped trigger — name, parent
#     table, disabled state and full definition, hashed — and refuses a restored world whose
#     fingerprint differs from the image's, or in which any trigger is disabled. A restore that
#     dropped a trigger, or a world somebody quietly disabled one in, reds here. That check is the
#     reason this file can claim it does not defeat the schema instead of asserting it.
#   * The image is only ever taken from a PRISTINE world. `snapshot` refuses a world that already
#     carries a schedule revision or a flag override, so the file on disk cannot become a way to
#     rewind a world somebody has written a real answer into.
#
# What it genuinely does undo is a test journey's writes on a throwaway localhost catalog whose only
# purpose is to be run against. It refuses to run anywhere else — see the guard below, which is
# checked on the resolved target rather than on an intention.
#
# ---- C7 ----------------------------------------------------------------------------------------
#
# A database backup carries whatever the database carried, and this one carries hashed credentials
# and bearer-adjacent material. So the image NEVER leaves the SQL container: the only path this
# script will write to is under /var/opt/mssql/, it is refused otherwise, and nothing in the repo
# tree is ever produced. Do not `docker cp` it out, and do not commit it if you do.
#
# ---- USAGE -------------------------------------------------------------------------------------
#
#   OKAM_API_REPO=... SQL_CONTAINER=my-sql SQL_PORT=15433 test/e2e/scripts/live-world.sh
#   SQL_CONTAINER=my-sql SQL_PORT=15433 API_PORT=5951 test/e2e/scripts/live-world-reset.sh snapshot
#
#   E2E_API_BASE_URL=http://127.0.0.1:5951 E2E_WEB_PORT=3951 \
#       npm run test:e2e -- test/e2e/journeys/workforce-flag-lever.spec.js
#
#   SQL_CONTAINER=my-sql SQL_PORT=15433 API_PORT=5951 test/e2e/scripts/live-world-reset.sh restore
#
#   E2E_API_BASE_URL=http://127.0.0.1:5951 E2E_WEB_PORT=3951 \
#       npm run test:e2e -- test/e2e/journeys/workforce-schedule-publish.spec.js
#
# The API process is NOT restarted between journeys and does not need to be: a restore kills its
# pooled connections, SqlClient notices the dead sockets and opens new ones, and `verify` proves the
# API is serving from the restored catalog before it returns. That was measured, not assumed — the
# first authenticated read after a restore succeeded on its first attempt, and `verify` reports the
# attempt count so a regression shows up as a number rather than as a slow journey.

set -euo pipefail

SQL_CONTAINER="${SQL_CONTAINER:-okam-lws-sql}"
SQL_PORT="${SQL_PORT:-15433}"
SQL_SA_PASSWORD="${SQL_SA_PASSWORD:-Velkommen123!}"
DB_NAME="${DB_NAME:-OkamLiveJourney}"
API_PORT="${API_PORT:-5951}"
MANAGER_PHONE="${MANAGER_PHONE:-+4799999999}"
MANAGER_CODE="${MANAGER_CODE:-123123}"
STORE_NAME="${STORE_NAME:-Live Journey Kafé}"
TZ_ID="${TZ_ID:-Europe/Oslo}"

API_BASE="http://127.0.0.1:$API_PORT"
CONN="Server=localhost,${SQL_PORT};Database=${DB_NAME}"

# The image and its manifest live INSIDE the container, beside the catalog they describe. Not on the
# host: a host path is a path two lanes can pick the same spelling of, and this one would carry
# credential-bearing pages if they did. Keyed by catalog name, so two worlds on one server keep their
# own images.
SNAPSHOT_DIR="/var/opt/mssql/backup"
SNAPSHOT="$SNAPSHOT_DIR/$DB_NAME.livesnapshot.bak"
MANIFEST="$SNAPSHOT_DIR/$DB_NAME.livesnapshot.manifest"

say()  { printf '\n\033[1m== %s\033[0m\n' "$*"; }
note() { printf '   %s\n' "$*"; }
die()  { printf '\033[31mFAILED: %s\033[0m\n' "$*" >&2; exit 1; }

# -----------------------------------------------------------------------------------------------
# THE ABSOLUTE RULE, same shape as live-world.sh and checked on the RESOLVED target rather than on a
# variable somebody meant to set. A restore is a destructive operation on a whole catalog; there is
# no version of it that is acceptable against a deployed database.
# -----------------------------------------------------------------------------------------------
case "$CONN" in
    *"Server=localhost,"*|*"Server=127.0.0.1,"*) ;;
    *) die "target is not localhost -- refusing: $CONN" ;;
esac
case "$CONN$DB_NAME" in
    *database.windows.net*|*okam.prod*|*okamtest*|*Prod*|*PROD*)
        die "the target looks like a DEPLOYED database. Stop.  ($CONN)" ;;
esac
case "$SNAPSHOT" in
    /var/opt/mssql/*) ;;
    *) die "C7: the image path must stay inside the SQL container (/var/opt/mssql/...), got $SNAPSHOT" ;;
esac

docker ps --format '{{.Names}}' | grep -qx "$SQL_CONTAINER" \
    || die "SQL container '$SQL_CONTAINER' is not running. This script never starts one and never
    stops one: it operates on the catalog of a world that is already up."

sqlm() { docker exec -i "$SQL_CONTAINER" /opt/mssql-tools18/bin/sqlcmd \
            -S localhost -U sa -P "$SQL_SA_PASSWORD" -C -b -I -h -1 -W "$@"; }
sqld() { sqlm -d "$DB_NAME" "$@"; }
scalar() { sqld -Q "SET NOCOUNT ON; $1" | tr -d ' \r\n'; }

sqlm -Q "SET NOCOUNT ON; SELECT 1;" >/dev/null 2>&1 \
    || die "cannot reach SQL Server in container '$SQL_CONTAINER'"
[ "$(sqlm -Q "SET NOCOUNT ON; SELECT CAST(CASE WHEN DB_ID('$DB_NAME') IS NULL THEN 0 ELSE 1 END AS varchar);" | tr -d ' \r\n')" = "1" ] \
    || die "there is no catalog [$DB_NAME] on $SQL_CONTAINER. Stand a world up first:
    OKAM_API_REPO=<path> SQL_CONTAINER=$SQL_CONTAINER SQL_PORT=$SQL_PORT DB_NAME=$DB_NAME test/e2e/scripts/live-world.sh"

# ---- WHAT THE CATALOG IS, AS FOUR NUMBERS AND A HASH -------------------------------------------
#
# The hash is over every non-shipped trigger's name, parent table, disabled state and full body. It
# is the one check in this file that makes "a restore is not an unpick" checkable: a restored world
# whose guards differ from the image's in ANY of those four ways reds, and so does one where somebody
# disabled a trigger while the world was up. Ordered and XML-concatenated so the hash is stable.
trigger_fingerprint() {
    scalar "SELECT LOWER(CONVERT(varchar(64), HASHBYTES('SHA2_256',
        (SELECT t.name + '|' + OBJECT_NAME(t.parent_id) + '|' + CAST(t.is_disabled AS varchar) + '|'
                + ISNULL(OBJECT_DEFINITION(t.object_id), '')
         FROM sys.triggers t WHERE t.is_ms_shipped = 0
         ORDER BY t.name FOR XML PATH(''))), 2));"
}
migration_count()  { scalar "SELECT CAST(COUNT(*) AS varchar) FROM __EFMigrationsHistory;"; }
table_count()      { scalar "SELECT CAST(COUNT(*) AS varchar) FROM sys.tables;"; }
trigger_count()    { scalar "SELECT CAST(COUNT(*) AS varchar) FROM sys.triggers WHERE is_ms_shipped = 0;"; }
disabled_triggers(){ scalar "SELECT CAST(COUNT(*) AS varchar) FROM sys.triggers WHERE is_ms_shipped = 0 AND is_disabled = 1;"; }
store_id()         { scalar "SELECT ISNULL(CAST((SELECT TOP 1 StoreId FROM Stores WHERE Name = N'$STORE_NAME') AS varchar), '');"; }
staff_count()      { scalar "SELECT CAST(COUNT(*) AS varchar) FROM WorkforceStaffMembers;"; }
revision_count()   { scalar "SELECT CAST(COUNT(*) AS varchar) FROM WorkforceScheduleRevisions;"; }
publication_count(){ scalar "SELECT CAST(COUNT(*) AS varchar) FROM WorkforceSchedulePublications;"; }
override_count()   { scalar "SELECT CAST(COUNT(*) AS varchar) FROM StoreFeatureFlags;"; }

# ---- THE STATE A JOURNEY NEEDS, NAMED ----------------------------------------------------------
#
# "The command exited zero" is not evidence that a world reset. These are the four facts the two
# workforce journeys actually consume, each of which is false in a world one of them has run in:
#
#   no schedule revision   both press "Opprett utkast" first, which the page offers only while the
#                          range read resolves no revision. Either journey leaves one behind.
#   no publication         a published week is terminal server-side.
#   no flag override       `workforce-flag-lever` asserts `workforce.publication` reads "Av" before
#                          anybody flips it, and `workforce-schedule-publish` turns it on and never
#                          clears it, so it leaves exactly the row that reds the other journey.
#   the roster is back     three engagements, or the grid draws no row and there is no `+` to click.
#
# Called by `restore`, and runnable on its own — which is how it was falsified: run against a world a
# journey had just finished in, it reds on the first three.
pristine_or_die() { # pristine_or_die WHEN
    local when="$1" revisions publications overrides staff store
    revisions="$(revision_count)"; publications="$(publication_count)"
    overrides="$(override_count)"; staff="$(staff_count)"; store="$(store_id)"
    [ "$revisions" = "0" ] || die "$when: the world carries $revisions schedule revision(s). Both workforce
    journeys begin by needing the current week UNPLANNED, so this world answers their first question
    for them."
    [ "$publications" = "0" ] || die "$when: the world carries $publications schedule publication(s) -- a week
    somebody already published."
    [ "$overrides" = "0" ] || die "$when: the world carries $overrides feature-flag override(s). workforce-flag-lever
    asserts workforce.publication reads 'Av' before it flips anything; an override left by a previous
    journey makes that assertion fail for a reason that is not the product's."
    [ "${staff:-0}" -ge 3 ] || die "$when: only ${staff:-0} engagement(s) on the roster; the schedule grid draws
    one row per engagement and both journeys author into the first of them."
    [ -n "$store" ] || die "$when: no store named '$STORE_NAME' in [$DB_NAME]."
    note "$when: 0 revisions, 0 publications, 0 flag overrides, $staff engagements, store $store"
}

write_manifest() {
    # One line per fact, written into the container beside the image. `restore` compares against it,
    # so a restore that produced a DIFFERENT catalog -- an older image, a hand-edited one, the wrong
    # database -- is caught by a number rather than discovered by a journey.
    local body
    body="db=$DB_NAME
migrations=$(migration_count)
tables=$(table_count)
triggers=$(trigger_count)
trigger_sha=$(trigger_fingerprint)
store=$(store_id)
staff=$(staff_count)
takenAtUtc=$(date -u +%Y-%m-%dT%H:%M:%SZ)"
    printf '%s\n' "$body" | docker exec -i "$SQL_CONTAINER" sh -c "cat > '$MANIFEST'"
}
manifest_value() { # manifest_value KEY
    docker exec -i "$SQL_CONTAINER" sh -c "cat '$MANIFEST' 2>/dev/null" \
        | sed -n "s/^$1=//p" | head -1 | tr -d '\r'
}
have_snapshot() { docker exec -i "$SQL_CONTAINER" sh -c "[ -f '$SNAPSHOT' ] && [ -f '$MANIFEST' ]"; }

# ---- THE WIRE CHECK ----------------------------------------------------------------------------
#
# SQL says the rows are back; only the API says the world is SERVABLE again. A restore kills every
# pooled connection the API holds, so this is where a pool that did not recover would show up -- as
# an attempt count, not as a mysterious journey timeout ninety seconds later.
#
# RETRIED AS A WHOLE, and the reason is a measured fact rather than defensiveness. While the catalog
# is in SINGLE_USER for the restore, every connection the API opens to it is refused with SQL error
# 18456 -- 19 of them in the run that established this -- and the pool keeps handing out the dead ones
# for a moment after MULTI_USER lands. So a reset is a two-to-four second OUTAGE of that catalog, not
# an instantaneous swap. That is harmless (no journey is running during a reset) as long as the check
# that says "the world is back" waits for the whole sequence to succeed together. A first call that
# happens to work followed by a second that does not is exactly what a per-call check reports as a
# broken world; it is a recovering pool.
api_ready_or_die() {
    local attempt token admin_in staff_seen revision from to store why
    from="$(TZ=$TZ_ID date -v-mon +%Y-%m-%d 2>/dev/null || date -d 'last monday' +%Y-%m-%d)"
    to="$(TZ=$TZ_ID date -j -v+7d -f %Y-%m-%d "$from" +%Y-%m-%d 2>/dev/null || date -d "$from + 7 day" +%Y-%m-%d)"
    store="$(store_id)"
    why=""
    for attempt in 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15; do
        why=""
        token="$(curl -sS -m 20 -X POST "$API_BASE/User/login" -H 'Content-Type: application/json' \
                    -d "{\"phoneNumber\":\"$MANAGER_PHONE\",\"token\":\"$MANAGER_CODE\"}" 2>/dev/null \
                 | jq -r '.token // empty' 2>/dev/null)" || true
        if [ -z "$token" ]; then why="the manager could not sign in"; sleep 1; continue; fi

        # The three reads the browser makes on the way in, so a world that is back in SQL but not
        # visible THROUGH THE PRODUCT fails here with a sentence rather than as a selector timeout.
        admin_in="$(curl -sS -m 20 -X POST "$API_BASE/User/login" -H 'Content-Type: application/json' \
            -d "{\"phoneNumber\":\"$MANAGER_PHONE\",\"token\":\"$MANAGER_CODE\"}" 2>/dev/null \
            | jq -r --arg id "$store" '[.adminIn // [] | .[] | select((.id|tostring) == $id)] | length' 2>/dev/null)" || true
        if [ "$admin_in" != "1" ]; then
            why="the manager's adminIn does not carry store $store, so the admin shell would send every page to /registrer"
            sleep 1; continue
        fi

        staff_seen="$(curl -sS -m 20 "$API_BASE/workforce/stores/$store/staff" \
            -H "Authorization: Bearer $token" 2>/dev/null | jq -r 'if type=="array" then length else 0 end' 2>/dev/null)" || true
        if [ "${staff_seen:-0}" -lt 3 ]; then
            why="GET /staff answers ${staff_seen:-0} engagements and the grid draws one row per engagement"
            sleep 1; continue
        fi

        # THE ONE THAT IS NOT ABOUT THE POOL. A revision here means the reset did not take, and no
        # amount of retrying will change it -- so it fails immediately instead of spending 15 attempts
        # on a world that is genuinely still used.
        revision="$(curl -sS -m 20 "$API_BASE/workforce/stores/$store/schedules?from=${from}T00:00:00Z&to=${to}T00:00:00Z&view=draft" \
            -H "Authorization: Bearer $token" 2>/dev/null | jq -r '.scheduleRevisionId // empty' 2>/dev/null)" || true
        [ -z "$revision" ] || die "the current week ($from..$to) still resolves revision $revision over the
    wire. The catalog says there is none, so the reset did not take or the API is serving a stale read."
        why=""
        break
    done
    [ -z "$why" ] || die "after the reset the API at $API_BASE never served a whole world in 15 attempts.
    Last failure: $why.
    A restore is a brief outage of the catalog (SQL 18456 while it is SINGLE_USER) and the pool
    normally recovers within a request or two; fifteen means something else. The migration chain does
    NOT need replaying -- the catalog is restored -- so restart the API rather than the world."
    [ "$attempt" = "1" ] || note "note: the API served a whole world on attempt $attempt (pool recovering after the outage)"
    note "over the wire: adminIn carries store $store, $staff_seen engagements, week $from..$to has no plan"
}

COMMAND="${1:-}"
case "$COMMAND" in

snapshot)
    say "Taking the image of [$DB_NAME] on $SQL_CONTAINER"
    # REFUSED unless the world is untouched. An image taken from a used world would restore a world
    # that still fails the journeys -- and, worse, would make this file a way to rewind a world
    # somebody had written a real answer into.
    pristine_or_die "before the image is taken"
    docker exec -i "$SQL_CONTAINER" sh -c "mkdir -p '$SNAPSHOT_DIR'" 2>/dev/null || true
    sqlm -Q "BACKUP DATABASE [$DB_NAME] TO DISK = N'$SNAPSHOT' WITH INIT, FORMAT, COPY_ONLY,
             NAME = N'live world $DB_NAME', STATS = 100;" | tail -2
    write_manifest
    note "image: $SNAPSHOT (inside $SQL_CONTAINER, never on the host -- C7)"
    note "catalog: $(manifest_value migrations) migrations, $(manifest_value tables) tables, $(manifest_value triggers) append-only triggers"
    note "trigger fingerprint: $(manifest_value trigger_sha)"
    cat <<EOF

Now run a journey, reset, and run the next one -- no rebuild in between:

    SQL_CONTAINER=$SQL_CONTAINER SQL_PORT=$SQL_PORT DB_NAME=$DB_NAME API_PORT=$API_PORT \\
        test/e2e/scripts/live-world-reset.sh restore
EOF
    ;;

restore)
    have_snapshot || die "no image for [$DB_NAME]. Take one from a freshly-seeded world first:
    $0 snapshot"
    [ "$(manifest_value db)" = "$DB_NAME" ] \
        || die "the image on this server was taken from [$(manifest_value db)], not [$DB_NAME]."
    say "Restoring [$DB_NAME] to the image taken at $(manifest_value takenAtUtc)"
    # ONE sqlcmd SESSION, and that is the whole trick. SINGLE_USER reserves the catalog for the
    # session that asked for it, so the API -- which reconnects the instant its connections are
    # killed -- cannot take the slot back between the ALTER and the RESTORE. Split across two
    # invocations this deadlocks or fails intermittently, which reads like a flaky restore.
    sqlm -Q "
        ALTER DATABASE [$DB_NAME] SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
        RESTORE DATABASE [$DB_NAME] FROM DISK = N'$SNAPSHOT' WITH REPLACE, RECOVERY;
        ALTER DATABASE [$DB_NAME] SET MULTI_USER;" | tail -2
    exec "$0" verify
    ;;

verify)
    have_snapshot || die "no image for [$DB_NAME] to verify against: $0 snapshot"
    say "Verifying [$DB_NAME] is the world a journey needs"

    # 1. THE SAME CATALOG. Not "a database exists": the same number of migrations and tables the
    #    image was taken from. A restore from an older image, or against the wrong catalog, reds.
    for pair in "migrations:$(migration_count)" "tables:$(table_count)" "triggers:$(trigger_count)"; do
        key="${pair%%:*}"; got="${pair##*:}"; want="$(manifest_value "$key")"
        [ "$got" = "$want" ] || die "$key: the world has $got, the image had $want."
    done
    note "catalog: $(migration_count) migrations, $(table_count) tables, $(trigger_count) triggers -- as imaged"

    # 2. C1: THE GUARDS CAME BACK, AND CAME BACK ENABLED. This is what makes the restore something
    #    other than a way around the append-only schema. The fingerprint covers every trigger's body,
    #    so a world whose guard was replaced by a permissive one with the same name reds too.
    got_sha="$(trigger_fingerprint)"; want_sha="$(manifest_value trigger_sha)"
    [ "$got_sha" = "$want_sha" ] || die "C1: the append-only triggers are NOT the ones the image carried.
    fingerprint now $got_sha, imaged $want_sha. A restore that changes the guards is not a restore."
    [ "$(disabled_triggers)" = "0" ] || die "C1: $(disabled_triggers) append-only trigger(s) are DISABLED."
    note "C1: all $(trigger_count) append-only triggers back, enabled, bodies identical to the image"

    # 3. THE STATE THE JOURNEYS CONSUME.
    pristine_or_die "after the reset"

    # 4. ...AND THE PRODUCT CAN SEE IT.
    api_ready_or_die

    say "[$DB_NAME] is back to the seeded world. Run the next journey."
    ;;

forget)
    docker exec -i "$SQL_CONTAINER" sh -c "rm -f '$SNAPSHOT' '$MANIFEST'"
    note "image for [$DB_NAME] deleted from $SQL_CONTAINER"
    ;;

*)
    die "usage: $0 {snapshot|restore|verify|forget}
    snapshot   take the image of a freshly-seeded world (refuses a used one)
    restore    put the world back, then verify it       (~4s; no migration replay)
    verify     assert the state a journey needs is there, in SQL and over the wire
    forget     delete the image"
    ;;
esac
