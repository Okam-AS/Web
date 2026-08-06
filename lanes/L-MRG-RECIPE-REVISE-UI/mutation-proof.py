#!/usr/bin/env python3
"""Unbind ONE control at a time and record which tests notice.

A mutation that reds everything proves the suite runs, not that it discriminates. Each arm below
removes exactly one `@click` binding from `pages/admin/margin-recipes.vue`, so the control is still
rendered, still enabled and still clickable — and does nothing. The step it drives must red, and the
other three steps' own tests must stay green.

The page test that already existed (`margin-recipes-page.test.js`) is run alongside deliberately: it
drives `wrapper.vm.activate()` directly, so arm 3 is expected to leave it GREEN. That is the vacuity
this lane's brief warned about, measured rather than asserted.

Usage: python3 lanes/L-MRG-RECIPE-REVISE-UI/mutation-proof.py
"""

import json
import re
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
PAGE = ROOT / "pages" / "admin" / "margin-recipes.vue"
SUITES = ["test/margin-recipe-revise.test.js", "test/margin-recipes-page.test.js"]

ARMS = [
    ("1 new-draft", '@click="newDraft"'),
    ("2 edit", '@click="saveDraft"'),
    ("3 activate", '@click="activate"'),
    ("4 retire", '@click="retire"'),
]


def run_suites():
    """Return {test full name: 'passed'|'failed'} across both suites."""
    with tempfile.NamedTemporaryFile(suffix=".json", delete=False) as handle:
        out = Path(handle.name)
    subprocess.run(
        ["npx", "jest", *SUITES, "--coverage=false", "--json", f"--outputFile={out}"],
        cwd=ROOT, capture_output=True, text=True,
    )
    report = json.loads(out.read_text())
    out.unlink()
    results = {}
    for suite in report["testResults"]:
        stem = Path(suite["name"]).name
        for case in suite["assertionResults"]:
            results[f"{stem} :: {case['fullName']}"] = case["status"]
    return results


def failing(results):
    return sorted(name for name, status in results.items() if status != "passed")


def main():
    original = PAGE.read_text()
    backup = PAGE.with_suffix(".vue.mutation-backup")
    shutil.copy2(PAGE, backup)

    lines = []
    try:
        baseline = run_suites()
        base_failures = failing(baseline)
        lines.append(f"BASELINE: {len(baseline)} tests, {len(base_failures)} failing")
        for name in base_failures:
            lines.append(f"  pre-existing red: {name}")
        if base_failures:
            lines.append("  (a red baseline makes every arm below unreadable)")
        lines.append("")

        for label, binding in ARMS:
            if original.count(binding) != 1:
                lines.append(f"ARM {label}: SKIPPED — {binding!r} occurs {original.count(binding)} times")
                continue
            # Swap the binding for an inert attribute: the button still renders and still clicks.
            PAGE.write_text(original.replace(binding, "data-unbound-by-mutation"))
            mutated = run_suites()
            new_reds = [n for n in failing(mutated) if n not in base_failures]
            lines.append(f"ARM {label}: unbound {binding} -> {len(new_reds)} newly red")
            for name in new_reds:
                lines.append(f"  RED {name}")
            still_green = [
                n for n in mutated
                if n.startswith("margin-recipe-revise") and mutated[n] == "passed"
                and any(k in n for k in ("new draft", "edit carries", "activation supersedes", "retire is reachable"))
            ]
            lines.append(f"  step-scoped describes still green: {len(still_green)}")
            lines.append("")
            PAGE.write_text(original)
    finally:
        PAGE.write_text(original)
        backup.unlink(missing_ok=True)

    report = "\n".join(lines)
    print(report)
    (Path(__file__).parent / "mutation-proof.txt").write_text(report + "\n")
    return 0


if __name__ == "__main__":
    sys.exit(main())
