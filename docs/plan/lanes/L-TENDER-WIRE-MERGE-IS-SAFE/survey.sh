#!/usr/bin/env bash
# Survey every non-ancestor branch in OkamAPI for credit-sale predicate carriage.
set -u
R=/Users/svendaneel/okam/OkamAPI
TIP=feature/restaurant-modules
KASSA='Services/Kassa/FinalizeService.cs Services/Kassa/PosReceiptService.cs Services/Kassa/KassaCreditSale.cs Services/Kassa/SaftCashRegisterExportService.MasterData.cs Services/Kassa/SaftCashRegisterExportService.Transactions.cs'

printf 'branch\ttip_ahead\tbr_ahead\tdefs_in_tree\thas_export_private\thas_request_twin\ttouches_kassa_in_diff\n'
git -C "$R" for-each-ref --format='%(refname:short)' refs/heads | while read -r bname; do
  git -C "$R" merge-base --is-ancestor "$bname" "$TIP" 2>/dev/null && continue
  mb=$(git -C "$R" merge-base "$bname" "$TIP" 2>/dev/null) || continue
  counts=$(git -C "$R" rev-list --left-right --count "$TIP...$bname" 2>/dev/null | tr '\t' ' ')
  ta=${counts% *}; ba=${counts#* }
  defs=$(git -C "$R" grep -cE 'bool +IsCreditSale *\(' "$bname" -- '*.cs' 2>/dev/null | wc -l | tr -d ' ')
  # private predicate living in the export file (the "original private predicate")
  exp=$(git -C "$R" grep -lE 'private +static +bool +IsCreditSale *\(' "$bname" -- '*.cs' 2>/dev/null | wc -l | tr -d ' ')
  # inline twin classifying off a request payment list
  twin=$(git -C "$R" grep -lE 'isCreditSale *= *payments *!= *null' "$bname" -- '*.cs' 2>/dev/null | wc -l | tr -d ' ')
  touched=$(git -C "$R" diff --name-only "$mb" "$bname" -- $KASSA 2>/dev/null | tr '\n' ',' )
  printf '%s\t%s\t%s\t%s\t%s\t%s\t%s\n' "$bname" "$ta" "$ba" "$defs" "$exp" "$twin" "${touched:-none}"
done
