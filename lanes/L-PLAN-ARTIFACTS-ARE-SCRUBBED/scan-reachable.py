#!/usr/bin/env python3
"""Scan EVERY blob reachable from the given refs (full history) for carrier values.

This is the check that matters: `git clone <ref>` gives the clone every reachable
object, so a value surviving in any ancestor commit is a value the clone recovers.

Prints ONLY carrier index, blob sha, the commit that first shows it and the path.
No value is ever printed or written.

usage: scan-reachable.py <repo> <ref> [<ref> ...]
"""
import os, subprocess, sys, collections

HERE = os.path.dirname(os.path.abspath(__file__))

def carriers():
    out = subprocess.run(["bash", os.path.join(HERE, "emit-carriers.sh")],
                         capture_output=True, text=True, check=True).stdout
    return [(l.split("\t", 1)[0], l.split("\t", 1)[1].encode())
            for l in out.splitlines() if l.strip()]

def main():
    repo, refs = sys.argv[1], sys.argv[2:]
    pairs = carriers()

    objs = subprocess.run(["git", "-C", repo, "rev-list", "--objects", "--no-object-names",
                           *refs], capture_output=True, text=True, check=True).stdout.split()
    names = subprocess.run(["git", "-C", repo, "rev-list", "--objects", *refs],
                           capture_output=True, text=True, check=True).stdout.splitlines()
    path_of = {}
    for line in names:
        parts = line.split(" ", 1)
        if len(parts) == 2:
            path_of.setdefault(parts[0], parts[1])

    check = subprocess.run(["git", "-C", repo, "cat-file", "--batch-check"],
                           input="\n".join(objs), capture_output=True, text=True).stdout
    blobs = [l.split()[0] for l in check.splitlines() if len(l.split()) == 3 and l.split()[1] == "blob"]
    print(f"reachable objects={len(objs)} blobs={len(blobs)}", file=sys.stderr)

    import tempfile
    fd, listfile = tempfile.mkstemp(prefix="blobs-", suffix=".txt")
    with os.fdopen(fd, "w") as fh:
        fh.write("\n".join(blobs) + "\n")
    infile = open(listfile, "rb")
    proc = subprocess.Popen(["git", "-C", repo, "cat-file", "--batch"],
                            stdin=infile, stdout=subprocess.PIPE)
    hits = collections.defaultdict(set)
    out = proc.stdout
    for sha in blobs:
        header = out.readline()
        size = int(header.split()[2])
        data = out.read(size)
        out.read(1)
        for i, (nm, v) in enumerate(pairs, 1):
            if v in data:
                hits[(i, nm)].add((sha, path_of.get(sha, "?")))
    proc.wait()
    infile.close()
    os.unlink(listfile)

    total = 0
    for (i, nm) in sorted(hits):
        rows = sorted(hits[(i, nm)])
        total += len(rows)
        print(f"C{i} {nm}: {len(rows)} distinct blob(s)")
        for sha, p in rows[:5000]:
            print(f"   {sha[:10]}  {p}")
        if len(rows) > 5000:
            print(f"   ... and {len(rows)-5000} more")
    print(f"TOTAL DISTINCT CARRYING BLOBS: {total}")
    return 1 if total else 0

if __name__ == "__main__":
    sys.exit(main())
