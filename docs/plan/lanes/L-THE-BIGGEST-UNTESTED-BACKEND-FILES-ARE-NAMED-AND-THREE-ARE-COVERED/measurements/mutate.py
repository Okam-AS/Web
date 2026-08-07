#!/usr/bin/env python3
"""Apply one mutation to production source, rebuild, run a filtered test, restore, report.

Guards against the stale-build trap CLAUDE.md names: the restore is a byte write followed by an
explicit mtime bump, and the WebApi.dll mtime is asserted to have MOVED between the pre-build and the
post-build, so a "0 Error(s)" that recompiled nothing cannot be mistaken for a mutation result.
"""
import subprocess
import sys
import os
import json
import time

ROOT = "/Users/svendaneel/okam/wt-posunc20"
DLL = os.path.join(ROOT, "bin/Debug/net8.0/WebApi.dll")


def run(cmd, timeout=900):
    return subprocess.run(cmd, cwd=ROOT, shell=True, capture_output=True, text=True, timeout=timeout)


def build():
    before = os.path.getmtime(DLL) if os.path.exists(DLL) else 0
    r = run("dotnet build WebApi.Tests/WebApi.Tests.csproj -c Debug")
    after = os.path.getmtime(DLL) if os.path.exists(DLL) else 0
    ok = "0 Error(s)" in r.stdout
    return ok, after != before, r.stdout[-1500:] if not ok else ""


def test(filt):
    r = run(f'dotnet test WebApi.Tests/WebApi.Tests.csproj --no-build -c Debug '
            f'--filter "Database!=SqlServer&({filt})"')
    out = r.stdout + r.stderr
    for line in out.splitlines():
        if line.startswith("Passed!") or line.startswith("Failed!"):
            return line.strip()
    return "NO SUMMARY LINE: " + out[-400:]


def main():
    spec = json.load(open(sys.argv[1]))
    only = sys.argv[2] if len(sys.argv) > 2 else None
    results = []
    for m in spec:
        if only and m["id"] != only:
            continue
        path = os.path.join(ROOT, m["file"])
        original = open(path, encoding="utf-8").read()
        mutated = original
        for old, new in m["edits"]:
            assert mutated.count(old) == 1, f'{m["id"]}: anchor not unique/found in {m["file"]}: {old[:60]!r}'
            mutated = mutated.replace(old, new)

        with open(path, "w", encoding="utf-8") as fh:
            fh.write(mutated)
        os.utime(path, None)

        ok, recompiled, err = build()
        if not ok:
            mutated_result = "BUILD FAILED: " + err
        elif not recompiled:
            mutated_result = "STALE BUILD - assembly did not move"
        else:
            mutated_result = test(m["filter"])

        with open(path, "w", encoding="utf-8") as fh:
            fh.write(original)
        os.utime(path, None)
        time.sleep(1)

        ok, recompiled, err = build()
        restored_result = test(m["filter"]) if (ok and recompiled) else f"RESTORE BUILD PROBLEM ok={ok} recompiled={recompiled}"

        assert open(path, encoding="utf-8").read() == original, f'{m["id"]}: restore did not round-trip'
        results.append((m["id"], m["expect"], mutated_result, restored_result))
        print(f'{m["id"]:8} | expect {m["expect"]:5} | mutated: {mutated_result} | restored: {restored_result}',
              flush=True)

    print("\n==== summary ====")
    for mid, expect, mutated, restored in results:
        print(f"{mid:8} {expect:5} MUTATED[{mutated}] RESTORED[{restored}]")


if __name__ == "__main__":
    main()
