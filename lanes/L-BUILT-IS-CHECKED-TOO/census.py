#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Census of the 284 pointers `plan built` never measured.

Reads only.  Writes only under lanes/L-BUILT-IS-CHECKED-TOO/.
The instrument is imported as a module and NO verb is invoked, so nothing in
docs/plan/** is written and the repaired checker is asked exactly the question
`cmd_verify` would ask it: `evidence_admissible(p, ev, ent=e)`.

Sorts by WHAT THE POINTER IS, not by whether it passes:
  A  a named artifact that exists          (whole string resolves to a file)
  B  a named artifact that does not exist  (path-shaped, resolves to nothing)
  C  a directory                           (whole string resolves to a dir)
  D  prose that was never a path           (not path-shaped, resolves to nothing)
D is split by whether the sentence CONTAINS a token that does resolve, because
that is the difference between a one-line correction and a missing artifact.
"""
import importlib.machinery
import importlib.util
import json
import os
import re
import sys

PLAN_BIN = "/Users/svendaneel/.local/bin/plan"
REPO = "/Users/svendaneel/okam/Web-modules"
OUT = os.path.join(REPO, "lanes/L-BUILT-IS-CHECKED-TOO")

spec = importlib.util.spec_from_loader(
    "pm", importlib.machinery.SourceFileLoader("pm", PLAN_BIN))
pm = importlib.util.module_from_spec(spec)
sys.argv = ["plan"]
spec.loader.exec_module(pm)
p = pm.load(os.path.join(REPO, "docs", "plan"))
pm.parse(p)

# A token that could be a path: has a separator or a file extension, and no
# whitespace.  Deliberately generous — over-collecting here only means a token
# is offered to the resolver and rejected, never that a pointer is miscounted.
TOKEN_RE = re.compile(r"[~./A-Za-z0-9_-]*/[~./A-Za-z0-9_,{}=+-]+")
# "path-shaped" for the B-vs-D split: the WHOLE string is one word carrying a
# separator or a known artifact extension.
EXT = (".md", ".txt", ".json", ".xml", ".trx", ".log", ".py", ".sh", ".sql",
       ".png", ".csv", ".patch", ".diff", ".yml", ".yaml", ".ts", ".vue",
       ".cs", ".js", ".html")


def resolve(tok):
    """Absolute candidate for a token, or None if it resolves to nothing."""
    tok = tok.strip().strip("\"'`").rstrip(",;")
    if not tok or tok.startswith("http"):
        return None
    cands = []
    if tok.startswith("~"):
        cands.append(os.path.expanduser(tok))
    elif os.path.isabs(tok):
        cands.append(tok)
    else:
        cands.append(os.path.join(p.repo_root, tok))
        cands.append(os.path.join(os.path.dirname(p.repo_root), tok))
    for c in cands:
        if os.path.exists(c):
            return c
    return None


def outcome_of(absp):
    """What the artifact's own declared field says — the checker's rule, not a
    grep.  Returns (verdict, detail)."""
    if not absp.endswith(".json"):
        return "PROSE", "no machine-readable field; admitted on naming alone"
    try:
        with open(absp, "r", encoding="utf-8", errors="replace") as fh:
            d = json.load(fh)
    except Exception as ex:                                  # noqa: BLE001
        return "UNPARSEABLE", str(ex)[:120]
    if not isinstance(d, dict):
        return "NO-FIELD", "top level is %s" % type(d).__name__
    for k in pm.OUTCOME_KEYS:
        if k not in d:
            continue
        w = ("" if d[k] is None else str(d[k])).strip().lower()
        if w in pm.OUTCOME_PASSED:
            return "PASS", "%s=%s" % (k, d[k])
        if w in pm.OUTCOME_FAILED:
            return "FAIL", "%s=%s" % (k, d[k])
        return "UNREADABLE-WORD", "%s=%s" % (k, d[k])
    return "NO-FIELD", "keys=%r" % (list(d)[:8],)


rows = []
for e in p.entities.values():
    if e.state != "built-unverified":
        continue
    ev = (e.get("evidence", "") or "").strip()
    if not ev or ev.startswith("fact:"):
        continue
    ex = (e.get("exit", "") or "").strip()
    _, expaths = pm.exit_tokens(ex)

    whole = resolve(ev)
    if whole and os.path.isdir(whole):
        cat = "C-directory"
    elif whole:
        cat = "A-artifact-exists"
    else:
        one_word = not re.search(r"\s", ev)
        looks = one_word and ("/" in ev or ev.lower().endswith(EXT))
        cat = "B-artifact-missing" if looks else "D-prose"

    # tokens inside the string that DO resolve — the cheap-fix signal
    inner = []
    for t in TOKEN_RE.findall(ev):
        t = t.strip(" ,;·)(\"'`")
        r = resolve(t)
        if r:
            v, det = outcome_of(r)
            inner.append(dict(token=t, path=r,
                              isdir=os.path.isdir(r), outcome=v, detail=det))
        else:
            inner.append(dict(token=t, path=None, isdir=False,
                              outcome="MISSING", detail=""))
    inner_ok = [t for t in inner if t["path"] and not t["isdir"]]

    # What the REPAIRED checker says, asked exactly as cmd_verify asks it.
    ok, why = pm.evidence_admissible(p, ev, ent=e)
    # ...and the kind/status half alone, so the two refusals are separable.
    kok, kwhy = pm._evidence_kind_ok(p, ev)
    # ...and would it admit if the pointer were trimmed to a resolving token?
    trimmed, tok_ok, tok_why = None, None, ""
    for t in inner_ok:
        o2, w2 = pm.evidence_admissible(p, t["token"], ent=e)
        if trimmed is None or o2:
            trimmed, tok_ok, tok_why = t["token"], o2, w2
        if o2:
            break

    own = outcome_of(whole) if (whole and not os.path.isdir(whole)) \
        else ("", "")
    rows.append(dict(
        id=e.id, type=e.type, title=e.title, evidence=ev, exit=ex,
        exit_paths=expaths, exit_has_path=bool(expaths),
        category=cat, resolved=whole,
        own_outcome=own[0], own_detail=own[1],
        admissible=ok, reason=why,
        kind_ok=kok, kind_reason=kwhy,
        inner=inner, inner_resolving=len(inner_ok),
        trim_token=trimmed, trim_admissible=tok_ok, trim_reason=tok_why))

rows.sort(key=lambda r: (r["category"], r["id"]))
with open(os.path.join(OUT, "census.json"), "w") as fh:
    json.dump(rows, fh, indent=1)

print("built-unverified entities with a path-shaped pointer: %d" % len(rows))
cats = {}
for r in rows:
    cats.setdefault(r["category"], []).append(r)
print("\n--- BY WHAT THE POINTER IS -------------------------------------")
for c in sorted(cats):
    print("  %-22s %4d" % (c, len(cats[c])))

print("\n--- WHAT THE REPAIRED CHECKER WOULD DO -------------------------")
adm = [r for r in rows if r["admissible"]]
ref = [r for r in rows if not r["admissible"]]
print("  admit  %4d" % len(adm))
print("  refuse %4d" % len(ref))
print("\n  refusals by category:")
for c in sorted(cats):
    a = sum(1 for r in cats[c] if r["admissible"])
    print("    %-22s admit %3d   refuse %3d" % (c, a, len(cats[c]) - a))


def bucket(r):
    w = r["reason"]
    if "does not exist" in w:
        return "path does not exist"
    if "is a directory" in w:
        return "evidence is a directory"
    if "records its own failure" in w:
        return "artifact reads a FAILED outcome"
    if "declares no outcome" in w:
        return "JSON declares no outcome"
    if "does not parse as JSON" in w:
        return "does not parse as JSON"
    if "neither a pass nor a fail" in w:
        return "outcome word unreadable"
    if "has no `exit:`" in w:
        return "entity has no exit:"
    if "names the directory" in w:
        return "exit names a DIRECTORY, not an artifact"
    if "is broader than" in w:
        return "evidence broader than the exit's token"
    if "does not name" in w:
        return "exit does not name this evidence"
    if "inadmissible" in w:
        return "suite-kind artifact"
    return "OTHER: " + w[:60]


print("\n  refusals by reason:")
by = {}
for r in ref:
    by.setdefault(bucket(r), []).append(r)
for k in sorted(by, key=lambda x: -len(by[x])):
    print("    %-42s %4d" % (k, len(by[k])))

print("\n--- HOW EXPENSIVE IS THE FIX ------------------------------------")
for c in sorted(cats):
    rr = cats[c]
    trim = sum(1 for r in rr if r["trim_admissible"])
    has = sum(1 for r in rr if r["inner_resolving"])
    noex = sum(1 for r in rr if not r["exit_has_path"])
    print("  %-22s n=%3d  contains a resolving artifact=%3d  "
          "trimming ALONE admits=%3d  exit names no path=%3d"
          % (c, len(rr), has, trim, noex))

with open(os.path.join(OUT, "by-reason.json"), "w") as fh:
    json.dump({k: [r["id"] for r in v] for k, v in by.items()}, fh, indent=1)

# Every row, long form, for the finding.
with open(os.path.join(OUT, "census.txt"), "w") as fh:
    for c in sorted(cats):
        fh.write("\n%s\n%s  (%d)\n%s\n" % ("=" * 78, c, len(cats[c]), "=" * 78))
        for r in cats[c]:
            fh.write("\n%-38s %s\n" % (r["id"], r["type"]))
            fh.write("  evidence: %s\n" % r["evidence"][:400])
            fh.write("  exit    : %s\n" % r["exit"][:400])
            if r["resolved"]:
                fh.write("  resolves: %s  [%s %s]\n"
                         % (r["resolved"], r["own_outcome"], r["own_detail"]))
            fh.write("  checker : %s | %s\n"
                     % ("ADMIT" if r["admissible"] else "REFUSE", r["reason"]))
            for t in r["inner"]:
                fh.write("    token %-64s %s\n"
                         % (t["token"][:64],
                            (t["outcome"] + " " + t["detail"])[:70]))
            if r["trim_token"]:
                fh.write("    trim -> %-58s %s | %s\n"
                         % (r["trim_token"][:58],
                            "ADMIT" if r["trim_admissible"] else "REFUSE",
                            r["trim_reason"][:70]))
print("\nwrote census.json / census.txt / by-reason.json")
