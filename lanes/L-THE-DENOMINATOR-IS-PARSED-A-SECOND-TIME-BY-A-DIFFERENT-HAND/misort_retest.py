#!/usr/bin/env python3
"""Re-run the first census's naive-vs-careful extractor comparison over
(a) its own 547-line population and (b) the tool-attributed 553-line
population, to test whether '116 mis-sorted' and '104 from the absolute-path
form' survive the corrected denominator. Extractors are implemented exactly
as the census's Method section describes them."""
import json
import re

BASE = "/Users/svendaneel/okam/Web-modules/lanes/L-THE-DENOMINATOR-IS-PARSED-A-SECOND-TIME-BY-A-DIFFERENT-HAND"
census = json.load(open(f"{BASE}/second-parse-census.json"))

NAIVE = re.compile(r"[\w.\-]+(?:/[\w.\-]+)+\.\w+")
CAREFUL = re.compile(r"(?:\.\./)*/?[\w.\-]+(?:/[\w.\-]+)+\.\w+(?:\{[^}]*\})?")
# careful: optional leading '/' and '../', brace expansion, trailing-punct strip

def careful_extract(value):
    out = []
    # expand braces first: lanes/X/{a,b,c}
    def debrace(v):
        m = re.search(r"\{([^}]*)\}", v)
        if not m:
            return [v]
        pre, post = v[:m.start()], v[m.end():]
        res = []
        for part in m.group(1).split(","):
            res += debrace(pre + part.strip() + post)
        return res
    for piece in debrace(value):
        for m in re.finditer(r"(?:(?:\.\./)+|/)?[\w.\-]+(?:/[\w.\-]+)+(?:\.\w+|/)", piece):
            p = m.group(0).rstrip(".,;:")
            out.append(p)
    return out

def naive_extract(value):
    return [m.group(0) for m in NAIVE.finditer(value)]

def full_value(line_no):
    # read the raw line from plan.md to get the untruncated value
    raw = PLAN[line_no - 1]
    return raw.split("evidence:", 1)[1].strip()

PLAN = open("/Users/svendaneel/okam/Web-modules/docs/plan/plan.md", encoding="utf-8").read().split("\n")

# populations
first_pop = [a for a in census["accepted"]
             if a["shape"] == "field" and a["section"] == "Lanes — open"
             and not (1967 <= (a["owner_line"] or 0) and a["line"] in
                      {1993,2014,2034,2055,2940,2957,3346,3364,3835,3855,4098,
                       4119,4427,4445,4457,4597,4624,5076,5092,5476,5508})]
resid = {1993,2014,2034,2055,2940,2957,3346,3364,3835,3855,4098,4119,4427,4445,
         4457,4597,4624,5076,5092,5476,5508}
first_pop = [a for a in census["accepted"] if a["shape"] == "field"
             and a["section"] == "Lanes — open" and a["line"] not in resid]
tool_pop = [a for a in census["accepted"] if a["line"] not in resid]

def misort(pop, label):
    dis = []
    for a in pop:
        v = full_value(a["line"])
        n, c = naive_extract(v), careful_extract(v)
        # normalise: compare as path SETS; naive eating '/' yields different path
        if [p.lstrip() for p in n] != [p for p in c]:
            # attribute to first form present, as the census did
            if any(p.startswith("/") for p in c) and not any(p.startswith("/") for p in n):
                form = "absolute-path-slash-eaten"
            elif "{" in v:
                form = "brace-expansion"
            elif re.search(r"\.\w+[.,;:](\s|$)", v):
                form = "trailing-punctuation"
            else:
                form = "other-disagreement"
            dis.append((a["line"], a["owner_id"], form))
    forms = {}
    for _, _, f in dis:
        forms[f] = forms.get(f, 0) + 1
    print(f"{label}: population={len(pop)}  disagreements={len(dis)}  by form={forms}")
    return dis

d1 = misort(first_pop, "first census population (header-then-evidence, Lanes-open)")
d2 = misort(tool_pop, "tool-attributed population (553)")

new = [x for x in d2 if x[0] not in {y[0] for y in d1}]
print("\ndisagreements ADDED by the corrected denominator, individually:")
for line, oid, form in new:
    print(f"  plan.md:{line} {oid}: {form}")
    print(f"    value: {full_value(line)[:140]}")
