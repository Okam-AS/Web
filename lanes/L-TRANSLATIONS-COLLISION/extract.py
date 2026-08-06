#!/usr/bin/env python3
"""Key-level collision analysis for translations/{no,en,de}.ts across every ref.

Read-only. Runs `git cat-file`/`git merge-base`/`git for-each-ref` only.
Fails loud on any line it cannot parse rather than silently dropping it.
"""
import json
import re
import subprocess
import sys
from collections import OrderedDict

REPO = "/Users/svendaneel/okam/Web-modules"
BASELINE = "e34977acebd59b223584158c33451b6f1ffd82c1"
PATHS = ["translations/no.ts", "translations/en.ts", "translations/de.ts"]

LINE_RE = re.compile(r"^\s*([A-Za-z_$][\w$]*)\s*:\s*(.+?),?\s*$")
OPEN_RE = re.compile(r"^\s*export default\s*\{\s*$")
CLOSE_RE = re.compile(r"^\s*\}\s*(as const)?\s*;?\s*$")


def git(*args, binary=False):
    r = subprocess.run(["git", "-C", REPO, "--no-optional-locks", *args],
                       capture_output=True)
    if r.returncode != 0:
        return None
    return r.stdout if binary else r.stdout.decode("utf-8", "replace")


def parse(text, origin):
    """Return (OrderedDict key->raw value literal, list of unparsed lines)."""
    out = OrderedDict()
    bad = []
    dupes = []
    for i, line in enumerate(text.split("\n"), 1):
        s = line.strip()
        if not s or s.startswith("//") or s.startswith("/*") or s.startswith("*"):
            continue
        if OPEN_RE.match(line) or CLOSE_RE.match(line):
            continue
        m = LINE_RE.match(line)
        if not m:
            bad.append((i, line[:160]))
            continue
        k, v = m.group(1), m.group(2).rstrip(",").strip()
        if not (v[:1] in "'\"`"):
            bad.append((i, line[:160]))
            continue
        if k in out:
            dupes.append((i, k))
        out[k] = v
    if bad:
        print(f"PARSE-FAIL {origin}: {len(bad)} unparsed lines", file=sys.stderr)
        for b in bad[:10]:
            print("   ", b, file=sys.stderr)
    return out, bad, dupes


def norm(v):
    """Normalise a JS string literal to its content, so quoting style is not a diff."""
    q = v[0]
    if v[-1] != q:
        return v  # give up; compare raw
    body = v[1:-1]
    # unescape the delimiter and backslash-escapes uniformly
    body = re.sub(r"\\(['\"`\\])", r"\1", body)
    return body


def blob_at(ref, path):
    return git("cat-file", "-p", f"{ref}:{path}")


def main():
    refs = []
    for line in git("for-each-ref", "--format=%(refname)", "refs/heads",
                    "refs/lanes").strip().split("\n"):
        refs.append(line)

    # sanity: baseline must parse
    base_files = {}
    for p in PATHS:
        t = blob_at(BASELINE, p)
        assert t is not None, f"baseline missing {p}"
        d, bad, dup = parse(t, f"BASELINE:{p}")
        assert not bad, f"baseline {p} unparsed"
        base_files[p] = d
        print(f"baseline {p}: {len(d)} keys, {len(dup)} dup-key lines", file=sys.stderr)

    parse_failures = []
    # per (path) -> per key -> {kind: {branch: value}}
    result = {p: {"added": {}, "removed": {}, "modified": {}} for p in PATHS}
    branch_summary = {}
    merge_base_cache = {}

    claimants = [(r, r) for r in refs] + [("WORKING-TREE", None)]

    for label, ref in claimants:
        if ref is None:
            mb = BASELINE
        else:
            mb = merge_base_cache.get(ref)
            if mb is None:
                mb = git("merge-base", ref, BASELINE)
                mb = mb.strip() if mb else None
                merge_base_cache[ref] = mb
        summary = {"merge_base": mb, "paths": {}}
        for p in PATHS:
            if ref is None:
                try:
                    cur = open(f"{REPO}/{p}").read()
                except OSError:
                    cur = None
            else:
                cur = blob_at(ref, p)
            if cur is None:
                summary["paths"][p] = {"present": False}
                continue
            base_txt = blob_at(mb, p) if mb else None
            if base_txt is None:
                base = base_files[p]
                base_src = "BASELINE(fallback)"
            else:
                base, bbad, _ = parse(base_txt, f"{mb}:{p}")
                if bbad:
                    parse_failures.append((label, p, "base", len(bbad)))
                base_src = mb
            curd, cbad, cdup = parse(cur, f"{label}:{p}")
            if cbad:
                parse_failures.append((label, p, "tip", len(cbad)))
            added = [k for k in curd if k not in base]
            removed = [k for k in base if k not in curd]
            modified = [k for k in curd if k in base and norm(curd[k]) != norm(base[k])]
            summary["paths"][p] = {
                "present": True, "base_src": base_src, "keys": len(curd),
                "added": added, "removed": removed, "modified": modified,
                "dup_lines": len(cdup),
            }
            for k in added:
                result[p]["added"].setdefault(k, {})[label] = curd[k]
            for k in removed:
                result[p]["removed"].setdefault(k, {})[label] = base[k]
            for k in modified:
                result[p]["modified"].setdefault(k, {})[label] = curd[k]
        branch_summary[label] = summary

    out = {
        "baseline": BASELINE,
        "n_refs": len(refs),
        "parse_failures": parse_failures,
        "branches": branch_summary,
        "keys": result,
    }
    with open(f"{REPO}/lanes/L-TRANSLATIONS-COLLISION/keys.json", "w") as f:
        json.dump(out, f, indent=1, sort_keys=False)
    print("parse_failures:", parse_failures, file=sys.stderr)
    for p in PATHS:
        print(p, "added-keys:", len(result[p]["added"]),
              "removed:", len(result[p]["removed"]),
              "modified:", len(result[p]["modified"]), file=sys.stderr)


if __name__ == "__main__":
    main()
