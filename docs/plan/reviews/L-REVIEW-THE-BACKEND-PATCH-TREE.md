# Review — lane/backend-patches-composed (fresh-context reviewer, pre-merge)

Reviewer: agent:L-REVIEW-THE-BACKEND-PATCH-TREE · brief 5ad8277e · 2026-08-06
Repo: `/Users/svendaneel/okam/OkamAPI-modules` (read-only throughout; no suite run, no container touched)

Base `integration/mig-stack-merge` = `7f8945dc6`. Tip `lane/backend-patches-composed` = `2ba9229fa`.
The two differ by **four** commits: three patches (`d8c98c200`, `f3817eed9`, `ea66353f9`) and
`2ba9229fa` itself, which is **evidence-only** (`artifacts/tests/`, `lanes/L-BACKEND-PATCHES-ARE-APPLIED/`
— both directories pre-exist on the base as estate convention). The fourth commit is not a patch and is
**excluded from ruling** per the clerk's correction: nothing in it is production code, so there is nothing
to rule land-as-is or change-required about; I read its `evidence.md` only to cross-check the patch
commits' claims, and found it internally consistent with what the diffs show.

Independently verified, agreeing with the sibling lane's reading:
`git diff 7f8945dc6..2ba9229fa -- Migrations/ ApplicationDbContext.cs Entities/` is **empty**.
The lane carries code and tests only — 23 code/test files + 11 artifact files, no migration, no model
change, no entity change. C2 has no surface here at all.

---

## Commit 1 — `d8c98c200` "A company return credits the account it was charged to, not the cash drawer"

**Ruling: LAND-AS-IS.** No change required.

Does what its message says: adds `POST pos/payment/company-account/{journalEntryId}/refund`
(`Controllers/PosController.cs:760`) journalling a RETREC whose single payment line is
`PaymentType.CompanyAccount`, touching no cash drawer and requiring no open day; and makes the cash
refund route refuse a company-account original (`Controllers/PosController.cs:697-700`) with a message
naming the right control (`Helpers/ErrorMessages.cs:65-69`). The mirror guard on the new route
(`PosController.cs:795-797`) stops a non-company sale being closed with no money moving. Scope is
exactly the five files the message implies; nothing else touched.

Candidate findings raised and dissolved against the code, so the merge does not re-litigate them:

- **Mixed tender via `Any()`** — `IsCompanyAccountReceipt` (`PosController.cs:830-833`) treats a
  receipt with *any* company-account line as company-settled. Exact, not approximate: company tender
  refuses combination with any other settlement part (`Services/Kassa/PosSettlementService.cs:409-415`,
  "Bedriftskonto kan ikke kombineres med andre betalinger i samme oppgjøret" guard + "v1 funds fully or
  not at all"), so a receipt with one company line is entirely company-settled.
- **Card-route bypass** — a company sale cannot be refunded through `RefundCard`
  (`PosController.cs:~684`): that route is keyed on the original terminal `transactionId`, which a
  company sale never has.
- **Zero/negative amount** — rejected in the shared service (`Services/Kassa/FinalizeService.cs:356`),
  as is over-refund (`:373-378` cumulative cap upstream) and cross-store refund
  (`FinalizeService.cs:389-391`).
- **§ 5-3-7 relaxation scope** — `ApplyReturnDocumentation` (`FinalizeService.cs:715-729`) waives
  phone+signature *only* when the refund tender is company account (`paysTheCustomerBack`,
  `:722`); both existing call sites (`:489`, `:625`) pass the tender, and no third caller exists on the
  old 2-arg signature. Cash/card behavior byte-for-byte unchanged, including the reason requirement.
- **Claimed downstream control exists** — the route comment's claim that the Meals ledger appends its
  Reversal from this RETREC is real code, not an RF-1313-shaped promise:
  `Services/Meals/MealsJournalProjectionSource.cs:100` (projects `KassaReceiptType.Return`) and `:139`
  (maps it to the reversal kind).

Constraints: **C1** clean — the RETREC goes through `_journalService.AppendSignedEntryAsync`
(append path); no UPDATE/DELETE anywhere in the diff. **C4** clean — the write carries a PIN-resolved
operator (`PosController.cs:782` `GetActingOperatorAsync`, stamped as OperatorId/OperatorName onto the
RETREC), and the actorless Meals reversal row is traceable to it via SourceJournalEntryId by design.
**C7** clean — only the pre-existing `LogWarning(ex, ex.Message)` pattern over constant AppException
messages; no secret-bearing property.

12 new tests (`WebApi.Tests/Meals/MealsCompanyAccountRefundJournalTests.cs`) cover both refusals, the
idempotent retry, drawer/X-report neutrality, no-open-day, operator attribution, and the preserved
cash-side signature requirement.

## Commit 2 — `f3817eed9` "The Tripletex claim window is derived from a budget the code enforces"

**Ruling: LAND-AS-IS.** No change required. Two observations named for the record; neither blocks,
because both err in the safe direction and the guarantee the message claims is enforced, not estimated.

Does what its message says: the voucher claim window stops being a hard-coded 10 minutes
(`Services/Tripletex/TripletexVoucherPoster.cs:126` now `DateTime.UtcNow - StaleClaimAge`) and becomes
derived — `StaleClaimAge = MaxClaimHold + 1min margin` (`:62`, `:28`), `MaxClaimHold =
2 × MaxSingleCallDuration` (`:53-54`, two authed calls per claim `:22`), `MaxSingleCallDuration`
derived from the client's budget (`Models/AppSettings/TripletexSettings.cs:55-58`). And *enforced*:
the pre-check and the create run under a linked token tripped at `MaxClaimHold`
(`TripletexVoucherPoster.cs:149-152`), so no rate-limit wait, session re-mint or 401 retry can make a
run outlive the window another run is told to respect. The claim timestamp (`CreatedUtc`) is stamped
before the CTS starts counting, so the token always trips before the threshold; the 1-minute margin
covers the post-create `UpsertLogAsync` and clock skew. Every retry-delay branch in the client is now
capped, including the previously uncapped remote-controlled `Retry-After`
(`Services/Tripletex/TripletexClient.cs:412,421,427,432`), and the transport timeout is stated rather
than inherited (`:63`, set in the constructor, before first use — safe under any DI lifetime).
The one cancellation the best-effort pre-check must not swallow is rethrown
(`TripletexVoucherPoster.cs:220-225`); window expiry is recorded as a re-claimable Failed with the
monitor alerted (`:182-188`); caller cancellation propagates as before (the old `catch (Exception)`
path also could not write Failed under a cancelled token, so no behavioral regression).

Observations, named exactly, not required for landing:

- **O1 — the derived per-call budget undercounts the true worst case.**
  `TripletexSettings.cs:55-58` counts `RequestTimeoutSeconds` once, but each of the
  `MaxRateLimitRetries` retries issues another HTTP request that may itself take
  `RequestTimeoutSeconds`: true worst case is `(retries+1)×timeout + retries×backoff` (1200s vs the
  derived 700s at defaults). Safe direction: the window is *enforced* by `CancelAfter`, so the
  undercount can only truncate a pathologically slow run into a recoverable Failed — it can never let
  a run outlive `StaleClaimAge` and double-post. In practice a 429 returns fast, so the derived number
  tracks the real worst case. If ever tightened, the exact change is at `TripletexSettings.cs:57`:
  `(Math.Max(0, MaxRateLimitRetries) + 1) * Math.Max(1, RequestTimeoutSeconds) + Math.Max(0, MaxRateLimitRetries) * Math.Max(0, MaxRateLimitBackoffSeconds)`.
- **O2 — default stale-claim recovery lengthens 10min → ~24.3min.** A run that crashes without
  writing Failed leaves its Pending row unreclaimable ~14min longer than before. Deliberate price of
  the double-post guarantee; immaterial at nightly export cadence.

Constraints: **C1** clean — the only UPDATE is the pre-existing conditional re-claim on
`TripletexVoucherLogs` (`TripletexVoucherPoster.cs:130`), a status log that is not in the 68-file
GuardAppendOnly set and is mutated on its documented claim path; only the threshold literal changed.
**C4** n/a — no money-path write changes actor identity. **C7** clean — new/kept log lines carry
`externalKey`/`StoreId`/`Kind` only; no credential, token or signature reaches a sink.

Out-of-scope-looking test edits are all constructor plumbing for the new `IOptions<TripletexSettings>`
parameter (bound at `Program.cs:64`), routed through a shipped-defaults double
(`WebApi.Tests/Tripletex/TripletexTestDoubles.cs`, `TripletexTestSettings.Shipped`) so unrelated tests
hold the production window. New `TripletexClaimWindowTests.cs` proves threshold > window across
budgets, takeover of an abandoned claim, give-up-instead-of-post, and the contended refusal.

## Commit 3 — `ea66353f9` "Open shifts exclude a superseded publication's assignments"

**Ruling: LAND-AS-IS.** No change required.

Does what its message says, by extraction plus one new call site: the lineage predicate that already
existed inline at the §3.8.4 overlap check and the cross-store grid read becomes
`WorkforceScheduleSupport.CurrentLineageOnly` (`Services/Workforce/WorkforceScheduleSupport.cs:307-312`),
recomposed at both prior sites (`:359`, `:436` — predicate text byte-identical to the two removed
inline copies, so both are behavior-preserving refactors) and newly applied to the worker's open-shifts
listing (`Services/Workforce/WorkforceShiftExchangeService.cs:78`), which is the fix: without it the
second publication of a week lists every open shift once per revision and re-offers an awarded shift
with `alreadyRequested=false`.

Predicate exactness verified against the publish path rather than assumed: a publication's successor
always belongs to a *different* revision — the supersedes query excludes the revision being published
(`Services/Workforce/WorkforceSchedulePublishService.cs:242`,
`p.ScheduleRevisionId != revision.ScheduleRevisionId`) and is range-keyed, so "own publication has a
successor" always means the authoritative head left this revision, never that the same revision was
re-published over itself, and different-range publications never supersede each other. The fail-safe
(a Published row with no publication is kept, never silently skipped) is preserved in the shared
predicate.

Constraints: **C1** clean — read-side only; the change exists precisely to avoid retiring Published
rows on supersede (which would rewrite an immutable publication). **C4** n/a — no write at all.
**C7** clean — no logging added.

One new test (`WebApi.Tests/Workforce/WorkforceShiftExchangeTests.cs:79`,
`Republishing_a_week_neither_duplicates_an_open_shift_nor_re_offers_an_awarded_one`) walks the full
publish → request → award → republish journey and pins both symptoms under both revisions' identities.

---

## Summary

| Commit | Ruling | Exact change required |
| --- | --- | --- |
| `d8c98c200` company-account return | **land-as-is** | none |
| `f3817eed9` Tripletex claim window | **land-as-is** | none (O1/O2 recorded above, non-blocking) |
| `ea66353f9` open-shifts lineage | **land-as-is** | none |
| `2ba9229fa` evidence record | excluded from ruling — evidence-only, not a patch | — |

No commit trips C1, C4 or C7. No commit touches `Migrations/`, `ApplicationDbContext.cs` or
`Entities/`, so C2 is untouched by construction. Each commit does what its message says and stays
inside its stated scope. The tree is fit to merge to `feature/restaurant-modules` as it stands; the
refused fourth patch (EF trigger declarations) remains its own lane's problem and nothing here
pre-empts it.
