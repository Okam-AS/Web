# L-ALIASING-NEEDLE-SWEEP - census of absence assertions that can fire on their own fixture

Read-only analysis. No test edited, no suite run, no container started, no ref moved.

Subject: `OkamAPI` at **`8e2b57de`**, read straight from the object database
(`git archive 8e2b57de WebApi.Tests`) into a private scratchpad. No worktree was touched, so
nothing another lane has dirty could contaminate the reading.

**Tip claim in the brief is CORRECT this time.** `feature/restaurant-modules` = `8e2b57de`
("L-VIOLATION-EXACT-LAND: merge receipt for the constraint-exactness landing", Aug 4 11:58).

---

## 0. The headline, first

Two things a reader needs before the table.

**(a) The instance `L-EV-OUTBOX-FLAKE` "fixed" is still live at the integration tip.**
Both prior lanes did their work on branches that were never merged:

| branch | sha | merged into `8e2b57de`? |
|---|---|---|
| `lane/ev-outbox-flake` | `59a1d607` | **NO** |
| `lane/ev-outbox-guid-substring` | `79f9dd7d` | **NO** |

`WebApi.Tests/Events/EventsOutboxDeliveryTests.cs:411-412` at `8e2b57de` still reads
`Assert.DoesNotContain("250", body); Assert.DoesNotContain("2000", body);`. The defect is not
"fixed and swept"; it is **fixed twice on two unmerged branches and live on the trunk.** Whoever
lands them should land one, not both - they fix the same lines two different ways.

**(b) One new instance found, in a form nobody had matched: the needle is the random part.**
`Services/EmailConfirmationSendOutcomeTests.cs:295`, inside the helper
`AssertNothingSensitiveLogged(string code)`. It is safe by four orders of magnitude, and it is in
the table with its number rather than left out.

---

## 1. What the sweep could see, and what it could not

### Globs covered
`WebApi.Tests/**/*.cs` - **811 files, the entire backend test surface.** `WebApi.Tests` is the only
test `.csproj` in the repo at this commit, so "the backend test suite" is exactly this tree.

### Assertion forms matched
Scanned with a comment-aware, string-aware, **balanced-paren** extractor, so multi-line
constructions are matched as one call rather than one line (Python, per-item output; no shell loops).

| form | raw hits | with a string-literal needle |
|---|---|---|
| `Assert.DoesNotContain(...)` | 439 | 174 |
| `Assert.DoesNotMatch(...)` | 1 | 1 |
| `Assert.False(...)` | 967 | 2 (via `.Contains`/`.EndsWith`) |
| `!expr.Contains(...)` | 66 | 0 additional |
| **helper wrappers** (method whose *parameter* is the needle) | **1** | n/a - needle is random |

### Forms proven absent rather than assumed absent
- FluentAssertions `.Should().NotContain(...)` - **0 sites**; `.Should()` itself is **0** in the tree.
- Shouldly `ShouldNotContain` - **0**.
- `Assert.Equal(-1, s.IndexOf(...))` and `IndexOf(...) < 0` - **0**.

### Deliberately out of scope (absence, but no needle -> cannot alias)
`Assert.Empty(` (359) and `Assert.Null(` (599). They assert absence but search for nothing, so no
random value can satisfy them. They belong to the cannot-fail catalogue, not to this one.

### What I could NOT see - stated plainly
1. **I did not execute anything.** Every probability below is arithmetic over the code that
   produces the value, not a measured failure rate. Where a sibling lane measured empirically, I
   say so and compare.
2. **Indirect haystacks are judged from the producer, one level deep.** For each site I read the
   code that composes the haystack. I did not transitively prove that no logger, serializer or
   middleware injects a random value further down; for the 6 sites where that mattered I read the
   composer itself and say which.
3. **One integer I did not pin exactly** - see row 18/19: `world.B.StoreId` is a database identity.
   I established it is *sequential and deterministic*, not random, which is what settles aliasing;
   I did not compute the literal integer.
4. **Needles assembled at runtime from more than one variable** (`$"{a}{b}"` style) - 13 sites fall
   in an "other" bucket. None had an alphabet that fits a GUID, so none can alias, but I classified
   them by shape rather than by evaluating them.

---

## 2. The bound that makes this sweep checkable

An absence needle can alias **only if the haystack holds a random value whose alphabet can spell the
needle.** So I enumerated the randomness in the test tree rather than guessing at it:

| source | occurrences | verdict |
|---|---|---|
| `Guid.NewGuid()` | **900** in 277 files | **the real vector** |
| `new Random(...)` | 9 in 8 files | **all fixed-seeded** (`20260716`, `20260715`, `20260714`, or a theory seed) -> deterministic |
| `Random.Shared` | 1 | inside a **doc comment**, not executed |
| `RandomNumberGenerator` | 5 in 1 file | a **reflection allowlist**, produces no fixture value |
| `Bogus` / `Faker` | 4 | the string literal `"Bogus/Zone"` (a timezone), not the faker library |
| `DateTime(Offset).UtcNow` | 79 in 33 files | a **time-bomb** vector, not an alias vector (sibling `L-EV-JOURNEY-TIMEBOMB`) |

**Therefore: the only random fixture value in the entire backend test tree is a v4 GUID.**
That gives a hard, mechanical filter - a needle can alias only if its alphabet is a subset of
`[0-9a-f]`, with dashes permitted only where the `8-4-4-4-12` lattice puts them.

Applying it to the 174 literal needles:

| needle alphabet | count | can alias in a GUID? |
|---|---|---|
| digits only | 12 | **yes** |
| hex-safe (incl. `-`) | 3 | **yes, if the dashes fit the lattice** |
| alphanumeric with non-hex letters | 71 | no |
| contains punctuation | 88 | no |

15 candidates survive the filter. Every one is in the table below, plus the variable-needle and
helper-wrapper findings.

### How the probabilities were computed
Exact, not Monte Carlo and not a union bound: a DP over "longest matched needle prefix" across the
GUID's five groups, modelling `Guid.NewGuid().ToString("D")` **as .NET actually emits it** - 32
lowercase hex in groups of 8-4-4-4-12, with the **version nibble pinned to `4`** and the **variant
nibble drawn from `{8,9,a,b}`**. Needles cannot straddle a dash, so groups are independent.

In-group window counts, which is why short needles are the dangerous ones:

| needle length | 1 | 2 | 3 | 4 | 5 | 6 | 8 |
|---|---|---|---|---|---|---|---|
| window positions | 32 | 27 | 22 | 17 | 12 | 10 | 6 |

**Cross-check:** my exact arithmetic gives the live defect **1 in 196.0**. `L-EV-OUTBOX-GUID-SUBSTRING`
measured **1 in 197.6** over 200,000 real composed bodies (1,012 hits, sigma ~= 32). Independent
method, same answer. The briefed figures - "1 in 180" and an earlier "1 in 130" - were both
optimistic; note also that `22/16^3` (the arithmetic in `L-EV-OUTBOX-FLAKE`) is an expected-count,
not a probability, and overstates `"250"` by ~10% because it double-counts overlapping windows.

---

## 3. The census

Verdict key: **ALIASES** = fires on its own fixture at a rate worth fixing | **QUANTIFIED-SAFE** =
random value is genuinely reachable, rate computed and negligible | **SAFE-DETERMINISTIC** = no
random value reaches the haystack, P = 0 | **SAFE-OVERLOAD** = not a substring search at all |
**BRITTLE** = P = 0 today, but the margin is one field wide.

### 3.1 ALIASES - live at `8e2b57de`

| # | site | needle | haystack | P(alias) | remedy |
|---|---|---|---|---|---|
| 1 | `Events/EventsOutboxDeliveryTests.cs:411` | `"250"` | `body` - fixed HTML template + **one `Guid.NewGuid()` token** in the href | `4.873e-3` alone | excise-haystack |
| 2 | `Events/EventsOutboxDeliveryTests.cs:412` | `"2000"` | same `body` | `2.289e-4` alone | excise-haystack |
| | **combined, as the file actually runs** | | | **`5.101e-3` = 1 in 196.0** | |

Mechanism, confirmed against the producer `Services/Events/EventsEmailNotificationDelivery.ComposeHtml`:
the body is a constant template plus `ComposeLink(row)`, and the token is the **only** variable part.
Line 404 is a positive control asserting the token IS in the body - so the random value is
guaranteed present, not merely possible. The needle cannot straddle the URL boundary (`/` before,
`"` after), so the whole rate comes from inside the GUID.

Both unmerged fixes are sound and use different remedies (`ev-outbox-flake` pins the token to
`2502000a-2500-2000-2500-250020002500` and excises the link; `ev-outbox-guid-substring` masks the
token by exact value and adds a stray-identifier guard). **Land one.**

Worth carrying forward from `L-EV-OUTBOX-FLAKE`, because it is the more general lesson: the bare
needle was **weak even when it did not alias**. `"2000"` does not match `2 000,00`, which is how a
Norwegian money leak actually renders. This assertion would have **missed a real leak while failing
on a fake one** - both failure modes at once.

### 3.2 QUANTIFIED-SAFE - a random GUID really is in the haystack; the rate is negligible

| # | site | needle | why a GUID is present | P(alias) |
|---|---|---|---|---|
| 3 | `Observability/OperationalNotificationPiiTests.cs:84` | `"91234567"` (8 digits) | `message.Text` carries `user.Id`, and `Guest(...)` sets `Id = Guid.NewGuid().ToString()`; line 66 asserts the id IS in the text | `1.397e-9` = **1 in 715,827,883** |
| 4 | `Observability/OperationalNotificationPiiTests.cs:137` | `"98765432"` | same | `1.397e-9` |
| 5 | `Observability/OperationalNotificationPiiTests.cs:260` (helper `AssertNoIdentifiers`) | `"91234567"` | same; helper is called from 3 tests | `1.397e-9` |
| 6 | `Services/EmailConfirmationSendOutcomeTests.cs:295` (helper `AssertNothingSensitiveLogged`) | **the needle is random** - see below | log line may carry a GUID | `6.623e-7` per GUID = **1 in ~1.51M** |

**Row 6 is the new find, and it is the mirror of the mirror.** Everywhere else the haystack is
random and the needle is fixed. Here the *needle* is the random one:
`NumericConfirmationCode.Generate()` is `RandomNumberGenerator.GetInt32(100000, 1000000)` - a
uniformly drawn **6-digit decimal string**, 900,000 possible values - and it is searched inside
`entry.Message + " " + entry.Exception?.ToString()` for every captured log entry. A GUID offers
10 six-char windows, of which `(10/16)^6 = 0.596` are all-decimal on average, so
`P = 0.596 / 900,000` per GUID in the line. Safe, and now on the record with its number instead of
being discovered by a lane at 3am.

*Adjacent observation, outside this lane's remit but seen while reading it:* the helper's assertions
sit inside `foreach (var entry in Log.Entries.Concat(MailLog.Entries))`. If nothing was logged  - 
which is precisely what the test hopes - the loop body never executes and the helper asserts
nothing. That is a cannot-fail shape, not an aliasing one, and belongs to the other catalogue.

### 3.3 SAFE-DETERMINISTIC - P = 0, no random value reaches the haystack

| # | site | needle | why P = 0 |
|---|---|---|---|
| 7 | `Kassa/DeliveryReceiptComplianceTests.cs:43` | `"-"` | haystack is the compile-time constant `PosReceiptService.DeliveryMarking`. Asserts the sec. 2-8-7 wording uses an en dash, not a hyphen - a good assertion over a fixed string |
| 8 | `Observability/SensitiveDataRedactorTests.cs:186` | `"91234567"` | `ContactNameLabel(first, last, "user-1")` - every argument is an `InlineData` literal or a literal |
| 9 | `Observability/SensitiveDataRedactorTests.cs:273` | `"8f21"` | `WithoutEchoes(literal, literal)`; the `8f21` is the tail of a fixture secret spelled in the call. Would alias at `1 in 3,450` **if** a GUID were ever introduced here - the only row where the margin is thin enough to be worth naming |
| 10 | `Workforce/WorkforceRateAuthoringTests.cs:223` | `"21500"` | `WorkforceRateProblems.RateNotPositive()` returns a fixed sentence that never interpolates the submitted amount |
| 11 | `Workforce/WorkforceRateAuthoringTests.cs:536-539` | `"21500"`, `"23000"`, `"NOK"`, `Worker` GUID | `SemanticDelta` is a literal 2-key dictionary, `{"effectiveFromUtc":"set","supersededEntry":"true"/"false"}` - **no digits at all**. Strong assertion over a tiny fixed haystack |
| 12 | `Workforce/ScheduleExternalCommitmentsTests.cs:155` | `"2026-11-17"` | **structurally impossible**: the needle's dash lattice is 4-2-2, and a GUID's inter-dash gaps are always exactly 4. Every id in the payload is a `Guid.Parse` constant, and `DisclosingBusinessDate` is `new(2026,11,17)` |

### 3.4 SAFE-OVERLOAD - not a substring search in the first place

xunit's `DoesNotContain<T>(T, IEnumerable<T>)` compares by **equality**, so a short needle cannot
match inside a longer element. These read like the dangerous shape and are not it.

| # | site | needle | haystack type |
|---|---|---|---|
| 13 | `Kassa/SaftCashRegisterExportServiceTests.cs:171` | `"0"` | `List<string>` of VAT codes - equality, so `"0"` does not match `"31"` |
| 14 | `Tripletex/TripletexOnboardingTests.cs:40,44` | `"7770"`, `"1920"` | `status.MissingAccounts` collection |
| 15 | `Tripletex/TripletexWp3ServiceTests.cs:32,42` | `"3000"` (x2) | `OutsideLawAccountNumbers` collection |
| 16 | `Wire/WireContractPinsTests.cs:145` | `"Access-Control-Expose-Headers"` | `HttpHeaders.Contains(name)` - exact header-name lookup |
| 17 | `Margin/MarginSalesSeamContractTests.cs:230` | `"Minor"` | `name.EndsWith(...)` over a reflected property name |
| - | `Modules/ModuleGateOrderingTests.cs:251` | the one `Assert.DoesNotMatch` | regex vs. a fixed literal string; no fixture value involved |

### 3.5 BRITTLE - P = 0 today, but on a one-character margin

These do not alias, because nothing random reaches them. They are recorded because their needles are
one or two characters long, which is the shortest margin in the tree.

| # | site | needle | reading |
|---|---|---|---|
| 18 | `Growth/GrowthErasureRefCountTests.cs:130` | `StoreB.ToString()` = **`"8"`, one character** | Haystack is the deferred-erasure `ResolutionJson`. I read `GrowthPrivacyResolutionReceipt.ForErasure` and `GrowthErasureShred`: on the deferred branch `addressDestroyedAt` is `null` **and** `addressDestroyedBy` is `null` (the comment is explicit - "a deferral records no destroyer"), and `resolvedByUserId` is the literal `"privacy-admin"`. The receipt therefore contains **zero digits** and P = 0. But a single added timestamp, count or numeric id containing an `8` turns this permanently red. Not a flake - a trap. |
| 19 | `Events/EventsTenantIsolationSweepTests.cs:98`, `Margin/MarginTenantIsolationSweepTests.cs:168` | `world.B.StoreId.ToString()` - a **1-2 character** integer | `StoreId` is a database identity assigned by `SaveChangesAsync` on a fresh per-test SQLite database, so it is **sequential and deterministic, not random** - that is what settles aliasing. Haystack is `string.Join("|", pd.Title, pd.Detail, pd.Type, pd.Instance, extensions)`; the app sets no RFC `Type` URL, so no `rfc7231`-style digits enter. I did not pin the literal integer (see limits, item 3). |

### 3.6 Checked and safe - the long-needle bulk

Recorded so coverage is distinguishable from silence, per the brief.

- **159 of the 174 literal needles** contain at least one character outside `[0-9a-f-]`. A GUID
  cannot spell them, and no other randomness exists in the tree (sec.2). **P = 0 by alphabet.**
  This includes every `'@'`, `'#'`, `'{'` single-character needle (12 sites) - punctuation is the
  cheapest possible immunity.
- **120 of the 266 variable-needle sites** pass a lambda as the second argument, i.e. the
  `DoesNotContain(collection, predicate)` overload. Predicate, not substring. **P = 0.**
- **Needles that are whole GUIDs** - `HiddenStaffId`, `HiddenAssignmentId`, `HiddenRevisionId`,
  `HiddenPublicationId`, `HiddenRoleId`, `MealsWorld.EmployeeMembershipId`,
  `AlsoElsewhereOtherStoreStaff` in both `"D"` (36 char) and `"N"` (32 char) forms - are far too
  long to occur by chance. **P = 0.** All are `Guid.Parse` constants, which is the right habit.
- **`WorkforceStaffTestSeed.HiddenStoreId` = `90003`** (5 digits), used as a needle at
  `ContractExposureReadTests.cs:184`, `ScheduleExternalCommitmentsTests.cs:114`,
  `WorkerProfileIsolationTests.cs:106,110`. Payload ids there are `Guid.Parse` constants, so P = 0;
  **had any been `Guid.NewGuid()`, the rate would be `12/16^5` = 1 in 87,381** - worth knowing,
  because these are tenant-isolation tests and someone will add a generated id to one eventually.

---

## 4. Recommendation for whoever fixes this

Only row 1-2 needs a code change, and the change is already written twice. Land **one** of
`lane/ev-outbox-flake` / `lane/ev-outbox-guid-substring`, not both.

Prefer the remedy order the brief sets out, for the reason the estate already learned once in
`Services/ConfirmationCodeEntropySourceTests.cs:21-23` - a pin that read
`Assert.DoesNotContain("new Random(", source)` "named ONE SPELLING of the defect, so every other
spelling walked past it", and `Random.Shared.Next(...)` reinstated the defect underneath it. A bare
needle is a guess about how the leak will be spelled:

1. **Excise the random part from the haystack** before asserting absence - structural, not lucky.
2. **Pin the fixture to the worst case** so the historical failure reproduces on demand.
3. **Replace the bare needle with an inventory** of what the message may legitimately contain  - 
   this is the one that would have caught `2 000,00`.

Rows 18 and 19 are worth a comment in the test, not a code change: a one-character absence needle is
correct today and gives no warning when it stops being correct.
