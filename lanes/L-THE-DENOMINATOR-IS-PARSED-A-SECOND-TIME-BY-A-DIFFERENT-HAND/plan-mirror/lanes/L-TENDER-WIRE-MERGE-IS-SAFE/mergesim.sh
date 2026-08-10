#!/usr/bin/env bash
# Simulate landing EVERY outstanding branch by true merge onto the tip; count predicate definitions in the result tree.
set -u
R=/Users/svendaneel/okam/OkamAPI
TIP=feature/restaurant-modules
printf 'branch\tmerge\tdef_files\tdef_paths\n'
git -C "$R" for-each-ref --format='%(refname:short)' refs/heads | while read -r bname; do
  case "$bname" in throwaway/*) continue;; esac
  git -C "$R" merge-base --is-ancestor "$bname" "$TIP" 2>/dev/null && continue
  out=$(git -C "$R" merge-tree --write-tree "$TIP" "$bname" 2>&1)
  rc=$?
  tree=$(printf '%s' "$out" | head -1)
  if [ $rc -ne 0 ]; then
    printf '%s\tCONFLICT\t-\t-\n' "$bname"; continue
  fi
  paths=$(git -C "$R" grep -lE 'bool +IsCreditSale *\(' "$tree" -- '*.cs' 2>/dev/null | sed "s|^$tree:||" | tr '\n' ',')
  n=$(printf '%s' "$paths" | tr ',' '\n' | grep -c . )
  printf '%s\tOK\t%s\t%s\n' "$bname" "$n" "${paths:-none}"
done
