#!/usr/bin/env python3
"""Mutation receipt for L-A-FAILED-REPORT-READ-REACHES-THE-OPERATOR.

Restores from an IN-MEMORY BUFFER and asserts the bytes afterwards. It never runs
`git checkout -- <file>`: this lane's work is uncommitted while the driver runs, and a
checkout-based restore would revert to HEAD and delete it.

A mutation whose search string is not found aborts the run — a no-op mutation is
indistinguishable from a test that cannot fail.

Usage:  python3 lanes/L-A-FAILED-REPORT-READ-REACHES-THE-OPERATOR/mutate.py
"""
import json
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
TESTS = [
    "test/statistics-reads-surface-their-failure.test.js",
    "test/growth-poweruser-page.test.js",
]

RULE = "utils/request-failure.js"
STATS = "pages/admin/statistics.vue"
WOLT = "pages/admin/wolt-drive-invoice.vue"
SETT = "pages/admin/settlements.vue"

MUTATIONS = [
    # ---- the shared rule -------------------------------------------------------------------------
    ("rule: the server's own reason is ignored", RULE,
     "if (error && error.hasBackendMessage && error.message) { return error.message }",
     ""),
    ("rule: a page-side throw is dressed up as a transport failure", RULE,
     "  if (!error || !('hasBackendMessage' in error)) {\n    return (error && error.message) || translate('requestFailure_unknown')\n  }\n",
     ""),
    ("rule: an expired session loses its own sentence", RULE,
     "if (status === 401) { return translate('requestFailure_sessionExpired') }",
     ""),
    ("rule: a refusal loses its own sentence", RULE,
     "if (status === 403) { return translate('requestFailure_notAllowed') }",
     ""),
    ("rule: being offline loses its own sentence", RULE,
     "if (status === undefined || status === null) { return translate('requestFailure_offline') }",
     ""),
    ("rule: a server error loses its own sentence", RULE,
     "return translate('requestFailure_serverError', { status })",
     "return translate('requestFailure_unknown')"),
    ("rule: 401 and 403 are collapsed into one sentence", RULE,
     "if (status === 403) { return translate('requestFailure_notAllowed') }",
     "if (status === 403) { return translate('requestFailure_sessionExpired') }"),

    # ---- statistics.vue --------------------------------------------------------------------------
    ("statistics: the failure goes back to the console only", STATS,
     "          this.loadError = describeRequestFailure(error, (key, params) => this.$i(key, params));\n",
     ""),
    ("statistics: the failure panel is removed from the template", STATS,
     '        v-else-if="loadError"',
     '        v-else-if="false"'),
    ("statistics: a retry no longer clears the previous failure", STATS,
     "      this.loadError = '';\n      this.ordersSummary = [];",
     "      this.ordersSummary = [];"),

    # ---- wolt-drive-invoice.vue ------------------------------------------------------------------
    ("wolt: the failure goes back to the console only", WOLT,
     "        this.loadError = describeRequestFailure(error, (key, params) => this.$i(key, params));\n",
     ""),
    ("wolt: the empty state speaks for a failed read again", WOLT,
     'v-if="!isLoading && !loadError && selectedStoreId && (!report || report.totalOrderCount === 0)"',
     'v-if="!isLoading && selectedStoreId && (!report || report.totalOrderCount === 0)"'),
    ("wolt: the failure panel is removed from the template", WOLT,
     'v-if="!isLoading && selectedStoreId && loadError"',
     'v-if="false"'),

    # ---- settlements.vue -------------------------------------------------------------------------
    ("settlements: the fixed 'could not load' line comes back", SETT,
     '        this.loadError = describeRequestFailure(error, (key, params) => this.$i(key, params));\n        this.settlementData = null;\n        this.showNotification(this.loadError, "error");',
     '        this.showNotification(this.$i("settlements_loadError"), "error");'),
    ("settlements: the empty state speaks for a failed read again", SETT,
     'v-if="!isLoading && !loadError && selectedStoreId && (!settlementData || settlementData.totalDinteroOrders === 0)"',
     'v-if="!isLoading && selectedStoreId && (!settlementData || settlementData.totalDinteroOrders === 0)"'),
    ("settlements: the failure panel is removed from the template", SETT,
     'v-if="!isLoading && selectedStoreId && loadError"',
     'v-if="false"'),

    # Pins the CONTROL arms — the ones asserting that a successful or genuinely empty read is still
    # reported as such. Without these, "shows no failure panel" and "still says the period was
    # empty" would be satisfied by a page that had simply lost its empty state, and the arms above
    # would be consistent with a page that shows an error for everything.
    ("statistics: the failure panel shows even when nothing failed", STATS,
     '        v-else-if="loadError"',
     '        v-else-if="true"'),
    ("wolt: the empty state is gone entirely", WOLT,
     'v-if="!isLoading && !loadError && selectedStoreId && (!report || report.totalOrderCount === 0)"',
     'v-if="false"'),
    ("settlements: the empty state is gone entirely", SETT,
     'v-if="!isLoading && !loadError && selectedStoreId && (!settlementData || settlementData.totalDinteroOrders === 0)"',
     'v-if="false"'),
    ("statistics: a good read is reported as a failure", STATS,
     "          this.loadError = describeRequestFailure(error, (key, params) => this.$i(key, params));\n",
     "          this.loadError = 'x';\n"),
]

FILES = {RULE, STATS, WOLT, SETT}


def run_tests(files=None):
    proc = subprocess.run(["npx", "jest", *(files or TESTS), "--coverage=false", "--verbose"],
                          cwd=ROOT, capture_output=True, text=True)
    out = proc.stdout + proc.stderr
    passed, failed = set(), set()
    for line in out.splitlines():
        s = line.strip()
        m = re.match(r"^[✓√]\s+(.*?)(?:\s+\(\d+\s*ms\))?$", s)
        if m:
            passed.add(m.group(1).strip()); continue
        m = re.match(r"^[✕×]\s+(.*?)(?:\s+\(\d+\s*ms\))?$", s)
        if m:
            failed.add(m.group(1).strip())
    return passed, failed


def main():
    # The buffer the restore comes from. Read once, before anything is touched.
    originals = {p: (ROOT / p).read_text() for p in FILES}

    print("=== baseline ===")
    base_pass, base_fail = run_tests()
    print(f"  green {len(base_pass)}  red {len(base_fail)}")
    if base_fail:
        for n in sorted(base_fail):
            print(f"   RED: {n}", file=sys.stderr)
        return 1

    # This lane owns the new file's arms; the growth file's arms belong to a prior lane and are run
    # only to prove the shared-rule extraction did not disturb them.
    mine, _ = run_tests([TESTS[0]])
    in_scope = mine & base_pass
    inherited = base_pass - in_scope
    print(f"  arms in this lane's scope: {len(in_scope)}")
    print(f"  inherited arms run as a regression check: {len(inherited)}")

    killed_by = {name: [] for name in in_scope}
    collateral = set()

    for label, rel, find, replace in MUTATIONS:
        path = ROOT / rel
        original = originals[rel]
        if find not in original:
            print(f"!! mutation search string not found: {label}", file=sys.stderr)
            for p, t in originals.items():
                (ROOT / p).write_text(t)
            return 1
        path.write_text(original.replace(find, replace, 1))
        try:
            _, failed = run_tests()
        finally:
            path.write_text(original)                     # restore from the buffer, never from git
            assert path.read_text() == original, f"{rel} did not restore"
        newly = sorted(failed & in_scope)
        spill = failed & inherited
        collateral |= spill
        print(f"\n-- {label}\n   reds {len(newly)}"
              + (f" (+{len(spill)} inherited)" if spill else "")
              + ": " + ("; ".join(newly) if newly else "NONE"))
        for n in newly:
            killed_by[n].append(label)

    for p, t in originals.items():
        assert (ROOT / p).read_text() == t, f"{p} was not restored"
    print("\nall files verified byte-identical to the pre-run buffer")

    survivors = [n for n, m in killed_by.items() if not m]
    unused = [m[0] for m in MUTATIONS if not any(m[0] in v for v in killed_by.values())]
    print("\n=== receipt ===")
    print(f"arms in scope                 : {len(in_scope)}")
    print(f"arms red under >=1 mutation   : {len(in_scope) - len(survivors)}")
    print(f"arms no mutation could break  : {len(survivors)}")
    print(f"mutations applied             : {len(MUTATIONS)}")
    print(f"mutations that killed nothing : {len(unused)}")
    for n in survivors:
        print(f"   SURVIVOR: {n}")
    for m in unused:
        print(f"   KILLED NOTHING: {m}")
    print(f"inherited arms disturbed      : {len(collateral)}")

    (Path(__file__).parent / "mutation-receipt.json").write_text(
        json.dumps({"killed_by": killed_by, "survivors": survivors, "unused_mutations": unused,
                    "inherited_disturbed": sorted(collateral),
                    "mutations": [m[0] for m in MUTATIONS]}, indent=1, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    sys.exit(main())
