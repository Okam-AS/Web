#!/usr/bin/env python3
"""Sweep a tree for the credential values emitted by emit-carriers.sh.

Prints ONLY: carrier index, path, line number, and a context line in which the
value itself has been replaced by <<C{n}>>. No credential value ever reaches
stdout, a file, or a filename.

usage: sweep.py <root> [<root> ...] [--context]
"""
import os, subprocess, sys

HERE = os.path.dirname(os.path.abspath(__file__))

def carriers():
    out = subprocess.run(["bash", os.path.join(HERE, "emit-carriers.sh")],
                         capture_output=True, text=True, check=True).stdout
    return [l.split("\t", 1)[0] for l in out.splitlines() if l.strip()], \
           [l.split("\t", 1)[1] for l in out.splitlines() if l.strip()]

SKIP_DIRS = {".git", "node_modules", ".nuxt", "coverage", "dist", ".next"}

def walk(root):
    for dirpath, dirnames, filenames in os.walk(root):
        dirnames[:] = [d for d in dirnames if d not in SKIP_DIRS]
        for fn in filenames:
            yield os.path.join(dirpath, fn)

def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    show_ctx = "--context" in sys.argv
    names, vals = carriers()
    hits = {i: [] for i in range(1, len(vals) + 1)}
    for root in args:
        for p in walk(root):
            try:
                if os.path.getsize(p) > 20_000_000:
                    continue
                with open(p, "r", errors="replace") as fh:
                    text = fh.read()
            except (OSError, UnicodeError):
                continue
            def redact(s):
                for j, w in enumerate(vals, 1):
                    s = s.replace(w, f"<<C{j}>>")
                return s
            for i, v in enumerate(vals, 1):
                if v in text:
                    for ln, line in enumerate(text.splitlines(), 1):
                        if v in line:
                            col = line.index(v)
                            win = line[max(0, col - 90):col + len(v) + 90]
                            hits[i].append((p, ln, redact(win)))
    total = 0
    for i in sorted(hits):
        rows = hits[i]
        total += len(rows)
        files = sorted({r[0] for r in rows})
        print(f"CARRIER {i} {names[i-1]} (len={len(vals[i-1])}): {len(rows)} line(s) in {len(files)} file(s)")
        for f in files:
            c = sum(1 for r in rows if r[0] == f)
            print(f"   {c:3d}  {f}")
        if show_ctx:
            for p, ln, line in rows:
                print(f"      {p}:{ln}: {line.strip()}")
    print(f"TOTAL LINES: {total}")
    return 0

if __name__ == "__main__":
    sys.exit(main())
