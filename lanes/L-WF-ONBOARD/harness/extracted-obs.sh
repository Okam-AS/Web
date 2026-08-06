set -euo pipefail
API_BASE=http://127.0.0.1:4312
STORE_ID=42
WF="$API_BASE/workforce/stores/$STORE_ID"
MGR_TOKEN=manager-bearer-token
WRK_TOKEN=worker-bearer-token
WORKER_PHONE=+4790000001
NORA=11111111-1111-1111-1111-111111111111
NORA_PERSON=22222222-2222-2222-2222-222222222222
MON_C=2026-08-17; SUN_C=2026-08-23; NEXTMON_C=2026-08-24
say() { printf '\n\033[1m== %s\033[0m\n' "$*"; }
die() { printf '\033[31mFAILED: %s\033[0m\n' "$*" >&2; exit 1; }
api() { # api METHOD PATH [BODY]  -- as the manager, with a fresh idempotency key
    local method="$1" path="$2" body="${3:-}"
    local args=(-sS -X "$method" "$path" -H "Authorization: Bearer $MGR_TOKEN"
                -H 'Content-Type: application/json' -H "Idempotency-Key: $(uuidgen)")
    [ -n "$body" ] && args+=(-d "$body")
    curl "${args[@]}"
}
worker_api() { # worker_api METHOD PATH [BODY]  -- as the WORKER, with a fresh idempotency key
    local method="$1" path="$2" body="${3:-}"
    local args=(-sS -X "$method" "$path" -H "Authorization: Bearer $WRK_TOKEN"
                -H 'Content-Type: application/json' -H "Idempotency-Key: $(uuidgen)")
    # --data-binary @- : the claim body carries the one-use token, and an argv-borne -d would expose it
    # to anything that can read the process table for the life of the call.
    [ -n "$body" ] && args+=(--data-binary @-)
    if [ -n "$body" ]; then printf '%s' "$body" | curl "${args[@]}"; else curl "${args[@]}"; fi
}
check() { # check JSON LABEL  -- a problem+json body is a failure, not a result
    if echo "$1" | jq -e '.status? // empty | numbers | select(. >= 400)' >/dev/null 2>&1; then
        die "$2 -> $1"
    fi
}
say "5b. Nora joins (POST staff/{id}/invitations -> POST /workforce/me/invitations/claim)"
# Nora is the worker who signs in to /admin/workforce-me, and she gets there the way a hire does: the
# manager issues a one-use invitation for her engagement and Nora claims it as herself. Nothing here
# writes WorkforcePersons -- the claim path is what sets ApplicationUserId and advances the person to
# Claimed, so a demo that reaches the worker's page has proved the join works rather than assumed it.
INVITE="$(api POST "$WF/staff/$NORA/invitations" '{}')"
# The raw token is a CREDENTIAL and is returned exactly once (the row stores only its hash), so it is
# never echoed, never written to a file, and never put on a command line. Everything that could reach
# a terminal -- including the failure paths -- goes through a copy with .token removed.
check "$(echo "$INVITE" | jq -c 'del(.token)' 2>/dev/null || echo "$INVITE")" "POST staff/$NORA/invitations"
NORA_TOKEN="$(echo "$INVITE" | jq -r '.token // empty')"
unset INVITE
[ -n "$NORA_TOKEN" ] || die "the invitation carried no token -- an idempotent REPLAY answers token=null,
    and the raw token is unrecoverable once that happens. Seed a fresh database rather than re-running."

CLAIM="$(worker_api POST "$API_BASE/workforce/me/invitations/claim" \
    "$(jq -nc --arg t "$NORA_TOKEN" '{token:$t}')")"
unset NORA_TOKEN
check "$CLAIM" "POST /workforce/me/invitations/claim"
# Assert the OUTCOME, not the 200: every refusal on this surface is one opaque 404 by design, so a
# claim that quietly bound the wrong engagement is indistinguishable from success unless it is checked.
CLAIMED_PERSON="$(echo "$CLAIM" | jq -r '.workforcePersonId // empty')"
CLAIMED_STATE="$(echo "$CLAIM" | jq -r '.personState // empty')"
[ "$CLAIMED_PERSON" = "$NORA_PERSON" ] || die "the claim bound person '$CLAIMED_PERSON', expected Nora's '$NORA_PERSON'"
[ "$CLAIMED_STATE" = "Claimed" ] || die "the claim left the person in state '$CLAIMED_STATE', expected Claimed"
echo "   Nora claimed her own engagement -> person $CLAIMED_PERSON is $CLAIMED_STATE ($WORKER_PHONE)"
say "14b. The worker's own page, read back as the WORKER"
# The point of step 5b is not that the claim returned 200 -- it is that Nora can now see her own work.
# Read both self-service surfaces with HER bearer token: a claim that bound the person but left the
# engagement invisible to her would still print "Claimed" above and be a broken join.
MEM="$(curl -sS "$API_BASE/workforce/me/staff-memberships" -H "Authorization: Bearer $WRK_TOKEN")"
check "$MEM" "GET /workforce/me/staff-memberships"
# The list answers a bare ARRAY -- accept an envelope too rather than assume the shape.
MEM_ROWS="$(echo "$MEM" | jq -c 'if type=="array" then . else (.memberships // .items // .) end')"
echo "$MEM_ROWS" | jq -e --arg sm "$NORA" 'map(select(.staffMemberId == $sm)) | length == 1' >/dev/null \
    || die "Nora's engagement ($NORA) is not on her own membership list: $MEM_ROWS"
echo "$MEM_ROWS" | jq -r '.[] | "     \(.displayName)  store=\(.storeId)  roles=\(.roleNames | join(","))  active=\(.isActive)"'

# Week C is the published week, and /me/schedule looks FORWARD at published shifts only.
SCHED="$(curl -sS "$API_BASE/workforce/me/schedule?from=${MON_C}T00:00:00Z&to=${NEXTMON_C}T00:00:00Z" \
    -H "Authorization: Bearer $WRK_TOKEN")"
check "$SCHED" "GET /workforce/me/schedule"
SCHED_N="$(echo "$SCHED" | jq -r '(.items // []) | length')"
[ "$SCHED_N" -gt 0 ] || die "the worker's schedule for week C ($MON_C..$SUN_C) is empty: $SCHED"
echo "     $SCHED_N published shift(s) visible to Nora in week C"
