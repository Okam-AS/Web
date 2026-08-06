```
RETURN: L-GR-CONFIRM-STALE
brief: b8f363ef
verdict: built
evidence: OkamAPI-modules lane/gr-confirm-stale, code at 771c0fc0 and its receipt at 75e5168c (branch tip), own worktree /Users/svendaneel/okam/wt-gr-confirm-stale off 48950702, unpushed · artifacts/tests/771c0fc0a6504971fb1cfdab5eed4ab878582ab5/RUN.md + artifacts/tests/771c0fc0-fast-tier.trx (fast tier Database!=SqlServer, 4380 total / 4368 passed / 0 failed / 12 skipped, exit 0, from a clean checkout of 771c0fc0) · WebApi.Tests/Growth/GrowthTestSendReachabilityTests.cs
log:
- Brief verified before building: EmailConfirmed is set true only at UserService.cs:134 and cleared only at :106/:119 (address change). No expiry, no re-read, and no column records WHEN. The finding holds exactly as written.
- No staleness NUMBER invented, and none was needed for the exit criterion. Precedent found instead: Growth already rules that a permission proof does not lapse on a timer (GrowthConsentService.cs:166 "consent does not expire in v1"; the projection takes no age input) — what ends it is dated EVIDENCE.
- The platform holds that evidence: the append-only suppression ledger, which GrowthWebhookIngestionService writes hard bounces and complaints into and GrowthPrivacyRequestService writes on erasure intake. A recycled or dead mailbox surfaces there as a bounce. Test-send consulted none of it.
- BUILT: TestSendAsync calls RequireAddressNotSuppressedAsync AFTER the ownership load and on the ACCOUNT's address — asked earlier, or on the requested address, it would be a channel-wide oracle over strangers' bounces. 409 growth.test_address_suppressed, static and address-free (C7).
- Refuses on exactly the GB4 never-lift reasons (GrowthSuppressionLiftPolicy — the only such classification, and it fails closed for an unclassified reason). Unsubscribe/Objection deliberately do not: an admin's own mailbox is not a marketing target, and deciding those on GB4's own terms needs the confirm instant nothing records.
- Scope comes from GrowthConsentProjection.SuppressionCoversTarget (the single definition), so another venue's store-scoped row never reaches this one. Suppressions are read across ALL contact-point versions (§13.4) via a new read-only IGrowthContactPointResolver.ResolveAllVersionIdsAsync.
- No migration authored, no schema change. C3: no new surface — route, controller and DI were already wired and the added dependency is already registered. The § 15 clause and its four pins are untouched and still green.
- Four new pins, each driving BOTH the served and the refused state through the same route, same actor, byte-identical body; the first advances the clock a year so "confirmed long ago" is literal rather than asserted.
- Mutations, each red only its own pin: M1 (call dropped) 4/4 red; M2 (never-lift filter forced true) 1 red; M3 (latest contact-point version only) 1 red; M4 (store scope shifted) 2 red. Restored and rebuilt between each, assembly mtime checked against source per CLAUDE.md's --no-build trap.
- Base MEASURED, not inherited: 4376 total / 4364 passed / 12 skipped, exit 0, at 48950702 from the clean lane checkout — reproduces the recorded base exactly.
- After: 4380 / 4368 / 12, 0 failed, exit 0. The +4 is exactly the four new tests. Receipt produced by re-running from a throwaway clean checkout of the commit, as artifacts/tests/README.md requires.
- Suite churn reverted rather than committed: EventsDietaryRunSheetWireTests rewrites artifacts/journeys/ev-dietary/run-sheet.{json,md} with the run date.
- STILL OPEN, Sven-only: a mailbox that changed hands and quietly ACCEPTS mail leaves no suppression. Closing that needs (a) a staleness window nobody in the estate has ruled and (b) an EmailConfirmedAt column on AspNetUsers, i.e. a migration. Not authored — an unruled window makes it a column nothing reads. Suggest Flag F-GR-CONFIRM-AGELESS.
- Nothing written claims § 15 is closed: the confirmation code is still six digits with no attempt counter, and the rate-limit work is a separate lane.
- Local commits only, never pushed. Own worktree on a new branch lane/gr-confirm-stale off 48950702; the shared OkamAPI-modules checkout and wt-gr-confirmed were not touched.
END RETURN
```
