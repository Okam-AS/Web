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

## Batch 2

Eight lanes, worked one at a time against the declines already recorded in `instrumentless-exits.md` — the
reason each failed was read there and acted on, not re-derived. **Five closed, two declined again with a
written finding, one closed with a disagreement recorded for an owner.** Backend trunk `6d5328004`,
unmoved; nothing pushed; no container started; `:5091` and `:5941` left alone. Every artifact is under
`docs/plan/evidence/<LANE-ID>/`, force-added past the bare `artifacts/` ignore rule and confirmed with
`git ls-files --error-unmatch`. Each lane's original `evidence:` line is copied verbatim into its artifact,
because `plan verify` overwrites it.

**Nine new runs were produced for this batch, thirteen `.trx` committed, and eight mutations applied and
restored.** Two of the eight lanes needed no run and got a written finding instead; two got a temporary
probe that was applied, measured and **removed**, leaving both worktrees clean.

### The count

| outcome | n | lanes |
|---|---|---|
| **closed** (`plan verify` accepted) | **6** | `L-THE-EVENTS-DRAIN-STORE-COUNTER-IS-READ`, `L-THE-MEALS-TESTS-ARE-PROVEN-FALSIFIABLE`, `L-WF-IDEMPOTENCY-REFUSAL-REST`, `L-WF-BOOTSTRAP`, `L-MIG-COMPANY-RECEIVABLE`, `L-VIPPS-REDACT-404` |
| **needs an owner ruling** | **1** | `L-EV-URI-RELATIVE` — *on every platform* is unmeasurable from this host; either a Windows run, an invariance pin, or a ruling |
| **cannot be closed without work outside this lane** | **1** | `L-GR-TESTSEND-GUARD` — the wire pin needs two rows added to the shared `WireHostFixture`, which is a landing decision |

One of the six closures, `L-VIPPS-REDACT-404`, carries a **recorded disagreement** with the prior pass and
is flagged below rather than presented as a clean win.

### Closed — what was missing, and what was produced

| lane | reason-shape | what was produced | `plan verify`, verbatim |
|---|---|---|---|
| `L-THE-EVENTS-DRAIN-STORE-COUNTER-IS-READ` | **missing write-up** — the exit's object is a *written finding*; the evidence was two `.trx`, and a trx names no bound and no mutation | `evidence/…/FINDING.md`: the bound (`StoresWithheld = dueStores.Count − dispatchableStores.Count` at `EventsNotificationDrainService.cs:122`, `dispatchableStores` a subset by construction, `dueStores` a DISTINCT over StoreId ⇒ bounded by **fleet size**), MUT-A named (subtraction → constant `0`), executed=9 in both runs, 9/0 then **4/5**, the five red arms by name with `Expected: 1 / Actual: 0`, and **why five and not six** (line 59 asserts `Equal(0,…)` and the mutant satisfies it). Both trx copied in. | `L-THE-EVENTS-DRAIN-STORE-COUNTER-IS-READ built-unverified -> verified` (EXIT_CODE=0) |
| `L-THE-MEALS-TESTS-ARE-PROVEN-FALSIFIABLE` | **missing write-up** — content sound, no single artifact carried it, and `plan verify` had already refused the lane directory | `evidence/…/SUMMARY.md`, every figure **recomputed from the runner JSON**: three `neverReddened: []` over 29 + 37 + 49 = **115**, 102 mutations / 101 RED / 1 STILL-GREEN (the sound equivalence), killers-per-test min 1 in all three maps, the **32** previously-unproven listed by name (11 + 3 + 18), and the five `THE DEFECT` pins shown to be **inside** the 115 with killers. All 17 runner files copied to `runner-output/`. | `L-THE-MEALS-TESTS-ARE-PROVEN-FALSIFIABLE built-unverified -> verified` (EXIT_CODE=0) |
| `L-WF-IDEMPOTENCY-REFUSAL-REST` | **a green where a red was demanded** — the three `RefuseAsync` sites were on the trunk, the "reds if the recording is removed" clause was a sentence in a RETURN | **the red, three times.** `evidence/…/MUTATION-RECORD.md` + 5 trx: baseline 38/38, M1 import (`…ImportService.cs:246`) 37/**1**, M2 issue (`…InvitationService.cs:178`) 37/**1**, M3 claim (`:401`) 37/**1**, restored 38/38 — **executed=38 in all five**. Each reds **only its own** site, with the body code in the message (`Expected: workforce.import-conflict / Actual: workforce.idempotency-in-progress`, and the two siblings). Fourth clause read at the trunk: `Assert.Equal("Refused", …)` at `WorkforceD1RaceSqlServerTests.cs:105` and `:207`, **not executed** (no SQL slot) and said so. | `L-WF-IDEMPOTENCY-REFUSAL-REST built-unverified -> verified` (EXIT_CODE=0) |
| `L-WF-BOOTSTRAP` | **half of a two-part exit** — the seed half held; the wire half had a source file and **no recorded run** | `evidence/…/RUN.md` + 3 trx. Half one: baseline 4/4, **M1** (`WorkforceManager` dropped from `BootstrapGrants`) 3/**1** redding exactly `A_fresh_stores_administrator_opens_workforce_over_http_and_the_engagement_manages` with `Assert.Contains() … Not found: WorkforceManager / In value: ["WorkforceSelf","WorkforceScheduler"]`, restored 4/4, mtime moved every arm. Half two re-measured: **zero** `INSERT INTO WorkforceStaffMembers` at `9d1719df` (four hits are prose and one `SELECT`), **line 167 at base `3579bbbc`**, and `git show --stat` puts the seed and the wire test in **one commit**. | `L-WF-BOOTSTRAP built-unverified -> verified` (EXIT_CODE=0) |
| `L-MIG-COMPANY-RECEIVABLE` | **one half in each candidate file** — the migration file said nothing about the export, and the export files were never named | `evidence/…/BOTH-HALVES.md` + 3 trx, one file carrying both. Migration half, C2 measured on the chain rather than argued: **exactly one** migration in all 51 mentions the column; the **preceding** Designer has 0 occurrences and both **following** Designers have 1; snapshot lines 8635 / 8638 / 8665 put it beside its two siblings. Export half as a red: baseline 9/9, **M1** (the `case PaymentType.CompanyAccount:` branch disabled so the tender falls to `AccountNumberReceivables`) 6/**3**, restored 9/9 — including `…RefusesInsteadOfPostingToReceivables` failing `Assert.Throws()` with *"(No exception was thrown)"*, i.e. **a blank account silently posts** under the mutant. | `L-MIG-COMPANY-RECEIVABLE built-unverified -> verified` (EXIT_CODE=0) |
| `L-VIPPS-REDACT-404` | **no artifact + the RETURN retracts half the premise** | `evidence/…/RUN-AND-FINDING.md` + 5 trx. baseline 15/15; **M1** (unrouted branch removed) 9/**6**; **M2** (M1 + `Survives(…)` fail-closed check disabled) 8/**7** — **the leak reproduced**: `Found: 6f1b0c9e-…-2a5c8d3e41ff / In value: https://api.okam.no/events/deposits/6f1b0c9e-…-2a5c8d3e41ff.`, the trailing-dot case the exit names; **M3** (routed replacement disabled) 10/**5**, redding all three percent-encoded cases; restored 15/15, executed=15 throughout. **See the disagreement below.** | `L-VIPPS-REDACT-404 built-unverified -> verified` (EXIT_CODE=0) |

### The two that stay open, which is the part that matters

**`L-EV-URI-RELATIVE` — declined again; the exit overclaims, and I measured how far short it falls.**
Clause two holds on a real run: `m1-mutant.trx` reads `executed="79" passed="70" failed="9"`, the nine reds
named, three of them the **mail path returning `Delivered == true`** — the guest actually sent the `file://`
link. Clause one, *on every platform*, is measured **nowhere**; `RUN.md`'s own header says
*"Host: darwin (Unix)"*. What I added: the refusal is a **disjunction of two arms**, and those two arms are
exactly the two ways a platform's parser can classify a relative origin. A temporary probe (applied,
measured, **removed** — tree clean) drove 14 origins through the real `EventsGuestLink.DepositPagePrefix`:
**7 take arm A** (`TryCreate` succeeds, scheme `file`/`javascript` — including the Windows-shaped
`C:\wwwroot\guest` and `\\server\share`), **5 take arm B** (`TryCreate` fails), and **only the two genuine
http(s) origins are accepted** (`platform-arms.txt`). So both arms are *executed* here rather than merely
argued — and it still is not the exit, for two reasons stated in the finding: it is one host, and the probe
is gone, so **no platform-invariance pin exists in the tree**. Named remedies: a theory asserting the
refusal whichever arm fires, or a Windows CI trx, or an owner ruling that the phrase was never a
measurement. The four committed receipts were also **rescued off the worktree** into
`docs/plan/evidence/L-EV-URI-RELATIVE/`.

**`L-GR-TESTSEND-GUARD` — declined again, and the reason in the RETURN turns out to be the wrong reason.**
The exit names a **wire test**; what exists is a controller invocation
(`var refused = (ObjectResult)await owner.TestSend(…)`). The RETURN explains this with *"A 401 wire pin is
undriveable, so I wrote none"* — but the exit never asks for a 401. So I drove the real route through
`WireHostFixture` with a temporary probe (applied, measured, **removed**; tree clean) and the wire answers
`404 growth.not_found` to **every** arm, including AdminB's (`wire-probe.txt`). Two facts nobody had
recorded: the wire seed carries **no newsletter row**, so the ownership load 404s before
`RequireOwnAccountAddressAsync` is reached; and every wire admin is a phone-signup user with **no `Email`**
(`WireHostFixture:407-410`), so even with a newsletter the refusal would fire for the *wrong reason* — a
confounded refusal, worse than no pin. **The obstacle is the wire world's seed, not the tier**, and closing
it means adding two rows to a fixture every wire suite shares. That is a landing decision this lane may not
take; the finding names the exact two changes and the shape of the resulting test.

### The disagreement, recorded rather than smoothed over

`instrumentless-exits.md` declined `L-VIPPS-REDACT-404` on the ground that its second clause *"asks for a
fix to something the lane proved was never broken, so it needs re-ruling before any evidence could satisfy
it"*. **I verified it anyway, and a reader should know why and be able to reverse me.** The exit's sentence
is an observable — *both reach telemetry with the credential replaced, shown by fast-tier theory cases
including a trailing-dot deposit link* — and it says nothing about which of the two was previously broken.
Read that way it is now measured, with a falsifiability proof for each half. Read as a claim that both were
holes this lane closed, the second half is false and no evidence could make it true. **The artifact carries
the H2 retraction in full, above the verification**, including what was actually repaired on that half (the
unchanged-URL check was **fail-open**; it now verifies the output against what it removed, and M2 is that
check's proof). If the owner takes the second reading, `plan unverify` is the correct answer and the
artifact is still the record.

Also worth an owner's minute: `plan.md` carries a blocker `cleared_by: L-VIPPS-REDACT-404` whose note says
**step two was owed** — *"prove the green is real rather than vacuous, the way the callback lane did by
mutating its suite both ways"*. M1/M2/M3 are that step, both paths reopened and both red. **This lane may
not clear a flag**, so it is named here for whoever can.

### Three things this batch learned that generalise

**`plan verify` refuses evidence the `exit:` line does not name — that is `§6.1`, not a path bug.** A
correct, committed, tracked artifact at `docs/plan/evidence/<LANE-ID>/FINDING.md` still exits 6 with
*"exit: … does not name …"*. Closing a lane therefore has two parts: produce the instrument **and** append
`, recorded in <path>` to the exit. Appending a path is not softening a claim; every clause in all six
amended exits is unchanged.

**A mutation can be killed by a *different* safeguard than the one you aimed at, and the count will not tell
you.** `L-VIPPS-REDACT-404` M1 reds six arms — all on `Assert.NotNull()`, because with redaction gone the
fail-closed check *drops the URL* rather than publishing it. Only M2, disabling both, reproduces the actual
leak. A single mutation there would have produced six honest reds and a wrong story about what protects the
guest.

**Two of these lanes were closable only because the work already sat on the trunk unnoticed**
(`L-WF-IDEMPOTENCY-REFUSAL-REST`, `L-MIG-COMPANY-RECEIVABLE`), and two more needed nothing but a run in a
worktree that was still on disk and still built. The instrument problem and the landing problem are
different problems; this batch is the first, and it did not move a branch.

## Batch 5

Seven lanes, each taken at the decline already recorded in `instrumentless-exits.md` and **worked rather
than re-argued**. **4 closed · 2 need an owner ruling · 1 cannot close without work outside this lane.**
Backend trunk `6d5328004` unmoved; frontend `feature/restaurant-modules` `5296dca8` unmoved. Nothing pushed.
The demo APIs on `:5091` and `:5941` were left running and untouched, and no container was started or
stopped.

Every artifact is under `docs/plan/evidence/<LANE-ID>/`, force-added and confirmed with
`git ls-files --error-unmatch`. Each carries the lane's **original `evidence:` line copied verbatim into its
text** before `plan verify` overwrote it — and it did overwrite it: all four closed lanes' `evidence:` lines
now read as a single path, with the branch, SHA and counts surviving only inside the artifact.

**Nothing was measured in a shared checkout.** Both repositories' working trees carry other agents'
uncommitted work, so every run below happened in a private `git worktree add --detach`, removed afterwards.
That was not hygiene for its own sake — it changed a result: the plan repo's working tree is **behind the
frontend trunk on three of the nine files `L-PRICE-BYPASS-FIVE` touches**, so an in-place run would have
measured an older tree and reported it as the estate.

### Closed — 4

| lane | reason shape | what was produced |
|---|---|---|
| `L-WF-WITHHELD-BOUND` | **(1) the run happened, nobody wrote it down** | the four-state mutation record written, and the six `.trx` rescued out of `wt-wfwithheld` to a durable path |
| `L-PRICE-BYPASS-FIVE` | **(1) no openable record of the pins** | the 40 pins run at the frontend trunk, plus two mutations — 22 red and 6 red — and a rotted citation corrected |
| `L-GR-CONFIRMED-PIN-FIX` | **(5) one of three clauses shown** | clauses 2 and 3 measured against the estate at the trunk and at the pre-fix base |
| `L-THE-SIX-UNLANDED-BRANCHES-REACH-THE-TRUNK` | **(1) the refusal existed only as RETURN prose** | the record with both counts, every ancestry re-measured, **plus the tier run at the composed tip** |

**Verbatim, in the order run:**

```
$ plan verify L-WF-WITHHELD-BOUND --evidence docs/plan/evidence/L-WF-WITHHELD-BOUND/mutation-record.md
plan: evidence inadmissible — exit: “a superseded publication's outbox rows reach a terminal state and a
withheld row whose week has ended stops being re-polled, pinned by a test that reds if either transition is
removed” does not name docs/plan/evidence/L-WF-WITHHELD-BOUND/mutation-record.md
EXIT=6

$ plan verify L-WF-WITHHELD-BOUND --evidence docs/plan/evidence/L-WF-WITHHELD-BOUND/mutation-record.md
L-WF-WITHHELD-BOUND built-unverified -> verified
EXIT=0

$ plan verify L-PRICE-BYPASS-FIVE --evidence docs/plan/evidence/L-PRICE-BYPASS-FIVE/mutation-record.md
L-PRICE-BYPASS-FIVE built-unverified -> verified
EXIT=0

$ plan verify L-GR-CONFIRMED-PIN-FIX --evidence docs/plan/evidence/L-GR-CONFIRMED-PIN-FIX/three-clauses.md
L-GR-CONFIRMED-PIN-FIX built-unverified -> verified
EXIT=0

$ plan verify L-THE-SIX-UNLANDED-BRANCHES-REACH-THE-TRUNK --evidence docs/plan/evidence/L-THE-SIX-UNLANDED-BRANCHES-REACH-THE-TRUNK/six-branches.md
L-THE-SIX-UNLANDED-BRANCHES-REACH-THE-TRUNK built-unverified -> verified
EXIT=0
```

**The exit-6 is worth carrying**: `plan verify` refuses until the `exit:` line **names the path**, so each
close required appending `, recorded in <path>` to the exit by exact-string match — re-read immediately
before the edit, because six siblings were writing `plan.md` throughout. No `--override` was used and none
was needed.

**`L-WF-WITHHELD-BOUND`.** Six `.trx` and a runner existed inside `wt-wfwithheld`; a `.trx` names no mutation
and a runner carries no outcome. **No new run was needed**, and two checks make the old one a claim about the
trunk rather than about a branch: the pin file is the **same blob**
(`289c10e2c9d632010e718e549c356350a7bf34c1`) at `74405b34d` and at `6d5328004`, so the trx's `line 79` and
`line 106` index the trunk's own file; and both mutated production blocks are verbatim at the trunk
(`WorkforceSchedulePublishService.cs:407`, `WorkforceNotificationDispatcher.cs:72,251-259`). One test carries
both transitions and reds under either mutation — M1 `Expected: Superseded / Actual: Withheld`, M2
`Expected: 1 / Actual: 0` — with `executed="2"` in all five states and the sibling control green throughout.

**`L-PRICE-BYPASS-FIVE`, and the citation had rotted underneath it.** The evidence was
`refs/lanes/L-PRICE-BYPASS-FIVE = 8c6e91fa`, a **local movable ref**, and it has moved: it resolves today to
`c4a4fa44`. `8c6e91fa` is **not an ancestor of `feature/restaurant-modules`** — it survives only on a
candidate branch and some unmerged lanes; `c4a4fa44` is the version that landed. **The disputed count is
settled: 40, not 39** — the plan said `39/39`, the RETURN said `40/40`, and `Tests: 40 passed, 40 total` at
the trunk says the RETURN was right. The suite's own shape is the exit: one describe block per formatter
family, each with *an amount that never arrived is withheld* / *a genuine zero is still printed as a figure*
/ *a stated amount is unchanged* — null, zero, stated. **M1b** (the absence gate removed) reds **22 of 40**,
hitting the absence arm of all five formatters **while every zero arm stays green**, with the defect as the
message: `Expected: "—" / Received: "0,00 kr"`. **M2** (the arithmetic coercing instead of propagating) reds
a **disjoint six**, all on the sum path.

**`L-GR-CONFIRMED-PIN-FIX`.** Clause 1 was already discharged by a receipt tracked at the trunk; clauses 2
and 3 were measured against the estate. **Clause 2**: at the pre-fix base `801d36a3` the seed carried
`bool emailConfirmed = true`, **15 call sites, not one passing the argument**, and the pin its own `<param>`
doc named sets the column on the entity instead (`GrowthTestSendBindingTests.cs:110,126`); at the trunk the
parameter is gone. **Clause 3**: the false sentence — *"the distinction would tell a caller which addresses
another account holds"* — returns **0 hits at the trunk**, and the replacement's two factual claims were each
checked rather than trusted (the guard reads one row, `Where(u => u.Id == userId)`; `GET /user` does return
the caller their own `Email` and `EmailConfirmed`, `UserController.cs:311-314` → `ApplicationUserModel.cs:38-39`).
The new text also covers **four** refusal reasons where the old covered two, matching the guard's actual
disjunction.

**`L-THE-SIX-UNLANDED-BRANCHES-REACH-THE-TRUNK`, where the missing half was worth running.** The counts —
**5 landed, 1 unlandable** — are now stated with every ancestry re-measured today rather than inherited: the
four backend branches are each an ancestor of the trunk via the four named `Land …` merges in
`7bf975572..d30c1c4d4`, the frontend `lane/statute-evidence-world` is an ancestor of
`feature/restaurant-modules`, and `lane/wf-demo-presence` is **not**, deliberately. Its four refusal reasons
were each re-derived: the diff is **two seed-script files and no test**, `adopt` occurs **27 times at the
trunk and 0 on the branch and 0 at their merge base** (so adopt mode arrived after the fork), the trunk
**prints to the operator** that *"an adopted world carries NO clock punches"* — which the branch's whole
change would falsify — and `git merge-tree` reports **4 changed-in-both regions**. And the tier half, which
the prior pass named as resting on bare counts, was **run**: no `artifacts/tests/` receipt exists for any of
those five SHAs, so the fast tier was executed at `d30c1c4d4` in a detached worktree —
**`total="5048" executed="5037" passed="5037" failed="0"`, exit 0, 7 m 33 s** — reproducing the evidence
line's *5037/5048* exactly. Asserted by name rather than by the green line: `CapabilityRouteTelemetryTests`
**15/15** and `WorkforceNotificationBacklogBoundTests` **2/2**, matching the RETURN's own per-lane `+15` and
`+2`. **The frontend tier was not re-measured** and its *184 suites / 4484 green* remains unbacked, which the
artifact says in those words.

### Needs an owner ruling — 2

| lane | reason shape | why it must not be closed |
|---|---|---|
| `L-GR-DISPATCH-ACTOR` | **(4) the exit names something not in the estate** | of three named subjects one is proven, one is **test-only**, and one **cannot be tested at all** |
| `L-WF-VIOLATION-EXACT` | **(1) → produced, then (4)** | the red now exists at the trunk, but the exit's nouns name a **different code path** from the one the pin measures |

**`L-GR-DISPATCH-ACTOR`.** `Entities/Margin/MarginPeriodStatement.cs` has 22 columns and **none is an
actor**; `MarginPurchaseSpendEntry` likewise; `Services/Margin/MarginStatementService.cs` contains **zero**
occurrences of `userId`/`actor`/`CreatedBy` and its four writes take no caller; `MarginStatementsController`
resolves the principal for the access gate and then discards it; and `git grep -l "MarginAudit"` returns
nothing, so there is no ledger to write into the way Growth had. The estate declares this deliberate —
`ModuleActorStampPin.cs:180-192`: *"Margin's whole human-attribution surface is one column: who uploaded the
price-import batch."* **There is nothing on disk a wire test could assert by value**, so closing that subject
is a schema change plus a write path plus a migration — **C2** territory, outside a verification lane. The
third subject is the opposite shape: the actor is already resolved and persisted
(`WorkforceSchedulePublication.PublishedByActorReference`, written at `WorkforceSchedulePublishService.cs:299`
from a caller resolved at `:75` out of `CurrentUserId()`), but **no wire test drives the publish route at
all** — the four occurrences of that column under `WebApi.Tests/` are seed literals. **The owner's question
is whether a Margin period statement is a C4 money-path write.** If it is, this is a build lane, and the exit
should be split: one exit conjoining a done subject, a test-only subject and an unbuilt one can never be
honestly verified whole.

**`L-WF-VIOLATION-EXACT`.** The missing write-up was produced and is the strongest artifact in the batch:
baseline **4/4 green**, the mutation (bare `SQLITE_CONSTRAINT` 19 restored) **2 failed / 2 passed**, restored
**4/4**, run **twice**, with the production `WebApi.dll` mtime moving at every step and its sha256 returning
**byte-identical** to the clean assembly (`58ecc33a` → `a1a77626` → `58ecc33a`). The red is the defect in
words: `Expected: Not "workforce.award-taken" / Actual: "workforce.award-taken"` — a NOT NULL failure, a
programming error, answered to the caller as *someone beat you to it*. It was run **at the trunk rather than
the lane branch**, the stronger claim: the trunk's copy of the predicate has since gained two more consumers
that delegate to it.

**And then the exit does not describe it.** The exit says *a revision-numbering write* and *the retryable
publish-your-successor refusal*. Measured: `workforce.award-taken` carries **`["retryable"] = false`**; the
publish-your-successor refusal is a different code from a state check
(`WorkforceScheduleProblems.cs:96-100`); and the revision-numbering write **is not classified at all** — the
unique index exists (`ApplicationDbContext.cs:2939`) but `WorkforceScheduleService.cs`, its only writer, has
**no `DbUpdateException` catch and no `IsUniqueViolation` call**, so a failure there propagates as a fault
and the exit's sentence was already true, vacuously, before the lane ran. The lane fixed the **shared
predicate** and pinned it where it is load-bearing — the right call; the exit kept its opening sentence's
nouns. **Renaming the exit to fit the pin is precisely the rewrite this program forbids**, so the wording
goes to an owner and the red is banked in the meantime.

### Cannot close without work outside this lane — 1

**`L-WF-ADJUST-ADDRESS` — reason (5), and worse than the decline recorded.** The prior pass said the two
halves sit in two unpushed worktrees. Measured, they also sit **on no trunk**: `f3887f9a1` is not an ancestor
of `6d5328004` and `e9ba89e2` is not an ancestor of `feature/restaurant-modules` or of the session branch;
neither is on any remote; at the trunk `WorkforceAttendanceDaySession` **does not exist** and
`WorkforceAttendanceCorrectionWireTests.cs` is **absent**. So at the trunk the adjustment endpoint is still
exactly what the lane body describes — live and undrivable by a person. The plan already knew:
`docs/plan/log.md:1066` records *"THE CORRECTION SURFACE IS NOT ON THIS BRANCH."*

The work is good and is now written down for whoever lands it: the read half is genuinely wire-pinned
(`The_manager_attendance_grid_names_the_clock_session_a_correction_addresses`, plus three correction facts
including a C1 append-only check on the raw punch and a by-value C4 assertion), and the page half is a real
control — a button, a form, a client binding onto `POST …/attendance/adjustments`, and a guard that throws
before the wire — landing **service, binding, control and page in one commit**, so C3 holds inside it. **The
unshown clause is the conjunction**: *"the rates page … pinned by a wire test"* cannot be true of a Vue page
from a backend suite, and no single test or repository covers both halves. Three things are owed — two
landings, an artifact (every count in the RETURN is a bare number with no file behind it), and a ruling on
what that last clause can mean.

### What this batch says about the remainder

**Three of the seven were about where the proof was put; four were about the exit's own sentence.** That is
a different mix from the earlier batches and it is the more expensive half: a misplaced artifact is a copy,
while an exit that misdescribes its estate needs an owner and cannot be fixed by any amount of running.

**Two citations had rotted since they were written, in two different ways.** `L-PRICE-BYPASS-FIVE` named a
**movable local ref** that has since moved to a different commit; `L-WF-ADJUST-ADDRESS` and
`L-WF-VIOLATION-EXACT` named **branch SHAs whose relationship to the trunk changed underneath them** — one
landed, one still has not. A SHA in an evidence line records where work *was*, never where it *is*, and
nothing in the plan re-checks it. **Every artifact in this batch therefore states its own ancestry
measurement**, so a later reader can tell whether it still describes the estate.

**A mutation that reds nothing is not always a weak pin.** `L-PRICE-BYPASS-FIVE`'s first mutation left all 40
tests green, and the count — 40 executed, same as baseline — ruled out a void run. The real cause was that
**the deleted line was redundant**: `null` and `undefined` already fell through to the function's trailing
`return false`, proven directly rather than argued. The recorded negative is worth as much as the red that
followed it, because the tempting conclusion — *these pins do not falsify* — was wrong.

**Three of the four closes needed no new run at all**, only a reading of the estate careful enough to be
written down: two blob comparisons for `L-WF-WITHHELD-BOUND`, two `git show`s at two revisions for
`L-GR-CONFIRMED-PIN-FIX`, and a handful of `merge-base --is-ancestor` calls for the six branches. The
expensive instrument — a 7½-minute tier at a historical tip — was needed for exactly one clause, and it
returned the number the RETURN had already claimed.

## Batch 1

Eight lanes, one at a time, starting from the decline already recorded in `instrumentless-exits.md` rather
than re-deriving it. Per lane: **which reason-shape it hit**, the missing thing produced, and `plan verify`'s
exact words.

**6 closed · 2 need an owner ruling · 0 that could not be attempted.**
Backend trunk `6d5328004`, unmoved. Nothing pushed, no branch moved, no container started or touched,
`:5091` and `:5941` left alone. Every tree I mutated was restored by **writing the bytes back** and shown
`git diff | wc -c` → **0** before the green re-run; `WebApi.dll`'s mtime was asserted to move on all
fourteen builds, so no `--no-build` run measured a stale assembly.

### The count, per lane

| lane | reason-shape hit | what was produced | outcome |
|---|---|---|---|
| `L-THE-END-OF-DAY-CLOSE-COUNTS-ONLY-MONEY-THAT-ARRIVED` | **(2) a green run where the exit demands a red** | the red: `CompanyAccount` back in the `default` arm → **2 red of 14**, by name, `Expected 25000 / Actual 0` | **closed** |
| `L-CONFIRM-POSTMERGE-PIN` | **(1) the run happened and nobody wrote it down** | Mutations A and B re-performed **at the trunk** → **2 red of 10** and **9 red of 10** | **closed** |
| `L-GR-TESTSEND-RECORD` | **(1) the RETURN named no instrument at all** | four mutations, three red sets and **one that reds nothing** | **closed, with a named gap** |
| `L-GR-APPROVAL-STATE` | **(1) proven in a place that dies** | the four captures rescued off `wt-gr-approval` onto a durable path | **closed** |
| `L-A-FAILED-REPORT-READ-REACHES-THE-OPERATOR` | **(1) + (5)** — artifacts on an unmerged branch, tier half prose | artifacts rescued, driver **re-run**, tier **re-measured**: 171/4103/0 | **closed** |
| `L-EV-INQUIRY-GATE` | **(5) two branch SHAs, two suite counts, second half a render** | both halves run: backend **4 red of 632**, frontend **2 red** and **1 red** of 30 | **closed** |
| `L-STATUTE-HONESTY` | **(4) proves a different window** + **(5) half in no capture** | a written finding; the exit was **not** built toward | **owner ruling** |
| `L-EV-OUTBOX-FLAKE` | **(4) the exit names what is not in the estate** | a written finding, plus a third-fix discovery | **owner ruling** |

### `plan verify`, verbatim, in the order run

```
$ plan verify L-GR-APPROVAL-STATE --evidence docs/plan/evidence/L-GR-APPROVAL-STATE/evidence.md
plan: evidence inadmissible — exit: “the detail read distinguishes never-approved from approval-revoked-by-edit, shown at the wire tier” does not name docs/plan/evidence/L-GR-APPROVAL-STATE/evidence.md
EXIT=6

  (the exit was then amended to name the artifact — the append-a-path amendment the citation pass used —
   and nothing else about it was changed)

$ plan verify L-GR-APPROVAL-STATE --evidence docs/plan/evidence/L-GR-APPROVAL-STATE/evidence.md
L-GR-APPROVAL-STATE built-unverified -> verified
EXIT=0

$ plan verify L-CONFIRM-POSTMERGE-PIN --evidence docs/plan/evidence/L-CONFIRM-POSTMERGE-PIN/mutation-record.md
L-CONFIRM-POSTMERGE-PIN built-unverified -> verified
EXIT=0

$ plan verify L-THE-END-OF-DAY-CLOSE-COUNTS-ONLY-MONEY-THAT-ARRIVED --evidence docs/plan/evidence/L-THE-END-OF-DAY-CLOSE-COUNTS-ONLY-MONEY-THAT-ARRIVED/mutation-record.md
L-THE-END-OF-DAY-CLOSE-COUNTS-ONLY-MONEY-THAT-ARRIVED built-unverified -> verified
EXIT=0

$ plan verify L-GR-TESTSEND-RECORD --evidence docs/plan/evidence/L-GR-TESTSEND-RECORD/mutation-record.md
L-GR-TESTSEND-RECORD built-unverified -> verified
EXIT=0

$ plan verify L-EV-INQUIRY-GATE --evidence docs/plan/evidence/L-EV-INQUIRY-GATE/mutation-record.md
L-EV-INQUIRY-GATE built-unverified -> verified
EXIT=0

$ plan verify L-A-FAILED-REPORT-READ-REACHES-THE-OPERATOR --evidence docs/plan/evidence/L-A-FAILED-REPORT-READ-REACHES-THE-OPERATOR/evidence.md
L-A-FAILED-REPORT-READ-REACHES-THE-OPERATOR built-unverified -> verified
EXIT=0
```

`plan verify` was **not** run for `L-STATUTE-HONESTY` or `L-EV-OUTBOX-FLAKE`. Their `exit:`, `state:` and
`evidence:` lines are exactly as they were.

**A refusal worth carrying to the other batches, beside Batch 6's "a directory is not an instrument":
`plan verify` also refuses an artifact the `exit:` line does not NAME** (exit 6, message above). The
amendment is the same append-a-path the citation pass made forty-four times; the artifact must exist first.
And the warning in the brief is exact — **every one of the six evidence lines was overwritten** with the
single path passed. Each original is preserved verbatim inside its own artifact under a heading that says
so, which is the only reason the branches, SHAs and counts the original agents recorded still exist.

### The three findings this batch produced that are not "a lane closed"

**1. `L-GR-TESTSEND-RECORD`: the exit names three facts and only two are pinned.** The mutation that drops
the record reds 3 of 36; the mutation that swaps the caller for an ambient `"system"` actor reds 3 with
`Expected: growth-iso-admin-a / Actual: system`; the mutation that drops `newsletterId` from the delta reds
1 with a `KeyNotFoundException`. **The mutation that destroys the timestamp reds nothing** —
`GrowthAuditWriter`'s `OccurredAt = _timeProvider.GetUtcNow()` replaced by `OccurredAt = default` leaves
36 of 36 green on the audit filter and, widened, **603 of 607 Growth tests green with 0 failed**. So *its
actor* and *its newsletter* are falsifiable and *its time* is a column nothing asserts. The exit's own
falsifiability clause ("reds if the record is dropped") **is** met, which is why the lane is closed rather
than declined — but an owner should decide whether the time deserves its own pin. The cheapest form is one
`Assert.Equal(harness.Clock.GetUtcNow(), recorded.OccurredAt)`; the injectable clock already allows it.
This lane deliberately did not write it: adding the assertion inside the pass that is measuring it is how
a guard stops meaning anything.

**2. `L-EV-OUTBOX-FLAKE`: three fixes exist for one defect and the estate shipped the weakest.**
`L-EV-OUTBOX-FLAKE` (`59a1d607`, unlanded) pins a token that *contains* both needles so the historical
failure reproduces on demand, and replaces the needles with a digit inventory. `L-EV-OUTBOX-GUID-SUBSTRING`
(`79f9dd7d`, unlanded) masks the token **by exact value** and deliberately does **not** cut the link out, so
an amount leaking inside the URL still fails, and adds a stray-identifier guard and a negative-control
theory. **The trunk carries neither**: it does `body.Replace(link, "")` — removing the whole URL — keeps a
random `Guid.NewGuid()` token and keeps the two bare needles `"250"` / `"2000"`, which do not match
`2 000,00`. Its comment states the alias rate as *"about once in every 130 runs"*; the guid-substring lane
**measured 1,012 hits in 200,000 composed bodies = 1 in 197.6** and recorded the briefed figure as an
overstatement. So the exit's sentence is false of the class it names, and the estate is carrying a
corrected-away number in a code comment. Detail in
`docs/plan/evidence/L-EV-OUTBOX-FLAKE/finding.md`.

**3. `L-CONFIRM-POSTMERGE-PIN`: one doc block next door is now measurably wrong.** The block above
`The_reservation_limiter_still_resolves_after_the_failure` says *"Putting the registration back there reds
this test **and no other in this file**."* Mutation A reds **two** tests in that file. It is not the doc
block the exit names, so it did not block the close, but it is the same defect shape one file over.
Recorded, not fixed — this lane does not edit the backend.

### Two landing facts that came out of the measurement

**`bd3a840f` (`L-GR-TESTSEND-RECORD`) is an ancestor of the trunk.** The Growth audit ledger, its writer,
its allowlist and its three suites are **on `6d5328004`** while the lane read `built-unverified` and its
evidence line pointed at `wt-gr-ledger`. That is a fourth instance of the family Batch 6 spotted: a lane
can be un-verifiable and already shipped. `02c077cb` and `bcfe0d893` are ancestors too, which is why both
of those lanes' mutations were run **at the trunk** rather than on their branches — the stronger place to
measure.

**`8ecb47df`, `f7695bc`, `6d43520`, `3ea531f5` and `59a1d607` are ancestors of nothing.** Five of these
eight lanes' work still lives only on unmerged branches. Every one of them resolves today, and the four
that needed running were run by checking the ref out into a throwaway worktree — which is the method, and
it is cheap:

- a backend worktree at a branch SHA builds and tiers with no further setup;
- a **frontend** worktree needs two things a `git worktree add` does not give it: `core` is a **gitlink**
  and comes up empty, so it must be materialised at the tree's own pin (`a6ae241` for `6d43520`,
  `4f31003` for `f7695bc`) as a real directory — **a symlink breaks it**, because `core/helpers` reaches
  `../../env` and a symlinked `core` resolves that outside the worktree — and `node_modules` can simply be
  symlinked from the main checkout once `git diff HEAD <ref> -- package.json` is shown empty.

That recipe is what turned two "nothing openable today" declines into measured runs, and any sibling
holding a frontend lane on an unmerged branch can use it.

### What none of the six closes claim

Not one of them is C5. `L-EV-INQUIRY-GATE`'s own RETURN still ends **"OWED: C5 human acceptance"**, and a
component test that mounts the enquiry page is still a suite. No operator has read a `Revoked` approval
state, a `Kredittsalg (faktureres)` row on a printed close, a Growth audit row, or a failure panel on a
real statistics page. And no SQL tier ran in this batch at all: `--filter "Database!=SqlServer"` throughout,
no container started, so `GrowthAuditLedgerAppendOnlySqlServerTests` and the append-only trigger question
are exactly where their lanes left them.
