#!/bin/sh
# pinlive — run the SAME instrument, through the REAL `plan` tool, against the
# REAL checkouts, and write nothing outside the bench.
#
# The bench hub is a throwaway git repo outside every real repository; the probe
# sources are ABSOLUTE paths at the real trees, so the tool opens the real files
# read-only. Nothing is checked out, nothing in ../OkamAPI-modules is touched.
#
# In the plan itself these same sources are written relative to the hub repo
# root -- ../OkamAPI-modules/.git and ../OkamAPI/.git/worktrees/... -- which
# resolve to the identical files. That equivalence is asserted below rather than
# assumed.
set -u
SRC=/Users/svendaneel/okam/Web-modules
BENCH=${PINLIVE:-/private/tmp/claude-501/-Users-svendaneel-okam/766072d3-8965-4c45-be67-76b407d86aaf/scratchpad/L-PROBE-DIR-IS-PINNED-live}
DECLARED=feature/restaurant-modules

case "$BENCH" in /*) ;; *) echo "BENCH must be absolute"; exit 2 ;; esac
if ( cd "$(dirname "$BENCH")" 2>/dev/null && git rev-parse --show-toplevel >/dev/null 2>&1 ); then
  echo "REFUSING: bench path is inside a git repository"; exit 2
fi

rm -rf "$BENCH"; mkdir -p "$BENCH/Hub/docs/plan"
cp "$SRC/docs/plan/plan.md" "$SRC/docs/plan/intent.md" "$BENCH/Hub/docs/plan/"
( cd "$BENCH/Hub" && git init -q -b "$DECLARED" . && git config user.email d@d \
  && git config user.name d && git add docs && git commit -qm plan ) >/dev/null 2>&1

python3 - "$BENCH/Hub" "$DECLARED" <<'PY'
import sys, re
hub, declared = sys.argv[1], sys.argv[2]
p = hub + '/docs/plan/plan.md'
s = open(p, encoding='utf-8').read()
L = [
 ("be.dir.repo",  "/Users/svendaneel/okam/OkamAPI-modules/.git",
                  "contains:/OkamAPI/.git/worktrees/OkamAPI-modules"),
 ("be.dir.gitdir","/Users/svendaneel/okam/OkamAPI-modules/.git",
                  "regex:^gitdir: (.+)$"),
 ("be.dir.pin",   "/Users/svendaneel/okam/OkamAPI/.git/worktrees/OkamAPI-modules/HEAD",
                  "contains:ref: refs/heads/" + declared),
 ("be.dir.ref",   "/Users/svendaneel/okam/OkamAPI/.git/worktrees/OkamAPI-modules/HEAD",
                  "regex:^(?:ref: refs/heads/)?(.+)$"),
 ("fe.dir.repo",  "/Users/svendaneel/okam/Web-modules/.git",
                  "contains:/Web/.git/worktrees/Web-modules"),
 ("fe.dir.gitdir","/Users/svendaneel/okam/Web-modules/.git",
                  "regex:^gitdir: (.+)$"),
 ("fe.dir.pin",   "/Users/svendaneel/okam/Web/.git/worktrees/Web-modules/HEAD",
                  "contains:ref: refs/heads/" + declared),
 ("fe.dir.ref",   "/Users/svendaneel/okam/Web/.git/worktrees/Web-modules/HEAD",
                  "regex:^(?:ref: refs/heads/)?(.+)$"),
]
lines = "".join("%-24s meta      %-72s %s\n" % (k, src, ext) for k, src, ext in L)
s = s.replace('intent.hash              meta      docs/plan/intent.md',
              lines + 'intent.hash              meta      docs/plan/intent.md', 1)
span = "\nLIVE " + " ".join(
    "%s=<!--fact %s 2026-08-06T00:00Z unconf-->pending<!--/fact-->" % (k, k)
    for k, _, _ in L) + "\n"
s += span
open(p, 'w', encoding='utf-8').write(s)
PY

( cd "$BENCH/Hub" && plan refresh >/dev/null 2>&1 )

printf '=================================================================\n'
printf '  LIVE ARM -- the real tool, the real trees, read-only\n'
printf '  declared world (world.config): %s\n' "$DECLARED"
printf '=================================================================\n'
python3 - "$BENCH/Hub/docs/plan/plan.md" "$DECLARED" <<'PY'
import re, sys
s = open(sys.argv[1], encoding='utf-8').read()
declared = sys.argv[2]
def f(k):
    m = re.search(r'<!--fact %s [^ ]+ (\w+)-->([^<]*)<!--/fact-->' % re.escape(k), s)
    return (m.group(1), m.group(2)) if m else ('?', '?')
for who, dirpath in (('be', '../OkamAPI-modules'), ('fe', '.  (the hub itself)')):
    rs, rv = f(who + '.dir.repo'); gs, gv = f(who + '.dir.gitdir')
    ps, pv = f(who + '.dir.pin');  fs, fv = f(who + '.dir.ref')
    verdict = 'PINNED' if ps == 'ok' and rs == 'ok' else 'MISMATCH'
    print()
    print('  dir %s' % dirpath)
    print('    repo   %-7s %s' % (rs, gv))
    print('    ref    declared=%s  found=%s' % (declared, fv))
    print('    pin    %-7s -> %s' % (ps, verdict))
PY

printf '\n  --- the facts the plan carries for the same question today ---\n'
grep -o '<!--fact fe.world.branch [^>]*-->[^<]*<!--/fact-->' "$SRC/docs/plan/plan.md" | sed 's/^/    /'
grep -o '<!--fact fe.world [^>]*-->[^<]*<!--/fact-->'        "$SRC/docs/plan/plan.md" | sed 's/^/    /'
grep -o '<!--fact be.world.branch [^>]*-->[^<]*<!--/fact-->' "$SRC/docs/plan/plan.md" | sed 's/^/    /'
printf '    (source: artifacts/world/WORLD.json, stamped %s / %s)\n' \
  "$(python3 -c "import json;print(json.load(open('$SRC/artifacts/world/WORLD.json'))['stamped_at'])")" \
  "$(python3 -c "import json;print(json.load(open('$SRC/../OkamAPI-modules/artifacts/world/WORLD.json'))['stamped_at'])")"

printf '\n  --- git itself, for comparison ---\n'
printf '    Web-modules      %s\n' "$(git -C "$SRC" rev-parse --abbrev-ref HEAD)"
printf '    OkamAPI-modules  %s\n' "$(git -C "$SRC/../OkamAPI-modules" rev-parse --abbrev-ref HEAD)"

printf '\n  --- relative form resolves to the same files (this is what the plan gets) ---\n'
python3 - "$SRC" <<'PY'
import glob, os, sys
root = sys.argv[1]
for rel, absolute in (
   ('../OkamAPI-modules/.git',                        '/Users/svendaneel/okam/OkamAPI-modules/.git'),
   ('../OkamAPI/.git/worktrees/OkamAPI-modules/HEAD',  '/Users/svendaneel/okam/OkamAPI/.git/worktrees/OkamAPI-modules/HEAD'),
   ('.git',                                            '/Users/svendaneel/okam/Web-modules/.git'),
   ('../Web/.git/worktrees/Web-modules/HEAD',          '/Users/svendaneel/okam/Web/.git/worktrees/Web-modules/HEAD')):
    hits = [h for h in glob.glob(os.path.join(root, rel)) if os.path.isfile(h)]
    same = bool(hits) and os.path.samefile(hits[0], absolute)
    print('    %-46s -> %s' % (rel, 'SAME FILE' if same else 'MISMATCH/ABSENT'))
PY

[ "${KEEP:-0}" = "1" ] || rm -rf "$BENCH"
exit 0
