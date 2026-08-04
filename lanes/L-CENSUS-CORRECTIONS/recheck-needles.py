"""Re-extraction of the aliasing census's needle population, with the two
questions the census answered categorically:

  Q1  which literal needles are alphanumeric-but-not-hex, and how short are they
      (i.e. which needles a base64-bearing haystack could actually spell)
  Q2  which predicate-form (lambda) assertions embed a literal substring search
  Q3  which OTHER absence forms the census declared needle-free actually carry a
      literal needle (Assert.Empty / Assert.Null over a filtered sequence)

Per-item output only; no summary-only counts.
"""
import os, re, json, sys

# Reproduce the tree this reads, read-only, without touching any worktree:
#   mkdir -p /tmp/snap-8e2b57de && cd <OkamAPI>
#   git archive 8e2b57de WebApi.Tests | tar -x -C /tmp/snap-8e2b57de
#   TESTS_ROOT=/tmp/snap-8e2b57de/WebApi.Tests python3 recheck-needles.py [q1|q1b|q2|q3|q4|all]
ROOT = os.environ.get(
    "TESTS_ROOT",
    "/private/tmp/claude-501/-Users-svendaneel-okam/766072d3-8965-4c45-be67-76b407d86aaf/scratchpad/snap-8e2b57de/WebApi.Tests")

# ---- comment-aware masking (same technique as the census extractor) ---------
def mask_comments(src):
    out = list(src); i = 0; n = len(src)
    while i < n:
        c = src[i]
        if c == '"':
            if i > 0 and src[i-1] == '@':
                i += 1
                while i < n:
                    if src[i] == '"':
                        if i+1 < n and src[i+1] == '"': i += 2; continue
                        i += 1; break
                    i += 1
                continue
            i += 1
            while i < n:
                if src[i] == '\\': i += 2; continue
                if src[i] == '"': i += 1; break
                i += 1
            continue
        if c == "'":
            i += 1
            while i < n:
                if src[i] == '\\': i += 2; continue
                if src[i] == "'": i += 1; break
                i += 1
            continue
        if c == '/' and i+1 < n and src[i+1] == '/':
            while i < n and src[i] != '\n':
                out[i] = ' '; i += 1
            continue
        if c == '/' and i+1 < n and src[i+1] == '*':
            while i < n and not (src[i] == '*' and i+1 < n and src[i+1] == '/'):
                if src[i] != '\n': out[i] = ' '
                i += 1
            if i < n: out[i] = ' '; out[i+1] = ' '; i += 2
            continue
        i += 1
    return ''.join(out)

def balanced(src, open_idx):
    depth = 0; i = open_idx; n = len(src)
    while i < n:
        c = src[i]
        if c == '"':
            if i > 0 and src[i-1] == '@':
                i += 1
                while i < n:
                    if src[i] == '"':
                        if i+1 < n and src[i+1] == '"': i += 2; continue
                        i += 1; break
                    i += 1
                continue
            i += 1
            while i < n:
                if src[i] == '\\': i += 2; continue
                if src[i] == '"': i += 1; break
                i += 1
            continue
        if c == "'":
            i += 1
            while i < n:
                if src[i] == '\\': i += 2; continue
                if src[i] == "'": i += 1; break
                i += 1
            continue
        if c == '(': depth += 1
        elif c == ')':
            depth -= 1
            if depth == 0: return src[open_idx:i+1], i+1
        i += 1
    return src[open_idx:], n

def split_args(span):
    """span includes the outer parens. Split top-level commas, string-aware."""
    body = span[1:-1]
    args = []; depth = 0; cur = []; i = 0; n = len(body)
    while i < n:
        c = body[i]
        if c == '"':
            j = i
            if i > 0 and body[i-1] == '@':
                i += 1
                while i < n:
                    if body[i] == '"':
                        if i+1 < n and body[i+1] == '"': i += 2; continue
                        i += 1; break
                    i += 1
            else:
                i += 1
                while i < n:
                    if body[i] == '\\': i += 2; continue
                    if body[i] == '"': i += 1; break
                    i += 1
            cur.append(body[j:i]); continue
        if c in '([{': depth += 1
        elif c in ')]}': depth -= 1
        elif c == ',' and depth == 0:
            args.append(''.join(cur).strip()); cur = []; i += 1; continue
        cur.append(c); i += 1
    if ''.join(cur).strip(): args.append(''.join(cur).strip())
    return args

FORMS = {
    "DoesNotContain":  re.compile(r'\bAssert\.DoesNotContain\s*\('),
    "DoesNotMatch":    re.compile(r'\bAssert\.DoesNotMatch\s*\('),
    "AssertFalse":     re.compile(r'\bAssert\.False\s*\('),
    "BareNotContains": re.compile(r'!\s*[A-Za-z_][\w\.\[\]\(\)]*\.Contains\s*\('),
    "AssertEmpty":     re.compile(r'\bAssert\.Empty\s*\('),
    "AssertNull":      re.compile(r'\bAssert\.Null\s*\('),
}

files = []
for dp, _, fs in os.walk(ROOT):
    for f in sorted(fs):
        if f.endswith('.cs'):
            files.append(os.path.join(dp, f))
files.sort()

rows = []
for path in files:
    raw = open(path, encoding='utf-8', errors='replace').read()
    masked = mask_comments(raw)
    starts = [0] + [i+1 for i, ch in enumerate(raw) if ch == '\n']
    def lineno(off):
        lo, hi = 0, len(starts)-1
        while lo < hi:
            mid = (lo+hi+1)//2
            if starts[mid] <= off: lo = mid
            else: hi = mid-1
        return lo+1
    for name, rx in FORMS.items():
        for m in rx.finditer(masked):
            op = masked.index('(', m.end()-1) if masked[m.end()-1] != '(' else m.end()-1
            span, _ = balanced(raw, op)
            rows.append({
                "file": os.path.relpath(path, ROOT),
                "line": lineno(m.start()),
                "form": name,
                "call": re.sub(r'\s+', ' ', span),
            })

json.dump(rows, open(os.environ.get("ROWS_OUT", "cc-rows.json"), "w"), indent=0)

STRLIT = re.compile(r'(?<!\$)(?<!@)"((?:[^"\\]|\\.)*)"')
LAMBDA = re.compile(r'=>')
SUBSTR_IN_LAMBDA = re.compile(r'\.(Contains|StartsWith|EndsWith|IndexOf)\s*\(\s*"((?:[^"\\]|\\.)*)"')

def is_literal_needle_call(r):
    """DoesNotContain(needleLiteral, haystack) - first arg a plain string literal."""
    args = split_args(r["call"])
    if not args: return None
    a0 = args[0].strip()
    m = STRLIT.fullmatch(a0)
    return m.group(1) if m else None

HEXSET = set("0123456789abcdefABCDEF")
def classify(needle):
    if all(c in "0123456789" for c in needle): return "digits-only"
    if all(c in HEXSET or c == '-' for c in needle): return "hex-safe"
    if needle.isalnum(): return "alnum-non-hex"
    return "punctuation"

which = sys.argv[1] if len(sys.argv) > 1 else "all"

if which in ("all", "q1"):
    print("########## Q1  literal needles by alphabet class ##########")
    buckets = {}
    for r in rows:
        if r["form"] not in ("DoesNotContain", "DoesNotMatch", "AssertFalse", "BareNotContains"):
            continue
        nd = is_literal_needle_call(r) if r["form"] in ("DoesNotContain", "DoesNotMatch") else None
        if nd is None:
            # Assert.False / bare !Contains: literal inside a .Contains("..")/.EndsWith("..")
            mm = SUBSTR_IN_LAMBDA.search(r["call"])
            if mm: nd = mm.group(2)
        if nd is None: continue
        buckets.setdefault(classify(nd), []).append((r, nd))
    for cls in ("digits-only", "hex-safe", "alnum-non-hex", "punctuation"):
        items = buckets.get(cls, [])
        print(f"\n===== {cls} =====")
        for r, nd in items:
            print(f"  len={len(nd):3d}  {r['file']}:{r['line']}  [{r['form']}]  needle={nd!r}")

if which in ("all", "q1b"):
    print("\n########## Q1b  SHORT alphanumeric non-hex needles (len <= 12) ##########")
    for r in rows:
        if r["form"] not in ("DoesNotContain", "DoesNotMatch"): continue
        nd = is_literal_needle_call(r)
        if nd is None: continue
        if classify(nd) == "alnum-non-hex" and len(nd) <= 12:
            print(f"  len={len(nd):3d}  {r['file']}:{r['line']}  needle={nd!r}")
            print(f"        call: {r['call'][:220]}")

if which in ("all", "q2"):
    print("\n########## Q2  predicate-form (lambda) assertions ##########")
    withlit = []
    plain = 0
    for r in rows:
        if r["form"] != "DoesNotContain": continue
        args = split_args(r["call"])
        if len(args) < 2: continue
        if not any(LAMBDA.search(a) for a in args[1:]): continue
        lam = " ".join(a for a in args[1:] if LAMBDA.search(a))
        hits = SUBSTR_IN_LAMBDA.findall(lam)
        if hits: withlit.append((r, hits))
        else: plain += 1
    print(f"-- predicate-form sites WITH an embedded literal substring search --")
    for r, hits in withlit:
        ops = ", ".join(f"{op}({lit!r})" for op, lit in hits)
        print(f"  {r['file']}:{r['line']}  {ops}")
        print(f"        call: {r['call'][:240]}")
    print(f"-- predicate-form sites with no embedded literal: {plain} "
          f"(listed below) --")
    for r in rows:
        if r["form"] != "DoesNotContain": continue
        args = split_args(r["call"])
        if len(args) < 2: continue
        if not any(LAMBDA.search(a) for a in args[1:]): continue
        lam = " ".join(a for a in args[1:] if LAMBDA.search(a))
        if not SUBSTR_IN_LAMBDA.findall(lam):
            print(f"  {r['file']}:{r['line']}")

if which in ("all", "q3"):
    print("\n########## Q3  Assert.Empty / Assert.Null spans carrying a literal substring search ##########")
    for r in rows:
        if r["form"] not in ("AssertEmpty", "AssertNull"): continue
        hits = SUBSTR_IN_LAMBDA.findall(r["call"])
        if hits:
            ops = ", ".join(f"{op}({lit!r})" for op, lit in hits)
            print(f"  [{r['form']}] {r['file']}:{r['line']}  {ops}")
            print(f"        call: {r['call'][:240]}")
    print("-- Assert.False / bare !x.Contains spans carrying a literal substring search --")
    for r in rows:
        if r["form"] not in ("AssertFalse", "BareNotContains"): continue
        hits = SUBSTR_IN_LAMBDA.findall(r["call"])
        if hits:
            ops = ", ".join(f"{op}({lit!r})" for op, lit in hits)
            print(f"  [{r['form']}] {r['file']}:{r['line']}  {ops}")

if which in ("all", "q4"):
    print("\n########## Q4  is 'Guid.NewGuid() = 900 in 277 files' reproducible? ##########")
    counters = {
        "occurrences, exact text 'Guid.NewGuid()'":            (re.compile(r'Guid\.NewGuid\(\)'), False),
        "occurrences, whitespace-tolerant":                    (re.compile(r'Guid\s*\.\s*NewGuid\s*\(\s*\)'), False),
        "occurrences, whitespace-tolerant, comments masked":   (re.compile(r'Guid\s*\.\s*NewGuid\s*\(\s*\)'), True),
        "occurrences, bare 'NewGuid()' whatever the receiver": (re.compile(r'\bNewGuid\s*\(\s*\)'), False),
    }
    for label, (rx, mask) in counters.items():
        occ = 0; nfiles = 0; nlines = 0
        for path in files:
            raw = open(path, encoding='utf-8', errors='replace').read()
            s = mask_comments(raw) if mask else raw
            hits = list(rx.finditer(s))
            if hits:
                nfiles += 1
                occ += len(hits)
                nlines += len({s.count("\n", 0, m.start()) for m in hits})
        print(f"  {label}: occurrences={occ}  files={nfiles}  matching-lines={nlines}")
    print("  per-form raw span counts (this extractor):")
    from collections import Counter
    c = Counter(r["form"] for r in rows)
    for k in sorted(c):
        print(f"    {k}: {c[k]}")
