#!/usr/bin/env python3
"""Every branch this lane added, deleted one at a time, against the tests that claim to prove it.

A branch nothing reds when you remove it is dead, however green the suite is around it. Two siblings
on this same code each shipped one in a first draft, so the discipline here is mechanical: revert one
edit to exactly what stood before, run the two files that assert it, and require RED.

Run:  python3 lanes/L-CHECK-DISCOUNT-SUM-COUPLED/mutation-proof.py
"""
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
TESTS = ['test/check-discount-sum.test.js', 'test/xz-residual-sites.test.js']

# (label, file, the text this lane wrote, what stood there before)
MUTATIONS = [
    ('M1 the reducer: statedSum -> the manufactured zero it replaced',
     'components/admin/pos/CheckPanel.vue',
     'g.discountAmount = statedSum(g.discountAmount, line.discountAmount);',
     'g.discountAmount += line.discountAmount || 0;'),

    ('M2 the footer sum: statedSum -> the `|| 0` the old ruling called unreachable',
     'components/admin/pos/CheckPanel.vue',
     'return statedSum(...this.groups.map(g => g.discountAmount));',
     'return this.groups.reduce((sum, g) => sum + (g.discountAmount || 0), 0);'),

    ('M3 the footer row guard: isDeductionInPlay -> `> 0`',
     'components/admin/pos/CheckPanel.vue',
     '<div v-if="showsDiscountTotal" class="check-panel__total-row">',
     '<div v-if="totalDiscount > 0" class="check-panel__total-row">'),

    ('M4 the line row guard: isDeductionInPlay -> `> 0`',
     'components/admin/pos/CheckLine.vue',
     '<p v-if="showsDiscount" class="check-line__discount">',
     '<p v-if="group.discountAmount > 0" class="check-line__discount">'),

    ('M5 the discount button highlight: one answer -> a second one',
     'components/admin/pos/CheckLine.vue',
     "'check-line__disc-btn--set': showsDiscount }",
     "'check-line__disc-btn--set': group.discountAmount > 0 }"),

    ('M6 the return branch: isDeductionInPlay -> `> 0` (refunds the listed price)',
     'components/admin/pos/SellScreen.vue',
     'if (isDeductionInPlay(g.discountAmount)) {',
     'if (g.discountAmount > 0) {'),

    ('M7 the predicate loses its absence branch (an unstated amount reads as none)',
     'utils/price.js',
     '  if (!isAmountStated(amountMinor)) { return true }\n  return Number(amountMinor) > 0',
     '  return Number(amountMinor) > 0'),

    ('M8 the predicate loses its relational branch (a zero discount on every bill)',
     'utils/price.js',
     '  if (!isAmountStated(amountMinor)) { return true }\n  return Number(amountMinor) > 0',
     '  return true'),
]


def run_tests():
    proc = subprocess.run(
        ['npx', 'jest', '--coverage=false', *TESTS],
        cwd=ROOT, capture_output=True, text=True)
    tail = [ln for ln in proc.stderr.splitlines() if ln.startswith('Tests:')]
    return proc.returncode, (tail[-1] if tail else proc.stderr.strip().splitlines()[-1])


def main():
    print('BASELINE (every edit in place)')
    code, line = run_tests()
    print('  %-6s %s' % ('GREEN' if code == 0 else 'RED', line))
    if code != 0:
        print('\nthe unmutated tree is not green; nothing below would mean anything.')
        return 1

    failures = []
    for label, rel, present, before in MUTATIONS:
        path = ROOT / rel
        original = path.read_text()
        if present not in original:
            print('\n%s\n  SKIPPED -- the text this mutation reverts is not in %s' % (label, rel))
            failures.append(label)
            continue
        path.write_text(original.replace(present, before, 1))
        try:
            code, line = run_tests()
        finally:
            path.write_text(original)
        verdict = 'RED (branch is load-bearing)' if code != 0 else 'GREEN -- DEAD BRANCH'
        print('\n%s\n  %s\n  %s' % (label, verdict, line))
        if code == 0:
            failures.append(label)

    print('\n' + '=' * 78)
    if failures:
        print('DEAD OR UNVERIFIABLE BRANCHES: %d' % len(failures))
        for f in failures:
            print('  ' + f)
        return 1
    print('all %d mutations red. no branch in this change is carried by a green.' % len(MUTATIONS))

    code, line = run_tests()
    print('\nrestored: %-6s %s' % ('GREEN' if code == 0 else 'RED', line))
    return 0 if code == 0 else 1


if __name__ == '__main__':
    sys.exit(main())
