#!/usr/bin/env python3
# Mutation pass over the gift-card ownership check.
#
# The restore is in a `finally` AND repeated by an atexit hook, because the first attempt at this ran
# under a 2-minute foreground cap, was killed between writing a mutation and restoring it, and left
# the check sitting below the status guard on disk. A runner that can be killed mid-mutation must put
# the file back on every exit path, not only the happy one.
import atexit, os, re, subprocess, sys

WT = "/Users/svendaneel/okam/be-giftguard"
SRC = os.path.join(WT, "Services/GiftcardService.cs")
BASELINE = 13
ORIG = open(SRC, encoding="utf-8").read()

def restore():
    if open(SRC, encoding="utf-8").read() != ORIG:
        open(SRC, "w", encoding="utf-8").write(ORIG)
        sys.stdout.write("  [restored on exit]\n")
atexit.register(restore)

CHECK = """                    if (string.IsNullOrWhiteSpace(giftcard.ReceiverUserId) ||
                        !string.Equals(giftcard.ReceiverUserId, callerUserId, StringComparison.Ordinal))
                    {
                        throw new AppException(ErrorMessages.GiftcardNotFound);
                    }
"""
STATUS = '                    if (giftcard.Status != GiftcardStatus.Completed) throw new AppException(ErrorMessages.GiftcardNotFound);\n'
TOPGUARD = "            if (string.IsNullOrWhiteSpace(callerUserId)) throw new AppException(ErrorMessages.GiftcardNotFound);\n"

MUTS = [
    ("the ownership check is deleted outright", CHECK, ""),
    ("the check is inverted: only NON-holders may transfer", CHECK,
     CHECK.replace("!string.Equals", "string.Equals").replace("string.IsNullOrWhiteSpace(giftcard.ReceiverUserId) ||", "false ||")),
    ("a blank holder id satisfies the check", CHECK,
     CHECK.replace("string.IsNullOrWhiteSpace(giftcard.ReceiverUserId) ||", "false ||")),
    ("the refusal names a distinct reason, making the route an id oracle", CHECK,
     CHECK.replace("throw new AppException(ErrorMessages.GiftcardNotFound);",
                   'throw new AppException("You do not hold this giftcard");')),
    ("the ownership check moves BELOW the status guard", CHECK + "\n" + STATUS, STATUS + "\n" + CHECK),
    ("the status guard names a distinct reason, re-opening the oracle by another door", STATUS,
     '                    if (giftcard.Status != GiftcardStatus.Completed) throw new AppException("Giftcard must be completed to transfer");\n'),
]

red = 0
applied = 0
for name, frm, to in MUTS:
    if ORIG.count(frm) != 1:
        print("NOT-APPLIED  (%d anchors)  %s" % (ORIG.count(frm), name)); continue
    applied += 1
    try:
        open(SRC, "w", encoding="utf-8").write(ORIG.replace(frm, to, 1))
        r = subprocess.run(["dotnet", "test", "--filter", "FullyQualifiedName~GiftcardBalanceTests"],
                           cwd=os.path.join(WT, "WebApi.Tests"), capture_output=True, text=True, timeout=600)
    finally:
        open(SRC, "w", encoding="utf-8").write(ORIG)
        assert open(SRC, encoding="utf-8").read() == ORIG, "RESTORE FAILED for " + name
    out = r.stdout + r.stderr
    m = re.search(r"Failed:\s+(\d+), Passed:\s+(\d+), Skipped:\s+(\d+), Total:\s+(\d+)", out)
    if not m:
        # No vstest counts at all: a build failure or a spawn failure. Neither is a kill certificate,
        # so it is reported as INVALID-RUN rather than counted as a red.
        print("INVALID-RUN  (no vstest counts — build error?)  %s" % name); continue
    f, p, s, t = (int(x) for x in m.groups())
    if t != BASELINE:
        print("INVALID-RUN  (executed %d of %d tests)  %s" % (t, BASELINE, name)); continue
    red += 1 if f > 0 else 0
    print("%-6s failed=%d/%d  %s" % ("RED" if f > 0 else "GREEN", f, t, name))

print("\n%d of %d applied mutations reddened the suite (baseline %d tests executed each time)" % (red, applied, BASELINE))
