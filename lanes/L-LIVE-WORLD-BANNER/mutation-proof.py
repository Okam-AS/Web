#!/usr/bin/env python3
"""Non-vacuity proof for test/e2e/scripts/live-world-banner-check.js.

A guard that has never been seen to red is a guard nobody has tested. Every arm below either
reintroduces a contradiction between live-world.sh and live-world-reset.sh and requires the check to
fail ON EXACTLY THE NAMED RULES, or removes the contradiction and requires it to pass.

Nothing here mutates a file in the repo. Each arm gets its own directory under mutants/ holding
copies handed to the check through its documented --script/--reset arguments, because sibling lanes
have live worlds standing and may be reading the real scripts at any moment.

THE COPIES KEEP THE CANONICAL FILENAMES. The check asks "does the text of live-world.sh name
live-world-reset.sh", so it identifies both files by their own basenames; a mutant renamed
`arm-4.sh` would fail every naming rule for a reason that has nothing to do with the mutation. That
is not a hypothetical -- the first run of this proof made exactly that mistake and reported five
false reds, which is why each arm now gets a directory instead of a filename.

The strongest arm is A0: not a synthetic mutant at all, but the exact text that was on the branch at
HEAD before this lane touched it.
"""

import json
import os
import subprocess
import sys

REPO = "/Users/svendaneel/okam/Web-modules"
CHECK = os.path.join(REPO, "test/e2e/scripts/live-world-banner-check.js")
SCRIPT = os.path.join(REPO, "test/e2e/scripts/live-world.sh")
RESET = os.path.join(REPO, "test/e2e/scripts/live-world-reset.sh")
MUT = os.path.join(REPO, "lanes/L-LIVE-WORLD-BANNER/mutants")


def head_version(relpath):
    return subprocess.run(
        ["git", "show", "HEAD:" + relpath], cwd=REPO,
        capture_output=True, text=True, check=True).stdout


def run_check(script, reset):
    r = subprocess.run(
        ["node", CHECK, "--script", script, "--reset", reset],
        cwd=REPO, capture_output=True, text=True)
    failed, passed = set(), set()
    for line in r.stdout.splitlines():
        s = line.strip()
        if s.startswith("FAIL  "):
            failed.add(s.split()[1])
        elif s.startswith("PASS  "):
            passed.add(s.split()[1])
    return r.returncode, passed, failed, r.stdout + r.stderr


CURRENT = open(SCRIPT).read()
RESET_TEXT = open(RESET).read()
HEAD_SCRIPT = head_version("test/e2e/scripts/live-world.sh")

assert "a live world has no such thing" in HEAD_SCRIPT, "HEAD lost the denial; this proof is stale"
assert "a live world has no such thing" not in CURRENT, "the working copy still carries the denial"

arms = []


def arm(ident, what, script_text, reset_text, expect_exit, expect_fail):
    """reset_text=None means the reset script does not exist in this arm's world."""
    d = os.path.join(MUT, "arm-" + ident)
    os.makedirs(d, exist_ok=True)
    script_path = os.path.join(d, "live-world.sh")
    reset_path = os.path.join(d, "live-world-reset.sh")
    with open(script_path, "w") as f:
        f.write(script_text if script_text is not None else CURRENT)
    if reset_text is None:
        if os.path.exists(reset_path):
            os.remove(reset_path)
    else:
        with open(reset_path, "w") as f:
            f.write(reset_text)

    code, passed, failed, out = run_check(script_path, reset_path)
    ok = (code == expect_exit) and (failed == set(expect_fail))
    arms.append({
        "arm": ident, "what": what, "exit": code, "expected_exit": expect_exit,
        "failed": sorted(failed), "expected_fail": sorted(expect_fail),
        "passed": sorted(passed), "verdict": "as expected" if ok else "UNEXPECTED",
    })
    with open(os.path.join(d, "check.out"), "w") as f:
        f.write(out)
    return ok


# --- slices of the two texts, located by content rather than line number ------------------------
head_banner = HEAD_SCRIPT[
    HEAD_SCRIPT.index("ONE, and the file path is not a convenience."):
    HEAD_SCRIPT.index("Artifacts land in artifacts/journeys/")]
cur_banner_at = CURRENT.index("ONE PER RUN, AND A RESET BETWEEN THEM")
cur_banner_end = CURRENT.index("Artifacts land in artifacts/journeys/")
head_header = HEAD_SCRIPT[
    HEAD_SCRIPT.index("# then, in another terminal, what it prints"):
    HEAD_SCRIPT.index("set -euo pipefail")]
cur_header_at = CURRENT.index("# then, in another terminal, what it prints")
cur_header_end = CURRENT.index("set -euo pipefail")

# A paraphrase that reuses NONE of the original wording -- the brief's specific worry, that a guard
# keyed to a sentence is defeated by a rewrite.
paraphrase = (
    "SEPARATE DATABASES. These two specs each expect to be the first thing that ever touched the\n"
    "schedule for this week, and the second one to run inherits whatever the first one wrote. Stand up\n"
    "a fresh catalog for each of them and keep the runs apart.\n\n")

# ---------------------------------------------------------------------------------------------
arm("0-head-as-landed",
    "live-world.sh exactly as it stood at HEAD (4b5c5c2); the reset already existed",
    HEAD_SCRIPT, RESET_TEXT, 1, ["R1", "R2", "R3", "R6"])

arm("1-corrected", "the corrected live-world.sh from the working tree",
    CURRENT, RESET_TEXT, 0, [])

arm("2-banner-reverted", "header corrected, CLOSING BANNER reverted to the denial",
    CURRENT[:cur_banner_at] + head_banner + CURRENT[cur_banner_end:], RESET_TEXT,
    1, ["R2", "R3", "R6"])

arm("3-header-reverted", "banner corrected, HEADER reverted to the denial",
    CURRENT[:cur_header_at] + head_header + CURRENT[cur_header_end:], RESET_TEXT, 1, ["R1"])

arm("4-verb-renamed-one-side", "the text calls `revert`; the reset still implements `restore`",
    CURRENT.replace("live-world-reset.sh restore", "live-world-reset.sh revert"), RESET_TEXT,
    1, ["R4", "R6"])

arm("5-envvar-renamed", "the banner recipe passes SQL_HOST, a name the reset never reads",
    CURRENT.replace("SQL_CONTAINER=$SQL_CONTAINER", "SQL_HOST=$SQL_CONTAINER"), RESET_TEXT,
    1, ["R5"])

arm("6-reset-deleted", "the banner still prints the recipe; live-world-reset.sh is GONE",
    CURRENT, None, 1, ["R7"])

arm("7-banner-removed", "the closing heredoc is gone: the check must fail CLOSED",
    CURRENT.replace("\ncat <<EOF\n", "\nprintf '%s' banner-was-here\n", 1), RESET_TEXT, 1, ["R0"])

arm("8-consistently-absent", "HEAD's text (never names the reset) and NO reset script -- consistent",
    HEAD_SCRIPT, None, 0, [])

arm("9-verb-renamed-both", "`restore` renamed to `revert` in BOTH files -- a clean rename",
    CURRENT.replace("live-world-reset.sh restore", "live-world-reset.sh revert"),
    RESET_TEXT.replace("\nrestore)\n", "\nrevert)\n").replace(
        "live-world-reset.sh restore", "live-world-reset.sh revert"), 0, [])

arm("10-denial-paraphrased",
    "the denial rewritten in ENTIRELY different words, naming neither script",
    CURRENT[:cur_banner_at] + paraphrase + CURRENT[cur_banner_end:], RESET_TEXT,
    1, ["R2", "R6"])

# ---------------------------------------------------------------------------------------------
head_sha = subprocess.run(["git", "rev-parse", "--short", "HEAD"], cwd=REPO,
                          capture_output=True, text=True).stdout.strip()
print("MUTATION PROOF  test/e2e/scripts/live-world-banner-check.js")
print("repo %s  HEAD %s" % (REPO, head_sha))
print("failure sets are matched EXACTLY: an arm that reds on more rules than named is unexpected too.")
print("")
for a in arms:
    print("ARM %s  %s" % (a["arm"], a["what"]))
    print("    exit %d (expected %d)   verdict: %s" % (a["exit"], a["expected_exit"], a["verdict"]))
    print("    red    : %s" % (", ".join(a["failed"]) or "(none)"))
    print("    expected: %s" % (", ".join(a["expected_fail"]) or "(none -- must be all green)"))
    print("    green  : %s" % (", ".join(a["passed"]) or "(none)"))
    print("")

bad = [a for a in arms if a["verdict"] != "as expected"]
print("%d arms, %d as expected, %d unexpected" % (len(arms), len(arms) - len(bad), len(bad)))
for a in bad:
    print("  UNEXPECTED: arm %s -- red %s, expected %s" % (a["arm"], a["failed"], a["expected_fail"]))
with open(os.path.join(os.path.dirname(MUT), "mutation-proof.json"), "w") as f:
    json.dump({"head": head_sha, "arms": arms}, f, indent=2)
sys.exit(1 if bad else 0)
