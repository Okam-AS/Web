#!/bin/sh
# Reproduces every listing in this directory. Collects paths only — `--listTests` executes no test,
# starts no server, binds no port and needs no container. Safe to run beside other lanes.
#
#   sh lanes/L-COLLECTED-PATHS/rerun.sh
#
set -eu

S=/Users/svendaneel/okam/Web-modules
W=/Users/svendaneel/okam/web-collected
L="$S/lanes/L-COLLECTED-PATHS"
J="$S/node_modules/.bin/jest"
BASE=e34977acebd59b223584158c33451b6f1ffd82c1

# The bare `"$J" --listTests` below passes no --config, so jest resolves one by traversing UP FROM
# THE WORKING DIRECTORY. Run from anywhere but the shared checkout it measures a DIFFERENT TREE and
# says nothing about it: from a sibling worktree it silently listed that worktree (112 absolute
# paths written into collected.txt), and from a directory with no jest config above it, jest exits 1
# into the discarded stderr while the pipeline's status stays 0, truncating collected.txt to empty.
# In both cases the two checks that answer the flag — `^lanes/` and the archived-name regex — PASS
# VACUOUSLY, because neither can match a path that is absolute or a file that is not there.
# Demonstrated before and after in lanes/L-COLLECT-REVIEW-CONDITIONS/applied.md.
cd "$S"

# ---- A. the live suite, in the shared checkout, exactly as it stands --------------------------
"$J" --listTests                                        2>/dev/null | sed "s|^$S/||" | sort > "$L/collected.txt"
"$J" --listTests --config "$L/jest.control.config.js"    2>/dev/null | sed "s|^$S/||" | sort > "$L/collected-via-control-wrapper.txt"
"$J" --listTests --config "$L/jest.without-lanes.config.js" 2>/dev/null | sed "s|^$S/||" | sort > "$L/collected-without-pattern.txt"

# ---- B. the worst-case tree ------------------------------------------------------------------
# The shared checkout does NOT hold the archived jest copy on disk, so a listing there shows its
# ABSENCE rather than its EXCLUSION. This rebuilds a tree where every hazardous file is present.
if [ ! -d "$W" ]; then
  git -C "$S" worktree add --detach "$W" "$BASE"
  ln -sfn "$S/node_modules" "$W/node_modules"           # --listTests validates the transform modules
  cp "$S/jest.config.js" "$W/jest.config.js"            # the fix as it currently exists (uncommitted)
  git -C "$W" checkout lane/mrg-page-test-vacuous -- lanes/L-MRG-PAGE-TEST-VACUOUS/margin-recipes-page.OLD.test.js
  for f in L-JOURNEY-PORT-HARDCODED/portproof/port-resolution.spec.js \
           L-TRAIN-PUBLISH-UNCLICKABLE/probe.spec.js \
           L-TRAIN-READONLY-VISIBLE/train-rows.probe.spec.js \
           L-WF-PIVOT-DEFECTS/wf-pivot-probe-roles.spec.js \
           L-WF-PIVOT-DEFECTS/wf-pivot-probe.spec.js; do
    mkdir -p "$W/lanes/$(dirname "$f")"; cp "$S/lanes/$f" "$W/lanes/$f"
  done
  # three LIVE suites at paths that merely resemble the excluded one — the over-exclusion canaries
  mkdir -p "$W/test/lanes" "$W/docs/plan/lanes"
  printf "test('canary 1 is collected', () => { expect(1).toBe(1) })\n" > "$W/test/multi-lanes-rollout.test.js"
  printf "test('canary 2 is collected', () => { expect(1).toBe(1) })\n" > "$W/test/lanes/rollout.test.js"
  printf "test('canary 3 is collected', () => { expect(1).toBe(1) })\n" > "$W/docs/plan/lanes/collect-canary.test.js"
fi

# All three listings are of the SAME tree at the same instant, so the only variable is the pattern.
"$J" --listTests --config "$L/jest.wt-without.config.js" 2>/dev/null | sed "s|^$W/||" | sort > "$L/worstcase-without-pattern.txt"
"$J" --listTests --config "$L/jest.wt-with.config.js"    2>/dev/null | sed "s|^$W/||" | sort > "$L/worstcase-with-anchored-pattern.txt"
"$J" --listTests --config "$L/jest.wt-bare.config.js"    2>/dev/null | sed "s|^$W/||" | sort > "$L/worstcase-with-bare-pattern.txt"

# ---- C. the assertions this lane exists to make ----------------------------------------------
fail=0
check () { if [ "$2" = "$3" ]; then echo "PASS  $1 ($2)"; else echo "FAIL  $1: expected $3, got $2"; fail=1; fi }

# --- controls first: every assertion below expects ZERO, and a zero proves nothing until the
# --- instrument that produced it has been shown to fire. A broken regex, an empty file or a listing
# --- of the wrong tree would satisfy all of them silently.
ARCHIVED='(\.OLD\.|superseded|archive|deprecated|\.bak|\.orig)'
check "CONTROL: the archived-name regex matches a known archived name" \
      "$(printf 'lanes/L-MRG-PAGE-TEST-VACUOUS/margin-recipes-page.OLD.test.js\n' | grep -ciE "$ARCHIVED" || true)" 1
check "CONTROL: the archived-name regex fires on a real listing that contains one" \
      "$(grep -ciE "$ARCHIVED" "$L/worstcase-without-pattern.txt" || true)" 1
check "CONTROL: the archived-name regex does not match a live suite name" \
      "$(printf 'test/margin-recipes-page.test.js\n' | grep -ciE "$ARCHIVED" || true)" 0
check "CONTROL: collected.txt is not empty" \
      "$([ -s "$L/collected.txt" ] && echo yes || echo no)" yes
check "CONTROL: collected.txt holds repo-relative paths, so '^lanes/' can match at all" \
      "$(grep -c '^/' "$L/collected.txt" || true)" 0

check "live suite collects nothing under the excluded dir" \
      "$(grep -c '^lanes/' "$L/collected.txt" || true)" 0
check "live suite collects no archived/superseded name" \
      "$(grep -ciE "$ARCHIVED" "$L/collected.txt" || true)" 0
check "wrapper is neutral (control == real config)" \
      "$(diff -q "$L/collected.txt" "$L/collected-via-control-wrapper.txt" >/dev/null && echo same || echo differ)" same
check "pattern ADDS nothing to the live suite" \
      "$(comm -13 "$L/collected-without-pattern.txt" "$L/collected.txt" | wc -l | tr -d ' ')" 0
check "everything the pattern removes is under the excluded dir" \
      "$(comm -23 "$L/collected-without-pattern.txt" "$L/collected.txt" | grep -vc '^lanes/' || true)" 0
check "worst-case: archived copy present on disk" \
      "$([ -f "$W/lanes/L-MRG-PAGE-TEST-VACUOUS/margin-recipes-page.OLD.test.js" ] && echo yes || echo no)" yes
check "worst-case: archived copy NOT collected" \
      "$(grep -c 'margin-recipes-page.OLD.test.js' "$L/worstcase-with-anchored-pattern.txt" || true)" 0
check "worst-case: pattern ADDS nothing" \
      "$(comm -13 "$L/worstcase-without-pattern.txt" "$L/worstcase-with-anchored-pattern.txt" | wc -l | tr -d ' ')" 0
check "worst-case: every removal is under the excluded dir" \
      "$(comm -23 "$L/worstcase-without-pattern.txt" "$L/worstcase-with-anchored-pattern.txt" | grep -vc '^lanes/' || true)" 0
for c in test/multi-lanes-rollout.test.js test/lanes/rollout.test.js docs/plan/lanes/collect-canary.test.js; do
  check "over-exclusion canary still collected: $c" \
        "$(grep -cxF "$c" "$L/worstcase-with-anchored-pattern.txt" || true)" 1
  # and the same canary under the pattern the fix rejected, to show the anchor is load-bearing
  check "bare pattern would swallow it: $c" \
        "$(grep -cxF "$c" "$L/worstcase-with-bare-pattern.txt" || true)" 0
done
exit $fail
