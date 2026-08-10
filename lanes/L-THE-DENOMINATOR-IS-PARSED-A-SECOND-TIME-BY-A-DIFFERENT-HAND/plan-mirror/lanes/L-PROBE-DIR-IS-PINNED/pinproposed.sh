#!/bin/sh
# pinproposed — apply the EXACT lines this lane is handing the clerk to a copy of
# the REAL plan, and run the REAL tool over it against the REAL trees.
#
# The backend siblings are SYMLINKS to the real checkouts, so `../OkamAPI-modules`
# resolves from the bench hub to the real file, read-only. The hub itself is a bench
# worktree in the real shape (see below). Nothing outside the bench is written and no
# checkout is switched.
#
# It answers three questions the proposal is worthless without:
#   1. does `plan check` still parse the plan, with no new violations?
#   2. what do the new facts read against the trees as they stand right now?
#   3. does the coverage check go from red to green because of these lines?
set -u
SRC=/Users/svendaneel/okam/Web-modules
OKAM=/Users/svendaneel/okam
BENCH=${PINPROPOSED:-/private/tmp/claude-501/-Users-svendaneel-okam/766072d3-8965-4c45-be67-76b407d86aaf/scratchpad/L-PROBE-DIR-IS-PINNED-proposed}
LANE="$SRC/docs/plan/lanes/L-PROBE-DIR-IS-PINNED"

case "$BENCH" in /*) ;; *) echo "BENCH must be absolute"; exit 2 ;; esac
if ( cd "$(dirname "$BENCH")" 2>/dev/null && git rev-parse --show-toplevel >/dev/null 2>&1 ); then
  echo "REFUSING: bench path is inside a git repository"; exit 2
fi

rm -rf "$BENCH"; mkdir -p "$BENCH/okam"
# The two BACKEND siblings are symlinks to the real trees: read-only, never copied,
# never checked out. The backend half of the proposal is therefore measured against
# ../OkamAPI-modules exactly as it stands.
ln -s "$OKAM/OkamAPI-modules" "$BENCH/okam/OkamAPI-modules"
ln -s "$OKAM/OkamAPI"         "$BENCH/okam/OkamAPI"

# The HUB half cannot be a symlink: the hub is the repo `plan` runs inside, and the
# fe.dir.* lines read the hub's own `.git`, which in the real estate is a worktree
# POINTER FILE. A plain `git init` bench hub has a `.git` DIRECTORY, which
# probe_sources filters out with os.path.isfile -- so the fe lines would red for a
# reason that has nothing to do with drift, and the run would look like a defect in
# the proposal. So the bench builds the real shape: a main repo `Web` with a linked
# worktree `Web-modules` beside it, on the declared branch. The fe half is then
# GREEN here and RED in pinlive.sh against the real hub -- which is the point.
( cd "$BENCH/okam"
  mkdir Web && cd Web
  git init -q -b trunk . && git config user.email d@d && git config user.name d
  printf 'x\n' > seed.txt && git add seed.txt && git commit -qm seed
  git branch feature/restaurant-modules
  git worktree add -q "$BENCH/okam/Web-modules" feature/restaurant-modules
) >/dev/null 2>&1
HUB="$BENCH/okam/Web-modules"
[ -f "$HUB/.git" ] || { echo "bench hub is not a linked worktree -- refusing"; exit 2; }

mkdir -p "$HUB/docs/plan"
cp "$SRC/docs/plan/plan.md" "$SRC/docs/plan/intent.md" "$HUB/docs/plan/"
cp "$SRC/world.config" "$HUB/world.config"
( cd "$HUB" && git add docs world.config && git commit -qm plan ) >/dev/null 2>&1

printf '=================================================================\n'
printf '  PROPOSED EDIT -- real plan text, real tool, real trees\n'
printf '=================================================================\n\n'

printf -- '--- 1. plan check, BEFORE the proposed lines ---\n'
BEFORE=$( cd "$HUB" && plan check 2>&1 | tail -1 )
printf '    %s\n' "$BEFORE"

# ------------------------------------------------------------------ the patch --
python3 - "$HUB/docs/plan/plan.md" "$LANE/proposed-probes.txt" "$LANE/proposed-facts.txt" <<'PY'
import sys
plan_md, probes_f, facts_f = sys.argv[1], sys.argv[2], sys.argv[3]
s = open(plan_md, encoding='utf-8').read()
probes = open(probes_f, encoding='utf-8').read()
facts = open(facts_f, encoding='utf-8').read()
anchor = 'intent.hash              meta      docs/plan/intent.md'
assert anchor in s, 'probe anchor not found'
s = s.replace(anchor, probes + anchor, 1)
marker = '- Intent hash: <!--fact intent.hash'
assert marker in s, 'fact anchor not found'
s = s.replace(marker, facts + marker, 1)
open(plan_md, 'w', encoding='utf-8').write(s)
PY

printf -- '\n--- 2. plan check, AFTER the proposed lines ---\n'
AFTER=$( cd "$HUB" && plan check 2>&1 | tail -1 )
printf '    %s\n' "$AFTER"
if [ "$BEFORE" = "$AFTER" ]; then
  printf '    the proposed lines add no violation and remove none\n'
else
  printf '    CHANGED -- the diff in check output:\n'
  ( cd "$HUB" && plan check 2>&1 | grep -i 'dir\.' | sed 's/^/      /' )
fi

printf -- '\n--- 3. plan refresh: what the new facts read against the trees NOW ---\n'
( cd "$HUB" && plan refresh >/dev/null 2>&1 )
python3 - "$HUB/docs/plan/plan.md" <<'PY'
import re, sys
s = open(sys.argv[1], encoding='utf-8').read()
for k in ('be.dir.repo','be.dir.gitdir','be.dir.pin','be.dir.ref',
          'fe.dir.repo','fe.dir.gitdir','fe.dir.pin','fe.dir.ref'):
    m = re.search(r'<!--fact %s [^ ]+ (\w+)-->([^<]*)<!--/fact-->' % re.escape(k), s)
    st, v = (m.group(1), m.group(2)) if m else ('MISSING', '-')
    mark = 'RED ' if st != 'ok' else '    '
    print('    %s%-16s %-7s %s' % (mark, k, st, v))
PY
printf -- '\n    the rendered sentences a reader sees:\n'
grep -E '^- (Backend|Hub) `dir`' "$HUB/docs/plan/plan.md" \
  | sed 's/<!--[^>]*-->//g; s/^/      /'

printf -- '\n--- 4. coverage: pindirs before and after ---\n'
printf '    real plan today:\n'
python3 "$LANE/pindirs.py" "$SRC/docs/plan/plan.md" --root "$SRC" > "$BENCH/c1.txt" 2>&1
E1=$?; sed 's/^/      /' "$BENCH/c1.txt"; printf '      exit=%s\n' "$E1"
printf '    with the proposed lines:\n'
python3 "$LANE/pindirs.py" "$HUB/docs/plan/plan.md" --root "$HUB" > "$BENCH/c2.txt" 2>&1
E2=$?; sed 's/^/      /' "$BENCH/c2.txt"; printf '      exit=%s\n' "$E2"
if [ "$E1" -eq 1 ] && [ "$E2" -eq 0 ]; then
  printf '\n    the coverage check goes RED -> GREEN because of these lines, and it is\n'
  printf '    the lines that did it: removing them puts it back to exit=1.\n'
else
  printf '\n    UNEXPECTED: wanted exit 1 then 0, got %s then %s\n' "$E1" "$E2"
fi

printf -- '\n--- 5. can the coverage check itself be made to fail? ---\n'
printf '    injecting one probe reading a NEW sibling dir, with no pin for it:\n'
printf '      newthing.x               wire      ../SomeOtherRepo/Services/Thing.cs   exists\n'
python3 - "$HUB/docs/plan/plan.md" <<'PY'
import sys
p = sys.argv[1]
s = open(p, encoding='utf-8').read()
anchor = 'be.dir.repo '
assert anchor in s
s = s.replace(anchor, 'newthing.x               wire      ../SomeOtherRepo/Services/Thing.cs                                      exists\n' + anchor, 1)
open(p, 'w', encoding='utf-8').write(s)
PY
python3 "$LANE/pindirs.py" "$HUB/docs/plan/plan.md" --root "$HUB" > "$BENCH/c3.txt" 2>&1
E3=$?; sed 's/^/      /' "$BENCH/c3.txt"; printf '      exit=%s\n' "$E3"
if [ "$E3" -eq 1 ]; then
  printf '    the coverage check CAN be made to fail: a dir nobody pinned reds on the\n'
  printf '    next run, which is the whole reason it exists next to the pin probes.\n'
else
  printf '    UNEXPECTED: a new unpinned dir did not red (exit=%s) -- the check is decoration\n' "$E3"
fi

[ "${KEEP:-0}" = "1" ] && printf '\n  bench kept at %s\n' "$BENCH"
[ "${KEEP:-0}" = "1" ] || rm -rf "$BENCH"
exit 0
