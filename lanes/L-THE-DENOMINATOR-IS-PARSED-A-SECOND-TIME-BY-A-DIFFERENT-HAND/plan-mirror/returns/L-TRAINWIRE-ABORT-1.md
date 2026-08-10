```
RETURN: L-TRAINWIRE-ABORT
brief: 8e55edce
verdict: built
evidence: /Users/svendaneel/okam/Web-modules/docs/plan/lanes/L-TRAINWIRE-ABORT/finding.md
log:
Abort REPRODUCED before anything changed, at a clean checkout of 06b8b582 (OkamAPI), no merge in front; own worktree, --filter Database!=SqlServer throughout, no container touched.
Tier before: 3155 passed / 0 failed / 10 skipped = 3165 counted, then Test Run Aborted (artifacts/tier-before.trx) - zero failures recorded and roughly 1200 tests never reached.
Six-second repro: TrainingWireTests declares 26 [Fact] and the trx holds 15, then the same abort (artifacts/trainwire-before.trx).
Stack verbatim as briefed: ObjectDisposedException 'JsonDocument' at JsonElement.ToString inside Xunit.Sdk.AllException.get_Message, reached from TestRunner constructing TestFailed.
The assertion did fail; the crash is xunit formatting it after `using var document` disposed on unwind. AllException formats lazily, ContainsException in its ctor - only Assert.All is fatal.
Claim also over-reached: TrainingPersonRef is Claimed by Outsider (WireHostFixture:766), two siblings read the log as that subject, and their rows carry actorIsSubject true.
Shown by order rather than argued: the last test recorded before the abort is the sibling that writes the subject row.
Change A: elements projected to bool before Assert.All; all-false claim scoped to the AdminA rows this test writes, with Assert.NotEmpty. Assertion not silenced, fixture not widened.
Change A alone exposed a SECOND red test the abort had hidden - line 1031 claimed every evidence.read for this person was AdminA's, while a sibling has AdminB read that person in StoreB on purpose.
The ledger is right and the assertion over-claimed, so change B identifies the rows the request adds by id rather than counting - a third change beyond the two briefed, separable via fix.patch.
Tier after at the same 06b8b582: 4381 passed / 0 failed / 12 skipped = 4393 counted, completes (artifacts/tier-after.trx).
The 4650 is not a property of 06b8b582, which holds 4393 tests; it is the 8e2b57de baseline, 59 commits ahead (rev-list --left-right --count 06b8b582...8e2b57de = 1 59).
The merge was measured too - the file is byte-identical at 06b8b582 and f4407595 (blob a64c8a0b) - and the merged tier counts 4650/0/12 = 4662, completes (artifacts/merged-tier-after.trx).
Mutation: ActorIsSubject forced true reds both claims and the run COMPLETES at 24/2/26 - the failure that used to abort now reports. Restored, rebuilt, green 26/26; all runs mtime-checked.
Fix on a private local branch, never pushed: OkamAPI local/trainwire-abort-fix 94a92615, parent 06b8b582, one file +34/-10. No shared-branch commit, no migration, no npm, no stash, no add -A.
END RETURN
```
