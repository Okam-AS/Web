#!/bin/zsh
# The mutation proof for L-FLAGS-JOURNEY-SWEEP.
#
# A sweep that makes journeys model flags and then proves it with a test that would pass either way
# has reproduced the defect one level up. So each half of the change is knocked out in turn and the
# run is recorded. Two mutations, because there are two ways this work could be vacuous:
#
#   A  The JOURNEY stops turning its own switch on, fixture gate intact.
#      If the journey still passes, it does not actually depend on the switch.
#
#   B  The FIXTURE stops gating, journey intact.
#      If the "venue is dark" control still passes, the control is asserting nothing — which is the
#      original defect exactly: a fixture that models no flags, and a green journey over it.
#
# Restores from a byte copy taken before each patch, so a failed run cannot leave the tree mutated.

set -u
ROOT=/Users/svendaneel/okam/Web-modules
LANE=$ROOT/lanes/L-FLAGS-JOURNEY-SWEEP
SPEC=$ROOT/test/e2e/journeys/events-runsheet-print.spec.js
FIXTURE=$ROOT/test/e2e/fixture/api-server.js
PORTS="E2E_WEB_PORT=3061 E2E_FIXTURE_PORT=4061"

run () { cd $ROOT && env E2E_WEB_PORT=3061 E2E_FIXTURE_PORT=4061 npx playwright test events-runsheet-print --reporter=list 2>&1 | grep -vE '^\[WebServer\]' ; }

cp $SPEC $LANE/.spec.orig
cp $FIXTURE $LANE/.fixture.orig

echo "================ MUTATION A: the journey does not turn its own switch on ================"
perl -0pi -e 's/      await turnOn\(page, world\.EVENTS_CORE_FLAG\);/      \/\/ MUTATION A: the flip is removed. The journey now assumes the switch is already up./' $SPEC
run | tee $LANE/mutation-a.log
cp $LANE/.spec.orig $SPEC

echo ""
echo "================ MUTATION B: the fixture models no Events.Core gate ================"
perl -0pi -e 's/    if \(!flagEffective\(eventsStoreId, world\.EVENTS_CORE_FLAG\)\) \{\n      return eventsDisabled\(res\);\n    \}/    \/\/ MUTATION B: the gate is removed. The fixture answers every store, flag or no flag./' $FIXTURE
grep -c 'MUTATION B' $FIXTURE
run | tee $LANE/mutation-b.log
cp $LANE/.fixture.orig $FIXTURE

echo ""
echo "================ RESTORED ================"
diff -q $LANE/.spec.orig $SPEC && diff -q $LANE/.fixture.orig $FIXTURE && echo "tree restored byte-for-byte"
rm -f $LANE/.spec.orig $LANE/.fixture.orig
