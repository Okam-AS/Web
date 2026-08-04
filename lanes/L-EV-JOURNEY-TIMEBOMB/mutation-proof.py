#!/usr/bin/env python3
"""Mutation proof for test/journey-rerunnability.test.js -- L-EV-JOURNEY-TIMEBOMB.

Every mutation puts back ONE of the two faults this lane closed, or breaks ONE arm of the guard that
refuses them, and the guard must RED and must red BY NAME. A pin nobody watched fail is not a pin.

Written in Python rather than shell on purpose: zsh does not word-split an unquoted variable, so a
`for` loop over a list in a variable iterates ONCE with the whole string and reports a plausible
answer having run nothing. Every mutation below prints its own line.

Nothing is left behind: each mutation is written into the real file, jest is run against it, and the
original bytes are restored in a `finally` whether jest passed, failed or the process died.

    python3 lanes/L-EV-JOURNEY-TIMEBOMB/mutation-proof.py
"""

import os
import subprocess
import sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
SPEC = 'test/e2e/journeys/events-enquiry-to-settlement.spec.js'
GUARD = 'test/journey-rerunnability.test.js'
OUT = os.path.join(ROOT, 'lanes', 'L-EV-JOURNEY-TIMEBOMB', 'mutation-proof.txt')

# name, file, [(old, new), ...], what the mutation puts back, the test that must name it
MUTATIONS = [
    ('A-date-literal-back', SPEC,
     [("expiryDay: daysFromNow(60),", "expiryDay: '2026-11-30',")],
     'the offer expiry written down again, exactly as it stood before this lane',
     'carries no written-down calendar date at all'),

    ('B-constant-subject-name', SPEC,
     [("name: 'Nina Nordmann ' + RUN,", "name: 'Nina Nordmann',")],
     'the contact name back to a constant, so a second run makes a second row with it',
     'GUEST.name is different on a second run'),

    ('C-row-found-by-a-bare-string', SPEC,
     [("{ hasText: GUEST.name }", "{ hasText: 'Nina Nordmann' }")],
     'the row located by a bare string instead of by this run\'s subject',
     'every hasText: argument is either a per-run subject or recorded copy'),

    ('D-run-token-made-constant', SPEC,
     [("const RUN = Date.now().toString(36) + Math.random().toString(16).slice(2, 6);",
       "const RUN = 'nina-nordmann';")],
     'the run token replaced by a constant -- the subtlest revert, since every reference still reads',
     'two invocations of its own naming path disagree'),

    ('E-convention-drift', SPEC,
     [("return new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);",
       "return new Date(Date.now() + days * 24 * 3600 * 1000).toISOString().slice(0, 10);")],
     'one of the two Events specs re-spelling the shared helper, which is how two conventions start',
     'both Events specs declare `daysFromNow` identically'),

    ('F-past-date-literal', SPEC,
     [("date: daysFromNow(120),", "date: '2026-07-01',")],
     'a date literal that is already PAST -- not a countdown today, and refused anyway, because a '
     'past literal in a journey that makes its own world is next year\'s countdown',
     'carries no written-down calendar date at all'),

    ('G-guard-blanker-loses-its-place', GUARD,
     [("if (c === '/' && !/[A-Za-z0-9_)\\]}]/.test(previous)) {",
       "if (false) {")],
     'the guard\'s own reader made regex-blind, so the lone quote inside '
     '/Navigation cancelled from "../ swallows the rest of the file it is reading',
     'the blanker survives a regex literal carrying a quote'),

    ('H-ledger-stops-matching-the-corpus', GUARD,
     [("literal: '2026-08-15',", "literal: '2029-12-31',")],
     'the ledger pointed at a date that is not in the tree, which is both an unaccounted countdown '
     'still in the corpus and a ledger entry naming nothing',
     'every date literal still in the future is in the ledger'),

    ('I-registered-spec-buys-an-exemption', GUARD,
     [("const KNOWN_COUNTDOWNS = [\n  {",
       "const KNOWN_COUNTDOWNS = [\n  { file: 'events-enquiry-to-settlement.spec.js', "
       "literal: '2026-11-30', why: 'x'.repeat(50) },\n  {")],
     'a registered journey excusing its own countdown by writing itself into the ledger',
     'a registered journey cannot buy an exemption'),
]


def jest():
    proc = subprocess.run(
        ['npx', 'jest', GUARD, '--coverage=false'],
        cwd=ROOT, capture_output=True, text=True)
    return proc.returncode, proc.stdout + proc.stderr


def failing_test_names(output):
    names = []
    for line in output.splitlines():
        stripped = line.strip()
        if stripped.startswith('✕') or stripped.startswith('x '):
            names.append(stripped.lstrip('✕x ').strip())
    return names


def main():
    lines = []

    def say(text):
        print(text)
        lines.append(text)

    code, output = jest()
    say('=== BASELINE : jest exit %d ===' % code)
    say('    %s' % [l for l in output.splitlines() if l.startswith('Tests:')])
    if code != 0:
        say('    BASELINE IS NOT GREEN. Nothing below would mean anything; stopping.')
        open(OUT, 'w').write('\n'.join(lines) + '\n')
        return 1

    for name, rel, edits, what, expected in MUTATIONS:
        target = os.path.join(ROOT, rel)
        original = open(target, encoding='utf-8').read()
        try:
            text = original
            applied = 0
            for old, new in edits:
                if old not in text:
                    continue
                text = text.replace(old, new, 1)
                applied += 1
            if applied == 0:
                say('=== %s : ANCHOR NOT FOUND -- nothing was mutated, so nothing was proved ===' % name)
                say('    first anchor: %s' % edits[0][0][:90])
                continue
            open(target, 'w', encoding='utf-8').write(text)
            code, output = jest()
            failed = failing_test_names(output)
            say('=== %s : jest exit %d ===' % (name, code))
            say('    puts back : %s' % what)
            say('    in        : %s' % rel)
            say('    reds      : %s' % ('; '.join(failed) if failed else '(NOTHING -- the guard did not notice)'))
            hit = [f for f in failed if expected in f]
            say('    by name   : %s' % ('YES -- ' + hit[0] if hit else 'NO -- expected a red naming "%s"' % expected))
        finally:
            open(target, 'w', encoding='utf-8').write(original)

        code, output = jest()
        say('    restored  : jest exit %d (%s)' % (
            code, [l for l in output.splitlines() if l.startswith('Tests:')]))
        say('')

    code, output = jest()
    say('=== FINAL : jest exit %d ===' % code)
    say('    %s' % [l for l in output.splitlines() if l.startswith('Tests:')])
    open(OUT, 'w').write('\n'.join(lines) + '\n')
    return 0


if __name__ == '__main__':
    sys.exit(main())
