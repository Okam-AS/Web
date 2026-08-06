#!/bin/zsh
# The consumer half of the mutation proof.
#
#   C-A  The FIXTURE stops gating the entry read, the dark journey intact.
#        If `meals-module-dark` still passes, its whole claim is vacuous — it would be asserting the
#        absence of a company tab on a world that offers one.
#
#   C-B  The WORLD is stood up with the gate DOWN, every journey intact.
#        This is the exit criterion asked literally: turn a gate off and see the journeys red. If a
#        funded-checkout journey still passes with `Features:Meals` dark, it never depended on the
#        gate and the modelling bought nothing.

set -u
ROOT=/Users/svendaneel/okam/Web-modules
LANE=$ROOT/lanes/L-FLAGS-JOURNEY-SWEEP
FIXTURE=$ROOT/test/e2e/fixture/consumer-api-server.js
CWORLD=$ROOT/test/e2e/fixture/consumer-world.js

run () { cd $ROOT && env E2E_CONSUMER_WEB_PORT=3071 E2E_CONSUMER_FIXTURE_PORT=4071 npx playwright test -c playwright.consumer.config.js "$1" --reporter=list 2>&1 | grep -vE '^\[WebServer\]' ; }

cp $FIXTURE $LANE/.cfixture.orig
cp $CWORLD $LANE/.cworld.orig

echo "================ MUTATION C-A: the fixture stops gating the entry read ================"
perl -0pi -e 's/  if \(method === .GET. && path === .\/v1\/meals\/me\/companies.\) \{\n    if \(!isModuleVisible\(\)\) \{ return fundingNotFound\(res\); \}/  if (method === "GET" \&\& path === "\/v1\/meals\/me\/companies") \{\n    \/\/ MUTATION C-A: the module gate is removed from the entry read./' $FIXTURE
grep -c 'MUTATION C-A' $FIXTURE
run meals-module-dark | tee $LANE/mutation-c-a.log
cp $LANE/.cfixture.orig $FIXTURE

echo ""
echo "================ MUTATION C-B: the world is stood up with Features:Meals dark ================"
perl -0pi -e 's/const MEALS_MODULE_ENABLED = true;/const MEALS_MODULE_ENABLED = false; \/\/ MUTATION C-B/' $CWORLD
grep -c 'MUTATION C-B' $CWORLD
run meals-funded-checkout | tee $LANE/mutation-c-b.log
cp $LANE/.cworld.orig $CWORLD

echo ""
echo "================ RESTORED ================"
diff -q $LANE/.cfixture.orig $FIXTURE && diff -q $LANE/.cworld.orig $CWORLD && echo "tree restored byte-for-byte"
rm -f $LANE/.cfixture.orig $LANE/.cworld.orig
