#!/bin/bash
# One composition step: merge a head, record the DECOY SURFACE (files git resolved
# without asking), then re-run. Never forces, never resolves on judgement.
#
# The decoy surface is the point of this script. F-THE-CONFLICT-IS-A-DECOY: a rebase's
# damage landed in the file that auto-merged, not the one that conflicted. So for every
# merge we compute the files BOTH sides changed since the merge-base and git resolved
# silently -- that set, not the conflict list, is what a human must read.
set -u
WT=/Users/svendaneel/okam/web-fe-candidate
LANE=/Users/svendaneel/okam/Web-modules/lanes/L-COMPOSE-FE-CANDIDATE
BR="$1"; STEP="$2"
cd "$WT" || exit 9

H=$(git rev-parse HEAD)
B=$(git rev-parse "$BR" 2>/dev/null) || { echo "STEP $STEP $BR NOREF"; exit 8; }
M=$(git merge-base "$H" "$B")

if [ "$M" = "$B" ]; then
  echo "STEP $STEP $BR NOOP-ALREADY-CONTAINED"
  exit 0
fi

git diff --name-only "$M" "$H" | sort > /tmp/.ours.$$
git diff --name-only "$M" "$B" | sort > /tmp/.theirs.$$
comm -12 /tmp/.ours.$$ /tmp/.theirs.$$ > /tmp/.both.$$
NBOTH=$(wc -l < /tmp/.both.$$ | tr -d ' ')

git merge --no-ff --no-edit "$BR" > /tmp/.mout.$$ 2>&1
RC=$?
if [ $RC -ne 0 ]; then
  CONF=$(git diff --name-only --diff-filter=U | tr '\n' ' ')
  echo "STEP $STEP $BR CONFLICT rc=$RC"
  echo "  conflicted: $CONF"
  { echo "## STEP $STEP -- $BR -- CONFLICT"; echo "merge-base: $M"; echo "both-sides-changed: $NBOTH"; echo "conflicted files:"; git diff --name-only --diff-filter=U | sed 's/^/  - /'; echo '```'; cat /tmp/.mout.$$; echo '```'; } >> "$LANE/conflicts.md"
  git merge --abort
  rm -f /tmp/.ours.$$ /tmp/.theirs.$$ /tmp/.both.$$ /tmp/.mout.$$
  exit 1
fi

NEW=$(git rev-parse HEAD)
CHANGED=$(git diff --name-only "$H" "$NEW" | wc -l | tr -d ' ')

# Decoy surface: both sides touched it, git resolved it with no conflict.
DECOY=$(cat /tmp/.both.$$ | tr '\n' ' ')

{
  echo ""
  echo "### F$STEP  \`$BR\`"
  echo ""
  echo "- merge commit: \`$(git rev-parse --short HEAD)\`  (base \`${M:0:9}\`)"
  echo "- files changed by this step: $CHANGED"
  echo "- **auto-merged both-sides (decoy surface): $NBOTH**"
  if [ "$NBOTH" -gt 0 ]; then
    echo ""
    echo "  Files git resolved without asking, where both sides had changed:"
    sed 's/^/  - `/;s/$/`/' /tmp/.both.$$
  fi
} >> "$LANE/compose-run.md"

echo "STEP $STEP $BR OK merge=$(git rev-parse --short HEAD) changed=$CHANGED decoy=$NBOTH"
[ "$NBOTH" -gt 0 ] && echo "  decoy: $DECOY"
rm -f /tmp/.ours.$$ /tmp/.theirs.$$ /tmp/.both.$$ /tmp/.mout.$$
exit 0
