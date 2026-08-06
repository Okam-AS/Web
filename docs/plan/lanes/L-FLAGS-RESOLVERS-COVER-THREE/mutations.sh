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

restore () { cd "$WT" && git checkout -- Program.cs; }

cd "$WT" || exit 1
git checkout --detach 107ca70e >/dev/null 2>&1 || exit 1
git rev-parse HEAD

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
