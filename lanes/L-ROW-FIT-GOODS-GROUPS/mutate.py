"""Apply / restore one mutation to EscPosXZReportBuilder.cs by exact string replacement.

Every replacement asserts the source is present exactly once BEFORE writing, and restore asserts
the file comes back byte-identical to the pristine copy. Each write bumps mtime, so MSBuild cannot
be fooled into measuring the previous binary - the trap CLAUDE.md warns about, and the one that
would let a red-then-green mutation check "prove" a pin against a binary still holding the mutant.
"""
import hashlib
import io
import os
import sys

SRC = "/Users/svendaneel/okam/wt-xzprinted/Services/Kassa/EscPosXZReportBuilder.cs"
HERE = os.path.dirname(os.path.abspath(__file__))
PRISTINE = os.path.join(HERE, "EscPosXZReportBuilder.pristine.cs")

MUTANTS = {
    # M1 - the choke point reverted: a trailing digit group becomes shortenable again. Exactly the
    # state the sibling shipped, and the state the exit criterion names.
    "M1": (
        "                left = FitKeepingCount(left, available);",
        "                left = Fit(left, available);",
    ),
    # M2 - the digit test inverted: a trailing group is protected only when it is NOT all digits, so
    # figures become shortenable and prose becomes protected.
    "M2": (
        "                if (!char.IsDigit(label[i]))\n"
        "                {\n"
        "                    return null;\n"
        "                }",
        "                if (char.IsDigit(label[i]))\n"
        "                {\n"
        "                    return null;\n"
        "                }",
    ),
    # M3 - the fix for one world, in miniature: protect only counts of one or two digits. This is the
    # shape of the original defect and only a swept pin can see it.
    "M3": (
        "            if (count == null || count.Length > width)",
        "            if (count == null || count.Length > width || count.Length > 5)",
    ),
    # M4 - the digit test DELETED: any trailing parenthesised group is protected, prose included.
    "M4": (
        "            for (var i = open + 1; i < label.Length - 1; i++)\n"
        "            {\n"
        "                if (!char.IsDigit(label[i]))\n"
        "                {\n"
        "                    return null;\n"
        "                }\n"
        "            }\n",
        "",
    ),
}


def sha(path):
    return hashlib.sha256(io.open(path, "rb").read()).hexdigest()[:12]


def main():
    action = sys.argv[1]

    if action == "save":
        io.open(PRISTINE, "w", encoding="utf-8").write(io.open(SRC, encoding="utf-8").read())
        print("pristine saved, sha", sha(SRC))
        return

    if action == "restore":
        io.open(SRC, "w", encoding="utf-8").write(io.open(PRISTINE, encoding="utf-8").read())
        assert sha(SRC) == sha(PRISTINE), "restore did not reproduce the pristine file"
        print("restored, sha", sha(SRC))
        return

    old, new = MUTANTS[action]
    s = io.open(PRISTINE, encoding="utf-8").read()
    assert s.count(old) == 1, "%s: expected exactly one occurrence, found %d" % (action, s.count(old))
    io.open(SRC, "w", encoding="utf-8").write(s.replace(old, new))
    print("applied", action, "- sha", sha(SRC), "(pristine", sha(PRISTINE) + ")")


main()
