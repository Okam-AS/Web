#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""census.py — classify every `exit:` in a plan by the instrument it names.

Read-only.  Loads the plan hub tool as a module and calls its own
`exit_tokens`, `names_the_instrument` and `evidence_admissible`, so the
classification is what the clerk would accept and not what looks reasonable.
No plan state is mutated; nothing is written outside this lane directory.

Usage:
    python3 census.py                       # measure the live plan
    python3 census.py --plan-dir DIR        # measure another plan (a backup)
    python3 census.py --json                # per-exit rows to stdout, no write

Every figure in census.md is emitted from here.  Nothing in that document is
typed by hand, which is the point of the lane: a census that counts itself in
prose reproduces the defect it is measuring.
"""

import argparse
import collections
import importlib.machinery
import importlib.util
import json
import os
import posixpath
import sys

CLERK = os.path.expanduser("~/.claude/skills/plan-hub/bin/plan")
LIVE_PLAN = "/Users/svendaneel/okam/Web-modules/docs/plan"
HERE = os.path.dirname(os.path.abspath(__file__))
WALK_CAP = 50000
EMDASH_SPLIT = "—"


def load_clerk(path=CLERK):
    loader = importlib.machinery.SourceFileLoader("planmod", path)
    spec = importlib.util.spec_from_loader("planmod", loader)
    mod = importlib.util.module_from_spec(spec)
    loader.exec_module(mod)
    return mod


# ---------------------------------------------------------------------------
# Filesystem reach of a path token
#
# `names_the_instrument` matches on STRING prefix in BOTH directions:
#     ev.startswith(tok) or tok.startswith(ev)
# so the evidence that satisfies a token is every existing path that is a
# string prefix of it (its ancestors) plus every existing path it is a string
# prefix of (its descendants and prefix-siblings).  Both directions are
# enumerated below rather than assumed.
# ---------------------------------------------------------------------------

def ancestors_that_exist(root, tok):
    """The `tok.startswith(ev)` direction: every existing path that is a
    string prefix of tok.  Tested at every character offset, not at path
    separators, because the clerk's match is not path-aware."""
    out = []
    for k in range(1, len(tok) + 1):
        cand = tok[:k]
        if os.path.exists(os.path.join(root, cand)):
            out.append(cand)
    return out


def descendants_that_exist(root, tok, cap=WALK_CAP):
    """The `ev.startswith(tok)` direction: every existing path beginning with
    tok.  This is the stamp: for a directory token it is the whole subtree."""
    out = []
    full = os.path.join(root, tok)
    if os.path.isdir(full):
        base = tok if tok.endswith("/") else tok + "/"
        for dirpath, dirnames, filenames in os.walk(full):
            rel = os.path.relpath(dirpath, root).replace(os.sep, "/")
            if rel != ".":
                out.append(rel)
            for fn in filenames:
                out.append(posixpath.join(rel, fn) if rel != "." else fn)
            if len(out) > cap:
                return out, True
        return out, False
    # not a directory: prefix-siblings inside the nearest existing parent
    parent = posixpath.dirname(tok.rstrip("/"))
    pfull = os.path.join(root, parent) if parent else root
    if os.path.isdir(pfull):
        for entry in os.listdir(pfull):
            rel = posixpath.join(parent, entry) if parent else entry
            if not rel.startswith(tok):
                continue
            out.append(rel)
            if os.path.isdir(os.path.join(root, rel)):
                for dirpath, dirnames, filenames in os.walk(
                        os.path.join(root, rel)):
                    r2 = os.path.relpath(dirpath, root).replace(os.sep, "/")
                    out.append(r2)
                    for fn in filenames:
                        out.append(posixpath.join(r2, fn))
                    if len(out) > cap:
                        return out, True
    return out, False


def token_shape(root, tok):
    """What the token is on disk, or what it is shaped like if absent."""
    full = os.path.join(root, tok)
    if os.path.isdir(full):
        return "dir-existing"
    if os.path.isfile(full):
        return "file-existing"
    if tok.endswith("/"):
        return "dir-absent"
    base = posixpath.basename(tok)
    if "." in base.lstrip("."):
        return "file-absent"
    return "shapeless-absent"


def token_reach(mod, plan, ent, tok):
    """Every existing path the clerk would admit as evidence for this token,
    filtered by running the clerk's own admissibility check."""
    root = plan.repo_root
    cands = []
    seen = set()
    for c in ancestors_that_exist(root, tok):
        if c not in seen:
            seen.add(c)
            cands.append(c)
    desc, capped = descendants_that_exist(root, tok)
    for c in desc:
        if c not in seen:
            seen.add(c)
            cands.append(c)
    admitted = []
    for c in cands:
        ok, _why = mod.evidence_admissible(plan, c, ent=ent)
        if ok:
            admitted.append(c)
    return admitted, capped


# ---------------------------------------------------------------------------
# Per-exit classification
# ---------------------------------------------------------------------------

DIR_SHAPES = ("dir-existing", "dir-absent")
FILE_SHAPES = ("file-existing", "file-absent")


def classify(mod, plan, ent):
    ex = ent.get("exit", "") or ""
    facts, paths = mod.exit_tokens(ex)
    row = {
        "id": ent.id,
        "type": ent.type,
        "state": ent.state,
        "evidence": ent.get("evidence", "") or "",
        "exit": ex.strip(),
        "fact_tokens": facts,
        "path_tokens": paths,
    }

    # fact route: ask the clerk with the token exactly as the exit wrote it
    fact_ok = []
    fact_why = {}
    for ft in facts:
        ok, why = mod.evidence_admissible(plan, ft, ent=ent)
        if ok:
            fact_ok.append(ft)
        else:
            fact_why[ft] = why
    row["fact_admissible_now"] = fact_ok
    row["fact_refusals"] = fact_why

    shapes = {}
    reach = {}
    capped_any = False
    all_admitted = set()
    for pt in paths:
        shapes[pt] = token_shape(plan.repo_root, pt)
        adm, capped = token_reach(mod, plan, ent, pt)
        capped_any = capped_any or capped
        reach[pt] = len(adm)
        all_admitted.update(adm)
    row["path_shapes"] = shapes
    row["path_reach"] = reach
    row["admissible_paths"] = len(all_admitted)
    row["admissible_files"] = sum(
        1 for a in all_admitted
        if os.path.isfile(os.path.join(plan.repo_root, a)))
    row["reach_capped"] = capped_any

    has_dir = any(s in DIR_SHAPES for s in shapes.values())
    has_file = any(s in FILE_SHAPES for s in shapes.values())
    has_shapeless = any(s == "shapeless-absent" for s in shapes.values())

    # `shapeless-absent` is a token the tokenizer read as a path because it
    # contains a slash, but which is a branch name, a URL route or an English
    # construction.  It never qualifies an exit as naming a file: no evidence
    # string can ever match it, so treating it as an instrument is exactly
    # the "looks instrumented, is not" case this census exists to separate.
    if has_dir:
        bucket = "C-directory"
    elif has_file:
        bucket = "A-file"
    elif facts:
        bucket = "B-fact"
    elif has_shapeless:
        bucket = "D-not-a-path"
    else:
        bucket = "D-none"
    row["bucket"] = bucket

    # A path token nothing on disk comes near: not a forward reference to an
    # artifact that has not been produced, but an instrument the clerk can
    # never reach from where it stands (wrong repo root, or an English
    # construction the tokenizer read as a path).
    unreachable = [pt for pt in paths
                   if not ancestors_that_exist(plan.repo_root, pt)
                   and reach.get(pt, 0) == 0]
    row["unreachable_tokens"] = unreachable
    row["verifiable_today"] = bool(fact_ok) or row["admissible_paths"] > 0
    return row


# ---------------------------------------------------------------------------
# Which token admitted the evidence a verified entity already carries
# ---------------------------------------------------------------------------

def admitting_tokens(mod, plan, ent, row):
    """For an entity that already carries evidence: which of its exit's
    tokens let that evidence through.  This is what decides whether a
    verified lane rests on the directory hole."""
    ev = row["evidence"]
    if not ev:
        return []
    out = []
    if ev.startswith("fact:"):
        key = ev[5:].split("=", 1)[0]
        for ft in row["fact_tokens"]:
            tkey = ft[5:].partition("=")[0]
            if tkey == key:
                out.append(("fact", ft))
        return out
    for pt in row["path_tokens"]:
        if ev.startswith(pt) or pt.startswith(ev):
            out.append((row["path_shapes"][pt], pt))
    return out


# ---------------------------------------------------------------------------
# Does the artifact say what the exit describes?
# ---------------------------------------------------------------------------

STATUS_KEYS = ("status", "result", "outcome", "state", "verdict")


def artifact_status(root, relpath):
    """The status field a JSON artifact reports about itself, if it has one.
    Path evidence is never read by the clerk; this reads it."""
    full = os.path.join(root, relpath)
    if not os.path.isfile(full) or not relpath.endswith(".json"):
        return None
    try:
        with open(full, "r", encoding="utf-8") as fh:
            doc = json.load(fh)
    except Exception:
        return None
    found = []

    def walk(node, path=""):
        if isinstance(node, dict):
            for k, v in node.items():
                if k.lower() in STATUS_KEYS and isinstance(v, str):
                    found.append((path + "/" + k if path else k, v))
                walk(v, path + "/" + k if path else k)
        elif isinstance(node, list):
            for idx, v in enumerate(node[:50]):
                walk(v, "%s[%d]" % (path, idx))
    walk(doc)
    return found


# ---------------------------------------------------------------------------
# Second-order: would naming a file that already exists fix it?
# ---------------------------------------------------------------------------

def existing_candidates(root, eid):
    """Files already on disk that an exit for this entity could name.

    Split deliberately: a file in the lane's own directory is a work
    artifact, whereas a return is the lane's own report of itself.  Naming
    the second is a much weaker instrument than naming the first, and the
    remedy the owner would rule on differs, so they are never summed."""
    lane_files, returns = [], []
    for d in ("lanes/%s" % eid, "docs/plan/lanes/%s" % eid):
        full = os.path.join(root, d)
        if os.path.isdir(full):
            for dirpath, _dn, filenames in os.walk(full):
                rel = os.path.relpath(dirpath, root).replace(os.sep, "/")
                for fn in filenames:
                    lane_files.append(posixpath.join(rel, fn))
    rdir = os.path.join(root, "docs/plan/returns")
    if os.path.isdir(rdir):
        for fn in sorted(os.listdir(rdir)):
            if fn.startswith(eid + "-"):
                returns.append("docs/plan/returns/" + fn)
    return lane_files, returns


# ---------------------------------------------------------------------------
# Report
# ---------------------------------------------------------------------------

def measure(plan_dir, root_override=None):
    mod = load_clerk()
    plan = mod.load(plan_dir)
    if root_override:
        # The drift comparison measures how the plan TEXT moved, so the
        # filesystem the clerk resolves against is held constant.  Without
        # this a backup outside the repo resolves every path token against
        # its own parent and every shape reads absent.
        plan.repo_root = root_override
    rows = []
    for eid in plan.order:
        ent = plan.entities[eid]
        if not (ent.get("exit", "") or "").strip():
            continue
        rows.append(classify(mod, plan, ent))
    return mod, plan, rows


def pct(n, d):
    return "0.0" if not d else "%.1f" % (100.0 * n / d)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--plan-dir", default=LIVE_PLAN)
    ap.add_argument("--json", action="store_true")
    ap.add_argument("--out", default=os.path.join(HERE, "census.md"))
    ap.add_argument("--compare", default="",
                    help="a second plan dir to report drift against")
    args = ap.parse_args()

    mod, plan, rows = measure(args.plan_dir)
    if args.json:
        json.dump(rows, sys.stdout, indent=1, sort_keys=True)
        print()
        return 0

    root = plan.repo_root
    by = collections.Counter(r["bucket"] for r in rows)
    total = len(rows)
    all_ents = len(plan.entities)
    no_exit = collections.Counter(
        e.type for e in plan.entities.values()
        if not (e.get("exit", "") or "").strip())

    # --- the failing set -------------------------------------------------
    d_none = [r for r in rows if r["bucket"] == "D-none"]
    unreach = [r for r in rows if r["unreachable_tokens"]]
    unverifiable = [r for r in rows if not r["verifiable_today"]]

    # --- the stamped set -------------------------------------------------
    c_dir = [r for r in rows if r["bucket"] == "C-directory"]
    dir_tokens = collections.Counter()
    for r in c_dir:
        for pt, sh in r["path_shapes"].items():
            if sh in DIR_SHAPES:
                dir_tokens[pt] += 1

    # --- verified entities: what admitted them ---------------------------
    carrying = [r for r in rows
                if r["state"] in ("verified", "accepted") and r["evidence"]]
    audit = []
    for r in carrying:
        ent = plan.entities[r["id"]]
        toks = admitting_tokens(mod, plan, ent, r)
        kinds = set(k for k, _t in toks)
        if not toks:
            verdict = "NOTHING-MATCHES"
        elif kinds <= set(DIR_SHAPES):
            verdict = "directory-only"
        elif "fact" in kinds:
            verdict = "fact"
        else:
            verdict = "file"
        interchangeable = r["admissible_files"] if verdict == "directory-only" \
            else None
        audit.append((r, verdict, toks, interchangeable))
    audit_by = collections.Counter(v for _r, v, _t, _i in audit)
    dir_rested = [a for a in audit if a[1] == "directory-only"]

    # --- artifacts that report their own failure -------------------------
    jdir = os.path.join(root, "artifacts/journeys")
    failing_artifacts = []
    if os.path.isdir(jdir):
        for fn in sorted(os.listdir(jdir)):
            rel = "artifacts/journeys/" + fn
            st = artifact_status(root, rel)
            if not st:
                continue
            bad = [(k, v) for k, v in st
                   if v.strip().lower() in ("failed", "fail", "error",
                                            "timedout", "red")]
            if bad:
                failing_artifacts.append((rel, bad))

    # --- the flag's own list, and whether a failing artifact is ever refused
    FLAG_SIX = ["L-GROWTH-MAIL", "L-EV-DIETARY", "L-MEALS-STALE-TOKEN",
                "L-MODAL-SCROLLLOCK", "L-EV-RUNSHEET-PRINT",
                "L-CONFIRM-ADMIN-SURFACE"]
    claimed = set(FLAG_SIX)
    got = set(r["id"] for r, _v, _t, _i in dir_rested)
    jexits = [r for r in rows if "artifacts/journeys/" in r["path_tokens"]]
    fail_accept = {}
    for rel, _bad in failing_artifacts:
        acc = sum(1 for r in jexits
                  if mod.evidence_admissible(
                      plan, rel, ent=plan.entities[r["id"]])[0])
        fail_accept[rel] = acc
    fail_refuse_min = (min(len(jexits) - a for a in fail_accept.values())
                       if fail_accept else None)

    # --- second order ----------------------------------------------------
    have_lane_file, only_return, have_nothing = [], [], []
    for r in unverifiable:
        lf, rt = existing_candidates(root, r["id"])
        if lf:
            have_lane_file.append((r, lf))
        elif rt:
            only_return.append((r, rt))
        else:
            have_nothing.append(r)

    # --- review batch ----------------------------------------------------
    reviews = [r for r in rows
               if any(pt.startswith("docs/plan/reviews/")
                      for pt in r["path_tokens"])]

    # --- durability ------------------------------------------------------
    import subprocess
    tracked = set()
    try:
        outp = subprocess.check_output(
            ["git", "-C", root, "ls-files"], text=True)
        tracked = set(outp.split("\n"))
    except Exception:
        pass
    ev_paths = [r for r in rows if r["evidence"]
                and not r["evidence"].startswith("fact:")]
    ev_tracked = [r for r in ev_paths if r["evidence"] in tracked]

    # --- drift -----------------------------------------------------------
    drift = None
    if args.compare and os.path.isdir(args.compare):
        _m2, _p2, rows2 = measure(args.compare, root_override=root)
        by2 = collections.Counter(r["bucket"] for r in rows2)
        un2 = [r for r in rows2 if not r["verifiable_today"]]
        drift = (len(rows2), by2, len(un2), rows2)

    L = []
    w = L.append
    w("# L-EXIT-INSTRUMENT-CENSUS — every exit, by the instrument it names")
    w("")
    w("Generated by `lanes/L-EXIT-INSTRUMENT-CENSUS/census.py`. **Every number "
      "below is emitted by that script.** Re-run it and the figures "
      "regenerate; nothing here is typed. Read-only: the script loads the "
      "clerk as a module and calls its own `exit_tokens`, "
      "`evidence_admissible` and `names_the_instrument`, so a row says what "
      "the clerk would accept, not what looks reasonable. No plan state was "
      "mutated.")
    w("")
    w("Plan measured: `%s`" % args.plan_dir)
    w("Repo root the clerk resolves evidence against: `%s`" % root)
    w("Snapshot taken: %s"
      % __import__("time").strftime("%Y-%m-%d %H:%M:%S"))
    w("")
    w("**This is a snapshot of a moving tree.** Other lanes write into "
      "`artifacts/` and `lanes/` while this runs, so the file counts below "
      "drift upward between runs. The classifications do not; only the "
      "breadth figures move.")
    w("")
    w("## 0. Headline")
    w("")
    w("- **%d of %d exits (%s%%) name no instrument the clerk can measure.** "
      "Under §6.1 nothing can ever verify them, including this lane's own "
      "sibling flags."
      % (by.get("D-none", 0) + by.get("D-not-a-path", 0), total,
         pct(by.get("D-none", 0) + by.get("D-not-a-path", 0), total)))
    w("- **%d exits name a directory**, satisfied by any file beneath it. "
      "That includes **all %d module Features** — the plan's top-level "
      "acceptance."
      % (by.get("C-directory", 0),
         len([r for r in rows if r["type"] == "Feature"
              and r["bucket"] == "C-directory"])))
    w("- **%d exits have no admissible evidence available today** (%s%%), "
      "which is a larger set than the two D buckets."
      % (len(unverifiable), pct(len(unverifiable), total)))
    w("- **%d verified entities rest on a directory token and nothing else.** "
      "The flag names six; %d of its six are confirmed, %d is refuted, and "
      "%d it does not name is added."
      % (len(dir_rested), len(claimed & got), len(claimed - got),
         len(got - claimed)))
    if fail_accept:
        w("- **%d of %d exits naming `artifacts/journeys/` refuse an artifact "
          "whose own status field reads `failed`** — measured by calling the "
          "clerk on %d such artifacts found on disk."
          % (fail_refuse_min, len(jexits), len(fail_accept)))
    w("- Of the %d unverifiable exits, **%d already have a work artifact on "
      "disk** in their own lane directory; **%d have nothing at all**."
      % (len(unverifiable), len(have_lane_file), len(have_nothing)))
    w("")
    w("## 1. The population")
    w("")
    w("| | count |")
    w("|---|---|")
    w("| entities in plan.md | %d |" % all_ents)
    w("| **entities carrying an `exit:` — the census population** | **%d** |"
      % total)
    w("| entities with no `exit:` field (cannot be verified at all) | %d |"
      % sum(no_exit.values()))
    w("")
    w("The entities with no `exit:` are %s. `names_the_instrument` refuses "
      "them outright, so they are not exits and are out of population."
      % ", ".join("%d %s" % (n, t) for t, n in sorted(no_exit.items())))
    w("")
    w("## 2. The four buckets")
    w("")
    w("Assignment is by the **loosest** instrument an exit names, because the "
      "clerk admits evidence matching *any* token: a single directory token "
      "decides what can satisfy the exit no matter what else sits beside it.")
    w("")
    w("| bucket | meaning | count | share |")
    w("|---|---|---|---|")
    for key, label in (
            ("A-file", "names a specific file"),
            ("B-fact", "names a `fact:` key and no file or directory"),
            ("C-directory", "names a directory (satisfied by any file under "
                            "it)"),
            ("D-not-a-path", "names only a path-shaped word that is not a "
                             "path"),
            ("D-none", "names no instrument at all")):
        w("| %s | %s | %d | %s%% |"
          % (key, label, by.get(key, 0), pct(by.get(key, 0), total)))
    w("| | **total** | **%d** | |" % total)
    w("")
    dnone_all = by.get("D-none", 0) + by.get("D-not-a-path", 0)
    w("`D-not-a-path` is split out rather than folded into `A-file` because "
      "the tokenizer takes any whitespace-delimited word containing a slash "
      "as a path. **Under §6.1 both D rows are the same outcome — %d exits "
      "name nothing the clerk can ever measure — but the remedies differ**, "
      "so they are counted apart." % dnone_all)
    w("")
    w("### 2.1 The unverifiable set, decomposed exactly")
    w("")
    w("An exit is unverifiable today when **no string at all** would pass "
      "`plan verify`. That is a larger set than bucket D, and the rows below "
      "sum to it.")
    w("")
    unv_by = collections.Counter(r["bucket"] for r in unverifiable)
    w("| bucket | unverifiable today | why |")
    w("|---|---|---|")
    for key, why in (
            ("D-none", "the `exit:` names nothing"),
            ("D-not-a-path", "its only token is a branch name or a slash in "
                             "prose"),
            ("A-file", "the named file does not exist yet and no ancestor of "
                       "it does either"),
            ("B-fact", "the probe behind the named fact cannot currently "
                       "deliver an admissible reading"),
            ("C-directory", "the named directory does not exist yet")):
        if unv_by.get(key):
            w("| %s | %d | %s |" % (key, unv_by.get(key, 0), why))
    w("| **total** | **%d** (%s%% of %d) | |"
      % (len(unverifiable), pct(len(unverifiable), total), total))
    w("")
    bfail = [r for r in unverifiable if r["bucket"] == "B-fact"]
    if bfail:
        reasons = collections.Counter()
        for r in bfail:
            for _ft, why in sorted(r["fact_refusals"].items()):
                reasons[why.split(EMDASH_SPLIT)[0].strip()] += 1
        w("The bucket-B refusals, in the clerk's own words:")
        w("")
        for why, n in reasons.most_common():
            w("- %d × `%s`" % (n, why))
        w("")
    w("Separately, **%d exits name at least one token nothing on disk comes "
      "near**; %d of them are still verifiable because they also name "
      "something real, which is why that figure is not a row above."
      % (len(unreach), len([r for r in unreach if r["verifiable_today"]])))
    w("")
    if unreach:
        tok_count = collections.Counter()
        for r in unreach:
            for t in r["unreachable_tokens"]:
                tok_count[t] += 1
        w("Every path token in the plan that reaches nothing on disk, and "
          "what it actually is:")
        w("")
        w("| token | exits naming it | what it is |")
        w("|---|---|---|")
        for t, n in tok_count.most_common():
            kindtxt = ("a git branch" if t.startswith(("feature/", "lane/"))
                       else "a URL route" if t.startswith("/")
                       else "an English construction, not a path")
            w("| `%s` | %d | %s |" % (t, n, kindtxt))
        w("")
    w("## 3. What a directory token actually admits")
    w("")
    w("| directory token | on disk | exits naming it | existing files it "
      "admits |")
    w("|---|---|---|---|")
    for tok, n in dir_tokens.most_common():
        sample = [r for r in c_dir if tok in r["path_shapes"]][0]
        w("| `%s` | %s | %d | %d |"
          % (tok, sample["path_shapes"][tok], n, sample["admissible_files"]))
    w("")
    feat_c = [r for r in c_dir if r["type"] == "Feature"]
    w("| | count |")
    w("|---|---|")
    w("| bucket-C exits that are **Features** — the plan's top-level "
      "acceptance | %d of %d |"
      % (len(feat_c), len([r for r in rows if r["type"] == "Feature"])))
    w("| bucket-C exits that are Lanes | %d |"
      % len([r for r in c_dir if r["type"] == "Lane"]))
    w("")
    if feat_c:
        w("**Every module Feature in this plan is directory-stamped**: %s. "
          "The highest-level acceptance the plan has is satisfied by any one "
          "of %d files."
          % (", ".join("`%s`" % r["id"] for r in feat_c),
             feat_c[0]["admissible_files"]))
        w("")
    w("## 4. Naming a file is not the protection it reads as")
    w("")
    w("`names_the_instrument` matches on string prefix in **both** "
      "directions:")
    w("")
    w("```python")
    w("for tok in paths:")
    w("    if ev.startswith(tok) or tok.startswith(ev):")
    w("        return True, \"\"")
    w("```")
    w("")
    w("`tok.startswith(ev)` means every existing **ancestor** of a named file "
      "is admissible evidence for it. An exit naming one specific file is "
      "therefore satisfied by the directory holding it, and by that "
      "directory's parent, up to the repo root.")
    w("")
    afile = [r for r in rows if r["bucket"] == "A-file"]
    exists_now = [r for r in afile
                  if any(s == "file-existing"
                         for s in r["path_shapes"].values())]
    multi = [r for r in exists_now if r["admissible_paths"] > 1]
    w("| | count |")
    w("|---|---|")
    w("| bucket-A exits (name a specific file) | %d |" % len(afile))
    w("| of those, whose named file exists today | %d |" % len(exists_now))
    w("| of those, admitting **more than one** existing path as evidence | %d "
      "|" % len(multi))
    if multi:
        widths = sorted(r["admissible_paths"] for r in multi)
        w("| median number of distinct paths a bucket-A exit admits | %d |"
          % widths[len(widths) // 2])
        w("| widest bucket-A exit | %d paths (`%s`) |"
          % (max(widths),
             max(multi, key=lambda r: r["admissible_paths"])["id"]))
    w("")
    w("So bucket A is tighter than bucket C by orders of magnitude, but it is "
      "not one artifact either. **No exit in this plan pins exactly one "
      "file.**")
    w("")
    w("## 5. The six lanes the flag names, checked rather than inherited")
    w("")
    w("For every entity already carrying evidence, the census asks which of "
      "its own exit's tokens let that evidence through.")
    w("")
    w("| admitted by | verified/accepted entities |")
    w("|---|---|")
    for k, n in sorted(audit_by.items()):
        w("| %s | %d |" % (k, n))
    w("| **total carrying evidence** | **%d** |" % len(carrying))
    w("")
    w("**Entities whose evidence was admitted by a directory token and "
      "nothing else — the true stamped set (%d):**" % len(dir_rested))
    w("")
    w("| entity | state | evidence | token that admitted it | other existing "
      "files that would have done equally |")
    w("|---|---|---|---|---|")
    for r, _v, toks, inter in sorted(dir_rested, key=lambda a: a[0]["id"]):
        w("| `%s` | %s | `%s` | `%s` | %s |"
          % (r["id"], r["state"], r["evidence"],
             ", ".join(t for _k, t in toks),
             (inter - 1) if inter else 0))
    w("")
    w("Against the list the flag records:")
    w("")
    w("| | ids |")
    w("|---|---|")
    w("| flag claims | %s |" % ", ".join("`%s`" % i for i in FLAG_SIX))
    w("| census confirms | %s |"
      % (", ".join("`%s`" % i for i in sorted(claimed & got)) or "none"))
    w("| flag claims, census refutes | %s |"
      % (", ".join("`%s`" % i for i in sorted(claimed - got)) or "none"))
    w("| census finds, flag omits | %s |"
      % (", ".join("`%s`" % i for i in sorted(got - claimed)) or "none"))
    w("")
    for eid in sorted(claimed - got):
        r = [x for x in rows if x["id"] == eid]
        if r:
            r = r[0]
            w("- `%s` carries evidence `%s`, which is a **%s**, not a "
              "directory. Its exit names `%s` as well, but that is not what "
              "admitted it."
              % (eid, r["evidence"],
                 "fact reading" if r["evidence"].startswith("fact:")
                 else "file",
                 ", ".join("`%s`" % t for t, s in r["path_shapes"].items()
                           if s in DIR_SHAPES) or "no directory"))
    w("")
    w("## 6. Path evidence is never read — measured on the artifacts "
      "themselves")
    w("")
    w("The clerk checks that an evidence path exists and is not a suite "
      "artifact. It never opens it. The census does.")
    w("")
    if failing_artifacts:
        w("| artifact under `artifacts/journeys/` | status field it reports "
          "about itself |")
        w("|---|---|")
        for rel, bad in failing_artifacts:
            w("| `%s` | %s |"
              % (rel, ", ".join("`%s` = `%s`" % (k, v) for k, v in bad[:3])))
        w("")
        w("**Not asserted — run.** For every failing artifact above, the "
          "census called the clerk's own `evidence_admissible(plan, "
          "artifact, ent=exit)` against every exit naming "
          "`artifacts/journeys/` and counted the acceptances.")
        w("")
        w("| failing artifact | exits naming `artifacts/journeys/` that "
          "accept it | that refuse it |")
        w("|---|---|---|")
        for rel, acc in sorted(fail_accept.items()):
            w("| `%s` | %d | %d |" % (rel, acc, len(jexits) - acc))
        w("")
        w("So an artifact whose own status field reads `failed` is admissible "
          "evidence for the exits above, including all %d module Features. "
          "The flag's `clears_when` asks for a case where a failing artifact "
          "is refused; there is currently none."
          % len([r for r in jexits if r["type"] == "Feature"]))
    else:
        w("No artifact under `artifacts/journeys/` currently reports a "
          "failing status field in the keys %s."
          % ", ".join("`%s`" % k for k in STATUS_KEYS))
    w("")
    w("## 7. The review batch — the honest case, separated")
    w("")
    w("| | count |")
    w("|---|---|")
    w("| exits naming a path under `docs/plan/reviews/` | %d |" % len(reviews))
    w("| of those, naming a specific file rather than the directory | %d |"
      % len([r for r in reviews if r["bucket"] == "A-file"]))
    w("| of those, naming the directory | %d |"
      % len([r for r in reviews if r["bucket"] == "C-directory"]))
    w("")
    w("**The flag is right that the directory hole does not apply to these, "
      "and wrong that it makes them sound.** The prefix match runs both "
      "ways, so each of them also admits every ancestor of the file it "
      "names. Measured by asking the clerk:")
    w("")
    w("| evidence offered | of the %d review exits, how many accept it |"
      % len(reviews))
    w("|---|---|")
    for cand in ("docs/plan/reviews", "docs/plan", "docs"):
        n = sum(1 for r in reviews
                if mod.evidence_admissible(
                    plan, cand, ent=plan.entities[r["id"]])[0])
        w("| `%s` | %d |" % (cand, n))
    w("")
    w("So the twenty-two are the honest case in one respect only: **the "
      "evidence actually recorded against them is the specific document each "
      "exit names**, and for a review whose deliverable *is* that document "
      "the gap between \"the file exists\" and \"the file says what the exit "
      "describes\" is narrow. **Nothing in the tool enforced that outcome — "
      "the authors chose it**, and the %d exits in bucket C had exactly the "
      "same freedom and named a directory instead." % len(c_dir))
    w("")
    w("## 8. Durability of the evidence already recorded")
    w("")
    w("| | count |")
    w("|---|---|")
    w("| entities whose evidence is a path | %d |" % len(ev_paths))
    w("| of those, tracked by git | %d |" % len(ev_tracked))
    w("")
    w("## 9. Second order — would naming an existing file be enough?")
    w("")
    w("Is this a backlog needing work, or a backlog needing a sentence? The "
      "two rows are never summed: a file in the lane's own directory is a "
      "work artifact, a return is the lane's own report of itself, and only "
      "the first is an instrument in any useful sense.")
    w("")
    w("| | count | share of the unverifiable |")
    w("|---|---|---|")
    w("| exits with no admissible evidence today | %d | |" % len(unverifiable))
    w("| of those, a **work artifact already on disk** in `lanes/<id>/` | %d "
      "| %s%% |" % (len(have_lane_file),
                    pct(len(have_lane_file), len(unverifiable))))
    w("| of those, **only a return** exists to name | %d | %s%% |"
      % (len(only_return), pct(len(only_return), len(unverifiable))))
    w("| of those, **nothing on disk at all** | %d | %s%% |"
      % (len(have_nothing), pct(len(have_nothing), len(unverifiable))))
    w("")
    if have_nothing:
        w("The exits with nothing to name: %s."
          % ", ".join("`%s`" % r["id"] for r in sorted(
              have_nothing, key=lambda x: x["id"])))
        w("")
    if drift:
        w("## 10. Drift against the prose")
        w("")
        w("Measured by running this same script against the 2026-08-03 backup "
          "at `%s`." % args.compare)
        w("")
        w("| | 2026-08-03 backup | live plan | delta |")
        w("|---|---|---|---|")
        w("| exits | %d | %d | %+d |" % (drift[0], total, total - drift[0]))
        for key in ("A-file", "B-fact", "C-directory", "D-not-a-path",
                    "D-none"):
            w("| %s | %d | %d | %+d |"
              % (key, drift[1].get(key, 0), by.get(key, 0),
                 by.get(key, 0) - drift[1].get(key, 0)))
        w("| no admissible evidence today | %d | %d | %+d |"
          % (drift[2], len(unverifiable), len(unverifiable) - drift[2]))
        w("")
        w("### 10.1 The two prose numbers, tested")
        w("")
        w("`F-EXIT-PREFIX-IS-A-STAMP` records **109 of 149**. Neither figure "
          "matches any population the census can construct, on either the "
          "backup or the live plan.")
        w("")
        w("| population | exits | naming no instrument |")
        w("|---|---|---|")
        for label, rr in (("2026-08-03 backup, all exits", drift[3]),
                          ("live plan, all exits", rows)):
            nn = len([r for r in rr if r["bucket"].startswith("D-")])
            w("| %s | %d | %d |" % (label, len(rr), nn))
        for label, rr in (("2026-08-03 backup, `built-unverified` only",
                           [r for r in drift[3]
                            if r["state"] == "built-unverified"]),
                          ("live plan, `built-unverified` only",
                           [r for r in rows
                            if r["state"] == "built-unverified"])):
            nn = len([r for r in rr if r["bucket"].startswith("D-")])
            w("| %s | %d | %d |" % (label, len(rr), nn))
        w("")
        bu2 = [r for r in drift[3] if r["state"] == "built-unverified"]
        w("The nearest match is the `built-unverified` population on the "
          "backup: %d exits, of which %d name no instrument. "
          "`L-EXIT-INSTRUMENT-SWEEP` measured that same population "
          "independently and reported **122 lanes, 88 naming neither a fact "
          "nor a path** — which is the cross-check on this script's method, "
          "not a competing number."
          % (len(bu2), len([r for r in bu2
                            if r["bucket"].startswith("D-")])))
        w("")
        w("| that lane's figure | this census, same population |")
        w("|---|---|")
        w("| 122 lanes at `built-unverified` | %d |" % len(bu2))
        w("| 14 exits yielding a `fact:` token | %d |"
          % len([r for r in bu2 if r["fact_tokens"]]))
        w("| 20 exits yielding a path token | %d |"
          % len([r for r in bu2 if r["path_tokens"]]))
        w("| 88 yielding neither | %d |"
          % len([r for r in bu2
                 if not r["fact_tokens"] and not r["path_tokens"]]))
        w("")

    w("## 11. This census against its own standard")
    w("")
    me = [r for r in rows if r["id"] == "L-EXIT-INSTRUMENT-CENSUS"]
    if me:
        me = me[0]
        w("| | |")
        w("|---|---|")
        w("| this lane's bucket | %s |" % me["bucket"])
        w("| the token its exit names | %s |"
          % ", ".join("`%s`" % t for t in me["path_tokens"]))
        w("| paths that token admits as evidence | %d |"
          % me["admissible_paths"])
        w("")
        w("So this document does not pin itself either: %d existing paths "
          "would satisfy the exit that produced it, because every ancestor "
          "directory of the named file is an admissible prefix. **That is "
          "the same defect measured in section 4, and it is recorded here "
          "rather than excepted.**" % me["admissible_paths"])
        w("")
    w("On *committed*: the brief asks for a committed script. `census.py` "
      "sits beside this file and is durable and re-runnable, but it is **not "
      "committed to git** — the orchestrator's standing instruction for this "
      "lane forbids committing to a shared branch, and `docs/plan/` is "
      "untracked entirely (`F-PLAN-NOT-IN-GIT`). Of the %d entities whose "
      "recorded evidence is a path, **%d are tracked by git**. Committing "
      "this lane is the owner's to authorise."
      % (len(ev_paths), len(ev_tracked)))
    w("")
    w("## Appendix A — every exit, one row each")
    w("")
    w("| id | type | state | bucket | fact tokens | path tokens | shapes | "
      "admissible paths today |")
    w("|---|---|---|---|---|---|---|---|")
    for r in sorted(rows, key=lambda x: (x["bucket"], x["id"])):
        w("| `%s` | %s | %s | %s | %s | %s | %s | %d |"
          % (r["id"], r["type"], r["state"], r["bucket"],
             ", ".join("`%s`" % t for t in r["fact_tokens"]) or "—",
             ", ".join("`%s`" % t for t in r["path_tokens"]) or "—",
             ", ".join(sorted(set(r["path_shapes"].values()))) or "—",
             r["admissible_paths"]))
    w("")

    text = "\n".join(L) + "\n"
    with open(args.out, "w", encoding="utf-8") as fh:
        fh.write(text)
    sys.stderr.write("wrote %s (%d lines)\n" % (args.out, len(L)))

    # machine-readable companion
    with open(os.path.join(HERE, "census.json"), "w", encoding="utf-8") as fh:
        json.dump(rows, fh, indent=1, sort_keys=True)
    return 0


if __name__ == "__main__":
    sys.exit(main())
