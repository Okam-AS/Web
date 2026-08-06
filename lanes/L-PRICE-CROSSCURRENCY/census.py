#!/usr/bin/env python3
"""Which sites actually DEPEND on the new gate, and which were already safe.

A census that cannot tell checked-and-safe from not-checked is indistinguishable from silence.  This
deletes the gate and records, per call site, whether that site's own absence assertion goes red — i.e.
whether the site was relying on the gate or on a guard it already had.
"""
import subprocess
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
GATE = os.path.join(ROOT, 'utils', 'cross-currency.js')
GATE_LINE = "  if (!isAmountStated(minor)) { return UNKNOWN_AMOUNT; }\n"


def reds():
    proc = subprocess.run(
        ['npx', 'jest', 'test/price-crosscurrency.test.js', '--coverage=false'],
        cwd=ROOT, capture_output=True, text=True)
    out = proc.stdout + proc.stderr
    return sorted({
        re.sub(r'^\s*●\s*', '', line).strip()
        for line in out.splitlines()
        if line.strip().startswith('●') and '›' in line
    })


original = open(GATE, encoding='utf-8').read()
open(GATE, 'w', encoding='utf-8').write(original.replace(GATE_LINE, ''))
try:
    failing = reds()
finally:
    open(GATE, 'w', encoding='utf-8').write(original)

print('WITH THE GATE DELETED, %d tests go red:\n' % len(failing))
for name in failing:
    print('  ' + name)

SITES = [
    'WorkforceWeekGrid.amount',
    'WorkforceRateTimeline.amountLabel',
    'MealsFundedOrders.amount',
    'MealsProgramPanel.allowancePreview',
    'EventsJourney.amount',
    'marginMoney.amount and signedAmount',
]
print('\nPER SITE:')
for site in SITES:
    depends = any(site in name for name in failing)
    print('  %-38s %s' % (site, 'DEPENDS ON THE GATE' if depends else 'already guarded upstream'))

# Checked by RE-READING, not by asking git.  `utils/cross-currency.js` is untracked, so `git diff`
# reports it clean no matter what it contains — the same vacuous check a reviewer caught in
# `mutate.py`, which was present here too and is fixed for the same reason.
print('\nrestored: re-read bytes identical to original: %s'
      % (open(GATE, encoding='utf-8').read() == original))
