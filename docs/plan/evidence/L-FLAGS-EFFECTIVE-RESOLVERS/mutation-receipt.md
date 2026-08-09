# L-FLAGS-EFFECTIVE-RESOLVERS — the red the exit turns on

Reason-shape hit: **(2) the artifact records a GREEN run where the exit demands a RED.** The lane's only
named file was `lanes/L-FLAGS-EFFECTIVE-RESOLVERS/fast-tier.trx`, 4376 passed / 0 failed — a green tier,
which is evidence of a tree, not of a pin. The three mutations the exit's second half needs existed only as
one sentence in the RETURN. **They were re-run here and written down.** Nothing was rewritten to fit the
evidence; the exit stands as it was.

**The `evidence:` line this lane carried before `plan verify` overwrote it, preserved verbatim:**

    lane/flags-effective-resolvers @ e45ec4c1 (worktree /Users/svendaneel/okam/OkamAPI-flagseff); trx at lanes/L-FLAGS-EFFECTIVE-RESOLVERS/fast-tier.trx

**That original `fast-tier.trx` is under a live PII hold** — `evidence-recovered-to-the-trunk.md` held it
rather than move it to the trunk because `grep -c 01010112377` on it returns 2 (a checksum-valid
fødselsnummer). **That hold is not disturbed here and the file was not copied.** Every trx in this directory
was produced fresh by this pass and scanned: `grep -c 01010112377` returns 0 on all six, and a broad
`grep -oE '\b[0-9]{11}\b'` over all six returns nothing at all.

## Where it was run

| | |
|---|---|
| repo / worktree | `/Users/svendaneel/okam/OkamAPI-flagseff` (`OkamAPI-modules`, linked worktree) |
| branch / commit | `lane/flags-effective-resolvers` @ `e45ec4c12` — *"The switchboard stops guessing the effective value for Events, Growth and Meals"* |
| tier | `dotnet test WebApi.Tests/WebApi.Tests.csproj` — **from `WebApi.Tests/`, never the repo root** |
| filter | `Database!=SqlServer&(FullyQualifiedName~FlagEffectiveResolverWireTests\|FullyQualifiedName~EventsFeatureFlagEffectiveTests\|FullyQualifiedName~GrowthFeatureFlagEffectiveTests\|FullyQualifiedName~MealsFeatureFlagEffectiveTests)` |
| scope | **18 arms** — 4 wire + Events 5 + Growth 5 + Meals 4 |
| containers | none started, none touched |
| trunk | not moved; nothing pushed; nothing committed in either repo |

Every run below was a **full `dotnet test`, never `--no-build`**, and `WebApi.Tests/bin/Debug/net8.0/WebApi.dll`'s
mtime **moved on every single run** — 17:35:26 → 17:36:11 → 17:36:50 → 17:37:21 → 17:38:21 → 17:39:20. No run
measured a stale binary. **Every run's trx reports `executed="18"`**, so no mutation "killed nothing" because
nothing ran.

## The runs, in the order performed

| # | state | trx | total / executed / passed / failed |
|---|---|---|---|
| 0 | clean checkout | `00-baseline.trx` | 18 / 18 / **18** / 0 |
| 1 | **M1 applied** | `01-M1-red.trx` | 18 / 18 / 17 / **1** |
| 2 | M1 restored | `02-M1-restored.trx` | 18 / 18 / **18** / 0 |
| 3 | **M2 applied** | `03-M2-red.trx` | 18 / 18 / 5 / **13** |
| 4 | **M3 applied** | `04-M3-red.trx` | 18 / 18 / 14 / **4** |
| 5 | M2+M3 restored | `05-final-green.trx` | 18 / 18 / **18** / 0 |

After the last restore `git status --short` in the worktree printed **nothing** — the tree is byte-identical
to `e45ec4c12`.

---

### M1 — the three DI registrations are removed from the composition root

The exit's own words are *"pinned by a test that reds if the resolver is removed"*, and a resolver nobody
registers is a resolver that has been removed from the running system. All three
`services.AddScoped<…IStoreFeatureFlagEffectiveResolver, …>()` lines in `Program.cs` — Growth at :791,
Meals at :802, Events at :1078 — were commented out in one edit.

**Red:** `WebApi.Tests.Wire.FlagEffectiveResolverWireTests.Every_catalog_flag_is_either_claimed_by_a_registered_resolver_or_excused_with_a_reason`,
`Failed: 1, Passed: 17, Total: 18`. **Its message names all six flags, which is the clause the RETURN
claimed and nothing on disk showed** — verbatim from `01-M1-red.trx`:

> These catalog flags reach GET /stores/{id}/feature-flags with no effective-value resolver registered, so
> the endpoint answers `override ?? advertised default` for them: **Events.Core (Events), Events.Deposits
> (Events), Events.Settlement (Events), growth.dispatch (Growth), growth.module (Growth), meals.module
> (Meals)**. If the owning gate resolves exactly that expression, add its module to GatesThatDoNotDiverge
> with the reason. If it resolves anything else — a config fallback, an outer deployment switch, a data
> probe, an AND under a master — the endpoint is reporting a value the runtime does not agree with, and the
> module owes a resolver registered in the composition root.
>
> `Expected: True` / `Actual: False`

**The finding M1 carries, which is C3's shape exactly:** the other **fourteen** arms — every per-module
effective test in Events, Growth and Meals — **stayed green with all three registrations gone.** They
exercise the resolver classes directly, so a resolver that exists but reaches no request is invisible to
them. Only the derived wire guard sees the missing wire. That is *"a green suite cannot see code that no
caller can reach"* reproduced under measurement rather than quoted, and it is the argument for the wire test
existing at all.

Restored with `git checkout -- Program.cs` + `touch`; run 2 is green at 18/18.

### M2 — `Handles ⇒ false` on all three resolvers

Each resolver's `Handles(string flagKey)` body was replaced with `false`, so all three still exist and are
still registered but claim nothing, and the endpoint silently falls back to `override ?? advertised default`.

**Red: `Failed: 13, Passed: 5, Total: 18`.** Eleven of those thirteen are the module tier —
**exactly the "11/14" the RETURN asserted**, now measured:

- Events (4 of 5): `A_row_flipped_on_under_an_undeployed_module_is_reported_dark`,
  `Every_events_flag_answers_for_the_undeployed_case_not_only_the_core_one`,
  `The_resolver_claims_every_key_the_module_advertises`,
  `The_write_response_does_not_promise_a_surface_the_deployment_has_not_turned_on`
- Growth (4 of 5): `A_row_flipped_on_under_an_undeployed_module_is_reported_dark`,
  `The_dispatch_kill_switch_answers_for_the_undeployed_case_too`,
  `The_resolver_claims_every_key_the_module_advertises`,
  `The_write_response_does_not_promise_a_surface_the_deployment_has_not_turned_on`
- Meals (3 of 4): `A_store_enabled_only_by_configuration_is_reported_effective_not_hidden`,
  `Clearing_a_row_reverts_to_the_configuration_rather_than_to_the_advertised_default`,
  `The_resolver_claims_the_one_key_the_catalog_carries_and_no_money_path_key`

plus two wire arms — `Every_catalog_flag_is_either_claimed_by_a_registered_resolver_or_excused_with_a_reason`
and `Every_registered_resolver_is_asked_before_the_row_for_at_least_one_real_catalog_key`.

Sample messages, verbatim:

```
GrowthFeatureFlagEffectiveTests.The_resolver_claims_every_key_the_module_advertises
Assert.All() Failure: 2 out of 2 items in the collection did not pass.
[1]: Item: growth.dispatch
     Xunit.Sdk.TrueException: growth.dispatch is claimed by no resolver
     Expected: True  Actual: False

EventsFeatureFlagEffectiveTests.The_write_response_does_not_promise_a_surface_the_deployment_has_not_turned_on
Assert.False() Failure   Expected: False   Actual: True
```

**So the exit's second half holds under the reading that matters most:** Events, Growth and Meals each stop
reporting through their real gate the moment the resolver stops claiming, and each module's own arms red for
its own flags.

### M3 — the resolver ignores the per-store row

The three `ResolveAsync` bodies were left calling the same gate, with the store the caller asked about
replaced by a store that can carry no override row (`storeId` → `0`), so each resolver answers the
module-wide fallback for every store.

**Red: `Failed: 4, Passed: 14, Total: 18`.** All three of the arms M2 could not touch — the regression
guards that keep the honest-reporting fix from becoming a lever that ignores operators — went red here:

```
EventsFeatureFlagEffectiveTests.On_a_deployed_module_the_row_still_decides_in_both_directions   Expected: True   Actual: False
GrowthFeatureFlagEffectiveTests.On_a_deployed_module_the_row_still_decides_in_both_directions   Expected: True   Actual: False
MealsFeatureFlagEffectiveTests.An_explicit_row_still_decides_in_both_directions                 Expected: False  Actual: True
```

plus `MealsFeatureFlagEffectiveTests.Clearing_a_row_reverts_to_the_configuration_rather_than_to_the_advertised_default`
(`Expected: False / Actual: True`), whose set-then-clear arm also depends on the row being read.

**Stated honestly against the RETURN:** the RETURN said this mutation reds *"exactly the 3 cases I labelled
regression guards"*. **This run reds 4, a superset** — because the mutation applied here is a store-id
substitution, which is one concrete way to "ignore the row" and not necessarily the one the original agent
wrote. The three named guards are all in the set; the fourth is an additional real dependency on the row.
The count is reported as measured, not as predicted.

## What survives all three mutations — 2 of 18, named rather than left implicit

`Every_excused_module_still_has_an_unclaimed_catalog_flag` and `No_two_registered_resolvers_claim_the_same_flag`
are green under M1, M2 **and** M3. That is not a hole in the resolvers: both guard the *excuse list* and
*claim disjointness*, and no mutation to a resolver's registration, claim predicate or store argument
produces a stale excuse or a duplicate claim. **Killing them needs a fourth mutation of a different kind
(add a module to `GatesThatDoNotDiverge` that has no unclaimed flag; make two resolvers claim one key), and
that mutation was not run.** Union of arms killed: **16 of 18**.

## What this receipt does NOT establish

**C5 is still open and this file does not close it.** The lane's own RETURN says so — *"C5 NOT met: this is
suite evidence. Nobody has walked /admin/feature-flags."* Everything above is a mutation record: it shows the
pins are falsifiable and that each module reports through its real gate. It does not show a person on the
switchboard reading an honest effective value. The exit as written asks for the report and the pin, and that
is what is measured here; the acceptance walk remains owed to the owner.
