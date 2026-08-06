#!/usr/bin/env python3
"""Scan every blob reachable from a git ref for the carrier values.

Prints ONLY carrier index, path and count. No value is ever printed or written.

usage: scan-ref.py <repo> <ref> [<ref> ...]
"""
import os, subprocess, sys

HERE = os.path.dirname(os.path.abspath(__file__))

def carriers():
    out = subprocess.run(["bash", os.path.join(HERE, "emit-carriers.sh")],
                         capture_output=True, text=True, check=True).stdout
    return [(l.split("\t",1)[0], l.split("\t",1)[1].encode())
            for l in out.splitlines() if l.strip()]

def main():
    repo, refs = sys.argv[1], sys.argv[2:]
    pairs = carriers()
    rc = 0
    for ref in refs:
        listing = subprocess.run(["git", "-C", repo, "ls-tree", "-r", "-z", ref],
                                 capture_output=True, check=True).stdout
        total = 0
        print(f"== {ref}")
        for entry in listing.split(b"\0"):
            if not entry:
                continue
            meta, path = entry.split(b"\t", 1)
            sha = meta.split()[2].decode()
            blob = subprocess.run(["git", "-C", repo, "cat-file", "blob", sha],
                                  capture_output=True).stdout
            for i, (nm, v) in enumerate(pairs, 1):
                n = blob.count(v)
                if n:
                    total += n
                    print(f"   C{i} {nm} x{n}  {path.decode('utf-8', 'replace')}")
        print(f"   TOTAL {total}")
        if total:
            rc = 1
    return rc

if __name__ == "__main__":
    sys.exit(main())
