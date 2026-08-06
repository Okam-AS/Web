# L-THE-TOP-RANKED-FIXES-REACH-THE-TRUNK — landing receipt

Brief `587d82e5`. The five lanes named in the flag triage's top twenty, taken to their trunks.

Trunks read fresh before anything was merged, and again immediately before the refs were moved:

| | before | after |
|---|---|---|
| frontend `feature/restaurant-modules` | `42a44de5428fa534fb567451479a26b0a2b1904a` | `b4f586abd27ab4147468503b736183b0f2c60007` + record |
| backend `feature/restaurant-modules` | `a14084874bd80a2baedbf47ef08a443e8a7f22ff` | `765e8d757ea2aef38434038c435d78d9161fd746` + record |

Neither trunk moved under this lane. **Reverts: FE `git branch -f feature/restaurant-modules 42a44de`,
BE `git branch -f feature/restaurant-modules a14084874`.** Nothing was pushed.

---

## The correction the brief needs, stated first

**The brief says all five are "one landing away, not one build away — the work is finished, committed".
That is true of three of them and false of two.**

`L-RECEIPT-PAYER-LINE-LOCATE` and `L-ESCPOS-COMPANYACCOUNT-LABEL` are **`class: analysis`** in the plan.
Their exit criteria are findings — *"finding.md names the file and line"*, *"finding.md states for every
PaymentType member what the ESC/POS receipt prints"* — not patches. Neither has a branch, a worktree or a
commit anywhere in either repository. The escpos finding's own closing section is headed **"What a fix
would have to do (not done — this lane is class `analysis`)"**.

Both defects were re-read at the **current** backend trunk `a14084874`, by object, not from a working tree:

```
a14084874:Services/ReceiptService.cs        PaymentTypeLabel  ->  default: return string.Empty;
a14084874:Services/Kassa/EscPosReceiptBuilder.cs PaymentLabel ->  default: return paymentType.ToString();
```

**Both are live.** The blank payer line still prints for `NotSet`, `Giftcard`, `PayInStore`, `Cash`,
`DinteroTerminal` and `WoltMarketplace` — six, not the five the flag records — and the ESC/POS receipt
still prints the raw English `CompanyAccount`. What landed for these two lanes is their evidence and
nothing else; `F-RECEIPT-BLANK-PAYER-LINE` and `F-FISCAL-RECEIPT-PRINTS-AN-ENGLISH-ENUM` still need a
build, and this lane did not do it because building them is not this lane's objective.

### And the path that "did not resolve" resolves

The brief repeats the flag's claim that the finding names `Services/Kassa/ReceiptService.cs`, which does
not exist. **The lane never wrote that path.** `lanes/L-PAYMENT-LABEL-UKJENT/mutation-log.md:173` reads
`Services/ReceiptService.cs:152` — right path, right line, landing on the method signature. The
`Services/Kassa/` prefix was introduced in the flag record. `Services/ReceiptService.cs` exists at
`a14084874` and `PaymentTypeLabel` is at line 152 of it; located and confirmed here rather than taken on
faith, as instructed.

---

## Frontend — three commits on `42a44de`

| commit | what |
|---|---|
| `04a8f81` | merge `lane/check-discount-sum-coupled` @ `c8f26d5` |
| `811818c` | merge `lane/mixin-labels-translate` @ `627e34a` |
| `b4f586a` | the two analysis findings, from `be3e6b1`, byte-identical (`80d3ec3e` / `0c86c835`) |

Both branches fork at `e34977a`, which is an ancestor of the trunk. **Neither is based at `2431883d`** —
that sha does not exist in the frontend repository at all. The two lanes' file sets are **pairwise
disjoint** against their common merge-base, checked before merging rather than discovered during:

```
comm -12 <(git diff --name-only e34977a..lane/check-discount-sum-coupled | sort) \
         <(git diff --name-only e34977a..lane/mixin-labels-translate      | sort)   -> empty
```

### Four lanes ride in, not one

`lane/check-discount-sum-coupled` carries `L-PRICE-BYPASS-FIVE` (`c4a4fa4`), `L-XZ-NEGATED-ABSENCE`
(`b150668`) and `L-XZ-RESIDUAL-SITES` (`799f05d`) beneath it; `lane/mixin-labels-translate` carries
`lane/payment-label-ukjent` (`4465d02`). All four are `built-unverified` in the plan and none is refused.
The first two had already reached the trunk by another route, so **eight of their files resolve identical
to the trunk** and the real delta is the last two lanes plus the widened source scan.

### Conflicts — three, all resolved hunk by hunk

`git merge-file` semantics, never `--ours`/`--theirs` on a whole file. Each hunk was read and chosen:

**`utils/price.js` — 2 hunks, both to the lane.** Hunk 1 replaces the `negatedAmountLabel` doc comment
with the one that names the check-footer row this merge adds. Hunk 2 is the new `isDeductionInPlay`
export, absent on the trunk side. No symbol is lost: the trunk's export set
(`UNKNOWN_AMOUNT isAmountStated statedSum MINUS_SIGN negatedAmountLabel amountLabel nokAmountLabel
amountInputValue formatChf`) is a strict subset of the merged one, which adds `isDeductionInPlay`.

**`test/xz-negated-absence.test.js` — add/add, 1 hunk, to the lane.** The trunk carried a source scan
pinned to `XReportView.vue`; the lane replaces it with a scan over all of `components/admin/pos` plus
three guards that red when the scan stops reaching the rows it is named for. The narrow scan is
**subsumed**, not dropped — the merged scan covers `XReportView.vue` and 20+ others.

**`pages/admin/wolt-menu.vue` — 1 hunk, to the TRUNK.** This is the one that would have gone wrong by
side. The lane side is `import LoginModal from "~/components/molecules/LoginModal.vue";`, which the trunk
**deleted** when it removed this page's duplicate sign-in modal. The `<LoginModal>` template block and the
`components:` entry had already auto-merged as removed, so taking the lane side would have left a dangling
import of a component the page no longer mounts — a lint failure at best and a resurrection of deleted work
at worst. The lane's own change to this file (the price-formatter fix) was already on the trunk and is
untouched: the merged file equals the trunk file.

### Silent-resurrection sweep

For every file both sides touched, the lines the trunk **deleted** since `e34977a` were matched against the
merged result. Eleven files checked. One non-trivial hit: `CustomerInfoModal.calculateTotalRewards`, which
the **lane** deletes deliberately (dead code). Everything else was a bare `}` or `return;`.

### Translation keys, measured rather than assumed

The brief's named hazard. Key sets extracted at base `e34977a`, trunk `04a8f81`, lane tip and merged
result for all three dictionaries (`keycheck.py`):

| | base | trunk | lane | merged |
|---|---|---|---|---|
| `de` | 4782 | 5152 | 4791 | **5161** |
| `en` | 4782 | 5152 | 4791 | **5161** |
| `no` | 4817 | 5187 | 4826 | **5196** |

**No key present on the trunk is absent from the merge, in any dictionary.** The nine gained in each are
the new label keys: `orders_paymentNotSet`, `orders_paymentCash`, `orders_paymentCompanyAccount`,
`orders_paymentTerminal`, `orders_paymentUnknown`, `orders_deliveryNotSet`, `orders_deliveryWoltDrive`,
`orders_deliveryWoltMarketplace`, `orders_statusNotSet`. One key, `wfr_access_no_list`, is absent from the
merge because the **trunk** deleted it after `e34977a`; the lane merely still carried the base copy. That
is a trunk deletion carried through, not a merge loss, and the check distinguishes the two.

The trunk's own edit to `plugins/global-mixin.js` — the `wholeAmount`/`fractionAmount` comment recording
the cross-currency gate — survives the merge. The only removals against the trunk in that file are the
three `switch` statements the lane replaces.

### Frontend tier at the merged tip

One `npx jest --ci` run at `b4f586a`, not one per merge. `fe-jest-tip.txt`:

```
Test Suites: 149 passed, 149 total
Tests:       3543 passed, 3543 total
```

**Every test accounted for against the clerk's baseline of 145 / 3216:**

| source | suites | tests |
|---|---|---|
| baseline `42a44de` (clerk's, second wave) | 145 | 3216 |
| `test/check-discount-sum.test.js` (new) | +1 | +24 |
| `test/xz-residual-sites.test.js` (new) | +1 | +48 |
| `test/order-label-dictionaries.test.js` (new) | +1 | +120 |
| `test/payment-type-label.test.js` (new) | +1 | +132 |
| `test/xz-negated-absence.test.js` (widened) | 0 | +3 |
| **at `b4f586a`** | **149** | **3543** |

3216 + 24 + 48 + 120 + 132 + 3 = 3543. Zero failures, zero unaccounted tests.

The `+3` is measured, not inferred: the trunk's own copy of `xz-negated-absence.test.js` was extracted
with `git show 42a44de:` into a throwaway file in this worktree and run — **58 tests** — against 61 after
the merge. The one narrow scan test becomes four (three reachability guards plus the widened scan).

**The `core` submodule trap the clerk named was hit and cleared before any number was believed.** A fresh
worktree leaves `core` empty and jest still exits 0. `git -c protocol.file.allow=always submodule update
--init core` clones but fails with `upload-pack: not our ref 9626a561` — the shared module git-dir has the
commit checked out but no ref pointing at it. Fixed by fetching the sha directly out of
`/Users/svendaneel/okam/Web-modules/core` and checking it out. `core` is at `9626a561`, matching the
trunk's gitlink, and the gitlink is **not** staged in any commit here.

---

## Backend — one commit on `a14084874`

| commit | what |
|---|---|
| `765e8d7` | merge `lane/clockout-state-is-not-open` @ `a74a6fd21` |

The lane forks at `8e2b57de`, two commits below the tip. `2431883d` **is** an ancestor of this lane — and
of the trunk itself, and of essentially everything; it is shared old history, not this branch's fork point.
The pre-fork hazard the brief names is a branch whose *merge-base with the trunk* is `2431883d`; this
lane's is `8e2b57de`, which is an ancestor of `a14084874`.

**The invariant re-run at the final backend tip:**

```
git grep -lE 'bool +IsCreditSale *\(' HEAD -- '*.cs'
HEAD:Services/Kassa/KassaCreditSale.cs
```

One file, the right one.

### Conflicts — zero, and checked in both directions

One file was touched by both sides: `docs/api/fixtures/workforce/manifest.json`. The auto-merge is a clean
union — diffed against the trunk **and** against the lane, not only against the trunk. The trunk's
`invitation-summary.json` entry survives; the lane's `pos-clock-event-response-no-session.json` entry is
added; the existing clock-event entry takes the lane's corrected rule text.

### This is the server half, and it was the missing half

`F-CLOCKOUT-ANSWERS-OPEN` records that only the client side was fixed. The client half is already on the
**frontend** trunk: `utils/workforce/pos-clock-state.js` reads `clockSessionId` and `closedUtc` and
deliberately ignores `sessionState`, with a comment saying why. What landed here is the wire:

- `WorkforcePosSessionState` gains a third member, `AttendanceException = 3`.
- `PosClockEventResponse.From` reads the state off the fold's own `Outcome` (`SessionOpened`,
  `BreakStarted`, `BreakEnded`, `SessionClosed`, `MissingPunchException`, `CrossEngagementException`,
  `DuplicateIgnored`) instead of off `ClosedUtc` alone.

A clock-out that met no open session sets no `ClosedUtc` either, so the old derivation made **an absent
session and a running one the same answer** — `200`, `accepted: true`, `sessionState: "Open"` — and a
register bound to that field flipped to *Stemplet inn* at the moment the worker pressed *Stemple ut*. The
punch stays accepted rather than refused: the raw event is committed by the ingest's Phase 1 before the
fold runs, and §3.4 keeps raw truth whatever the projection makes of it.

**So the flag can be closed on both halves, and this is the one place the brief expected a remainder and
there is none.**

**One residue named rather than left to be discovered.** The frontend fixture
`test/workforce-pos-clock.test.js:65` still hardcodes `sessionState: 'Open'` for the nothing-open case and
still passes, because it is a hand-written double rather than a generated contract. It is now a stale
double. `test/e2e/fixture/workforce-punch.js:325-332` carries the same stale shape and the same comment.
Neither breaks; both now describe a wire that no longer exists.

### Backend tiers at the merged tip

`dotnet build WebApi.Tests/WebApi.Tests.csproj -c Debug` — **0 errors**, 759 warnings. No `--no-build`
in the build step. `be-build.txt`.

Non-SQL — `--filter "Database!=SqlServer"` — `be-nonsql-tip.txt`:

```
Passed!  - Failed: 0, Passed: 4759, Skipped: 10, Total: 4769, Duration: 6 m 58 s
```

Baseline `4752 / 0 / 10`. **All +7 accounted for by attribute:**

| source | count |
|---|---|
| `PosClockOutStateWireTests` — `[Fact]`, 0 `[Theory]` | 6 |
| `PosContractFixtureTests` — one `yield return` added to an existing `MemberData` source | 1 |
| | **7** |

4752 + 7 = 4759. Zero failures, skips unchanged at 10. Neither touched class carries a
`[Trait("Database","SqlServer")]`, so both belong in this tier and none of the +7 is owed to the SQL one.

### SQL tier — NOT ATTEMPTED, and why

**Not run, and not recorded as anything else.** The clerk's note asks for a clean run *if the slot and the
host allow*. They did not:

- The Docker VM is **7.65 GiB** total.
- While this lane's non-SQL tier ran, **two other lanes were running backend suites on the same host** —
  pid `37105`, `dotnet test … --no-build` with **no filter** (so it runs the SQL tier) out of
  `/Users/svendaneel/okam/OkamAPI/.claude/worktrees/agent-aea9748143b9820db`, and pid `45374`,
  `--filter Database!=SqlServer` out of `/Users/svendaneel/okam/OkamAPI-supersededself`.
- That unfiltered run holds SQL Server container `laughing_northcutt`, Testcontainers session
  `4e66d97b-28dd-4b49-8829-772434a422fe`, with its own ryuk. **It was inspected read-only and left alone.**

Starting a second SQL tier next to an unfiltered one on a 7.65 GiB VM is precisely the condition under
which the previous wave's attempt 1 died — `Test host process crashed` at 317 of ~694, swap at 1017 of
1023 MiB. So **no container was started by this lane at all**, and the `max server memory` cap script
written for the purpose (`cap-mine.sh`, keyed on sessions absent at watcher start and matching only
containers that carry an `org.testcontainers.session-id` label) was never needed. `okam-lwtwo-sql` and
`okam-lwtwo-redis` were read with `docker ps`/`docker inspect` and never stopped, restarted or exec'd.

**What is honestly unknown:** the whole SQL tier at this tip, on top of the roughly half the previous wave
left unmeasured. What can be said about the delta rather than the tier: `git diff --name-only
a14084874..765e8d7` is six files, **none of them a migration, an entity, an `OnModelCreating` or a
`HasTrigger`** — `Models/Workforce/WorkforcePosModels.cs` (a wire DTO and its enum), two test files, a
manifest, a golden JSON fixture and a lane evidence file. The two SQL-tier-adjacent classes that read
`WorkforcePosSessionState` — `PosClockSurfaceTests` and `WorkforceEndToEndJourneyTests` — assert `Open`
on a clock-in and `Closed` on a clock-out that closed a session, and **neither of those two answers moves**
under this change. That is a reason not to expect a regression; it is not a measurement, and it is not
offered as one.

---

## Constraints, checked against the delta

- **C1** — no `UPDATE`/`DELETE` against an append-only table anywhere in either delta; no migration, no
  script, no raw SQL. The backend delta adds an enum member and a switch.
- **C2** — `git diff --name-only a14084874..765e8d7 -- Migrations/` is empty. No migration authored, no
  `OnModelCreating` index/constraint added.
- **C3** — nothing new to reach. `isDeductionInPlay` is called from `CheckPanel`, `CheckLine` and
  `SellScreen` in the same diff; the three label maps are consumed by the three mixin methods that already
  have every call site; `AttendanceException` is returned by `PosClockEventResponse.From`, which the
  clock-events endpoint already calls.
- **C4** — the one money-path behaviour change is `SellScreen.onNegativeSale`, which computes a refund
  amount. It adds no write path and no actor is bypassed; the return still goes through the same caller.
- **C5** — **no capability is claimed verified here.** Every number above is a suite result, offered as
  evidence that code behaves and never as evidence that a capability exists. The five defects are money
  and document defects a person sees on a bill, a receipt and a clock register; **Sven walking those three
  surfaces is the gate, and it has not happened.**
- **C6** — the ESC/POS receipt is a `kassasystemforskrifta` artifact and the personalliste is a
  § 8-5-6 one. Nothing here adds a statutory claim. The clock-out fix *removes* a way for the
  personalliste to carry an entry with no end time. `F-FISCAL-RECEIPT-PRINTS-AN-ENGLISH-ENUM` remains
  open and is recorded above as unfixed rather than left to look closed.
- **C7** — no logging or telemetry call in either delta.

## What this lane did not do

- **Did not push.** Both trunk refs were moved locally with `git branch -f`; nothing left this machine.
- **Did not run `plan accept` or `plan decide`**, and edited nothing under `docs/plan/**` except its own
  RETURN.
- **Did not build the two analysis lanes' fixes.** They are named, located and left open.
- **Did not touch** `preserve/german-identifier-labels` or `preserve/model-versus-chain-drift-test`, which
  stay refused, or `lane/ore-padding-operator-clients` on `Okam-AS/Web` and `Okam-AS/AdminApp`, which are
  other repositories.
