import os, re, json, sys

ROOT = "/private/tmp/claude-501/-Users-svendaneel-okam/766072d3-8965-4c45-be67-76b407d86aaf/scratchpad/snap-8e2b57de/WebApi.Tests"

# ---- comment/string-aware scanner -------------------------------------------
def mask_comments(src):
    """Return src with comment chars replaced by spaces (keeps offsets)."""
    out = list(src); i = 0; n = len(src)
    while i < n:
        c = src[i]
        if c == '"':
            # verbatim?
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
    """open_idx points at '('. Return (text, end_idx) of balanced span, string-aware."""
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

FORMS = [
    ("DoesNotContain",   re.compile(r'\bAssert\.DoesNotContain\s*\(')),
    ("DoesNotMatch",     re.compile(r'\bAssert\.DoesNotMatch\s*\(')),
    ("NotContain",       re.compile(r'\.Should\(\)\s*\.\s*NotContain\s*\(')),
    ("NotContainAll",    re.compile(r'\.Should\(\)\s*\.\s*NotContainAll\s*\(')),
    ("NotContainEquiv",  re.compile(r'\.Should\(\)\s*\.\s*NotContainEquivalentOf\s*\(')),
    ("NotMatch",         re.compile(r'\.Should\(\)\s*\.\s*NotMatch\w*\s*\(')),
    ("ShouldNotContain", re.compile(r'\.ShouldNotContain\s*\(')),
    ("AssertFalse",      re.compile(r'\bAssert\.False\s*\(')),
    ("BeFalse",          re.compile(r'\.Should\(\)\s*\.\s*BeFalse\s*\(')),
    ("BareNotContains",  re.compile(r'!\s*[A-Za-z_][\w\.\[\]\(\)]*\.Contains\s*\(')),
]

rows = []
files = []
for dirpath, _, fnames in os.walk(ROOT):
    for f in sorted(fnames):
        if f.endswith('.cs'):
            files.append(os.path.join(dirpath, f))
files.sort()

for path in files:
    raw = open(path, encoding='utf-8', errors='replace').read()
    masked = mask_comments(raw)
    linestarts = [0]
    for i,ch in enumerate(raw):
        if ch == '\n': linestarts.append(i+1)
    def lineno(off):
        lo, hi = 0, len(linestarts)-1
        while lo < hi:
            mid = (lo+hi+1)//2
            if linestarts[mid] <= off: lo = mid
            else: hi = mid-1
        return lo+1
    for name, rx in FORMS:
        for m in rx.finditer(masked):
            op = masked.index('(', m.end()-1) if masked[m.end()-1] != '(' else m.end()-1
            span, _ = balanced(masked, op)
            rawspan, _ = balanced(raw, op)
            rows.append({
                "file": os.path.relpath(path, ROOT),
                "line": lineno(m.start()),
                "form": name,
                "call": re.sub(r'\s+', ' ', rawspan)[:600],
            })

print("FILES SCANNED:", len(files))
from collections import Counter
c = Counter(r["form"] for r in rows)
for k in sorted(c): print(f"  {k:18s} {c[k]}")
print("TOTAL RAW HITS:", len(rows))
json.dump(rows, open("/private/tmp/claude-501/-Users-svendaneel-okam/766072d3-8965-4c45-be67-76b407d86aaf/scratchpad/rows.json","w"), indent=1)
