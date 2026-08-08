# L-SECOND-WAVE-LANDS-ON-BOTH-TRUNKS — backend landing receipt

Brief `e78ec33c`. The two backend lanes that finished *after* the 2026-08-06 trunk landing, merged
onto `feature/restaurant-modules`.

## What landed

| merge commit | lane | lane tip merged | authored on |
|---|---|---|---|
| `dd2ef7eae` | `lane/wf-invite-pair-be` | `13e8a6213` | `726906fe5` |
| `a6445ee0c` | `lane/an-acceptance-names-somebody` | `86142430c` | `8e2b57de8` |

Trunk before: `118f92fb9`. Merge tip: **`a6445ee0c20e41909aa006519186edf7afce609d`** — every number
below was measured there. This record commits on top of it.

**A correction to the brief.** It puts both lanes on the old trunk `8e2b57de8`. Only
`lane/an-acceptance-names-somebody` is there — 48 commits back. `lane/wf-invite-pair-be` forks at
`726906fe5`, which is **two** commits below the tip, not 48. The distinction is why neither needed the
deliberate rebase the brief expected: see below.

## Conflicts

**Zero, and the reason is checkable rather than lucky.** The set of files the trunk changed since
`8e2b57de8` and the set the two lanes touch are disjoint:

```
comm -12 <(git diff --name-only 8e2b57de8..feature/restaurant-modules | sort -u) \
         <(cat <(git diff --name-only 726906fe5..lane/wf-invite-pair-be) \
                <(git diff --name-only 8e2b57de8..lane/an-acceptance-names-somebody) | sort -u)
   -> empty
```

So 48 commits of distance produced no overlapping hunk, and `git merge-file` was never reached. A
merge and a rebase would have produced the identical tree here; `--no-ff` merges were used so each
lane's authored commit survives verbatim and the landing is a commit of its own.

Textual disjointness is not semantic safety, which is why the tiers below are the actual evidence:
both lanes extend surfaces the trunk already owns (`IWorkforceInvitationService` and its DI
registration at `Program.cs:698` are already on the trunk — the lane adds methods, it does not
introduce the service).

## Verification at the tip

`dotnet build WebApi.Tests/WebApi.Tests.csproj -c Debug` — **0 errors**, 742 warnings. No
`--no-build` anywhere.

### Non-SQL tier — `--filter "Database!=SqlServer"`

```
Passed!  - Failed: 0, Passed: 4752, Skipped: 10, Total: 4762
```

`be-nonsql-tip.txt`. Baseline `4736 passed / 0 failed / 10 skipped`. **Every one of the +16 is
accounted for, by attribute rather than by assumption:**

| source | count |
|---|---|
| `WorkforceInvitationTests` — `[Fact]` added by `wf-invite-pair-be` | 13 |
| `EventsAcceptanceIdentityWireTests` — `[Fact]` added by `an-acceptance-names-somebody` | 2 |
| `WorkforceContractFixtureTests` — one `yield return` added to an existing `MemberData` source | 1 |
| | **16** |

4736 + 16 = 4752. Zero failures, zero unaccounted tests, skips unchanged at 10.

### SQL tier — `--filter "Database=SqlServer"` — **NOT COMPLETED, twice**

**This tier is not recorded as green, because it never finished.** The baseline `694 / 1` was not
reproduced and no one should read this section as if it were.

| attempt | log | how it ended |
|---|---|---|
| 1 | `be-sql-attempt1-aborted.txt` | `Failed: 1, Passed: 316, Total: 317` after 26m23s, then **`The active test run was aborted. Reason: Test host process crashed`** |
| 2 | `be-sql-tip.txt` | reached `00:52:37` of Testcontainers time — well past attempt 1's death at `00:21:22` — then was **killed externally** before printing a result line |

Attempt 1 is an environment failure, not a test failure: the host was sharing a 7.6 GiB VM with another
lane's SQL tier (Testcontainers session `fa5ddae7…`) and the owner's seeded world, and swap was at
**1017 MiB of 1023 MiB** when the test host died. Attempt 2 was started deliberately after that lane's
containers were gone and 6.1 GiB was free; it got roughly twice as far and was then stopped from
outside this lane.

**The only failing test observed in either attempt is the one the brief already names**, and it
appeared in both:

```
Failed WebApi.Tests.Workforce.SchedulePublishSqlServerTests
       .Publish_commits_publication_recipients_inbox_outbox_and_audit_atomically
Assert.Equal() Failure   Expected: 1   Actual: 2      (SchedulePublishSqlServerTests.cs:60)
```

That is the recorded known-red outbox count, gated on a ruling and **not this lane's to fix**. It is
also structurally unrelated to what landed: `git diff --name-only 118f92fb9..HEAD` touches no schedule
and no outbox file.

**What is honestly unknown:** the roughly half of the tier neither attempt reached. Nothing in the
delta gives a reason to expect a regression there — no migration, no entity, no `HasTrigger` — but
"no reason to expect" is not a measurement, and the next lane with a quiet host should re-run
`--filter "Database=SqlServer"` and compare against `694 / 1`.

#### Container discipline

10 SQL Server containers were started across the two attempts. **Every one was capped** at
`max server memory (MB) = 1536` by `cap-mine.sh` (log: `cap-log.txt`, ids: `capped-ids.txt`), keyed on
this lane's own Testcontainers session ids `d965212a-…` and `dde6ad25-…`. The watcher matches on
`org.testcontainers.session-id` equal to its own session and nothing else, so `okam-lwtwo-sql` and
`okam-lwtwo-redis` — which carry no Testcontainers label at all — were **structurally unreachable**
rather than merely un-targeted. Both were still up and untouched at the end. The other lane's session
`fa5ddae7…` was likewise skipped, verified live while both were running. All of this lane's containers
were reaped; none was left behind.

Two things the first version of that watcher got wrong, recorded so the next lane does not repeat
them: macOS ships bash 3.2, where `declare -A` does not exist, so the script died on its first line
and capped nothing while looking alive; and the SA password is **not** shared across fixtures, so a
hard-coded one fails the login. Reading `MSSQL_SA_PASSWORD` out of each container's own env fixes the
second permanently.

## Constraints, checked against the delta rather than asserted

Fourteen files landed; none is a migration.

- **C2** — `Migrations/` is untouched (`git diff --name-only 118f92fb9..HEAD -- Migrations/` is empty).
  Chain tip is still `20260806125642_Growth_AuditLedger`, no duplicate migration ids, and the delta
  contains the string `HasTrigger` zero times (50 distinct declarations before, 50 after). No index or
  constraint was added to `OnModelCreating` without a migration, because nothing was added to it.
- **C1** — the delta adds no `.Remove(`, `RemoveRange`, `ExecuteDelete` or `DELETE FROM`. Revocation is
  a state transition on a mutable-by-design row; the invitation row survives and keeps naming the
  credential it retired.
- **C3** — both surfaces are reachable, not merely present. `WorkforceStaffController`
  (`[Route("workforce/stores/{storeId:int}")]`) binds `[HttpGet("invitations")]` and
  `[HttpPost("invitations/{invitationId:guid}/revoke")]`, which are byte-for-byte the two routes the
  frontend's `utils/workforce/roster-client.js` calls, and the panel that calls them is mounted by
  `pages/admin/workforce-roster.vue`. The Events refusal sits behind
  `EventsController.cs:122 [HttpPost("proposals/{token:guid}/accept")]`.
- **C4** — `an-acceptance-names-somebody` *is* a C4 repair: it refuses an accept naming nobody rather
  than writing an append-only receipt that attributes the acceptance to no one.
- **C7** — the delta adds no logging call at any level. `WorkforceInvitationSummary` carries neither a
  token nor a token hash: the list model's members are id, store, staff member, display name, state,
  `IsLive`, and two timestamps. The two `Token` members in that file belong to the issue *response*
  (shown once) and the claim *request* (an input), both pre-existing.

## Not landed, deliberately

- `preserve/model-versus-chain-drift-test` (`66f19e236`) — a preservation branch, confirmed **not** an
  ancestor of the trunk. It exists to stop a commit being garbage-collected; landing it is a separate
  decision nobody has made.

## The trunk ref was locked, and how it was freed

`git branch -f feature/restaurant-modules` failed: `cannot force update the branch ... used by
worktree at /Users/svendaneel/okam/wt-landbackend` — the *previous* wave's landing worktree still held
the branch. It was clean (no tracked or untracked changes) and sitting exactly at `118f92fb9`, so it
was detached in place with `git checkout --detach`. Its files are byte-identical to what they were;
only the branch name was released. **Whoever owns `wt-landbackend` should know it is now a detached
worktree at `118f92fb9`, not a stale checkout of the trunk.**

## Revert

```
git branch -f feature/restaurant-modules 118f92fb9
```

Nothing was pushed. Landing on the trunk was authorised; publishing was not.
