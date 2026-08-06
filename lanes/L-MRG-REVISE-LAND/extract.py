#!/usr/bin/env python3
"""Split one lane's block out of a shared, multi-lane-dirty translation file.

Written for L-MRG-REVISE-LAND, kept in the repo as the template the next landing lane copies.
It reads the shared working tree and writes candidate blobs to OUT; it never writes into the
repository and never touches the index, HEAD or the working tree.

To reuse: set BASE, KEY_PREFIX and EXPECT_KEYS. Everything else is guards.

Every guard below is `fail()`, never `assert` -- asserts vanish under `python -O`, and a guard
that disappears under an optimisation flag is worse than no guard because it reads as protection.
"""
import subprocess, sys, os, re, difflib

REPO = "/Users/svendaneel/okam/Web-modules"
OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(os.path.abspath(__file__)), "tx")
BASE = "5ad0ca0"          # the commit the split is built against
FILES = ["translations/no.ts", "translations/en.ts", "translations/de.ts"]
KEY_PREFIX = "mrg_revise_"  # this lane's key family
EXPECT_KEYS = 14            # how many keys the lane's own evidence claims

os.makedirs(OUT, exist_ok=True)


def fail(*msg):
    print("REFUSED:", *msg, file=sys.stderr)
    sys.exit(1)


def sh(*a):
    r = subprocess.run(a, cwd=REPO, capture_output=True, text=True)
    if r.returncode != 0:
        fail(" ".join(a), r.stderr.strip())
    return r.stdout


# a line may only be the leading comment, a blank, or one of THIS lane's keys.
KEY_RE = re.compile(r"^\s*" + re.escape(KEY_PREFIX) + r"[a-z0-9_]+\s*:")


def allowed(line):
    s = line.strip()
    return s == "" or s.startswith("//") or KEY_RE.match(line) is not None


for p in FILES:
    # GUARD 0: the hunks come from `git diff`, which diffs INDEX -> worktree, while `head` comes
    # from BASE. If anything is staged for this file those two disagree and every offset below is
    # computed against the wrong side. Refuse rather than silently split at a bogus line number.
    staged = sh("git", "ls-files", "-s", "--", p).split()
    if len(staged) < 2:
        fail(p, "not tracked at the index")
    base_blob = sh("git", "rev-parse", f"{BASE}:{p}").strip()
    if staged[1] != base_blob:
        fail(p, f"index blob {staged[1][:12]} != {BASE} blob {base_blob[:12]}",
             "-- something is staged for this file; the hunk offsets would be wrong")

    head = sh("git", "show", f"{BASE}:{p}").split("\n")
    wt = open(os.path.join(REPO, p), encoding="utf-8").read().split("\n")

    hunks = []
    for l in sh("git", "diff", "-U0", "--", p).split("\n"):
        m = re.match(r"^@@ -(\d+),?(\d*) \+(\d+),?(\d*) @@", l)
        if m:
            hunks.append((int(m.group(1)),
                          int(m.group(2)) if m.group(2) else 1,
                          int(m.group(3)),
                          int(m.group(4)) if m.group(4) else 1))
    if not hunks:
        fail(p, "no hunks -- nothing to split")

    # GUARD 1: a deletion or replacement anywhere means somebody rewrote a shared line. Stop.
    if not all(h[1] == 0 for h in hunks):
        fail(p, "non-additive hunk present", hunks)

    os_, ol, ns, nl = hunks[0]
    added = wt[ns - 1:ns - 1 + nl]   # the lane's block, read at the WORKING TREE offset

    # GUARD 2 (whitelist, not blacklist): every added line must be one of the three shapes this
    # lane is allowed to contribute. A blacklist only refuses the families somebody thought of,
    # so a foreign line from any other key family would ride along undetected.
    strays = [(i, x) for i, x in enumerate(added) if not allowed(x)]
    if strays:
        fail(p, f"{len(strays)} line(s) in the block are not blank, a comment, or a {KEY_PREFIX}* key",
             strays[:3])

    keynames = [m.group(1) for m in
                (re.match(r"^\s*(" + re.escape(KEY_PREFIX) + r"[a-z0-9_]+)\s*:", x) for x in added) if m]
    if not added[0].strip().startswith("//"):
        fail(p, "first added line is not the comment", added[0])
    if len(keynames) != EXPECT_KEYS:
        fail(p, f"expected {EXPECT_KEYS} {KEY_PREFIX}* keys, got {len(keynames)}", keynames)
    if len(set(keynames)) != len(keynames):
        fail(p, "duplicate key inside the block", keynames)

    new = head[:os_] + added + head[os_:]

    # GUARD 3: the blob must be BASE plus exactly this hunk -- no deletion, no extra line.
    d = list(difflib.unified_diff(head, new, n=0, lineterm=""))
    dels = [x for x in d if x.startswith("-") and not x.startswith("---")]
    adds = [x for x in d if x.startswith("+") and not x.startswith("+++")]
    if dels:
        fail(p, "blob deletes a line committed at BASE", dels[:5])
    if len(adds) != nl:
        fail(p, f"blob adds {len(adds)} lines, hunk is {nl}")

    # GUARD 4: the shared working tree must contain the blob VERBATIM -- proves no sibling line
    # was swept in and no line of theirs was dropped.
    d2 = list(difflib.unified_diff(new, wt, n=0, lineterm=""))
    dels2 = [x for x in d2 if x.startswith("-") and not x.startswith("---")]
    if dels2:
        fail(p, "working tree does not contain the blob verbatim", dels2[:5])

    open(os.path.join(OUT, os.path.basename(p)), "w", encoding="utf-8").write("\n".join(new))
    print(f"{p}: OK  hunks={len(hunks)}  lane-block={nl} lines / {len(keynames)} keys  "
          f"siblings-left-behind={sum(h[3] for h in hunks[1:])} lines")
    print(f"   keys: {', '.join(keynames)}")

print(f"\nwrote {len(FILES)} candidate blobs to {OUT}")
