# L-BLOCKER-STALE-RERULE — the stale verdicts re-derived at `8e2b57de`

Read-only. Nothing outside this directory and this lane's RETURN was written. No branch checked out, no
container started, no flag cleared, no correction applied, nothing repaired.

Every backend fact below is resolved **by object** against `8e2b57de` (`git show "${T}:path"`), never by
reading the checked-out working tree — which is `lane/meals-grace-pins`, **63 commits behind the tip**.
That precaution earned its keep twice; see *Instrument* below.

---

## World, re-measured

| thing | value |
|---|---|
| backend tip `feature/restaurant-modules` | **`8e2b57de`, 2026-08-04 12:00:29** — has **not** moved since the recheck |
| backend declared ref of the document | `3579bbbc`, 2026-08-02 10:44 — **59 commits** behind the tip |
| frontend tip / HEAD | `e34977ac`, 2026-08-04 15:55 |
| frontend declared ref | `31fc45d`, 2026-08-03 14:19 — 13 commits behind |
| backend checkout the shell has out | `lane/meals-grace-pins`, 63 behind |

## Instrument, validated on a known-positive before any negative was recorded

The recheck's zsh history-modifier trap reproduces exactly in this shell (zsh 5.9):

```
T=8e2b57de
echo "$T:WebApi.Tests/Wire/RequestBodyTelemetryPinTests.cs"    ->  8e2b57deryPinTests.cs      (mangled)
echo "${T}:WebApi.Tests/Wire/RequestBodyTelemetryPinTests.cs"  ->  8e2b57de:WebApi.Tests/...  (correct)
```

- **Known-positive** — `${T}:WebApi.Tests/Wire/RequestBodyTelemetryPinTests.cs` = 16634 bytes, **396 lines**,
  matching the recheck's figure to the line. The instrument sees what is there.
- **Known-negative** — a fabricated path under the same directory returns `fatal: ... does not exist`. The
  instrument separates the two.
- Every path in this document was resolved with the braced form or a literal ref.

**The working-tree trap fired twice and was caught both times, by the same signature.** Git's own wording
distinguishes them, and it is the only reliable tell:

```
Helpers/ApplicationInsightsLoggingMiddleware.cs   -> "exists on disk, but not in '8e2b57de'"
test/e2e/scripts/fixture-divergence.js            -> "exists on disk, but not in '31fc45d'"
```

Both files are **present in the working tree and absent at the ref**. A check that read the checkout would
have scored F-AI-REQUEST-BODY *not fixed* and F-FIXTURE-BEHIND-BACKEND *already fixed at its own ref* — one
false negative and one false positive, from the same instrument defect, in opposite directions.

---

## The count, and a correction to the recheck's own arithmetic

The recheck's STALE section contains **14 named verdicts**: a 13-row table plus `F-FIXTURE-BEHIND-BACKEND`
documented in full above it. Its prose says *"F-FIXTURE-BEHIND-BACKEND is the thirteenth … the other twelve
are backend"*, which reads as an off-by-one against its own table.

**It is not an error, and the resolution is worth recording.** One of the 13 table rows —
`F-UTLKVIT-SALE-ROW` — is drawn from the **six already-fixed** verdicts, not from the 41 sustained
(`verdicts.md:488`: `| F-UTLKVIT-SALE-ROW | already-fixed pending merge | …`). Counted against the
sustained set: **12 backend + F-FIXTURE-BEHIND-BACKEND = 13**, and the tally of 13 is right. Measured
against the document as a whole there are **14** stale verdicts.

All **14** are re-derived below. The extra one is marked.

```
47 verdicts   =   14 still-true  +  27 partly-true  +  6 already-fixed   (counted from verdicts.md)
41 sustained  =   14 + 27
13 stale within the sustained 41   +   1 stale drawn from the already-fixed 6   =   14 re-derived here
```

---

## Result — the split

| outcome | count |
|---|---|
| **overtaken** — the condition is met at the tip | **11** |
| **split** — part overtaken, part still true | **2** |
| **met on the mechanism, unproven in fact** | **1** |
| **still true in full** | **0** |
| **needs a person** | **2** (F-AZURE-FUNCKEY rotation; F-FIXTURE-BEHIND-BACKEND acceptance) |

**Not one of the fourteen is still true in full, and two are not clear either.** The valuable output is the
two that are not clean, not the eleven that are.

**And none of the fourteen can be cleared with the tool as it stands.** Checked directly: **0 of 14** flag
bodies name a `fact:` key anywhere in the body. `plan flag clear` refuses a condition it cannot test, so
every one of these needs either a `fact:` key added or a recorded human ruling. The brief said the clearing
is somebody else's step; it is also, today, **nobody's available step**.

---

## The fourteen, re-derived

Each row names the **build commit** that did the work and the **first-parent landing commit** that put it on
`feature/restaurant-modules`. Landing commits were found by walking `git rev-list --first-parent --reverse`
from the tip and taking the earliest commit containing the build — not by reading merge messages.

### 1. F-INVOICE-ROUTES-ANONYMOUS — **overtaken**

`clears_when`: *every route on the invoices controller either requires an authenticated caller or is recorded
here as deliberately public with the reason.*

At `8e2b57de:Controllers/InvoicesController.cs`:
- `:16 [Authorize]` **class-level**, above `[ApiController]`, with a comment naming the exact reasoning the
  flag asked for ("so an action added later is authorized by omission rather than anonymous by omission").
- **12 `[Http*]` attributes, 12 `[Authorize*]` attributes**, and `AllowAnonymous` returns **zero** hits in
  the file. The five anonymous-by-omission actions the document named at `:34 :51 :68 :117 :204/:205` are
  gone; every one now carries `[Authorize(Roles = ClaimConstants.PowerUserRole)]` or `[Authorize]`.
- Pin present: `WebApi.Tests/Wire/InvoicesAuthorizationWireTests.cs`, 241 lines, **derived from the routed
  endpoint table rather than from source text** — `:87 Assert.Equal(12, invoiceEndpoints.Count)`,
  `:95 Assert.Empty(unauthenticated)`, `:99 Assert.Empty(… GetMetadata<IAllowAnonymous>() != null)`, and
  `:239 Assert.Empty(invoiceRoutes)` against the estate-wide anonymous-by-omission census.

**Overtaken by** `d7ffdae9` 2026-08-03 22:40 *"The five invoice routes that create and mail money take a
caller"*, landed by `21510917` 2026-08-04 02:40 *L-INVOICE-AUTHORIZE-LAND*.

### 2. F-INVOICE-RETRY-ANONYMOUS — **overtaken** (and still a duplicate)

`clears_when`: *the bulk invoice retry route requires authorisation, pinned by a test that reds if the
attribute is removed.*

- `8e2b57de:Controllers/InvoicesController.cs:132 [Authorize(Roles = ClaimConstants.PowerUserRole)]`
  immediately above `:133 [HttpPost("RetrySendingExistingInvoices")]`. The bare attribute the document read
  at `3579bbbc:117` is gone.
- Pinned by name, not merely by sweep: `InvoicesAuthorizationWireTests.cs:51`
  `{ "POST", "/Invoices/RetrySendingExistingInvoices" }` in `ClosedRoutes`, exercised by four theories —
  challenge (`:138` `401` + `WWW-Authenticate: Bearer`), role refusal (`:156` `403`), role acceptance
  (`:173`), and the empty-body checks that stop a refusal leaking a payload.

**Overtaken by the same commit and the same merge as #1.** The document's recommendation to close this as a
duplicate of F-INVOICE-ROUTES-ANONYMOUS is unaffected — one commit answered both, which is itself the
evidence that they are one problem.

### 3. F-GR-DISPATCH-UNATTRIBUTED — **overtaken**

`clears_when`: *the dispatch call resolves and records the actor that triggered it.* Both verbs, separately:

- **resolves** — `Services/Growth/GrowthDispatchService.cs:122`
  `DispatchAsync(int storeId, long newsletterId, string userId, CancellationToken …)`; the controller passes
  a real one at `Controllers/GrowthNewslettersController.cs:194`
  `_dispatch.DispatchAsync(storeId, newsletterId, RequireUserId(), …)`; and it is **enforced**, not merely
  accepted — `GrowthActorGuard.RequireAttributed(userId)` at `:142`.
- **records** — `GrowthAuditEventTypes.cs:31 "growth.newsletter.dispatch_requested"`, written through
  `_audit.Append(DispatchRequested(...))` at three sites (`:211 :269 :322`, covering the idempotent-return,
  created and raced paths) with `ActorKind = Admin` and **`ActorReference = userId`**.
- Pinned by `WebApi.Tests/Wire/GrowthDispatchActorWireTests.cs` and `WebApi.Tests/Growth/GrowthDispatchServiceTests.cs`.

**Overtaken by** `a1e2655f` 2026-08-03 19:28 *"A mass send names the person who caused it"*, landed by
`029e2869` 2026-08-04 01:50.

**Nuance the document was right about and that survives.** `Entities/Growth/GrowthDispatchRun.cs` still
carries **no actor column** at the tip. The attribution lives in the audit ledger, not on the run row. The
condition as written says *records*, and the ledger records it — but a reader expecting a column will not
find one. Under **C4** the write does name its actor, so this is a documentation point, not a violation.

### 4. F-GR-UNCONFIRMED-EMAIL — **overtaken**

`clears_when`: *the test-send binding requires a confirmed profile email, and a pin proves an unconfirmed one
is refused.* Both halves:

- `Services/Growth/GrowthNewsletterService.cs:558 RequireOwnAccountAddressAsync`, called at `:272`;
  `:566` selects `{ u.Email, u.EmailConfirmed }` and `:570` refuses on `|| !account.EmailConfirmed`.
  Controller passes `RequireUserId()` (`GrowthNewslettersController.cs:150`) — at `3579bbbc` it passed no
  user id at all.
- The pin proves the exact case and not a neighbouring one:
  `WebApi.Tests/Growth/GrowthTestSendBindingTests.cs:99`
  `An_address_the_account_holds_but_has_never_confirmed_is_not_a_provable_own_address` — sets
  `account.EmailConfirmed = false` (`:110`), asserts `403 growth.test_address_not_own` and
  `Assert.Empty(provider.Submissions)` (`:116-119`), then flips the same account to `true` (`:126`) and
  asserts the send is accepted and reaches that address (`:130-132`). Same account, one field changed.

**Overtaken by** `5719fc96` 2026-08-01 21:15, landed by `35696d6b` 2026-08-04 01:20 *"Merge the
composition-root family"*.

**The merge-order hazard did not fire, and the reason is checkable.** The document warned that landing
`lane/growth-audit-ledger` before `integration/confirm-family` would make this flag true at the tip for the
first time. At the tip the confirmation check (`:570`) and the address binding (`:558`) are in the **same
method**, so no ordering could have separated them.

### 5. F-CONFIRM-BRUTEFORCE — **overtaken, 3 of 3**

`clears_when`: *confirming an email is rate-limited and attempt-counted, and the code is drawn from a
cryptographic source.*

- **rate-limited, on the guess entry point** — `Controllers/UserController.cs:48`
  `if (!_emailConfirmationRateLimiter.TryConsumeConfirm(HttpContext, User.Identity.Name, out var retryAfter, out var refusal))`.
  This is the *confirm* path, not the *send* path — the distinction the flag turned on.
- **attempt-counted** — `Services/EmailConfirmationRateLimiter.cs:124 ConfirmPerAccountLimit = 10`, consumed
  at `:178` against the key `"email:guess:user:" + RateLimitKeys.Actor(userId)`.
- **cryptographic source** — `Helpers/NumericConfirmationCode.cs:33 RandomNumberGenerator.GetInt32(Min, MaxExclusive)`.
  The old source is not merely shadowed: `git grep 'new Random()' "${T}" -- Services/UserService.cs` returns
  **zero**, so `3579bbbc:UserService.cs:116` is gone rather than bypassed.

**Overtaken by** `c96cd21e` 2026-08-02 11:29, landed by `35696d6b` 2026-08-04 01:20.

### 6. F-MEMCACHE-IN-TRYCATCH — **overtaken**

`clears_when`: *the memory cache is registered unconditionally, and a test reds if it moves back inside a
conditional path.*

- `Program.cs:1034 services.AddMemoryCache()`, unconditional, beside the limiter that needs it, with a
  ten-line comment at `:1029-1033` naming the original try/catch and the failure it caused.
- The old registration at `Helpers/ServiceCollectionExtensions.cs:58` **is still there**, inside
  `AddMcpAuthentication`. That is deliberate and harmless — `AddMemoryCache` is idempotent, and the comment
  says so — but a future reader grepping for `AddMemoryCache` will find two hits and must not conclude the
  defect survived.
- The pin is a real mutation test, not a source scan:
  `WebApi.Tests/Wire/CompositionRootLimiterWireTests.cs:117 Every_reachable_limiter_still_resolves_after_the_failure`
  builds the world **after** a deliberate `ValidateOpenIddictCertificates` failure and asserts
  `:122 Assert.NotNull(services.GetService<IMemoryCache>())`. Its companion at `:244` asserts the inverse in
  the pre-fix ordering (`:258 Assert.DoesNotContain(… typeof(IMemoryCache))`), so the pair reds in the
  direction the clause names.

**Overtaken by** `c96cd21e` 2026-08-02 11:29, landed by `35696d6b` 2026-08-04 01:20.

### 7. F-AI-REQUEST-BODY — **overtaken**

`clears_when`: *the request-body capture is removed, bounded to non-sensitive routes, or the middleware is
deleted, proven by a test that fails if it is wired back as it stands.*

- `Helpers/ApplicationInsightsLoggingMiddleware.cs` is **absent at `8e2b57de`** (git: *"exists on disk, but
  not in '8e2b57de'"* — the working-tree trap, caught).
- Estate-wide at the tip, the identifier survives in exactly **two** files, neither of them production:
  `WebApi.Tests/Wire/RequestBodyTelemetryPinTests.cs` and `artifacts/security/L-VIPPS-LOG-mutation.md`.
  No `Program.cs` registration remains.
- The pin is present and is the assembly-derived kind the clause asks for — 396 lines,
  `:61 No_middleware_or_telemetry_participant_in_the_assembly_attaches_a_request_body`, ending in
  `:225 Assert.Fail(...)` rather than a silent skip. It reds on a **dormant** reimplementation, which is the
  property that makes deletion durable.

**Overtaken by** `5b2e99c8` 2026-08-03 11:46, landed by `35696d6b` 2026-08-04 01:20.

Relevant to **C7**: the deletion removes a telemetry sink that carried whole request payloads. Nothing at the
tip re-adds one.

### 8. F-WF-PUSH-SILENT — **SPLIT: the code condition is met; the document residue is still true**

`clears_when`: *a send to a tag with no registration is recorded as failed, pinned by a test that fails if the
outcome is discarded again.*

**Met, and the named case is now the one that is handled.** `Services/NotificationService.cs:124`
`HasConsumerPushRegistrationAsync` asks the hub `GetRegistrationsByTagAsync(ConsumerTag(userId), 1, ct)` and
returns whether **any** device answers. It is **called** at
`Services/Workforce/WorkforcePushNotificationDelivery.cs:98`, and the miss returns
`:105 WorkforceNotificationDeliveryResult.Fail("NoPushRegistration")` — *before* the send, with a comment
stating the exact fact the flag rested on ("Notification Hubs accepts a notification whose tag matches
nothing").

The pin discriminates the right two cases, which was the document's specific complaint:
`WebApi.Tests/Workforce/WorkforceNotificationTransportTests.cs:210`
`[InlineData(false, …Failed, "NoPushRegistration", 1, 0, …Pending)]` and `:281 Assert.Equal("NoPushRegistration", failure.LastError)`.
The old sole outcome — `"PushNotConfigured"`, an absent *credential* — still exists at `:78`/`Withhold`, and
correctly does **not** count an attempt. Absent-registration and absent-credential are now distinct outcomes.

**Overtaken by** `991c21f6` 2026-08-04 02:41 *"Workforce: a push that reached no device stops counting as
delivered"*, landed by `569887a5` 2026-08-04 03:01 *L-WF-PUSH-LAND*.

**Still true, and no commit could have overtaken it.** The document also recorded that `cleared_by` was
repointed to `L-WF-PUSH-SILENT` while the ruling line was left as another flag's. That is unchanged:
`docs/plan/plan.md:14506` still reads **`resolve-and-record-the-actor`** — L-GR-DISPATCH-ACTOR's ruling,
answering *actor*, on a flag about *outcome*. This is a defect in the plan document, not in the backend, so
59 backend commits were never going to touch it. **The half-applied repoint needs a person.**

### 9. F-POS-TENDER-WIRE-REINTRODUCES-TWO — **overtaken, by merge order rather than by a fix**

`clears_when`: *the POS tender-wire lane classifies a credit sale off the appended journal entry and reads the
one shared predicate, **or** it is rebased onto the lanes that closed those defects.*

The first arm is met **at the tip**, and the mechanism is worth stating precisely because the flag predicted
the opposite:

- `8e2b57de:Services/Kassa/FinalizeService.cs:237` reads
  `var deliveryEntry = KassaCreditSale.IsCreditSale(entry) ? … : null` — the **shared predicate**, applied to
  `entry`, the `JournalEntry` whose `PaymentLines` were populated immediately above at `:220-229` and which is
  about to be appended. Off the journal, not off the request. `:304` does the same for the replay path.
- The lane's own text — `var isCreditSale = payments != null && payments.Any(p => p.PaymentType.IsCompanyAccount());` —
  is **absent from the tip**. It still sits on the branch head `lane/meals-pos-tender-wire` @ `32fd5a86:237`,
  which is why reading the lane branch would report the defect live.

**Why it did not fire.** The utlkvit consolidation landed **first**: `a273e013` at 2026-08-03 23:50, and the
tender-wire lane merged at `21f79514` on 2026-08-04 01:08 — **78 minutes later**, onto a branch that already
carried `KassaCreditSale`. Verified directly: `git merge-base --is-ancestor a273e013 21f79514` is true, and
`21f79514:FinalizeService.cs:237` already reads the shared predicate. The merge resolved in favour of the
consolidation.

**This is the second merge-order hazard in the set that was flagged and did not fire** (F-GR-UNCONFIRMED-EMAIL
is the other). Both were real hazards; both were avoided by the order work actually landed in. Neither
avoidance is recorded anywhere.

### 10. F-UTLKVIT-PREDICATE-COLLISION — **overtaken, and now exactly what the ruling asked for**

`clears_when`: *one credit-sale predicate exists in the tree and all six call sites read it.*
Ruled `one-predicate-six-call-sites`.

Counted at `8e2b57de`, estate-wide:

```
definitions:  git grep -E 'bool +IsCreditSale' 8e2b57de   ->  1
              Services/Kassa/KassaCreditSale.cs:25  public static bool IsCreditSale(JournalEntry entry)

call sites:   Services/Kassa/FinalizeService.cs:237
              Services/Kassa/FinalizeService.cs:304
              Services/Kassa/PosReceiptService.cs:131
              Services/Kassa/PosReceiptService.cs:386
              Services/Kassa/SaftCashRegisterExportService.MasterData.cs:112
              Services/Kassa/SaftCashRegisterExportService.Transactions.cs:251   ->  6
```

**One predicate, six call sites — the literal ruling, exactly.** The original private predicate at
`3579bbbc:SaftCashRegisterExportService.MasterData.cs:195` is gone (that line is now `IsTraining`). The rival
internal static on `lane/utlkvit-sale-row:PosReceiptService.cs:149` is gone with the merge.

**Overtaken by** `3a509b68` 2026-08-02 17:22, landed by `a273e013` 2026-08-03 23:50 *"Merge the utlkvit
family: one credit-sale predicate, and a credit sale hands over the delivery receipt"*.

**This is the verdict whose complaint was precisely about checkability** — *"true of the composing lane's
worktree and of no branch a reader can check out."* It is now true of `feature/restaurant-modules`. The
complaint is answered in its own terms.

### 11. F-UTLKVIT-SALE-ROW — **overtaken** *(the row drawn from the six already-fixed, not from the 41)*

`clears_when`: *the print, view and public paths addressed at a credit sale's own id produce the delivery
receipt, and the copy guard refuses the credit-sale sale row.* Ruled `already-fixed-pending-merge` — and the
merge has now happened.

- `Enums/Kassa/KassaEventType.cs:18 UTLEVREC` is live at the tip. `git grep UTLEVREC 3579bbbc` was empty.
- Routing, inside the **shared builder** all three surfaces call:
  `Services/Kassa/PosReceiptService.cs:131 if (KassaCreditSale.IsCreditSale(entry)) return await BuildDeliveryDocumentForSaleAsync(entry);`
- Copy guard: `:386 if (KassaCreditSale.IsCreditSale(original)) throw new AppException(ErrorMessages.ReceiptCopyNotAllowed);`
  with the reasoning recorded in place (a KOPI-marked copy would be "eit tilsynelatande kjøpsbevis for eit
  ubetalt sal").

**Overtaken by** `1854f594` 2026-08-02 17:44, landed by `a273e013` 2026-08-03 23:50.

### 12. F-EV-ACCEPT-UNGATED — **overtaken, with the weaker of two patterns landed**

`clears_when`: *the public proposal accept and decline writes refuse for a store without the Events core flag,
pinned by a test that reds if the gate is removed.*

- **Both** writes, both before the status switch: `Services/Events/EventsProposalService.cs:405` inside
  `AcceptAsync` (`:388`) and `:475` inside `DeclineAsync` (`:462`), each calling `GuardStoreEnabledAsync`.
- The guard refuses with `EventsProblemException.ProposalNotFound()` — the *same* uniform code an unknown
  token returns, deliberately not `EVENTS_DISABLED`, so an anonymous caller cannot distinguish "no such
  proposal" from "real proposal at a store that has not opted in". That is a stronger property than the
  clause asked for.
- DI registered: `Program.cs:1094 services.AddSingleton<IEventsModuleGate, EventsModuleGate>()`.
- Pins: `WebApi.Tests/Events/EventsPublicProposalWriteGateTests.cs` and
  `WebApi.Tests/Wire/EventsProposalGateWiringTests.cs:51 Assert.Same(scope.ServiceProvider.GetRequiredService<IEventsModuleGate>(), injected)`
  plus `:65` asserting the ctor takes the parameter.

**Overtaken by** `8eee00f7` 2026-08-03 12:19, landed by `5c3a9be1` 2026-08-04 00:55.

**The residue the recheck named is confirmed and is a C3-shaped weakness, not a blocker.** The ctor param is
optional — `:39 IEventsModuleGate gate = null` — and the guard is written `:64 if (_gate != null && !await …)`.
It fails **closed** today only because `Program.cs:1094` registers the gate. Delete that one registration and
the guard passes silently instead of throwing. The collision the document predicted (two lanes, one
interface, two patterns) did not happen — only `lane/ev-accept-gate` landed — but **the weaker pattern is the
one that landed**, and `EventsProposalGateWiringTests.cs:51` is the only thing standing between it and a
silent fail-open.

### 13. F-AZURE-FUNCKEY — **SPLIT: consolidation overtaken, the core clause still true, and it needs a person**

`clears_when`: *the key is rotated and the new value lives in user-secrets or environment config, **never in a
committed file**.*

**Overtaken (arithmetic only).** The key is committed in **one** file at the tip, not two:

```
git grep -l 'til3r2g9aZpBFpNFcNCpsVzSYQ' 8e2b57de   ->  Services/OkamFunctionsDocumentRenderer.cs   (1 file)
                    at 3579bbbc it was              ->  Services/InvoiceService.cs:1250
                                                        Services/ReceiptService.cs:144              (2 files)
```

**Overtaken by** `a7b90cbd` 2026-08-01 19:59, landed by `5df07afa` 2026-08-04 02:14 *L-PDF-FAMILY-LAND*.
"Rotation is a two-site change" has expired; the body's claim that the finding lane consolidated it to one
place is now true of a branch a reader can check out.

**Still true, in full.** `Services/OkamFunctionsDocumentRenderer.cs:28` is
`private const string FunctionKey = "til3r2g9aZpBFpNFcNCpsV…"` — a **live key, in a committed file, at the
tip**. `clears_when`'s "never in a committed file" remains measurably false, and the merge that fixed the
arithmetic did nothing to the exposure. **Rotation is the owner's act and cannot be measured from the
repository.** This is the one flag in the set whose blocking is entirely justified at the tip.

### 14. F-FIXTURE-BEHIND-BACKEND — **the mechanism is met; nothing records that it has ever run**

Frontend, so re-derived at `31fc45d` (its own ref) and `e34977ac` (the tip).

`clears_when`: *a check reds when the fixture's refusal shapes diverge from the backend's, rather than a lane
noticing by hand.*

**True at its own ref, confirming the recheck's re-ruling from false to stale.**
`test/e2e/scripts/fixture-divergence.js` is **not tracked at `31fc45d`** (git: *"exists on disk, but not in
'31fc45d'"*), and `31fc45d:package.json` declares **exactly six** e2e scripts (`:14-19`), none a parity run.

**Met at the tip, and met in the strong form.** `e34977ac:test/e2e/scripts/fixture-divergence.js` is tracked,
451 lines, with `test/e2e/scripts/refusal-shapes.js` (36445 bytes) holding the derivation. `package.json`
now declares nine e2e scripts, two of them this check (`:20`, `:21 --prove`). The design answers the clause's
own objection rather than routing around it:

- **Both sides are derived live from source** — `deriveFixture`, `deriveBackend`, `compare` — with the
  backend read out of `OKAM_API_REPO`, and the script **dies** if it is unset (`:417-426`).
- It **refuses a committed snapshot by construction**, and says why: *"A snapshot … would go green the moment
  the backend moved and nobody regenerated it — which is the failure this check exists to end, moved one file
  across."* That is the hand-copy shape the clause rejects, rejected by the check itself.
- A guard that cannot fail is caught by a **six-arm `--prove` harness** (`level`, `removed`, `restatused`,
  `invented`, `benign-fixture`, `benign-backend`) run against stand-in trees in a temp directory, so it needs
  no checkout and no network — two arms assert GREEN, so it is protected against failing on everything.

**Overtaken by** `a62160e` 2026-08-03 18:16 *"The fixture can no longer fall a release behind the API it
stands in for"* — 21 minutes after the verdicts document's own mtime.

**Why this is not recorded as met.** Under **C5**, acceptance is a person completing the journey. Measured:

- The check is wired into **no automatic gate**. It appears in `package.json` only; the two workflows at the
  tip (`.github/workflows/claude.yml`, `nuxtjs.yml`) do not invoke it. It is an npm script an operator must
  remember to run with an env var — arguably still "a lane noticing by hand", one indirection out.
- **No receipt anywhere records a run.** `fixture-divergence` appears in exactly two tracked non-source files
  at the tip (`lanes/L-ARTIFACT-RANK-KEY/evidence.md`, `lanes/L-JOURNEY-MARGIN/NOTES.md`), neither a run.

**The mechanism is built and self-proving; the fact that it passes is unrecorded. This one needs a person to
run it and file the receipt** — not a builder.

**One clause of the verdict is itself now stale and should not be re-cited.** It named
`test/growth-send-gate.test.js:36-38` as "an explicit hand-copy … the very shape the clause rejects". At
`e34977ac` those lines read differently: the wire bodies are *"copied VERBATIM from the backend's committed
golden fixtures at OkamAPI-modules `docs/api/fixtures/growth/`, asserted by GrowthNewsletterContractFixtureTests,
so a contract drift fails there."* Both ends verified at the backend tip — five fixtures under
`8e2b57de:docs/api/fixtures/growth/` and `8e2b57de:WebApi.Tests/Growth/GrowthNewsletterContractFixtureTests.cs`
present. It is now a checked cross-repo tie, not a hand-copy.

---

## What the met conditions were gating

Every one of the fourteen sits on a `needs:` line. None gates only the count.

| entity | plan.md | ids | of the fourteen | now met |
|---|---|---|---|---|
| **Stage S-PILOT-SAFE** — *the first pilot invitation forecloses nothing* | `:671` | 19 | F-AZURE-FUNCKEY, F-AI-REQUEST-BODY, F-INVOICE-RETRY-ANONYMOUS, F-MEMCACHE-IN-TRYCATCH, F-INVOICE-ROUTES-ANONYMOUS, F-UTLKVIT-PREDICATE-COLLISION (**6**) | **5 of 6** |
| **Feature FT-GROWTH** — *only a guest who consented is contacted* | `:574` | 24 | F-POS-TENDER-WIRE-REINTRODUCES-TWO, F-GR-UNCONFIRMED-EMAIL, F-CONFIRM-BRUTEFORCE, F-GR-DISPATCH-UNATTRIBUTED (**4**) | **4 of 4** |
| **Stage S-EVIDENCE** — *a capability can be shown to a stranger* | `:668` | 9 | F-FIXTURE-BEHIND-BACKEND (**1**) | mechanism only |
| **Feature FT-EVENTS** | `:290` | 9 | F-EV-ACCEPT-UNGATED (**1**) | **met** |
| **Feature FT-WORKFORCE** | `:74` | 11 | F-WF-PUSH-SILENT (**1**) | code met, doc open |
| **Feature FT-MEALS** | `:363` | 10 | F-UTLKVIT-SALE-ROW (**1**) | **met** |

All four Features read `state: built-unverified`.

**S-PILOT-SAFE is the concentration, and it is one flag from a different answer.** Six of the nineteen ids on
the pilot-safety gate are in this set, and five are now met at the tip. The sixth is **F-AZURE-FUNCKEY**,
whose remaining clause is a **live committed credential** — the one thing on that line that genuinely should
stop a pilot invitation, and the one thing no merge can close. The gate is doing exactly what it is for; it
has just been carrying five expired ids alongside the real one.

**FT-GROWTH is the clean sweep, and it exposes the borrowed-blocker pattern.** All four of its ids in this set
are met. But the line carries **24** ids, and **13 of the 24 are not Growth's work at all** — Training,
Kassa/journal, Events, Margin, Meals (×3), Workforce, POS tender, plus five process flags
(`F-PLAN-NOT-IN-GIT`, `F-INTEGRATION-BRANCHES-UNCOMPOSED`, `F-EXIT-PREFIX-IS-A-STAMP`,
`F-BACKEND-FACTS-OFF-BRANCH`, `F-ROLLBACK-LEAVES-TRACKED-STATE`). **F-POS-TENDER-WIRE-REINTRODUCES-TWO is one
of those thirteen** — a POS credit-sale predicate flag holding a Growth consent feature. Clearing it moves
FT-GROWTH not at all, because twelve other foreign ids remain. **A met condition here releases nothing on its
own**, which is the census finding reproduced from the opposite direction: the value of clearing these is in
the S-PILOT-SAFE column, not the FT-GROWTH one.

---

## Two things found while re-deriving that are not in the recheck

### The C6 exposure is confirmed independently, and one of these fourteen created it

Re-derived from scratch, not taken from the recheck's report. At `8e2b57de`:

- `docs/okam-kassa/compliance/RF-1313-systembeskrivelse.md:155` asserts
  *"Spesifikasjonen av kredittsal i § 2-8-2 andre ledd høyrer til X/Z-rapporten og **er skildra der**."*
- `git grep 'CreditSalesCount\|CreditSalesAmount' 8e2b57de` returns **one hit, in `docs/plans/pos-open-decisions.md:33`
  — no code at all.** The X/Z report cannot produce the § 2-8-2 second-paragraph specification the document
  says it produces.
- `lane/meals-xz-credit` (`25586d86`, 2026-08-01 16:00), which carries the fields, is **not an ancestor of the
  tip**.

**This is C6 verbatim, and #11 in this list is what caused it.** The systembeskrivelse sentence arrived with
`a273e013` — the utlkvit family merge that overtook F-UTLKVIT-SALE-ROW and F-UTLKVIT-PREDICATE-COLLISION. A
landing that closed two blockers opened a statutory-claim exposure in the same commit. It is a reason to read
this list rather than clear it.

### A second, smaller drift in the same file, from the same landing

`RF-1313-systembeskrivelse.md:153` says *"`FinalizeService` klassifiserer på **betalingsmiddelet**"* — on the
payment means. At the tip `FinalizeService` classifies via `KassaCreditSale.IsCreditSale(entry)`, and the
predicate body (`KassaCreditSale.cs:25-32`) reads
`entry.PaymentLines.Any(p => p.PaymentType.IsCompanyAccount())` **off the journal entry**, additionally
excluding `RETREC`. The sentence is substantively right about *what* is examined and wrong about *where it is
read from* — and "read off the journal, not the request" was the entire point of `3a509b68`. Minor, and worth
a line when someone next touches that document. `PosReceiptService.GetMarkingText` in the same sentence does
check out (`:252`, `:514`).

---

## What this lane did not do

- **Cleared nothing, ruled nothing, repaired nothing.** Where a condition is met, this document says so; the
  clearing is the clerk's act on a `fact:` key, and **none of the fourteen has one**, so `plan flag clear`
  would refuse all fourteen today regardless of the finding.
- **No suite was run, no container started, no branch checked out**, and the two mutation-proof harnesses
  named above (`--prove` and the composition-root pair) were **read, not executed**. Their existence and shape
  are measured; their passing is not.
- **F-FIXTURE-BEHIND-BACKEND's check was not run.** Doing so needs `OKAM_API_REPO` pointed at a backend
  checkout and would be a measurement, which is outside a read-only re-derivation.
- Backend tip is `8e2b57de` (2026-08-04 12:00) and had **not** moved when this was measured. Frontend tip is
  `e34977ac`. Six lanes were running; nothing was switched.
