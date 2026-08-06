#!/usr/bin/env bash
# Four states, recorded. A check that has only ever run against a clean tree is indistinguishable
# from one that matches nothing, so this plants the exact defect the guard exists to catch, watches
# it red, removes it, and watches it go green again — then does the same for the OTHER direction,
# a ledger entry whose shadow is not there.
#
# Run from the repo root. Cleans up after itself on any exit path.
set -u

REPO="/Users/svendaneel/okam/Web-modules"
LANE="$REPO/lanes/L-PRICE-SHADOW-GUARD"
GUARD="$REPO/test/price-gate-shadow.test.js"
PLANT="$REPO/components/molecules/ShadowPlantProbe.vue"
BACKUP="$LANE/.guard.bak"

cleanup () {
  rm -f "$PLANT"
  if [ -f "$BACKUP" ]; then cp "$BACKUP" "$GUARD"; rm -f "$BACKUP"; fi
}
trap cleanup EXIT

cd "$REPO" || exit 1
cp "$GUARD" "$BACKUP"

run () {
  # $1 = output file, $2 = label
  echo "### $2" > "$1"
  npx jest test/price-gate-shadow.test.js --coverage=false 2>&1 \
    | grep -Ev 'MustScanSubDirs|watchman|facebook.github.io|^To clear|^`watchman' >> "$1"
  # Jest's own verdict line is what we key on.
  if grep -qE '^Tests:.*[0-9]+ failed' "$1"; then echo "VERDICT: RED" >> "$1"; else echo "VERDICT: GREEN" >> "$1"; fi
  tail -1 "$1"
}

# ---- STATE A: the tree as it stands. -----------------------------------------------------------
run "$LANE/state-A-clean.txt" "STATE A — clean tree, CustomerInfoModal shadow resolved, kravia pinned"

# ---- STATE B: plant a component that shadows the gate. -----------------------------------------
cat > "$PLANT" <<'VUE'
<template>
  <span>{{ priceLabel(amount) }}</span>
</template>

<script>
export default {
  props: {
    amount: { type: Number, default: null }
  },
  methods: {
    // The exact defect: a component-local method of the gated name. In Vue 2 this beats the mixin's,
    // so this surface would print "kr 0" for an amount nobody stated.
    priceLabel (amount) {
      return "kr " + (amount || 0);
    }
  }
};
</script>
VUE
run "$LANE/state-B-planted.txt" "STATE B — a new component declares its own priceLabel (must RED)"

# ---- STATE C: remove the plant. ----------------------------------------------------------------
rm -f "$PLANT"
run "$LANE/state-C-removed.txt" "STATE C — plant removed (must return to GREEN)"

# ---- STATE D: the other direction — a ledger entry whose shadow is not there. -------------------
# Product.vue CALLS priceLabel in its template and does not declare it. Pinning it must be reported
# as stale, which also proves a template call site is not mistaken for a definition.
python3 - "$GUARD" <<'PY'
import sys
p = sys.argv[1]
s = open(p, encoding='utf-8').read()
anchor = "const PINNED_SHADOWS = ["
entry = ("  {\n"
         "    rel: 'components/organisms/Product.vue',\n"
         "    member: 'priceLabel',\n"
         "    owner: 'PLANT',\n"
         "    why: 'Stale-direction probe: this file only CALLS priceLabel in its template and never declares it, so this entry describes a shadow that is not there.'\n"
         "  },\n")
assert anchor in s, 'ledger anchor not found'
s = s.replace(anchor + "]", anchor + "\n" + entry + "]", 1)
# The census pins the ledger as empty; relax just that one assertion so the STALE arm is the clean
# signal rather than being drowned out by the census firing at the same time.
old_census = 'expect(PINNED_SHADOWS).toEqual([])'
assert old_census in s, 'census assertion not found'
s = s.replace(old_census, 'expect(PINNED_SHADOWS.length).toBe(1)', 1)
open(p, 'w', encoding='utf-8').write(s)
PY
run "$LANE/state-D-stale-pin.txt" "STATE D — a ledger entry whose shadow is gone (must RED as stale)"

# ---- restore and confirm. ----------------------------------------------------------------------
cp "$BACKUP" "$GUARD"; rm -f "$BACKUP"
run "$LANE/state-E-restored.txt" "STATE E — ledger restored (must be GREEN again)"

echo
echo "=== summary ==="
for f in state-A-clean state-B-planted state-C-removed state-D-stale-pin state-E-restored; do
  printf '%-22s %s\n' "$f" "$(grep '^VERDICT' "$LANE/$f.txt")"
done
