#!/usr/bin/env python3
"""Four-state non-vacuity record for L-WF-WITHHELD-BOUND.

For each named transition: apply the mutation (exact string replace), run the pin,
restore, run again. Per-test outcome is printed for every state -- never a count.
"""
import os
import re
import subprocess
import sys
import xml.etree.ElementTree as ET

ROOT = "/Users/svendaneel/okam/wt-wfwithheld"
TRX_DIR = os.path.join(ROOT, "lanes/L-WF-WITHHELD-BOUND/trx")
FILTER = "Database!=SqlServer&FullyQualifiedName~WorkforceNotificationBacklogBoundTests"

PUBLISH = os.path.join(ROOT, "Services/Workforce/WorkforceSchedulePublishService.cs")
DISPATCH = os.path.join(ROOT, "Services/Workforce/WorkforceNotificationDispatcher.cs")

SUPERSEDE_BLOCK = """            if (supersedes.HasValue)
            {
                var supersededPrefix = OutboxKeyPrefix(supersedes.Value);
                var stale = await _context.WorkforceNotificationOutbox
                    .Where(o => o.StoreId == storeId
                                && o.LogicalDedupeKey.StartsWith(supersededPrefix)
                                && (o.Status == WorkforceNotificationOutboxStatus.Pending
                                    || o.Status == WorkforceNotificationOutboxStatus.Failed
                                    || o.Status == WorkforceNotificationOutboxStatus.Withheld))
                    .ToListAsync(ct);
                foreach (var command in stale)
                {
                    command.Status = WorkforceNotificationOutboxStatus.Superseded;
                }
            }
"""

AGEOUT_BLOCK = """                var notice = WorkforceSchedulePublicationNotice.TryParse(row.PayloadJson);
                if (notice != null && notice.RangeEndUtc.HasValue && notice.RangeEndUtc.Value <= now)
                {
                    row.Status = WorkforceNotificationOutboxStatus.DeadLettered;
                    row.DeadLetteredAtUtc = now;
                    row.LastError = Truncate(WithheldExpiredReason + ":" + result.Error, 1024);
                    // The recipient is NOT moved to Failed. Nobody attempted this delivery and nobody failed
                    // it; the worker was never reached, which the recipient's own Pending already says.
                    await _context.SaveChangesAsync(ct);
                    outcome.WithheldExpired++;
                    return;
                }

"""

MUTATIONS = [
    ("M1 supersede-cancel removed", PUBLISH, SUPERSEDE_BLOCK, "            // MUTATION-1-REMOVED\n"),
    ("M2 withheld-age-out removed", DISPATCH, AGEOUT_BLOCK, "                // MUTATION-2-REMOVED\n"),
]


def swap(path, old, new):
    with open(path, "r", encoding="utf-8") as fh:
        text = fh.read()
    if text.count(old) != 1:
        sys.exit("FATAL: anchor not found exactly once in " + path)
    with open(path, "w", encoding="utf-8") as fh:
        fh.write(text.replace(old, new))
    # a restore that preserves an older mtime lets MSBuild skip the rebuild (CLAUDE.md)
    os.utime(path, None)


def run(label):
    os.makedirs(TRX_DIR, exist_ok=True)
    name = re.sub(r"[^A-Za-z0-9]+", "-", label).strip("-") + ".trx"
    trx = os.path.join(TRX_DIR, name)
    if os.path.exists(trx):
        os.remove(trx)
    subprocess.run(
        ["dotnet", "test", "WebApi.Tests/WebApi.Tests.csproj",
         "--filter", FILTER, "--nologo", "-v", "q",
         "--logger", "trx;LogFileName=" + trx],
        cwd=ROOT, capture_output=True, text=True,
    )
    ns = {"t": "http://microsoft.com/schemas/VisualStudio/TeamTest/2010"}
    tree = ET.parse(trx)
    results = []
    for r in tree.getroot().iter("{http://microsoft.com/schemas/VisualStudio/TeamTest/2010}UnitTestResult"):
        results.append((r.get("testName").split(".")[-1], r.get("outcome")))
    if not results:
        sys.exit("FATAL: no test results in " + trx)
    for test, outcome in sorted(results):
        print("  [%s] %-78s %s" % (label, test, outcome))
    return results


print("STATE 0 - baseline")
run("baseline")

for label, path, block, marker in MUTATIONS:
    print("STATE - " + label)
    swap(path, block, marker)
    run(label)
    print("STATE - " + label + " RESTORED")
    swap(path, marker, block)
    run(label + " restored")
