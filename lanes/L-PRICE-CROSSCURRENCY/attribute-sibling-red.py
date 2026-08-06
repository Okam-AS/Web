#!/usr/bin/env python3
"""Which of the frontend suite's reds belong to THIS lane?

An argument ("I only edited script blocks, the error is a template parse") is not evidence.  This
discovers every failing suite for itself, puts every file this lane touched back to its HEAD content,
re-runs each of them, and restores.  A suite that fails identically with none of this lane's work in
the tree is not this lane's.

An earlier version checked ONE suite by name while the commit message claimed two were covered.  It
now enumerates them, so the record cannot fall behind the claim again, and it names the owning lane
for each rather than leaving "another lane" unattributed.

Only THIS lane's files are moved.  Nothing belonging to any other lane is reverted, stashed or
cleaned, and the two new files are moved aside rather than deleted.
"""
import subprocess
import os
import re
import shutil

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
HERE = os.path.dirname(os.path.abspath(__file__))
PARK = os.path.join(HERE, 'parked')
MINE = 'test/price-crosscurrency.test.js'

TRACKED = [
    'components/admin/workforce/WorkforceWeekGrid.vue',
    'components/admin/workforce-rates/WorkforceRateTimeline.vue',
    'components/admin/meals/MealsFundedOrders.vue',
    'components/admin/meals/MealsProgramPanel.vue',
    'components/admin/events/EventsJourney.vue',
    'utils/margin/money.js',
    'plugins/global-mixin.js',
]
UNTRACKED = ['utils/cross-currency.js', MINE]


def jest(*args):
    proc = subprocess.run(['npx', 'jest', *args, '--coverage=false'],
                          cwd=ROOT, capture_output=True, text=True)
    return proc.stdout + proc.stderr


def failing_suites():
    out = jest()
    return sorted({line.split(None, 1)[1].strip()
                   for line in out.splitlines() if line.startswith('FAIL ')})


def verdict(suite):
    out = jest(suite)
    if not re.search(r'^FAIL ', out, re.M):
        return 'PASS'
    return 'FAIL (%s)' % ('suite failed to LOAD' if 'failed to run' in out else 'assertion(s) failed')


def owner(suite):
    """Whose file is it?  This lane's, another lane's, or the branch's."""
    if suite in UNTRACKED or suite in TRACKED:
        return 'THIS LANE'
    if suite.startswith('lanes/'):
        return 'lane %s (its own untracked scratch)' % suite.split('/')[1]
    state = subprocess.run(['git', 'status', '--porcelain', '--', suite],
                           cwd=ROOT, capture_output=True, text=True).stdout.strip()
    if state.startswith('??'):
        return 'another lane, UNTRACKED (in no commit)'
    if state:
        return 'another lane, uncommitted edit to a tracked file'
    return 'committed on the branch - NOT a lane in flight'


reds = failing_suites()
print('FAILING SUITES IN THE FULL FRONTEND RUN: %d\n' % len(reds))
for suite in reds:
    print('  %-62s %s' % (suite, owner(suite)))

print('\nWITH THIS LANE\'S WORK IN THE TREE:')
before = {s: verdict(s) for s in reds}
for suite, v in before.items():
    print('  %-62s %s' % (suite, v))

held = {}
os.makedirs(PARK, exist_ok=True)
for rel in TRACKED:
    path = os.path.join(ROOT, rel)
    held[rel] = open(path, encoding='utf-8').read()
    head = subprocess.run(['git', 'show', 'HEAD:' + rel], cwd=ROOT,
                          capture_output=True, text=True).stdout
    open(path, 'w', encoding='utf-8').write(head)
for rel in UNTRACKED:
    shutil.move(os.path.join(ROOT, rel), os.path.join(PARK, os.path.basename(rel)))

after = {}
try:
    print('\nWITH EVERY FILE THIS LANE TOUCHED BACK AT HEAD:')
    after = {s: verdict(s) for s in reds if s not in UNTRACKED}
    for suite, v in after.items():
        print('  %-62s %s' % (suite, v))
finally:
    for rel, text in held.items():
        open(os.path.join(ROOT, rel), 'w', encoding='utf-8').write(text)
    for rel in UNTRACKED:
        shutil.move(os.path.join(PARK, os.path.basename(rel)), os.path.join(ROOT, rel))
    os.rmdir(PARK)

# The restore, checked by RE-READING rather than by asking git, which cannot see an untracked file.
exact = all(open(os.path.join(ROOT, rel), encoding='utf-8').read() == text
            for rel, text in held.items())
print('\nRESTORE  every tracked file re-read byte-identical: %s' % exact)
print('         both new files back in place: %s'
      % all(os.path.exists(os.path.join(ROOT, rel)) for rel in UNTRACKED))

print('\nVERDICT')
unchanged = [s for s in after if after[s] == before[s]]
print('  fails identically WITHOUT this lane\'s work, so NOT this lane\'s: %d of %d'
      % (len(unchanged), len(after)))
for suite in unchanged:
    print('    %-60s %s' % (suite, owner(suite)))
changed = [s for s in after if after[s] != before[s]]
if changed:
    print('  CHANGED when this lane\'s work was removed - INVESTIGATE:')
    for suite in changed:
        print('    %s: %s -> %s' % (suite, before[suite], after[suite]))
else:
    print('  none changed.')

print('\nTHIS LANE\'S OWN SUITE, after restoring: %s' % verdict(MINE))
