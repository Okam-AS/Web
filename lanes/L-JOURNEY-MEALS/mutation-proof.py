#!/usr/bin/env python3
"""
DOES EACH MEALS WALK ACTUALLY RED WHEN THE CAPABILITY IT WALKS IS SWITCHED OFF?

    python3 lanes/L-JOURNEY-MEALS/mutation-proof.py

---- WHY THIS IS A MUTATION AND NOT A FLAG FLIP ------------------------------------------------

The exit criterion says "reds when the capability it walks is switched off". For Company Meals there
is NOTHING TO SWITCH. Measured, not assumed:

  * `Features:Meals:Module`, `Features:Meals:Statements` and `Features:Meals:Ordering` are host
    configuration read through `IOptionsMonitor`. No per-store route can see or move them, so the
    switchboard at /admin/feature-flags draws no control for any of them.
  * `meals.statements` and `meals.ordering` are withheld from the per-store catalog on purpose, so a
    `PUT /stores/{id}/feature-flags` would refuse the key.
  * `meals.module` IS in the catalog (test/e2e/fixture/world.js:239, defaultEnabled false) and DOES
    draw a switchboard row -- but `test/e2e/fixture/meals.js` calls `ctx.flagEffective` exactly zero
    times, so no meals route consults it. Turning that switch off changes nothing any of these
    journeys can see. (events.js calls it 7 times, margin.js 5, growth.js 3, training.js 3.)

So the honest lever is the clause itself. Each arm below deletes ONE capability from the world the
journey walks and requires the journey to go red; then restores it and requires green. A journey that
stays green with its clause removed is not evidence that the clause works -- it is evidence that
nothing was watching.

---- WHAT MAKES AN ARM INFORMATIVE --------------------------------------------------------------

WHERE it reds is the point, not THAT it reds. An arm records the step that failed and whether the
failure is the refusal STOPPING (informative: the product changed) or a selector missing (uninformative:
the harness broke). Arms 2 and 3 attack the same walk from opposite sides for that reason -- one removes
a refusal, the other makes the refusal leak -- and a harness that only checked "did we get an error"
would pass arm 3 while a stranger's email was printed on the page.

---- THE SHARED-CHECKOUT RULE -------------------------------------------------------------------

`test/e2e/fixture/meals.js` is carried modified by other lanes on this checkout. Every arm therefore:
sha256s the file, applies exactly one replacement, runs, and restores in a `finally` -- then re-hashes
and refuses to continue if the bytes are not what they were. The mutation window is one playwright run
long. Nothing else in the tree is written.
"""

import hashlib
import json
import os
import subprocess
import sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
LANE = os.path.join(ROOT, 'lanes', 'L-JOURNEY-MEALS')
FIXTURE = os.path.join(ROOT, 'test', 'e2e', 'fixture', 'meals.js')
ARTIFACTS = os.path.join(ROOT, 'artifacts', 'journeys')

WEB_PORT = '3760'
FIXTURE_PORT = '4760'

ADMIN_SETUP = 'test/e2e/journeys/meals-admin-setup.spec.js'
GUEST_CLAIM = 'test/e2e/journeys/meals-guest-claim.spec.js'

# name, spec, journey id, the capability switched off, find, replace, the step expected to red
ARMS = [
    (
        'A1 exactly-one-contact-channel',
        ADMIN_SETUP, 'meals-admin-setup',
        'meals.invitation.create / exactly one contact channel',
        "      if ((!email && !phone) || (email && phone)) {",
        "      if (!email && !phone) {",
        'an invitation naming BOTH channels is refused by the server',
    ),
    (
        'A2 contact-mismatch refusal removed',
        GUEST_CLAIM, 'meals-guest-claim',
        'meals.invitation.refusal.contact-mismatch',
        "    if (!matches) {",
        "    if (false) {",
        'THE ONE THAT MATTERS: refused for the right code and the wrong account',
    ),
    (
        'A3 contact-mismatch refusal LEAKS the invitee',
        GUEST_CLAIM, 'meals-guest-claim',
        'the withholding half of meals.invitation.refusal.contact-mismatch',
        "        'This invitation was issued to a different contact.');",
        "        'This invitation was issued to a different contact.', { intendedContact: invitation.contactEmail });",
        'AND IT DOES NOT SAY WHOSE INVITATION IT IS',
    ),
    (
        'A4 already-claimed refusal removed',
        GUEST_CLAIM, 'meals-guest-claim',
        'meals.invitation.refusal.already-used',
        "    if (invitation.state !== 'Pending') {",
        "    if (false) {",
        'a code somebody has already used says so, not "no longer claimable"',
    ),
]


def sha(path):
    with open(path, 'rb') as fh:
        return hashlib.sha256(fh.read()).hexdigest()


def run_journey(spec):
    """Drive a real playwright child and read the exit status off the process."""
    env = dict(os.environ, E2E_WEB_PORT=WEB_PORT, E2E_FIXTURE_PORT=FIXTURE_PORT)
    proc = subprocess.run(
        [os.path.join(ROOT, 'node_modules', '.bin', 'playwright'), 'test', spec],
        cwd=ROOT, env=env, capture_output=True, text=True, timeout=900,
    )
    return proc.returncode, proc.stdout + proc.stderr


def read_artifact(journey):
    path = os.path.join(ARTIFACTS, journey + '.playwright.json')
    try:
        with open(path) as fh:
            return json.load(fh)
    except Exception:
        return None


def failed_step(art, expected):
    """Which step did the walk stop at, and was the expected one reached at all?"""
    if not art:
        return '(no artifact)', False
    names = [s.get('name') for s in art.get('steps', [])]
    reached = expected in names
    last = names[-1] if names else '(no steps)'
    return last, reached


def main():
    original = sha(FIXTURE)
    with open(FIXTURE, encoding='utf-8') as fh:
        source = fh.read()

    lines = []

    def say(text=''):
        print(text)
        lines.append(text)

    say('MUTATION PROOF - L-JOURNEY-MEALS')
    say('fixture: test/e2e/fixture/meals.js  sha256 ' + original)
    say('ports: web ' + WEB_PORT + ' / fixture ' + FIXTURE_PORT)
    say('')

    held = True
    for name, spec, journey, capability, find, replace, expected in ARMS:
        say('=' * 96)
        say('ARM ' + name)
        say('  capability switched off : ' + capability)
        say('  journey                 : ' + journey)
        say('  expected to red at      : ' + expected)

        occurrences = source.count(find)
        if occurrences != 1:
            say('  RESULT: STOP - the clause appears ' + str(occurrences) + ' times, expected exactly 1.')
            say('  A mutation that cannot be placed exactly is not a mutation; refusing to guess.')
            held = False
            continue

        try:
            with open(FIXTURE, 'w', encoding='utf-8') as fh:
                fh.write(source.replace(find, replace))
            code, out = run_journey(spec)
        finally:
            with open(FIXTURE, 'w', encoding='utf-8') as fh:
                fh.write(source)

        after = sha(FIXTURE)
        if after != original:
            say('  RESULT: STOP - the fixture did not restore (' + after + ').')
            held = False
            break

        art = read_artifact(journey)
        stopped_at, reached = failed_step(art, expected)
        status = art.get('status') if art else '(none)'
        reporter = [l.strip() for l in out.splitlines() if 'passed' in l or 'failed' in l]
        reporter = reporter[-1] if reporter else '(no reporter line)'

        say('  exit code               : ' + str(code))
        say('  reporter                : ' + reporter)
        say('  artifact status         : ' + str(status))
        say('  walk stopped after step : ' + stopped_at)
        if code != 0 and status == 'failed':
            if reached:
                say('  DIAGNOSIS: the step ran and its assertion failed - the refusal still happened but')
                say('             said something different.')
            else:
                say('  DIAGNOSIS: the walk never completed that step - the refusal STOPPED HAPPENING.')
                say('             This is the informative red: the product changed, not the selector.')
            say('  RESULT: RED, as required.')
        else:
            say('  RESULT: *** STAYED GREEN WITH THE CAPABILITY OFF ***')
            say('          The journey does not actually watch this clause.')
            held = False
        say('  fixture restored        : ' + after + ' (identical)')
        say('')

    say('=' * 96)
    say('CONTROL - both walks with nothing mutated')
    for spec, journey in ((ADMIN_SETUP, 'meals-admin-setup'), (GUEST_CLAIM, 'meals-guest-claim')):
        code, out = run_journey(spec)
        art = read_artifact(journey)
        status = art.get('status') if art else '(none)'
        say('  ' + journey + ': exit ' + str(code) + ', artifact ' + str(status))
        if code != 0 or status != 'passed':
            say('  *** the restored tree does not walk green - everything above is void ***')
            held = False

    say('')
    say('final fixture sha256: ' + sha(FIXTURE))
    say('VERDICT: ' + ('every arm held.' if held else 'AT LEAST ONE ARM DID NOT HOLD - read above.'))

    with open(os.path.join(LANE, 'mutation-proof.txt'), 'w', encoding='utf-8') as fh:
        fh.write('\n'.join(lines) + '\n')
    return 0 if held else 1


if __name__ == '__main__':
    sys.exit(main())
