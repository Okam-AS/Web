# RUN — both halves of the exit, one file

Produced by `agent:L-FORTY-SEVEN-LANES-NEED-THE-WORK-NOT-THE-CITATION` (batch 2), 2026-08-09.
Reason-shape: **half of a two-part exit was unshown.** Half two (the seed loses its INSERT) was directly
checkable and held. Half one — *a wire test **proves** …* — had a test **source file** in the tree and
**no recorded run anywhere**: two prose suite counts, no trx, no log. A source file shows that a pin
exists, never that it passed. So the run was made, and a mutation was applied to show the pin is not
vacuous.

**The evidence line as the original agent recorded it, preserved because `plan verify` overwrites it:**

    OkamAPI lane/wf-bootstrap @ 9d1719df (worktree ../wt-wfboot, off feature/restaurant-modules 3579bbbc);
    fast tier 4374 passed / 0 failed / 12 skipped vs BASE 4369 / 0 / 12 from a clean checkout of 3579bbbc,
    `dotnet test --filter "Database!=SqlServer"`, assembly mtime 11:17:43 > newest source 11:13:16.
    Web-modules lane/fe-wf-bootstrap @ 9264904 (worktree ../web-wfboot, off 89c2c1f); jest 109 suites /
    2469 passed / 1 failed (journey-artifact-store asserts the checkout is named Web-modules; this is a
    worktree).

## Half one — the wire test, run

Tree `/Users/svendaneel/okam/wt-wfboot`, branch `lane/wf-bootstrap`, `9d1719dfd`. Clean before and after.
Run from `WebApi.Tests/`:

    dotnet test --filter "Database!=SqlServer&FullyQualifiedName~WorkforceBootstrapWireTests" \
                --logger "trx;LogFileName=<name>.trx" --results-directory <this directory>/runs

| arm | mutation | total | **executed** | passed | failed | trx |
|---|---|---|---|---|---|---|
| baseline | none | 4 | **4** | 4 | 0 | `runs/baseline.trx` |
| **M1** | `WorkforceBootstrapService.cs:39` — `WorkforceManager` dropped from `BootstrapGrants` | 4 | **4** | 3 | **1** | `runs/mut-no-manager.trx` |
| restored | none | 4 | **4** | 4 | 0 | `runs/restored-green.trx` |

`WebApi.dll` mtime moved on every arm: 17:46:53 → 17:47:55 → 17:48:44. No `--no-build` anywhere, so no arm
read a stale binary. No container started; the SqlServer trait is excluded by the filter.

**The assertion that went red is the exit's own sentence.** M1 leaves the bootstrap working and only
removes the manager grant, so what fails is exactly the "obtains a **WorkforceManager** engagement" clause
and nothing else:

    WebApi.Tests.Wire.WorkforceBootstrapWireTests.A_fresh_stores_administrator_opens_workforce_over_http_and_the_engagement_manages
    Assert.Contains() Failure
    Not found: WorkforceManager
    In value:  List<String> ["WorkforceSelf", "WorkforceScheduler"]

The other three arms — cross-tenant refusal, power-user refusal, and the door shutting once a store has a
workforce — stay green under M1, which is the right shape: the mutation is aimed at one clause and kills
one clause.

**"over HTTP" and "with no SQL", measured rather than assumed.** The class takes `WireHostFixture` and
drives `HttpClient` (`admin.GetAsync("/workforce/stores/" + store + "/context")`,
`admin.PutAsync("/stores/" + store + "/feature-flags", …)`, then `POST …/bootstrap`), and the run's own
console carries the server-side request lines, e.g.

    Request finished HTTP/1.1 POST http://localhost/workforce/stores/4103/bootstrap - 403 …application/problem+json

The whole class runs in 21–26 ms under the `Database!=SqlServer` filter with **no container started**.
The first assertion in the headline test is the defect itself — `GET /context` refusing the store's own
administrator — so every 200 after it is attributable to the new door rather than to a store that was
already open.

## Half two — the seed loses its `INSERT INTO WorkforceStaffMembers`, in the same change

Re-measured at `9d1719df`, not taken on report:

- `grep -n WorkforceStaffMembers Scripts/demo/seed-workforce-demo.sh` returns **four** hits, and **none is
  an INSERT**: lines 14, 133 and 143 are past-tense prose in the header and body ("It was an accurate
  description of a module no real…", "That INSERT was the demo's private key to a door no customer…"),
  and line 472 is a `SELECT … FROM WorkforceStaffMembers` inside the clock-event demo.
- At the base, `git show 3579bbbc:Scripts/demo/seed-workforce-demo.sh | grep -n "INSERT INTO WorkforceStaffMembers"`
  returns **line 167**. So the block existed and was removed rather than never having been there.
- **"in the same change"**: `git show --stat 9d1719df` lists `Scripts/demo/seed-workforce-demo.sh` (154
  lines changed) beside `WebApi.Tests/Wire/WorkforceBootstrapWireTests.cs` (+297),
  `Controllers/WorkforceBootstrapController.cs` (+89) and `Services/Workforce/WorkforceBootstrapService.cs`
  (+321) — eleven files, one commit.

## Residue this run does not close

- **The frontend arm is not part of this exit** and is left as the original agent recorded it: 109 suites /
  2469 passed / **1 failed** on `lane/fe-wf-bootstrap @ 9264904`, the failure being `journey-artifact-store`
  asserting the checkout is named `Web-modules` while it runs in a worktree. Not re-run here.
- **C5 is not met.** No operator opened the roster page and pressed the bootstrap control; this is a wire
  pin, not an accepted journey.
- The lane's own KNOWN GAP stands: nothing in the schema makes "one first engagement per store" a
  constraint, so a caller who already has a `WorkforcePerson` can double-submit into two engagements at two
  legal employers. It needs a migration this lane was not permitted to author.
