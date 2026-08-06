#!/usr/bin/env python3
"""Mutation proof for L-PRICE-CROSSCURRENCY.

A pin over a path nobody can reach is worth nothing unless it can be shown to FIRE when the path
opens.  Each mutation below reopens the hole a different way, on PRODUCTION source, and every one is
run in four recorded states: green before, red mutated, restored, green after.

The restore is a byte-for-byte write-back of the exact original text, verified by RE-READING the file
and comparing it to the bytes held in memory.  An earlier version of this script checked the restore
with `git diff --quiet`, which cannot fail for an untracked file and so printed "byte-identical: True"
vacuously for the three mutations of `utils/cross-currency.js` — a check that could not have caught a
bad restore.  The AFTER-green run was, and remains, the load-bearing evidence; this comparison is now
an honest second one.
"""
import subprocess
import sys
import os

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
GATE = os.path.join(ROOT, 'utils', 'cross-currency.js')
ORDERS = os.path.join(ROOT, 'components', 'admin', 'meals', 'MealsFundedOrders.vue')
TEST = 'test/price-crosscurrency.test.js'

GATE_LINE = "  if (!isAmountStated(minor)) { return UNKNOWN_AMOUNT; }\n"

ROUTED = "        return crossCurrencyLabel(minor, currency, this);"
INLINED = "        return this.wholeAmount(minor) + ',' + this.fractionAmount(minor) + ' ' + currency;"


def run_tests():
    proc = subprocess.run(
        ['npx', 'jest', TEST, '--coverage=false'],
        cwd=ROOT, capture_output=True, text=True)
    out = proc.stdout + proc.stderr
    passed = failed = 0
    for line in out.splitlines():
        if line.startswith('Tests:'):
            for part in line.split(':', 1)[1].split(','):
                part = part.strip()
                if part.endswith('passed'):
                    passed = int(part.split()[0])
                elif part.endswith('failed'):
                    failed = int(part.split()[0])
    names = sorted({
        line.strip().lstrip('●').strip()
        for line in out.splitlines()
        if line.strip().startswith('●') and '›' in line
    })
    return passed, failed, names


def report(label, passed, failed, names, show=0):
    print('    %-10s passed=%d failed=%d' % (label, passed, failed))
    for name in names[:show]:
        print('      RED: %s' % name)
    if show and len(names) > show:
        print('      RED: ... and %d more' % (len(names) - show))
    return failed


def restored_exactly(path, original):
    """Did the write-back actually put the original bytes back?

    Read from disk rather than asked of git: `git diff` compares against the INDEX, so for an
    untracked file it reports no difference no matter what the file now contains.
    """
    with open(path, 'rb') as handle:
        return handle.read() == original.encode('utf-8')


def mutation(name, path, transform, expect_red, show=6):
    print('\n%s' % name)
    original = open(path, encoding='utf-8').read()
    mutated = transform(original)
    assert mutated != original, 'mutation %s changed nothing — it is not testing anything' % name
    ok = True

    p, f, n = run_tests()
    ok &= (report('BEFORE', p, f, n) == 0)

    open(path, 'w', encoding='utf-8').write(mutated)
    try:
        p, f, n = run_tests()
        red = report('MUTATED', p, f, n, show)
        ok &= (red > 0)
        for needle in expect_red:
            hit = any(needle in x for x in n)
            print('      expects red in "%s": %s' % (needle, 'YES' if hit else 'NO'))
            ok &= hit
    finally:
        open(path, 'w', encoding='utf-8').write(original)

    exact = restored_exactly(path, original)
    print('    RESTORED   re-read bytes identical to original: %s' % exact)
    ok &= exact
    p, f, n = run_tests()
    ok &= (report('AFTER', p, f, n) == 0)
    print('    VERDICT    %s' % ('PIN FIRES' if ok else 'PIN DID NOT FIRE'))
    return ok


results = []

# M1 — the gate itself is deleted.  This is the literal exit criterion: "reds if the gate is removed".
results.append(mutation(
    'M1  the gate is deleted from crossCurrencyLabel',
    GATE,
    lambda s: s.replace(GATE_LINE, ''),
    ['every module mixin composes through the gate', 'crossCurrencyLabel: three worlds, not two']))

# M2 — the gate is rewritten as a truthiness check.  `!0` is `true`, so this withholds a cost of
# exactly nothing: the world that must SURVIVE.  A pin that only caught M1 would pass this.
results.append(mutation(
    'M2  the gate becomes falsiness (!minor) instead of !isAmountStated(minor)',
    GATE,
    lambda s: s.replace('if (!isAmountStated(minor))', 'if (!minor)'),
    ['prints a genuine zero as a real amount']))

# M3 — the gate answers with digits instead of the unknown mark.  Withholding the wrong thing is
# still withholding nothing: "0" is an amount.
#
# NOTE, so nobody has to rediscover it: M1 and M3 red the IDENTICAL 15 tests.  They differ in the
# VALUES observed ("0,00 SEK" from a composed absence versus "0,00 SEK" from the gate itself), not in
# which tests fail.  "Each mutation reds only where it should" is therefore precise for M2 and M4 and
# NOT for this pair; what M3 adds over M1 is that it rules out a gate that fires but answers wrongly.
results.append(mutation(
    'M3  the gate answers "0,00" instead of the unknown mark',
    GATE,
    lambda s: s.replace('{ return UNKNOWN_AMOUNT; }', "{ return '0,00 ' + currencyCode; }"),
    ['withholds the figure when the amount is null']))

# M4 — a call site is re-inlined to the raw composition, exactly as an author who never read the
# helper would write it.  This is the hole reopening at ONE site while the gate is untouched.
results.append(mutation(
    'M4  MealsFundedOrders re-inlines the raw composition',
    ORDERS,
    lambda s: s.replace(ROUTED, INLINED),
    ['MealsFundedOrders.amount', 'no surface composes money digits by hand']))

print('\n' + '=' * 78)
print('ALL FOUR MUTATIONS FIRED' if all(results) else 'AT LEAST ONE MUTATION DID NOT FIRE')
sys.exit(0 if all(results) else 1)
