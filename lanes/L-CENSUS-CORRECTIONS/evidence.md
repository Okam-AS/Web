# L-CENSUS-CORRECTIONS - evidence

Documents only. No code changed, no test edited, no suite run, no container started, no ref moved,
no migration authored. Subject commit for every measurement below: `OkamAPI` at **`8e2b57de`**
(`feature/restaurant-modules`), read out of the object database with `git archive` into a private
scratchpad - no worktree touched, so no sibling lane's dirty file could contaminate a reading.

Reproduction of the two trees this lane read:

    mkdir -p /tmp/snap-8e2b57de /tmp/prod-8e2b57de && cd <OkamAPI>
    git archive 8e2b57de WebApi.Tests | tar -x -C /tmp/snap-8e2b57de
    git archive 8e2b57de Services Controllers Helpers Models Middleware Program.cs Entities \
        Enums Repositories Validation Authorization Mcp Analytics ModelBuilders \
      | tar -x -C /tmp/prod-8e2b57de

Scripts in this directory, each re-runnable and each printing **per item**, never a bare count:

| script | what it answers | captured output |
|---|---|---|
| `recheck-alias-math.py` | window-by-window feasibility, self-overlap, exact DP, row 6 | `recheck-alias-math.txt` |
| `recheck-needles.py` | needle extraction Q1/Q1b/Q2/Q3/Q4 | `recheck-needles.txt` |
| `recheck-production-randomness.py` | production minters of non-hex randoms | `recheck-production-randomness.txt` |

`recheck-needles.py` reproduces the subject census's own raw span counts exactly -
`Assert.DoesNotContain` 439, `Assert.DoesNotMatch` 1, `Assert.False` 967, bare `!x.Contains` 66,
over 811 files - which is the control that says the two extractors are looking at the same tree.

---

## The six corrections, each with what falsified it

### 1. Aliasing census sec. 2 - the immunity rule was mis-derived

**Falsified by:** the Fable review of the census, and confirmed here at the producer.

The census enumerated randomness in the **test tree** and concluded "the only random fixture value in
the entire backend test tree is a v4 GUID", hence any needle with a character outside `[0-9a-f-]` is
`P = 0`. Haystacks, however, are composed by **production code the test invokes**, and production
mints wider alphabets (`recheck-production-randomness.txt`, per site):

- `Services/Growth/GrowthPreferenceTokenService.cs:51,57,103` - `ToUrlSafeBase64(RandomNumberGenerator.GetBytes(..))`, encoder at `:203` -> `[A-Za-z0-9-_]`
- `Services/Growth/GrowthAddressProtector.cs:275` -> `:297` - random 12-byte AES-GCM nonce, `Convert.ToBase64String` -> `[A-Za-z0-9+/=]`
- `Services/Workforce/WorkforceInvitationService.cs:527-528` - 32 CSPRNG bytes -> url-safe base64
- `Helpers/NumericConfirmationCode.cs:32-33` - `RandomNumberGenerator.GetInt32(100000, 1000000)`, decimal
- `Services/Meals/MealsInvitationTokenService.cs:43,52` and `MealsAuthorizationTokenService.cs:36,45` - HMAC/SHA-256 **over a `Guid.NewGuid()`**, base64url: derived from a random input, therefore unpredictable per run

**The census's own row 6 is the existence proof**: it found a production-minted non-hex random,
quantified it, and tabled it, while sec. 2 asserted no such value exists.

**Concrete falsifying site, read at the producer:** `Growth/GrowthAddressProtectorTests.cs:54`
asserts `DoesNotContain("roundtrip", protectedAddress.EncryptedAddress)`. The haystack is
`"{version}:" + base64(nonce || tag || ciphertext)` with a random nonce - 68 base64 characters, 60
nine-character windows. The census's rule calls this `P = 0` by alphabet. The true figure is
`60 x 64^-9` ~= `3.3e-15`: immune **by length**. One line above, `:53` searches
`"roundtrip@example.test"`, immune **by punctuation** (`@` and `.` are unspellable in base64). Two
different immunities one line apart, neither of them the one the rule named.

**Restated bound (now in sec. 2.2):** the hex filter is valid only against a GUID haystack; against
base64 the immunity is punctuation or length, per site; a base64 value derived from a random input is
as unpredictable as a random one.

**Class clear at this tip - and attributed.** The reviewer extracted all 14 short alphanumeric non-hex
needles and read each against its haystack. This lane re-extracted the class independently
(`recheck-needles.txt` Q1b: 23 sites at length <= 12, 19 at length <= 8, each printed with its call
text) and re-read **7 at the producer**: the only base64-bearing haystack among them is
`GrowthAddressProtectorTests.cs:54`. `PersonnelListProjectionTests.cs:51` ("Kari") searches
`ProtectedIdentityCodeRef` = `"wf-person:" + personId.ToString("D")`
(`Services/Workforce/WorkforcePersonnelListProjection.cs:277`) - a GUID haystack, rule 1 applies;
`GrowthAddressProtectorTests.cs:26-27` search a `Convert.ToHexString` HMAC (`:204`), hex and
deterministic; `GrowthConsentTextAuthoringTests.cs:333-334` ("Version", "Id", the two shortest) and
`EventsStateMachineTests.cs:233` ("T13") search **collections**, i.e. the equality overload. The other
16 rest on the reviewer's pass and the census now says so.

**The `Guid.NewGuid()` count.** Published as "900 in 277 files". **No method reproduces it**
(`recheck-needles.txt` Q4). Four counters over the same 811 files - exact text, whitespace-tolerant
regex, the same with comments masked, bare `NewGuid()` regardless of receiver - all return **966
occurrences on 940 lines in 287 files**; `grep -ro` returns 966, `grep -l` 287, `grep -c` summed 940.
Corrected to the reproducible figure, stated in all three units.

**Also flagged rather than silently overwritten:** the census's 174 literal needles split
12 / 3 / 71 / 88. The **15 survivors reproduce exactly** (12 digits-only + 3 hex-safe). The remainder
does not: this lane's re-extraction of the same forms yields 195 literal needles, 56
alphanumeric-non-hex and 124 punctuation-bearing (`recheck-needles.txt` Q1). The census's
classification step is not preserved in its lane scripts, so both partitions are printed side by side
rather than one quietly replacing the other. **The 159 exclusions still hold** - on the per-class,
per-site grounds above.

### 2. Aliasing census sec. 2.3 cross-check - the overlap argument

**Falsified by:** an exact per-window enumeration (`recheck-alias-math.txt`, sections A/B/C).

The census wrote that `22/16^3` "overstates `"250"` by ~10% because it **double-counts overlapping
windows**." Measured:

- `"250"` has **no proper prefix that is also a suffix**, so it **cannot overlap itself**; two
  occurrences must be disjoint. That multiplicity term is worth **0.20%** (`E[count] / P = 1.0020`).
- **2 of the 22** length-3 windows are **impossible**: the head of group 3 needs the **version
  nibble** (pinned `4`) to be `2`, and the head of group 4 needs the **variant nibble** (`{8,9,a,b}`)
  to be `2`. Printed per window. That is the **10.00%** term.
- Total overstatement `22/16^3` vs exact `P`: **10.22%**. Honest expected count is `20/16^3`.

The arithmetic itself re-derived a third time and unchanged: `"250"` `4.873107e-3`, `"2000"`
`2.288644e-4`, the pair **`5.101131e-3` = 1 in 196.0**, from a from-scratch prefix DP over exact
`Fraction`s (independent of the census's `alias-probability.py`).

### 3. Aliasing census sec. 2.3 - direction of the briefed figures

**Falsified by:** arithmetic on the census's own numbers (`recheck-alias-math.txt`, section D2).

"1 in 180" and "1 in 130" were called **optimistic**. `1/180 = 5.556e-3` and `1/130 = 7.692e-3` are
both **larger** than the true `5.101e-3` - by 8.9% and 50.8%. They predict the test flakes **more**
often than it does: they **overstate the failure rate**. (The empirically measured `1/197.6` is the
one marginally low, 0.8% under exact, well inside its own sigma.)

### 4. Aliasing census sec. 3.2 row 6 - wrong divisor, plus notation slop

**Falsified by:** the Fable review; re-derived here two ways (`recheck-alias-math.txt`, section E).

Published: "A GUID offers 10 six-char windows, of which `(10/16)^6 = 0.596` are all-decimal on
average, so `P = 0.596 / 900,000`" -> `6.623e-7` = 1 in ~1.51M.

- **Notation:** `(10/16)^6 = 0.0596`, not `0.596`. The value `0.596` is `10 x (10/16)^6`, the expected
  *number* of all-decimal windows - a count, not the per-window probability the formula names.
- **Divisor:** given an all-decimal window, the chance it equals a specific six-digit string is
  `10^-6` - the window ranges uniformly over all `10^6` decimal strings, including the 100,000 with a
  leading zero the generator can never draw. `900,000` is the size of the **needle's** code space,
  not the haystack's window space.

Correct: `10 x (10/16)^6 x 10^-6` = **`10 x 16^-6` = `5.960e-7` = 1 in 1,677,722**; the published
figure overstated by 11.1%. No six-character window touches the pinned version or variant nibble
(they sit only in the 4-character groups), so no lattice correction applies - checked per window.
Cross-checked with the same exact DP over concrete codes: `123456` and `100000` give `5.960e-7`;
`111111`, which self-overlaps, gives `5.662e-7`. So `10 x 16^-6` is exact for codes without
self-overlap and a tight upper bound otherwise. Verdict QUANTIFIED-SAFE unchanged.

### 5. Aliasing census - two false universals about assertion forms

**Falsified by:** the Fable review; both re-extracted here.

**(a) sec. 1, "absence with no needle".** The census excluded `Assert.Empty(` and `Assert.Null(`
because "they assert absence but search for nothing". **Two `Assert.Empty` sites carry a needle**
inside their filter (`recheck-needles.txt` Q3): `Wire/GrowthConsentAdminWireTests.cs:159`
(`e.Message.EndsWith("contactPointId=" + refusedContact.ContactPointId, ..)` - needle contains a whole
GUID, and `=` is outside `[0-9a-f-]`: immune by length and punctuation) and
`Workforce/WorkforceInvitationTests.cs:439` (`r.Scope.Contains("invitation.claim")` - immune by the
`.`). Verdicts stand, reason corrected. Span counts differ between instruments (this lane 361/608 vs
the census's 359/599); both are printed rather than one replacing the other, since the census's
counting method is not preserved.

**(b) sec. 3.6, the predicate overload.** The census wrote "120 of the 266 variable-needle sites pass
a lambda ... Predicate, not substring. **P = 0**." **19 of those 120 embed a literal substring
search** (`recheck-needles.txt` Q2 - 19 with an embedded literal, 101 without, **120 total**, which
reproduces the census's own denominator). Examples: `Events/EventsRunSheetDietaryTests.cs:52`
`i => i.Body.Contains("no dietary", ..)`, `Wire/WireContainmentTests.cs:65`
`f => f.Path.EndsWith("secrets.json", ..)`, `Wire/GrowthPrivacyNoticeDeliveryWireTests.cs:165`
`name => name.IndexOf("Delivered", ..) >= 0`. **All 19 remain immune - by alphabet** (every embedded
needle carries a non-hex letter), most also by a deterministic haystack. The overload semantics were
never the reason.

Same wrong-reason shape noted at sec. 3.4: rows 13-15 really are the equality overload, but row 17
(`Assert.False(name.EndsWith("Minor"))`) **is** a substring search - suffix-anchored - and is immune
by alphabet plus a deterministic reflected-name haystack.

### 6. DI census S9 - "Guarded today: NO" while the guard substantially exists

**Falsified by:** the Fable review, which read the two test files the census named but did not open;
re-read here in full.

`Modules/ModuleFeatureFlagContractTests.cs:302`,
`Every_discovered_family_is_concatenated_into_the_shared_catalog`, derives the family set exactly as
S9 asked - `ModuleFlagCensus.DiscoverFamilies()` (`ModuleFlagCensus.cs:124-142`) reflects over
`typeof(FeatureFlagDescriptor).Assembly.GetTypes()` for a public static parameterless `Describe()`
returning `IReadOnlyList<FeatureFlagDescriptor>` (`CatalogContribution`, `:149-162`) - then requires
each family to appear in the composition root (`:304-307`). `ModuleFlagCensus.cs:135` adds a
`families.Count >= 6` non-vacuity floor.

**It reds on exactly the mutation S9 names.** Each family's `X.Describe()` text occurs **once** in
`Program.cs`, at its own `AddRange` line - verified per occurrence: `WorkforceFeatureFlags` 761,
`EventsFeatureFlags` 762, `MarginFeatureFlags` 763, `TrainingFeatureFlags` 764, `GrowthFeatureFlags`
765, `MealsFeatureFlags` 766, and nowhere else in the file. Delete one `AddRange` and its family's
only occurrence goes with it.

**S9 reordered from `build` to `harden`**, with five residual gaps stated in the entry rather than the
row deleted: (1) it matches source **text**, never the catalog object, so
`Describe().Where(d => d.Key != "..")` stays green; (2) the singleton registration itself
(`Program.cs:767-768`) can be deleted with the test still green; (3) family granularity, not key
granularity; (4) the discovery predicate admits only one method shape; (5) the `400 "Unknown feature
flag"` write path is unmeasured.

**Three unstated instrument limits added** (`dicensus-tool.cs.txt`, by its own line numbers):

- **`:26-28` type-load fallback** returns `ex.Types.Where(t => t != null)` and `:28` prints only
  `TYPES 7500` - never `LoaderExceptions.Length`, never the number dropped. **`TYPES 7500` cannot be
  distinguished from "7,500 survived and N vanished."** Same shape at `:36`, `:40`, `:64`, `:68`
  (`catch { continue; }`). The inventory of 19 is a floor, not a proven ceiling.
- **`:134-137` extension-method dump is keyword-filtered** to eight substrings, printing **23
  `EXTSEAM` rows out of the 211 descriptors** those four methods produce (`EXT` lines in the dump:
  17 + 70 + 116 + 8). The full dump at `:196-203` iterates `services` only, never `extra`. F3 was
  found only because `IAuthorizationHandler` happened to be on that list.
- **`:222-229` `IsUninteresting`** drops `string`, primitives, `Guid`, `decimal`, dates and enums, so
  an `IEnumerable<string>` injection point never enters the inventory; `CollectionElement`
  (`:231-238`) recognises 1-D arrays plus six open generics only, so `IAsyncEnumerable<T>`,
  `ISet<T>`, `ImmutableArray<T>` and `IDictionary<,>` are invisible too.

**Two further `Main` registrations outside the reflectable seam**, correcting "registers directly
before it calls `AddServices`": `Program.cs:193` `AddScoped<ICartRepository, CartRepository>()` sits
**between** `AddServices` (`:192`) and `AddBuilders` (`:194`), and `Program.cs:197`
`AddSingleton<IRedisService, RedisService>()` sits **after both**. Both non-collection, so no verdict
moves - but the 289 dumped descriptors are not the whole composition root even for plain services.
(`:158` `AddSingleton(mcpStartupState)` registers an instance built at `:140`, which no reflectable
seam can produce at all.)

---

## Two consistency fixes the six required

Both are the same defect class as correction 6 - a summary asserting "no guard" where the document's
own body names one - and leaving them would have contradicted the corrected S9 row.

- DI census sec. 7 said "**none of the eight** guarded by a composition-root check today". **Two of
  the eight are**: S2 (`Wire/EventsWireTests.cs:61`) and S7 (`Wire/WorkforceWireTests.cs:213` plus
  `Margin/MarginFeatureFlagEffectiveTests.cs:102`). Corrected to: six carry no check, of which two
  (S1, S4) refuse by construction and four (S3, S5, S6, S8) have neither - **both money-path sites
  among the four**.
- DI census sec. 6 called `CompositionRootLimiterWireTests` "**the only** existing composition-root
  check". Corrected: it is the only **descriptor-level** one; three others assert composition-root
  facts by resolving it and a fourth reads `Program.cs`.

## Observed, deliberately NOT changed (outside the six)

`lanes/L-ALIASING-NEEDLE-SWEEP/census.md` sec. 3.5, the row 19 cell, contains a literal `|` inside
`string.Join("|", pd.Title, pd.Detail, ...)`. Markdown splits table cells on `|` even inside
backticks, so that row renders with one column too many. Pre-existing, cosmetic, changes no claim -
recorded here rather than silently edited, because it is not one of the six corrections and the fix
(escaping it as `\|`) belongs to whoever next owns that document. Every other table in both censuses
was checked column-by-column against its header and separator, and all of them are well-formed.

## What was NOT changed

- **No verdict, site, row or finding was removed from either census.** Every correction rewrites a
  reason or a figure and keeps what was found.
- **Nothing that would need a code change was made.** The floors S5/S6/S8/S3/F1/F2 still need
  building, S9 still needs hardening, and rows 1-2 of the aliasing census still need one of the two
  unmerged branches landed. This lane is documents only.
- The unreproducible partitions (`174 / 71 / 88`, `Assert.Empty` 359, `Assert.Null` 599) were **not
  overwritten** with this lane's numbers; both are shown, because replacing an unattributed number
  with another unattributed number is the failure being corrected.
