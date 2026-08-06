#!/usr/bin/env python3
"""Put the defect back, one mutation at a time, and require the census to red.

A test that goes green after the fix has proved nothing on its own — this estate has already
shipped assertion shapes that could not fail. So every mutation below reintroduces a real second
`<LoginModal>` mount site, in a different way, and the run is only a pass if jest FAILS. The last
two mutations are the inverse: they must NOT red, because a census that reds on a modal written in
a comment is a census nobody can trust either.

Every file is restored from an in-memory copy in a finally block, so an interrupted run leaves the
worktree as it found it.
"""
import os
import re
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
TEST = 'test/login-modal-mounted-once.test.js'

PAGES = [
    'pages/admin/brev.vue', 'pages/admin/dinehome.vue', 'pages/admin/kitchen.vue',
    'pages/admin/lang.vue', 'pages/admin/onboarding.vue', 'pages/admin/ongoing.vue',
    'pages/admin/orders.vue', 'pages/admin/payouts.vue', 'pages/admin/statistics.vue',
    'pages/admin/wolt-calc.vue', 'pages/admin/wolt-menu.vue',
]


def run_census():
    """Returns (passed, tail_of_output)."""
    proc = subprocess.run(
        ['npx', 'jest', TEST, '--coverage=false'],
        cwd=ROOT, capture_output=True, text=True,
    )
    out = proc.stdout + proc.stderr
    return proc.returncode == 0, out


def insert_before_last(rel, needle, snippet):
    """Insert `snippet` immediately before the LAST occurrence of `needle`."""
    path = os.path.join(ROOT, rel)
    original = open(path, encoding='utf-8').read()
    idx = original.rfind(needle)
    if idx < 0:
        raise SystemExit('no %r in %s' % (needle, rel))
    mutated = original[:idx] + snippet + original[idx:]
    open(path, 'w', encoding='utf-8').write(mutated)
    return path, original


def replace_once(rel, old, new):
    path = os.path.join(ROOT, rel)
    original = open(path, encoding='utf-8').read()
    if original.count(old) != 1:
        raise SystemExit('%s occurs %d times in %s' % (old[:40], original.count(old), rel))
    open(path, 'w', encoding='utf-8').write(original.replace(old, new))
    return path, original


MUTATIONS = []

# 1..11 — the exact defect, one page at a time: the page mounts its own modal again.
for rel in PAGES:
    MUTATIONS.append((
        'the duplicate restored on %s' % rel,
        True,  # must red
        lambda rel=rel: insert_before_last(
            rel, '</AdminPage>', '<LoginModal v-if="showLogin" @close="closeLoginModal" />\n    '),
    ))

# 12 — kebab-case. Same component, different spelling; a census that only knows one spelling is a
# census somebody will walk straight past.
MUTATIONS.append((
    'kebab-case <login-modal> on pages/admin/lang.vue',
    True,
    lambda: insert_before_last('pages/admin/lang.vue', '</AdminPage>', '<login-modal />\n    '),
))

# 13 — the duplicate hidden one level down, in a component every admin route renders. This is the
# shape an import-graph census misses and the shape `components: true` makes easy to write.
MUTATIONS.append((
    'a second modal inside components/organisms/AdminPageHeader.vue',
    True,
    lambda: insert_before_last(
        'components/organisms/AdminPageHeader.vue', '  </div>\n</template>', '  <LoginModal />\n'),
))

# 14 — the duplicate on a `v-else` branch rather than in the child list. `v-if="showLogin"` is how
# BOTH modals were actually written, so a walk that does not follow `ifConditions` would have
# counted zero of the real defect.
MUTATIONS.append((
    'a second modal on a v-else branch of pages/admin/payouts.vue',
    True,
    lambda: replace_once(
        'pages/admin/payouts.vue',
        '  <AdminPage @login-success="loadPayouts">',
        '  <AdminPage @login-success="loadPayouts">\n'
        '    <span v-if="isLoading" /><LoginModal v-else />'),
))

# 15 — a modal mounted on a NON-admin page, to show test 2 sweeps wider than pages/admin/.
MUTATIONS.append((
    'a second modal on pages/workforce/join.vue (not an admin route)',
    True,
    lambda: insert_before_last('pages/workforce/join.vue', '</div>', '<LoginModal />\n    '),
))

# 16 — INVERSE. Written in an HTML comment, which a regex census would count and a compiler census
# must not. If this reds, the census is measuring text rather than structure.
MUTATIONS.append((
    'a <LoginModal> written inside an HTML comment (must NOT red)',
    False,
    lambda: insert_before_last(
        'pages/admin/lang.vue', '</AdminPage>', '<!-- <LoginModal v-if="showLogin" /> -->\n    '),
))

# 17 — INVERSE. Written in the script block as a string, same reason.
MUTATIONS.append((
    'the string "<LoginModal />" in a script comment (must NOT red)',
    False,
    lambda: replace_once(
        'pages/admin/payouts.vue',
        '  methods: {',
        '  // historical note: this page used to render <LoginModal v-if="showLogin" />\n  methods: {'),
))


# 18 — the shell mounts the duplicate itself. The one arrangement the page-level census would
# report as "one per page" if it trusted AdminPage rather than counting it.
MUTATIONS.append((
    'AdminPage.vue mounting two of its own',
    True,
    lambda: replace_once(
        'components/organisms/AdminPage.vue',
        '      <LoginModal\n        v-if="showLogin"\n        @close="closeLoginModal"\n      />',
        '      <LoginModal\n        v-if="showLogin"\n        @close="closeLoginModal"\n      />\n'
        '      <LoginModal v-if="showLogin" />'),
))

# 19 — `openLogin` deleted. The two pages that used to raise their own modal on a stale session now
# depend on it, so a test that stays green without it is not holding anything up.
MUTATIONS.append((
    'openLogin() removed from AdminPage.vue',
    True,
    lambda: replace_once(
        'components/organisms/AdminPage.vue',
        '    openLogin() {\n      this.showLogin = true;\n    },\n', ''),
))

# 20 — the class renamed. Tests 1-3 count `<LoginModal>` tags and would not notice; the two jsdom
# tests read a real document, and this is what tells them apart from a green that never looked.
MUTATIONS.append((
    'the .login-modal class renamed in LoginModal.vue',
    True,
    lambda: replace_once(
        'components/molecules/LoginModal.vue',
        '    <div class="login-modal">', '    <div class="login-modal-renamed">'),
))


def main():
    ok, out = run_census()
    if not ok:
        print('ABORT: the census is not green before mutating. Fix that first.')
        print(out[-3000:])
        return 1

    print('baseline: census GREEN on an unmutated worktree\n')
    results = []
    for name, must_red, mutate in MUTATIONS:
        path, original = mutate()
        try:
            passed, out = run_census()
        finally:
            open(path, 'w', encoding='utf-8').write(original)
        reds = not passed
        verdict = 'OK' if reds == must_red else 'FOOLED'
        expect = 'must red' if must_red else 'must stay green'
        print('%-6s %-14s %s' % (verdict, expect, name))
        if verdict == 'FOOLED':
            print(re.sub(r'\n{3,}', '\n\n', out[-1500:]))
        results.append(verdict)

    ok_after, _ = run_census()
    print('\nrestored: census %s' % ('GREEN' if ok_after else 'RED — RESTORE FAILED'))
    fooled = results.count('FOOLED')
    print('%d mutations, %d fooled the census' % (len(results), fooled))
    return 1 if (fooled or not ok_after) else 0


if __name__ == '__main__':
    sys.exit(main())
