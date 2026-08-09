# The forty-seven remainder

The lanes a citation pass could not close. Each batch appends its own section; nothing above a heading is
rewritten.

## Batch 0

Eight lanes, one at a time. For each: the decline already recorded in `instrumentless-exits.md`, the
reason-shape it belongs to, and **the missing thing produced — or the reason it cannot be**.

**3 closed · 3 need an owner ruling · 2 cannot be closed without work outside this lane.**
Backend trunk `6d5328004`, unmoved. Nothing pushed. No container started or touched. `:5091` and `:5941`
left running. Every worktree I touched is byte-identical to how I found it.

### Per lane, with `plan verify`'s exact words

| lane | reason-shape hit | what was produced | outcome |
|---|---|---|---|
| `L-FLAGS-EFFECTIVE-RESOLVERS` | **(2) green where a red is demanded** | the three mutations run and written down, 6 trx | **closed** |
| `L-EV-OUTBOX-GUID-SUBSTRING` | **(1) written up, at a citation that resolves nowhere** | the record moved to a durable path | **closed** |
| `L-THE-CREDIT-SALE-SUITE-REACHES-THE-TRUNK` | **(1) missing write-up** | the unlandability record, re-measured at the trunk | **closed** |
| `L-COMPOSITION-ROOT-CHECK` | **(4) evidence proves the opposite** | a finding: the trunk has since fixed it; one run is missing | **owner ruling** |
| `L-REVIEW-RESIDUALS` | **(5) half of a two-part exit** | a finding + both records rescued; the halves are on divergent branches | **owner ruling** |
| `L-EV-VIPPS-FALLBACK` | **(3)/(4) live run never happened** | a finding; the exit is a C5 walk plus an external round trip | **owner ruling** |
| `L-WF-OPLINK` | **(3) proves less — fixture, not live** | a finding + the capture rescued from untracked | **outside this lane** (a person must walk it) |
| `L-EVERY-REPORT-READ-SAYS-WHY-IT-FAILED` | **(5) half of a two-part exit** | five artifacts rescued off an unmerged branch; the tier clause named | **outside this lane** (a two-repo tier re-run) |

**Verbatim, in the order run:**

```
$ plan verify L-FLAGS-EFFECTIVE-RESOLVERS --evidence docs/plan/evidence/L-FLAGS-EFFECTIVE-RESOLVERS/mutation-receipt.md
plan: evidence inadmissible — exit: “Events, Growth and Meals each report an effective flag value through
their real gate, pinned by a test that reds if the resolver is removed” does not name
docs/plan/evidence/L-FLAGS-EFFECTIVE-RESOLVERS/mutation-receipt.md
EXIT=6

  (exit amended to name the path, then:)
L-FLAGS-EFFECTIVE-RESOLVERS built-unverified -> verified
EXIT=0

L-EV-OUTBOX-GUID-SUBSTRING built-unverified -> verified
EXIT=0

L-THE-CREDIT-SALE-SUITE-REACHES-THE-TRUNK built-unverified -> verified
EXIT=0
```

The five that did not close were each put to the tool anyway, **without amending their exits**, so the
refusal is on the record rather than asserted. All five printed the same shape and exited 6:

```
$ plan verify L-WF-OPLINK --evidence docs/plan/evidence/L-WF-OPLINK/FINDING.md
plan: evidence inadmissible — exit: “a manager runs the pos-operator-import from the roster and the linked
operator clocks in from the POS surface, with the clocked minutes visible on the attendance table, captured
under artifacts/journeys/” does not name docs/plan/evidence/L-WF-OPLINK/FINDING.md
EXIT=6

$ plan verify L-REVIEW-RESIDUALS --evidence docs/plan/evidence/L-REVIEW-RESIDUALS/FINDING.md
plan: evidence inadmissible — exit: “the mail-provider declaration pin derives its adapter list by reflection
rather than by hand, and the re-zoning guard has a behavioural case per anchor, both shown by fast-tier
tests” does not name docs/plan/evidence/L-REVIEW-RESIDUALS/FINDING.md
EXIT=6

$ plan verify L-EV-VIPPS-FALLBACK --evidence docs/plan/evidence/L-EV-VIPPS-FALLBACK/FINDING.md
plan: evidence inadmissible — exit: “a live test-MSN initiate for a deposit returns a redirect and, after
approval in Vipps, the guest lands back on the deposit page reading paid” does not name
docs/plan/evidence/L-EV-VIPPS-FALLBACK/FINDING.md
EXIT=6

$ plan verify L-COMPOSITION-ROOT-CHECK --evidence docs/plan/evidence/L-COMPOSITION-ROOT-CHECK/FINDING.md
plan: evidence inadmissible — exit: “a configuration failure before the registrations leaves every limiter
resolving and enforcing, and the global filter constructible, proven by a build that would previously have
failed” does not name docs/plan/evidence/L-COMPOSITION-ROOT-CHECK/FINDING.md
EXIT=6

$ plan verify L-EVERY-REPORT-READ-SAYS-WHY-IT-FAILED --evidence docs/plan/evidence/L-EVERY-REPORT-READ-SAYS-WHY-IT-FAILED/MUTATION-RECEIPT.md
plan: evidence inadmissible — exit: “a 401, a 403, a 500 and an offline read on the platform-growth path each
reach the page as a distinguishable localised reason rather than an axios string, shown by tests that red
when the safe read is reverted, and the frontend tier is green at the tip” does not name
docs/plan/evidence/L-EVERY-REPORT-READ-SAYS-WHY-IT-FAILED/MUTATION-RECEIPT.md
EXIT=6
```

**`plan verify` will not accept a path the exit does not name.** Three exits were therefore amended with
`, recorded in <path>` and nothing else; five were left exactly as written. Each amendment was made after
re-reading the `exit:` line immediately beforehand and matching it as an exact string, because siblings write
this file concurrently.

---

### The one red this batch owed, and it is produced

**`L-FLAGS-EFFECTIVE-RESOLVERS`** was the batch's only *"green where a red is demanded"*. Its whole evidence
was a 4376/0 tier — **a tree, not a pin**. The three mutations its RETURN described in one sentence were run
in `/Users/svendaneel/okam/OkamAPI-flagseff` at `e45ec4c12`, scoped to the 18 arms
(`Database!=SqlServer` AND the four flag test classes), **full build every run, never `--no-build`**, with
`WebApi.dll`'s mtime confirmed moving on all six runs (17:35:26 → 17:36:11 → 17:36:50 → 17:37:21 → 17:38:21 →
17:39:20) and `executed="18"` in every trx, so no mutation can have "killed nothing" because nothing ran.

| run | trx | passed / failed |
|---|---|---|
| baseline | `00-baseline.trx` | 18 / 0 |
| **M1** — the three DI registrations removed | `01-M1-red.trx` | 17 / **1** |
| M1 restored | `02-M1-restored.trx` | 18 / 0 |
| **M2** — `Handles ⇒ false` on all three resolvers | `03-M2-red.trx` | 5 / **13** |
| **M3** — the resolver ignores the per-store row | `04-M3-red.trx` | 14 / **4** |
| restored | `05-final-green.trx` | 18 / 0 |

M2's thirteen include **eleven of the fourteen** module arms, exactly the "11/14" the RETURN asserted and
nobody had shown. M1's message names all six flags. M3 reds **4**, not the 3 the RETURN predicted — reported
as measured, since the mutation applied here is one concrete way to ignore the row and not necessarily the
one the original agent wrote. `git status` in that worktree is empty afterwards.

**Two of the eighteen arms survive all three mutations** — `Every_excused_module_still_has_an_unclaimed_catalog_flag`
and `No_two_registered_resolvers_claim_the_same_flag`. Killing them needs a fourth mutation of a different
kind, which was not run. Union killed: **16 of 18**, and the number is in the receipt rather than left out of
it.

**The finding inside that red, which is C3 measured rather than quoted:** under M1, with all three
registrations gone, **the fourteen per-module tests stayed green.** They exercise the resolver classes
directly, so a resolver that exists and reaches no request is invisible to them; only the derived wire guard
sees the missing wire. *A green suite cannot see code no caller can reach* — reproduced, not cited.

---

### Three findings this batch produced that outlive its own lanes

**1. The fødselsnummer hold is already breached, 22 times, inside this repo.**
`evidence-recovered-to-the-trunk.md` held `L-FLAGS-EFFECTIVE-RESOLVERS`' 6.1 MB `fast-tier.trx` off the trunk
because `grep -c 01010112377` on it returns 2. That hold is correct in principle and I honoured it — the new
receipt cites six freshly produced trx, all scanned (`grep -c 01010112377` = 0, and a broad
`grep -oE '\b[0-9]{11}\b'` returns nothing at all), and I copied **no** held file. But the value is not
confined to that one trx: **every full fast-tier trx on this estate carries it**, and

    22 of the 89 tracked .trx files in this repo already contain 01010112377

including `docs/plan/evidence/L-A-STORE-CANNOT-GRANT-ITSELF-A-CUSTOMERS-REQUEST/tier.trx`,
`docs/plan/evidence/L-MEALS-FOURWAY-TIER/f72c7a81-fourway-fast-tier.trx`,
`docs/plan/lanes/L-FLAGS-RESOLVERS-COVER-THREE/trx/{baseline-8e2b57de,lane-0f29a898}.trx`,
`lanes/L-MIG-STACK-MERGE/trx/*-fast-tier.trx` (three), `lanes/L-POS-TENDER-WIRE-REBASE/*` (four),
`lanes/L-CORS-CREDENTIALED-ORIGIN/*` (two), `lanes/L-PDF-FAMILY-LAND/work/*` (two), and six others.
**Withholding one file while twenty-two are committed is a policy that protects nothing.** Either the value
is fixture data and the hold should be lifted, or it is not and twenty-two files need attention — an owner's
call, and it is larger than any lane in this batch. Two more were withheld by me on the strength of the hold
as written (`L-EV-OUTBOX-GUID-SUBSTRING`'s two 6 MB trx, `L-THE-CREDIT-SALE-...`'s 7 MB one); their counters
are quoted in their receipts instead.

**2. A preservation bundle that does not restore from nothing.**
`L-EVERY-REPORT-READ-SAYS-WHY-IT-FAILED`'s RETURN records its `core-a6ae241.bundle` as *"Proved by fetching it
into an empty git init"*. Measured here, it is not:

    $ git init -q . && git fetch …/core-a6ae241.bundle 'refs/heads/*:refs/remotes/bundle/*'
    error: Repository lacks these prerequisite commits:
    error: 9626a561bb0442b0aed026be75b7f9419337ac6d

It is a **thin** bundle whose prerequisite is the old submodule pin — and the same RETURN records that
`9626a561` is itself absent from `Okam-AS/Core.git`. So **a stranger with only the Core remote cannot open
it.** It *does* restore against any local Core clone (all three checked carry `9626a561`), giving
`a6ae241 parent=9626a561` and a two-file diff. The artifact is safe today, on this machine; the claim that it
is safe from nothing is not true, and the teardown hazard it was written against is therefore still live.

**3. Two lanes' work has silently landed on the trunk while their exits read `built-unverified`.**
`L-COMPOSITION-ROOT-CHECK`'s pin **and** the fix that makes it green are both at `6d5328004`
(`WebApi.Tests/Wire/CompositionRootLimiterWireTests.cs` is there, and
`Helpers/ServiceCollectionExtensions.cs` at the trunk registers no limiter at all — all three moved into
`Program.cs` outside the MCP `try`). `L-EV-VIPPS-FALLBACK`'s `EventsDepositVippsFallbackTests.cs` is at the
trunk too. Batch 6 of `instrumentless-exits.md` found four lanes in this position; **this is two more, and it
is now a pattern rather than an anecdote.** A lane can be un-verifiable and already shipped, and the two facts
need separate columns.

A fourth, smaller correction: `L-THE-CREDIT-SALE-SUITE-REACHES-THE-TRUNK`'s RETURN closes with a
"NOT SUPERSEDED" finding — that `EodService` buckets `CompanyAccount` into its default arm and the close
counts a receivable as takings. **The trunk has since closed it** (`EodService.cs:237` tests
`!line.PaymentType.IsReceived()` *before* the medium switch; `EodModels.cs:69` carries `CreditTotal`), so the
follow-up lane that RETURN recommends is already done.

---

### The count I cannot close, and why each one resists

**Three need an owner ruling, and none of them needs code.**

- **`L-COMPOSITION-ROOT-CHECK`** — the exit was right; it was measured at a commit where it did not yet hold
  (`Failed: 1` on `The_reservation_limiter_still_resolves_after_the_failure`). The trunk now satisfies it.
  **Do not amend the exit** — run `CompositionRootLimiterWireTests` at `6d5328004` and commit the trx. I did
  not, because `OkamAPI-modules` is dirty with another lane's uncommitted work (five modified files plus an
  untracked `lanes/L-THE-COMPETENCY-SEAM-FIRES-WARN-ONLY/`) **and** a sibling's `dotnet test` (pid 1926) was
  running in it. Busy resource, not a judgement; nothing was killed.
- **`L-REVIEW-RESIDUALS`** — both halves are separately proven with good red-then-green records, and the
  exit's *"both shown by fast-tier tests"* asserts one tree. Measured: neither lane branch is an ancestor of
  the trunk or of the other; they diverge at `968fd273`. And the halves are in **opposite** states at the
  trunk — the provider walk is there (`GrowthMailProviderContractTests.cs:451`), the re-zoning file is not.
  This is a landing question, not a citation one: land the rezone branch, or split the lane into two exits.
- **`L-EV-VIPPS-FALLBACK`** — the exit needs a live test-MSN, `Events:PublicBaseUrl` configured (verified
  absent: the branch's whole `Events` section is `{"DispatchEnabled": false}`, and the two `PublicBaseUrl`
  hits a grep finds are both under `Mcp`), and a person approving in Vipps. **Leave the exit alone.**

**Two cannot be closed without work outside this lane.**

- **`L-WF-OPLINK`** — a genuine 11/11 walk with six screenshots, `failedRequests: []`, and real Norwegian
  screen text at every step. It is `"backend": "fixture"` against a fixture this same lane extended with the
  routes the journey calls, and it records **three of its own `defect` findings** (navigation-cancelled
  pageerrors on `/admin/workforce-roster`, `/admin/pos`, `/admin/workforce-rates`) plus six console errors.
  By C5 a person must walk it; the capture is rescued so it survives, and the three defects are owed a ruling.
- **`L-EVERY-REPORT-READ-SAYS-WHY-IT-FAILED`** — clauses 1 and 2 are fully carried by the rescued
  `MUTATION-RECEIPT.md` (37 arms, 37 killed, 0 survivors, 18 mutations, 0 that killed nothing; 401/403/500 and
  offline each present as named arms, plus `the four failures do not read alike`, plus
  `a non-2xx reaches the service instead of escaping it as an axios error` killed by
  `core: the platform-growth read goes back to the unsafe GetRequest` — the exit's own revert). Clause 3,
  *"the frontend tier is green at the tip"*, exists **only** as a sentence in the RETURN (170 suites / 4080
  tests / 0 failures). Producing it needs a fresh worktree, a bundle restore of the submodule pin, a
  dependency install and a 170-suite run — and this checkout is shared with five siblings, so it may not
  change branches.

### One thing worth saying about the batch as a whole

**Only one of the eight was actually missing a run.** The other seven had done the work; what they were
missing was a durable place to put it, a second half, a person, or a re-measurement after the estate moved
underneath them. **Five of the eight had evidence living somewhere that dies** — two ephemeral worktrees, a
rescue branch in the wrong repository, an unmerged branch, and an untracked directory in this repo. All of it
is now under `docs/plan/evidence/<LANE-ID>/`, force-added past the bare `artifacts/` ignore rule and confirmed
with `git ls-files --error-unmatch`. That rescue is worth more than the three closures, and it is the part
that would have been lost by tomorrow.

## Batch 4

Eight lanes, each read against the decline already recorded in `instrumentless-exits.md` and then worked
rather than re-argued. **2 closed · 3 need an owner ruling · 3 cannot close without work outside this
lane.** Backend trunk `6d5328004`, unmoved. Nothing pushed. The demo APIs on `:5091` and `:5941` were left
running and untouched; no container was started or stopped.

Every artifact is under `docs/plan/evidence/<LANE-ID>/`, force-added and confirmed with
`git ls-files --error-unmatch`. Each one carries the lane's **original `evidence:` line** copied verbatim
into its text, because `plan verify` overwrites that line with the single path it is passed.

### Closed — 2, and `plan verify` accepted both

| lane | reason shape | what was produced |
|---|---|---|
| `L-TRAIN-EVIDENCE-NAMES-COURSE` | **(5) half of a two-part exit** | the component half, run for the first time: baseline **70/70**, three mutations, restore **70/70** |
| `L-GR-DEADLINE-STATUTE` | **(1) no artifact — the work happened, nobody wrote it down** | the obligation's doc extracted verbatim to a durable path, hash-checkable against the branch blob |

**`L-TRAIN-EVIDENCE-NAMES-COURSE`.** The wire half was already recorded; the component half was cited only
as a frontend commit. Ran `npx jest test/training-components.test.js` in a detached worktree at `cff41c85`
so no sibling saw the mutation, five runs, **every run executing 70 tests**:

- **M1** — the whole `[data-test="completion-course"]` cell deleted: **8 failed / 62 passed**,
  `Expected length: 2 / Received length: 0` on *EVERY row names the course and the version the attempt was
  stamped to*. Reported honestly as a **coarse** instrument: deleting a column shifts every later `td`
  index, so five unrelated cell readers red as collateral.
- **M2** — `versionNo` nulled in `completionRow`'s parse: **exactly 2 failed**,
  `Expected substring: "v1" / Received string: "Ansvarlig alkoholservering"`. The title survives, the
  version does not — which separates the exit's two nouns.
- **M3** — `{{ row.courseTitle || dash }}` → `{{ row.courseTitle }}`: **exactly 1 failed**,
  `Expected: "—" / Received: ""`.
- Restore byte-identical (`git diff --quiet`), **70/70** again.

The wire half's `RUN.md` was rescued off `wt-trn-names` into the same directory; its two 340 KB `.trx`
were **not** copied — C5 refuses a trx as a reason anything is finished, and the RUN.md states the same
two numbers. Landing caveat recorded in the artifact: the backend half is on an unlanded branch.

```
$ plan verify L-TRAIN-EVIDENCE-NAMES-COURSE --evidence docs/plan/evidence/L-TRAIN-EVIDENCE-NAMES-COURSE/evidence.md
plan: evidence inadmissible — exit: “every completion row displays the course title and version, pinned by both a component test and a wire test” does not name docs/plan/evidence/L-TRAIN-EVIDENCE-NAMES-COURSE/evidence.md
EXIT=6
# exit line re-read by exact string and amended with ", recorded in <path>" only
$ plan verify L-TRAIN-EVIDENCE-NAMES-COURSE --evidence docs/plan/evidence/L-TRAIN-EVIDENCE-NAMES-COURSE/evidence.md
L-TRAIN-EVIDENCE-NAMES-COURSE built-unverified -> verified
EXIT=0
```

**`L-GR-DEADLINE-STATUTE`.** Batch 3 declined it because a `.trx` cannot show that a doc comment names a
rule. The doc does name all three, and now lives where a stranger can read it: `GrowthPrivacyObligation.cs`
at `lane/gr-deadline-statute @ f7abfd8e9` (blob `66794cf1…`) copied byte-for-byte —
`sha256 2ffefcaa2c1c2e57be97d7dc47e7b2fb195af8ddd3a6ee2d867477049c82f748` on both the copy and
`git show`. It names **art. 3(4)** as NOT IMPLEMENTED with its direction, worst case and blocker (public
holidays are per-Member-State data the product holds for no market); **art. 3(2)(c) end-of-day expiry** as
NOT IMPLEMENTED with the consumer that trips early; and records the **timezone reading** with a worked
example — 31 March 2026 01:30 Oslo → an Oslo screen prints 1 May where the venue calendar gives 30 April —
refusing to rule it (*"a question of law and nothing here rules it"*). Three named pins hold each.
**Stated in the artifact rather than buried: none of it is on the trunk**, where the same file is blob
`0dd3801f…` and carries none of the three paragraphs.

```
$ plan verify L-GR-DEADLINE-STATUTE --evidence docs/plan/evidence/L-GR-DEADLINE-STATUTE/evidence.md
L-GR-DEADLINE-STATUTE built-unverified -> verified
EXIT=0
```

### Needs an owner ruling — 3

| lane | reason shape | the ruling that is owed |
|---|---|---|
| `L-MEALS-LEVER-WITHHOLD` | **(4) proves the opposite, deliberately** | the exit asks to withhold; `D-SPEC-L-MEALS-LEVER-WITHHOLD` is `ruled: retitle-and-pin 2026-08-05 by @sven`, and the plan's own lane body says *"The exit below asks for the opposite of what was ruled. Do not satisfy it."* Either amend the exit to the ruled shape or retract the lane — **an agent must not make that edit** |
| `L-THE-EVIDENCE-A-STRANGER-CANNOT-REACH-IS-COMMITTED` | **(3) proves less — so the missing case was measured** | the exit offers two buckets and the world needs four |
| `L-LIVE-WORLD-SECOND-HUMAN` | **(4) + C5** | an owner **act**, not a ruling in words: `AppSettings__AdminUserPhoneNumber` set to a digit phone |

**The census, derived afresh** (`derive-census.py` + `census-2026-08-09.md` beside the evidence). Batch 2
declined this lane because twenty-one was *"an inherited list, not a derived universe"*. Derived today over
`plan.md`: **64 built-unverified lanes** (not 91 — siblings are verifying as this runs), **59 file-shaped
tokens**, of which **47 tracked at HEAD**, **5 committed on another ref**, **4 on disk and committed
nowhere**, **1 outside any repository**, and **2 whose citation resolves nowhere although the artifact is
committed** (one carries a literal ellipsis, `.../3cf288fb.../RUN.md`, in `plan.md`; one is off by a path
segment). The finding that decides it: **24 of the 64 lanes name no file-shaped token at all**, so the
exit's universal has an empty domain for the largest group of unreachable lanes and could be reported 100 %
covered without touching them. Of the five uncommitted, exactly one was dischargeable here — and it was
discharged, as `L-WF-DEMO-PRESENCE`'s unrecoverable record; one is under the standing `web-livewalk`
prohibition; three belong to lanes this batch may not run `plan verify` against, which the exit requires.

**The live-world boundary, re-measured at the trunk** rather than relayed from `8e2b57de`: `Login`
(`UserController.cs:188-190`) holds **two** independent no-SMS doors — the demo pair and the power-user
pair — so the exit's first clause is reachable the moment the second is configured;
`IsNoSmsPhoneNumber` (`UserService.cs:707`) is confirmed a **lock-out** (the token is generated, never
sent, and still verified); `ServiceCollectionExtensions.cs:181` limits user names to `+0123456789`, which
is why a placeholder sentence cannot become an account. **A third wall the exit does not mention:** the
acknowledge leg (endpoint 44) runs
`EnsureStageWriteEnabledAsync(..., WorkforceFeatureFlags.SelfService, ...)` at
`WorkforceSelfService.cs:259,326`, and that descriptor's default is `false`. No credential value appears in
the artifact (C7).

### Cannot close without work outside this lane — 3

| lane | reason shape | what is missing, exactly |
|---|---|---|
| `L-PRINT-HOST` | **(3) proves less than "every"** | one rendered A4 PDF of `/admin/brev`, and a stated sampling rule for the other 45 shell pages |
| `L-WF-DEMO-PRESENCE` | **(1) the write-up was destroyed** | a SQL slot and a full `demo-up.sh` from an empty database |
| `L-WF-PUSH-STILL-LIES` | **(1) no artifact — sweep now recorded** | the branch landed, then a run |

**`L-PRINT-HOST`, counted.** At `6e6acd0` (which **is** an ancestor of `feature/restaurant-modules`; the
work landed) `artifacts/journeys/admin-print-host/` holds **three after-PDFs covering two documents** —
personalliste portrait, personalliste landscape, vaktplan — plus two before-PDFs and two screenshots. The
population: **61** files under `pages/admin/`, **47** pages inheriting the shell whose gutter was the
defect (the lane's own number, written into `AdminPage.vue`), **2** admin pages carrying a print stylesheet
of their own. The second of those two is `pages/admin/brev.vue`, which **`AdminPage.vue`'s own doc names**
as one of the two shipped print documents that had not repeated the fix — and it has no PDF. So *every*
rests on a central change plus a blast-radius argument, not on the instrument the exit names. Also carried:
the lane's RETURN records `/admin/workforce-schedule` still clipping its TIMER column on A4 — one of the
two documents that **were** rendered.

**`L-WF-DEMO-PRESENCE`, recorded unrecoverable with the reason.** `final-run.txt` was overwritten **in
place** by a sibling writing to the same shared scratch path — no reflog, no worktree copy, no stash;
`wt-wfdemopres` is clean and the branch commits only `seed-workforce-demo.sh` (+208/−49) and `RUNBOOK.md`.
What is still checkable from the script: punches go over HTTP to `$API_BASE/workforce/pos/clock-events`
asserting `accepted` and `sessionState == "Closed"`; **no `INSERT` against the personnel-list projection
exists on the branch or its base**; and step 13b refuses unless each seeded day shows 2 rows, both closed
**by a superseding entry**, `presentCount == 0`, every category `Employee`, and a `diff` of the punched
instants against the sheet's. All of that is a property of a script. The exit is a property of a running
world, and this lane holds class `node`, one point, no SQL slot.

**`L-WF-PUSH-STILL-LIES` — the sweep Batch 0 said existed nowhere.** Clause 1 is a negative universal, so
it was swept over both corpora. **RETURNs: clean** — 4 of 634 files mention `uninstall`, none claims
closure, two disclaim it in terms, and one of those disclaimers is an amendment this lane made to
`L-WF-PUSH-SILENT`'s RETURN. **Code: the branch states the limit at five sites; the trunk still makes the
claim at two** — `WorkforcePushNotificationDelivery.cs:24-28` and `:100-104` both read the probe as
covering *"the worker who uninstalled the app"*, which is false because the hub prunes lazily.
Clause 3 likewise: `git grep ActorReference -- WebApi.Tests/Workforce/ScheduleAuditLedgerTests.cs` at the
trunk returns **nothing** (actions and counts only, `:43`, `:47`), while the branch adds a by-value pin
across two genuinely different actors. **So all three clauses hold on `100ae0001` and clause 1 is
demonstrably false of the estate.** `569887a5` is an ancestor of the trunk; `100ae0001` is not. This is a
landing followed by a run, not a citation.

### What this batch is worth reading for beyond the count

**A green tier proved nothing here and a red proved everything.** The one lane closed on new measurement
was closed by three mutations of decreasing blast radius, and the middle two are the ones that mean
anything: M2 and M3 each red exactly one clause of the exit while 68 and 69 other tests stay green. M1 —
the obvious mutation, deleting the whole cell — reds eight, five of them for a reason that has nothing to
do with the exit. **A mutation that reds a lot is weaker evidence than one that reds precisely.**

**Two of the six declines are the same defect at different scales.** `L-WF-PUSH-STILL-LIES` is a branch
whose comments are honest sitting beside a trunk whose comments are not; `L-GR-DEADLINE-STATUTE` was a doc
that told the truth in a place nobody could read. The estate keeps producing correct work on unlanded
branches and then citing it as though the branch were the world. Of the eight lanes in this batch, **five
name a branch that is not an ancestor of its trunk**.

**The census names a defect no tracked-ness sweep can see:** a citation that resolves nowhere although the
artifact is committed. `plan.md` currently contains a literal ellipsis as an evidence path. A sweep looking
for uncommitted files reports that lane as fine.

## Batch 3

Eight lanes, one at a time, each starting from the decline already recorded in `instrumentless-exits.md`
rather than re-derived. **6 closed, 2 left open on purpose.** Every artifact is under
`docs/plan/evidence/<LANE-ID>/`, force-added past the bare `artifacts/` ignore rule and confirmed with
`git ls-files --error-unmatch`; each carries the lane's original `evidence:` line, because `plan verify`
overwrites it. Backend trunk `6d5328004`, unmoved. Nothing pushed. :5091 and :5941 untouched.

**Six of the eight needed a run, not a citation.** Four `.trx` triples and one jest quadruple were produced
today — a clean run, a mutation, and the restore, each with an executed count that stays identical across
the three so a red cannot be a void run, and each with `WebApi.dll`'s mtime moving before every measurement.

### The ledger

| lane | reason-shape hit | what was produced | `plan verify` said |
|---|---|---|---|
| `L-A-STORE-CANNOT-GRANT-ITSELF-A-CUSTOMERS-REQUEST` | **1** missing write-up — receipts committed to no ref in either repo | the three `.trx` moved onto a tracked path plus the mutation written down: `OrderService.cs:788`, the `!` removed, both arms `Expected: False / Actual: True` and `Expected: True / Actual: False`, `executed="2"` in both runs | `L-A-STORE-… built-unverified -> verified` (exit 0) |
| `L-GR-CONFIRMED-EMAIL` | **2** green where a red is demanded | the red: `|| !account.EmailConfirmed` deleted from `RequireOwnAccountAddressAsync` **against the trunk in a detached worktree**; `Expected: 403 / Actual: 200`; exactly one arm of seven; `executed="7"` in all three runs | `L-GR-CONFIRMED-EMAIL built-unverified -> verified` (exit 0) |
| `L-GR-POSTMARK-WEBHOOK` | **1** no instrument at all — four suite names, four counts, no path | the suites re-run with a trx (46/46 by name), plus a mutation routing `Delivery` and `Bounce` to the `Ignored` branch: `Expected: Delivered / Actual: ProviderAccepted` and `Expected: Bounced / Actual: ProviderAccepted` | `L-GR-POSTMARK-WEBHOOK built-unverified -> verified` (exit 0) |
| `L-WF-KODEOVERSIKT-UI` | **1** in its worktree-only form | `evidence.md`, `journey-green.json` and the journey spec extracted from the branch onto a durable path, with the eight browser steps mapped clause by clause | `L-WF-KODEOVERSIKT-UI built-unverified -> verified` (exit 0) |
| `L-A-KILL-CERTIFICATE-REQUIRES-A-TEST-TO-HAVE-RUN` | **1** evidence absent, worktree pruned | **both** clauses re-measured at `316f22ae`: the four pin arms red against `c65b19c` (5 red) and `05c160a` (4 red) by swapping the historical runner in, restored byte-identical; and the tier — **172 suites / 4138 tests / 0 failures** | `L-A-KILL-CERTIFICATE-… built-unverified -> verified` (exit 0) |
| `L-WF-CLOCK-WIRE` | census said **4**; measurement says **1** — see the correction below | the six wire tests run (6/6) plus a mutation putting both exception outcomes back to `Open`: two red, `Expected: None / Actual: Open` | `L-WF-CLOCK-WIRE built-unverified -> verified` (exit 0) |
| `L-EV-GUEST-ORIGIN` | **5** half of a two-part exit | a finding naming exactly the unshown clause, and the trunk-side facts an owner needs to rule | `evidence inadmissible — exit … does not name …/FINDING.md` (exit 6) — **deliberate; the exit was not amended** |
| `L-EV-JOURNEY-TIMEBOMB` | **5** half of a two-part exit | the nine artifacts rescued from an untracked directory, plus a finding on why the live half is unshowable as the spec stands | `evidence inadmissible — exit … does not name …/FINDING.md` (exit 6) — **deliberate; the exit was not amended** |

**Closed: 6. Needs an owner ruling: 2. Cannot be closed without work outside this lane: 2** — the same two,
counted twice on purpose, because each needs *both* a decision and, if the decision goes one way, a build.

### One correction to `instrumentless-exits.md`

`L-WF-CLOCK-WIRE` was declined on the ground that *"`git grep clock-state -- 'Controllers/*.cs'` at the
trunk returns nothing, so the read the exit's fourth clause names is not in the estate at all."* The first
half is right; the conclusion is not. `git log --all -S"clock-state" -- 'Controllers/*.cs'` returns
`f14c91ec1`, and the route is there in full — `[HttpGet("clock-state")]` at
`Controllers/WorkforcePosController.cs:161`, module-gated, resolving the operator through the
manager-reviewed `WorkforceStaffMember.OperatorId` link. It is on the lane's own unlanded branch.

That distinction is the whole difference between reason-shape 4 and reason-shape 1: **an exit that names a
capability nobody built needs a ruling; an exit that names a capability that has not landed needs a merge.**
Only the first is a reason to refuse to build toward the exit. A `--` grep at one ref is not a search of the
estate, and this is the second lane in this batch where `git log --all -S` answered a question a `git grep`
at the trunk had answered wrongly.

### What `verified` does and does not mean in this batch

Four of the six closed lanes sit on branches that are **not ancestors of the backend trunk**:
`L-GR-POSTMARK-WEBHOOK` (`5b895dc4`), `L-WF-CLOCK-WIRE` (`f14c91ec`), `L-WF-KODEOVERSIKT-UI`
(`19ad0015`, frontend) and `L-A-KILL-CERTIFICATE-…` (`316f22ae`, frontend). Each artifact says so in its own
words. `verified` here means *the exit's sentence is established by an artifact a stranger can open*; it does
not mean the capability ships. The landing gap is real and belongs to the landing lanes — and for
`L-A-KILL-CERTIFICATE-…` it carries an order that must not be lost: `git diff c65b19c 40ab62d` over both
files is **empty**, so landing `40ab62d` alone ships the 131-line runner that certifies kills from runs that
never happened.

Two closed lanes did land: `L-A-STORE-…` (`28e60e6b8`) and `L-GR-CONFIRMED-EMAIL` (`801d36a3`) are both
ancestors of `6d5328004`. In the second case the *code* landed and the *red* never did, which is precisely
the shape this batch was raised to fix.

### The two that stay open, in one line each

- **`L-EV-GUEST-ORIGIN`** — the refusal half is not missing from the estate: `EventsDepositPaymentPortAdapter`
  throws before calling Vipps (`Assert.Equal(0, vipps.InitiateCallCount)`) and
  `EventsDepositVippsFallbackTests` is at the trunk today even though `fc09be1d` is not an ancestor of it.
  What is missing is the **tier**: that class carries no `[Collection(WireCollection.Name)]`, and a wire arm
  for an unconfigured origin needs a second host composition, because the wire host binds the origin that
  clause 1 exists to guarantee. Build it, or rule that the two pins together satisfy the intent — but rule
  it, do not reword it.
- **`L-EV-JOURNEY-TIMEBOMB`** — clause 2 is shown as well as any lane in this program shows anything: 15
  mutations, red by name, 42/42 restored. Clause 1's four browser runs reproduce the coin flip cleanly
  (ARM B: `toHaveCount expected 1 received 2` at spec:304) but against the lane's own fixture; the spec
  carries `@fixture` and pins store 42, so it is **filtered out of live mode by construction**. Behind that
  sits the real blocker: the lever restore is a step, not a teardown, and **ten other registered journeys
  also end with a module flag up**, so a live world poisons the run after it. Prove one journey live before
  that is fixed and the green will not survive its neighbours.

### Two notes for whoever runs the next batch

**A worktree can be made honest.** Two hazards make a fresh worktree red for reasons that are not the code's:
an empty `core/` submodule mount, and `test/journey-artifact-store.test.js`, which asserts the process
holding the fixture port runs from a directory literally named `Web-modules`. Both were found by
`L-WF-KODEOVERSIKT-UI` and written down. Creating the worktree at `…/killcert/Web-modules` and copying
`core/` in is what turned the kill-certificate tier from an unreproducible claim into 172/4138/0 — that is a
sibling's residue paying for a lane it never knew about.

**Where an exit turns on a red, the mutation is usually one line and usually already named** — in the
commit message, in the class comment, or in the RETURN's own log. Four of the five mutations in this batch
were read straight out of the prose of the change they test (`OrderService.cs:788`'s inequality, the
`EmailConfirmed` clause, the `Delivery`/`Bounce` record types, `StateOf`'s exception outcomes). The
expensive part was never finding the mutation; it was having a warm build and a filter narrow enough to run
it three times.
