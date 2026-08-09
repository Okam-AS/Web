#!/usr/bin/env python3
"""Is `events-enquiry-to-settlement` runnable a SECOND time? -- L-EV-JOURNEY-TIMEBOMB.

There is no live world this lane may build and no container it may start, so the LIVE half of the
exit cannot be walked and is not claimed anywhere. What CAN be walked is the mechanism underneath it:
a second consecutive run against a backend that KEPT what the first one wrote. Fixture mode normally
hides that -- every journey begins with POST /__fixture/reset -- so the reset is suppressed through
E2E_NO_RESET and the fixture process is held across both runs of an arm.

This is a PROXY for a live re-run, and the difference is stated rather than glossed: the fixture is
not SQL Server, its Events model is a model, and no artifact from this script is labelled `live`.
What the proxy does hold is the one property under test -- a world that keeps the previous run's
writes.

Two arms, and the second is the control that makes the first mean something:

    A  the spec as this lane leaves it  -- per-run subject name, both levers cleared at the end.
       BOTH runs must pass, and run 2 must find only its OWN booking.

    B  the same spec with the contact name put back to the constant it used to be.
       Run 1 must pass and run 2 must FAIL, on `toHaveCount(1)` finding two rows -- the coin flip
       this lane exists to close, reproduced in a browser instead of reasoned about.

HISTORY WORTH KEEPING. The first version of this script found BOTH arms failing at run 2, in the same
place: `.ev-pipeline__notice`, spec line 257, the step that asserts the venue is dark. That was a
THIRD re-runnability fault nobody had named -- the walk ended with `Events.Core` and
`Events.Settlement` still switched on, so the second run met a lit venue at a step that asserts
darkness, and the per-run subject name could not be reached to matter. That transcript is kept as
`consecutive-arm-A-run2-BEFORE-lever-restore.txt`: it is the observation that produced the restore
step and the lever half of the guard.

Run from a worktree that has its OWN fixture and dev server up, which must NOT be the primary
checkout -- three dev servers share that one and an acceptance walk is standing on them:

    cd <worktree>
    E2E_FIXTURE_PORT=4971 node test/e2e/fixture/api-server.js &
    E2E_WEB_PORT=3971 E2E_FIXTURE_PORT=4971 node test/e2e/scripts/dev-server.js &
    # and test/e2e/support/journey.js patched to honour E2E_NO_RESET
    python3 <this file> <worktree>
"""

import os
import re
import subprocess
import sys

SPEC = 'test/e2e/journeys/events-enquiry-to-settlement.spec.js'
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, 'consecutive-run-proof.txt')

PER_RUN = "name: 'Nina Nordmann ' + RUN,"
CONSTANT = "name: 'Nina Nordmann',"

ENV = dict(os.environ, E2E_WEB_PORT='3971', E2E_FIXTURE_PORT='4971', E2E_NO_RESET='1')

# What each run of each arm must do. A run that does the OPPOSITE is called out rather than read
# past: an arm whose control passes proves nothing about the arm that matters.
EXPECTED = {
    ('A', 1): 'pass',
    ('A', 2): 'pass',
    ('B', 1): 'pass',
    ('B', 2): 'fail',
}


def play(root):
    proc = subprocess.run(['npx', 'playwright', 'test', SPEC],
                          cwd=root, capture_output=True, text=True, env=ENV)
    return proc.returncode, proc.stdout + proc.stderr


def verdict(output):
    """The few lines that say what happened, and where."""
    error = re.search(r'^\s*(Error:.*)$', output, re.M)
    locator = re.search(r'^\s*Locator:\s*(.*)$', output, re.M)
    expected = re.search(r'^\s*Expected:\s*(.*)$', output, re.M)
    received = re.search(r'^\s*Received:\s*(.*)$', output, re.M)
    at = re.search(r'^\s+at .*(events-enquiry-to-settlement\.spec\.js:\d+)', output, re.M)
    passed = re.search(r'^\s*(\d+) passed', output, re.M)
    failed = re.search(r'^\s*(\d+) failed', output, re.M)
    return {
        'passed': passed.group(1) if passed else '0',
        'failed': failed.group(1) if failed else '0',
        'error': error.group(1).strip()[:150] if error else '',
        'locator': locator.group(1).strip()[:120] if locator else '',
        'expected': expected.group(1).strip()[:60] if expected else '',
        'received': received.group(1).strip()[:60] if received else '',
        'at': at.group(1) if at else '',
    }


def reset_world():
    proc = subprocess.run(['curl', '-s', '-o', '/dev/null', '-w', '%{http_code}',
                           '-X', 'POST', 'http://127.0.0.1:4971/__fixture/reset'],
                          capture_output=True, text=True)
    return proc.stdout.strip()


def main():
    root = sys.argv[1] if len(sys.argv) > 1 else os.getcwd()
    target = os.path.join(root, SPEC)
    original = open(target, encoding='utf-8').read()
    lines = []

    def say(text):
        print(text, flush=True)
        lines.append(text)

    arms = [
        ('A', 'per-run subject name, levers restored (what this lane ships)', PER_RUN),
        ('B', 'constant subject name (the control -- what it used to be)', CONSTANT),
    ]

    if PER_RUN not in original:
        say('ANCHOR NOT FOUND: the spec does not carry %r. Nothing was run, so nothing is proved.'
            % PER_RUN)
        open(OUT, 'w').write('\n'.join(lines) + '\n')
        return 1

    try:
        for arm, label, name in arms:
            text = original.replace(PER_RUN, name, 1)
            open(target, 'w', encoding='utf-8').write(text)
            # Each ARM starts from a clean world; the two RUNS inside it deliberately do not.
            say('=== ARM %s  %s ===' % (arm, label))
            say('    world reset before this arm : HTTP %s' % reset_world())
            for attempt in (1, 2):
                code, output = play(root)
                v = verdict(output)
                got = 'pass' if code == 0 else 'fail'
                want = EXPECTED[(arm, attempt)]
                say('    run %d : exit %d  (%s passed, %s failed)  expected %s, got %s%s' % (
                    attempt, code, v['passed'], v['failed'], want, got,
                    '' if want == got else '   <-- NOT WHAT THIS ARM CLAIMS'))
                for key in ('error', 'locator', 'expected', 'received', 'at'):
                    if v[key]:
                        say('            %-9s: %s' % (key, v[key]))
                open(os.path.join(HERE, 'consecutive-arm-%s-run%d.txt' % (arm, attempt)),
                     'w', encoding='utf-8').write(output)
            say('')
    finally:
        open(target, 'w', encoding='utf-8').write(original)
        say('spec restored to the shipped text')

    open(OUT, 'w').write('\n'.join(lines) + '\n')
    return 0


if __name__ == '__main__':
    sys.exit(main())
