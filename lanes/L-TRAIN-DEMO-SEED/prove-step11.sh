#!/usr/bin/env bash
#
# Proof driver for L-TRAIN-DEMO-SEED.
#
# Runs the SHIPPED step-11 code -- extracted verbatim BY LINE RANGE from the seed file, so what runs
# here is the byte sequence that ships, not a transcription -- against a live API whose feature-flag
# catalog is the migrated one (training.setup + training.assignments advertised, the five inert keys
# withheld).
#
# It WRITES NOTHING. Every lever probe is refused by the catalog before StoreFeatureFlagsController
# reaches IsStoreAdminAsync or IFeatureFlagStore.SetAsync; the negative-control 403 is refused before
# the same write; everything else is a GET. That is what makes it safe to point at a world this lane
# did not create.

SEED=/Users/svendaneel/okam/OkamAPI-traindemoseed/Scripts/demo/seed-training-demo.sh
COMMON=/Users/svendaneel/okam/OkamAPI-traindemoseed/Scripts/demo/demo-common.sh

export API_BASE="${API_BASE:-http://127.0.0.1:5951}"
export STORE_ID="${STORE_ID:-1}"
export STORE_NAME="${STORE_NAME:-Live Journey Kafé}"

. "$COMMON"
eval "$(sed -n '63,74p' "$SEED")"        # TR_OUT, api_code_h, code_of, body_of, why -- the seed's own
demo_signin
TR="/training/stores/$STORE_ID"

hr() { printf '\n\033[1m--- %s\033[0m\n' "$*" >&2; }

hr "CONTROL: what this API advertises for Training"
api GET /feature-flags/catalog | jq -c '[.[] | select(.module=="Training") | .flagKey]' >&2

# ------------------------------------------------------------------------------------------------
hr "POSITIVE: seed lines 377-394 (the lever loop) -- expect exit 0"
( eval "$(sed -n '377,394p' "$SEED")" )
POS=$?
echo "  [positive] exit=$POS" >&2

# ------------------------------------------------------------------------------------------------
hr "POSITIVE: seed lines 411-416 (the unrouted-path probe) -- expect exit 0"
( eval "$(sed -n '411,416p' "$SEED")" )
ROUTE=$?
echo "  [route] exit=$ROUTE" >&2

# ------------------------------------------------------------------------------------------------
# The same assertions (seed lines 384-393) given REAL server responses that are NOT the refusal they
# assert. Both must exit non-zero, or the step would be the Events defect: any non-200 read as expected.
hr "NEGATIVE A: a real 400 whose words are DIFFERENT (flagKey empty -> 'flagKey is required')"
KEY="training.onboarding"
LEVER="$(api_code_h PUT "/stores/$STORE_ID/feature-flags" '{"flagKey":"","enabled":true}')"
echo "  server said: $(code_of "$LEVER")  $(body_of "$LEVER")" >&2
( eval "$(sed -n '384,393p' "$SEED")" ) 2>/dev/null
NEG_A=$?
echo "  [negative A] exit=$NEG_A" >&2

hr "NEGATIVE B: a real non-400 (advertised key on a store this manager does not administer -> 403)"
KEY="training.onboarding"
LEVER="$(api_code_h PUT "/stores/999999/feature-flags" '{"flagKey":"training.setup","enabled":true}')"
echo "  server said: $(code_of "$LEVER")  [$(body_of "$LEVER")]" >&2
( eval "$(sed -n '384,393p' "$SEED")" ) 2>/dev/null
NEG_B=$?
echo "  [negative B] exit=$NEG_B" >&2

# ------------------------------------------------------------------------------------------------
hr "VERDICT"
FAIL=0
[ "$POS" = "0" ]   || { echo "  positive lever loop did NOT pass" >&2; FAIL=1; }
[ "$ROUTE" = "0" ] || { echo "  unrouted-path probe did NOT pass" >&2; FAIL=1; }
[ "$NEG_A" != "0" ] || { echo "  assertions ACCEPTED a 400 with different words" >&2; FAIL=1; }
[ "$NEG_B" != "0" ] || { echo "  assertions ACCEPTED a non-400" >&2; FAIL=1; }
if [ "$FAIL" = "0" ]; then
    echo "  PASS: step 11 succeeds only for the catalog's exact refusal, and fails for anything else." >&2
else
    echo "  FAIL" >&2
fi
exit $FAIL
