#!/usr/bin/env python3
"""Extract enum declarations from a git ref, by object (never the worktree)."""
import json
import re
import subprocess
import sys


def sh(args, cwd):
    return subprocess.run(args, cwd=cwd, capture_output=True, text=True)


def files(repo, ref, exts):
    r = sh(["git", "ls-tree", "-r", "--name-only", ref], repo)
    if r.returncode:
        sys.exit("ls-tree failed: " + r.stderr)
    return [p for p in r.stdout.splitlines() if any(p.endswith(e) for e in exts)]


def blob(repo, ref, path):
    r = sh(["git", "show", f"{ref}:{path}"], repo)
    return r.stdout if r.returncode == 0 else None


def strip_comments(src):
    # remove block + line comments (crude but adequate: enum bodies have no regex/strings)
    src = re.sub(r"/\*.*?\*/", "", src, flags=re.S)
    src = re.sub(r"//[^\n]*", "", src)
    return src


CS_ENUM = re.compile(
    r"\benum\s+(?P<name>[A-Za-z_][A-Za-z0-9_]*)\s*(?::\s*[A-Za-z0-9_.]+\s*)?\{",
)
TS_ENUM = re.compile(
    r"\benum\s+(?P<name>[A-Za-z_][A-Za-z0-9_]*)\s*\{",
)


def body(src, open_idx):
    """Return text between the brace at open_idx and its match."""
    depth = 0
    for i in range(open_idx, len(src)):
        if src[i] == "{":
            depth += 1
        elif src[i] == "}":
            depth -= 1
            if depth == 0:
                return src[open_idx + 1 : i]
    return None


MEMBER = re.compile(
    r"^\s*(?:\[[^\]]*\]\s*)?(?P<name>[A-Za-z_$][A-Za-z0-9_$]*)\s*(?:=\s*(?P<val>[^,]+?))?\s*$"
)


def members(bodytext):
    out = []
    auto = 0
    for raw in bodytext.split(","):
        raw = raw.strip()
        if not raw:
            continue
        m = MEMBER.match(raw)
        if not m:
            out.append({"name": "<<UNPARSED>>", "raw": raw[:120]})
            continue
        val = m.group("val")
        if val is not None:
            val = val.strip().strip("'\"")
            try:
                iv = int(val, 0)
                auto = iv
                val = iv
            except ValueError:
                pass
        else:
            val = auto
            auto += 1
            out.append({"name": m.group("name"), "value": val, "implicit": True})
            continue
        if isinstance(val, int):
            auto = val + 1
        out.append({"name": m.group("name"), "value": val})
    return out


def scan(repo, ref, exts, pattern):
    found = []
    for path in files(repo, ref, exts):
        src = blob(repo, ref, path)
        if src is None or "enum" not in src:
            continue
        clean = strip_comments(src)
        for m in pattern.finditer(clean):
            open_idx = clean.index("{", m.end() - 1)
            b = body(clean, open_idx)
            if b is None:
                continue
            found.append(
                {
                    "name": m.group("name"),
                    "path": path,
                    "members": members(b),
                }
            )
    return found


if __name__ == "__main__":
    repo, ref, kind, out = sys.argv[1:5]
    if kind == "cs":
        res = scan(repo, ref, [".cs"], CS_ENUM)
    else:
        res = scan(repo, ref, [".ts", ".tsx", ".js", ".vue"], TS_ENUM)
    with open(out, "w") as f:
        json.dump(res, f, indent=1)
    print(f"{kind} {ref}: {len(res)} enum declarations")
