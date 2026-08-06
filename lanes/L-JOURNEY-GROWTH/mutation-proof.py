#!/usr/bin/env python3
"""
THE MUTATION PROOF for growth-testsend-refusal.

A capture that completes proves the walk RAN. Only a mutation proves it TESTS anything: every
assertion in that journey would be equally green against a world that refused a test-send for some
other reason, or against one whose refusal this walk could never have missed. So the one clause the
journey exists to pin is removed, the walk is required to go RED at the refusal step by name, the
clause is put back, and the walk is required to go GREEN again. Both halves are recorded, because a
red that is not followed by a restored green proves only that the file was broken.

WHAT IS MUTATED, AND WHY EXACTLY THIS. `test/e2e/fixture/growth-newsletter.js` models
`GrowthNewsletterService.RequireOwnAccountAddressAsync` as two independent conditions:

    the address must be the caller's OWN            <- left alone
    and that address must be CONFIRMED              <- REMOVED by this script

Only the second is removed. The own-address equality check survives, so the walk's refusal can
disappear for exactly one reason: the confirmation clause is gone. Removing the whole guard would
have proved something weaker and easier — that a journey notices when a refusal stops happening at
all — and `F-GR-UNCONFIRMED-EMAIL` is specifically about the confirmation half, which is what makes
the address column self-asserted when it is missing.

THE FIXTURE IS RESTORED IN A `finally`. A script that dies between the two runs would leave the
harness lying for every lane after it.
"""

import hashlib
import pathlib
import re
import subprocess
import sys

REPO = pathlib.Path(__file__).resolve().parents[2]
FIXTURE = REPO / 'test' / 'e2e' / 'fixture' / 'growth-newsletter.js'
SPEC = 'test/e2e/journeys/growth-testsend-refusal.spec.js'
ARTIFACT = REPO / 'artifacts' / 'journeys' / 'growth-testsend-refusal.playwright.json'

# The confirmation clause, verbatim. Matched as an exact string rather than by regex so that a
# rewording of the surrounding guard makes this script SAY SO instead of silently mutating nothing
# and reporting a proof it never performed.
CLAUSE = "        ctx.caller.emailConfirmed === true &&\n"

# The step whose failure is the point. A red anywhere else means the mutation broke something other
# than the thing under test, and that is not a proof.
EXPECT_RED_STEP = "THE WALL: the test-send is refused to the account's OWN address"

ENV_PORTS = {'E2E_WEB_PORT': '3915', 'E2E_FIXTURE_PORT': '4915'}


def run_walk(label):
    """Runs the refusal journey once. Returns (exit_code, artifact_status, failed_step_names)."""
    import os
    env = dict(os.environ)
    env.update(ENV_PORTS)
    proc = subprocess.run(
        ['npx', 'playwright', 'test', SPEC],
        cwd=REPO, env=env, capture_output=True, text=True)
    # `.txt`, NOT `.log`: `.gitignore` line 5 ignores `*.log`, so a proof script that wrote its raw
    # evidence there would leave a committed summary standing on runs nobody can read afterwards.
    log = REPO / 'lanes' / 'L-JOURNEY-GROWTH' / ('mutation-%s-run.txt' % label)
    log.write_text(proc.stdout + proc.stderr)

    import json
    status, failed = None, []
    if ARTIFACT.exists():
        record = json.loads(ARTIFACT.read_text())
        status = record.get('status')
        failed = [s['name'] for s in record.get('steps', []) if s.get('status') != 'passed']
    return proc.returncode, status, failed


def main():
    original = FIXTURE.read_text()
    digest = hashlib.sha256(original.encode()).hexdigest()[:12]

    if original.count(CLAUSE) != 1:
        print('REFUSED: the confirmation clause is not in %s exactly once (found %d).'
              % (FIXTURE.name, original.count(CLAUSE)))
        print('         This script cannot prove anything about a guard it cannot find.')
        return 2

    lines = []
    lines.append('MUTATION PROOF - growth-testsend-refusal')
    lines.append('fixture: test/e2e/fixture/growth-newsletter.js  sha256[:12]=%s' % digest)
    lines.append('clause removed: %s' % CLAUSE.strip())
    lines.append('')

    verdict_ok = True
    # The `finally` below does NOTHING BUT RESTORE — no return, no verdict, no reporting. A `return`
    # inside it would swallow whatever exception sent us there, and a proof script that can exit
    # quietly on the way out of a mutated tree is worse than no proof script.
    try:
        # ---- ARM 1: the requirement is gone. The walk must RED, at the refusal step. -------------
        FIXTURE.write_text(original.replace(CLAUSE, ''))
        assert CLAUSE not in FIXTURE.read_text()
        code, status, failed = run_walk('red')
    finally:
        FIXTURE.write_text(original)

    lines.append('ARM 1  confirmation clause REMOVED')
    lines.append('   playwright exit code : %d   (expected: non-zero)' % code)
    lines.append('   artifact status      : %s   (expected: failed)' % status)
    lines.append('   failed steps         : %s' % (failed or '(none)'))
    arm1 = code != 0 and status == 'failed' and failed == [EXPECT_RED_STEP]
    lines.append('   ARM 1 %s' % ('PASS - the walk reds, and only at the refusal step'
                                  if arm1 else 'FAIL'))
    verdict_ok &= arm1
    lines.append('')

    restored = hashlib.sha256(FIXTURE.read_text().encode()).hexdigest()[:12]
    lines.append('fixture restored, sha256[:12]=%s  identical=%s' % (restored, restored == digest))
    if restored != digest:
        print('\n'.join(lines))
        print('REFUSED: the fixture did not come back byte-identical. Fix that before anything else.')
        return 2

    # ---- ARM 2: the requirement is back. The walk must GREEN again. ------------------------------
    code, status, failed = run_walk('green')
    lines.append('')
    lines.append('ARM 2  confirmation clause RESTORED')
    lines.append('   playwright exit code : %d   (expected: 0)' % code)
    lines.append('   artifact status      : %s   (expected: passed)' % status)
    lines.append('   failed steps         : %s' % (failed or '(none)'))
    arm2 = code == 0 and status == 'passed' and failed == []
    lines.append('   ARM 2 %s' % ('PASS - the walk is green again, so ARM 1 was the clause and not damage'
                                  if arm2 else 'FAIL'))
    verdict_ok &= arm2

    lines.append('')
    lines.append('VERDICT: %s' % ('PROVEN - the refusal walk reds when the confirmed-address '
                                  'requirement is removed, and greens when it is restored'
                                  if verdict_ok else 'NOT PROVEN'))
    lines.append('')
    lines.append('Note: the canonical artifact on disk after this script is ARM 2\'s, i.e. the green')
    lines.append('one. ARM 1\'s failed record is kept by the artifact store under runs/ and in the')
    lines.append('ledger, which is where a reader checks that the red really happened.')

    text = '\n'.join(lines)
    (REPO / 'lanes' / 'L-JOURNEY-GROWTH' / 'mutation-proof.txt').write_text(text + '\n')
    print(text)
    return 0 if verdict_ok else 1


if __name__ == '__main__':
    sys.exit(main())
