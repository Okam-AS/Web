#!/usr/bin/env python3
"""Enumerate the Meals surface in both repos and list every absence-shaped assertion.

An "absence-shaped assertion" is prose that says a thing does NOT exist / is NOT reachable /
is NEVER called. That is the class of sentence that goes false when a lane builds the thing,
and it is the only class this lane can correct without touching behaviour.

Output is PER ITEM, never a count summary.
"""
import os
import re
import subprocess
import sys

BE = "/Users/svendaneel/okam/wt-mealsdocsync"
FE = "/Users/svendaneel/okam/Web-modules"

BE_DIRS = ("Controllers/Meals", "Entities/Meals", "Enums/Meals", "Helpers/Meals",
           "Models/Meals", "Services/Meals", "WebApi.Tests/Meals")
BE_FILES_EXTRA = ("Scripts/demo/RUNBOOK.md", "Scripts/demo/seed-meals-demo.sh",
                  "Scripts/demo/demo-common.sh", "Scripts/demo/demo-up.sh",
                  "docs/plans/replan/b-meals-completeness.md",
                  "docs/plans/modules/60-company-meals-spec.md")

FE_DIRS = ("pages/meals", "components/admin/meals", "utils/meals")
FE_GLOBS = ("pages/admin/meals-agreements.vue", "pages/admin/meals-companies.vue",
            "test/e2e/fixture/meals.js", "test/e2e/fixture/consumer-world.js",
            "test/e2e/fixture/consumer-api-server.js", "test/e2e/support/consumer-guest.js")

# The sentence shapes that rot. Deliberately broad: a false positive costs a read, a miss
# costs the whole point of the lane.
PATTERNS = [
    r"\bnever called\b", r"\bnever bound\b", r"\bnot bound\b", r"\bunbound\b",
    r"\bno client\b", r"\bno cart\b", r"\bno caller\b", r"\bzero callers?\b",
    r"\bnothing (?:reads|calls|sends|binds|in the estate)\b",
    r"\bdoes not exist\b", r"\bdo not exist\b", r"\bdoes NOT exist\b",
    r"\bno (?:create|agreement-create) endpoint\b", r"\bno endpoint\b", r"\bno route\b",
    r"\bno surface\b", r"\bno UI\b", r"\bhas no\b", r"\bthere is no\b", r"\bnobody\b",
    r"\bcannot be reached\b", r"\bnot reachable\b", r"\bunreachable\b",
    r"\bimpossible\b", r"\bno such\b", r"\bnone of them\b", r"\bnot yet\b",
    r"\bno one\b", r"\bcannot yet\b", r"\bstill cannot\b", r"\bno (?:\w+ )?flag\b",
]
RX = re.compile("|".join(PATTERNS), re.IGNORECASE)

# Comment/prose lines only — we are not auditing identifiers.
PROSE = re.compile(r"^\s*(///|//|\*|/\*|#|\||-|\d+\.|\w)")


def collect(root, dirs, extras):
    out = []
    for d in dirs:
        p = os.path.join(root, d)
        for base, _, files in os.walk(p):
            if "/obj/" in base or "/bin/" in base or "/node_modules/" in base:
                continue
            for f in sorted(files):
                out.append(os.path.join(base, f))
    for e in extras:
        p = os.path.join(root, e)
        if os.path.exists(p):
            out.append(p)
    return sorted(set(out))


def scan(paths, root, label):
    hits = []
    for p in paths:
        try:
            with open(p, "r", encoding="utf-8", errors="replace") as fh:
                lines = fh.read().splitlines()
        except (IsADirectoryError, PermissionError):
            continue
        rel = os.path.relpath(p, root)
        for i, line in enumerate(lines, 1):
            if len(line) > 400:
                continue
            if RX.search(line) and PROSE.match(line):
                hits.append((label, rel, i, line.strip()))
    return hits


def main():
    be = collect(BE, BE_DIRS, BE_FILES_EXTRA)
    fe = collect(FE, FE_DIRS, FE_GLOBS)
    fe += [os.path.join(FE, f) for f in subprocess.run(
        ["git", "ls-files"], cwd=FE, capture_output=True, text=True
    ).stdout.split() if re.search(r"(^|/)(test/)?.*meals.*\.(js|vue|md)$", f)]
    fe = sorted(set(fe))

    print("=== FILES ENUMERATED (backend) ===")
    for p in be:
        print("  BE " + os.path.relpath(p, BE))
    print("=== FILES ENUMERATED (frontend) ===")
    for p in fe:
        print("  FE " + os.path.relpath(p, FE))

    hits = scan(be, BE, "BE") + scan(fe, FE, "FE")
    print()
    print("=== ABSENCE-SHAPED ASSERTIONS, ONE PER LINE ===")
    for label, rel, i, line in hits:
        print("%s %s:%d: %s" % (label, rel, i, line))
    print()
    print("=== END (%d files backend, %d files frontend, %d candidate lines) ===" %
          (len(be), len(fe), len(hits)))
    return 0


if __name__ == "__main__":
    sys.exit(main())
