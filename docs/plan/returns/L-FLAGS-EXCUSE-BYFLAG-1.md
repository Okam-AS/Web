```
RETURN: L-FLAGS-EXCUSE-BYFLAG
brief: 183f8ab3
verdict: built
evidence: /Users/svendaneel/okam/OkamAPI-flagsexcuse/lanes/L-FLAGS-EXCUSE-BYFLAG/mutation-receipt.md
log:
verified: the guard filtered on d.Module (line 96) — a module-keyed denylist, as briefed.
proved pre-fix: deleting Program.cs:779 (Workforce resolver) left the guard 4/4 GREEN, and only
WorkforceWireTests' grandfathered-store pin reddened. Finding 1 confirmed empirically.
proved pre-fix: a new advertised flag inside an excused module (training.probe appended to
TrainingFeatureFlags.Declared) also passed 4/4 unexamined. Finding 2 confirmed.
verified: Training declares 7, withholds 5 (:90-109), advertises 2 (:121-122,142-145), so the
"All seven advertised training.* flags" excuse was false. Finding 3 confirmed.
built: excuses keyed by FLAG KEY — 8 entries, the 2 advertised training.* and the 6 workforce.*
stage flags — each reason naming that key's own seam and enforcement points, read from the code.
built: self-correction is per key now — an excused key must still be in the catalog AND claimed
by no resolver, so no resolver's claimed key can ever be excused.
exit proof: deleted each of the five registrations in turn (Workforce, Growth, Meals, Events,
Margin) — every one reds the guard; the training.probe flag now reds and is named.
tier at the commit: Database!=SqlServer 4388 total / 4376 passed / 12 skipped / 0 failed.
NOTE: landed on NEW branch lane/flags-excuse-byflag @ 6ae0b8db, worktree OkamAPI-flagsexcuse.
END RETURN
```
