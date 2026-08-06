# L-FRAGILE-NEEDLES - mutation log

The mirror of the aliasing family. An aliasing needle fails at random because the haystack contains
something; these three passed reliably because the haystack contains **nothing** - and in both cases the
truth of the assertion rests on a property nobody declared.

All three were **measured, not reasoned about**: a temporary probe printed each haystack out of a real
run before a line was changed. Every haystack held **zero digits**.

## Where

| | value |
|---|---|
| repo | OkamAPI |
| branch | `lane/fragile-needles` (local, unpushed) |
| worktree | `/Users/svendaneel/okam/wt-fragileneedles` |
| base | `8e2b57de` (`feature/restaurant-modules`) - **brief claim VERIFIED**, and verified unmoved at end: `8e2b57de` |
| commit | `f2517d5d` |

The brief's tip claim was correct. `integration/mig-stack-land` was not used. The three files were first
read out of the object database with `git archive 8e2b57de`, not out of `/Users/svendaneel/okam/OkamAPI-modules`,
which is dirty with another lane's WIP on `lane/meals-grace-pins`.

Container-free tier only (`--filter "Database!=SqlServer"`, never `FullyQualifiedName!~SqlServer`).
**No container was started and none was touched.** No migration authored. Nothing pushed. No shared ref
moved. `docs/plan/**` untouched except this file and the RETURN. **Tests only - no production file is in
the commit.**

## What was actually there

| site | needle | haystack, as measured |
|---|---|---|
| `WebApi.Tests/Growth/GrowthErasureRefCountTests.cs:130` | `StoreB.ToString()` = `"8"` | `{"outcome":"Fulfilled","type":"Erasure","steps":[...],"noticeDelivery":"SubmittedToTransport","addressDestroyed":false,"addressDestroyedAt":null,"resolvedBy":"privacy-admin","addressDestroyedBy":null}` |
| `WebApi.Tests/Events/EventsTenantIsolationSweepTests.cs:97-98` | `"6"` (event id) and `"2"` (store id) | `Not Found\|The requested event was not found.\|https://okam.no/problems/events/EVENTS_NOT_FOUND\|\|code=EVENTS_NOT_FOUND\|traceId=events-isolation` |
| `WebApi.Tests/Margin/MarginTenantIsolationSweepTests.cs:167-168` | `"2"` (store id); the recipe id is a 36-char GUID and is fine | `Not Found\|The requested margin resource was not found.\|https://okam.no/problems/margin/not-found\|\|code=margin.not-found\|traceId=margin-isolation` |

Not one digit in any of the three. The store ids are `1` and `2` (sequential SQLite identity), the Events
fixture's accepted event is id `6`, and Growth's `StoreB` is the literal `8`.

## The fix, and which of the two options each site took

**Both**, at every site - excise the parts that may legitimately carry digits, *name them*, and pin by
value that what remains carries none. "Carries no digit at all" is what "names no id and carries no count"
actually means, and it is strictly stronger than a search for one particular character.

**Growth** (`AssertNamesNoOtherController`) - pin the emptiness, then excise:
- pins `addressDestroyed` false and `addressDestroyedAt` / `addressDestroyedBy` **null, by member name,
  with a message that says what to do next**;
- excises instants **by TYPE**, not by name - Json.NET reads an ISO-8601 value as a `Date` token, so a
  timestamp member nobody has written yet is covered;
- then asserts the remainder holds no digit.

**Events** (`RenderComparable` + `AssertCarriesNoIdentifier`) and **Margin** (`AssertCarriesNoIdentifier`,
reusing the file's existing full-document `Answer`) - excise, then pin:
- leg (a): the refusal must be **identical to the one an id that never existed produces**. That is the
  invariant both class comments already claim, it is digit-agnostic, and it stays green through any
  diagnostic member the renderer later grows, because the absent-id control grows the same one;
- leg (b): with the correlation id and the problem-**TYPE** URI excised by name - RFC 9457 sec. 3.1 makes
  `type` an identifier of the KIND of problem, never of the occurrence - what remains holds no digit.

`Render` is deleted from both sweeps (it had exactly one caller each).

## Non-vacuity - eight states, all watched

Three mutants, each a shape the future would plausibly produce. **All three are PRODUCTION mutants**, so
the assembly that must move is `WebApi.dll`; `WebApi.Tests.dll` moves only when the test tree changes.
Both mtimes were read on every run. Never `--no-build`; every restore bumps the source mtime explicitly,
because a preserved timestamp is exactly what makes MSBuild skip the rebuild and measure the previous
binary (CLAUDE.md).

- **M1 - an INNOCENT digit arrives.** Growth: the deferred receipt carries `"deferredAt"`. Events/Margin:
  the problem-type URI gains a `v2/` version segment. Neither says anything about another controller or
  another tenant.
- **M2 - the DISCLOSURE arrives, as a COUNT.** Growth: `"otherControllerCount":1`. Events/Margin:
  `otherTenantMatchCount=1`. This is precisely what both original comments warn about - *"a count leaks it
  just as well as an id"*.
- **M3 - the emptiness itself moves.** The deferred receipt starts naming a destroyer
  (`addressDestroyedBy = "deferred-shred-scanner"`). Digit-free, so no digit pin can see it.

| # | test tree | mutant | Growth | Events | Margin | WebApi.dll | Tests.dll |
|---|---|---|---|---|---|---|---|
| S1 | old | none | PASS | PASS | PASS | 13:53:16 | 13:53:26 |
| S2 | old | M1 | **FAIL** | **FAIL** | **FAIL** | 13:53:54 | 13:54:04 |
| S3 | new | M1 | PASS | PASS | PASS | 13:54:32 | 13:54:44 |
| S4 | new | none | PASS | PASS | PASS | 13:55:14 | 13:55:25 |
| S5 | old | M2 | PASS | PASS | PASS | 13:55:55 | 13:56:08 |
| S6 | new | M2 | **FAIL** | **FAIL** | **FAIL** | 13:56:34 | 13:56:43 |
| S7 | old | M3 | PASS | - | - | 13:58:28 | 13:58:37 |
| S8 | new | M3 | **FAIL** | PASS | PASS | 13:59:46 | 13:59:57 |

S1 -> S2 -> S3 alternates green/red/green, which rules out both instrument traps at once: a mutation
applied to a tree other than the one being measured yields a green mutant (S2 is red, so the mutant landed
in the measured tree), and a stale binary yields a red restore (S3 and S4 are green, so the restore
compiled). `WebApi.dll` moved on every state change; the mutants are in production, not in the test
assembly.

### S2 - the old form goes red for a reason having nothing to do with disclosure

```
Assert.DoesNotContain() Failure
Found:    8
In value: {... ,"addressDestroyedBy":null,"deferredAt":"2026-08-04T12:00:00+00:00"}

Assert.DoesNotContain() Failure
Found:    2
In value: Not Found|The requested event was not found.|https://okam.no/problems/events/v2/EVENTS_NOT_FOUND||code=EVENTS_NOT_FOUND|traceId=events-isolation
```

### S5/S6 - the sharper half: the old form does not merely over-fire, it UNDER-fires

**S5 is the finding.** With the count leak live in production, all three original assertions pass. A
`DoesNotContain("8")` cannot see `"otherControllerCount":1`, and `DoesNotContain("2")`/`("6")` cannot see
`otherTenantMatchCount=1`. The one disclosure each comment explicitly names is the one the assertion was
blind to. At S6 the new form catches all three, and says why, locally:

```
a deferred erasure resolution must carry no digit - an id and a count disclose the other controller
equally well - but it carries '1': {...,"otherControllerCount":1}

a refusal must name neither an id nor a count of matching rows - both disclose the resource it declined
to describe - but it carries '1': Not Found|The requested event was not found.||code=EVENTS_NOT_FOUND|otherTenantMatchCount=1
```

### S8 - the emptiness pin fires on the member that moved

```
a deferred shred has destroyed nothing, so 'addressDestroyedBy' must still be null - it is
deferred-shred-scanner. If that is now intended, excise it below alongside the instants rather than
letting the digit pin go red for no visible reason.
```

The first draft used `Assert.Equal(JTokenType.Null, ...)`, which failed with only `Expected: Null /
Actual: String` and named no member. It was rewritten to the message above and re-proved (S8 red, S4
green) before the commit.

## No failure failed to reproduce

Every red above reproduced on the state it was designed for and on no other. No test was observed failing
for a cause that could not be re-created.

## Regression

Full container-free tier at the fix-only state:
`Passed! - Failed: 0, Passed: 4638, Skipped: 12, Total: 4650, Duration: 6m28s`.

The run dirtied `artifacts/journeys/ev-dietary/run-sheet.{json,md}` as the brief predicted. Restored with
`git checkout --`, not committed; the commit is the three test files and nothing else.

## Is there a fourth site?

A derived scan of all 811 test files - balanced-paren extraction of every `Assert.DoesNotContain` /
`DoesNotMatch`, keeping any whose first argument is a string literal of <=2 characters or a non-GUID
`.ToString()` - returned 35 candidates. Resolved one by one:

- **the 3 named sites** - fixed here;
- **every other rendered id needle is long**: `HiddenStoreId` = `90003`, `OldRateMinor` = `21_500`,
  `NewRateMinor` = `23_000`, and the rest (`HiddenStaffId`, `HiddenAssignmentId`, `HiddenRevisionId`,
  `HiddenPublicationId`, `HiddenRoleId`, `HiddenConflictStaffId`, `EmployeeMembershipId`,
  `NotificationTokenInStoreA`, the `Worker` constants, `world.B.RecipeId`) are all 36-character GUIDs;
- **the short literals are a different family**: `"@"`, `"#"`, `"-"`, `"{"`, `"Id"` assert a redaction
  happened, and their truth does not rest on the haystack being empty of anything else;
- **`SaftCashRegisterExportServiceTests.cs:171` `DoesNotContain("0", vatCodes)` is the equality overload**
  over a `List<string>`, not a substring search - it asserts no element *equals* `"0"`. Not this family.

So the census's count of three was right, and after this lane **no absence assertion in the tree depends
on a field being unpopulated.**

## Limits

- The three fixes are pinned against the *current* fixture worlds. Both sweeps build every controller on a
  `DefaultHttpContext` with a fixed `TraceIdentifier`, so leg (a)'s document-equality is safe today; if
  those fixtures ever emit a per-request correlation id, Margin's `Answer` (which deliberately includes
  `traceId`, and says so at its declaration) breaks first - that is a pre-existing property of that file,
  not something this lane introduced, and Events' `RenderComparable` already excises it.
- M1's Growth instant is a fixed literal rather than the fixture clock. **Deliberately**: the fixture
  clock reads `2026-07-20T13:00:00+00:00`, which contains no `8`, so the real clock would have left the
  old assertion GREEN. That is a sharper statement of the defect than the mutant is - the original
  assertion's colour depended on the digits of the wall clock - and it is why the mutant uses an instant
  that does contain an `8`.
- Nothing here says the Events or Margin modules are free of tenant leaks; it says these three assertions
  now fail when one appears and pass when one does not.
