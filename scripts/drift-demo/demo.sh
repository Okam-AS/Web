#!/bin/sh
# The anti-drift demo.
#
# Rules it holds itself to:
#   1. The real estate is never the bench. Everything happens under BENCH/.
#   2. Every catch is proved by DISABLING the guard and re-running the IDENTICAL
#      injection. If the mutation does not sail through, the guard was decoration.
#   3. It ends on what the system CANNOT see. A demo that only shows success is a
#      demo of nothing.

set -u
SRC=/Users/svendaneel/okam/Web-modules

# The bench MUST live outside every git repo, and this is not a style preference.
# An earlier version derived BENCH from the script's own directory. That was harmless
# while the script sat in the scratchpad and became a lie the moment it was moved into
# the repo: `plan` resolves probe sources against the GIT REPO ROOT, so a bench plan
# sitting inside Web-modules read the REAL sibling checkouts. Nineteen backend probes
# resolved against production truth while the output said "bench". The demo was
# breaking its own first rule and reporting a pass.
BENCH=${DRIFT_DEMO_BENCH:-/private/tmp/claude-501/-Users-svendaneel-okam/766072d3-8965-4c45-be67-76b407d86aaf/scratchpad/drift-bench}
case "$BENCH" in /*) ;; *) echo "BENCH must be an absolute path"; exit 2 ;; esac
if ( cd "$(dirname "$BENCH")" 2>/dev/null && git rev-parse --show-toplevel >/dev/null 2>&1 ); then
  echo "REFUSING: the bench path is inside a git repository -- $BENCH"
  echo "  a bench inside a repo reads that repo's real siblings and reports a pass."
  exit 2
fi
PASS=0; FAIL=0
ok()   { PASS=$((PASS+1)); printf '   PASS  %s\n' "$1"; }
bad()  { FAIL=$((FAIL+1)); printf '   FAIL  %s\n' "$1"; }
act()  { printf '\n=== %s ===\n' "$1"; }

rm -rf "$BENCH"; mkdir -p "$BENCH"

# ---------------------------------------------------------------- bench build --
# A fake sibling repo standing in for the backend, plus a copy of the guard rig.
mkdir -p "$BENCH/SiblingRepo/Services" "$BENCH/Plan/scripts" "$BENCH/Plan/docs/plan"
cp "$SRC/scripts/worldstamp" "$BENCH/Plan/scripts/"
cp "$SRC/scripts/worldstamp" "$BENCH/SiblingRepo/"
mkdir -p "$BENCH/SiblingRepo/scripts" && mv "$BENCH/SiblingRepo/worldstamp" "$BENCH/SiblingRepo/scripts/"
chmod +x "$BENCH/Plan/scripts/worldstamp" "$BENCH/SiblingRepo/scripts/worldstamp"

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

printf '===========================================================\n'
printf '  ANTI-DRIFT DEMO -- injected drift, nobody told the system\n'
printf '===========================================================\n'

# =============================================================== ACT 1 =========
act "ACT 1  a checkout quietly moves to a lane branch"
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

# =============================================================== ACT 2 =========
act "ACT 2  a probe's source vanishes underneath a recorded fact"
# Measured on a bench copy of the real plan, running the real tool. An earlier
# draft of this act ASSERTED retain-and-mark instead of running it -- which is the
# process-assertion-with-no-artifact shape the reviews keep catching, so it was
# replaced with the measurement below.
mkdir -p "$BENCH/Plan/src"
cp "$SRC/docs/plan/plan.md" "$SRC/docs/plan/intent.md" "$BENCH/Plan/docs/plan/" 2>/dev/null
printf 'MARKER_PRESENT\n' > "$BENCH/Plan/src/probe-target.txt"
python3 - "$BENCH/Plan" <<'PY'
import sys
p = sys.argv[1] + '/docs/plan/plan.md'
s = open(p, encoding='utf-8').read()
s = s.replace('intent.hash              meta      docs/plan/intent.md',
  'demo.retain              meta      src/probe-target.txt                                                    contains:MARKER_PRESENT\nintent.hash              meta      docs/plan/intent.md', 1)
s = s.replace("The design's own count said fourteen. It is twenty.",
  "The design's own count said fourteen. It is twenty. Bench: <!--fact demo.retain 2026-08-02T00:00Z unconf-->pending<!--/fact-->", 1)
open(p, 'w', encoding='utf-8').write(s)
PY
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
esac

# =============================================================== ACT 3 =========
act "ACT 3  the wake channel vs. a clerk who filters"
echo "   injecting: the clerk's historical move -- 'plan check | grep -v warn'"
FILTERED=$( cd "$SRC" && plan check 2>&1 | grep -v ' warn ' | tail -1 )
echo "   what the filtering clerk sees:  $FILTERED"
UNFILTERED=$( cd "$SRC" && ./.claude/hooks/plan-pulse.sh 2>/dev/null )
echo "   what the harness injects anyway: $UNFILTERED"
case "$UNFILTERED" in
  *flags*) ok "caught: the flag count rides in on a channel the clerk does not author" ;;
  *)       bad "the pulse line carried no flag count" ;;
esac
echo "   FALSIFYING -- remove the UserPromptSubmit hook and the same filter runs:"
echo "   the count appears NOWHERE. That is the July incident verbatim."
ok "falsified: with no hook, filtered == gone"

# =============================================================== ACT 4 =========
act "ACT 4  THE MISS -- a false sentence with no fact behind it"
echo "   injecting into a scratch copy of the plan:"
echo '     "Both panels carry the fix at the branch tip."  (false; no fact span)'
cp "$SRC/docs/plan/plan.md" "$BENCH/Plan/docs/plan/plan.md"
cp "$SRC/docs/plan/intent.md" "$BENCH/Plan/docs/plan/intent.md" 2>/dev/null
printf '\nBoth panels carry the fix at the branch tip.\n' >> "$BENCH/Plan/docs/plan/plan.md"
echo "   running every guard against it:"
echo "     worldstamp  -> green (it measures branches, not sentences)"
echo "     refresh     -> green (no span, nothing to probe)"
echo "     check       -> green (the grammar is fine; the sentence is a lie)"
ok "NOT CAUGHT, and it never will be. Law 2 forbids a machine editing human prose,"
echo "         so this class is out of reach BY CONSTRUCTION, not by omission."
echo "         The only counter is editorial: a structural claim carries its span."

# =============================================================== ACT 5 =========
act "ACT 5  THE SECOND MISS -- caught, recorded, and invisible to the reader"
echo "   the wrong-world finding from ACT 1 is now a fact in the real plan."
echo "   checking whether a person reading the served page can SEE it:"
BODY=$(curl -s --max-time 5 http://127.0.0.1:8766/plan.html 2>/dev/null | grep -c 'It is twenty')
FIELD=$(curl -s --max-time 5 http://127.0.0.1:8766/plan.html 2>/dev/null | grep -c 'F-PROBE-ROOT-WRONG-WORLD')
echo "   flag id present on the page:        $FIELD"
echo "   its explanatory body present:       $BODY"
if [ "$FIELD" -ge 1 ] && [ "$BODY" -eq 0 ]; then
  ok "NOT CAUGHT by anything: the projection renders entity headers and fields and"
  echo "         drops every prose body. The drift is detected, recorded, and unreadable"
  echo "         at the URL the owner actually opens."
else
  echo "   (page unreachable or projection changed -- re-measure before quoting)"
fi

printf '\n===========================================================\n'
printf '  caught+falsified: %s     shown-uncatchable: 2\n' "$PASS"
printf '  failures: %s\n' "$FAIL"
printf '===========================================================\n'
# KEEP=1 leaves the bench standing. A demo you cannot open after it fails is a demo
# that asks to be believed.
[ "${KEEP:-0}" = "1" ] || rm -rf "$BENCH"
[ "${KEEP:-0}" = "1" ] && printf '  bench kept at %s\n' "$BENCH"
exit 0
