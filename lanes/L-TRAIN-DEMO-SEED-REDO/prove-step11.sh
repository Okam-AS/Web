#!/usr/bin/env bash
#
# Proof driver for L-TRAIN-DEMO-SEED-REDO's step 11.
#
# The seed cannot reach step 11 on this world: it dies at step 4, because publishing a course version
# trips SQL Server error 334 on TrainingCourseVersions (an enabled trigger with no EF declaration).
# This runs the SHIPPED step-11 code anyway -- extracted verbatim BY LINE RANGE from the seed file, so
# what runs here is the byte sequence that ships, not a transcription -- against the same live API.
#
# It WRITES NOTHING. Every lever probe is refused by the deny-closed catalog before
# StoreFeatureFlagsController reaches IsStoreAdminAsync or IFeatureFlagStore.SetAsync; the
# negative-control 403 is refused before the same write; everything else is a GET. That is what makes
# it safe to point at a world this lane did not create.

SEED=/Users/svendaneel/okam/wt-traindemoseedredo/Scripts/demo/seed-training-demo.sh
COMMON=/Users/svendaneel/okam/wt-traindemoseedredo/Scripts/demo/demo-common.sh

export API_BASE="${API_BASE:-http://127.0.0.1:5971}"
export MANAGER_PHONE="${MANAGER_PHONE:-+4799681931}"
export STORE_NAME="${STORE_NAME:-Two Humans Kafé}"
# Passed in, never written down: the verification code belongs to the owner of this world, not to a
# shipped default. An apostrophe inside ${VAR:?...} unbalances the parser, so this message has none.
: "${MANAGER_CODE:?set MANAGER_CODE to the manager verification code for this world}"
export MANAGER_CODE

. "$COMMON"
eval "$(sed -n '63,74p' "$SEED")"        # TR_OUT, api_code_h, code_of, body_of, why -- the seed's own
demo_signin
TR="/training/stores/$STORE_ID"

hr() { printf '\n\033[1m--- %s\033[0m\n' "$*" >&2; }

hr "CONTROL: what this API advertises for Training"
api GET /feature-flags/catalog | jq -c '[.[] | select(.module=="Training") | .flagKey]' >&2

# ------------------------------------------------------------------------------------------------
hr "POSITIVE: seed lines 416-433 (the withheld-lever loop) -- expect exit 0"
( eval "$(sed -n '416,433p' "$SEED")" )
POS=$?
echo "  [positive lever loop] exit=$POS" >&2

hr "POSITIVE: seed lines 443-454 (context reports all seven, five off) -- expect exit 0"
( eval "$(sed -n '416,416p;443,454p' "$SEED")" )
CTX=$?
echo "  [positive context] exit=$CTX" >&2

hr "POSITIVE: seed lines 459-464 (the unrouted-path probe) -- expect exit 0"
( eval "$(sed -n '459,464p' "$SEED")" )
ROUTE=$?
echo "  [positive route] exit=$ROUTE" >&2

# ------------------------------------------------------------------------------------------------
# The same assertions (seed lines 421-432) given REAL server responses that are NOT the refusal they
# assert. Both must exit non-zero, or the step would accept any non-200 as expected.
hr "NEGATIVE A: a real 400 whose words are DIFFERENT (flagKey empty -> 'flagKey is required')"
KEY="training.onboarding"
LEVER="$(api_code_h PUT "/stores/$STORE_ID/feature-flags" '{"flagKey":"","enabled":true}')"
echo "  server said: $(code_of "$LEVER")  $(body_of "$LEVER")" >&2
( eval "$(sed -n '421,432p' "$SEED")" ) 2>/dev/null
NEG_A=$?
echo "  [negative A] exit=$NEG_A" >&2

hr "NEGATIVE B: a real non-400 (advertised key on a store this manager does not administer -> 403)"
KEY="training.onboarding"
LEVER="$(api_code_h PUT "/stores/999999/feature-flags" '{"flagKey":"training.setup","enabled":true}')"
echo "  server said: $(code_of "$LEVER")  [$(body_of "$LEVER")]" >&2
( eval "$(sed -n '421,432p' "$SEED")" ) 2>/dev/null
NEG_B=$?
echo "  [negative B] exit=$NEG_B" >&2

# ------------------------------------------------------------------------------------------------
# The context arm needs its OWN negative controls, because the version this lane inherited was
# unconditionally red: jq's `//` yields its right-hand side for false as well as null, so the
# assertion read a reported-false flag as "<absent>" and could never pass. A green arm proves nothing
# unless the same code goes red when the context is wrong, so both wrong shapes are fed to it here.
hr "NEGATIVE C: a context claiming a withheld stage is TRUE -- expect non-zero"
( eval "$(sed -n '416,416p;443,445p' "$SEED")"
  CTX_W='{"featureFlags":{"training.onboarding":true,"training.checklists":false,"training.deviations":false,"training.competency-seam":false,"training.reminders":false}}'
  eval "$(sed -n '448,453p' "$SEED")" ) 2>/dev/null
NEG_C=$?
echo "  [negative C] exit=$NEG_C" >&2

hr "NEGATIVE D: a context OMITTING a withheld stage -- expect non-zero"
( eval "$(sed -n '416,416p;443,445p' "$SEED")"
  CTX_W='{"featureFlags":{"training.checklists":false,"training.deviations":false,"training.competency-seam":false,"training.reminders":false}}'
  eval "$(sed -n '448,453p' "$SEED")" ) 2>/dev/null
NEG_D=$?
echo "  [negative D] exit=$NEG_D" >&2

# ------------------------------------------------------------------------------------------------
hr "VERDICT"
FAIL=0
[ "$NEG_C" != "0" ] || { echo "  context assertions ACCEPTED a withheld stage reported true" >&2; FAIL=1; }
[ "$NEG_D" != "0" ] || { echo "  context assertions ACCEPTED a withheld stage reported absent" >&2; FAIL=1; }
[ "$POS" = "0" ]    || { echo "  withheld-lever loop did NOT pass" >&2; FAIL=1; }
[ "$CTX" = "0" ]    || { echo "  context assertions did NOT pass" >&2; FAIL=1; }
[ "$ROUTE" = "0" ]  || { echo "  unrouted-path probe did NOT pass" >&2; FAIL=1; }
[ "$NEG_A" != "0" ] || { echo "  assertions ACCEPTED a 400 with different words" >&2; FAIL=1; }
[ "$NEG_B" != "0" ] || { echo "  assertions ACCEPTED a non-400" >&2; FAIL=1; }
if [ "$FAIL" = "0" ]; then
    echo "  PASS: step 11 succeeds only for the catalog's exact refusal, and fails for anything else." >&2
else
    echo "  FAIL" >&2
fi
exit $FAIL
