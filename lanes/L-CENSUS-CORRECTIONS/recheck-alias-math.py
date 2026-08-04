"""Independent recomputation of the aliasing census's arithmetic.

Answers, per item and with no summary-only output:
  (A) which of the 22 length-3 in-group windows can hold "250" at all
  (B) how much of the 22/16^3 overstatement is impossible windows vs. multiplicity
  (C) whether "250" can overlap itself
  (D) the exact P for rows 1/2 and the pair
  (E) row 6: 10 * 16^-6 vs 0.596/900000
"""
from fractions import Fraction as F
from itertools import product

HEX = "0123456789abcdef"
GROUPS = (8, 4, 4, 4, 12)


def slots():
    """Per-character distributions of Guid.NewGuid().ToString("D"), by group."""
    u = lambda n: [[(c, F(1, 16)) for c in HEX] for _ in range(n)]
    g3 = [[('4', F(1))]] + u(3)                       # version nibble pinned
    g4 = [[(c, F(1, 4)) for c in "89ab"]] + u(3)      # variant nibble constrained
    return [u(8), u(4), g3, g4, u(12)]


# ---------- (A) window-by-window feasibility, printed per window --------------
def window_report(needle):
    L = len(needle)
    S = slots()
    rows = []
    for gi, g in enumerate(S, start=1):
        for off in range(len(g) - L + 1):
            p = F(1)
            blockers = []
            for k, ch in enumerate(needle):
                alpha = dict(g[off + k])
                if ch not in alpha:
                    p = F(0)
                    blockers.append(f"pos{off+k} cannot be '{ch}' (alphabet {''.join(sorted(alpha))})")
                else:
                    p *= alpha[ch]
            rows.append((gi, off, p, blockers))
    return rows


# ---------- (C) self-overlap ------------------------------------------------
def self_overlaps(needle):
    return [k for k in range(1, len(needle)) if needle[:k] == needle[-k:]]


# ---------- (D) exact P(no occurrence) via Aho-Corasick-style prefix DP ------
def p_none(slotlist, needles):
    prefixes = {""}
    for nd in needles:
        for k in range(1, len(nd)):
            prefixes.add(nd[:k])
    maxlen = max(len(p) for p in prefixes)

    def step(state, ch):
        cand = state + ch
        for nd in needles:
            if cand.endswith(nd):
                return None
        for k in range(min(len(cand), maxlen), -1, -1):
            if cand[len(cand) - k:] in prefixes:
                return cand[len(cand) - k:]
        return ""

    dist = {"": F(1)}
    for slot in slotlist:
        nxt = {}
        for st, pst in dist.items():
            for ch, pch in slot:
                ns = step(st, ch)
                if ns is None:
                    continue
                nxt[ns] = nxt.get(ns, F(0)) + pst * pch
        dist = nxt
    return sum(dist.values())


def p_alias(needles):
    q = F(1)
    for g in slots():
        q *= p_none(g, needles)
    return 1 - q


# ---------- (B) expected count, exactly -------------------------------------
def expected_count(needle):
    return sum(p for _, _, p, _ in window_report(needle))


print("=== (C) can the needle overlap itself? ===")
for nd in ("250", "2000"):
    ov = self_overlaps(nd)
    print(f"  {nd!r}: proper prefixes that are also suffixes -> {ov if ov else 'NONE'}"
          f"  => {'overlapping occurrences possible' if ov else 'two occurrences must be disjoint'}")

print()
print("=== (A) every length-3 window, per window ===")
imposs = 0
for gi, off, p, blockers in window_report("250"):
    tag = "IMPOSSIBLE" if p == 0 else f"P={float(p):.3e}"
    if p == 0:
        imposs += 1
    print(f"  group{gi} offset{off}: {tag}" + ("  <- " + "; ".join(blockers) if blockers else ""))
print(f"  windows total = {len(window_report('250'))}, impossible = {imposs}, live = {len(window_report('250')) - imposs}")

print()
print("=== (B) decomposition of the 22/16^3 overstatement ===")
naive = F(22, 16 ** 3)
ec = expected_count("250")
exact = p_alias(["250"])
print(f"  naive  22/16^3            = {float(naive):.6e}")
print(f"  exact expected count      = {float(ec):.6e}   (= 20/16^3 = {float(F(20,16**3)):.6e})")
print(f"  exact P(at least one)     = {float(exact):.6e}")
print(f"  naive vs exact P          : overstates by {float(naive/exact - 1)*100:.2f}%")
print(f"  impossible-window share   : {float(naive/ec - 1)*100:.2f}%  (22 -> 20 windows)")
print(f"  multiplicity share        : {float(ec/exact - 1)*100:.2f}%  (E[count] -> P, disjoint repeats only)")

print()
print("=== (D) exact probabilities against one v4 GUID ===")
for label, nds in (('"250"', ["250"]), ('"2000"', ["2000"]), ('"250" OR "2000"', ["250", "2000"])):
    p = p_alias(nds)
    print(f"  {label:18s} P = {float(p):.6e}  = 1 in {1/float(p):,.1f}")

print()
print("=== (D2) direction check against the briefed figures ===")
pair = float(p_alias(["250", "2000"]))
for label, denom in (("brief 1 in 130", 130.0), ("brief 1 in 180", 180.0), ("measured 1 in 197.6", 197.6)):
    r = 1.0 / denom
    verdict = "OVERSTATES the failure rate" if r > pair else ("UNDERSTATES" if r < pair else "equal")
    print(f"  {label:22s} rate {r:.6e} vs exact {pair:.6e} -> {verdict}"
          f" (x{r/pair:.3f})")

print()
print("=== (E) row 6: needle is a 6-digit decimal code, haystack holds a GUID ===")
w6 = sum(max(0, g - 6 + 1) for g in GROUPS)
print(f"  six-char in-group windows: " + ", ".join(
    f"group of {g} -> {max(0, g-6+1)}" for g in GROUPS) + f"  => {w6} total")
# do any 6-windows touch the pinned nibbles?
touch = []
S = slots()
for gi, g in enumerate(S, start=1):
    for off in range(len(g) - 6 + 1):
        if any(len(dict(g[off + k])) != 16 for k in range(6)):
            touch.append((gi, off))
print(f"  windows touching a pinned/constrained nibble: {touch if touch else 'NONE'}")
census = 0.596 / 900000
correct = 10 * 16 ** -6
print(f"  census figure   0.596/900000        = {census:.6e} = 1 in {1/census:,.0f}")
print(f"  correct figure  10 * 16^-6          = {correct:.6e} = 1 in {1/correct:,.0f}")
print(f"  census overstates by {(census/correct - 1)*100:.2f}%")
print(f"  identity check: (10/16)^6 * 10^-6 * {w6} = {(10/16)**6 * 1e-6 * w6:.6e}"
      f"  (per-window: all-decimal {(10/16)**6:.4f} x 10^-6)")
# exact, via the same DP, averaged over every code the generator can draw
tot = F(0)
codes = range(100000, 1000000)
# all codes are 6 decimal chars; by symmetry P is identical for every code with
# distinct-vs-repeated structure only affecting overlap. Sample the two extremes.
for code in ("123456", "111111", "100000", "999999"):
    p = p_alias([code])
    print(f"  exact DP for code {code}: P = {float(p):.6e} = 1 in {1/float(p):,.0f}")
