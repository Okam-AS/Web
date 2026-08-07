#!/usr/bin/env python3
"""Every branch this lane relies on, reverted one at a time, against the tests that claim to prove it.

A branch nothing reds when you remove it is dead, however green the suite is around it. Three lanes
on this same code have now each caught one in a first draft, so the discipline is mechanical: put
back exactly what stood before, run the files that assert it, and require RED.

M1 and M4 are this lane's own edits. M2 and M3 revert the SHARED predicate `isDeductionInPlay` rather
than this component, because after this lane the receipt is a third caller of it and the tests here
have to be able to see a change to it. M5 is the reverse direction: it puts back the construction
`L-XZ-RESIDUAL-SITES` removed, which was unreachable while the guard hid every absence and which THIS
lane makes reachable for the first time — so the sign fix stops being covered by a guard and starts
being covered by an assertion.

Run:  python3 lanes/L-RECEIPT-DISCOUNT-ROW-DROPPED/mutation-proof.py
"""
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
TESTS = ['test/receipt-discount-row.test.js', 'test/xz-residual-sites.test.js']

# (label, file, the text as it stands now, what it is reverted to)
MUTATIONS = [
    ('M1 the receipt row guard: isDeductionInPlay -> the `> 0` that dropped the row',
     'components/admin/pos/PosReceiptView.vue',
     '<div v-if="showsDiscount(line)" class="receipt__line-sub receipt__line-discount">',
     '<div v-if="line.discountAmount > 0" class="receipt__line-sub receipt__line-discount">'),

    ('M2 the predicate loses its absence branch (an unstated deduction reads as none)',
     'utils/price.js',
     '  if (!isAmountStated(amountMinor)) { return true }\n  return Number(amountMinor) > 0',
     '  return Number(amountMinor) > 0'),

    ('M3 the predicate loses its relational branch (a kr 0,00 deduction on every receipt line)',
     'utils/price.js',
     '  if (!isAmountStated(amountMinor)) { return true }\n  return Number(amountMinor) > 0',
     '  return true'),

    ('M4 the method answers off the raw field instead of the rule (a stated zero would render)',
     'components/admin/pos/PosReceiptView.vue',
     'return isDeductionInPlay(line.discountAmount);',
     "return !('discountAmount' in line) || line.discountAmount !== 0;"),

    ('M5 the label loses its sign ownership -> the pre-XZ `−{{ priceLabel(x) }}`, now reachable',
     'components/admin/pos/PosReceiptView.vue',
     '{{ line.discountReason || $i(\'pos_discount\') }} {{ negatedPriceLabel(line.discountAmount) }}',
     '{{ line.discountReason || $i(\'pos_discount\') }} −{{ priceLabel(line.discountAmount) }}'),
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
