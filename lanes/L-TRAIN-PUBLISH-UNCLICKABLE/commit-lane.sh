#!/bin/bash
# Commit this lane's work WITHOUT touching the shared checkout.
#
# This working tree is shared with many other lanes and carries their uncommitted files, so the usual
# moves are all unsafe here: `git add -A` would sweep up their work, and `git checkout -b` would move
# HEAD under them mid-run. Instead this builds the commit in a THROWAWAY INDEX seeded from HEAD, adds
# only this lane's pathspecs to it, and points a lane ref at the result with update-ref. The shared
# index, the shared HEAD and every other lane's file are untouched.
set -euo pipefail
cd /Users/svendaneel/okam/Web-modules

BRANCH=refs/heads/lane/train-publish-unclickable
BASE=$(git rev-parse HEAD)
export GIT_INDEX_FILE=/private/tmp/claude-501/-Users-svendaneel-okam/766072d3-8965-4c45-be67-76b407d86aaf/scratchpad/lane.index
rm -f "$GIT_INDEX_FILE"
git read-tree "$BASE"

git add -- \
  components/admin/training/_training-panel.scss \
  components/admin/training/TrainingVersionPanel.vue \
  components/admin/training/TrainingAssignmentPanel.vue \
  components/admin/training/TrainingCourseList.vue \
  components/admin/training/TrainingCompletionPanel.vue \
  components/admin/training/TrainingCertificatePanel.vue \
  components/admin/training/TrainingHoldingsPanel.vue \
  components/admin/training/TrainingDisclosurePanel.vue \
  test/e2e/journeys/training-course-to-evidence.spec.js \
  lanes/L-TRAIN-PUBLISH-UNCLICKABLE

TREE=$(git write-tree)
COMMIT=$(git commit-tree "$TREE" -p "$BASE" -F lanes/L-TRAIN-PUBLISH-UNCLICKABLE/commit-message.txt)
git update-ref "$BRANCH" "$COMMIT"

echo "base   $BASE"
echo "commit $COMMIT"
echo "branch $BRANCH"
echo "--- reachability (the check two lanes skipped today) ---"
git merge-base --is-ancestor "$COMMIT" "$BRANCH" && echo "reachable from $BRANCH: yes"
git rev-parse --verify "$BRANCH^{commit}" >/dev/null && echo "ref resolves: yes"
echo "--- files in this commit ---"
git diff-tree --no-commit-id --name-only -r "$COMMIT"
