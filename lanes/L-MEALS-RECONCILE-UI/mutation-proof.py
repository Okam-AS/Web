#!/usr/bin/env python3
"""Mutation proof for L-MEALS-RECONCILE-UI.

THE TWO TRAPS THIS IS SHAPED AROUND, and they fail in opposite directions:

  * MEASURING THE WRONG TREE. A mutation applied to one checkout while jest runs in another yields
    GREEN mutants — the suite never sees the defect. Excluded by refusing to run unless the tree is
    this lane's worktree, by mutating only absolute paths under it, and by asserting the mutation is
    actually present in the file after it is written.
  * MEASURING A STALE ARTEFACT. A restore that preserves an old mtime (an `mv` of a backup) can leave
    a runner measuring the previous state, which yields RED restores. Excluded by restoring through a
    content write and by requiring the restore run to be GREEN every time.

So the expected sequence per mutation is GREEN -> RED -> GREEN. A run of all-green says the wrong
tree; a run whose restores are red says a stale artefact. Alternation rules out both.
"""

import pathlib
import subprocess
import sys

ROOT = pathlib.Path('/Users/svendaneel/okam/web-mealsrecon')
SUITES = [
    'test/meals-reconciliation-page.test.js',
    'test/meals-page.test.js',
    'test/meals-client.test.js',
    'test/admin-nav-access.test.js',
]

# (label, file, needle, replacement)
MUTATIONS = [
    ('M1 namedBlockers stops scoping to the billed company',
     'utils/meals/reconcile-view.js',
     "? queue.exceptions.filter(row => row.blocksStatement && row.companyId === scope)",
     "? queue.exceptions.filter(row => row.blocksStatement)"),

    ('M2 namedBlockers names resolved rows too',
     'utils/meals/reconcile-view.js',
     "? queue.exceptions.filter(row => row.blocksStatement && row.companyId === scope)",
     "? queue.exceptions.filter(row => row.companyId === scope)"),

    ('M3 namedIsComplete always claims completeness',
     'utils/meals/reconcile-view.js',
     "namedIsComplete: serverCount !== null && rows.length === serverCount",
     "namedIsComplete: true"),

    ('M4 the resolve control is unbound',
     'components/admin/meals/MealsReconciliationQueue.vue',
     '                  @click="openResolve(row)"\n',
     ''),

    ('M5 the page stops listening for the queue resolve event',
     'pages/admin/meals-agreements.vue',
     '        @resolve="resolveException"\n',
     ''),

    ('M6 the venue page stops reading the queue',
     'pages/admin/meals-agreements.vue',
     "        this._mealsStoreService.ListReconciliation(this.storeId)\n          .catch((e) => { this.reconciliationRefusal = refusalOf(e); return null; })",
     "        Promise.resolve(null)"),

    ('M7 a blocked finalize stops re-reading the queue it was refused over',
     'pages/admin/meals-agreements.vue',
     "        // Nothing was written, so the DRAFT on screen stays exactly as it was read — only the queue\n        // is re-read, and only for the refusal that is about the queue.\n        if (isOpenExceptionsRefusal(outcome.error)) { await this.loadReconciliation(); }\n",
     ''),

    ('M8 the blocked banner counts instead of naming (the defect this lane exists for)',
     'components/admin/meals/MealsMonthClose.vue',
     '        <ul v-if="blockers.named.length" class="mls-close__blockers" data-test="close-blocked-list">',
     '        <ul v-if="false" class="mls-close__blockers" data-test="close-blocked-list">'),

    ('M9 the sidebar drops the venue surface entirely',
     'components/organisms/AdminPageHeader.vue',
     "              { label: this.$i('nav_meals'), path: '/admin/meals-agreements', icon: icons.mealsAgreements, isNew: true },\n",
     ''),
]


def guard_tree():
    top = subprocess.run(['git', 'rev-parse', '--show-toplevel'], cwd=ROOT,
                         capture_output=True, text=True).stdout.strip()
    if pathlib.Path(top).resolve() != ROOT.resolve():
        sys.exit('REFUSING: git toplevel is %s, not %s' % (top, ROOT))
    branch = subprocess.run(['git', 'branch', '--show-current'], cwd=ROOT,
                            capture_output=True, text=True).stdout.strip()
    print('tree   : %s' % ROOT)
    print('branch : %s' % branch)


def run_suites():
    proc = subprocess.run(['npx', 'jest'] + SUITES + ['--coverage=false'],
                          cwd=ROOT, capture_output=True, text=True)
    tail = [ln for ln in proc.stderr.splitlines() if ln.startswith('Tests:')]
    return proc.returncode == 0, (tail[0] if tail else '?')


def main():
    guard_tree()
    ok, line = run_suites()
    print('BASE      : %s  %s' % ('GREEN' if ok else 'RED', line))
    if not ok:
        sys.exit('REFUSING: the baseline is not green; nothing below would mean anything.')

    failures = []
    for label, rel, needle, repl in MUTATIONS:
        path = ROOT / rel
        original = path.read_text(encoding='utf-8')
        if needle not in original:
            failures.append('%s: needle absent — the mutation would have been a no-op' % label)
            print('SKIP      : %s (needle absent)' % label)
            continue

        path.write_text(original.replace(needle, repl, 1), encoding='utf-8')
        # The wrong-tree guard: the file on disk must actually differ now.
        assert path.read_text(encoding='utf-8') != original, label
        mut_ok, mut_line = run_suites()

        # Restored by writing content, never by moving a backup over it.
        path.write_text(original, encoding='utf-8')
        assert path.read_text(encoding='utf-8') == original, label
        res_ok, res_line = run_suites()

        print('%-8s  : mutant %-5s | restore %-5s | %s' % (
            'MUTANT', 'RED' if not mut_ok else 'GREEN', 'GREEN' if res_ok else 'RED', label))
        print('            mutant %s' % mut_line)
        if mut_ok:
            failures.append('%s SURVIVED — no assertion refuses it' % label)
        if not res_ok:
            failures.append('%s restore stayed RED — a stale artefact was measured' % label)

    print('')
    if failures:
        for f in failures:
            print('FAIL: %s' % f)
        sys.exit(1)
    print('ALL %d MUTANTS KILLED; every restore green.' % len(MUTATIONS))


if __name__ == '__main__':
    main()
