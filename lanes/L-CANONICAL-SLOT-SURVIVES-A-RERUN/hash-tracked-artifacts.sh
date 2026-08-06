#!/bin/zsh
# Hashes EVERY git-tracked file under artifacts/ in the frontend checkout, plus records which of them
# git currently sees as modified. `git ls-files` and not `find`: only git can tell tracked from
# ignored, and `artifacts/` is ignored wholesale with 16 files force-added past it.
#
# Usage: hash-tracked-artifacts.sh <label>   -> writes lanes/<lane>/hash-<label>.txt
set -e
cd /Users/svendaneel/okam/Web-modules
LANE=lanes/L-CANONICAL-SLOT-SURVIVES-A-RERUN
LABEL="$1"
{
  echo "# tracked artifacts, label=$LABEL"
  echo "at: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
  echo "head: $(git rev-parse HEAD)"
  echo "## sha256 of on-disk bytes"
  git ls-files -z artifacts/ | xargs -0 shasum -a 256
  echo "## git status of artifacts/"
  git status --porcelain -uall -- artifacts/ | grep -v '^??' || echo "(no tracked-file changes)"
} > "$LANE/hash-$LABEL.txt"
echo "wrote $LANE/hash-$LABEL.txt"
