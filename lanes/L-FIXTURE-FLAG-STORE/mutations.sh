#!/bin/bash
# Mutation proofs for L-FIXTURE-FLAG-STORE.
#
# A test that has never been shown to red is indistinguishable from a test that matches nothing, so
# every assertion this lane added is broken here on the FINAL file and the run is recorded. Each
# mutation is restored byte-for-byte and the restoration is verified by hash rather than by trust.
#
# The PAIRING is the point, and it is the lesson bb1bf0c wrote down: removing a journey's FLIP proves
# the gate refuses; removing the fixture's GATE proves the dark assertion is not vacuous. Without the
# second, "the venue is dark" would pass against a fixture with no gate in it at all — which is the
# exact defect this lane was sent to remove.
#
# Ports are overridden away from 4010/3010 deliberately: a foreign fixture lives on 4010 in this
# estate, `reuseExistingServer` is on outside CI, and a run that reused it would be a wrong green.
set -u

cd "$(dirname "$0")/../.." || exit 1
export E2E_FIXTURE_PORT=4111
export E2E_WEB_PORT=3111

FIXTURE=test/e2e/fixture/meals.js
SETUP=test/e2e/journeys/meals-admin-setup.spec.js
CLAIM=test/e2e/journeys/meals-guest-claim.spec.js
OUT="lanes/L-FIXTURE-FLAG-STORE"
REPORT="$OUT/mutation-report.txt"

hash_of () { shasum -a 256 "$1" | cut -d' ' -f1; }

run_mutation () {
  local name="$1" file="$2" edit="$3" spec="$4" claim="$5"
  local before after code
  before=$(hash_of "$file")
  cp "$file" "/tmp/${name}.pristine"

  MUT_FILE="$file" MUT_EDIT="$edit" python3 -c '
import os, sys
path = os.environ["MUT_FILE"]
src = open(path).read()
exec(os.environ["MUT_EDIT"])
open(path, "w").write(src)
'

  if [ "$(hash_of "$file")" = "$before" ]; then
    { echo "MUTATION $name: NOT APPLIED — the file is unchanged, so this proves nothing"; echo; } | tee -a "$REPORT"
    return 1
  fi

  npx playwright test "$spec" --reporter=list > "$OUT/mutation-$name.log" 2>&1
  code=$?

  cp "/tmp/${name}.pristine" "$file"
  after=$(hash_of "$file")

  {
    echo "MUTATION $name"
    echo "  claim     $claim"
    echo "  mutated   $file"
    echo "  ran       $spec"
    echo "  exit      $code (expected non-zero)"
    if [ $code -ne 0 ]; then echo "  verdict   RED AS REQUIRED"
    else echo "  verdict   *** GREEN — THE ASSERTION MATCHES NOTHING ***"; fi
    echo "  first red $(grep -m1 -E '✘|Error: ' "$OUT/mutation-$name.log" | sed 's/^[[:space:]]*//' | cut -c1-150)"
    if [ "$after" = "$before" ]; then echo "  restored  byte-for-byte ($after)"
    else echo "  restored  *** DIFFERS — RESTORE BY HAND ***"; fi
    echo
  } | tee -a "$REPORT"
}

: > "$REPORT"
{
  echo "Mutation proofs — L-FIXTURE-FLAG-STORE"
  echo "base commit $(git rev-parse HEAD)"
  echo "run at      $(date -u +%Y-%m-%dT%H:%M:%SZ)"
  echo
} | tee -a "$REPORT"

# 1 — the journey stops turning its own switch on, and the two assertions that would notice go with
#     it. What must red is a PRODUCT step: the corridor signing, a WRITE that a deny-closed venue
#     refuses. That is the defect in its original shape.
run_mutation "no-flip" "$SETUP" '
src = src.replace("      await turnOn(page, STORE_MODULE);", "      // MUTANT: the flip removed")
src = src.replace("      await expect(page.locator(\x27.meals-picker .mls-note--warn\x27)).toHaveCount(0);", "      // MUTANT: the after-check removed")
' "$SETUP" "the per-store meals.module gate really refuses this venue's writes"

# 2 — the fixture stops gating the venue directory. The dark-venue control must then red: without
#     this half, mutation 1 passing would be indistinguishable from a fixture with no gate at all.
run_mutation "no-store-gate" "$FIXTURE" '
src = src.replace("    if (!ctx.flagEffective(decodeURIComponent(directory[1]), STORE_MODULE_FLAG)) { return darkStore(ctx); }", "    // MUTANT: the per-store gate removed")
' "$SETUP" "the dark-venue assertion is not vacuous"

# 3 — the fixture stops gating on host config. The dark-deployment step must then red, and this is
#     also the ORDERING proof: the step pastes a code the fixture HOLDS, so a gate that ran after the
#     token lookup would answer for it and the step would fail exactly as it does here.
run_mutation "no-config-gate" "$FIXTURE" '
src = src.replace("  if (!state.moduleConfigEnabled && path.indexOf(\x27/v1/meals/\x27) === 0) {", "  if (false && path.indexOf(\x27/v1/meals/\x27) === 0) {")
' "$CLAIM" "Features:Meals is really enforced on the invitee routes, ahead of the token lookup"

# 4 — the reset stops honouring `mealsModule`, so the world stands up BRIGHT while the journey asked
#     for it dark. The echo assertion must catch that before a single page assertion runs. This is
#     the "wrong world, still green" hazard in miniature: without the echo, a typo in the query
#     string would leave every later assertion pointed at a working module.
run_mutation "reset-ignores-param" "test/e2e/fixture/api-server.js" '
src = src.replace("    state = freshState({ meals: { module: asBool(\x27mealsModule\x27) } });", "    state = freshState();")
' "$CLAIM" "the journey verifies it got the world it asked for"

echo "---- report ----"
cat "$REPORT"
