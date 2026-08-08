# L-READ-THE-BACKEND-TRUNK-AS-LANDED — independent reading of the backend trunk landing

Reader: `agent:L-READ-THE-BACKEND-TRUNK-AS-LANDED` (did not merge any of this).
Repo: `/Users/svendaneel/okam/OkamAPI-modules`.
**Pinned to `118f92fb9c3acff133fbd3d34b26d39a66fb91af`** — every command in this reading used the SHA
(`git show 118f92fb9:…`, `git log 8e2b57de8..118f92fb9`), never the branch name, because a second
landing wave is moving `feature/restaurant-modules` concurrently. Range read:
`8e2b57de8..118f92fb9`, measured at exactly **48 commits**. Read-only throughout: no commit, merge,
rebase, branch move, push, suite, or container.

## Headline verdict

**CLEAN. No content lost anywhere in the 48 commits. No commit whose contents contradict its
message. All three judgement calls hold. Both omissions were safe.** Five minor observations, none
blocking, listed at the end.

## Method

- Every one of the 48 commits read: full message against `diff-tree`/`--stat`, with full diffs on
  the judgement-call commits, the merges, and the code-bearing lane commits.
- Every merge commit's tree recomputed with `git merge-tree --write-tree <p1> <p2>` and compared
  bit-for-bit against the committed tree — conflicts confirmed from the graph, not from the report.
- Patch identities recomputed with `git patch-id --stable` **and** byte-compared with
  `diff <(git show …) <(git show …)`.
- Conflicted-file resolutions checked by line-set survival (every non-blank line of each parent
  searched for in the result), not by trusting the resolution prose.

## 1. The conflict picture, from the graph

The 48 commits contain **10 merge commits**. Recomputed against their automatic merge:

| merge | what | recomputed vs committed tree |
|---|---|---|
| `17d9746bf` | link 1/7 (train-w3-schema) | conflict in `artifacts/tests/README.md`; hand-resolved, **disclosed in its message**, verified lossless (0 lines of either parent missing) |
| `86a98014c` | link 2/7 (margin-waste) | conflict in `artifacts/tests/README.md`; hand-resolved, **disclosed**, all receipt rows survive; 7 dropped lines are the author's own explanatory paragraph, rewritten in place with its claims preserved |
| `11cef798a` | link 3/7 | **bit-identical to auto-merge**, as its message says |
| `3cd737d73` | link 4/7 | **bit-identical to auto-merge** |
| `735cc8573` | link 5/7 | **bit-identical to auto-merge** |
| `1aa399c86` | link 6/7 | **bit-identical to auto-merge** |
| `1de069061` | link 7/7 | **bit-identical to auto-merge** |
| `65b8f1c20` | take prior author's chain tip | conflict in `artifacts/tests/README.md`; hand-resolved, **not mentioned in its message** (only undisclosed one), verified lossless: 0 lines of either parent missing |
| `7e7c0a3ec` | the one authored merge of the stack onto the trunk | 2 real conflicts + 2 code-file edits, **all four disclosed in its own message** — detail in §2 |
| `7723ad2a4` | the landing's step-3 merge (triggers + composed patches) | **bit-identical to auto-merge** — the zero-conflict claim for the landing's own merge is proven, not just reported |

So: the landing lane's report of zero conflicts is true **of its own four steps** — step 1
(`8e2b57de8`→`7f8945dc6`) and step 2 (→`93a52938e`) verified as pure fast-forwards
(`merge-base --is-ancestor` holds, no merge commit exists), step 3's committed tree equals the
automatic merge bit-for-bit, and step 4's cherry-pick is patch-byte-identical to its source. Within
the wider 48, four earlier merges did carry hand resolution; three of the four disclose it in their
own messages, and all four resolutions were verified lossless. **No by-side resolution is hidden
anywhere in the range.**

## 2. The authored merge `7e7c0a3ec`, checked by content

The only merge with real divergence (59 vs 34 commits, no ancestor relation). Its message discloses
four departures from the automatic result; all four were verified:

1. **`artifacts/tests/README.md` "resolved by UNION, not by side"** — verified exactly: every
   receipt-table row of both parents present in the result (19 + 17 with the header pair shared →
   29 data rows), zero rows invented, and every non-blank prose line of both parents survives.
   Nothing was taken by side.
2. **`docs/plans/PENDING-MIGRATIONS-LEDGER.md`** — verified: stack side's copy (27 entries) taken
   whole; the trunk side's single unique entry (its MIG-22 `Growth_AuditLedger`) folded in
   renumbered as **MIG-29** with its 88-line body intact save one disclosed status update (the OD-1
   contradiction marked half-settled); **MIG-28** added as the reservation the message says it makes.
3. **Two code-file edits beyond the auto-merge** (`Helpers/ApplicationDbContext.cs`,
   `WebApi.Tests/Growth/GrowthAuditWriterTests.cs`) — each is exactly the disclosed one-line
   MIG-22→MIG-29 stale-pointer correction. Nothing else rides in the merge.
4. MIG-22 double-claim resolved keep-the-file (per the 2026-08-05 ruling its message cites);
   verified downstream: no duplicate migration id anywhere at the tip.

## 3. Judgement call 1 — the join defect and `c64d07437`: **the argument HOLDS**

The trigger lane's doc comment at `ead8869ee` (`Helpers/ApplicationDbContext.cs`, above
`ModuleTriggerBuilder`) states its contract in its summary line:

> "Declares to EF every trigger the migration chain installs."

— a **chain-relative** contract, not an enumeration of 32. It then designs precisely the red that
occurred at the join:

> "**This list is not trusted.** … A trigger added to a migration without a line here reds on the
> day it lands."

And the lane's own `lanes/L-TRIGGER-DECLARATIONS-REFRESHED/evidence.md` explicitly anticipated
MIG-29 landing later (§5: the delta assertion "keeps asking it after MIG-29 lands"; §9: "MIG-29 /
`GrowthAuditEvents` is untouched … it is not this lane's to fix"). The red at the merge tip is the
lane's designed mechanism firing on schedule, and `c64d07437` is the designed response: verified to
be exactly **one** `HasTrigger("TR_GrowthAuditEvents_AppendOnly")` declaration plus a comment
extension — no migration, no snapshot edit, no schema change. `HasTrigger` counts confirmed: 32 at
`ead8869ee` and at the merge `7723ad2a4`, 33 from `c64d07437` through the tip. The landing's claim
that the fix *completes* the lane's stated contract rather than departing from it is **correct**.

## 4. Judgement call 2 — the cherry-pick: **the patch-identity HOLDS, the pick was right**

Verified independently, both ways:

- `git patch-id --stable`: `5243c06a7` and `ea66353f9` → **`72bfbd518c6459bac565d197e6450a00684f8b2d`**, both.
- Full patches byte-compared: **identical**.
- The pick itself: `726906fe5` and `589056dfb` share patch-id `3cca4a100…` and are byte-identical
  as patches — the cherry-pick lost and altered nothing.
- The dependency is real, not assumed: `Services/Workforce/WorkforceScheduleSupport.cs` at the tip
  is **byte-identical** to the same file at `5243c06a7`; all five files of `589056dfb` arrive
  byte-identical at the tip; the pick's 5 files and the lineage fix's 3 files are disjoint.
- The lane's shape confirmed: exactly 4 commits over merge-base `de1e5c5e9`
  (`34c6c1031`, `e956337ed`, `5243c06a7`, `589056dfb`).

No commits are missing: the parent's content is on the trunk as `ea66353f9`, and `ea66353f9`'s own
message carries `(cherry picked from commit 5243c06a7)` — the composition is self-documenting.

## 5. Judgement call 3 — the omission bound: **the bound HOLDS** (one prose nit)

Recomputed: `git merge-tree --write-tree 7723ad2a4 589056dfb` →
**`fafd58b72ba96a9364c5b792876dceeaeed8a3dc`**, exactly the landing's claimed tree, produced with
zero conflicts. Diffed against `726906fe5`'s tree (`a553712f1…`, the tip at the moment of the
landing's measurement): **10 files changed, 383 insertions(+), 5 deletions(-)** — figure-exact with
the receipt — and the ten files are precisely the omitted ancestry: `.claude/settings.json`,
`Scripts/worldstamp`, `world.config`, `artifacts/world/WORLD.json`,
`WebApi.Tests/Meals/MealsExpiryGraceReconciliationTests.cs`, and **five** (not six — see nit N1)
`lanes/L-MEALS-GRACE-PINS/` files. Every line of backend work is identical under either
reconciliation; the cherry-pick dropped exactly what was named and nothing more.

**Were the two omissions safe? Yes.**

- `34c6c1031` (meals expiry pins): genuine 2026-08-01 test work, not among the five named landing
  inputs, unreviewed — and **not lost**: still present on `lane/meals-grace-pins`,
  `lane/planned-minutes-honour-lineage` and four other branches. Unlanded, recorded, recoverable.
- `e956337ed` (settings hook + worldstamp + `WORLD.json`): the stale-stamp claims verified verbatim
  from the blob (`stamped_at 2026-08-03`, `branch: lane/meals-grace-pins`, `dirty: true`,
  `on_expected: false`, `migrations_head: 20260731220005_…` — three chain tips behind). Landing a
  config file plus a stale world stamp as merge side-effects would have been wrong; the omission is
  the conservative call. Observation N4 notes the one consequence.

## 6. Verdict per landed step

**Lane chain (9 migrations, one author at a time)** — every message matches its contents; every
migration commit carries migration + Designer + snapshot together (C2 shape):

| commit | verdict |
|---|---|
| `d6b0630fb` regenerate Margin freeze on chain tip (MIG-22 as `20260801084923`) | matches |
| `2eeff48f4` fix two never-run SQL-tier tests | matches |
| `4515a907d` / `47be7e77d` first SQL-tier record; untrack TestResults | match; the accidental `.trx` staging is disclosed and reverted by the follow-up itself |
| `23f6bbebd` MIG-21 `20260801102621` receipt uniqueness | matches |
| `4231715af` tiers at 23f6bbeb | evidence-only, matches |
| `65b8f1c20` take prior author's chain tip | merge verified; see N2 |
| `8c479d99e` Training W3 `20260801113131` (MIG-13) | matches |
| `acfacd04a` clock re-point guard + anchor-probe census | matches; carries run-sheet timestamp churn (N3) |
| `1da15fb11` EF-guard pin on the trigger-less provider | matches (test-only, +69) |
| `3993f7975` tiers at 1da15fb1 | evidence-only, matches |
| `034ec87a1` MIG-23 `20260801132512` waste entries | matches |
| `7b0f7f390` / `f905362b0` / `381e0411b` / `13217cfdd` waste hardening + spec departure record | all match; `381e0411b` honestly bounds the scope departure |
| `603327b74` / `50b85657a` / `78d0fb64b` / `afcfddbc5` the unrunnable-tier record, its corrected diagnosis, the healthy rerun, the ledger receipt | all match; the self-correction (`50b85657a`) is the record working as intended |
| `bae24028d` MIG-24 `20260801174639` W5 timesheets | matches |
| `9e82b286e` W5 tier record | evidence-only, matches |
| `3a4442a7a` MIG-25 `20260802103646` | matches |
| `cff1c005c` MIG-26 `20260802151208` | matches |
| `32c56fa4c` MIG-27 `20260803090036` | matches |
| `c606993aa` MIG-7 `20260803093235` AccountingSummaries unique index | matches — the live prod double-post backstop finally in the chain |

**Stack landing (7 links + receipt + authored merge + join fixes)**: links per §1 table;
`4b37f81bf` (fast tier at every link) evidence-only, matches; `7e7c0a3ec` per §2; `346fd4f0a`
(two join-only defects) matches — both files are exactly the census/controller pairing its message
describes; `24cd4ead5` (GUID-alias flake fix) matches; `7f8945dc6` (tiers + the
`BASE-8e2b57de-sql-allfailing.trx` control) evidence-only, matches.

**The five landing inputs**: `93a52938e` MIG-29 `20260806125642_Growth_AuditLedger` — matches,
chain tip confirmed, no duplicate ids; `d8c98c200`, `f3817eed9`, `ea66353f9` composed patches —
all 23 touched files **byte-identical at the tip**; `2ba9229fa` triple receipt — evidence-only,
matches, and its refusal of the stale fourth patch is what made `ead8869ee` necessary; `ead8869ee`
trigger declarations — matches (see N5); `7723ad2a4` merge — bit-identical to auto; `726906fe5`
pick — byte-exact; `c64d07437` join fix — exactly one declaration; `118f92fb9` landing receipt —
evidence-only, and its load-bearing claims are the ones this reading re-derived and confirmed.

**Content lost: none found. Contents-vs-message mismatches: none found.**

## 7. Consistency with the clerk's pre-verified facts

Not re-derived except where my reading crossed them naturally: `HasTrigger` count at the tip
recounted as **33** (agrees); chain tip seen as `20260806125642_Growth_AuditLedger` (agrees); no
duplicate migration ids (agrees, and `7e7c0a3ec`'s message records the check); recorded tiers were
**not** re-run, per the brief. No remote-tracking ref for the trunk exists
(`refs/remotes/*restaurant*` is empty), consistent with the not-pushed claim.

## 8. Observations (none blocking)

- **N1** — the landing receipt's §4 prose says the omission is "six `lanes/L-MEALS-GRACE-PINS/`
  files"; it is **five** (4 + 1 + 5 = the measured 10). The measured figures are right; the prose
  count is off by one.
- **N2** — `65b8f1c20` is the only hand-resolved merge whose message does not mention its README
  conflict. The resolution was verified lossless (0 lines of either parent missing), so this is a
  disclosure nit, not a loss.
- **N3** — `acfacd04a`, `bae24028d`, `9e82b286e` committed regenerated-timestamp churn to
  `artifacts/journeys/ev-dietary/run-sheet.{json,md}` (capturedAtUtc only, no content change). The
  landing lane reverted its own instances; the lane commits did not. Cosmetic.
- **N4** — omitting `e956337ed` leaves the trunk carrying `.claude/hooks/assert-not-prod.sh`
  (already there) with **no** `.claude/settings.json` wiring it. Nothing is broken; the hook is
  simply inert on the trunk. If the guard is wanted, the wiring should land as reviewed work.
- **N5** — `ead8869ee`'s message and doc examples say "32", which was true of its own chain and is
  33 at the tip. Its contract line is chain-relative, so this is superseded arithmetic, not a
  mismatch; `c64d07437`'s comment now explains the coupling at the declaration site.

## 9. Revert, if ever needed

`git branch -f feature/restaurant-modules 8e2b57de8442a389a9b5f8025312c9750614c85e` (unused; this
lane moved nothing).
