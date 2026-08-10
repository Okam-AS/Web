#!/usr/bin/env bash
# For every outstanding branch that conflicts on merge, list the conflicted paths and the predicate
# definitions in the conflicted result tree (git's own resolution, before any human touches it).
set -u
R=/Users/svendaneel/okam/OkamAPI
TIP=feature/restaurant-modules
printf 'branch\tdef_files\tconflicted_kassa\tn_conflicts\n'
git -C "$R" for-each-ref --format='%(refname:short)' refs/heads | while read -r bname; do
  case "$bname" in throwaway/*) continue;; esac
  git -C "$R" merge-base --is-ancestor "$bname" "$TIP" 2>/dev/null && continue
  out=$(git -C "$R" merge-tree --write-tree --name-only "$TIP" "$bname" 2>&1) || true
  tree=$(printf '%s' "$out" | head -1)
  git -C "$R" cat-file -t "$tree" >/dev/null 2>&1 || { printf '%s\tERR\t-\t-\n' "$bname"; continue; }
  # conflicted file list = lines after the tree oid up to the blank line
  cf=$(printf '%s\n' "$out" | sed -n '2,/^$/p' | grep . )
  ncf=$(printf '%s\n' "$cf" | grep -c . )
  kassa=$(printf '%s\n' "$cf" | grep 'Services/Kassa/' | tr '\n' ',')
  paths=$(git -C "$R" grep -lE 'bool +IsCreditSale *\(' "$tree" -- '*.cs' 2>/dev/null | sed "s|^$tree:||" | tr '\n' ',')
  n=$(printf '%s' "$paths" | tr ',' '\n' | grep -c . )
  printf '%s\t%s\t%s\t%s\n' "$bname" "$n" "${kassa:-none}" "$ncf"
done
