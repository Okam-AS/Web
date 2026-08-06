#!/usr/bin/env python3
"""An INDEPENDENT third reading of the actor-stamp population, written to check the C# derivation
rather than to ship. It shares no code with either the C# text walk or the IL walk: a hand-rolled
character scanner for the code mask, then plain regexes over the masked text.

Usage: derive-groundtruth.py <repo-root>
"""
import os
import re
import sys
import json

STAMPS = {
    "Meals": ["MealsAuditEntry"],
    "Training": ["TrainingAuditEntry"],
    "Events": ["EventsStateTransition", "EventsPaymentReceipt"],
    "Margin": ["MarginPriceImportBatch"],
    "Growth": ["GrowthNewsletter", "GrowthNewsletterVersion", "GrowthNewsletterApproval"],
    "GrowthAudit": ["GrowthAuditEntry"],
}
RESOLVERS = {"Meals": ["CurrentUserId"], "Training": ["CurrentUserId"]}
GUARDS = {"Growth": ["RequireAttributed"], "GrowthAudit": ["RequireAttributed"]}

EXCLUDED = {"bin", "obj", "WebApi.Tests", "Migrations"}


def production_sources(root):
    out = []
    for dirpath, dirnames, filenames in os.walk(root):
        rel = os.path.relpath(dirpath, root)
        parts = [] if rel == "." else rel.split(os.sep)
        if any(p in EXCLUDED for p in parts):
            dirnames[:] = []
            continue
        for f in filenames:
            if f.endswith(".cs"):
                out.append(os.path.join(dirpath, f))
    return sorted(out)


def code_mask(s):
    """True at every index that is executable code. Mirrors the C# masking contract: the OPENING
    quote of a literal counts as code, the body does not; comments are wholly masked out."""
    mask = bytearray(len(s))
    i = 0
    n = len(s)
    while i < n:
        c = s[i]
        if c == "/" and i + 1 < n and s[i + 1] == "/":
            while i < n and s[i] != "\n":
                i += 1
            continue
        if c == "/" and i + 1 < n and s[i + 1] == "*":
            end = s.find("*/", i + 2)
            i = n if end < 0 else end + 2
            continue
        if c == '"':
            mask[i] = 1
            verbatim = False
            b = i - 1
            while b >= 0 and s[b] in "@$":
                verbatim |= s[b] == "@"
                b -= 1
            j = i + 1
            while j < n:
                if s[j] == "\\" and not verbatim:
                    j += 2
                    continue
                if s[j] == '"':
                    if verbatim and j + 1 < n and s[j + 1] == '"':
                        j += 2
                        continue
                    j += 1
                    break
                j += 1
            i = j
            continue
        if c == "'":
            mask[i] = 1
            j = i + 1
            while j < n:
                if s[j] == "\\":
                    j += 2
                    continue
                if s[j] == "'":
                    j += 1
                    break
                j += 1
            i = j
            continue
        mask[i] = 1
        i += 1
    return mask


def line_of(s, idx):
    return s.count("\n", 0, idx) + 1


def main():
    root = os.path.abspath(sys.argv[1])
    files = production_sources(root)
    texts = {}
    for f in files:
        try:
            texts[f] = open(f, encoding="utf-8-sig").read()
        except Exception:
            texts[f] = open(f, encoding="utf-8", errors="replace").read()
    masks = {f: code_mask(t) for f, t in texts.items()}

    report = {}
    for module, stamp_types in STAMPS.items():
        per_file = {}
        for stamp in stamp_types:
            pat = re.compile(r"new\s+" + re.escape(stamp) + r"\b")
            for f, t in texts.items():
                if stamp not in t:
                    continue
                rel = os.path.relpath(f, root).replace(os.sep, "/")
                entry = per_file.setdefault(rel, {"sites": 0, "lines": [], "resolvers": 0, "guards": 0})
                for m in pat.finditer(t):
                    if masks[f][m.start()]:
                        entry["sites"] += 1
                        entry["lines"].append(line_of(t, m.start()))
        # resolvers / guards are counted over the module's whole derived scope, file by file
        for f, t in texts.items():
            rel = os.path.relpath(f, root).replace(os.sep, "/")
            if rel not in per_file:
                continue
            for r in RESOLVERS.get(module, []):
                per_file[rel]["resolvers"] += len(
                    re.findall(r"\bstring\s+" + re.escape(r) + r"\s*\([^)]*\)", t))
            for g in GUARDS.get(module, []):
                per_file[rel]["guards"] += len(
                    re.findall(r"\bvoid\s+" + re.escape(g) + r"\s*\([^)]*\)", t))
        report[module] = dict(sorted(per_file.items()))

    print(json.dumps(report, indent=2))
    print("\n==== TOTALS ====")
    for module, per_file in report.items():
        print("%-12s files=%d sites=%d resolvers=%d guards=%d" % (
            module, len(per_file),
            sum(v["sites"] for v in per_file.values()),
            sum(v["resolvers"] for v in per_file.values()),
            sum(v["guards"] for v in per_file.values())))


if __name__ == "__main__":
    main()
