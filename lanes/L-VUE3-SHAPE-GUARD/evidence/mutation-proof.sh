#!/bin/bash
# Reintroduce BOTH repairs' defects on the real tree, run the guard, restore, run again.
# A check that has never been shown to red on the actual estate is indistinguishable from a check
# that matches nothing there. The planted temp-dir arms live inside the test; this is the same proof
# against the files that shipped.
set -u
cd "$(dirname "$0")/../../.." || exit 1
OUT="lanes/L-VUE3-SHAPE-GUARD/evidence/05-mutation-proof.txt"

restore () {
  git checkout -- components/atoms/Modal.vue package.json
}
trap restore EXIT

{
  echo "=== baseline: both repairs in place ==="
  git diff --stat -- components/atoms/Modal.vue package.json
  npx jest test/vue3-shape-guard.test.js --coverage=false 2>&1 | grep -E "✓|✕|Tests:"

  echo
  echo "=== MUTATION 1: put \`emits: ['close']\` back on Modal.vue ==="
  perl -0pi -e "s/(  data: \(\) => \(\{\n    active: false\n  \}\),\n)/\$1  emits: ['close'],\n/" components/atoms/Modal.vue
  grep -n "emits" components/atoms/Modal.vue
  npx jest test/vue3-shape-guard.test.js --coverage=false 2>&1 | grep -E "✓|✕|Tests:|never reads it"

  echo
  echo "=== MUTATION 2: put the stale \`^2.6.14\` declaration back ==="
  restore
  perl -0pi -e 's/"vue": "\^2\.7\.14"/"vue": "^2.6.14"/' package.json
  grep -n '"vue":' package.json
  npx jest test/vue3-shape-guard.test.js --coverage=false 2>&1 | grep -E "✓|✕|Tests:|Expected:|Received:"

  echo
  echo "=== MUTATION 3: a Vue 3 hook planted in a real component (FocusTrap's original defect) ==="
  restore
  perl -0pi -e 's/\n  destroyed \(\) \{/\n  unmounted () {/' components/molecules/FocusTrap.vue
  grep -n "unmounted ()" components/molecules/FocusTrap.vue
  npx jest test/vue3-shape-guard.test.js --coverage=false 2>&1 | grep -E "✕|Tests:|never reads it"
  git checkout -- components/molecules/FocusTrap.vue

  echo
  echo "=== restored ==="
  restore
  git status --porcelain -- components/atoms/Modal.vue package.json components/molecules/FocusTrap.vue
  echo "(no lines above = tree restored)"
  npx jest test/vue3-shape-guard.test.js --coverage=false 2>&1 | grep -E "Tests:"
} > "$OUT" 2>&1

cat "$OUT"
