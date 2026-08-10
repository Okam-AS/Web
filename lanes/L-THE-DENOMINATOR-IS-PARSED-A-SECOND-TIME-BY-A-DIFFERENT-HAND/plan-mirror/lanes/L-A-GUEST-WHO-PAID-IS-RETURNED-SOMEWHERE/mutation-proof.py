#!/usr/bin/env python3
"""Mutation proof for the Vipps deposit fallback fix.

THE MUTATION IS NOT SYNTHETIC. Deleting `FallBack = fallBack,` from the adapter's VippsCommonModel
initializer reproduces backend trunk 1c71ae951 BYTE FOR BYTE: at that trunk the initializer sets five
properties and FallBack is not among them, so merchantInfo.fallBack went to Vipps as null. So a red
here proves the new arms catch the LIVE defect, not a contrived variant of it.

Three things this asserts rather than assumes, each because the estate has paid for its absence:

  BUILD RAN.       `dotnet test --no-build` measures the last assembly built. Writing a mutant and
                   running --no-build measures the binary WITHOUT it, and every mutation reads green.
                   WebApi.dll's mtime must MOVE.
  TESTS RAN.       A filter that matches nothing exits 0 having run nothing, which reads as "survived".
                   The count must be non-zero AND equal to the baseline.
  FILE RESTORED.   The restore is in a `finally` AND an `atexit` hook, and the bytes are compared to
                   the buffer afterwards. A foreground script killed between the write and the restore
                   left a mutant on disk in this program, and it was caught by reading the file rather
                   than by trusting an exit code.
"""
import atexit
import pathlib
import re
import subprocess
import sys

WT = pathlib.Path(__file__).resolve().parents[2]
TARGET = WT / "Services/Events/EventsDepositPaymentPortAdapter.cs"
DLL = WT / "WebApi.Tests/bin/Debug/net8.0/WebApi.dll"
FILTER = "FullyQualifiedName~EventsDepositVippsFallbackTests"
ANCHOR = "                    FallBack = fallBack,\n"

ORIGINAL = TARGET.read_text()


def restore():
    if TARGET.read_text() != ORIGINAL:
        TARGET.write_text(ORIGINAL)


atexit.register(restore)


def run_suite():
    """Build, assert the compiler ran, then run the filtered suite. Returns (total, failed, rc).

    The touch is what makes the STALE-BUILD assertion meaningful rather than self-defeating. MSBuild
    skips a project whose sources are older than its output, so an UNMUTATED baseline run legitimately
    recompiles nothing and the mtime legitimately does not move — the guard would fire on a correct
    run. Touching first means the compiler is obliged to run every time, so a mtime that then fails to
    move is a real staleness rather than an up-to-date check doing its job.
    """
    TARGET.touch()
    before = DLL.stat().st_mtime_ns if DLL.exists() else 0
    b = subprocess.run(["dotnet", "build"], cwd=WT / "WebApi.Tests",
                       capture_output=True, text=True)
    if b.returncode != 0:
        return ("BUILD-FAILED", None, b.returncode)
    after = DLL.stat().st_mtime_ns if DLL.exists() else 0
    if after == before:
        return ("STALE-BUILD", None, -1)

    r = subprocess.run(["dotnet", "test", "--no-build", "--filter", FILTER],
                       cwd=WT / "WebApi.Tests", capture_output=True, text=True)
    out = r.stdout + r.stderr
    m = re.search(r"Failed:\s+(\d+),\s+Passed:\s+(\d+),\s+Skipped:\s+(\d+),\s+Total:\s+(\d+)", out)
    if not m:
        return ("NO-SUMMARY", None, r.returncode)
    return (int(m.group(4)), int(m.group(1)), r.returncode)


def main():
    print("BASELINE (unmutated)")
    total, failed, rc = run_suite()
    print("  total=%s failed=%s rc=%s" % (total, failed, rc))
    if not isinstance(total, int) or total == 0:
        print("  a sweep against zero tests proves nothing"); return 1
    if failed != 0:
        print("  baseline is not green; nothing below is interpretable"); return 1
    baseline = total

    n = ORIGINAL.count(ANCHOR)
    if n != 1:
        print("ANCHOR matched %d times, expected 1" % n); return 1

    print("\nM1  the fallback leaves the Vipps order -- backend trunk 1c71ae951 reproduced exactly")
    try:
        TARGET.write_text(ORIGINAL.replace(ANCHOR, "", 1))
        m_total, m_failed, m_rc = run_suite()
    finally:
        restore()

    ok_bytes = TARGET.read_text() == ORIGINAL
    print("  total=%s failed=%s rc=%s" % (m_total, m_failed, m_rc))
    print("  restored byte-for-byte: %s" % ok_bytes)

    if not ok_bytes:
        print("\nRESTORE FAILED -- stop and check the file before doing anything else"); return 1
    if not isinstance(m_total, int):
        print("\nINVALID-RUN (%s) -- the compiler's work, not the suite's" % m_total); return 1
    if m_total != baseline:
        print("\nINVALID-RUN -- ran %s tests, baseline is %s" % (m_total, baseline)); return 1
    if m_failed == 0:
        print("\nSURVIVED -- the arms do not catch the live defect"); return 1

    print("\nKILLED: %d of %d arms red under the trunk's own behaviour, and the file is back."
          % (m_failed, m_total))
    return 0


if __name__ == "__main__":
    sys.exit(main())
