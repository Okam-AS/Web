#!/bin/bash
# Enumerate every local branch in a repo with ahead/behind vs the integration tip.
# Read-only: for-each-ref + rev-list only. Never checks out.
repo="$1"; tip="$2"
git -C "$repo" for-each-ref --format='%(refname:short)' refs/heads | while read -r b; do
  sha=$(git -C "$repo" rev-parse "$b")
  ab=$(git -C "$repo" rev-list --left-right --count "$tip...$b" 2>/dev/null) || continue
  behind=$(echo "$ab" | cut -f1); ahead=$(echo "$ab" | cut -f2)
  printf '%s\t%s\t%s\t%s\n' "$b" "$sha" "$ahead" "$behind"
done
