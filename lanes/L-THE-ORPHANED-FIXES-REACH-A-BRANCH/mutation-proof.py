#!/usr/bin/env python3
"""
Mutation proof for the three fixes this lane cherry-picked onto the trunk.

WHY IT IS RE-RUN HERE RATHER THAN INHERITED. Each of the three refs carries its own mutation log,
written against the base it was cut from. This lane rebased all three onto a trunk that had moved,
so those logs prove something about a tree that no longer exists. The question this file answers is
narrower and is the only one that matters after a rebase: at THIS tip, does each guard that the
three fixes introduced still have a test standing behind it?

Each mutation is a byte-exact replacement written into the working file, the pinned suite is run
against it, and the file is restored with `git checkout --`. A mutation that does not red is
reported as SURVIVED, which per the brief means the test behind it should be deleted rather than
kept.
"""
import subprocess
import sys
import pathlib

ROOT = pathlib.Path(__file__).resolve().parents[2]

# (id, file, find, replace, suite, what the guard is for)
MUTATIONS = [
    ("M1", "components/admin/pos/PosReceiptView.vue",
     "return isDeductionInPlay(line.discountAmount);",
     "return line.discountAmount > 0;",
     "test/receipt-discount-row.test.js",
     "the receipt deduction row, back to the `> 0` guard the fix removed"),

    ("M2", "components/admin/pos/CheckPanel.vue",
     "g.lineAmount = statedSum(g.lineAmount, line.netLineAmount);",
     "g.lineAmount += line.netLineAmount;",
     "test/check-lineamount-sum.test.js",
     "the row total that IS the refund, back to a bare `+=` off the wire object"),

    ("M3", "components/admin/pos/CheckPanel.vue",
     "g.depositAmount = statedSum(g.depositAmount, line.depositAmount);",
     "g.depositAmount += line.depositAmount || 0;",
     "test/check-lineamount-sum.test.js",
     "the pant sum, back to the `|| 0` coercion"),

    ("M4", "components/admin/pos/SellScreen.vue",
     """      const unpriceable = groups.filter(g => !isAmountStated(g.lineAmount));
      if (unpriceable.length) {
        this.notify(this.$i('pos_negative_sale_unpriceable', {
          names: unpriceable.map(g => g.name).join(', ')
        }), 'error');
        return;
      }
""",
     "",
     "test/check-lineamount-sum.test.js",
     "the refusal itself deleted, so an unpriceable bill builds a return again"),

    ("M5", "components/admin/pos/CheckLine.vue",
     "return isAmountInPlay(this.group.depositAmount);",
     "return this.group.depositAmount > 0;",
     "test/check-lineamount-sum.test.js",
     "the pant tag, back to `> 0` — the sum's defect moved one screen down"),

    ("M6", "utils/price.js",
     "  if (!isAmountStated(amountMinor)) { return true }\n  return Number(amountMinor) > 0\n}",
     "  if (!isAmountStated(amountMinor)) { return true }\n  return Number(amountMinor) >= 0\n}",
     "test/check-lineamount-sum.test.js",
     "the shared predicate, so a stated zero starts counting as in play"),

    ("M7", "components/shared/OfferDocument.vue",
     """        if (!isAmountStated(item[field]) || !isAmountStated(item.quantity)) {
          return null;
        }""",
     """        if (!isAmountStated(item[field]) || !isAmountStated(item.quantity)) {
          return 0;
        }""",
     "test/price-absence.test.js",
     "the offer column gate, so an unstated line folds back in as a zero"),

    ("M8", "components/shared/OfferDocument.vue",
     'v-if="hasUnstatedTotal"',
     'v-if="false"',
     "test/price-absence.test.js",
     "the note that tells the reader why there is no total"),
]


def run(cmd, **kw):
    return subprocess.run(cmd, cwd=ROOT, capture_output=True, text=True, **kw)


def suite_reds(suite):
    r = run(["npx", "jest", "--ci", suite, "--coverage=false"])
    out = r.stdout + r.stderr
    for line in out.splitlines():
        if line.startswith("Tests:"):
            return ("failed" in line), line.strip()
    return None, "NO SUMMARY LINE — the suite did not run"


def main():
    results = []
    for mid, relpath, find, repl, suite, what in MUTATIONS:
        path = ROOT / relpath
        original = path.read_text()

        n = original.count(find)
        if n != 1:
            results.append((mid, relpath, suite, "ANCHOR", f"anchor matched {n} times, expected 1"))
            print(f"{mid}  ANCHOR PROBLEM  {relpath}: matched {n} times", flush=True)
            continue

        path.write_text(original.replace(find, repl, 1))
        try:
            red, summary = suite_reds(suite)
        finally:
            restore = run(["git", "checkout", "--", relpath])
            assert restore.returncode == 0, f"could not restore {relpath}"
            assert path.read_text() == original, f"restore did not match the byte copy for {relpath}"

        verdict = "RED" if red else "SURVIVED"
        results.append((mid, relpath, suite, verdict, summary))
        print(f"{mid}  {verdict:9} {relpath:42} {summary}   [{what}]", flush=True)

    print()
    red = sum(1 for r in results if r[3] == "RED")
    print(f"{red}/{len(MUTATIONS)} mutations red. "
          f"{'Every guard has a test behind it.' if red == len(MUTATIONS) else 'SURVIVORS ABOVE.'}")
    dirty = run(["git", "status", "--short"]).stdout.strip()
    print(f"working tree after restore: {dirty if dirty else 'clean'}")
    return 0 if red == len(MUTATIONS) and not dirty else 1


if __name__ == "__main__":
    sys.exit(main())
