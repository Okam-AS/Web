#!/usr/bin/env python3
"""Mutation harness for LoginModal.login — proves the pin reds before it greens.

Each mutant is an exact, reversible edit to `components/molecules/LoginModal.vue`. The suite
`test/login-modal-success-is-silent.test.js` is run against every one and the FAILING TEST NAMES are
recorded. A mutant with no failing test is a SURVIVOR and means the pin does not hold.

Mutant 1 is the stock defect verbatim: the original success-path assignment restored and the reset
removed. If that one does not red, nothing else here is worth reading.

Usage:  python3 lanes/L-LOGINMODAL-SUCCESS-IS-SILENT/mutate.py
The target file is restored from git after every arm, including on failure.
"""

import re
import subprocess
import sys
import os

ROOT = "/Users/svendaneel/okam/web-loginsuccess"
TARGET = os.path.join(ROOT, "components/molecules/LoginModal.vue")
SUITE = "test/login-modal-success-is-silent.test.js"

RESET = '      this.code = code;\n      this.errorMessage = "";\n      this.isLoading = true;'
NO_RESET = '      this.code = code;\n      this.isLoading = true;'

SUCCESS_BRANCH = (
    '          if(Boolean(response)) {\n'
    '            this.codeSent = true;\n'
    '            this.$emit("close", true);\n'
    '          } else {'
)


def success_branch_with(extra_line):
    return (
        '          if(Boolean(response)) {\n'
        '            this.codeSent = true;\n'
        f'{extra_line}\n'
        '            this.$emit("close", true);\n'
        '          } else {'
    )


# (id, description, [(find, replace), ...])
MUTANTS = [
    ("M1-STOCK", "the original defect verbatim: JSON.stringify on success, no reset", [
        (RESET, NO_RESET),
        (SUCCESS_BRANCH, success_branch_with('            this.errorMessage = JSON.stringify(response);')),
    ]),
    ("M2", "JSON.stringify restored on success, reset kept", [
        (SUCCESS_BRANCH, success_branch_with('            this.errorMessage = JSON.stringify(response);')),
    ]),
    ("M3", "the naive deletion: drop the reset, assign nothing (stale failure rides a success)", [
        (RESET, NO_RESET),
    ]),
    ("M4", "reset moved from the top into the failure branch only", [
        (RESET, NO_RESET),
        ('            this.errorMessage = "Feil kode";\n            this.code = "";',
         '            this.errorMessage = "";\n            this.errorMessage = "Feil kode";\n            this.code = "";'),
    ]),
    ("M5", "reset weakened to a non-empty string", [
        (RESET, RESET.replace('this.errorMessage = "";', 'this.errorMessage = " ";')),
    ]),
    ("M6", "String(response) instead of JSON.stringify — a 'gentler' leak", [
        (SUCCESS_BRANCH, success_branch_with('            this.errorMessage = String(response);')),
    ]),
    ("M7", "only the token is rendered, not the whole body", [
        (SUCCESS_BRANCH, success_branch_with('            this.errorMessage = JSON.stringify(response && response.token);')),
    ]),
    ("M8", "reset moved into .finally, so a failure is wiped too", [
        (RESET, NO_RESET),
        # Anchored through `login`'s own catch arm — `getCode` has a `.finally` with the identical
        # body, so the short anchor matched twice and the mutant silently did not apply.
        ('          this.codeSent = false;\n        })\n        .finally(() => {\n          this.isLoading = false;',
         '          this.codeSent = false;\n        })\n        .finally(() => {\n          this.errorMessage = "";\n          this.isLoading = false;'),
    ]),
    ("M14", "success reports through the error slot in Norwegian instead of a serialized body", [
        (SUCCESS_BRANCH, success_branch_with('            this.errorMessage = "Innlogget";')),
    ]),
    ("M15", "the reset is made conditional on there being no code yet", [
        (RESET, '      this.code = code;\n      if (!this.code) { this.errorMessage = ""; }\n      this.isLoading = true;'),
    ]),
    ("M9", "success branch stops emitting close", [
        ('            this.$emit("close", true);\n', ''),
    ]),
    ("M10", "success branch stops setting codeSent", [
        ('            this.codeSent = true;\n            this.$emit("close", true);',
         '            this.$emit("close", true);'),
    ]),
    ("M11", "the wrong-code message is emptied", [
        ('            this.errorMessage = "Feil kode";', '            this.errorMessage = "";'),
    ]),
    ("M12", "the catch-arm message is emptied", [
        ('          this.errorMessage = "Feil kode";\n          this.code = "";',
         '          this.errorMessage = "";\n          this.code = "";'),
    ]),
    ("M13", "the phone/code argument is dropped", [
        (".Login(this.countryCode + this.phone.replace(/\\s/g, ''), this.code)",
         ".Login(this.phone, this.code)"),
    ]),
]

# INVERSES — behaviour-preserving edits that must stay GREEN.
#
# Without these the mutant score above only shows the suite reacts to CHANGE. These show it reacts
# to BEHAVIOUR: if an inverse reds, the tests are pinned to the text of the method rather than to
# what it does, and the kill count means less than it looks.
INVERSES = [
    ("INV1", "the reset is written before the code assignment (same effect)", [
        (RESET, '      this.errorMessage = "";\n      this.code = code;\n      this.isLoading = true;'),
    ]),
    ("INV2", "the reset uses single quotes", [
        (RESET, RESET.replace('this.errorMessage = "";', "this.errorMessage = '';")),
    ]),
    ("INV3", "the empty string is spelled as a template literal", [
        (RESET, RESET.replace('this.errorMessage = "";', 'this.errorMessage = ``;')),
    ]),
]


def restore():
    subprocess.run(["git", "checkout", "--", "components/molecules/LoginModal.vue"],
                   cwd=ROOT, check=True)


def failing_tests(output):
    """Test names jest reported as failing, in report order."""
    return [name.strip() for name in re.findall(r"^\s*(?:✕|×)\s+(.+?)(?:\s+\(\d+\s*ms\))?$",
                                                output, re.MULTILINE)]


def run_suite():
    proc = subprocess.run(
        ["npx", "jest", SUITE, "--coverage=false"],
        cwd=ROOT, capture_output=True, text=True)
    return proc.returncode, proc.stdout + proc.stderr


def apply_mutant(edits):
    with open(TARGET, "r", encoding="utf-8") as handle:
        source = handle.read()
    for find, replace in edits:
        if source.count(find) != 1:
            return False, f"anchor matched {source.count(find)} times, expected exactly 1"
        source = source.replace(find, replace)
    with open(TARGET, "w", encoding="utf-8") as handle:
        handle.write(source)
    return True, ""


def main():
    restore()

    print("=" * 100)
    print("BASELINE — the fixed modal, unmutated")
    code, output = run_suite()
    print(f"  exit={code}  failing={failing_tests(output) or 'none'}")
    if code != 0:
        print("BASELINE IS RED — stopping; every mutant below would be meaningless.")
        print(output[-4000:])
        return 1
    print()

    survivors = []
    for mutant_id, description, edits in MUTANTS:
        ok, why = apply_mutant(edits)
        if not ok:
            restore()
            print(f"{mutant_id:9s} COULD NOT APPLY — {why}")
            survivors.append((mutant_id, "could not apply: " + why))
            continue

        code, output = run_suite()
        reds = failing_tests(output)
        restore()

        verdict = "KILLED " if code != 0 else "SURVIVED"
        print(f"{mutant_id:9s} {verdict}  {description}")
        for red in reds:
            print(f"{'':9s}           red: {red}")
        if code == 0:
            survivors.append((mutant_id, description))
        print()

    print("=" * 100)
    print("INVERSES — behaviour-preserving edits that must stay GREEN")
    print()
    broken = []
    for inverse_id, description, edits in INVERSES:
        ok, why = apply_mutant(edits)
        if not ok:
            restore()
            print(f"{inverse_id:9s} COULD NOT APPLY — {why}")
            broken.append((inverse_id, "could not apply: " + why))
            continue

        code, output = run_suite()
        reds = failing_tests(output)
        restore()

        verdict = "GREEN  " if code == 0 else "RED    "
        print(f"{inverse_id:9s} {verdict}  {description}")
        for red in reds:
            print(f"{'':9s}           red: {red}")
        if code != 0:
            broken.append((inverse_id, description))
        print()

    print("=" * 100)
    print(f"{len(MUTANTS)} mutants, {len(survivors)} survivors")
    for mutant_id, description in survivors:
        print(f"  SURVIVOR {mutant_id}: {description}")
    print(f"{len(INVERSES)} inverses, {len(broken)} reds")
    for inverse_id, description in broken:
        print(f"  OVER-FITTED {inverse_id}: {description}")
    return 1 if survivors or broken else 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    finally:
        restore()
