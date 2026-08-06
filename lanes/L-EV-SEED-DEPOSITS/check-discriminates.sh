#!/usr/bin/env bash
#
# Proves the seed's deposit-stage check DISCRIMINATES rather than accepting any 4xx.
#
# It runs the REAL block, extracted verbatim from Scripts/demo/seed-events-demo.sh by line range, so
# a regression in the seed is a regression here. The API is stubbed: each scenario supplies the exact
# (code, body) pair the POST answers and the exact JSON the deposit LIST answers, which is the only
# pair of facts the block is allowed to reason from.
#
# The point of the lane is that the OLD check could not fail. Scenario 2 and 3 are the two worlds it
# accepted silently; both must now die.
#
# THE TRIPLES ARE MEASURED, NOT INVENTED (pass 2). EventsWireTests
# .A_deposit_row_and_its_receipt_are_committed_only_when_the_store_holds_the_deposits_flag drives the
# SAME two calls over the real pipeline against the real composition root and records what they answer:
#
#   flag absent  ->  POST 404 application/problem+json  code=EVENTS_DISABLED   GET deposits -> []
#   flag present ->  POST 500 text/plain (unhandled)    no `code` at all       GET deposits -> one row
#
# Scenarios 2 and 6 are those two worlds. The 500 is plain text because the rail throws past
# EventsDepositsController, which catches EventsProblemException alone -- which is exactly why the
# block must survive an unparseable body, and why `.code` can be trusted to name the gate when present.
#
# Usage: ./check-discriminates.sh /path/to/wt-evseeddep

set -uo pipefail

SEED="${1:?usage: check-discriminates.sh <backend-worktree>}/Scripts/demo/seed-events-demo.sh"
[ -f "$SEED" ] || { echo "no seed at $SEED" >&2; exit 2; }

BLOCK="$(mktemp)"
awk '/^DEP="\$\(api_code POST/,/^note "event \$E_DEP/' "$SEED" > "$BLOCK"
[ -s "$BLOCK" ] || { echo "could not extract the deposit block from $SEED" >&2; exit 2; }

TAB="$(printf '\t')"
PASS=0; FAIL=0

run_scenario() { # run_scenario NAME EXPECT(die|live) POST_CODE POST_BODY LIST_JSON
    local name="$1" expect="$2" post_code="$3" post_body="$4" list_json="$5"
    local out rc

    out="$(
        set -euo pipefail
        STORE_ID=1; EV="/events/admin/1/events"; E_DEP=42
        api_code() { printf '%s\t%s' "$POST_CODE" "$POST_BODY"; }
        # Routed by path: the block makes TWO reads and conflating them would let the event read
        # stand in for the deposit list, which is exactly the confusion under test.
        api() { if [ "${2%/deposits}" != "$2" ]; then printf '%s' "$LIST_JSON"; else printf '{"status":"Accepted"}'; fi; }
        say()  { :; }
        note() { printf 'NOTE %s\n' "$*"; }
        die()  { printf 'DIE %s\n' "$*"; exit 1; }
        export POST_CODE="$post_code" POST_BODY="$post_body" LIST_JSON="$list_json"
        # shellcheck disable=SC1090
        . "$BLOCK"
    2>&1)"
    rc=$?

    local got; [ "$rc" -eq 0 ] && got="live" || got="die"
    if [ "$got" = "$expect" ]; then
        PASS=$((PASS+1)); printf 'PASS  %-46s expected %-4s\n' "$name" "$expect"
    else
        FAIL=$((FAIL+1)); printf 'FAIL  %-46s expected %-4s got %s\n' "$name" "$expect" "$got"
        printf '%s\n' "$out" | sed 's/^/        /'
    fi
}

DISABLED='{"type":"https://okam.no/problems/events/EVENTS_DISABLED","status":404,"detail":"Events is not enabled for this store.","code":"EVENTS_DISABLED"}'
PROVIDER='{"message":"Could not parse the Vipps response"}'
ISSUED='{"deposit":{"status":"Pending","amountMinor":400000}}'

# 1. The world this lane exists to create: the flag is on, the provider is what failed. The intent
#    row proves the request got past the gate, so this is the accepted limit.
run_scenario "provider failed, intent committed" live \
    500 "$PROVIDER" '[{"status":"Failed","amountMinor":400000}]'

# 2. THE DEFECT. A store with no Events.Deposits row. The old check called this "expected without
#    live Vipps credentials" and carried on.
run_scenario "module refusal (missing Events.Deposits)" die \
    404 "$DISABLED" '[]'

# 3. Any other refusal that never reached the provider -- no row was written, so the credential
#    story is not available as an excuse.
run_scenario "refused before the intent was committed" die \
    409 '{"code":"EVENTS_STATE","status":409}' '[]'

# 4. A developer holding real User Secrets. Must not die.
run_scenario "deposit actually issued (200)" live \
    200 "$ISSUED" '[{"status":"Pending","amountMinor":400000}]'

# 5. The list read itself broken -- the block must refuse to judge rather than read a problem
#    document's key count as a deposit count.
run_scenario "deposit list did not answer a list" die \
    500 "$PROVIDER" '{"status":404,"code":"EVENTS_NOT_FOUND"}'

# 6. The Vipps rail throws AppException, which EventsDepositsController does not catch (it catches
#    EventsProblemException only), so in Development the body is the HTML developer exception page --
#    NOT json. The block must survive an unparseable body under `set -euo pipefail` and still judge
#    by the row.
run_scenario "non-JSON body, intent committed" live \
    500 '<!DOCTYPE html><html><body>AppException: Could not parse</body></html>' \
    '[{"status":"Failed","amountMinor":400000}]'

# 6b. The same unparseable body with NO row -- must die, not be excused.
run_scenario "non-JSON body, no intent committed" die \
    500 '<!DOCTYPE html><html><body>AppException</body></html>' '[]'

rm -f "$BLOCK"
printf '\n%d passed, %d failed\n' "$PASS" "$FAIL"
[ "$FAIL" -eq 0 ]
