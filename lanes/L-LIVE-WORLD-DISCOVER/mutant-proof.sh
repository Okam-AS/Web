#!/usr/bin/env bash
# Mutation proof for events-guest-proposal.spec.js — L-LIVE-WORLD-DISCOVER.
#
# Each mutant removes ONE thing the walk claims to discover, or corrupts ONE thing it claims to
# compare, and the run must RED. A journey whose discovery silently fell back to a default, or whose
# cross-surface equalities could not fail, would go green under these.
#
# Scratch only: the mutant lives in a throwaway file in this worktree and is deleted afterwards.
set -u
# Re-run it from a checkout that has node_modules and a populated core/:
#   MUTANT_REPO=/path/to/worktree bash mutant-proof.sh
# It was run from /Users/svendaneel/okam/wt-lwd, a detached worktree of feature/restaurant-modules
# with its own .nuxt, because three dev servers already share the primary checkout (F-DEV-SERVERS-SHARE-BUILD).
cd "${MUTANT_REPO:-$(dirname "$0")}"
SRC=test/e2e/journeys/events-guest-proposal.spec.js
MUT=test/e2e/journeys/zz-mutant.spec.js
OUT=/Users/svendaneel/okam/Web-modules/lanes/L-LIVE-WORLD-DISCOVER

run () {
  name="$1"; shift
  python3 - "$SRC" "$MUT" "$@" <<'PY'
import sys
src, dst = sys.argv[1], sys.argv[2]
text = open(src, encoding='utf-8').read()
for i in range(3, len(sys.argv), 2):
    old, new = sys.argv[i], sys.argv[i + 1]
    if old not in text:
        sys.exit('MUTATION ANCHOR NOT FOUND: ' + old[:70])
    text = text.replace(old, new, 1)
open(dst, 'w', encoding='utf-8').write(text)
PY
  if [ $? -ne 0 ]; then echo "$name: ANCHOR MISSING" | tee -a "$OUT/mutant-proof.txt"; return; fi
  E2E_WEB_PORT=3971 E2E_FIXTURE_PORT=4971 npx playwright test "$MUT" > "$OUT/mutant-$name.txt" 2>&1
  code=$?
  {
    echo "=== $name : playwright exit $code ==="
    grep -m1 -E "Error: (DISCOVERY|MUTATION)" "$OUT/mutant-$name.txt" || \
      grep -m1 -E "Error:|expect\(" "$OUT/mutant-$name.txt" || echo "(no error line found)"
    tail -3 "$OUT/mutant-$name.txt" | sed 's/^/    /'
    echo
  } >> "$OUT/mutant-proof.txt"
  rm -f "$MUT"
}

: > "$OUT/mutant-proof.txt"

# A — the module lever is never pulled, so the venue's pipeline is dark and the world makes no
#     booking at all. Nothing is discovered and nothing is invented.
run A \
  'await turnOn(page, EVENTS_CORE);' \
  '/* MUTANT A: the lever is not pulled */;'

# B — the venue's handover line is gone from the page at the moment the token is read. This is the
#     discovery guard itself: no fallback, so the walk must stop with the missing thing named.
run B \
  "      const link = await discover(" \
  "$(printf '      await page.locator('"'"'.ev-journey__handover'"'"').evaluateAll(ns => ns.forEach(n => n.remove()));\n      const link = await discover(')"

# C — one of the four figures the venue's screen stated is corrupted before the guest's page is
#     compared against it. The cross-surface equality must fail rather than being decorative.
run C \
  'expect(guestFigures.slice().sort()).toEqual(venueFigures.slice().sort());' \
  "$(printf 'venueFigures[1] = '"'"'99999,00'"'"';\n      expect(guestFigures.slice().sort()).toEqual(venueFigures.slice().sort());')"

# D — the hash the guest was shown is replaced by another hash-shaped string. The receipt's binding
#     must be to THAT screen's reference and not merely to something hash-shaped.
run D \
  'displayedHash = hash[1];' \
  "displayedHash = 'deadbeefdeadbeef';"

cat "$OUT/mutant-proof.txt"
