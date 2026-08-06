# L-WF-CORRECTION-PINS - mutation log

Five conditions attached to the Fable approval of `L-WF-CORRECTION-PATH`. Every pin below was watched
FAIL against a deliberate mutation and watched PASS again after restore. Where the reviewer's finding was
"this guard is a formality", the log also carries the COUNTERFACTUAL - the same mutation against the
pre-pin code, staying green - because that is the whole content of the finding.

## Where

| | branch | worktree | base |
|---|---|---|---|
| backend | `lane/wf-correction-path` | `/Users/svendaneel/okam/OkamAPI-wfcorrect` | `305dbe79` |
| frontend | `lane/fe-wf-correction-path` | `/Users/svendaneel/okam/web-wfcorrect` | `6a641bc7` |

Container-free tier only (`--filter "Database!=SqlServer"`). No container was started. No migration authored.
`feature/restaurant-modules` was not moved.

## Baselines (before any edit)

| run | result |
|---|---|
| `Rowversion + PersonnelListCorrection + WorkforceFlagConsumption + ModuleFeatureFlagContract + WorkforceStageFlagGate` | 29/29 pass |
| `WorkforceWireTests` | 22/22 pass |
| `jest test/workforce-personnel-list.test.js` | 32/32 pass |

---

## Item 1 - the rowversion allowlist entries name whole methods

`WebApi.Tests/Modules/RowversionAssertionProviderTests.cs:129,137` matched by `Contains` on the fragments
`already_superseded` / `already_replaced` across whole files. Widened to
`Correcting_an_entry_a_later_row_already_superseded_is_refused_and_appends_nothing` and
`Correcting_an_entry_that_a_later_row_already_replaced_is_refused_and_appends_nothing`.

**Mutation.** Added the reviewer's own example to `WebApi.Tests/Wire/WorkforceWireTests.cs` - a `[Fact]`
named `MUTATION_An_award_already_replaced_is_refused_on_a_stale_If_Match_revision` naming
`WorkforceErrorCodes.StaleRevision` over an HTTP `client`, i.e. exactly the shape the scan is built to
condemn.

| state | `RowversionAssertionProviderTests` |
|---|---|
| PINNED (full method names) + decoy | **RED 1/5** - `EveryRowversionRefusalIsTraitedSyntheticOrAssertsItsOwnPremise`, offender reported as `Wire/WorkforceWireTests.cs: WorkforceWireTests.MUTATION_An_award_already_replaced_is_refused_on_a_stale_If_Match_revision` |
| COUNTERFACTUAL (fragments restored) + decoy | **GREEN 5/5** - sheltered silently, which is the finding |
| PINNED, decoy removed (restore) | **GREEN 5/5** |

`EveryAllowlistEntryStillMatchesRealCode` passes in all three states, as predicted: it only asks whether
SOME method in the file matches, so it can never see this. That is recorded in the file's own comment now.

## Item 2 - the stale-revision frontend test reds if the client resolves

`test/workforce-personnel-list.test.js`, last test. Asserted only inside a bare `.catch()`. Now guarded with
`await expect(...).rejects.toMatchObject({ status, code, conflictKind })` first, matching the 403 test one
screen up.

**Mutation.** `utils/workforce/api-client.js:150`, the one throw site, changed to
`if (!response.ok && response.status !== 409)` - the client RESOLVES on 409.

| state | `jest test/workforce-personnel-list.test.js` |
|---|---|
| PINNED (`rejects` first) + resolving client | **RED 1 failed / 31 passed** - the stale-revision test |
| COUNTERFACTUAL (bare `.catch()`) + resolving client | **GREEN 32/32** - zero assertions ran, exactly the finding |
| PINNED, client restored | **GREEN 32/32** |

`utils/workforce/api-client.js` is byte-identical to the branch; only the test file is modified.

## Item 3 - the flag census probes the correction route

`WorkforceFlagCensus.Mutations` gained
`POST   /workforce/{store}/personnel-list/entries/{id}/corrections`, driven through the real
`WorkforcePersonnelListController` over a window folded by the clock projection
(`SeedCorrectableWindowAsync`). `WorkforceFlagConsumptionTests.ExpectedGates` records the expected refusal:
the module master only.

**Mutation.** Gave the withheld key a real enforcement point - in
`WorkforcePersonnelListService.CorrectEntryAsync`, `RequireCapabilityAsync(...)` replaced by
`RequireWriteCapabilityAsync(..., WorkforceFeatureFlags.PersonnelList, ct)`.

| state | `WorkforceFlagConsumptionTests` + `ModuleFeatureFlagContractTests` |
|---|---|
| PINNED (probe present) + gate | **RED 2/10** - `Seven_of_the_nine_declared_workforce_flags_gate_a_request_and_the_two_withheld_ones_gate_nothing` (actual gained the correction row) and `Every_behavioural_probe_reaches_its_whole_mutation_surface_with_all_flags_on` |
| COUNTERFACTUAL (pre-pin `Mutations`, probe removed) + gate | **GREEN 10/10** - `workforce.personnel-list` gating a live write while `WorkforceFeatureFlags.Withheld` still asserts it can have none |
| PINNED, gate restored | **GREEN 10/10** |

The counterfactual is the finding stated exactly: before this probe, the sentence "the two withheld keys
gate nothing" was unmeasured for the only write that key could gate.

A side effect worth recording: `Every_behavioural_probe_reaches_its_whole_mutation_surface_with_all_flags_on`
passes in the pinned state, which is independent proof that the correction probe is REACHED and ACCEPTED at
baseline rather than refused for some unrelated reason.

## Item 4 - a correction that moved neither time stops auditing a field it did not change

`WorkforcePersonnelListService.ChangedFields` returned `adjustedField: "onSiteEnd"` when neither time moved.
Now returns `"none"`. New pin:
`PersonnelListCorrectionTests.A_correction_that_moves_neither_time_audits_no_field_rather_than_the_departure`,
which derives both wall-clock times FROM the stored instants through the store's own zone, so it is a
genuine no-op on any zone, and reads the delta by KEY (`JsonConvert.DeserializeObject<Dictionary<..>>`)
rather than by substring.

**Mutation.** Reverted `ChangedFields` to the pre-pin shape (`return "onSiteEnd";` in the moved-neither
branch).

| state | `PersonnelListCorrectionTests` |
|---|---|
| MUTATED | **RED 1/10** - `Assert.Equal() Failure / Expected: none / Actual: onSiteEnd` |
| RESTORED | **GREEN 10/10** |

The pre-existing `The_correction_is_audited_as_shape_only_...` is unaffected: its correction genuinely moves
the departure, so it still reads `onSiteEnd` honestly.

## Item 5 - backend zone coercion

`WorkforcePersonnelListController.CorrectEntry` now refuses a non-`Unspecified` `Kind` on BOTH times with a
`ModuleProblem` (400) before the ordering check and before the entry lookup. New pin:
`WorkforceWireTests.A_correction_whose_time_carries_a_zone_is_refused_on_both_fields_and_appends_nothing`,
at the wire tier because the coercion is what the Newtonsoft binder does to a LITERAL - a service-tier test
hands the controller a `DateTime` whose `Kind` it chose itself and can never see it. Both refusals are read
out of the RESPONSE BODY (`detail` naming the field and the phrase `no Z and no UTC offset`), never from the
status alone.

Three mutations, because "on both start and end" is two claims:

| mutation | `WorkforceWireTests` |
|---|---|
| whole guard removed | **RED** at `WorkforceWireTests.cs:296` (the arrival assertion) - `Expected: BadRequest / Actual: Conflict`: the zone-carrying body was accepted as a valid shape and passed into the service |
| DEPARTURE half removed, arrival kept | **RED** at `WorkforceWireTests.cs:307` (the departure assertion) - `Expected: BadRequest / Actual: Conflict` |
| ARRIVAL half removed, departure kept (test run in isolation) | **RED** at `WorkforceWireTests.cs:296` - `Expected: BadRequest / **Actual: OK**` - the live defect: `2026-07-06T09:00:00Z` was ACCEPTED and written to the statutory register as 09:00 venue wall clock |
| RESTORED | **GREEN 23/23** |

The third row is the one that matters. Run against an entry no earlier test had superseded, the unguarded
controller returned 200 for an instant sent by a third-party caller.

---

## Regression

| tier | result |
|---|---|
| backend, whole container-free tier (`--filter "Database!=SqlServer"`) | **4401 passed, 0 failed, 12 skipped**, 5 m 46 s |
| frontend, whole jest suite (with `core` copied in, as the worktree requires) | **2491 passed, 1 failed**, 109/110 suites |

### The one frontend red, named

`test/journey-artifact-store.test.js > backend identity > asks whoever is holding the port what directory
they are running from`.

```
Expected pattern: /^Web-modules@[0-9a-f]{40}(\+dirty)?$/
Received string:  "web-wfcorrect@6a641bc79c80710a765acee079a9f84f7b5ce527+dirty"
```

It asserts the checkout answering on the port is DIRECTORY-NAMED `Web-modules`. This lane works in the
worktree `web-wfcorrect`, so the test reads its own directory name back. Environmental, pre-existing,
unrelated to any file this lane touched, and it passes in the canonical checkout.

Three further suites fail in a bare worktree - `core-price-label`, `core-request-path-shape`,
`price-absence` - all with `Could not locate module ~/core/...`: `core` is a submodule path and the worktree
gets it empty. Copying `core` in turns all three green (36/36), which is the run recorded above. The copied
`core` was removed afterwards; the worktree carries only the one modified test file.

## Files changed

Backend (`lane/wf-correction-path`):

- `Controllers/WorkforcePersonnelListController.cs` - item 5
- `Services/Workforce/WorkforcePersonnelListService.cs` - item 4
- `WebApi.Tests/Modules/RowversionAssertionProviderTests.cs` - item 1
- `WebApi.Tests/Wire/WorkforceWireTests.cs` - item 5 pin
- `WebApi.Tests/Workforce/PersonnelListCorrectionTests.cs` - item 4 pin
- `WebApi.Tests/Workforce/WorkforceFlagCensus.cs` - item 3 probe
- `WebApi.Tests/Workforce/WorkforceFlagConsumptionTests.cs` - item 3 expected map

Frontend (`lane/fe-wf-correction-path`):

- `test/workforce-personnel-list.test.js` - item 2

`artifacts/journeys/ev-dietary/run-sheet.{json,md}` were dirtied by the wire tier as documented and
restored, not committed.
