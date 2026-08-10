#!/usr/bin/env python3
"""pindirs — every directory this plan reads facts from must be pinned to a repo
and a ref, and the pin must name the world the plan declares.

The pin probes answer "is THIS dir on the declared ref". They cannot answer
"did somebody add a new dir and no pin for it" -- that is a property of the
plan text, so it is checked here.

What counts as a pin, for a dir D:

  1. a probe reading `D/.git` with a `contains:` literal naming a repo and a
     worktree            -- binds the dir to a REPO, not just to a path
  2. a probe reading `<that same worktree>/HEAD` with the literal
     `ref: refs/heads/<declared>`
                         -- binds that worktree to the declared REF
  3. a probe reading the same HEAD with a capture, so the ref actually found is
     named whether the pin is green or red

Rule 2's source must be rule 1's literal + "/HEAD". Without that link a plan can
carry a pin that reads a different worktree's HEAD and still call itself pinned
-- the same defect one level down.

The declared ref is read from world.config, so the pin literal and the plan's
declared world cannot drift apart silently.

usage:  pindirs.py [PLAN_MD] [--root REPO_ROOT]
exit :  0 every dir pinned · 1 something unpinned · 2 cannot answer
"""
import os
import re
import sys


def parse_probes(text):
    out, inside = [], False
    for i, line in enumerate(text.splitlines(), 1):
        s = line.strip()
        if s.startswith("```probes"):
            inside = True
            continue
        if inside and s.startswith("```"):
            inside = False
            continue
        if inside and s and not s.startswith("#"):
            parts = s.split(None, 3)
            if len(parts) >= 4:
                out.append((i, parts[0], parts[1], parts[2], parts[3].strip()))
    return out


def dir_of(source):
    """The directory a probe source reads FACTS out of, or None.

    `../X/...` is the sibling checkout X. Anything else is the hub repo itself,
    which is a dir this plan reads from too and is pinned on the same terms --
    it is on a lane branch today.

    Git bookkeeping is not a fact-bearing dir. Without this, the pin probes
    create dirs of their own (`../OkamAPI`, `../Web`), each demanding a pin,
    each adding two more -- the census regresses forever and every run reds for
    a reason that is not drift."""
    if source == ".git" or source.endswith("/.git") or "/.git/" in source:
        return None
    if source.startswith("../"):
        return "../" + source.split("/")[1]
    return "."


def main(argv):
    plan_md = None
    root = None
    i = 0
    while i < len(argv):
        if argv[i] == "--root":
            i += 1
            root = argv[i]
        else:
            plan_md = argv[i]
        i += 1
    if plan_md is None:
        plan_md = "docs/plan/plan.md"
    if root is None:
        root = os.path.abspath(os.path.join(os.path.dirname(plan_md), "..", ".."))

    try:
        text = open(plan_md, encoding="utf-8").read()
    except IOError as exc:
        print("pindirs: cannot read %s (%s)" % (plan_md, exc))
        return 2

    cfg = os.path.join(root, "world.config")
    declared = None
    try:
        for line in open(cfg, encoding="utf-8"):
            m = re.match(r"\s*integration_branch\s*=\s*(\S+)", line)
            if m:
                declared = m.group(1)
    except IOError:
        pass
    if not declared:
        # An absent declaration is not conformance. Refuse rather than invent a
        # value -- a guard whose expectation is whatever it found always passes.
        print("pindirs: no integration_branch in %s -- REFUSING to guess" % cfg)
        return 2

    probes = parse_probes(text)
    if not probes:
        print("pindirs: no probes fence in %s" % plan_md)
        return 2

    # every dir the plan reads facts from, and every dir it dispatches lanes into
    dirs = {}
    for ln, key, kind, src, ext in probes:
        d = dir_of(src)
        if d is None:
            continue
        dirs.setdefault(d, {"probes": 0, "lanes": 0})["probes"] += 1
    # both the field form (`dir: X` on its own line) and the inline roadmap form
    # (`... · dir:X · exit:"..."`). An earlier version anchored at end-of-line and
    # silently missed the inline one -- undercounting is how a census goes quiet.
    for m in re.finditer(r"(?m)(?:^\s*|·\s*)dir:\s*([^\s·]+)", text):
        d = m.group(1).rstrip("/")
        dirs.setdefault(d, {"probes": 0, "lanes": 0})["lanes"] += 1

    repo_pins = {}      # dir -> (key, literal)
    branch_pins = {}    # source -> key
    named_refs = set()  # source of a capture probe
    for ln, key, kind, src, ext in probes:
        if src.endswith("/.git") or src == ".git":
            if ext.startswith("contains:") and "/worktrees/" in ext:
                d = "." if src == ".git" else src[:-len("/.git")]
                repo_pins[d] = (key, ext[len("contains:"):])
        if ext == "contains:ref: refs/heads/" + declared:
            branch_pins[src] = key
        if src.endswith("/HEAD") and ext.startswith("regex:") and "(" in ext:
            named_refs.add(src)

    print("declared world (world.config): %s" % declared)
    print("%-24s %6s %6s  %s" % ("dir", "probes", "lanes", "pin"))
    bad = 0
    for d in sorted(dirs):
        counts = dirs[d]
        repo = repo_pins.get(d)
        why = []
        if not repo:
            why.append("no probe binds %s/.git to a repo worktree" % d)
        else:
            # The literal is a path fragment naming repo+worktree. The ref pin must
            # read THAT worktree's HEAD -- otherwise a plan can pin one dir's ref
            # by reading a different dir's HEAD and still call itself covered.
            hit = [s for s in branch_pins if s.endswith(repo[1] + "/HEAD")]
            if not hit:
                why.append("no probe pins %s/HEAD to refs/heads/%s" % (repo[1], declared))
            elif not any(s.endswith(repo[1] + "/HEAD") for s in named_refs):
                why.append("nothing names the ref actually found at %s/HEAD" % repo[1])
        if why:
            bad += 1
            print("%-24s %6d %6d  UNPINNED -- %s"
                  % (d, counts["probes"], counts["lanes"], "; ".join(why)))
        else:
            print("%-24s %6d %6d  pinned via %s" % (d, counts["probes"], counts["lanes"], repo[0]))

    print()
    if bad:
        print("pindirs: %d of %d dirs UNPINNED -- a fact read from an unpinned dir is a"
              % (bad, len(dirs)))
        print("         measurement of whatever ref somebody last checked out there.")
        return 1
    print("pindirs: all %d dirs pinned to a repo and to %s" % (len(dirs), declared))
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
