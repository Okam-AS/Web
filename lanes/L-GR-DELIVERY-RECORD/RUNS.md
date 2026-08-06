# L-GR-DELIVERY-RECORD - fail-spec, with the measured truth

Verdict: **fail-spec**. The ruling `F-GR-FALSE-EVIDENCE = no-record-without-success` is already
implemented AND already proven by a throwing-sender contract case at the base I was told to build
on. Nothing was built, nothing committed, no container started, no migration authored, no confirm
or limiter file touched.

Base: `feature/restaurant-modules` @ `3579bbbc` (verified: `git rev-parse` resolves the branch to
that SHA). Worktree `/Users/svendaneel/okam/OkamAPI-grdelrec` on `lane/gr-delivery-record`, clean,
zero commits. I did NOT work in `/Users/svendaneel/okam/OkamAPI-modules` (it is on
`lane/meals-grace-pins` @ `34c6c103` and hosts the live WebApi process).

---

## 1. The brief's premise, measured

> "The GDPR article 15 export and the article 17 completion notice **both terminate in the in-memory
> fake mail provider**, and the resolution record is written **marked delivered regardless**."

**First half TRUE. Second half FALSE.**

**The fake default is real.** `Services/Growth/GrowthMailProviderSelection.cs` returns
`GrowthFakeMailProvider` for `GrowthMailProviderKind.Fake`, which is the value for any deployment
that configured nothing, and `GrowthFakeMailProvider` answers `Accepted` without I/O. `Program.cs`
now states the binding at boot ("Growth mail provider bound: Fake (in-memory; no mail leaves the
process)") and escalates an unusable selection to Critical. That is the delivery gap, and it is
D-MAIL's, not this lane's - the brief itself separates them.

**"Marked delivered regardless" is not the code.** Commit `6b4913b8` - *"An Art. 15/17 receipt can
no longer record a delivery nobody made"* - is an ancestor of the base and already replaced the
boolean the brief describes. `git log feature/restaurant-modules -- Services/Growth/GrowthPrivacyRequestService.cs`:

```
86c0f9ae The article 12 deadline is the server's answer, not the page's arithmetic
31213006 Put the privacy notice-delivery state on the wire
6b4913b8 An Art. 15/17 receipt can no longer record a delivery nobody made   <-- the fix
d2d5bae2 Merge branch 'lane/growth-consent-text' into feature/restaurant-modules
```

The old boolean survives only as prose. `grep -rn "exportDelivered"` over the whole tree returns
four hits, all of them comments describing the defect in the past tense
(`Enums/Growth/GrowthPrivacyNoticeDelivery.cs:7`,
`Services/Growth/GrowthPrivacyRequestService.cs:252`, and two test docs). Zero code.

## 2. What is in place instead

`SendSubjectNoticeAsync` returns what the transport reported and nothing else
(`Services/Growth/GrowthPrivacyRequestService.cs:270-299`). Three states, no zero member
(`GrowthPrivacyNoticeDelivery`): `NotAttempted`, `SubmittedToTransport`, `AttemptedAndFailed`.
The two transport failures reach the service down two different paths and both refuse the
resolution:

- provider ANSWERS a refusal -> `GrowthMailSendOutcome.Refused` -> record the attempt, throw 503
  `growth.notice_undeliverable`;
- provider THROWS -> `GrowthMailSendException` caught -> record the attempt, throw the same 503.

`GrowthErasureShred.ShredOrDeferAsync` refuses `AttemptedAndFailed` outright, so the notice-before-
shred ordering is a precondition of destroying anything rather than a habit of today's caller.

**Every production writer of the record, enumerated** (`grep -rn "ResolutionJson *=" --include='*.cs'`,
test project excluded) - six sites, none able to claim a delivery the sender did not report:

| Site | Writes |
| --- | --- |
| `GrowthPrivacyRequestService.cs:70` | `null` at file time |
| `GrowthPrivacyRequestService.cs:185` | `RejectedWithReason` - carries no delivery claim |
| `GrowthPrivacyRequestService.cs:245` | `ForAccess(noticeDelivery, ...)` - downstream of both checks |
| `GrowthPrivacyRequestService.cs:311` | `ForFailedNotice(...)` - the attempt, request stays open |
| `GrowthErasureShred.cs:88` | `ForErasure(...)` - behind the `AttemptedAndFailed` guard |
| `GrowthErasureShred.cs:153` | deferred-shred completion - CARRIES FORWARD, never re-asserts |

`SubmittedToTransport` has exactly ONE production producer:
`GrowthPrivacyRequestService.cs:299`, unreachable unless the sender reported `Submitted`.

## 3. The exit criteria, already met - and I confirmed it discriminates

`WebApi.Tests/Growth/GrowthPrivacyDeliveryEvidenceTests.cs` carries the contract case the brief
asks for, on BOTH articles, as an explicit two-arm theory:

```csharp
public enum TransportFailure { Refuses, Throws }

[Theory] [InlineData(TransportFailure.Refuses)] [InlineData(TransportFailure.Throws)]
public async Task An_access_resolution_records_no_delivery_when_the_transport_does_not_report_one(...)

[Theory] [InlineData(TransportFailure.Refuses)] [InlineData(TransportFailure.Throws)]
public async Task An_erasure_whose_notice_the_transport_will_not_take_destroys_nothing_and_stays_retryable(...)
```

Non-vacuity is already paired, in-world, through the same call:

- the erasure test retries the SAME request against a working transport and asserts the record then
  reads `SubmittedToTransport` + `completion-notice-sent` and the address is destroyed;
- `A_receipt_tells_a_send_a_failed_send_and_a_non_attempt_apart` produces all three states in one
  world and asserts the three distinguishable JSON strings an auditor reads.

### Run 1 - baseline, container-free tier

```
dotnet test WebApi.Tests/WebApi.Tests.csproj --no-build \
  --filter "Database!=SqlServer&FullyQualifiedName~GrowthPrivacyDeliveryEvidenceTests"
Passed!  - Failed: 0, Passed: 8, Skipped: 0, Total: 8
```

Assembly newer than source before trusting it: `WebApi.dll` 1785754443 / `WebApi.Tests.dll`
1785754454 vs `GrowthPrivacyRequestService.cs` 1785754417.

### Run 2 - MUTANT-B, remove the success check on the THROWS arm

Replaced the catch body with `return GrowthPrivacyNoticeDelivery.SubmittedToTransport;`. Rebuilt
(assembly mtime 1785754443 -> 1785754515).

```
Failed ...An_access_resolution_records_no_delivery_when_the_transport_does_not_report_one(failure: Throws)
Failed ...An_erasure_whose_notice_the_transport_will_not_take_destroys_nothing_and_stays_retryable(failure: Throws)
Failed!  - Failed: 2, Passed: 6, Total: 8
```

Exactly the two Throws arms. The Refuses arms stayed green, so the two arms are gated
independently and neither is riding on the other.

### Run 3 - MUTANT-A, remove the success check on the REFUSES arm

Emptied the `if (outcome != GrowthMailSendOutcome.Submitted)` body. Rebuilt (1785754515 ->
1785754547).

```
Failed ...An_access_resolution_records_no_delivery_when_the_transport_does_not_report_one(failure: Refuses)
Failed ...A_privacy_request_the_subject_re_files_while_a_send_is_owed_is_the_same_request
Failed ...An_erasure_whose_notice_the_transport_will_not_take_destroys_nothing_and_stays_retryable(failure: Refuses)
Failed ...A_receipt_tells_a_send_a_failed_send_and_a_non_attempt_apart
Failed!  - Failed: 4, Passed: 4, Total: 8
```

### Run 4 - restored, forced rebuild, green

`git diff --stat` and `git status --short` both empty -> the restore is byte-identical to
`3579bbbc`, not merely similar. `touch`ed the source so MSBuild could not call it up to date, then
rebuilt: source 1785754566 < assembly 1785754580, so the assembly moved and the number is the
restored code's.

```
Passed!  - Failed: 0, Passed: 8, Skipped: 0, Total: 8
```

### Run 5 - the wire half

`WebApi.Tests/Wire/GrowthPrivacyNoticeDeliveryWireTests.cs` drives the real pipeline over in-memory
SQLite (`WireHost.cs:111` - no container).

```
Passed!  - Failed: 0, Passed: 5, Skipped: 0, Total: 5
```

Workdir still clean afterwards: filtering to this one class never reaches the ev-dietary journeys,
so the two tracked files under `artifacts/journeys/ev-dietary/` were never written.

## 4. C1 - existing false entries: none reachable, and none to correct

`GrowthPrivacyRequests` is created by `Migrations/20260727221455_RestaurantModules_Initial`, and
that migration is **not an ancestor of `master`, `main`, `origin/master` or `origin/main`**
(`git merge-base --is-ancestor` -> no on all four). The table has never existed outside a local or
test database, so the pre-`6b4913b8` window produced no persisted false entry any regulator could be
shown. I repaired nothing and would not have.

## 5. C6 - the statutory claim was not widened or narrowed

The three states reach an operator as prose that refuses to overstate acceptance, in all three
locales (`translations/en.ts:5104-5107`, `no.ts:5159-5162`, `de.ts:5111-5114`):

> "The mail provider accepted the notice to the guest. Whether it arrived we do not know - only the
> provider can say."

`gp_notice_none` is a fourth, separate sentence for a null receipt, so a row with no evidence is not
rendered as one of the three states.

## 6. C7 and the adjacent lane

C7 holds: the receipt is metadata only - no address, no export body - and the suite pins it
(`Assert.DoesNotContain("access-fail@example.test", request.ResolutionJson)`; the wire suite asserts
the raw address is absent from the response body). The provider idempotency key is a SHA-256 digest
of `(store, type, address)`, never the address.

No collision with **L-GR-TESTSEND-RECORD**. That lane is blocked on a NEW newsletter test-send
ledger (its `DETAIL.md` establishes `GrowthAuditEvent` does not exist and Growth has no audit ledger
at all). My record is the pre-existing spec-4 evidence store `GrowthPrivacyRequests.ResolutionJson`,
which already exists, is already the Art. 15/17 receipt, and needs no schema. I built no second
table and no second name for one problem.

---

# Run 2 (brief `c9f27214`, 2026-08-05) — re-measured at the NEW tip, same verdict

Run 1 measured `feature/restaurant-modules` @ `3579bbbc` (2026-08-02). This run re-measures at
**`8e2b57de`** — `feature/restaurant-modules` tip, `L-VIOLATION-EXACT-LAND: merge receipt for the
constraint-exactness landing`, 2026-08-04 12:00:29 +0200. Every read below is
`git show 8e2b57de:<path>`, never the working directory (the primary checkout sits on
`lane/meals-grace-pins` @ `34c6c103`).

## 1. The fix is still an ancestor of the tip

`git merge-base --is-ancestor 6b4913b8 8e2b57de` → yes. `6b4913b8` = *"An Art. 15/17 receipt can no
longer record a delivery nobody made"*, 2026-08-01 10:42:44 +0200.

## 2. The exit criterion, read at `8e2b57de`

Exit criterion: *"the access and erasure resolution records cannot report a delivery unless the
sender reports success, proven by a contract case in which the sender throws."*

| Half of the criterion | At `8e2b57de` |
| --- | --- |
| sender reports success | `IGrowthTransactionalMailSender.SendPrivacyNoticeAsync` returns `Task<GrowthMailSendOutcome>` (`Submitted` / `Refused`); a transport that cannot say throws `GrowthMailSendException` — deliberately not representable as a value |
| access record | `GrowthPrivacyRequestService.cs:245` `ForAccess(noticeDelivery, …)`, and `noticeDelivery` can only be `SubmittedToTransport` from line 299, downstream of both the catch and the `outcome != Submitted` check |
| erasure record | `GrowthErasureShred.cs:88` / `:153` `ForErasure(…)`; `ShredOrDeferAsync` refuses `AttemptedAndFailed` outright, and the deferred-shred completion carries the earlier value forward rather than re-asserting |
| "delivery" is not even sayable | `GrowthPrivacyNoticeDelivery` has three members and **no `Delivered`** — `git grep GrowthPrivacyNoticeDelivery.Delivered 8e2b57de` → 0 hits |
| the throwing contract case | `WebApi.Tests/Growth/GrowthPrivacyDeliveryEvidenceTests.cs` — `[Theory] [InlineData(TransportFailure.Refuses)] [InlineData(TransportFailure.Throws)]` on BOTH `An_access_resolution_records_no_delivery_when_the_transport_does_not_report_one` and `An_erasure_whose_notice_the_transport_will_not_take_destroys_nothing_and_stays_retryable`; the fake throws `GrowthMailSendException` on `ThrowOnPrivacyNotices` |

`git grep exportDelivered 8e2b57de` → 4 hits, all past-tense prose in doc comments. Zero code.

## 3. Nothing load-bearing moved since run 1's mutation proof

```
git diff --stat 3579bbbc 8e2b57de -- \
  Services/Growth/GrowthPrivacyRequestService.cs \
  Services/Growth/GrowthPrivacyResolutionReceipt.cs \
  Services/Growth/GrowthErasureShred.cs \
  Services/Growth/IGrowthTransactionalMailSender.cs \
  Enums/Growth/GrowthPrivacyNoticeDelivery.cs \
  Services/Growth/GrowthMailProviderSelection.cs \
  WebApi.Tests/Growth/GrowthPrivacyDeliveryEvidenceTests.cs \
  WebApi.Tests/Wire/GrowthPrivacyNoticeDeliveryWireTests.cs
→ (empty)
```

Byte-identical on all eight. Run 1's three mutation runs (MUTANT-B killed exactly the 2 `Throws`
arms; MUTANT-A killed 4; restore byte-identical and green) therefore describe this tip's code, and
re-running them would prove the same bytes twice.

## 4. Suite at the tip, container-free

Worktree `/Users/svendaneel/okam/OkamAPI-grdelrec` on `lane/gr-delivery-record`, fast-forwarded
`3579bbbc → 8e2b57de`, clean, 0 commits of mine. Host SDK 8.0.110, `net8.0`. No container started
(the base spins SQLite `DataSource=:memory:`; the wire tier uses `WireHost` on the same).

```
dotnet test WebApi.Tests/WebApi.Tests.csproj --no-build --filter \
  "Database!=SqlServer&(FullyQualifiedName~GrowthPrivacyDeliveryEvidenceTests|FullyQualifiedName~GrowthPrivacyNoticeDeliveryWireTests)"
Passed!  - Failed: 0, Passed: 13, Skipped: 0, Total: 13, Duration: 3 s
```

## 5. The surviving gap is configuration, and it is not this lane's

`appsettings.json` @ `8e2b57de`: `"Growth": { "Enabled": false, "MailProvider": "Fake", … }`.
`GrowthMailProviderSelection.Resolve` switches `Fake | Smtp | Postmark` with **no fallback** — an
unrecognised value throws at resolve time. `GrowthPostmarkMailProvider` exists and is selectable
(D-MAIL ruled `postmark` by @sven 2026-07-31). So "the notice terminates in the in-memory fake" is
now a deployment setting an operator flips, not a code path with no alternative. The brief itself
separates that from the record lying, and the record does not lie.

## 6. C1 unchanged

`GrowthPrivacyRequests` comes from `Migrations/20260727221455_RestaurantModules_Initial`, still not
an ancestor of `master`/`main`/`origin/master`/`origin/main` — the table has never been deployed, so
no false receipt was ever persisted anywhere a regulator could read. Nothing backfilled, repaired or
purged; no row of any append-only table was touched by this run.

## 7. What I did not do

Built nothing, committed nothing, pushed nothing, authored no migration, started no container,
touched no container I did not create, and wrote outside `lanes/L-GR-DELIVERY-RECORD/` only my
RETURN. Run 1's return was preserved verbatim at
`lanes/L-GR-DELIVERY-RECORD/RETURN-run1-brief-fee6d941.md` before this run's block replaced it at
`docs/plan/returns/L-GR-DELIVERY-RECORD-1.md`.
