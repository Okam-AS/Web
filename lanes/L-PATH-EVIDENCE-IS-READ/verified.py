#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""The 54 verified entities with path-shaped evidence, in full.

For each: the exit, the evidence, which exit token the prefix rule matched,
and — the thing the instrument never does — what the artifact SAYS.
"""
import importlib.machinery
import importlib.util
import json
import os
import sys

PLAN_BIN = "/Users/svendaneel/.local/bin/plan"
REPO = "/Users/svendaneel/okam/Web-modules"

spec = importlib.util.spec_from_loader(
    "planmod", importlib.machinery.SourceFileLoader("planmod", PLAN_BIN))
planmod = importlib.util.module_from_spec(spec)
sys.argv = ["plan"]
spec.loader.exec_module(planmod)

p = planmod.load(os.path.join(REPO, "docs", "plan"))
planmod.parse(p)


def artifact_status(absp):
    """Read the artifact and report what its own status field says.
    Returns (verdict, detail).  verdict in pass|fail|mixed|unreadable|dir|none
    """
    if os.path.isdir(absp):
        return "dir", "evidence is a DIRECTORY, no status of its own"
    if not os.path.exists(absp):
        return "missing", "no such path"
    try:
        with open(absp, "r", errors="replace") as fh:
            raw = fh.read()
    except Exception as ex:
        return "unreadable", str(ex)
    if absp.endswith(".json"):
        try:
            d = json.loads(raw)
        except Exception as ex:
            return "unreadable", "json parse: %s" % ex
        bits = []
        # common shapes seen in artifacts/journeys/*.json
        for k in ("status", "result", "verdict", "outcome", "passed", "ok"):
            if isinstance(d, dict) and k in d:
                bits.append("%s=%r" % (k, d[k]))
        steps = d.get("steps") if isinstance(d, dict) else None
        if isinstance(steps, list):
            sf = [s for s in steps
                  if isinstance(s, dict) and
                  str(s.get("status", s.get("ok", ""))).lower()
                  in ("failed", "fail", "false", "error")]
            bits.append("steps=%d failed=%d" % (len(steps), len(sf)))
        blob = json.dumps(d).lower()
        if not bits:
            bits.append("no status-ish key")
        v = "unknown"
        top = str(d.get("status", "")).lower() if isinstance(d, dict) else ""
        if top in ("failed", "fail", "error", "red"):
            v = "fail"
        elif top in ("passed", "pass", "ok", "green", "success"):
            v = "pass"
        elif '"failed"' in blob and top == "":
            v = "mixed"
        return v, "; ".join(bits)
    return "text", "%d bytes, first line: %s" % (
        len(raw), raw.splitlines()[0][:100] if raw.splitlines() else "")


rows = []
for e in p.entities.values():
    ev = (e.get("evidence", "") or "").strip()
    if not ev or ev.startswith("fact:"):
        continue
    if e.state not in ("verified", "accepted"):
        continue
    ex = (e.get("exit", "") or "").strip()
    facts, paths = planmod.exit_tokens(ex)
    matched = [t for t in paths if ev.startswith(t) or t.startswith(ev)]
    exact = any(ev == t for t in paths)
    absp = ev if os.path.isabs(ev) else os.path.join(p.repo_root, ev)
    verdict, detail = artifact_status(absp)
    rows.append(dict(id=e.id, type=e.type, state=e.state, title=e.title,
                     evidence=ev, exit=ex, exit_paths=paths,
                     matched=matched, exact=exact, absp=absp,
                     verdict=verdict, detail=detail))

rows.sort(key=lambda r: r["id"])
print("verified/accepted with path evidence: %d\n" % len(rows))
for r in rows:
    print("=" * 100)
    print("%-34s %-10s %s" % (r["id"], r["state"], r["type"]))
    print("  title   : %s" % r["title"][:120])
    print("  exit    : %s" % r["exit"][:300])
    print("  evidence: %s" % r["evidence"])
    print("  paths in exit: %r" % (r["exit_paths"],))
    print("  matched by   : %r   EXACT=%s" % (r["matched"], r["exact"]))
    print("  artifact     : %s -- %s" % (r["verdict"], r["detail"][:220]))

with open(os.path.join(REPO,
          "lanes/L-PATH-EVIDENCE-IS-READ/verified.json"), "w") as fh:
    json.dump(rows, fh, indent=1)
