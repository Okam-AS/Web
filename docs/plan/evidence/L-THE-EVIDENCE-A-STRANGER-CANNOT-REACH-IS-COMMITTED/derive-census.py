#!/usr/bin/env python3
"""L-THE-EVIDENCE-A-STRANGER-CANNOT-REACH-IS-COMMITTED — the universe, derived afresh.

For every built-unverified lane in plan.md, every file-shaped token in its evidence: line is
resolved against every root a reader would plausibly try, then asked one question: is it
committed to a git ref anywhere?
"""
import os, re, subprocess, json, collections

PLAN = "/Users/svendaneel/okam/Web-modules/docs/plan/plan.md"
PLANREPO = "/Users/svendaneel/okam/Web-modules"
BACKEND = "/Users/svendaneel/okam/OkamAPI-modules"
ROOTS = [
    ("plan", PLANREPO),
    ("plan/docs/plan", os.path.join(PLANREPO, "docs/plan")),
    ("backend", BACKEND),
]

lanes, cur = [], None
for line in open(PLAN, encoding="utf-8"):
    m = re.match(r"^### Lane (\S+)", line)
    if m:
        cur = {"id": m.group(1), "state": None, "evidence": None}
        lanes.append(cur)
        continue
    if cur is None:
        continue
    if line.startswith("state: ") and cur["state"] is None:
        cur["state"] = line[7:].strip()
    elif line.startswith("evidence: ") and cur["evidence"] is None:
        cur["evidence"] = line[10:].strip()

bu = [l for l in lanes if l["state"] == "built-unverified"]

TOKEN = re.compile(r"[A-Za-z0-9_./~+-]*/[A-Za-z0-9_./~+-]+")
EXT = re.compile(r"\.(md|txt|trx|json|log|png|pdf|py|sh|cs|js|vue|xml|html|csv|patch|diff)$", re.I)


def sh(repo, args):
    return subprocess.run(["git"] + args, cwd=repo, capture_output=True, text=True)


def toplevel(p):
    d = p if os.path.isdir(p) else os.path.dirname(p)
    while d and d != "/" and not os.path.isdir(d):
        d = os.path.dirname(d)
    if not d or d == "/":
        return None
    r = subprocess.run(["git", "rev-parse", "--show-toplevel"], cwd=d,
                       capture_output=True, text=True)
    return r.stdout.strip() or None


def classify(tok):
    """-> (status, where)"""
    cands = []
    if tok.startswith("/"):
        cands = [("absolute", tok)]
    elif tok.startswith("../"):
        cands = [("relative-to-plan", os.path.normpath(os.path.join(PLANREPO, tok)))]
    else:
        cands = [(n, os.path.join(r, tok)) for n, r in ROOTS]

    # 1. does it resolve on disk anywhere?
    for name, p in cands:
        if os.path.exists(p):
            top = toplevel(p)
            if not top:
                return "ON DISK, OUTSIDE ANY REPO", p
            rel = os.path.relpath(p, top)
            if sh(top, ["ls-files", "--error-unmatch", "--", rel]).returncode == 0:
                return "committed (tracked at HEAD)", p
            if sh(top, ["log", "--all", "--oneline", "-1", "--", rel]).stdout.strip():
                return "committed (on another ref)", p
            return "ON DISK, COMMITTED NOWHERE", p

    # 2. not on disk — is it committed to some ref in either repo?
    for repo in (PLANREPO, BACKEND):
        base = tok.lstrip("./")
        if sh(repo, ["log", "--all", "--oneline", "-1", "--", base]).stdout.strip():
            return "committed (on another ref, not checked out)", repo + "::" + base
    return "RESOLVES NOWHERE", cands[0][1]


rows = []
for lane in bu:
    ev = lane["evidence"] or ""
    seen = set()
    for tok in TOKEN.findall(ev):
        tok = tok.rstrip(".,;)·")
        if not EXT.search(tok) or tok in seen:
            continue
        seen.add(tok)
        st, where = classify(tok)
        rows.append({"lane": lane["id"], "token": tok, "status": st, "where": where})

print("built-unverified lanes in plan.md right now:", len(bu))
print("file-shaped tokens in their evidence lines:", len(rows))
c = collections.Counter(r["status"] for r in rows)
for k, v in c.most_common():
    print("  %-44s %d" % (k, v))
nofile = [l["id"] for l in bu if not any(r["lane"] == l["id"] for r in rows)]
print("lanes whose evidence names NO file-shaped token at all:", len(nofile))
out = "/private/tmp/claude-501/-Users-svendaneel-okam/766072d3-8965-4c45-be67-76b407d86aaf/scratchpad/b4-enum2.json"
json.dump({"built_unverified": [l["id"] for l in bu], "no_file_token": nofile, "rows": rows},
          open(out, "w"), indent=1)
print("written", out)
