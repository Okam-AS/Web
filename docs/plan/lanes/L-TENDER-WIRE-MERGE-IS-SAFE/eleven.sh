#!/usr/bin/env bash
set -u
R=/Users/svendaneel/okam/OkamAPI
TIP=feature/restaurant-modules
for bname in feature/restaurant-control-stage0 lane/a1-store-country lane/a2-growth-flake lane/a3-tx-gate \
             lane/a5-events-w4 lane/a6-meals-minors lane/b1-training-w3 lane/b2-wf-exchange \
             lane/b3-wf-timesheets lane/meals-w3-fiscal prep/meals-w3-landing; do
  mb=$(git -C "$R" merge-base "$TIP" "$bname")
  mbdate=$(git -C "$R" log -1 --format=%ad --date=short "$mb")
  base_has=$(git -C "$R" grep -cE 'bool +IsCreditSale *\(' "$mb" -- '*.cs' 2>/dev/null | wc -l | tr -d ' ')
  tree=$(git -C "$R" merge-tree --write-tree "$TIP" "$bname" 2>/dev/null | head -1)
  f="Services/Kassa/SaftCashRegisterExportService.MasterData.cs"
  # is the surviving private definition inside conflict markers?
  inmark=$(git -C "$R" show "${tree}:${f}" 2>/dev/null | awk '
    /^<<<<<<< /{c=1} /^>>>>>>> /{c=0; next}
    /private static bool IsCreditSale/{ if(c) print "INSIDE-MARKERS"; else print "AUTO-MERGED-IN" }')
  printf '%-38s mb=%s(%s) base_defs=%s  privdef:%s\n' "$bname" "$(git -C "$R" rev-parse --short=8 $mb)" "$mbdate" "$base_has" "${inmark:-absent}"
done
