#!/bin/zsh
# L-FLAGS-RESOLVERS-COVER-THREE — prove the red, one resolver registration at a time.
# Run from anywhere. Never touches a container, never pushes, never commits.
set -u
WT=/Users/svendaneel/okam/OkamAPI-flagscover
LANE=/Users/svendaneel/okam/Web-modules/docs/plan/lanes/L-FLAGS-RESOLVERS-COVER-THREE
FILTER='Database!=SqlServer&(FullyQualifiedName~FlagEffectiveResolverWireTests|FullyQualifiedName~GrowthFeatureFlagEffectiveTests|FullyQualifiedName~MealsFeatureFlagEffectiveTests|FullyQualifiedName~EventsFeatureFlagEffectiveTests)'

run () {
  name=$1
  cd "$WT" || exit 1
  dotnet test WebApi.Tests/WebApi.Tests.csproj --filter "$FILTER" > "$LANE/mut-$name.log" 2>&1
  code=$?
  echo "======== $name (exit $code)"
  grep -E '^(Passed!|Failed!)' "$LANE/mut-$name.log" | tail -2
  grep -E '^\s+(Failed|X) WebApi\.Tests' "$LANE/mut-$name.log" | sed 's/\[.*//' | sort -u
  echo
}

# RESTORE FROM A SNAPSHOT, NEVER FROM GIT.
#
# This used to be `git checkout -- Program.cs`, which reverts to HEAD. That is a restore only while
# Program.cs is unmodified relative to HEAD; against uncommitted work it DELETES the edits and calls
# it a restore. The sibling JS runner had the identical defect and it fired once on a live lane, so
# the pattern is removed here too rather than left for the next person to copy.
#
# The snapshot is taken AFTER the detach below, so it is the pinned commit's Program.cs — the same
# content the old `git checkout` was reaching for, but read from disk rather than re-derived from
# git on every call, and therefore correct even if the worktree is dirty or moves.
#
# The `cmp` is not belt-and-braces. When the JS runner's restore silently did the wrong thing, its
# equivalent byte-check was the only thing that noticed and halted; without it the run would have
# continued over a corrupted file and the loss would have surfaced hours later, if at all.
cd "$WT" || exit 1
git checkout --detach 107ca70e >/dev/null 2>&1 || exit 1
git rev-parse HEAD

PRISTINE=$(mktemp -t flagscover-program) || exit 1
cp "$WT/Program.cs" "$PRISTINE" || exit 1
trap 'rm -f "$PRISTINE"' EXIT

restore () {
  cp "$PRISTINE" "$WT/Program.cs" || { echo "RESTORE FAILED: could not write Program.cs"; exit 1; }
  cmp -s "$PRISTINE" "$WT/Program.cs" || { echo "RESTORE FAILED: Program.cs does not match the snapshot — STOP"; exit 1; }
}

restore
run control

restore
python3 "$LANE/mutate.py" "$WT/Program.cs" "WebApi.Services.Growth.GrowthModuleFlagEffectiveResolver" && run MG-growth-unregistered

restore
python3 "$LANE/mutate.py" "$WT/Program.cs" "WebApi.Services.Meals.MealsModuleFlagEffectiveResolver" && run MM-meals-unregistered

restore
python3 "$LANE/mutate.py" "$WT/Program.cs" "WebApi.Services.Events.EventsModuleFlagEffectiveResolver" && run ME-events-unregistered

restore
python3 "$LANE/mutate.py" "$WT/Program.cs" \
  "WebApi.Services.Growth.GrowthModuleFlagEffectiveResolver" \
  "WebApi.Services.Meals.MealsModuleFlagEffectiveResolver" \
  "WebApi.Services.Events.EventsModuleFlagEffectiveResolver" && run MA-all-three-unregistered

restore
git status --porcelain | head
echo "MUTATIONS COMPLETE"
