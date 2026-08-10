# L-READ-THE-UNREVIEWED-BACKEND — the twenty-nine backend commits nobody with fresh eyes had read

Reader: `agent:L-READ-THE-UNREVIEWED-BACKEND` (wrote none of this, merged none of this).
Repo: `/Users/svendaneel/okam/OkamAPI-modules`.
**Pinned to `a1c1a6dff9a13fd05ed8ccff50127543924e531a`** — every command used the SHA, never the branch
name. Range read: `118f92fb9..a1c1a6dff`, measured at exactly **29 commits** (`git rev-list --count`),
tip confirmed equal to `feature/restaurant-modules` at reading time. Read-only throughout: no commit,
merge, rebase, branch move, push, suite, or container. Method follows the prior reading
(`L-READ-THE-BACKEND-TRUNK-AS-LANDED.md`): every merge recomputed with `git merge-tree --write-tree`,
every content commit's full diff read against its message, security commits verified down to the
enclosing scope of every registration.

## Headline verdict

**CLEAN. No content lost. No commit whose contents contradict its message. All four security-shaped
changes genuinely close what they claim** — with two caveats on the token-lifetime fix that its own
commit message already names (§5). **Both landing-claims verified**: the +73 accounting reconciles
exactly and independently (§8); the single SQL red's pre-existence is established by reproducible
means even though the specific claimed baseline run is not archived (§9). **No test that cannot fail
was found** (§10). Observations, none blocking, in §12.

## 1. The merge picture

The 29 commits contain **12 merge commits**. Every one was recomputed:
`git merge-tree --write-tree <p1> <p2>` exits **0 (no conflict)** and produces a tree
**bit-identical** to the committed tree, for all twelve — `dd2ef7eae`, `a6445ee0c`, `765e8d757`,
`da64e1883`, `864552bd3`, `3e370e6cc`, `ef70915f4`, `5f27b0b10`, `f17248717`, `b5f393519`,
`a29f9f576`, `a1c1a6dff`. **Zero hand resolution anywhere in the range; nothing to lose content in.**

Three lane commits were authored on the OLD base `8e2b57de8` (48 commits back: `9990b4bb7`,
`4d103ca8a`, `86142430c`) and one on `726906fe5` (`13e8a6213`). Semantic-merge risk checked, not
assumed: `git diff --name-only 8e2b57de8..118f92fb9` touches **none** of those lanes' files
(EscPos builders, ReceiptService, Events proposal files, WorkforcePosModels), so the clean
auto-merges are also file-disjoint against everything the trunk did in between. Two same-file,
same-base overlaps inside the range (`UserController.cs`, `UserService.cs` touched by both
`b17e0dd62` and `b170a9e45`) auto-merged in disjoint regions; both edits verified present and
coherent at the tip (`Services/UserService.cs:625` UtcNow+TokenLifetime, `:705` IsPowerUserAsync;
`Controllers/UserController.cs:199` token-then-projection order preserved).

## 2. Security 1/4 — the bearer-token middleware (`4fb9f1905`): **closes what it claims**

- **Registered first, verified at the TIP, not just in the commit**: `Program.cs` — the first
  statement after `builder.Build()` is `app.UseMiddleware<UnhandledExceptionProblemMiddleware>()`;
  everything else (logging wrapper, HTTPS redirect, `UseRouting` — called explicitly, so the
  framework does not auto-insert routing ahead of user middleware — CORS, rate limiter, MCP
  middlewares, auth, endpoints) is downstream. **No route can short-circuit earlier**: MapGet/"/",
  health checks and controllers all execute inside the pipeline, after it.
- **The typed body carries no request state**: exactly `type`/`title`/`status`/`detail`/`code`/
  `traceId` — constants plus `TraceIdentifier`. No path, no query, no headers, no exception text.
- **The two rethrow branches disclose nothing**: on `HasStarted` the framework's developer page also
  refuses to render into a started response; on client-abort OCE the connection is being torn down,
  so a rendered page reaches nobody (theoretical sliver named in §12/N5).
- **The wire proof is real** (`ErrorBodyHeaderEchoWireTests`, 2 facts): drives a seeded Vipps deposit
  failure through the real composition root **in Development** (the environment the page turns on
  in), reads headers off the request object (not a list), searches the whole body for every name and
  value, then asserts the failure is still typed (500, `INTERNAL_ERROR`, traceId) and that a domain
  refusal beside it keeps its own 404/`EVENTS_DISABLED` — so the middleware demonstrably neither
  leaks nor swallows. The claimed mutant (registration commented out) is exactly the defect.
- The found-on-the-way re-anchor is honest: `A_power_user_reaches_the_stripe_payout_action_body` now
  reads the quarantine exception from the log sink (`WireLogRecorder.MatchingFailure`, which walks
  inner exceptions) and pins that the response body carries none of it.

## 3. Security 2/4 — the login token lifetime (`b17e0dd62`, token half): **closes what it claims, with two honest caveats**

- **The clamp holds**: `Expires = DateTime.UtcNow.Add(TokenLifetime)`;
  `TokenLifetime = Math.Clamp(configured ?? 720h, 1, 2160h)` — a negative, zero or hundred-year
  configuration is clamped, not honoured. `appsettings.json` sets `TokenLifetimeHours: 720` (=30d,
  = the default).
- **Expiry is actually enforced**: `AddJWTAuthentication` sets `ValidateLifetime = true`
  (`Helpers/ServiceCollectionExtensions.cs`) — without which the whole fix would be decorative.
- **No second mint path**: `git grep SecurityTokenDescriptor|WriteToken|AddDays(36500)` at the tip →
  only `UserService.GenerateJwtTokenAsync`, whose single production caller is
  `UserController.Login:199`. Test-side `WireBearerTokens.MintFor` is test-only; the MCP/OpenIddict
  rail is a separate scheme with certificate-based signing, not this bearer.
- **Caveat 1 — the committed signing key (owner's `F-JWT-SIGNING-KEY-COMMITTED`, not this lane's):**
  the HMAC secret sits at `appsettings.json:12`, one line above the new lifetime lever. While that
  key is public, **a shorter lifetime buys nothing against forgery**: an attacker mints their own
  token with any `exp` and any role claims (including `PowerUserRole` — `OnTokenValidated` checks
  only that the user row exists, never the claims) with no login at all. What the 30 days DOES buy
  is a bound on *leaked legitimately-issued* tokens — precisely the class `4fb9f1905` just proved
  was leaking. The two fixes are coherent; neither substitutes for the rotation.
- **Caveat 2 — prospective only**: every ~100-year token already issued stays valid until the key
  rotates. The commit does not claim otherwise, and `Helpers/ActorClaims.cs` was updated to carry
  exactly this consequence instead of the stale "will never be re-minted" reasoning.

## 4. Security 3/4 — the SMS rate limiter (`b17e0dd62`, meter half): **the registration is genuinely unconditional**

- The old `services.AddSingleton<IOAuthSmsRateLimiter, …>` line is **removed** from
  `AddMcpAuthentication` (`Helpers/ServiceCollectionExtensions.cs`) and the tip carries **exactly
  one** registration: `Program.cs:1072`, inside `private static void AddServices(...)`
  (lines 535–1214), called from `Main` at line 192 — **outside** the MCP try/catch (lines 141–157)
  and inside no conditional. An MCP configuration failure can no longer take `/user/*` down.
- **Same limiter, same buckets, by construction**: one singleton, consumed by both
  `OAuthLoginController` and now `UserController.SendVerificationToken` — the guard runs **before**
  `GetOrCreateAsync` (before the unproven-number user row is written and the SMS paid), answers
  429 + `Retry-After`, and names neither the number nor the budget.
- **The canary moved correctly**: `CompositionRootLimiterWireTests` now pins
  `IClientIdMetadataDocumentService` as the did-AddMcpAuthentication-run witness AND asserts
  `IOAuthSmsRateLimiter` is **absent** from what that method registers — moving the registration
  back inside reds it.
- The five wire proofs (`LoginTokenAndSmsDoorWireTests`) are falsifiable: lifetime upper bound,
  exp−iat ≈ configured (the Oslo/UTC catch), login-still-completes (reachability, the fix's own
  regression risk), sixth-request 429 with positive `Retry-After`, refusal body names nothing.

## 5. Security 4/4 — the Meals refusal (`3c4cc6a4d` + evidence `760ab26b6`): **the withholding is proven on the body**

- `MealsRefusalIdentityWireTests` drives company → invitation → claim **over HTTP through the real
  composition root** and asserts on the raw bytes: 403 + `application/problem+json` +
  `meals.invitation-contact-mismatch` FIRST (so the instrument measures the contact guard, not an
  earlier refusal), then a whole-body search for the email, its local part, the phone as digits, and
  the payroll reference — reported by label, never by value.
- The production factory (`MealsProblemException.InvitationContactMismatch`) carries only
  `retryable:false` — no identity member exists to leak.
- **The mutation proof is at least as strong as the defect**: `mutated-tier.txt` shows the mutant
  reproducing the ORIGINAL leak shape — `"intendedContact":"intended@pilot.example.test"` inside the
  problem document's Extensions bag, the member no Vue renders — and the wire test reds naming all
  four limbs while its status/code asserts still pass, exactly as the message claims. The sibling
  `MealsInvitationIntendedContactTests` was simultaneously de-vacuized (any-403 → pinned code), and
  the green run (4753/0/10) plus mutated run (2 failed) are both archived in the commit.

## 6. Also in range — verdict by change

- **Tender labels** (`9990b4bb7` roll half, `bcc8bd179` both emitters): one table
  (`Services/PaymentTenderLabels.cs`) with an arm for all 17 `PaymentType` members in both registers;
  all three emitters verified routed through it at the tip (`EscPosReceiptBuilder:156`,
  `EscPosXZReportBuilder:104`, `ReceiptService:159`). The guard pair is mechanism-level: expected-set
  ≡ declared-members (reds when the enum grows) and no-member-reaches-the-residual (reds when an arm
  is dropped; covers Vipps, whose label equals its identifier). Tests reference **no API the fix
  added** (0 grep hits), so they genuinely run against an unfixed tree as their own negative control.
- **Margin end-of-business-day** (`e0ccd1036`): `ResolutionInstantOf = date.AddDays(1).AddTicks(-1)`
  (last tick, correct against half-open `EffectiveFrom <=`), applied to **all three legs** — links
  (`MarginStatementSupport:123`), versions AND component prices at the same instant
  (`ResolveVersionCostAsync`), with `ToInstant` no longer re-truncating to midnight. The
  zero-coverage week now reports `TheoreticalCostComplete=false` through MIG-11's existing channel.
  No migration, finalized statements untouched.
- **Power-user projection** (`b170a9e45`): the role membership is the single fact;
  `AutoMapperProfile` unbinds `IsPowerUser` so a forgotten projection reads false rather than a
  hand-set column; Login projects **after** `GenerateJwtTokenAsync` (where the late grant lands);
  the five column-reading gates deliberately untouched and still under census. Not a widening — no
  server-side gate reads the field.
- **Exchange lineage** (`f35eb4bb8`): lineage **added to** the state filter (not swapped) by
  composing the shared `WorkforceScheduleSupport.CurrentLineageOnly`; three controller-level tests
  including a non-vacuity pin (the dead row is still Published, still hers, same window) and the
  inverse guard (draft-cancelled row still does not refuse). C4 held: award asserts
  `AwardedByActorReference`.
- **Growth failure classification** (`d74c2c87b`): both untyped `catch (DbUpdateException)` narrowed
  with `when (DbExceptionHelper.IsUniqueViolation(ex))` — the estate's single detector, by provider
  error number. Six arms in matched sets with a **disjoint** mutation matrix (M1 reds only consent
  arms, M2 only dispatch arms; inverse arms red under neither). C1 respected in the tests: absence
  arranged by RENAME with row counts asserted unchanged both directions.
- **Training reads** (`3478c8b40`): read-only projections; names resolved by two grouped lookups
  rather than a join, so an unresolvable reference reads as an unnamed row, never a dropped
  inspector-evidence row; `versionCount`/`hasPublishedVersion` derived from the same rows they
  summarize.
- **Clock-out state** (`4d103ca8a`): `WorkforcePosSessionState.AttendanceException = 3`; state read
  off the fold's own `Outcome`, not `ClosedUtc` — including the lost-close-race → Closed and
  cross-engagement cases the timestamp derivation could never express. Wire-fixture pair updated in
  the same diff.
- **Invitations** (`13e8a6213`): list + revoke land with routes, service methods and problem types in
  one diff (C3); the summary model structurally cannot carry a token or hash; revoke is a state
  transition (C1), audits the manager's engagement (C4), refuses revoking a claimed code; the claim
  path untouched and the revoked≡fabricated opacity pinned member-by-member.
- **Acceptance identity** (`86142430c`): `RequireAcceptorIdentity` placed after the idempotent-replay
  switch and ahead of BOTH write paths (T5 and amendment); the guard and the receipt normalize
  through the same `AcceptorField` helper, so a whitespace name cannot pass the check and be stored
  as present. Refused, never defaulted — consistent with `EVENTS_UNATTRIBUTED`.

## 7. The evidence commits match their messages

`a74a6fd21`, `760ab26b6`, `dc0fa8508`, `a14084874` are evidence-only and are what they say. Two are
notable for honesty rather than despite it: `a14084874` records its SQL tier as **NOT COMPLETED,
twice** and refuses to call it green; `dc0fa8508` opens by correcting its own brief (two of the five
"finished" lanes were analysis-class with no patch anywhere — both defects re-verified live at the
then-tip and left named as open, which the tender-label pair in this very range then fixed).

## 8. Claim 1 — non-SQL 4832/0/10, "+73 accounted exactly": **VERIFIED**

The chain of baselines is internally consistent and each step's arithmetic checks: 4736 (`118f92fb9`)
+16 (`a14084874`, by attribute) = 4752; +7 (`dc0fa8508`, by attribute) = 4759; +73
(`L-EVERYTHING-REACHES-THE-BRANCH`) = **4832**, and the archived tier log
(`docs/plan/lanes/L-EVERYTHING-REACHES-THE-BRANCH/tier-backend-nonsql.txt`) ends
`Passed! 0 / 4832 / 10 / 4842` at a worktree of `a1c1a6dff`.

The +73 table re-derived **statically, class by class, at both revisions** (`git show` + attribute
count, `[Theory]` rows resolved through their `MemberData` sources):
`EscPosPaymentLabelTests` 5 Facts + 17 enum-member theory rows = 22; `PrintedTenderNameTests`
likewise 22 (**+44**); `LoginTokenAndSmsDoorWireTests` 5; `ErrorBodyHeaderEchoWireTests` 2;
`WorkforceShiftExchangeTests` 22→25 (**+3**); `MealsRefusalIdentityWireTests` 1;
`MarginSetupDayResolutionTests` 5; `PowerUserProjectionWireTests` 4;
`GrowthDbFailureClassificationTests.cs` 6 (two classes of 3 in one file — the receipt's two-class
naming is right, the commit adds one file); `TrainingCompletionServiceTests` 6→8 +
`TrainingCourseServiceTests` 10→11 (**+3**). Sum **= 73 exactly.** One qualifier: the receipt's
per-class dual-revision *runs* are claimed but not archived as artifacts; the accounting nevertheless
reconciles from the commits alone, which is the stronger form of the check.

## 9. Claim 2 — the single SQL red "proven pre-existing": **the conclusion holds; the claimed run itself is not archived**

The claimed proof (the class built and run at untouched `dc0fa8508`, 7/1 with the identical
`Expected: 1 / Actual: 2`) left no `.trx`/log in the lane directory, so **that specific run is not
reproducible from archives** without re-running a suite this lane may not run. The pre-existence
conclusion is nevertheless established by three independently checkable facts:

1. **The identical failure is archived from BEFORE most of the range**:
   `lanes/L-SECOND-WAVE-LANDS-ON-BOTH-TRUNKS/be-sql-attempt1-aborted.txt` (committed in
   `a14084874`, commit 11 of 29) records the same test failing `Expected: 1 / Actual: 2` — and the
   second-wave brief already carried it as the known-red baseline `694/1` predating the range.
2. **The test class is byte-identical** between `dc0fa8508` and `a1c1a6dff` (`diff` of `git show` —
   IDENTICAL), and line 60 is the store-scoped outbox count exactly as quoted.
3. **No commit in the range touches schedule publish**: the full range diff contains no
   schedule/outbox/publication production file (the one grep hit,
   `OperationalNotificationPiiTests.cs`, is an observability test edited by the poweruser lane).

The tip run itself (`tier-backend-sql.txt`, 32 m 05 s, 694/1/695, same test, same delta) is archived.

## 10. Tests that cannot fail: **none found**

Every added test was read for vacuity. The strong points: the Meals wire test pins the refusal CODE
before the leak assertion (an earlier refusal cannot green it); the tender tests carry the
enum-census guard that reds on the next added member; the exchange test pins the dead row's
continued existence; the error-body test derives its assertion set from the request object; the SMS
tests assert the transition (fifth OK, sixth 429). The mutation proofs seen are **not weaker than
their defects**: the Meals mutant reproduces the original extension-member leak exactly (§5), the
error-body mutant is the removed registration itself, and the growth matrix's reds are disjoint by
site. Near-nits that are falsifiable but brittle are in §12.

## 11. Constraints

- **C1** — no UPDATE/DELETE against an append-only table anywhere in the range; the growth tests
  arrange table absence by RENAME and assert row counts unchanged; the Events acceptance receipt and
  Workforce rows are written through their documented append paths.
- **C2** — `git diff --name-only 118f92fb9..a1c1a6dff -- Migrations/` is **empty**; no
  `OnModelCreating` index/constraint added.
- **C3** — every added capability lands with its wiring: invitations (routes+service+problems in one
  diff), the middleware (registered in the same commit), the limiter (consumed and registered in the
  same commit), `AttendanceException` (returned by the response builder the endpoint already calls).
- **C4** — the two new writes name their actor: exchange award (`AwardedByActorReference` asserted),
  invitation revoke (audit `ActorReference = caller.StaffMemberId`).
- **C5** — every receipt in range offers suite results as behaviour evidence only; `dc0fa8508` says
  outright that Sven walking the surfaces is the gate and has not happened. Nothing in range claims
  acceptance.
- **C6** — no new statutory claim; the clock-out fix removes a way for the § 8-5-6 personalliste to
  carry an entry with no end time.
- **C7** — no new log/telemetry call carries a secret; the middleware logs nothing (the pre-existing
  inner handler logs the exception, template-only); the 429 path logs nothing.

## 12. Observations (none blocking)

- **N1** — five files live under a root-level `.lane/` directory (from `3c4cc6a4d`, `760ab26b6`,
  `e0ccd1036`) while every other lane's evidence lives under `lanes/`. Hygiene inconsistency only.
- **N2** — `The_sms_refusal_names_neither_the_number_nor_the_budget` asserts
  `DoesNotContain("5", body)`: correct today (the body carries no digit) but any future digit in the
  message reds it for a non-leak reason. Falsifiable, slightly brittle.
- **N3** — `WireLogRecorder.Matching(fragment)` scans rendered messages only; the C7 assertions in
  `ErrorBodyHeaderEchoWireTests` therefore do not sweep the newly-attached `Exception` objects.
  Nothing in these paths puts a credential in an exception message, but the sweep is narrower than
  it looks.
- **N4** — `The_bearer_carries_the_configured_lifetime_…` pins `DefaultTokenLifetimeHours` while
  `appsettings.json` sets an equal 720; a legitimate config change to any other legal value would
  red the test spuriously. Coupling nit.
- **N5** — the middleware's client-abort rethrow hands the OCE to the framework page in Development;
  during a graceful-shutdown-triggered abort there is a theoretical instant where a page could
  render toward a connection Kestrel is tearing down. No practical disclosure path was found; named
  for completeness.
- **N6** — `b17e0dd62` is authored as `Claude (margin-landing) <sven4696@gmail.com>` while its
  neighbours carry `Okam Agent <agent@okam.local>`. Cosmetic authorship inconsistency.
- **N7** — the per-class dual-revision tier runs behind the +73 (§8) and the baseline attribution
  run behind the SQL red (§9) are claimed with specifics but not archived; both conclusions were
  re-derived here from artifacts that ARE in the history. Future receipts should archive those runs.

## 13. Verdict per commit (topological order)

| # | commit | verdict |
|---|---|---|
| 1 | `9990b4bb7` escpos ladder tender | matches; falsifiable guard pair (§6) |
| 2 | `4d103ca8a` clock-out third state | matches (§6) |
| 3 | `a74a6fd21` clockout lane evidence | evidence-only, matches |
| 4 | `13e8a6213` invitations list+revoke | matches; opacity pin verified (§6) |
| 5 | `86142430c` acceptance names somebody | matches; guard placement verified (§6) |
| 6 | `dd2ef7eae` merge wf-invite-pair | clean auto-merge, bit-identical |
| 7 | `a6445ee0c` merge acceptance lane | clean auto-merge, bit-identical |
| 8 | `d74c2c87b` growth typed catches | matches; disjoint mutation matrix (§6) |
| 9 | `b170a9e45` power-user projection | matches (§6) |
| 10 | `3478c8b40` training reads | matches (§6) |
| 11 | `a14084874` second-wave lane record | evidence-only, matches; honestly non-green on SQL |
| 12 | `765e8d757` land clockout lane | clean auto-merge, bit-identical |
| 13 | `f35eb4bb8` exchange lineage | matches; predicate composed, not copied (§6) |
| 14 | `3c4cc6a4d` meals refusal off the wire | matches; security 4/4 CLOSES (§5) |
| 15 | `dc0fa8508` top-ranked-fixes lane record | evidence-only, matches; corrects its own brief |
| 16 | `760ab26b6` refusal tier runs | evidence-only, matches; mutant = original defect (§5) |
| 17 | `e0ccd1036` margin end-of-day | matches; all three legs verified (§6) |
| 18 | `da64e1883` merge escpos lane | clean auto-merge, bit-identical |
| 19 | `4fb9f1905` error-body middleware | matches; security 1/4 CLOSES (§2) |
| 20 | `b17e0dd62` token lifetime + SMS meter | matches; security 2/4 + 3/4 CLOSE, caveats §3 |
| 21 | `bcc8bd179` tender on both emitters | matches; supersession of `KassaPaymentLabels` is deliberate and complete (§6) |
| 22 | `864552bd3` merge refusal lane | clean auto-merge, bit-identical |
| 23 | `3e370e6cc` merge login-token lane | clean auto-merge, bit-identical |
| 24 | `ef70915f4` merge error-body lane | clean auto-merge, bit-identical |
| 25 | `5f27b0b10` merge superseded-self lane | clean auto-merge, bit-identical |
| 26 | `f17248717` merge margin lane | clean auto-merge, bit-identical |
| 27 | `b5f393519` merge poweruser lane | clean auto-merge, bit-identical |
| 28 | `a29f9f576` merge growth lane | clean auto-merge, bit-identical |
| 29 | `a1c1a6dff` merge training lane | clean auto-merge, bit-identical |

**Content lost: none. Contents-vs-message mismatches: none. Tests that cannot fail: none found.**

## 14. Revert, if ever needed

`git branch -f feature/restaurant-modules 118f92fb9` (unused; this lane moved nothing).
