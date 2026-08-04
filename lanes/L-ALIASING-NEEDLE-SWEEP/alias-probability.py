from fractions import Fraction as F
import itertools, string

HEX = "0123456789abcdef"

def p_no_match(slots, needles):
    """slots: list of iterables of (char, probability). Exact DP over a
    'longest matched prefix of any needle' state. Returns P(no needle occurs)."""
    # states = set of proper prefixes of needles (incl. "")
    prefixes = {""}
    for nd in needles:
        for k in range(1, len(nd)):
            prefixes.add(nd[:k])
    prefixes = sorted(prefixes, key=len)
    def step(state, ch):
        cand = state + ch
        for nd in needles:
            if cand.endswith(nd): return None          # matched -> absorbing fail
        # longest suffix of cand that is a prefix state
        for k in range(min(len(cand), max(len(p) for p in prefixes)), -1, -1):
            if cand[len(cand)-k:] in prefixes: return cand[len(cand)-k:]
        return ""
    dist = {"": F(1)}
    for slot in slots:
        nd_ = {}
        for st, pst in dist.items():
            for ch, pch in slot:
                ns = step(st, ch)
                if ns is None: continue
                nd_[ns] = nd_.get(ns, F(0)) + pst*pch
        dist = nd_
    return sum(dist.values())

def uniform_hex(n):
    return [[(c, F(1,16)) for c in HEX] for _ in range(n)]

def guid_v4_groups():
    """.NET Guid.NewGuid().ToString('D') = 8-4-4-4-12 lowercase hex,
    version nibble fixed '4' (start of group3), variant nibble in {8,9,a,b} (start of group4)."""
    g1 = uniform_hex(8)
    g2 = uniform_hex(4)
    g3 = [[('4', F(1))]] + uniform_hex(3)
    g4 = [[(c, F(1,4)) for c in "89ab"]] + uniform_hex(3)
    g5 = uniform_hex(12)
    return [g1,g2,g3,g4,g5]

def guid_alias_prob(needles):
    """Needles contain no '-', so they cannot straddle groups: groups independent."""
    p_none = F(1)
    for g in guid_v4_groups():
        p_none *= p_no_match(g, needles)
    return 1 - p_none

def report(label, needles):
    p = guid_alias_prob(needles)
    fp = float(p)
    print(f"  {label:34s} P(alias per run) = {fp:.8f}   = 1 in {1/fp:,.1f}" if fp>0 else f"  {label:34s} P = 0 (impossible)")
    return fp

print("=== Windows available inside a D-format GUID (dashes break a needle) ===")
for L in (1,2,3,4,5,6,8):
    w = sum(max(0, g-L+1) for g in (8,4,4,4,12))
    print(f"  needle length {L}: {w} in-group window positions")
print()
print("=== EXACT alias probability against ONE v4 GUID in the haystack ===")
p250  = report('\"250\"  alone',  ["250"])
p2000 = report('\"2000\" alone',  ["2000"])
both  = report('\"250\" OR \"2000\" (the real pair)', ["250","2000"])
print()
print(f"  -> EventsOutboxDeliveryTests.cs:411-412 fails on its own fixture 1 run in {1/both:,.1f}")
