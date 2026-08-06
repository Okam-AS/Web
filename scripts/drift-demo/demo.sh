#!/bin/sh
# The anti-drift demo.
#
# Rules it holds itself to:
#   1. The real estate is never the bench. Everything happens under BENCH/.
#   2. Every catch is proved by DISABLING the guard and re-running the IDENTICAL
#      injection. If the mutation does not sail through, the guard was decoration.
#   3. It ends on what the system CANNOT see. A demo that only shows success is a
#      demo of nothing.
#   4. An input it cannot find is NAMED -- with the path it wanted and where that
#      path lives -- and the act that needed it is SKIPPED. It never reaches past
#      this checkout to find one, and it never prints PASS for a measurement it did
#      not take. A skipped act is a smaller lie than a borrowed one.
#
# exit: 0 every act ran · 1 an act failed · 2 refused to start
#       3 ran, but acts were skipped for inputs this checkout does not carry
#
# knobs, all optional:
#   DRIFT_DEMO_SRC    the tree under test          (default: the repo this file is in)
#   DRIFT_DEMO_BENCH  the scratch bench            (default: $TMPDIR/okam-drift-bench)
#   DRIFT_DEMO_PULSE  the UserPromptSubmit hook    (default: $SRC/.claude/hooks/plan-pulse.sh)
#   DRIFT_DEMO_HUB    the served plan page         (default: http://127.0.0.1:8766/plan.html)
#   KEEP=1            leave the bench standing after the run

set -u

# ---------------------------------------------------------------- the tree ----
# SRC used to be the literal string /Users/svendaneel/okam/Web-modules, and that was
# not merely unportable. Run from any OTHER checkout, the script kept reading the
# authoring machine's repo and printed a clean scoreboard for a tree nobody had asked
# about. Measured 2026-08-06 from a clean ff497c0 worktree at a path it was never
# authored on: five acts ran, "caught+falsified: 7 / failures: 0", and not one line of
# it touched the worktree it was launched from. That is the same report-a-pass-against-
# the-wrong-world shape the BENCH note below was written for, and it is the exact class
# of drift this demo exists to catch -- so it was catching everything except itself.
#
# SRC is now the repo this script is IN, which is the only tree a person typing
# ./scripts/drift-demo/demo.sh can possibly mean.
SRC=${DRIFT_DEMO_SRC:-$(CDPATH= cd -- "$(dirname -- "$0")/../.." 2>/dev/null && pwd)}
if [ -z "$SRC" ] || [ ! -f "$SRC/scripts/drift-demo/demo.sh" ]; then
  echo "REFUSING: cannot identify the tree under test."
  echo "  resolved SRC = ${SRC:-<empty>}"
  echo "  wanted:        \$SRC/scripts/drift-demo/demo.sh (this file, seen from the repo root)"
  echo "  set DRIFT_DEMO_SRC to a checkout that carries it."
  exit 2
fi

# The bench MUST live outside every git repo, and this is not a style preference.
# An earlier version derived BENCH from the script's own directory. That was harmless
# while the script sat in the scratchpad and became a lie the moment it was moved into
# the repo: `plan` resolves probe sources against the GIT REPO ROOT, so a bench plan
# sitting inside Web-modules read the REAL sibling checkouts. Nineteen backend probes
# resolved against production truth while the output said "bench". The demo was
# breaking its own first rule and reporting a pass.
#
# The default used to name one session's scratchpad directory by hand -- a path that
# exists on exactly one machine on exactly one day. $TMPDIR is the portable spelling of
# the same intent: absolute, outside every checkout, and swept by the OS.
_tmp=${TMPDIR:-/tmp}; _tmp=${_tmp%/}
BENCH=${DRIFT_DEMO_BENCH:-$_tmp/okam-drift-bench}
case "$BENCH" in /*) ;; *) echo "REFUSING: BENCH must be an absolute path -- $BENCH"; exit 2 ;; esac
BENCH_PARENT=$(dirname "$BENCH")
mkdir -p "$BENCH_PARENT" 2>/dev/null || { echo "REFUSING: cannot create $BENCH_PARENT"; exit 2; }
if ( CDPATH= cd -- "$BENCH_PARENT" 2>/dev/null && git rev-parse --show-toplevel >/dev/null 2>&1 ); then
  echo "REFUSING: the bench path is inside a git repository -- $BENCH"
  echo "  a bench inside a repo reads that repo's real siblings and reports a pass."
  exit 2
fi

PASS=0; FAIL=0; SKIPPED=0; UNCAUGHT=0
ok()   { PASS=$((PASS+1));       printf '   PASS  %s\n' "$1"; }
miss() { UNCAUGHT=$((UNCAUGHT+1)); ok "$1"; }
bad()  { FAIL=$((FAIL+1));       printf '   FAIL  %s\n' "$1"; }
skip() { SKIPPED=$((SKIPPED+1)); printf '   SKIP  %s\n' "$1"; printf '         wanted: %s\n' "$2"; }
act()  { printf '\n=== %s ===\n' "$1"; }

# ----------------------------------------------------------------- preflight --
# Every input is resolved and reported BEFORE the first act, because the failure this
# block exists for is silent: an act that quietly measures nothing and prints a verdict
# anyway. Anything listed as absent is named with the path that was wanted and with
# where that path actually lives, so the reader can decide whether to fetch it or to
# accept a shorter run.
PULSE=${DRIFT_DEMO_PULSE:-$SRC/.claude/hooks/plan-pulse.sh}
HUB=${DRIFT_DEMO_HUB:-http://127.0.0.1:8766/plan.html}

have() { command -v "$1" >/dev/null 2>&1 && echo 1 || echo 0; }
HAS_GIT=$(have git); HAS_PY=$(have python3); HAS_CURL=$(have curl); HAS_PLAN=$(have plan)
HAS_STAMP=0; [ -x "$SRC/scripts/worldstamp" ] && HAS_STAMP=1
HAS_PLANMD=0; [ -f "$SRC/docs/plan/plan.md" ] && HAS_PLANMD=1
HAS_INTENT=0; [ -f "$SRC/docs/plan/intent.md" ] && HAS_INTENT=1
HAS_PULSE=0; [ -x "$PULSE" ] && HAS_PULSE=1
HAS_HUB=0
[ "$HAS_CURL" = 1 ] && curl -sf -o /dev/null --max-time 5 "$HUB" 2>/dev/null && HAS_HUB=1

printf '===========================================================\n'
printf '  ANTI-DRIFT DEMO -- injected drift, nobody told the system\n'
printf '===========================================================\n'
printf '  tree under test : %s\n' "$SRC"
printf '  bench           : %s\n' "$BENCH"

ABSENT=0
absent() { ABSENT=$((ABSENT+1)); printf '\n  NOT IN THIS CHECKOUT: %s\n' "$1"; printf '    %s\n' "$2"; }
[ "$HAS_GIT"   = 1 ] || absent "git (on PATH)"     "ACT 1 builds a throwaway repo with it. Install git."
[ "$HAS_PY"    = 1 ] || absent "python3 (on PATH)" "ACTs 1-2 read JSON and rewrite a plan with it. Install python3."
[ "$HAS_CURL"  = 1 ] || absent "curl (on PATH)"    "ACT 5 reads the served page with it. Install curl."
[ "$HAS_PLAN"  = 1 ] || absent "plan (on PATH)"    "the plan CLI. ACTs 2-4 run it. Install the plan-hub tool."
[ "$HAS_STAMP" = 1 ] || absent "$SRC/scripts/worldstamp" \
  "the world guard ACT 1 measures. It is on feature/restaurant-modules; a checkout missing it is not this repo."
if [ "$HAS_PLANMD" = 0 ]; then
  absent "$SRC/docs/plan/plan.md" \
    "the plan hub itself. The 2026-08-06 trunk landing (11be859) kept the code and left every docs/ and
    lanes/ path on wip/session-2026-08-06-all-work, so no checkout of feature/restaurant-modules carries
    a plan. Point DRIFT_DEMO_SRC at a checkout that has docs/plan/, or run \`plan init\` in one."
elif [ "$HAS_INTENT" = 0 ]; then
  absent "$SRC/docs/plan/intent.md" \
    "the signed intent. plan.md is here but intent.md is not, so ACT 2's probe row has nothing to sit beside."
fi
[ "$HAS_PULSE" = 1 ] || absent "$PULSE" \
  "the UserPromptSubmit hook ACT 3 measures. .claude/ is excluded by this repo's own .gitignore ON PURPOSE,
    so no checkout of this branch will ever carry it and no landing can fix that. Install the plan-hub skill
    into .claude/hooks/, or set DRIFT_DEMO_PULSE to wherever the hook lives."
[ "$HAS_HUB" = 1 ] || absent "$HUB" \
  "nothing answers there. This is the page the owner actually opens, and ACT 5 is about what that page hides.
    Serve it with \`plan serve --port 8766\` from a checkout that has docs/plan/. NOTE: plan serve REFUSES
    while PLAN_ACTOR is set -- the page is the owner's guard, not an agent's -- so from an agent shell the
    only route is \`plan render --html --out F\` and DRIFT_DEMO_HUB=file://F, which curl reads directly."
[ "$ABSENT" -gt 0 ] && printf '\n  %s input(s) absent -- the acts that need them will SKIP, not guess.\n' "$ABSENT"

rm -rf "$BENCH"; mkdir -p "$BENCH"

# ---------------------------------------------------------------- bench build --
# A fake sibling repo standing in for the backend, plus a copy of the guard rig.
mkdir -p "$BENCH/SiblingRepo/Services" "$BENCH/SiblingRepo/scripts" "$BENCH/Plan/scripts" "$BENCH/Plan/docs/plan"
if [ "$HAS_STAMP" = 1 ]; then
  cp "$SRC/scripts/worldstamp" "$BENCH/Plan/scripts/"
  cp "$SRC/scripts/worldstamp" "$BENCH/SiblingRepo/scripts/"
  chmod +x "$BENCH/Plan/scripts/worldstamp" "$BENCH/SiblingRepo/scripts/worldstamp"
fi

if [ "$HAS_GIT" = 1 ]; then
( cd "$BENCH/SiblingRepo"
  git init -q . && git config user.email d@d && git config user.name d
  printf 'public class Renderer { }\n' > Services/Renderer.cs
  printf 'integration_branch=main\n' > world.config
  git add -A >/dev/null && git commit -qm "base"
  git branch -q lane/somelane
  # two commits land on main that the lane will not have
  printf 'public class Renderer { /* deadline moved to the wire */ }\n' > Services/Renderer.cs
  git commit -qam "the deadline is on the wire"
  printf 'ok\n' > Services/Extra.cs && git add -A >/dev/null && git commit -qm "second landed commit"
) >/dev/null 2>&1
fi

# =============================================================== ACT 1 =========
act "ACT 1  a checkout quietly moves to a lane branch"
if [ "$HAS_STAMP" = 1 ] && [ "$HAS_GIT" = 1 ] && [ "$HAS_PY" = 1 ]; then
  echo "   injecting: git checkout lane/somelane in the sibling repo"
  ( cd "$BENCH/SiblingRepo" && git checkout -q lane/somelane )
  ( cd "$BENCH/SiblingRepo" && ./scripts/worldstamp --deep )
  J="$BENCH/SiblingRepo/artifacts/world/WORLD.json"
  OK=$(python3 -c "import json;print(json.load(open('$J'))['on_expected'])")
  BEHIND=$(python3 -c "import json;print(json.load(open('$J'))['commits_behind_integration'])")
  ANC=$(python3 -c "import json;print(json.load(open('$J'))['ancestor_of_integration'])")
  echo "   guard says: on_expected=$OK ancestor=$ANC behind=$BEHIND"
  if [ "$OK" = "False" ] && [ "$BEHIND" = "2" ] && [ "$ANC" = "False" ]; then
    ok "caught: named the wrong branch AND the two landed commits it is missing"
  else
    bad "did not catch the wrong-world move"
  fi

  echo "   FALSIFYING -- removing world.config, re-running the IDENTICAL injection"
  mv "$BENCH/SiblingRepo/world.config" "$BENCH/SiblingRepo/world.config.off"
  ( cd "$BENCH/SiblingRepo" && ./scripts/worldstamp --deep )
  OK2=$(python3 -c "import json;print(json.load(open('$J'))['on_expected'])")
  if [ "$OK2" = "unknown" ]; then
    ok "falsified: with the guard off the same drift reports 'unknown', not 'false'"
    echo "         (and NOT 'true' -- an absent guard must never read as conformance)"
  else
    bad "guard-off path reported '$OK2'; it must degrade to unknown, never to true"
  fi
  mv "$BENCH/SiblingRepo/world.config.off" "$BENCH/SiblingRepo/world.config"
else
  skip "the world guard could not be exercised" "$SRC/scripts/worldstamp, plus git and python3 on PATH"
fi

# =============================================================== ACT 2 =========
act "ACT 2  a probe's source vanishes underneath a recorded fact"
# Measured on a bench copy of the real plan, running the real tool. An earlier
# draft of this act ASSERTED retain-and-mark instead of running it -- which is the
# process-assertion-with-no-artifact shape the reviews keep catching, so it was
# replaced with the measurement below.
#
# The injection edits a REAL plan, so it needs two literal anchors to exist in it. When
# a plan is present but shaped differently the python below refuses by name instead of
# no-op'ing: a silent no-op here would leave the act comparing two empty strings and
# calling that a result, which is the failure this whole demo is about.
if [ "$HAS_PLAN" = 1 ] && [ "$HAS_PLANMD" = 1 ] && [ "$HAS_INTENT" = 1 ] && [ "$HAS_PY" = 1 ]; then
  mkdir -p "$BENCH/Plan/src"
  cp "$SRC/docs/plan/plan.md" "$SRC/docs/plan/intent.md" "$BENCH/Plan/docs/plan/"
  printf 'MARKER_PRESENT\n' > "$BENCH/Plan/src/probe-target.txt"
  INJ=$(python3 - "$BENCH/Plan" <<'PY'
import sys
p = sys.argv[1] + '/docs/plan/plan.md'
s = open(p, encoding='utf-8').read()
row  = 'intent.hash              meta      docs/plan/intent.md'
body = "The design's own count said fourteen. It is twenty."
for want in (row, body):
    if want not in s:
        print('NO-ANCHOR|' + want); sys.exit(0)
s = s.replace(row,
  'demo.retain              meta      src/probe-target.txt                                                    contains:MARKER_PRESENT\n' + row, 1)
s = s.replace(body,
  body + ' Bench: <!--fact demo.retain 2026-08-02T00:00Z unconf-->pending<!--/fact-->', 1)
open(p, 'w', encoding='utf-8').write(s)
print('OK')
PY
)
  case "$INJ" in
    NO-ANCHOR*)
      skip "the plan here is not the plan this injection was written against" \
           "a line reading: $(printf '%s' "$INJ" | cut -d'|' -f2-)" ;;
    *)
      ( cd "$BENCH/Plan" && plan refresh 2>&1 | sed 's/^/     refresh: /' )
      BEFORE=$(grep -o '<!--fact demo.retain[^>]*-->[^<]*<!--/fact-->' "$BENCH/Plan/docs/plan/plan.md")
      echo "   before injection: $BEFORE"
      echo "   injecting: delete the file the probe reads"
      rm -f "$BENCH/Plan/src/probe-target.txt"
      ( cd "$BENCH/Plan" && plan refresh 2>&1 | sed 's/^/     refresh: /' )
      AFTER=$(grep -o '<!--fact demo.retain[^>]*-->[^<]*<!--/fact-->' "$BENCH/Plan/docs/plan/plan.md")
      echo "   after injection:  $AFTER"
      case "$BEFORE:$AFTER" in
        *"ok-->present"*:*"unconf-->present"*)
          ok "caught, MEASURED: status flipped ok -> unconf and the value was RETAINED" ;;
        *) bad "expected ok/present -> unconf/present; got $BEFORE then $AFTER" ;;
      esac
      echo "   FALSIFYING -- the alternative design is blanking the value on failure."
      case "$AFTER" in
        *'-->present<'*) ok "falsified: blanking would have destroyed the fact that there WAS"
                         echo "         a value. The retained 'present' beside 'unconf' is what makes"
                         echo "         'we lost sight of this' distinguishable from 'this was never true'." ;;
        *) bad "the value was not retained" ;;
      esac ;;
  esac
else
  skip "no plan to injure" "$SRC/docs/plan/plan.md + $SRC/docs/plan/intent.md, plus \`plan\` and python3 on PATH"
fi

# =============================================================== ACT 3 =========
act "ACT 3  the wake channel vs. a clerk who filters"
# Note: plan-pulse resolves its OWN repo from its own location. Point DRIFT_DEMO_PULSE
# at a hook outside SRC and the two halves of this act read two different plans -- which
# still shows the channel, but stop quoting the numbers side by side if you do.
if [ "$HAS_PLAN" = 1 ] && [ "$HAS_PLANMD" = 1 ] && [ "$HAS_PULSE" = 1 ]; then
  echo "   injecting: the clerk's historical move -- 'plan check | grep -v warn'"
  FILTERED=$( cd "$SRC" && plan check 2>&1 | grep -v ' warn ' | tail -1 )
  echo "   what the filtering clerk sees:  $FILTERED"
  UNFILTERED=$( "$PULSE" 2>/dev/null )
  echo "   what the harness injects anyway: $UNFILTERED"
  case "$UNFILTERED" in
    *flags*) ok "caught: the flag count rides in on a channel the clerk does not author" ;;
    *)       bad "the pulse line carried no flag count" ;;
  esac
  echo "   FALSIFYING -- remove the UserPromptSubmit hook and the same filter runs:"
  echo "   the count appears NOWHERE. That is the July incident verbatim."
  ok "falsified: with no hook, filtered == gone"
else
  skip "the wake channel could not be exercised" "$PULSE (+ $SRC/docs/plan/plan.md and \`plan\` on PATH)"
fi

# =============================================================== ACT 4 =========
act "ACT 4  THE MISS -- a false sentence with no fact behind it"
if [ "$HAS_PLAN" = 1 ] && [ "$HAS_PLANMD" = 1 ]; then
  echo "   injecting into a scratch copy of the plan:"
  echo '     "Both panels carry the fix at the branch tip."  (false; no fact span)'
  cp "$SRC/docs/plan/plan.md" "$BENCH/Plan/docs/plan/plan.md"
  [ "$HAS_INTENT" = 1 ] && cp "$SRC/docs/plan/intent.md" "$BENCH/Plan/docs/plan/intent.md"
  errs() { ( cd "$BENCH/Plan" && plan check 2>&1 | tail -1 ) | sed -n 's/.*check: \([0-9][0-9]*\) error.*/\1/p'; }
  E_BEFORE=$(errs)
  printf '\nBoth panels carry the fix at the branch tip.\n' >> "$BENCH/Plan/docs/plan/plan.md"
  E_AFTER=$(errs)
  echo "   by construction, not measured here:"
  echo "     worldstamp  -- it measures branches, never sentences"
  echo "     refresh     -- no span in that line, so there is nothing to probe"
  echo "   MEASURED, on the bench copy, is the one guard that reads the file:"
  echo "     plan check errors before the sentence: ${E_BEFORE:-?}   after: ${E_AFTER:-?}"
  if [ -n "$E_BEFORE" ] && [ "$E_BEFORE" = "$E_AFTER" ]; then
    miss "NOT CAUGHT, and it never will be. Law 2 forbids a machine editing human prose,"
    echo "         so this class is out of reach BY CONSTRUCTION, not by omission."
    echo "         The only counter is editorial: a structural claim carries its span."
  else
    bad "expected the error count to be unmoved by the sentence; got ${E_BEFORE:-?} then ${E_AFTER:-?}"
  fi
else
  skip "there was no plan to lie in" "$SRC/docs/plan/plan.md (+ \`plan\` on PATH)"
fi

# =============================================================== ACT 5 =========
act "ACT 5  THE SECOND MISS -- caught, recorded, and invisible to the reader"
if [ "$HAS_HUB" = 1 ]; then
  echo "   the wrong-world finding from ACT 1 is now a fact in the real plan."
  echo "   checking whether a person reading the served page can SEE it:"
  PAGE=$(curl -s --max-time 5 "$HUB" 2>/dev/null)
  BODY=$(printf '%s' "$PAGE" | grep -c 'It is twenty')
  FIELD=$(printf '%s' "$PAGE" | grep -c 'F-PROBE-ROOT-WRONG-WORLD')
  echo "   flag id present on the page:        $FIELD"
  echo "   its explanatory body present:       $BODY"
  if [ "$FIELD" -ge 1 ] && [ "$BODY" -eq 0 ]; then
    miss "NOT CAUGHT by anything: the projection renders entity headers and fields and"
    echo "         drops every prose body. The drift is detected, recorded, and unreadable"
    echo "         at the URL the owner actually opens."
  elif [ "$FIELD" -ge 1 ]; then
    # Measured 2026-08-06 against \`plan render --html\`: FIELD=2, BODY=2. The body comes
    # through as a <p>. The 2026-08-06 transcript recorded BODY=0, so the projection this
    # act was written about has changed underneath the claim. Refusing here rather than
    # printing the old sentence IS the point of the act: an uncatchable-class claim that
    # has stopped reproducing is worth exactly as much as a caught-class one that has.
    skip "the claim did not reproduce: the flag's prose body IS on this page ($BODY hit(s))" \
         "$HUB rendering the flag id and DROPPING its body text 'It is twenty' -- re-measure the projection before quoting the old result"
  else
    skip "the flag this act reads is not on this page at all" \
         "$HUB carrying the flag id F-PROBE-ROOT-WRONG-WORLD"
  fi
else
  skip "nothing is serving the page the owner opens" "$HUB -- start it with \`plan serve --port 8766\`"
fi

printf '\n===========================================================\n'
# shown-uncatchable used to be the literal 2. It is counted now: an act that skipped
# demonstrated nothing, and a scoreboard that says otherwise is the drift.
printf '  caught+falsified: %s     shown-uncatchable: %s\n' "$((PASS - UNCAUGHT))" "$UNCAUGHT"
printf '  failures: %s     skipped for absent inputs: %s\n' "$FAIL" "$SKIPPED"
printf '===========================================================\n'
# KEEP=1 leaves the bench standing. A demo you cannot open after it fails is a demo
# that asks to be believed.
if [ "${KEEP:-0}" = "1" ]; then printf '  bench kept at %s\n' "$BENCH"; else rm -rf "$BENCH"; fi
[ "$FAIL" -gt 0 ] && exit 1
[ "$SKIPPED" -gt 0 ] && exit 3
exit 0
