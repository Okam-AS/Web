#!/usr/bin/env python3
"""Mutation proof for L-MEALS-ENROL-UI.

Each arm makes ONE surgical edit, runs the lane's instrument, restores the file, and prints the
per-arm verdict. Nothing is summarised into a count: an arm that passes when it should fail is the
whole point of running this, and a count hides exactly that.

The load-bearing arm is `page-handler-unbound`. A sibling lane found that unbinding a handler redded
NOTHING because its page tests called the handler directly — the route-with-no-caller shape wearing
test clothing. If that arm is GREEN here, this instrument proves nothing about reachability.
"""

import io
import os
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
INSTRUMENT = ['npx', 'jest', 'test/meals-enrolment-journey.test.js', '--coverage=false']
NAV_INSTRUMENT = ['npx', 'jest', 'test/meals-enrolment-journey.test.js',
                  'test/admin-nav-access.test.js', '--coverage=false']

PAGE = 'pages/admin/meals-companies.vue'
PANEL = 'components/admin/meals/MealsProgramPanel.vue'
CLIENT = 'utils/meals/admin-client.js'
NAV = 'components/organisms/AdminPageHeader.vue'
TEST = 'test/meals-enrolment-journey.test.js'

# (name, file, find, replace, expectation, instrument)
ARMS = [
    ('baseline', None, None, None, 'green', INSTRUMENT),

    # C3's own mutation: the capability's page binding.
    ('page-handler-unbound', PAGE,
     '@set-program-members="setProgramMembers"',
     '',
     'red', INSTRUMENT),

    # The control on the surface. If the test drove the method instead of the page, this stays green.
    ('panel-submit-unbound', PANEL,
     '<form v-else class="mls-form" @submit.prevent="submitEnrol">',
     '<form v-else class="mls-form" @submit.prevent>',
     'red', INSTRUMENT),

    # The client method the page calls.
    ('client-method-deleted', CLIENT,
     "  SetProgramMembers (programId, request) {\n"
     "    return this._mutate('POST', '/v1/meals/programs/' + encodeURIComponent(programId) + '/members', request);\n"
     "  }",
     "  SetProgramMembers () { return Promise.resolve({ members: [] }); }",
     'red', INSTRUMENT),

    # The route the client addresses. A path typo must not survive.
    ('client-route-company-scoped', CLIENT,
     "'/v1/meals/programs/' + encodeURIComponent(programId) + '/members'",
     "'/v1/meals/companies/' + encodeURIComponent(programId) + '/members'",
     'red', INSTRUMENT),

    # The navigation limb of C3.
    ('nav-entry-removed', NAV,
     "{ label: this.$i('nav_meals_companies'), path: '/admin/meals-companies', icon: icons.mealsCompanies, isNew: true },",
     '',
     'red', NAV_INSTRUMENT),

    # ---- Arms against the INSTRUMENT itself: is the assertion load-bearing? ----------------------

    # A read that answers eligible for everybody. This is the non-vacuity arm the brief names: a test
    # showing only the eligible case is satisfied by exactly this mutant.
    ('world-eligible-for-everybody', TEST,
     '  const eligible = membership.state === \'Active\' && enrolled && withinWindow',
     '  const eligible = true',
     'red', INSTRUMENT),

    # A write that answers 200 and changes nothing — the shape of a route bound to a no-op.
    ('world-enrolment-is-a-noop', TEST,
     "  world.programMembers.forEach((row) => {",
     "  desired.length = 0\n  world.programMembers.forEach((row) => {",
     'red', INSTRUMENT),
]


def run(cmd):
    proc = subprocess.run(cmd, cwd=ROOT, stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
    return proc.returncode, proc.stdout.decode('utf-8', 'replace')


def main():
    results = []
    for name, path, find, replace, expected, instrument in ARMS:
        original = None
        full = None
        if path is not None:
            full = os.path.join(ROOT, path)
            original = io.open(full, encoding='utf-8').read()
            if find not in original:
                print('ARM %-30s SETUP-FAILED  anchor not found in %s' % (name, path))
                results.append((name, 'SETUP-FAILED'))
                continue
            io.open(full, 'w', encoding='utf-8').write(original.replace(find, replace, 1))

        try:
            code, out = run(instrument)
        finally:
            if original is not None:
                io.open(full, 'w', encoding='utf-8').write(original)

        observed = 'green' if code == 0 else 'red'
        verdict = 'OK' if observed == expected else 'UNEXPECTED'

        failing = [line.strip() for line in out.split('\n') if line.strip().startswith('✕')]
        print('ARM %-30s expected=%-5s observed=%-5s %s' % (name, expected, observed, verdict))
        for line in failing:
            print('        %s' % line)
        if not failing and observed == 'red':
            for line in out.split('\n'):
                if 'Tests:' in line or 'Cannot find' in line or 'SyntaxError' in line:
                    print('        %s' % line.strip())
        results.append((name, verdict))

    print('')
    print('---- per-arm verdicts ----')
    for name, verdict in results:
        print('%-30s %s' % (name, verdict))

    return 0 if all(v == 'OK' for _, v in results) else 1


if __name__ == '__main__':
    sys.exit(main())
