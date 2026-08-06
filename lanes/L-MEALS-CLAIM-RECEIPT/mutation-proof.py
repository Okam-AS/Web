#!/usr/bin/env python3
"""Non-vacuity for L-MEALS-CLAIM-RECEIPT.

Four states, each named and each run for real:

  1 BASELINE            both branches intact          -> expect GREEN
  2 IGNORE-REFERENCE    receipt never reads the       -> expect the PRESENT-case pins RED
                        employee reference
  3 IGNORE-FALLBACK     receipt never falls back to   -> expect the ABSENT-case pins RED
                        the membership id
  4 RESTORED            file byte-identical to 1      -> expect GREEN again

Each arm edits pages/meals/join.vue, runs jest WITHOUT --no-build semantics (jest compiles the SFC
on every run; the babel/vue-jest cache is dropped with --no-cache so the mutated file is what is
actually executed), records the per-test verdicts, and restores.  Per-item output, never a count.
"""
import json
import pathlib
import re
import shutil
import subprocess
import sys

ROOT = pathlib.Path("/Users/svendaneel/okam/web-meals-claim-receipt")
PAGE = ROOT / "pages/meals/join.vue"
BACKUP = pathlib.Path(__file__).parent / "join.vue.orig"
SUITE = "test/meals-claim-page.test.js"

# The two computeds that ARE the discrimination.
INTACT_REF = "      return statementReference(this.claimed);"
INTACT_FROM = "      return employeeReferenceOf(this.claimed) !== null;"

# Arm 2: the receipt stops reading the employee reference at all.  This is precisely the receipt the
# lane replaced, so the ABSENT-case pins must stay green -- that is the point.
IGNORE_REFERENCE = "      return membershipIdOf(this.claimed);"
IGNORE_REFERENCE_FROM = "      return false;"

# Arm 3: the receipt reads the reference and never falls back.
IGNORE_FALLBACK = "      return employeeReferenceOf(this.claimed);"


def run_suite():
    proc = subprocess.run(
        ["npx", "jest", SUITE, "--coverage=false", "--no-cache", "--json"],
        cwd=ROOT, capture_output=True, text=True,
    )
    blob = re.search(r'^\{.*\}$', proc.stdout, re.M)
    if not blob:
        print("    !! jest produced no JSON report; stderr tail:")
        for line in proc.stderr.strip().splitlines()[-8:]:
            print("      ", line)
        return None
    report = json.loads(blob.group(0))
    results = []
    for suite in report["testResults"]:
        for case in suite["assertionResults"]:
            results.append((case["status"], case["fullName"]))
    return results


def arm(name, mutate, expect_red_substrings):
    print("=" * 100)
    print("ARM:", name)
    print("=" * 100)
    original = BACKUP.read_text(encoding="utf-8")
    PAGE.write_text(mutate(original), encoding="utf-8")
    results = run_suite()
    PAGE.write_text(original, encoding="utf-8")
    if results is None:
        print("  ARM ABORTED -- no report")
        return False

    reds = [full for status, full in results if status != "passed"]
    print("  every test that FAILED under this arm:")
    if not reds:
        print("    (none)")
    for full in reds:
        print("    RED  ", full)
    print("  every test that PASSED under this arm:")
    for status, full in results:
        if status == "passed":
            print("    green", full)

    ok = True
    for wanted in expect_red_substrings:
        hit = [full for full in reds if wanted in full]
        if hit:
            print("  EXPECTED-RED satisfied by:", hit[0], "<-", repr(wanted))
        else:
            print("  EXPECTED-RED MISSING for:", repr(wanted), "-- THE PIN IS VACUOUS")
            ok = False
    if not expect_red_substrings:
        if reds:
            print("  EXPECTED ALL GREEN but found failures above -- NOT a clean baseline")
            ok = False
        else:
            print("  EXPECTED ALL GREEN: satisfied")
    return ok


def main():
    shutil.copyfile(PAGE, BACKUP)
    verdicts = []

    verdicts.append(("1 BASELINE", arm("1 BASELINE (both branches intact)", lambda t: t, [])))

    def mutate_ignore_reference(text):
        assert INTACT_REF in text and INTACT_FROM in text
        text = text.replace(INTACT_REF, IGNORE_REFERENCE)
        text = text.replace(INTACT_FROM, IGNORE_REFERENCE_FROM)
        return text.replace(
            "import { employeeReferenceOf, statementReference } from '~/utils/meals/statement-reference';",
            "import { employeeReferenceOf, membershipIdOf, statementReference } from '~/utils/meals/statement-reference';",
        )

    verdicts.append((
        "2 IGNORE-REFERENCE",
        arm("2 IGNORE-REFERENCE (receipt never reads the employee reference)", mutate_ignore_reference, [
            "camelCase, reference present",
            "PascalCase, reference present",
            "only a company-supplied reference is described as the employer's own",
        ]),
    ))

    def mutate_ignore_fallback(text):
        assert INTACT_REF in text
        return text.replace(INTACT_REF, IGNORE_FALLBACK)

    verdicts.append((
        "3 IGNORE-FALLBACK",
        arm("3 IGNORE-FALLBACK (receipt never falls back to the membership id)", mutate_ignore_fallback, [
            "camelCase, reference null",
            "PascalCase, reference absent from the document entirely",
            "a whitespace-only reference is absence",
        ]),
    ))

    verdicts.append(("4 RESTORED", arm("4 RESTORED (byte-identical to the baseline)", lambda t: t, [])))

    print("=" * 100)
    print("IDENTICAL AFTER RESTORE:", PAGE.read_bytes() == BACKUP.read_bytes())
    for name, ok in verdicts:
        print(f"  {name:22s} {'OK' if ok else 'FAILED'}")
    BACKUP.unlink()
    sys.exit(0 if all(ok for _, ok in verdicts) else 1)


main()
