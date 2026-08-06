# Does a cited trx contain the tests its commit adds?

Lane L-TRX-CONTAINS-WHAT-IT-CLAIMS · brief 3ba625f7 · derived 2026-08-06 · read-only, no suite re-run.

**Population.** Every item in `docs/plan/plan.md` whose `evidence:` field names a trx: **20 lanes, 25 cited trx.**
Six further items mention a trx only in prose (`D-SPEC-L-TIER-ARTIFACTS`, `F-BE-TESTS-AMBIGUOUS`,
`F-CONFIRM-MERGE-RECEIPT-TRAP`, `H-REFERRAL`, `L-COMPOSE-CENSUS`, this lane) and cite none as evidence — out of population.

**Method.** For each cited trx: resolve the code commit named in the evidence line (all in repo **OkamAPI**,
object database `/Users/svendaneel/okam/OkamAPI/.git`, read by object); enumerate the `[Fact]`/`[Theory]`
methods that commit *adds* (declaration line added, attribute present in the post-commit tree) and those it
*modifies* (body touched, declaration not added); then match each fully-qualified name against the
`UnitTestResult/@testName` entries in the trx, allowing a prefix match for `[Theory]` rows that carry their
arguments. Run mode is inferred from the trx itself, not assumed: the set of tests carrying
`[Trait("Database","SqlServer")]` at that commit (558 at 3a4442a7) is intersected with the trx, so a run
holding none of them is a `Database!=SqlServer` run and a run holding only them is a SqlServer-only run.

## Totals

| category | count |
|---|---|
| tests the 20 commits add | **147** |
| present in the cited trx | **125** (117 exact, 8 matched as `[Theory]` rows) |
| **absent, unexplained — the finding** | **11** |
| absent because a trait filter correctly excluded them | 14 |
| absent because declared `Skip=` | 0 |
| tests the commits modify rather than add | 30 (26 present, 1 absent, 3 in filtered runs) |
| lanes with no reachable commit | 0 |
| trx unreadable | 0 |
| trx truncated | 0 |
| commits that legitimately add no tests | 3 entries (see below) |

**One lane falls short: `L-TRAIN-DISCLOSURE`.** The other 19 are sound.

## The shortfall

### L-TRAIN-DISCLOSURE — OkamAPI `06b8b582`, `artifacts/tests/L-TRAIN-DISCLOSURE/after.trx`

claimed **14** added tests · present **3** · **missing 11** · filtered 0 · skipped 0. One modified test also absent.

The trx is **not a pass**. Its own `ResultSummary` reads `outcome="Failed"` while `Counters` reads
`failed="0"` — the signature of a run that was aborted rather than one that failed a test. Its `RunInfo`
carries `The active test run was aborted. Reason: Test host process crashed`, an
`ObjectDisposedException` on a `JsonDocument` raised inside `Xunit.Sdk.AllException.get_Message` — an
`Assert.All` failure whose own message formatting threw and took the host down with it.
It recorded **962** of roughly 4,400 tests and ran 87 seconds (16:22:26 to 16:23:53).

The crash lands **inside the lane's own new test class**: the last eight results by `endTime` are all
`WebApi.Tests.Wire.TrainingWireTests`. So the receipt did not merely undercount — a failing assertion in
this lane's own work crashed the tier, and the artifact cited as the lane's evidence contains neither the
failure nor the tests that provoked it.

Absence here is **unrun, not filtered**: none of the 11 carries a trait, the run holds no SqlServer-trait
test at all (so no filter could touch them), 96 sibling `WebApi.Tests.Training` tests and 12 sibling
`WebApi.Tests.Wire.TrainingWireTests` tests *are* in the trx. The class ran; these did not.

Neither the `evidence:` line nor the lane body discloses the abort, the crash or the partial count.

Missing — 2 of the 3 wire tests, the class the crash sits in:
- `WebApi.Tests.Wire.TrainingWireTests.Reading_the_disclosure_log_is_itself_recorded_and_the_subject_sees_who_looked`
- `WebApi.Tests.Wire.TrainingWireTests.The_person_a_record_is_about_can_see_who_read_it_and_sees_no_other_stores_or_persons`

Missing — the entire new `TrainingDisclosureLogTests` class, 0 of its rows in the trx:
- `WebApi.Tests.Training.TrainingDisclosureLogTests.A_caller_who_names_nobody_and_is_nobody_is_refused_rather_than_answered_empty`
- `WebApi.Tests.Training.TrainingDisclosureLogTests.A_managers_read_of_the_log_is_recorded_and_the_subject_sees_it`
- `WebApi.Tests.Training.TrainingDisclosureLogTests.A_never_enabled_store_is_the_opaque_404_on_both_branches`
- `WebApi.Tests.Training.TrainingDisclosureLogTests.A_refused_read_of_the_log_writes_no_disclosure`
- `WebApi.Tests.Training.TrainingDisclosureLogTests.Each_entry_carries_the_ledger_row_verbatim`
- `WebApi.Tests.Training.TrainingDisclosureLogTests.Naming_another_person_never_admits_a_caller_on_the_subject_branch`
- `WebApi.Tests.Training.TrainingDisclosureLogTests.Neither_disclosure_event_type_reaches_the_evidence_packs_audit_chain`
- `WebApi.Tests.Training.TrainingDisclosureLogTests.The_log_returns_every_reader_of_this_persons_record_in_this_store_and_no_other_row`
- `WebApi.Tests.Training.TrainingDisclosureLogTests.The_subject_reads_their_own_log_through_a_gate_that_refuses_everyone_else`

Modified by the commit and also absent (same class as the crash):
- `WebApi.Tests.Wire.TrainingWireTests.An_evidence_read_records_who_asked_attributed_to_the_token_the_bearer_handler_resolved`

## The other 19 lanes

| lane | repo · commit | cited trx | added | present | missing | filtered | note |
|---|---|---|---|---|---|---|---|
| L-REVIEW-RESIDUALS | OkamAPI `3bdef5c6` | `3bdef5c6-fast-tier.trx` | 0 | 0 | 0 | 0 | adds no tests; strengthens 3 existing, 3 present |
| L-REVIEW-RESIDUALS | OkamAPI `4a9cbb9c` | `4a9cbb9c-fast-tier.trx` | 3 | 3 | 0 | 0 | clean |
| L-TRAIN-EVIDENCE-NAMES-COURSE | OkamAPI `fcb5181a` | `after.trx` | 9 | 9 | 0 | 0 | clean |
| L-PDF-NULLDEREF | OkamAPI `2497ce9d` | `2497ce9d-fast-tier.trx` | 13 | 13 | 0 | 0 | clean |
| L-FLAGS-EFFECTIVE-RESOLVERS | OkamAPI `e45ec4c1` | `fast-tier.trx` | 15 | 15 | 0 | 0 | clean |
| L-EV-REFUND-FAKE-ARG | OkamAPI `db9b39a1` | `commit-events-fast.trx` | 5 | 5 | 0 | 1 | non-sql run |
| L-EV-REFUND-FAKE-ARG | OkamAPI `db9b39a1` | `commit-events-sqlserver.trx` | 5 | 0 | 0 | 7 | sql-only run |
| L-GR-CONFIRMED-EMAIL | OkamAPI `a7697121` | `a7697121-fast-tier.trx` | 1 | 1 | 0 | 0 | clean |
| L-GR-TESTSEND-RATELIMIT | OkamAPI `c96cd21e` | `lane-fast-tier.trx` | 27 | 27 | 0 | 0 | clean |
| L-GR-DEADLINE-STATUTE | OkamAPI `f7abfd8e` | `growth-scoped.trx` | 3 | 3 | 0 | 0 | clean |
| L-WF-EXPORT-DUPLICATE | OkamAPI `3a4442a7` | `fast-tier.trx` | 3 | 0 | 0 | 3 | non-sql run |
| L-WF-EXPORT-DUPLICATE | OkamAPI `3a4442a7` | `sql-tier-workforce.trx` | 3 | 3 | 0 | 0 | clean |
| L-WF-EXPORT-DUPLICATE | OkamAPI `3a4442a7` | `export-duplicate-race.trx` | 3 | 3 | 0 | 0 | clean |
| L-MEALS-SUPERSEDE-SQL | OkamAPI `7dafec47` | `supersede-sql-clean.trx` | 3 | 3 | 0 | 0 | clean |
| L-MEALS-SUPERSEDE-SQL | OkamAPI `7dafec47` | `trait-guard.trx` | 3 | 0 | 0 | 3 | non-sql run |
| L-MEALS-FOURWAY-TIER | OkamAPI `f72c7a81` | `f72c7a81-fourway-fast-tier.trx` | 9 | 9 | 0 | 0 | merge, diffed against first parent |
| L-GR-CONFIRMED-PIN-FIX | OkamAPI `3cf288fb` | `3cf288fb-fast-tier.trx` | 0 | 0 | 0 | 0 | adds no tests; strengthens 2 existing, 2 present |
| L-GR-CONFIRM-STALE | OkamAPI `771c0fc0` | `771c0fc0-fast-tier.trx` | 4 | 4 | 0 | 0 | clean |
| L-CONFIRM-SERVER-HALVES | OkamAPI `8704ff63` | `lane-confirm-halves-fast-tier.trx` | 7 | 7 | 0 | 0 | clean |
| L-COMPOSITION-ROOT-CHECK | OkamAPI `bfe57c3c` | `lane-composition-root-fast-tier.trx` | 8 | 8 | 0 | 0 | clean |
| L-CRYPTO-PIN-BYFORM | OkamAPI `35630600` | `lane-crypto-pin-byform-fast-tier.trx` | 4 | 4 | 0 | 0 | clean |
| L-INVOICE-RETRY-RETIREMENT | OkamAPI `f18ffeda` | `f18ffeda-fast-tier.trx` | 0 | 0 | 0 | 0 | adds no tests; strengthens 4 existing, 4 present |
| L-EV-OUTBOX-GUID-SUBSTRING | OkamAPI `79f9dd7d` | `after-lane.trx` | 3 | 3 | 0 | 0 | clean |
| L-WF-WITHHELD-BOUND | OkamAPI `74405b34` | `final-workforce.trx` | 2 | 2 | 0 | 0 | clean |

## What the honest categories cost, and why they are counted apart

**Filtered is not missing (14).** `L-WF-EXPORT-DUPLICATE` and `L-MEALS-SUPERSEDE-SQL` each add three
`Database=SqlServer` tests that are absent from the fast tier they cite — correctly, since that run holds
0 of the 558 SqlServer-trait tests in the tree. Both lanes **also cite a SqlServer tier that contains all
three**, so the pair of receipts is complete. `L-EV-REFUND-FAKE-ARG` is the same in the other direction:
its five new tests are absent from the 25-row SqlServer trx and present in the 460-row fast trx. A first
pass that ignored run mode scored all 14 of these as shortfalls — they are not.

**Commits that legitimately add no tests (3).** `L-INVOICE-RETRY-RETIREMENT` (`f18ffeda`) adds a private
helper and strengthens two existing tests; `L-GR-CONFIRMED-PIN-FIX` (`3cf288fb`) and
`L-REVIEW-RESIDUALS`/provider (`3bdef5c6`) likewise modify rather than add. For these the question becomes
whether the *modified* tests are in the trx — all are. Scoring them as "0 claimed, 0 missing" would be
true but empty; scoring them as shortfalls would be false.

**`[Theory]` naming (8).** Eight present tests matched only after stripping the argument list a trx row
carries (`Method(entryPoint: "context.get")`). Exact-name matching alone would have reported 8 false
shortfalls.

**A disclosed red is not a shortfall.** `L-COMPOSITION-ROOT-CHECK`'s trx also reads `outcome="Failed"`,
with `failed="1"` — `CompositionRootLimiterWireTests.The_reservation_limiter_still_resolves_after_the_failure`,
one of the lane's own eight new tests. Unlike L-TRAIN-DISCLOSURE this is **declared**: the evidence line
states `4419/4406/1/12` and the body says it left that test red on purpose, awaiting a sibling. All eight
added tests are in the trx. Honest receipt, so it is not counted as a shortfall.

## Two instrument readings worth keeping

1. **Presence of the tests is not sufficient.** L-COMPOSITION-ROOT-CHECK shows a trx can hold every test a
   commit adds and still not be a pass. Checking `ResultSummary/@outcome` against `Counters/@failed` is one
   cheap read that catches an aborted run, and it is the read that exposes L-TRAIN-DISCLOSURE. Of 25 cited
   trx, **23 read `Completed`, 2 read `Failed`** — one disclosed, one not.
2. **A trx count in an evidence line is not a tier result.** "962" is a partial run terminated by a crash.
   Nothing in the evidence line distinguishes it from a clean 962-test scoped run. The count alone cannot
   carry that, which is why C5 refuses a `.trx` as acceptance evidence in the first place.

## Provenance

Derivation scripts and the machine-readable result are in this directory: `derive.py`, `run.py`,
`report.json`, `lanes.json`. No suite was run, no container touched, no trx regenerated. Raw suite stdout
was not copied out of any artifact (C7); the abort reason above is a distilled stack trace carrying no
token or credential.
