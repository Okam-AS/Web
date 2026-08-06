#!/bin/zsh
# Delete one effective-flag resolver registration at a time and record whether the catalog guard reds.
W=/Users/svendaneel/okam/OkamAPI-flagsexcuse
cd "$W" || exit 1
OUT=/Users/svendaneel/okam/Web-modules/lanes/L-FLAGS-EXCUSE-BYFLAG/mutation-results.txt
: > "$OUT"

run_case () {
  local name="$1" file="$2" needle="$3"
  python3 - "$file" "$needle" <<'PY' || exit 1
import sys
path, needle = sys.argv[1], sys.argv[2]
src = open(path, encoding='utf-8').read()
if src.count(needle) != 1:
    raise SystemExit("needle count != 1 in %s: %d" % (path, src.count(needle)))
open(path, 'w', encoding='utf-8').write(src.replace(needle, "// MUTATION-PROBE registration removed"))
PY
  local result
  result=$(dotnet test WebApi.Tests/WebApi.Tests.csproj --filter "FullyQualifiedName~FlagEffectiveResolverWireTests" 2>&1 | grep -E "^(Passed!|Failed!)" | tail -1)
  echo "$name :: $result" >> "$OUT"
  git checkout -- "$file"
  touch "$file"
}

run_case "workforce-resolver-deleted" "Program.cs" "            services.AddScoped<WebApi.Services.Platform.FeatureFlags.IStoreFeatureFlagEffectiveResolver, WebApi.Services.Workforce.WorkforceModuleFlagEffectiveResolver>();"
run_case "growth-resolver-deleted" "Program.cs" "            services.AddScoped<WebApi.Services.Platform.FeatureFlags.IStoreFeatureFlagEffectiveResolver, WebApi.Services.Growth.GrowthModuleFlagEffectiveResolver>();"
run_case "meals-resolver-deleted" "Program.cs" "            services.AddScoped<WebApi.Services.Platform.FeatureFlags.IStoreFeatureFlagEffectiveResolver, WebApi.Services.Meals.MealsModuleFlagEffectiveResolver>();"
run_case "events-resolver-deleted" "Program.cs" "            services.AddScoped<WebApi.Services.Platform.FeatureFlags.IStoreFeatureFlagEffectiveResolver, WebApi.Services.Events.EventsModuleFlagEffectiveResolver>();"
run_case "margin-resolver-deleted" "Helpers/Margin/MarginModuleServiceCollectionExtensions.cs" "            services.AddScoped<WebApi.Services.Platform.FeatureFlags.IStoreFeatureFlagEffectiveResolver, MarginModuleFlagEffectiveResolver>();"

echo "--- tree after restore ---" >> "$OUT"
git status --short >> "$OUT"
cat "$OUT"
