#!/usr/bin/env python3
"""Account for a tier delta test by test: which test names exist in B and not in A, and vice versa.

usage: trxdelta.py <baseline.trx> <lane.trx>
"""
import re
import sys


def names(path):
    text = open(path, encoding="utf-8", errors="replace").read()
    out = {}
    for m in re.finditer(r'<UnitTestResult\b[^>]*?\btestName="([^"]*)"[^>]*?\boutcome="([^"]*)"', text):
        out[m.group(1)] = m.group(2)
    if not out:
        for m in re.finditer(r'<UnitTestResult\b([^>]*)>', text):
            attrs = dict(re.findall(r'(\w+)="([^"]*)"', m.group(1)))
            if "testName" in attrs:
                out[attrs["testName"]] = attrs.get("outcome", "?")
    return out


a = names(sys.argv[1])
b = names(sys.argv[2])
print("baseline %s: %d results" % (sys.argv[1], len(a)))
print("lane     %s: %d results" % (sys.argv[2], len(b)))
for label, keys in (("ONLY IN LANE (+)", sorted(set(b) - set(a))), ("ONLY IN BASELINE (-)", sorted(set(a) - set(b)))):
    print("\n== %s: %d" % (label, len(keys)))
    for k in keys:
        print("  %-8s %s" % (b.get(k, a.get(k)), k))
changed = sorted(k for k in set(a) & set(b) if a[k] != b[k])
print("\n== OUTCOME CHANGED: %d" % len(changed))
for k in changed:
    print("  %s -> %s  %s" % (a[k], b[k], k))
for label, d in (("baseline", a), ("lane", b)):
    counts = {}
    for v in d.values():
        counts[v] = counts.get(v, 0) + 1
    print("%s outcomes: %s" % (label, counts))
