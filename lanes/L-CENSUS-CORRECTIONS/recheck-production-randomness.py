"""Find production-side random VALUE producers whose alphabet is wider than hex.

The aliasing census's immunity rule enumerated randomness in WebApi.Tests only.
Haystacks, however, are minted by production code invoked in-test. This lists
every production site that draws bytes/ints from a CSPRNG and every site that
base64-encodes, per item.
"""
import os, re

# Reproduce, read-only, without touching any worktree:
#   mkdir -p /tmp/prod-8e2b57de && cd <OkamAPI>
#   git archive 8e2b57de Services Controllers Helpers Models Middleware Program.cs Entities \
#       Enums Repositories Validation Authorization Mcp Analytics ModelBuilders \
#     | tar -x -C /tmp/prod-8e2b57de
#   PROD_ROOT=/tmp/prod-8e2b57de python3 recheck-production-randomness.py
PROD = os.environ.get(
    "PROD_ROOT",
    "/private/tmp/claude-501/-Users-svendaneel-okam/766072d3-8965-4c45-be67-76b407d86aaf/scratchpad/cc-prod")

PATTERNS = [
    ("RandomNumberGenerator", re.compile(r'RandomNumberGenerator\s*\.\s*(GetBytes|GetInt32|Fill|Create|GetHexString|GetString)')),
    ("new Random(",           re.compile(r'\bnew\s+Random\s*\(')),
    ("Random.Shared",         re.compile(r'\bRandom\s*\.\s*Shared\b')),
    ("ToBase64String",        re.compile(r'Convert\s*\.\s*ToBase64String')),
    ("Base64Url",             re.compile(r'Base64Url|WebEncoders\.Base64Url|Base64UrlEncode')),
    ("Guid.NewGuid",          re.compile(r'Guid\s*\.\s*NewGuid\s*\(\s*\)')),
    ("GenerateNonce/IV",      re.compile(r'\b(GenerateIV|GenerateNonce|GenerateKey)\s*\(')),
]

files = []
for dp, _, fs in os.walk(PROD):
    for f in sorted(fs):
        if f.endswith(".cs"):
            files.append(os.path.join(dp, f))
files.sort()

hits = {name: [] for name, _ in PATTERNS}
for path in files:
    src = open(path, encoding="utf-8", errors="replace").read()
    lines = src.splitlines()
    for name, rx in PATTERNS:
        for m in rx.finditer(src):
            ln = src.count("\n", 0, m.start()) + 1
            hits[name].append((os.path.relpath(path, PROD), ln, lines[ln - 1].strip()[:140]))

for name, _ in PATTERNS:
    rows = hits[name]
    print(f"\n===== {name} =====")
    if not rows:
        print("  (no production site)")
    for rel, ln, text in rows:
        if name == "Guid.NewGuid":
            continue
        print(f"  {rel}:{ln}  {text}")
    if name == "Guid.NewGuid":
        byfile = {}
        for rel, ln, _ in rows:
            byfile.setdefault(rel, []).append(ln)
        for rel in sorted(byfile):
            print(f"  {rel}: lines {byfile[rel]}")
