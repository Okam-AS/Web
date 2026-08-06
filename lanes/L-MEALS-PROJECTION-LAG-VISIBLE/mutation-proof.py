#!/usr/bin/env python3
"""Mutation proof for L-MEALS-PROJECTION-LAG-VISIBLE.

ONE TREE IS MUTATED AND THE SAME TREE IS MEASURED. A sibling this week reported a false GREEN by
mutating one checkout while running the suite in another, so TREE below is used for the edit, for the
`git diff --stat` that PROVES the edit landed, and as the jest cwd. Nothing outside it is touched.

The tree is an isolated worktree rather than the shared checkout because three sibling lanes are live
in `/Users/svendaneel/okam/Web-modules` right now, and a mutation applied there for the four seconds
a jest run takes would red THEIR suites, not mine.

Each mutant must RED. A mutant that survives is reported as SURVIVED and is a hole in the assertion,
never a reason to change the world until it dies.
"""

import subprocess
import sys
from pathlib import Path

TREE = Path("/Users/svendaneel/okam/wt-mrglagvis")
SUITE = "test/margin-statements-page.test.js"

PAGE = "pages/admin/margin-statements.vue"
TESTS = "test/margin-statements-page.test.js"
NO = "translations/no.ts"

MUTANTS = [
    (
        "re-gate the whole panel behind isPowerUser (the defect this lane removes)",
        PAGE,
        '            <section class="mrgs-card">\n              <h2 class="mrgs-card__title">\n                {{ $i(\'mrgs_projection_title\') }}',
        '            <section v-if="isPowerUser" class="mrgs-card">\n              <h2 class="mrgs-card__title">\n                {{ $i(\'mrgs_projection_title\') }}',
    ),
    (
        "unbind the gate note from its computed (a constant in its place)",
        PAGE,
        '{{ projectionGateLabel }}',
        "{{ $i('mrgs_projection_gate_current') }}",
    ),
    (
        "make the gate always read 'caught up' (kill the behind branch)",
        PAGE,
        "return read.lag > 0\n        ? this.$i('mrgs_projection_gate_behind', { lag: read.lag })\n        : this.$i('mrgs_projection_gate_current');",
        "return this.$i('mrgs_projection_gate_current');",
    ),
    (
        "coerce instead of withholding: Number(null) === 0 turns 'not established' into a zero",
        PAGE,
        "return typeof value === 'number' && Number.isFinite(value) ? value : null;",
        "return Number.isFinite(Number(value)) ? Number(value) : null;",
    ),
    (
        "drop the status re-read after a lag refusal (panel keeps contradicting the refusal)",
        PAGE,
        "this.failure = this.describeProjectionRefusal(e);\n          await this.refreshProjection();",
        "this.failure = this.describeProjectionRefusal(e);",
    ),
    (
        "stop intercepting margin.projection-behind (fall through to the generic sentence)",
        PAGE,
        "if (isMarginApiError(e) && e.code === MARGIN_PROJECTION_BEHIND) {",
        "if (false && isMarginApiError(e) && e.code === MARGIN_PROJECTION_BEHIND) {",
    ),
    (
        "size the refusal from the panel's re-read instead of the refusal's own extension",
        PAGE,
        "const lag = finiteNumber((error.problem || {}).lagEntries);",
        "const lag = this.projectionLag ? this.projectionLag.lag : null;",
    ),
    (
        "delete one new key from the Norwegian dictionary only",
        NO,
        "  mrgs_projection_gate_behind: 'Uken kan ikke fryses",
        "  mrgs_projection_gate_behind_TYPO: 'Uken kan ikke fryses",
    ),
    (
        "POSITIVE CONTROL: a no-op edit inside the suite must stay GREEN",
        TESTS,
        "describe('the venue can read the projection lag its own freeze waits on', () => {",
        "describe('the venue can read the projection lag its own freeze waits on', () => { // no-op",
    ),
]


def run_suite():
    proc = subprocess.run(
        ["npx", "jest", SUITE, "--coverage=false"],
        cwd=TREE, capture_output=True, text=True,
    )
    return proc.returncode, proc.stdout + proc.stderr


def main():
    baseline_rc, baseline_out = run_suite()
    print("BASELINE (unmutated): rc=%d" % baseline_rc)
    print([l for l in baseline_out.splitlines() if l.startswith("Tests:")])
    if baseline_rc != 0:
        print("BASELINE IS RED — nothing below means anything. Stopping.")
        return 1

    verdicts = []
    for name, rel, old, new in MUTANTS:
        path = TREE / rel
        original = path.read_text()
        if original.count(old) != 1:
            verdicts.append((name, "ANCHOR-MISSED (%d matches)" % original.count(old)))
            print("\n=== %s\n    ANCHOR MISSED — not a result" % name)
            continue
        path.write_text(original.replace(old, new, 1))

        # PROOF THE EDIT LANDED IN THE TREE ABOUT TO BE MEASURED, not in some other one.
        diffstat = subprocess.run(
            ["git", "diff", "--numstat", "--", rel], cwd=TREE, capture_output=True, text=True
        ).stdout.strip()

        rc, out = run_suite()
        path.write_text(original)

        tests_line = next((l for l in out.splitlines() if l.startswith("Tests:")), "?")
        expect_green = name.startswith("POSITIVE CONTROL")
        died = (rc != 0)
        verdict = "GREEN (as required)" if expect_green and not died else (
            "SURVIVED — HOLE IN THE ASSERTION" if expect_green == died else "DIED (assertion bites)"
        )
        verdicts.append((name, verdict))
        print("\n=== %s\n    diff in measured tree: %s\n    %s\n    %s" % (name, diffstat, tests_line, verdict))

    print("\n" + "=" * 78)
    for name, verdict in verdicts:
        print("%-70s %s" % (name[:70], verdict))

    # The tree must be back exactly as it started.
    left = subprocess.run(["git", "diff", "--numstat"], cwd=TREE, capture_output=True, text=True).stdout
    print("\nTREE AFTER (should be the lane's own six files only):\n" + left)
    return 0


if __name__ == "__main__":
    sys.exit(main())
