# L-ALIASING-NEEDLE-SWEEP - census of absence assertions that can fire on their own fixture

Read-only analysis. No test edited, no suite run, no container started, no ref moved.

> **CORRECTED 2026-08-04 by `L-CENSUS-CORRECTIONS`.** A Fable reviewer verified this census
> independently - re-ran the extractor against its own extraction, wrote an exact dynamic program and
> a two-million-sample Monte Carlo, and read every cited site. **Every load-bearing finding held: no
> row changed verdict, no site was added, none was removed.** Five statements did not hold, and they
> share a shape - **right verdict, wrong reason**, which is a rule that fails the next time. They are
> corrected in place, each marked, each citing what falsified it: the immunity rule (sec. 2), the
> `Guid.NewGuid()` count (sec. 2.1), the cross-check's overlap argument and its direction (sec. 2.3),
> row 6's divisor (sec. 3.2), and two false universals about assertion forms (sec. 1 and sec. 3.6).
> Re-derivations are in `lanes/L-CENSUS-CORRECTIONS/` (`recheck-alias-math.py`, `recheck-needles.py`,
> `recheck-production-randomness.py`, each with its captured output).

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

### Mostly out of scope (absence with no needle) - and the two exceptions, named

`Assert.Empty(` (359) and `Assert.Null(` (599) usually assert absence and search for nothing, so no
random value can satisfy them, and they belong to the cannot-fail catalogue rather than this one.

**CORRECTION (2026-08-04, `L-CENSUS-CORRECTIONS`). "No needle" is false as a universal, and the Fable
review of this census is what falsified it.** An `Assert.Empty` over a **filtered** sequence carries
the filter's needle. Re-extracting every `Assert.Empty`/`Assert.Null` span and searching it for a
literal `.Contains("..")` / `.StartsWith("..")` / `.EndsWith("..")` / `.IndexOf("..")` finds two
(`lanes/L-CENSUS-CORRECTIONS/recheck-needles.py`, Q3; output in `recheck-needles.txt`):

| site | needle inside the filter | why it still cannot alias |
|---|---|---|
| `Wire/GrowthConsentAdminWireTests.cs:159` | `e.Message.EndsWith("contactPointId=" + refusedContact.ContactPointId, ...)` | the needle **contains a whole GUID**, and `=` is outside `[0-9a-f-]`: immune by length **and** by punctuation |
| `Workforce/WorkforceInvitationTests.cs:439` | `r.Scope.Contains("invitation.claim")` | `.` is outside every random alphabet in play (sec. 2.2): immune by punctuation |

Both verdicts stand. The **reason** is the needle's alphabet and length, not the absence of a needle -
and the difference is what a later `Assert.Empty(rows.Where(r => r.Token.Contains("250")))` would
inherit. This lane's extractor counts 361 `Assert.Empty` and 608 `Assert.Null` spans against the 359 /
599 above; the original counting method is not preserved in this lane's scripts, so both numbers are
shown rather than one silently replacing the other.

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
needle.** That premise is sound. The derivation below it was not, and **the Fable review of this
census falsified it**; sec. 2.1 to 2.3 are the corrected form (`L-CENSUS-CORRECTIONS`, 2026-08-04).
Every verdict in sec. 3 survives the correction - what changes is the rule a later needle inherits.

### 2.1 Randomness the TEST TREE mints

| source | occurrences | verdict |
|---|---|---|
| `Guid.NewGuid()` | **966 occurrences, on 940 lines, in 287 files** (see below) | **the real vector** |
| `new Random(...)` | 9 in 8 files | **all fixed-seeded** (`20260716`, `20260715`, `20260714`, or a theory seed) -> deterministic |
| `Random.Shared` | 1 | inside a **doc comment**, not executed |
| `RandomNumberGenerator` | 5 in 1 file | a **reflection allowlist**, produces no fixture value |
| `Bogus` / `Faker` | 4 | the string literal `"Bogus/Zone"` (a timezone), not the faker library |
| `DateTime(Offset).UtcNow` | 79 in 33 files | a **time-bomb** vector, not an alias vector (sibling `L-EV-JOURNEY-TIMEBOMB`) |

**What this table establishes - and all it establishes - is that the only random value the FIXTURE
ITSELF mints is a v4 GUID.** That finding stands; it was the step taken from it that did not.

**The `Guid.NewGuid()` row previously read "900 in 277 files". No counting method reproduces it.**
Four independent counters over the same 811 files - exact text `Guid.NewGuid()`, a whitespace-tolerant
regex, that regex with comments masked, and bare `NewGuid()` whatever the receiver - all return **966
occurrences on 940 lines in 287 files**, and `grep -ro` / `grep -l` agree
(`lanes/L-CENSUS-CORRECTIONS/recheck-needles.py`, Q4). The corrected figure is the reproducible one,
and it is stated in all three units so the next reader can tell which quantity is meant.

### 2.2 Randomness PRODUCTION mints into the same haystacks - the part this census missed

The table above answers "what does the fixture draw?". It does not answer "what is in the haystack?",
and those are different questions: **a haystack is composed by production code the test invokes.**
The census concluded from sec. 2.1 that *the only random value in the tree is a v4 GUID* and therefore
that any needle with a character outside `[0-9a-f-]` is safe. Production mints wider alphabets
(`lanes/L-CENSUS-CORRECTIONS/recheck-production-randomness.py`; output alongside it):

| production minter | alphabet of the value | site |
|---|---|---|
| preference / unsubscribe link token | url-safe base64 `[A-Za-z0-9-_]` | `Services/Growth/GrowthPreferenceTokenService.cs:51,57,103` (encoder at `:203`) |
| encrypted-at-rest address, **random AES-GCM nonce** | standard base64 `[A-Za-z0-9+/=]` | `Services/Growth/GrowthAddressProtector.cs:275` -> `:297` |
| workforce invitation token, 32 CSPRNG bytes | url-safe base64 | `Services/Workforce/WorkforceInvitationService.cs:527-528` |
| six-digit confirmation code | decimal `[0-9]`, and it is a **needle**, not a haystack | `Helpers/NumericConfirmationCode.cs:32-33` |
| Meals invitation / authorization tokens - HMAC or SHA-256 **over a `Guid.NewGuid()`** | url-safe base64, unpredictable per run because its input is | `Services/Meals/MealsInvitationTokenService.cs:43,52`, `MealsAuthorizationTokenService.cs:36,45` |

**Row 6 of this census is the existence proof of the class it excluded.** It found a production-minted
random whose alphabet is not hex, quantified it, and put it in the table - while sec. 2 was still
asserting that no such value exists.

**The rule, restated so it cannot be inherited falsely:**

1. **The hex filter is valid only against a GUID haystack.** Where the haystack is (or contains) a
   `Guid.NewGuid()` and nothing else random, a needle whose alphabet is not a subset of `[0-9a-f]`
   (dashes only on the `8-4-4-4-12` lattice) has **P = 0**, exactly as sec. 3 uses it.
2. **Against a base64 haystack the immunity is punctuation or length, per site, never "not hex".**
   Base64 spells every letter and digit, so an all-alphanumeric needle is *spellable*: immunity comes
   from a character outside `[A-Za-z0-9+/=_-]` in the needle, or from the needle being long enough
   that `windows x 64^-len` is negligible.
3. **A base64 value derived from a random input is as unpredictable as a random one** - the Meals
   tokens above are HMACs, and an HMAC of a fresh GUID is not a fixed string.

**Worked example, at a site this census already lists.** `Growth/GrowthAddressProtectorTests.cs:54`
asserts `DoesNotContain("roundtrip", protectedAddress.EncryptedAddress)`. The haystack is
`"{version}:" + base64(nonce || tag || ciphertext)` with a **random 12-byte nonce**
(`GrowthAddressProtector.cs:275,297`) - 68 base64 characters, 60 nine-character windows. Under rule 1
as the census wrote it this is "P = 0 by alphabet". The true figure is `60 x 64^-9` = about
**3.3e-15**, treating base64 output as uniform over its 64 symbols: safe **by length**, not by
alphabet. The neighbouring line `:53` searches for `"roundtrip@example.test"`, which base64 cannot
spell at all - safe **by punctuation**. Two different immunities, one line apart, and neither is the
one the rule named.

**Is the class clear at this tip? Yes - and here is exactly who checked what, including where the two
counts do not line up.** The **Fable reviewer** extracted the short alphanumeric non-hex needles -
reported as **14** - and read **each** against its actual haystack; that is the basis for "nothing was
missed", and it is the reviewer's work, not this census's.

**The 14 is not reproduced by this lane's extraction, and the reviewer's list is not in this document,
so it cannot be enumerated here.** `recheck-needles.py` Q1b yields, at the two obvious thresholds:

| threshold | sites | distinct needles |
|---|---|---|
| length <= 12 | 23 | 19 |
| length <= 8 | 19 | 15 |

**No threshold in that extraction gives 14** - the nearest is 15 distinct needles at length <= 8.
Printed side by side rather than reconciled by guesswork, exactly as sec. 2.3 does for `174 / 71 / 88`
and sec. 1 does for the `Assert.Empty` span counts: **the population a claim was checked over is part
of the claim.** Of this lane's 23 sites, **7 were re-read at the producer** and are tabled below; the
remaining **16 rest on the reviewer's per-site pass, which this document cannot enumerate.** Anyone
re-deriving the immunity of that residue should re-run Q1b and read the sites, not cite this
paragraph.

| site | needle | haystack, at the producer | immune by |
|---|---|---|---|
| `Growth/GrowthAddressProtectorTests.cs:54` | `roundtrip` | `"{v}:" + base64(random nonce...)`, `GrowthAddressProtector.cs:275,297` | **length** (`3.3e-15`) - the one true base64 haystack in the class |
| `Growth/GrowthAddressProtectorTests.cs:26,27` | `guest`, `example` | `ComputeLookupHmac` = `Convert.ToHexString`, `GrowthAddressProtector.cs:204` | hex alphabet **and** determinism (fixed root key) |
| `Workforce/PersonnelListProjectionTests.cs:51` | `Kari` | `"wf-person:" + personId.ToString("D")`, `WorkforcePersonnelListProjection.cs:277` | a GUID haystack: rule 1 applies |
| `Growth/GrowthConsentTextAuthoringTests.cs:333,334` | `Version`, `Id` (the two shortest) | `List<string>` of reflected property names | the **equality** overload (sec. 3.4) |
| `Events/EventsStateMachineTests.cs:233` | `T13` | `string[]` of permitted actions | the **equality** overload |
| `Kassa/EscPosXZReportBuilderTests.cs:34` | `Signatur` | UTF-8 text of an ESC/POS job, no base64 | alphabet, deterministic body |
| `Workforce/PosClockSurfaceTests.cs:483` | `capab` | reflected property name | deterministic |

**Nothing was missed. What was wrong is the reason given - and the reason is what the next needle
inherits.**

### 2.3 Applying the corrected filter to the 174 literal needles

| needle alphabet | count | can alias in a GUID? | can alias in base64? |
|---|---|---|---|
| digits only | 12 | **yes** | yes - digits are in every base64 alphabet |
| hex-safe (incl. `-`) | 3 | **yes, if the dashes fit the lattice** | yes (`-` is in the url-safe alphabet) |
| alphanumeric with non-hex letters | 71 | no | **yes, in principle** - immunity is by length, per site (sec. 2.2) |
| contains punctuation | 88 | no | only if every character is in `[A-Za-z0-9+/=_-]` |

15 candidates survive the GUID filter. Every one is in the table below, plus the variable-needle and
helper-wrapper findings.

**The 15 survivors reproduce exactly; the 159-way remainder does not.** Re-extracting the same forms
(`lanes/L-CENSUS-CORRECTIONS/recheck-needles.py`, Q1) returns the same 12 digits-only and 3 hex-safe
needles, but 195 literal needles in total, split 56 alphanumeric-non-hex / 124 punctuation-bearing.
The classification step that produced 174 / 71 / 88 is not preserved in this lane's scripts, so the
two partitions are shown side by side. **The 159 exclusions still hold** - but by the per-class,
per-site reasons in sec. 2.2 and sec. 3.6, not by "a GUID cannot spell them" alone.

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
method, same answer. Re-derived a third time in `L-CENSUS-CORRECTIONS`
(`recheck-alias-math.py`, a from-scratch prefix DP over exact `Fraction`s): `"250"` alone
`4.873107e-3`, `"2000"` alone `2.288644e-4`, the pair **`5.101131e-3` = 1 in 196.0**. Unchanged.

**CORRECTED (2026-08-04), two claims in the sentence that followed, both falsified by the Fable review
and re-checked here per window:**

- **Direction.** The briefed figures - "1 in 180" and an earlier "1 in 130" - were **not optimistic;
  they overstate the failure rate.** `1/180 = 5.556e-3` and `1/130 = 7.692e-3` are both *larger* than
  the true `5.101e-3`, by 8.9% and 50.8%. They predict the test flakes **more** often than it does.
  (The measured `1/197.6 = 5.061e-3` is the one that sits marginally low, 0.8% under exact and well
  inside its own sigma.)
- **Why `22/16^3` overstates.** It is an expected-count rather than a probability, and it overstates
  `"250"` by **10.22%** - but **not because it double-counts overlapping windows.** `"250"` has no
  proper prefix that is also a suffix, so **it cannot overlap itself**; two occurrences must be
  disjoint, and that multiplicity correction is worth only **0.20%**. The dominant term is that **2 of
  the 22 length-3 windows are impossible**: the window at the head of group 3 would need the
  **version nibble**, pinned to `4`, to be `2`, and the window at the head of group 4 would need the
  **variant nibble**, drawn from `{8,9,a,b}`, to be `2`. The honest expected count is `20/16^3`, which
  is 10.00% below `22/16^3` - and `20/16^3` is itself 0.20% above the exact probability. Both terms
  are printed per window in `lanes/L-CENSUS-CORRECTIONS/recheck-alias-math.txt`.

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
| 6 | `Services/EmailConfirmationSendOutcomeTests.cs:295` (helper `AssertNothingSensitiveLogged`) | **the needle is random** - see below | log line may carry a GUID | `10 x 16^-6` = `5.960e-7` per GUID = **1 in 1,677,722** |

**Row 6 is the new find, and it is the mirror of the mirror.** Everywhere else the haystack is
random and the needle is fixed. Here the *needle* is the random one:
`NumericConfirmationCode.Generate()` is `RandomNumberGenerator.GetInt32(100000, 1000000)`
(`Helpers/NumericConfirmationCode.cs:32-33`) - a uniformly drawn **6-digit decimal string**, 900,000
possible values - and it is searched inside `entry.Message + " " + entry.Exception?.ToString()` for
every captured log entry.

**CORRECTED (2026-08-04): the arithmetic in the first version of this row divided by the wrong
number, and the Fable review caught it.** It read: "A GUID offers 10 six-char windows, of which
`(10/16)^6 = 0.596` are all-decimal on average, so `P = 0.596 / 900,000`." Two faults, one
compensating the other:

- **Notation.** `(10/16)^6 = 0.0596`, not `0.596`. The figure `0.596` is `10 x (10/16)^6`, the
  **expected number of all-decimal windows in the whole GUID** - a count, not the per-window
  probability the formula names.
- **Divisor.** Given a window is all-decimal, the chance it equals a *specific* six-digit string is
  `10^-6`, because the window ranges uniformly over all `10^6` decimal strings - including the 100,000
  that start with a zero and that the generator can never draw. `900,000` is the size of the **needle's**
  code space, not of the **haystack's** window space, and it does not belong in this denominator.

Composing correctly: `10 windows x (10/16)^6 x 10^-6` = **`10 x 16^-6` = `5.960e-7` = 1 in 1,677,722**.
The published `6.623e-7` overstated it by 11.1%. None of the 10 six-character windows touches the
pinned version or variant nibble (they live only in the 4-character groups), so no lattice correction
applies. Confirmed by running the same exact prefix DP used for rows 1-2 over concrete codes:
`123456` and `100000` give `5.960e-7`; a self-overlapping code such as `111111` gives `5.662e-7`, so
`10 x 16^-6` is exact for codes with no self-overlap and a tight upper bound for the rest
(`lanes/L-CENSUS-CORRECTIONS/recheck-alias-math.py`, section E). Safe by four orders of magnitude
either way - and now on the record with a number a reader can re-derive instead of being discovered
by a lane at 3am.

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

**Exact scope of that sentence (2026-08-04):** it covers rows 13-15, which really are the collection
overload. Rows 16 and 17 are `Assert.False(...)` wrapping a method call, and row 17's
`name.EndsWith("Minor")` **is** a substring search - a suffix-anchored one. Row 17 is immune because
`"Minor"` is not spellable in hex **and** its haystack is a reflected property name, which is
deterministic; row 16 is an exact header-name lookup. Same verdicts, stated by their own reasons.

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

- **159 of the 174 literal needles** contain at least one character outside `[0-9a-f-]`, so **no GUID
  can spell them**. This includes every `'@'`, `'#'`, `'{'` single-character needle (12 sites) -
  punctuation is the cheapest possible immunity.
  **CORRECTED (2026-08-04):** the original clause was "*and no other randomness exists in the tree
  (sec. 2). P = 0 by alphabet.*" The second half does not follow - production mints base64 into these
  same haystacks (sec. 2.2). The exclusion holds, but on two grounds that have to be checked
  separately: **punctuation** (a character outside `[A-Za-z0-9+/=_-]`, which no base64 value can
  spell) or **length** (an all-alphanumeric needle long enough that `windows x 64^-len` is negligible).
  The short all-alphanumeric needles - the ones for which neither ground is free - were checked per
  site, and the only one facing a base64 haystack is `GrowthAddressProtectorTests.cs:54` at `3.3e-15`
  (sec. 2.2).
- **120 of the 266 variable-needle sites** pass a lambda as the second argument, i.e. the
  `DoesNotContain(collection, predicate)` overload.
  **CORRECTED (2026-08-04):** the original reason was "*Predicate, not substring. P = 0*", and the
  Fable review falsified it: a predicate can perform a substring search inside itself, and **19 of the
  120 do** - listed per site in `lanes/L-CENSUS-CORRECTIONS/recheck-needles.txt` (Q2; 19 with an
  embedded literal, 101 without, 120 total, reproducing this census's own denominator). Examples:
  `Events/EventsRunSheetDietaryTests.cs:52` `i => i.Body.Contains("no dietary", ...)`,
  `Wire/WireContainmentTests.cs:65` `f => f.Path.EndsWith("secrets.json", ...)`,
  `Wire/GrowthPrivacyNoticeDeliveryWireTests.cs:165` `name => name.IndexOf("Delivered", ...) >= 0`.
  **All 19 are still immune, and all 19 are immune by alphabet** - every embedded needle carries at
  least one non-hex letter - with most also searching a deterministic haystack (a reflected member
  name, an enum name, a fixture-composed body). The verdict is unchanged; the *reason* is, and the
  overload semantics were never it.
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
