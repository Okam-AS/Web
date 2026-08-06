#!/usr/bin/env python3
"""Replace every credential value under the given roots with a named placeholder.

Placeholder form:  <config-key-name>__REDACTED
e.g. AppSettings__DemoVerificationCode__REDACTED

Alphanumeric+underscore only, so it stays valid inside JSON strings, HTML text,
shell/JS string literals and Markdown, and it names the configuration key a later
reader must look the value up in.

Prints ONLY path + per-carrier replacement counts. No value is printed or written.

usage: scrub.py [--apply] <root> [<root> ...]
"""
import os, subprocess, sys

HERE = os.path.dirname(os.path.abspath(__file__))
SKIP_DIRS = {".git", "node_modules", ".nuxt", "coverage", "dist", ".next"}

def carriers():
    out = subprocess.run(["bash", os.path.join(HERE, "emit-carriers.sh")],
                         capture_output=True, text=True, check=True).stdout
    rows = [l.split("\t", 1) for l in out.splitlines() if l.strip()]
    return [(n, v, f"{n}__REDACTED") for n, v in rows]

def main():
    apply = "--apply" in sys.argv
    roots = [a for a in sys.argv[1:] if not a.startswith("--")]
    pairs = carriers()
    files = 0
    per = {n: 0 for n, _, _ in pairs}
    for root in roots:
        for dirpath, dirnames, filenames in os.walk(root):
            dirnames[:] = [d for d in dirnames if d not in SKIP_DIRS]
            for fn in filenames:
                p = os.path.join(dirpath, fn)
                try:
                    if os.path.getsize(p) > 20_000_000 or os.path.islink(p):
                        continue
                    raw = open(p, "rb").read()
                except OSError:
                    continue
                if b"\0" in raw[:8192]:
                    continue
                try:
                    text = raw.decode("utf-8")
                except UnicodeDecodeError:
                    continue
                new, counts = text, []
                for name, val, ph in pairs:
                    c = new.count(val)
                    if c:
                        new = new.replace(val, ph)
                        per[name] += c
                        counts.append(f"{name}x{c}")
                if new != text:
                    files += 1
                    print(f"{'SCRUB' if apply else 'WOULD'} {p}  {' '.join(counts)}")
                    if apply:
                        mode = os.stat(p).st_mode
                        with open(p, "w", encoding="utf-8", newline="") as fh:
                            fh.write(new)
                        os.chmod(p, mode)
    print(f"FILES {files}")
    for n in per:
        print(f"  {n}: {per[n]}")
    return 0

if __name__ == "__main__":
    sys.exit(main())
