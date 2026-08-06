#!/usr/bin/env python3
"""Prove the containment pin is not vacuous.

Each arm reintroduces a different shape of the defect, runs the pin, restores, and runs it again.
A pin that stays green under a mutation is a pin that cannot see it, so every arm prints its own
verdict rather than a summary count.

Restores are written, never moved: MSBuild decides "up to date" by mtime, and a restore that keeps
the original timestamp makes the next run measure the previous binary (CLAUDE.md).
"""

import subprocess
import sys
import time

REPO = "/Users/svendaneel/okam/wt-datedout"
FILTER = "FullyQualifiedName~TestOutputContainmentTests"

GITIGNORE = REPO + "/.gitignore"
DIETARY = REPO + "/WebApi.Tests/Wire/EventsDietaryRunSheetWireTests.cs"

ANCHOR = "        WriteCapture(transcript, beforeItems, reissuedItems);"


def read(path):
    with open(path, encoding="utf-8") as handle:
        return handle.read()


def write(path, text):
    with open(path, "w", encoding="utf-8") as handle:
        handle.write(text)
    # Make the change unambiguously newer than any existing build output.
    now = time.time()
    import os
    os.utime(path, (now, now))


def run_pin():
    result = subprocess.run(
        ["dotnet", "test", "WebApi.Tests/WebApi.Tests.csproj", "--filter", FILTER],
        cwd=REPO, capture_output=True, text=True,
    )
    return result.returncode, result.stdout + result.stderr


def verdict(output):
    for line in output.splitlines():
        if line.startswith("Passed!") or line.startswith("Failed!"):
            return line.strip()
    return "NO RESULT LINE"


def reasons(output):
    keep = []
    for line in output.splitlines():
        line = line.strip()
        if not line:
            continue
        if ("which git tracks" in line
                or "cannot be resolved from the source" in line
                or "Assert.Equal() Failure" in line
                or "Assert.NotEqual() Failure" in line
                or line.startswith("Allowlist entries no longer")
                or "write site(s) do not" in line):
            keep.append(line)
    return keep


# ---- the arms -------------------------------------------------------------------------------------

def arm_ignore_rule_removed():
    """The defect exactly as it shipped: artifacts/journeys/ committed, so the capture dirties the tree."""
    original = read(GITIGNORE)
    mutated = original.replace("artifacts/journeys/\n", "")
    assert mutated != original, "gitignore rule not found"
    write(GITIGNORE, mutated)
    return lambda: write(GITIGNORE, original)


def arm_new_dated_artifact_other_name():
    """A SECOND dated artifact, in another directory, under a name with no 'run-sheet' in it."""
    original = read(DIETARY)
    injected = (
        ANCHOR + "\n"
        '        File.WriteAllText(Path.Combine(TestRepoRoot.Resolve(), "docs", "plans",\n'
        '            "kitchen-brief-" + DateTime.UtcNow.ToString("yyyy-MM-dd") + ".md"), "today\'s brief");'
    )
    mutated = original.replace(ANCHOR, injected)
    assert mutated != original, "anchor not found"
    write(DIETARY, mutated)
    return lambda: write(DIETARY, original)


def arm_destination_computed_at_runtime():
    """A destination the source does not state. Fail-closed: unresolvable must red, not pass."""
    original = read(DIETARY)
    injected = (
        ANCHOR + "\n"
        '        File.WriteAllText(Environment.GetEnvironmentVariable("SOMEWHERE") ?? "x.md", "residue");'
    )
    mutated = original.replace(ANCHOR, injected)
    assert mutated != original, "anchor not found"
    write(DIETARY, mutated)
    return lambda: write(DIETARY, original)


def arm_git_answer_ignored():
    """The counter-probe's own reason to exist: pretend git reports nothing for the tracked probe."""
    path = REPO + "/WebApi.Tests/TestOutputContainmentTests.cs"
    original = read(path)
    mutated = original.replace(
        'Git(repoRoot, "status --porcelain --untracked-files=all -- " + Quote(path)).Output.Trim()',
        'Git(repoRoot, "status --porcelain --untracked-files=all -- " + Quote(path)).Output.Trim() is null ? "" : ""')
    assert mutated != original, "GitStatus body not found"
    write(path, mutated)
    return lambda: write(path, original)


ARMS = [
    ("A. the ignore rule is removed (the defect as it shipped)", arm_ignore_rule_removed),
    ("B. a second dated artifact, other directory, other name", arm_new_dated_artifact_other_name),
    ("C. a destination the source does not state", arm_destination_computed_at_runtime),
    ("D. git always answers 'clean' (the counter-probe's purpose)", arm_git_answer_ignored),
]


def main():
    code, output = run_pin()
    print("BASELINE: " + verdict(output))
    if code != 0:
        print("baseline is not green; stopping")
        return 1

    failures = []
    for name, arm in ARMS:
        print("\n=== ARM " + name + " ===")
        restore = arm()
        code, output = run_pin()
        print("  mutated -> " + verdict(output))
        for reason in reasons(output):
            print("    " + reason[:200])
        if code == 0:
            failures.append(name + ": stayed green under the mutation")

        restore()
        code, output = run_pin()
        print("  restored -> " + verdict(output))
        if code != 0:
            failures.append(name + ": did not return to green after restore")

    print("\n=== RESULT ===")
    if failures:
        for failure in failures:
            print("VACUOUS: " + failure)
        return 1
    for name, _ in ARMS:
        print("RED-ON-DEFECT, GREEN-ON-RESTORE: " + name)
    return 0


if __name__ == "__main__":
    sys.exit(main())
