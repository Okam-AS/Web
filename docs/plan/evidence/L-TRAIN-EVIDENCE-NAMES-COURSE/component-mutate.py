#!/usr/bin/env python3
"""L-TRAIN-EVIDENCE-NAMES-COURSE: the component-test half, red then green.

Applies one mutation at a time to the tree at cff41c85, runs the component
suite, records the failing test names and messages, restores, and asserts the
restore is byte-identical (git diff --quiet).
"""
import os, subprocess, sys, pathlib

WT = "/private/tmp/claude-501/-Users-svendaneel-okam/766072d3-8965-4c45-be67-76b407d86aaf/scratchpad/b4-train-wt"
OUT = "/private/tmp/claude-501/-Users-svendaneel-okam/766072d3-8965-4c45-be67-76b407d86aaf/scratchpad/b4-train-out"
PANEL = os.path.join(WT, "components/admin/training/TrainingCompletionPanel.vue")
JOURNEY = os.path.join(WT, "utils/training/journey.js")
os.makedirs(OUT, exist_ok=True)

CELL = """          <td data-test="completion-course">
            {{ row.courseTitle || dash }}
            <span v-if="row.versionNo !== null" class="trn-flag">v{{ row.versionNo }}</span>
          </td>
"""

MUTATIONS = [
    ("M1-render-deleted", PANEL, CELL, ""),
    ("M2-version-dropped-in-parse", JOURNEY,
     "    versionNo: typeof c.versionNo === 'number' ? c.versionNo : null,",
     "    versionNo: null,"),
    ("M3-unresolvable-title-prints-empty", PANEL,
     "            {{ row.courseTitle || dash }}",
     "            {{ row.courseTitle }}"),
]


def run(tag):
    p = subprocess.run(
        ["npx", "jest", "test/training-components.test.js", "--coverage=false", "--verbose"],
        cwd=WT, capture_output=True, text=True)
    path = os.path.join(OUT, tag + ".txt")
    with open(path, "w") as f:
        f.write("$ npx jest test/training-components.test.js --coverage=false --verbose\n")
        f.write("(cwd %s, detached HEAD cff41c85)\n\n" % WT)
        f.write(p.stdout)
        f.write(p.stderr)
    return p


def summary(p):
    tail = [l for l in (p.stdout + p.stderr).splitlines()
            if l.startswith("Tests:") or l.startswith("Test Suites:")]
    return " | ".join(tail)


def failing(p):
    names = []
    for line in (p.stdout + p.stderr).splitlines():
        s = line.strip()
        if s.startswith("✕"):
            names.append(s)
        if s.startswith("●") and "›" in s:
            names.append(s)
    return names


def clean():
    r = subprocess.run(["git", "diff", "--quiet"], cwd=WT)
    return r.returncode == 0


assert clean(), "tree dirty before start"
base = run("baseline")
print("BASELINE:", summary(base))

for tag, target, old, new in MUTATIONS:
    src = pathlib.Path(target).read_text()
    assert src.count(old) == 1, (tag, "anchor count", src.count(old))
    pathlib.Path(target).write_text(src.replace(old, new))
    assert not clean(), tag + ": mutation did not change the tree"
    p = run(tag)
    print(tag, ":", summary(p))
    for n in failing(p):
        print("   ", n)
    pathlib.Path(target).write_text(src)
    assert clean(), tag + ": restore not byte-identical"

after = run("restored")
print("RESTORED:", summary(after))
assert clean(), "tree dirty at end"
