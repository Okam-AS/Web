#!/bin/sh
# pinbench — prove that a probe can refuse to answer from the wrong ref.
#
# Rules it holds itself to (inherited from scripts/drift-demo/demo.sh, which
# learned them the hard way):
#
#   1. The real estate is never the bench. Nothing outside BENCH/ is written,
#      and ../OkamAPI-modules is never checked out to another ref: another lane
#      is standing in it.
#   2. Every catch is proved by DISABLING the guard and re-running the IDENTICAL
#      mutation. If the mutation sails through, the guard was decoration.
#   3. The bench MUST live outside every git repository. `plan` resolves probe
#      sources against the GIT REPO ROOT, so a bench plan sitting inside
#      Web-modules reads the REAL sibling checkouts and reports a pass.
#   4. Every assertion names the VALUE it expects, never only the status. The
#      first draft of this bench asserted `unconf` alone and three acts passed
#      while the bench had failed to build at all -- a check that passes on an
#      empty world is the silent instrument this lane exists to remove.
#
# The instrument under test is four probe lines. They read git's own
# per-worktree bookkeeping -- never a stamp -- so nothing has to be re-run for
# them to be current:
#
#   <dir>/.git                         ->  which REPO + WORKTREE this dir is
#   <repo>/.git/worktrees/<name>/HEAD  ->  which REF that worktree is on
#
set -u
SRC=/Users/svendaneel/okam/Web-modules
BENCH=${PINBENCH:-/private/tmp/claude-501/-Users-svendaneel-okam/766072d3-8965-4c45-be67-76b407d86aaf/scratchpad/L-PROBE-DIR-IS-PINNED-bench}

case "$BENCH" in /*) ;; *) echo "BENCH must be an absolute path"; exit 2 ;; esac
if ( cd "$(dirname "$BENCH")" 2>/dev/null && git rev-parse --show-toplevel >/dev/null 2>&1 ); then
  echo "REFUSING: the bench path is inside a git repository -- $BENCH"
  echo "  a bench inside a repo reads that repo's real siblings and reports a pass."
  exit 2
fi

PASS=0; FAIL=0
ok()  { PASS=$((PASS+1)); printf '   PASS  %s\n' "$1"; }
bad() { FAIL=$((FAIL+1)); printf '   FAIL  %s\n' "$1"; }
act() { printf '\n=== %s ===\n' "$1"; }

DECLARED=feature/restaurant-modules

rm -rf "$BENCH"; mkdir -p "$BENCH"

# ------------------------------------------------------------- bench build ----
# Mirrors the REAL topology exactly: a main repo with a linked worktree beside
# it, which is what ../OkamAPI-modules is -- its .git is a *file* pointing into
# ../OkamAPI/.git/worktrees/OkamAPI-modules.
( cd "$BENCH"
  mkdir Api && cd Api
  git init -q -b trunk .
  git config user.email d@d; git config user.name d
  printf 'public class Program { /* AllowCredentials */ }\n' > Program.cs
  git add Program.cs && git commit -qm "declared world"
  git branch "$DECLARED"
  git branch lane/meals-grace-pins
  git worktree add -q "$BENCH/Api-modules" "$DECLARED"
) >/dev/null 2>&1

# A SECOND repo, so "this dir is a different repo entirely" is real rather than
# mimed. It is deliberately ALSO on the declared branch: the branch name is
# right and the repo is wrong, which is the shape the brief names -- a ref
# without its repo.
( cd "$BENCH"
  mkdir Other && cd Other
  git init -q -b trunk .
  git config user.email d@d; git config user.name d
  printf 'x\n' > f.txt; git add f.txt; git commit -qm base
  git branch "$DECLARED"
  git worktree add -q "$BENCH/Other-modules" "$DECLARED"
) >/dev/null 2>&1

if [ ! -f "$BENCH/Api-modules/.git" ] || [ ! -f "$BENCH/Other-modules/.git" ]; then
  echo "BENCH BUILD FAILED -- refusing to report results from an empty world"
  exit 2
fi
echo "bench built: Api-modules on $( cd "$BENCH/Api-modules" && git rev-parse --abbrev-ref HEAD )"

# The hub: a git repo standing in for Web-modules, carrying a copy of the REAL
# plan so the REAL tool parses a plan it already accepts.
mkdir -p "$BENCH/Hub/docs/plan"
cp "$SRC/docs/plan/plan.md" "$SRC/docs/plan/intent.md" "$BENCH/Hub/docs/plan/"
( cd "$BENCH/Hub" && git init -q -b "$DECLARED" . && git config user.email d@d \
  && git config user.name d && git add docs && git commit -qm plan ) >/dev/null 2>&1

# ------------------------------------------------------- instrument install ---
# The four probe lines, plus the fact spans without which `plan refresh` never
# evaluates them -- a probe with no span is never read, which is the
# W-PROBE-UNUSED shape this plan already carries a note about.
install_probes() {   # $1 = pin extractor (the clause under test)
python3 - "$BENCH/Hub" "$1" <<'PY'
import sys, re
hub, pinext = sys.argv[1], sys.argv[2]
p = hub + '/docs/plan/plan.md'
s = open(p, encoding='utf-8').read()
lines = (
 "be.dir.repo              meta      ../Api-modules/.git                        contains:/Api/.git/worktrees/Api-modules\n"
 "be.dir.gitdir            meta      ../Api-modules/.git                        regex:^gitdir: (.+)$\n"
 "be.dir.pin               meta      ../Api/.git/worktrees/Api-modules/HEAD     " + pinext + "\n"
 "be.dir.ref               meta      ../Api/.git/worktrees/Api-modules/HEAD     regex:^(?:ref: refs/heads/)?(.+)$\n"
)
s = re.sub(r'(?m)^be\.dir\.[a-z]+ .*\n', '', s)
s = s.replace('intent.hash              meta      docs/plan/intent.md',
              lines + 'intent.hash              meta      docs/plan/intent.md', 1)
span = ('\nBENCH dir=<!--fact be.dir.repo 2026-08-06T00:00Z unconf-->pending<!--/fact--> '
        'repo=<!--fact be.dir.gitdir 2026-08-06T00:00Z unconf-->pending<!--/fact--> '
        'pin=<!--fact be.dir.pin 2026-08-06T00:00Z unconf-->pending<!--/fact--> '
        'ref=<!--fact be.dir.ref 2026-08-06T00:00Z unconf-->pending<!--/fact-->\n')
if 'BENCH dir=' not in s:
    s = s + span
open(p, 'w', encoding='utf-8').write(s)
PY
}

read_facts() {
  python3 - "$BENCH/Hub/docs/plan/plan.md" <<'PY'
import re, sys
s = open(sys.argv[1], encoding='utf-8').read()
for k in ('be.dir.repo','be.dir.gitdir','be.dir.pin','be.dir.ref'):
    m = re.search(r'<!--fact %s [^ ]+ (\w+)-->([^<]*)<!--/fact-->' % re.escape(k), s)
    print('%-16s %-7s %s' % (k, m.group(1) if m else '?', m.group(2) if m else '?'))
PY
}

refresh()   { ( cd "$BENCH/Hub" && plan refresh >/dev/null 2>&1 ); }
show()      { read_facts | sed 's/^/     /'; }
status_of() { read_facts | awk -v k="$1" '$1==k {print $2}'; }
value_of()  { read_facts | awk -v k="$1" '$1==k {print $3}'; }

printf '=================================================================\n'
printf '  PIN BENCH -- can a probe refuse to answer from the wrong ref?\n'
printf '  declared world: %s\n' "$DECLARED"
printf '=================================================================\n'

install_probes "contains:ref: refs/heads/$DECLARED"

# ==================================================================== ACT 0 ====
act "ACT 0  baseline -- the scratch checkout IS on the declared ref"
refresh; show
if [ "$(status_of be.dir.pin)"  = "ok" ] && [ "$(value_of be.dir.ref)" = "$DECLARED" ] \
&& [ "$(status_of be.dir.repo)" = "ok" ] \
&& [ "$(value_of be.dir.gitdir)" = "$BENCH/Api/.git/worktrees/Api-modules" ]; then
  ok "green when it should be green, and it NAMES the repo it read: $(value_of be.dir.gitdir)"
else
  bad "baseline was not green -- everything below would be meaningless"
  echo "BASELINE FAILED"; exit 1
fi

# ==================================================================== ACT 1 ====
act "ACT 1  THE MUTATION -- a sibling lane checks out its own branch here"
echo "   injecting: git checkout lane/meals-grace-pins in the SCRATCH worktree"
( cd "$BENCH/Api-modules" && git checkout -q lane/meals-grace-pins ) || { bad "checkout failed"; exit 1; }
refresh; show
S=$(status_of be.dir.pin); F=$(value_of be.dir.ref)
echo "   the probe says:  expected=$DECLARED   found=$F   pin=$S"
if [ "$S" = "unconf" ] && [ "$F" = "lane/meals-grace-pins" ]; then
  ok "RED, and BOTH refs are named: declared $DECLARED, found $F"
else
  bad "expected pin=unconf and found=lane/meals-grace-pins; got pin=$S found=$F"
fi

echo "   FALSIFYING -- weaken the pin to a probe with no declared ref in it"
install_probes "exists"
refresh
S2=$(status_of be.dir.pin)
echo "   with 'exists' in place of the declared-ref clause, the SAME mutation reads: pin=$S2"
if [ "$S2" = "ok" ]; then
  ok "falsified: the declared-ref clause is load-bearing. Without it the wrong ref"
  echo "         sails through green -- which is the state this plan is in today."
else
  bad "the weakened probe did not go green; the falsification proves nothing"
fi
install_probes "contains:ref: refs/heads/$DECLARED"

# ==================================================================== ACT 2 ====
act "ACT 2  a detached HEAD -- a real state, and not a branch"
( cd "$BENCH/Api-modules" && git checkout -q "$DECLARED" ); refresh   # re-green first
SHA=$( cd "$BENCH/Api-modules" && git rev-parse HEAD )
( cd "$BENCH/Api-modules" && git checkout -q --detach HEAD )
refresh; show
if [ "$(status_of be.dir.pin)" = "unconf" ] && [ "$(value_of be.dir.ref)" = "$SHA" ]; then
  ok "RED on a detached HEAD, and the found value is the sha $SHA, not a branch name"
else
  bad "detached HEAD: pin=$(status_of be.dir.pin) ref=$(value_of be.dir.ref), wanted unconf/$SHA"
fi

# ==================================================================== ACT 3 ====
act "ACT 3  the dir is a DIFFERENT REPO -- a ref with no repo behind it"
( cd "$BENCH/Api-modules" && git checkout -q "$DECLARED" ); refresh   # re-green first
echo "   injecting: point Api-modules/.git at the OTHER repo's worktree,"
echo "   which is ALSO on $DECLARED -- right branch name, wrong repo"
cp "$BENCH/Api-modules/.git" "$BENCH/api-modules-git.bak"
printf 'gitdir: %s/Other/.git/worktrees/Other-modules\n' "$BENCH" > "$BENCH/Api-modules/.git"
refresh; show
GD=$(value_of be.dir.gitdir)
if [ "$(status_of be.dir.repo)" = "unconf" ] && [ "$GD" = "$BENCH/Other/.git/worktrees/Other-modules" ]; then
  ok "RED, and be.dir.gitdir NAMES the repo it actually found: $GD"
  echo "         A branch check alone cannot see this: the branch name was correct."
else
  bad "foreign repo: repo=$(status_of be.dir.repo) gitdir=$GD"
fi
cp "$BENCH/api-modules-git.bak" "$BENCH/Api-modules/.git"

# ==================================================================== ACT 4 ====
act "ACT 4  the dir is gone entirely"
refresh                                   # re-green, so there is a value to retain
[ "$(status_of be.dir.repo)" = "ok" ] || { bad "could not re-green before ACT 4"; }
LAST=$(value_of be.dir.gitdir)
mv "$BENCH/Api-modules/.git" "$BENCH/Api-modules/.git.off"
refresh; show
if [ "$(status_of be.dir.repo)" = "unconf" ] && [ "$(value_of be.dir.gitdir)" = "$LAST" ]; then
  ok "RED on absence, and retain-and-mark kept the last value beside the mark"
  echo "         (blanking it would erase the fact that there ever WAS an answer)"
else
  bad "absence: repo=$(status_of be.dir.repo) gitdir=$(value_of be.dir.gitdir), wanted unconf/$LAST"
fi
mv "$BENCH/Api-modules/.git.off" "$BENCH/Api-modules/.git"

# ==================================================================== ACT 5 ====
act "ACT 5  back on the declared ref -- a guard must be able to go green again"
refresh; show
if [ "$(status_of be.dir.pin)" = "ok" ] && [ "$(status_of be.dir.repo)" = "ok" ] \
&& [ "$(value_of be.dir.ref)" = "$DECLARED" ]; then
  ok "green again: this is a guard, not a permanent red nobody reads"
else
  bad "the guard could not return to green -- it would be ignored within a day"
fi

# ==================================================================== ACT 6 ====
act "ACT 6  THE LIMIT -- shown, not claimed"
BEFORE_SHA=$( cd "$BENCH/Api-modules" && git rev-parse HEAD )
( cd "$BENCH/Api-modules" && printf 'moved\n' > New.cs && git add New.cs \
  && git commit -qm "the branch moved under the pin" ) >/dev/null 2>&1
AFTER_SHA=$( cd "$BENCH/Api-modules" && git rev-parse HEAD )
refresh; show
if [ "$(status_of be.dir.pin)" = "ok" ] && [ "$BEFORE_SHA" != "$AFTER_SHA" ]; then
  ok "the pin is green at $BEFORE_SHA and green at $AFTER_SHA."
  echo "         Branch IDENTITY is what this instrument answers. Branch POSITION"
  echo "         -- which commit, how far behind -- it does not, and it must not be"
  echo "         read as if it did. Position is what commits_behind_integration in"
  echo "         WORLD.json answers, and that one IS a stamp, so it goes stale."
  echo "         No commit-level probe is offered here: the only file a probe could"
  echo "         read for it is refs/heads/<branch>, which vanishes into packed-refs"
  echo "         and would red for a reason that has nothing to do with drift."
else
  bad "the limit is not what was claimed: pin=$(status_of be.dir.pin) $BEFORE_SHA -> $AFTER_SHA"
fi

printf '\n=================================================================\n'
printf '  caught+falsified: %s     failures: %s\n' "$PASS" "$FAIL"
printf '=================================================================\n'
[ "${KEEP:-0}" = "1" ] && printf '  bench kept at %s\n' "$BENCH"
[ "${KEEP:-0}" = "1" ] || rm -rf "$BENCH"
[ "$FAIL" -eq 0 ] || exit 1
exit 0
