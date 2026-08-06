# L-FIX-BRANCH-MANIFEST — where every fix actually lives

Read-only census. Nothing was landed, merged, pushed or checked out.

> **Seven corrections applied by `L-MANIFEST-CONDITIONS` on 2026-08-05, from the Fable review of this
> document.** Each is marked **[CORRECTED]** at the line it changes, and each keeps the original wording
> visible rather than replacing it, so a reader can see what moved and why. The review re-derived every
> ancestry and containment claim here **by object and they all held** — what was wrong was arithmetic,
> scope and provenance, not measurement. Two numbers were wrong in the direction that *undersizes* the
> landing work: the fix count and the conflict census. Working notes and the raw re-measurements:
> `../L-MANIFEST-CONDITIONS/applied.md`, `census-recheck.txt`, `backend-recheck.txt`, `frontend-drift.txt`.
>
> **CUT-OFF.** This census enumerated refs at **2026-08-05T03:08Z**. It is not current and was never
> claimed to be; see *Cut-off and drift since* below before sizing anything on it.

**Method.** Every ref under `refs/heads` **and** `refs/lanes` in both repositories was enumerated and
tested with `git merge-base --is-ancestor` against each anchor by object id — no branch name was read
as evidence of anything. Containment was then re-tested at *content* level with `git cherry`
(patch-id), because commit-containment and content-containment are different questions and the two
recorded errors this lane exists to correct were both the first question answered as if it were the
second. Every command was issued with an explicit `git -C <repo>`; one intermediate pairing run in
this lane produced a plausible all-`OUT` column purely because the shell's working directory had
reset between calls, and was discarded and redone.

## Anchors

| repo | anchor | oid | relation |
|---|---|---|---|
| frontend `/Users/svendaneel/okam/Web-modules` | `feature/restaurant-modules` (tip, = HEAD) | `e34977ac` | strict ancestor of the candidate |
| frontend | `candidate/fe-compose-2026-08-05` | `9f7d8dfc` | modules + **103** commits |
| backend `/Users/svendaneel/okam/OkamAPI-modules` | `feature/restaurant-modules` | `8e2b57de` | integration tip |
| backend | `integration/mig-stack-land` | `4b37f81b` | **diverged** — 34 ahead, 59 behind modules |

Two consequences worth stating before the tables.

1. **On the frontend, "in modules" is a subset of "in candidate."** There is no branch in the
   estate that is in `feature/restaurant-modules` and not in the candidate. The four-way question in
   the exit criteria collapses to three answers on this side: *in both*, *in candidate only*, *in
   neither*. That is a fact about the repository, not an omission.
2. **On the backend it does not collapse.** `integration/mig-stack-land` is a fork, not a superset.
   It carries seven migrations (MIG-23 waste, MIG-24 W5 timesheets, MIG-25 export index, MIG-26
   adjustment ordinal, MIG-27 company receivable, MIG-7 `AccountingSummaries` day unique index) that
   `feature/restaurant-modules` does not have, while lacking 59 commits modules does have. C2 is
   live here: whichever of the two is treated as the chain, the other's migrations are unparented.

The candidate was composed in a single burst between **08-05 00:54 and 01:20**. That timestamp is
the dividing line for "built after the candidate was cut".

## Cut-off and drift since — **[CORRECTED: added]**

*Condition 7 of the review. The census stated no cut-off, which let a reader take it as current.*

**Refs were enumerated at 2026-08-05T03:08Z** (this lane's own return time; the candidate was cut
01:20, the anchors have not moved since). Everything below is that instant, not now.

**The frontend has drifted; the backend has not.** Re-measured by `L-MANIFEST-CONDITIONS` at
**2026-08-05T04:21Z**, `comm`'d against `appendix-frontend.txt` / `appendix-backend.txt` rather than
counted:

| | at the census 03:08Z | at 04:21Z | added | gone |
|---|---:|---:|---:|---:|
| frontend `refs/heads` + `refs/lanes` | 116 | **125** | 9 | 0 |
| backend `refs/heads` + `refs/lanes` | 317 | **317** | **0** | 0 |

The nine frontend refs absent from this census, all lanes dispatched tonight, **listed and not
classified** — containment and payload for them is a second census, which this correction does not
attempt:

`lane/guard-repair-lands` `7030c00`, `lane/consent-reason-vocabulary` `038612f`,
`lane/fixture-rendered-values` `038612f` (same oid, two names), `lane/duplicate-key-guard` `cb2cee6`,
`lane/lint-runnable` `8ad3358`, `lane/provenance-excludes-lane-evidence` `607f138`,
`lane/modules-preflight-fails-loud` `eb9d52e`, `lane/lint-two-real-defects` `aec051a`,
`lane/vat-keys-monolingual` `e34977a` — the last of which **points at `feature/restaurant-modules`
itself**, so it carries no commit either anchor lacks.

**The count moved during the correction pass itself**, which is the point rather than a footnote: the
review named **seven** new heads, this lane measured **eight** at 04:12Z and **nine** at 04:21Z. Nine
minutes, one more ref. **Any ref count stated without its timestamp is already wrong**; the review's
own brief carried 111 while the census had measured 107.

## Denominator

| | frontend | backend |
|---|---|---|
| `refs/heads` | 107 | 317 |
| `refs/lanes` | 9 | 0 |
| **classified** | **116 / 116** | **317 / 317** |
| in both anchors | 22 | 96 |
| in candidate / mig-stack-land only | 41 | 7 |
| in modules only | 0 | 33 |
| in neither | 53 | 181 |

Not classified and deliberately excluded, with the reason: 8 `refs/remotes` and 8 `refs/salvage`
refs plus 1 stash on the frontend, and 15 `refs/remotes`, 7 `refs/tags`, 1 `refs/backup` and 1 stash
on the backend. None is a lane branch; the salvage refs are dangling-object rescues from the
2026-07-29 crash and predate every anchor.

Full per-ref classification for all 433 refs: `appendix-frontend.txt`, `appendix-backend.txt` in
this directory.

## What the frontend "neither" column actually contains

53 refs resolve to **50 distinct commits** — `refs/lanes/L-CHECK-DISCOUNT-SUM-COUPLED`,
`L-RECEIPT-DISCOUNT-ROW-DROPPED` and `L-CHECK-LINEAMOUNT-UNGATED-SUM` are byte-identical aliases of
`lane/check-discount-sum-coupled`, `lane/receipt-discount-row-dropped` and
`lane/check-lineamount-ungated-sum`. Of the 50:

- **1 is not a lane**: `feature/swiss` `f271b12b`, last touched 07-06. Unrelated to this program.
- **1 is documents, not a fix**: `refs/lanes/plan-snapshot` `51970563` — "Preservation snapshot: the
  plan and the lane evidence, which no ref carried", 954 files, no product code. Classified, not
  dropped.
- **3 carry no unlanded patch at all** — `git cherry` reports their content already present in the
  candidate under a different commit id. Merging them would be a no-op, and *counting* them as
  pending work is the same error this lane was opened to fix:
  `lane/wf-adjust-address` `e9ba89e2`, `lane/training-admin` `4727090d`,
  `lane/margin-menu-margin-ui` `36600c1f`.
- **43 carry a code fix that is in neither anchor — 44 if a comment-only change counts.** Those are
  the manifest below. **[CORRECTED: this line read "45", and 45 is what the summary reported.]**
  *Condition 1 of the review. The exclusion rule three bullets up — "counting content already applied
  as pending work is the same error this lane was opened to fix" — was applied to three branches and
  then not applied to two more that fail it in a different way. Both were re-measured by object:*
  - `lane/fixture-divergence-receipt` `0dbec34b` — **whole payload is one evidence file**,
    `lanes/L-FIXTURE-DIVERGENCE-RECEIPT/receipt.md`, +273 lines, **0 code files**. The table below
    already says "(evidence only, 0 code files)" in its own `what it changes` column while the count
    above kept it. Not a fix; **excluded → 44.**
  - `lane/collect-review-conditions` `808d5095` — five files, four of them under `lanes/`. Its only
    non-evidence file is `jest.config.js`, **+9/-4, every changed line inside a `//` comment block**;
    `testPathIgnorePatterns` is byte-for-byte what `82127eb` shipped, which the commit message states
    and `git show` confirms. **A comment correction, not a code fix; excluded → 43.**

  It is worth being exact about which of these two is arguable. The evidence-only branch is not a fix
  under any reading. The comment-only one **is a real and deliberate correction** — it takes back four
  claims a comment made that were never measured — so **44 is defensible and 45 is not.** Read this
  count as **43, or 44 if a comment correction counts as a fix.**

For symmetry with the two errors on record: `lane/jest-collects-lanes` `82127eb1`,
`lane/worktree-basename-pin` `0cea96ac`, `lane/collected-paths` `6f03b187`,
`refs/lanes/L-WORLD-STAMP-WINDOWS` `997936ad` and `refs/lanes/L-OFFER-PARTIAL-SUBTOTAL` `35e5cdd6`
are all **in the candidate** — merged at 00:54–00:57. They are not pending.

---

## FRONTEND — chains first

`merge-base --is-ancestor` was run pairwise across all 53 neither-refs, so the parentage below is
measured, not read off names. **Merging a deepest head carries everything above it in its block.**
The `merge-tree` column is a real in-memory trial merge against the candidate.

### CHAIN A — the money chain. Six branches, one head.

```
c4a4fa44  refs/lanes/L-PRICE-BYPASS-FIVE
  └ b150668b  refs/lanes/L-XZ-NEGATED-ABSENCE
      └ 799f05d4  refs/lanes/L-XZ-RESIDUAL-SITES
          └ c8f26d52  refs/lanes/L-CHECK-DISCOUNT-SUM-COUPLED  = lane/check-discount-sum-coupled
              └ 7a72c02c  refs/lanes/L-RECEIPT-DISCOUNT-ROW-DROPPED = lane/receipt-discount-row-dropped
                  └ c32cda3c  refs/lanes/L-CHECK-LINEAMOUNT-UNGATED-SUM = lane/check-lineamount-ungated-sum
```

| oid | what it changes |
|---|---|
| `c4a4fa44` | Five legacy pages stop printing a money figure nobody stated: one shared absence rule in `utils/price.js`; the invoice's own `priceLabel` method, which in Vue 2 **shadowed** the gated mixin so the money gate could not run on a single invoice figure, is gated and renamed; the X report's `null + null = 0` stops disguising an unknown VAT row as a stated zero; the Wolt price input stops seeding `0.00` so a tabbed-through row no longer publishes a real zero price to Wolt. |
| `b150668b` | Six report rows stop attaching a minus sign to the unknown mark. |
| `799f05d4` | Three POS discount rows stop being one relaxed guard away from the same defect. |
| `c8f26d52` | The check stops manufacturing a discount it was never told, then hiding the row. |
| `7a72c02c` | The printed receipt stops dropping a deduction it cannot reconcile without. |
| `c32cda3c` | **Two check sums stop handing back a refund they had to invent.** |

**Merging `c32cda3c` lands all six.** A manifest listing them as peers would invite merging this
work three times.

**`c4a4fa44` is the case where commit-containment and content-containment disagree, in the direction
opposite to the two recorded errors.** It is an ancestor of nothing in the candidate, yet 10 of its
11 files are already there byte-for-byte: the candidate hand-reconciled it at `f1d177f`
("take c4a4fa44's side on the invoice page"). The eleventh, `components/molecules/CustomerInfoModal.vue`,
is **ahead** on the candidate — `lane/L-PRICE-SHADOW-GUARD` removed the shadowed `priceLabel`
entirely, which `c4a4fa44` did not. Merging the chain does **not** reintroduce the shadow; the trial
merge auto-merges that file cleanly. Verified, not assumed.

**Trial merge `candidate + c32cda3c` → CONFLICT** in `components/admin/pos/XReportView.vue` and
`utils/price.js`. Both are money-path files and both are the files the chain and the candidate
edited independently. This merge needs an author, not a fast-forward.

### CHAIN B — personalliste / statutory printing. One root, two heads.

```
6e6acd06  lane/print-host — the personalliste prints the fields the law asks for
  └ f01886a0  lane/statute-honesty — two documents stop claiming they cover more than they can
      ├ 2ee3fd76  lane/statute-evidence-world — the personalliste stops printing rows it says it cannot record
      └ 818c48a9  lane/ev-stale-cause — only the true reason a run sheet is stale is printed beside it
```

Both heads must be merged; neither contains the other. C6 sits on this block — `f01886a0` and
`2ee3fd76` are the branches that make the printed statutory claims honest.
Trial merges: `2ee3fd76` CONFLICT (`test/e2e/fixture/api-server.js`, `world.js`, all three
translation files); `818c48a9` CONFLICT (same five files).

### CHAIN C — workforce ↔ POS operator link. Four deep.

```
7c3a1e1f  lane/fe-pos-clock — the punch clock finally has a door, and it says what it cannot do
  └ 3e811b22  lane/fe-wf-oplink — a manager can link a kassa operator to an employee, who can then clock
      └ c67df92a  lane/fe-wf-blind-bind-name — the review names the person, and a wrong link can go
          └ bed932e3  lane/fe-wf-link-deadend — the withdraw control appears on the row with no other way out
```

**Merging `bed932e3` lands all four.** Trial merge CONFLICT across 7 files including
`pages/admin/workforce-roster.vue`, `utils/workforce/roster-client.js` and all three translation
files.

### CHAIN D–H — two deep each.

| chain | parent | head | head changes |
|---|---|---|---|
| D | `9ec1100d` `lane/fe-wf-onboard` (pivot grids + invitation UI both ends) | `5886ba30` `lane/fe-wf-self` | a worker sees their own hours; Growth stops implying deliveries it cannot know about |
| E | `de0d66b9` `lane/fe-journeys` (six journeys, three walls, claim-page token fix) | `20693381` `lane/fe-training-meals-surfaces` | somebody can be shown the training file and billed for the month |
| F | `b7a9f389` `lane/ev-journey-timebomb` (settlement journey survives its own second run) | `b8ba8030` `lane/journey-teardown` | cleanup stops poisoning the run it is cleaning up for |
| G | `3d204511` `lane/fixture-suppressed-refusal` (fixture learns the refusal the backend throws) | `775d45e2` `lane/fe-growth-suppressed-key` | the operator is told the address is **suppressed**, not that something went wrong |
| H | `d320105f` `lane/fe-meals-journey-locator` (policy assertion names its sentence, not a shared class) | `9fbed806` `lane/fe-meals-pretick-walked` | the enrolment journey walks the pretick and still walks the withheld read |

Trial merges: `5886ba30` CONFLICT (13 files), `20693381` CONFLICT (**28** files — still the largest
in the estate), `b8ba8030` CONFLICT (2), `775d45e2` **CLEAN**, `9fbed806` CONFLICT (1).

**[CORRECTED: `20693381` read 29.]** *Condition 3 of the review.* Re-run at the same two oids
(`9f7d8dfc` × `20693381`) with `git merge-tree --write-tree --name-only`: **28 conflicted paths**, listed
in `../L-MANIFEST-CONDITIONS/census-recheck.txt`. The conclusion the number carried — that this is the
worst merge on the frontend — is unchanged, and the next-worst is `5886ba30` at 13.

### FRONTEND — independent branches (no parent, no child)

| oid | ref | what it changes | merge-tree |
|---|---|---|---|
| `ef2d6be4` | `lane/L-JOURNEY-GROWTH` | consent walked join→withdrawal; test-send refusal made falsifiable; fixture stops claiming a token provenance the product lacks | CONFLICT ×3 |
| `4772c131` | `lane/L-JOURNEY-PORT-HARDCODED` | `meals-statement-month` honours `E2E_FIXTURE_PORT` instead of a hardcoded port | CONFLICT ×1 |
| `808d5095` | `lane/collect-review-conditions` | comment, evidence and script stop asserting what was never measured | CLEAN |
| `0dbec34b` | `lane/fixture-divergence-receipt` | runs the fixture-divergence check at the integration tip and records it (evidence only, 0 code files) | CLEAN |
| `618efc88` | `lane/wf-timesheet-ui` | the timesheet batch has a door | CLEAN |
| `2d86446b` | `lane/wf-pubhist` | publication history stops being advertised to nobody, and says who confirmed | CONFLICT ×1 |
| `e8d69fc3` | `lane/fe-wf-invite-list-revoke` | the roster panel stops saying the routes do not exist — lists live invitations, withdraws one — **paired, see below** | CONFLICT ×1 |
| `abef9aac` | `lane/train-readonly-visible` | the switchboard says what Training's switch being off actually does | CONFLICT ×1 |
| `814f04d6` | `lane/fe-gr-exit-wire-the-mail` | walks the exit the newsletter now links; says what the committed capture is | CONFLICT ×1 |
| `804fe238` | `lane/mrg-waste-frontend` | the waste panel stops offering a form the server will always refuse | CONFLICT ×2 |
| `7ac2f929` | `lane/fe-meals-docsync` | three Meals surfaces stop explaining themselves with capabilities the estate now has | CONFLICT ×1 |
| `b4dd5282` | `lane/fe-wf-correction-path` | manager corrects a personalliste entry from the sheet; stale-revision test reds if the client resolves on 409 | CONFLICT ×2 |
| `63489442` | `lane/modal-broken-two` | one login prompt for a signed-out visitor; the delivery-type modal opens at last | CONFLICT ×3 |
| `f1b0d1a9` | `lane/menu-allergen-matrix` | a venue can print the allergen matrix for its own menu | CONFLICT ×5 |
| `9264904d` | `lane/fe-wf-bootstrap` | the roster page offers the way in instead of stopping at the refusal | CONFLICT ×1 |
| `e8b58ec1` | `lane/fe-events-margin-surfaces` | a settlement holds what guests spent and states the VAT it cannot; a venue fixes a figure in an unsent offer | **CONFLICT ×8** — **[CORRECTED: read "not run", while the summary counted it in the denominator]** |
| `7c3a1e1f` `3e811b22` `c67df92a` | — | superseded by CHAIN C head `bed932e3` | — |

Older frontend lanes in the neither column, still unmerged, dating from 07-29 to 08-03 — these are
not "tonight" but they are unlanded and the exit criteria asks for them. **[CORRECTED: all five were
listed without a trial merge, and were then absent from the conflict census entirely. All five
conflict.]** *Condition 2 of the review; measured `9f7d8dfc` × each head with `merge-tree`, file lists
in `../L-MANIFEST-CONDITIONS/census-recheck.txt`.*

| oid | ref | what it changes | merge-tree |
|---|---|---|---|
| `319ec253` | `lane/workforce-roster` | a venue could not put anyone on its own roster | **CONFLICT ×10** |
| `7890f691` | `lane/meals-admin` | show a venue its company agreements and what was funded | **CONFLICT ×10** |
| `c3974fdb` | `lane/margin-recipes` | enter a recipe, see a cost, refuse the margin nothing can answer | **CONFLICT ×11** |
| `f866024a` | `lane/growth-admin` | walk consent to a send, and not past it | **CONFLICT ×13** |
| `6790589e` | `lane/events-admin` | walk an enquiry as far as the backend goes, and say where it stops | **CONFLICT ×11** |

These are the oldest heads in the column and they conflict hardest — each of them predates a week of
work on the same admin pages. **Whoever lands them is authoring five merges, not fast-forwarding five
branches**, and they were invisible in the number a landing plan would have been sized on.

### FRONTEND — conflict census — **[CORRECTED: added]**

*Condition 2 of the review, and the correction that changes the size of the work.* The summary read
**"19 of 25 heads trial-merged conflict; only four are clean."** Three things were wrong with it at
once: the conflict count was one low, a head listed *not run* was left inside the denominator, and the
five older heads above were never trial-merged at all. **19 + 4 does not equal 25**, which is where it
shows on the page.

| | heads | conflict | clean |
|---|---:|---:|---:|
| chain heads (A `c32cda3c`; B `2ee3fd76` `818c48a9`; C `bed932e3`; D–H `5886ba30` `20693381` `b8ba8030` `775d45e2` `9fbed806`) | 9 | 8 | 1 |
| independent branches (the table above, less `e8b58ec1`) | 15 | 12 | 3 |
| **trial-merged and reported by this census** | **24** | **20** | **4** |
| listed *not run*, but counted in the denominator (`e8b58ec1`) | 1 | 1 | 0 |
| older lane heads, never trial-merged | 5 | 5 | 0 |
| **total** | **30** | **26** | **4** |

Every verdict in the first two rows is this census's own, and the review re-derived all 24 by object
and got the same 24 answers. The three added rows are new measurements, taken at the unmoved candidate
`9f7d8dfc`.

**The census is 26 of 30 conflict, 4 clean.** A landing plan sized on 19 is short by **seven authored
merges**. The four clean ones are `775d45e2`, `0dbec34b`, `618efc88` and `808d5095` — and one of those
four is clean for a reason worth knowing: **`808d5095`'s parent *is* the candidate tip `9f7d8df`**, so
its "clean" is a fast-forward rather than a merge that reconciled anything. Verified with
`merge-base --is-ancestor`; the other three are genuine clean merges.

**What this census still cannot tell you** — unchanged by the correction, and stated again because the
number moved: a clean `merge-tree` means git can produce a tree, **not** that the tree behaves. No
suite was run at any merged state, on any of the 30.

---

## BACKEND

The backend "neither" column is 181 refs, which is not a night's work — it is the estate's whole
unmerged backlog back to 06-22. **44 distinct commits have a tip dated 08-04 or later**; the
remaining 136 predate this night. I did not classify those 136 individually and I am saying so
rather than presenting a filtered list as complete. What I can state about them: 7 of the 181 carry
no unlanded patch by patch-id (`lane/authclean`, `lane/cost-rollup`,
`lane/events-settlement-reads`, `lane/menu-margin-read`, `lane/pinfix`, `lane/w0-businessdate`,
`land/meals-posrel-v1`), and patch-id cannot see content that was rebased before landing, so
`new>0` is **not** proof that a branch's content is absent. The `2a052800`/`3c71b323` pair below is
a measured instance of exactly that blindness.

### Backend chains among the 08-04+ set

**[CORRECTED: the idempotency block had a false edge.]** *Condition 4 of the review. The diagram drew
`a1d57208 lane/wf-idempotency-refusal` joining at `4bbf34a5 lane/meals-agreement-pin-inverts`.
Measured: `a1d57208` is **not** an ancestor of `4bbf34a5`. It joins the family **two commits later**,
at the merge `887f0512`, and only there. The redrawn block:*

```
54714dd6 lane/meals-idempotency-refusal ──→ 4bbf34a5 lane/meals-agreement-pin-inverts
                                                 └──→ 4e87d0f9 "base: merge …-pin-inverts into the replay-pin base"
a1d57208 lane/wf-idempotency-refusal ─────────────────────→ 887f0512 "base: merge wf-idempotency-refusal into the replay-pin base"
                                                                  └──→ 6278f0b5 ──→ a6583a02 lane/replay-pins-close
9bdfc267 lane/xz-credit-fields ─┬→ 6c394057 lane/xz-printed-defects
                                └→ f028c0a8 lane/eod-credit-split
a60da359 lane/phone-in-path ──→ a5b9e28b lane/route-guard-gaps
3b593fef lane/wf-blind-bind-name ──→ a3a526ae lane/wf-link-deadend
2a052800 lane/growth-prefcentre ──→ e0c2b02f lane/gr-withdraw-origin
de0811f6 lane/wf-onboard-claim ≡ lane/wf-onboard-demo-run   (identical oid, two names)
02684ecc lane/wf-idempotency-refusal-rest carries a1d57208
```

Both merges are onto the **modules tip `8e2b57de`** — that is what "the replay-pin base" is — so the
two branches are siblings that never touched each other, not a chain. Every edge above was tested
with `merge-base --is-ancestor`; the run is in `../L-MANIFEST-CONDITIONS/backend-recheck.txt`.

**The conclusion the false edge supported is nevertheless true, and it was worth re-checking rather
than assuming.** `a6583a02` `lane/replay-pins-close` is the deepest head of the idempotency family:
merging it lands `wf-idempotency-refusal` `a1d57208`, `meals-idempotency-refusal` `54714dd6` and
`meals-agreement-pin-inverts` `4bbf34a5` as well — **all three verified as ancestors of `a6583a02`
by object.** What changes is why: they arrive through two independent merge commits, so a resolution
author reading the old diagram would have expected one line of history and found two.

**Two members of this family are *not* under that head, which the old diagram invited a reader to
miss:**

- `02684ecc` `lane/wf-idempotency-refusal-rest` carries `a1d57208` **but is not an ancestor of
  `a6583a02`.** Merging the deepest head does **not** land it.
- `01cd5eee` `lane/train-idempotency-refusal` — listed further down as part of the same fix family —
  is an ancestor of **neither** `a6583a02` nor `02684ecc`. It is a third independent head.

`9bdfc267` has **two** children that do not contain each other — both `6c394057` and `f028c0a8`
must be merged.

### Backend 08-04+ branches, in neither anchor

| oid | ref | what it changes |
|---|---|---|
| `a613f026` | `lane/mig-stack-record` | modules + 1: records that the chain tip is ten migrations past this branch (**ledger only — it does not move the chain; C2 stays open**) |
| `68f2472c` | `lane/wf-invite-list-revoke` | `GET /workforce/stores/{id}/invitations` + `POST …/revoke`; `Revoked` was schema-declared and written by no code path — **paired, see below** |
| `de0811f6` | `lane/wf-onboard-claim` ≡ `lane/wf-onboard-demo-run` | the workforce demo's Nora joins through the shipped invitation flow instead of a SQL `UPDATE` |
| `54a8bb51` | `lane/gr-exit-wire-the-mail` | links the working exit from the mail carrying it; refuses to write a capture that cannot prove it is inert |
| `4b911917` | `lane/wf-digest-tautology` | WFJ-15: compares served bytes against the recorded digest (+23 vs modules) |
| `015c07ca` / `24c95aa9` | `lane/pdf-creditnote-name`, `lane/credit-note-number` | a credit note downloads under its own number, not the one it credits (two branches, same fix) |
| `2c1eebaf` | `lane/lanes-out-of-assembly` | keeps `lanes/` out of the WebApi assembly |
| `6dcc1503` | `lane/hosted-service-floor` | deleting a background registration stops being invisible |
| `a6583a02` | `lane/replay-pins-close` | +7: three refusal-replay pins repair the precondition between calls; interceptor doc says when it fires |
| `6c394057` | `lane/xz-printed-defects` | printed X and Z stop cutting the count off a statutory figure; a negative goods-group count keeps its sign |
| `9bdfc267` | `lane/xz-credit-fields` | X and Z state kredittsal and utleveringskvitteringar |
| `f028c0a8` | `lane/eod-credit-split` | the day settlement states kredittsal apart from the day's takings |
| `a154ca19` | `lane/accounting-export-silent` | an export that ran on nothing stops reporting that it ran |
| `78a59ed6` | `lane/telemetry-initializer-floor` | **C7** — a redaction the composition root can silently lose is a credential published permanently |
| `363d3f7f` | `lane/push-token-in-path` | **C7** — a device push token stops travelling in the registration URL |
| `a60da359` → `a5b9e28b` | `lane/phone-in-path`, `lane/route-guard-gaps` | **C7** — a phone number stops travelling in the URL; the route guard learns four words |
| `f2517d5d` | `lane/fragile-needles` | three absence assertions no longer rest on an undeclared emptiness |
| `086ac34f` | `lane/meals-members-read` | `GET /v1/meals/programs/{id}/members` + a refusal that names its cause — **paired, see below** |
| `01cd5eee` `54714dd6` `a1d57208` `02684ecc` `4bbf34a5` | training / meals / workforce idempotency | a refused command stops poisoning its own key; the retry gets the refusal, not "in progress" forever |
| `44af0f8b` | `lane/meals-lever-withhold` | fail-spec evidence for the ruled `meals.module` withholding |
| `f7b30b2d` | `lane/meals-docsync` | the Meals runbook stops teaching a wall taken down a week ago |
| `3c7b28ee` | `lane/wolt-sync-unregistered` | a background service that has never run says so, and stays that way |
| `a2bfd116` | `lane/margin-violation-anchor` | anchors the two Margin uniqueness classifiers |
| `b10eb11c` | `lane/dated-test-output` | a test run stops rewriting a committed file |
| `bc9c7e96` | `lane/wf-timesheet-race` | +36: the approve-race evidence, eight mutations, both tiers |
| `da452fe2` | `lane/wf-timesheet-wire` | +24: harness precondition and four watched mutations |
| `74405b34` | `lane/wf-withheld-bound` | bounds the notification backlog a store with no push credential builds |
| `100ae000` | `lane/wf-push-still-lies` | the delivery record stops claiming more than it knows |
| `1ee483c0` `2661b752` | `lane/wf-timeoff-decide-gate`, `lane/wf-exchange-award-ungated` | **C3** — refuse the approve/award while the stage behind it is dark |
| `17c12c20` `edbb7dea` | `lane/cors-followups`, `lane/cors-credentialed-origin` | credentialed CORS for the preference centre; loopback origins kept out of non-Development — **see duplicate warning** |
| `182fa43e` | `lane/wf-correction-path` | a personalliste entry can be corrected and the register records who |
| `3b593fef` → `a3a526ae` | `lane/wf-blind-bind-name`, `lane/wf-link-deadend` | the screen names the person a punch is paid to; an operator stranded on an ended engagement can be given back |
| `0b28f601` | `lane/wf-contact-imported` | `PATCH staff/{id}/person/contact` — an imported person can be given contact details |
| `59a1d607` | `lane/ev-outbox-flake` | the outbox guest-data assertion cannot fire on its own token |
| `d776f9e7` | `land/meals-posrel-v1` | two merge commits, **no new patch** — superseded |

---

## Pairs that must land together

### 1. Workforce invitations — **both halves out**

`lane/wf-invite-list-revoke` `68f2472c` (backend) ↔ `lane/fe-wf-invite-list-revoke` `e8d69fc3` (frontend).

**The frontend is the quiet half.** Land the backend alone and the two new routes exist with no
caller — nothing changes on screen, and the access panel goes on saying, in three locales, that
"the API has no such routes", a sentence its own backend now contradicts. Nothing reds; the panel
looks normal. Land the frontend alone and the panel calls a route that 404s, which is loud. This is
a C3 violation in the quiet direction: service and route without navigation.

### 2. Meals enrolment members-read — **frontend already in the candidate, backend is not**

Backend `lane/meals-members-read` `086ac34f` adds `GET /v1/meals/programs/{programId}/members`.
Verified: that route is **present** at `086ac34f:Controllers/Meals/MealsProgramController.cs:141`
and **absent** on `feature/restaurant-modules` `8e2b57de`, which has only the `HttpPost` at :114.
The consuming frontend is `lane/meals-enrol-pretick` `2e3f39d1`, **merged into the candidate at
00:55**, calling that GET at `utils/meals/admin-client.js:225`.

The composition candidate therefore ships a frontend whose backend half does not exist. **I traced
the failure rather than assuming it, and it is loud and safe, not quiet:**
`utils/meals/admin-view.js:178` maps an unanswered read to `DATA_UNKNOWN`, and
`MealsProgramPanel.vue:400-407` withholds the enrol control entirely and renders
`enrol-members-unknown`. That is deliberate — endpoint 12 replaces rather than merges the enrolled
set, so an unticked submission is a command to un-enrol everybody, and the panel refuses to offer
the control it cannot pre-tick. The feature is dead on the candidate but it does not destroy
enrolments. **The quiet half is again the frontend:** `086ac34f` landing without a caller changes
nothing on screen.

### 3. THIRD PAIR FOUND — Growth consent withdrawal / preference centre

`lane/gr-withdraw-origin` `e0c2b02f` (backend, carrying `lane/growth-prefcentre` `2a052800`)
↔ `lane/fe-gr-withdraw-origin` `80493321` (frontend) and `lane/fe-growth-prefcentre` `7a8b0d3a`
(frontend). **Both frontend halves are in the candidate; both backend halves are in neither anchor.**

**The backend is the quiet half, and it fails quietly by construction.** `2a052800`'s own commit
message states the mechanism: endpoints 3/4/5/7 are the only browser calls in the estate sending
`credentials: 'include'`, they are served by the application-wide default CORS policy answering
`Access-Control-Allow-Origin: *`, and a browser refuses that combination **at the preflight** — so
"the failure was an opaque network error with no status and no server log line, and the page could
only render 'unknown'. It read as an outage." No status code, no server log, no rendered refusal:
a guest's consent withdrawal does not land and nothing anywhere says so.

The frontend author reached the same conclusion independently and wrote it into `80493321`:
*"they are not alternatives, and shipping only this half leaves the page exactly as broken."*
That half is in the candidate. The other half is not.

Two further facts on this pair:

- **No test reds either way — inherited, not measured here. [CORRECTED: this was stated as a flat
  fact.]** *Condition 5 of the review.* **This census ran no suite** (see *What I could not classify*),
  so the sentence is not a measurement this document made. Its two supports, named so a reader can
  weigh them:

  1. **An inherited sentence.** `80493321`'s own commit message says reverting `API_BASE_URL`
     "reddened nothing" — and it says so about the state **before** that commit, as the reason it then
     **added** a pin. The same commit records a mutation that *does* red: *"reverting the base to
     `okamapi.azurewebsites.net` reds with Expected okam.no, Received azurewebsites.net."* Quoting the
     first half without the second overstates it.
  2. **A mechanism argument, which is the part that actually holds.** A credentialed preflight is
     refused **by the browser**, so no request reaches the API and no server-side test sees one; and no
     jsdom test performs a preflight. **The pin that would red is inside the missing half** — the
     backend commits add `WebApi.Tests/Wire/GrowthPreferenceCentreCorsWireTests.cs`, +162 lines,
     which cannot red while the branch carrying it is unmerged. Verified by diffstat on both CORS
     commits.

  **Both lanes did run suites, and their runs do not answer this question**: L-GR-WITHDRAW-ORIGIN
  reports frontend 2432/2433 (Δ+5) and backend 4394/0/12 (Δ+4); L-GROWTH-PREFCENTRE reports 21 new
  backend tests with a mutation reddening 3 of 11. Every one of those is a run **of the fixed state on
  the lane branch**. None is a run of the composed candidate, which is the world in question.

  So the claim stands, on a mechanism rather than on a measurement, and **C5 applies literally**: this
  is a defect no suite on either side can be asked to catch, and a person walking the withdrawal is
  the only instrument that sees it.
- **DUPLICATE-FIX HAZARD.** The credentialed-CORS fix exists as **two different commits with the
  same subject and the same author timestamp**: `2a052800` (parent `3579bbbc`) and `3c71b323`
  (parent `8e2b57de`, a rebase of it onto the current modules tip). Distinct patch-ids
  (`04d70d1e…` vs `f0bab49b…`), so `git cherry` reports each as new against the other's branch.
  `2a052800` is carried by `lane/growth-prefcentre`, `lane/cors-credentialed-origin`,
  `lane/gr-withdraw-origin` and `lane/meals-reachable-api`; `3c71b323` is carried by
  `lane/cors-followups`. **Merging `lane/cors-followups` and `lane/gr-withdraw-origin` lands the
  same CORS policy twice.**

  *A dedup by date would find neither one: the **author** timestamps are identical to the second
  (2026-08-03 11:22:27 +0200, preserved across the rebase) while the **commit** timestamps are a day
  apart (08-03 11:22 vs 08-04 20:24). Both facts are true of the same pair; which one a reader is
  looking at decides whether they see a duplicate.*

  **[CORRECTED: this advice read "Take `lane/cors-followups` `17c12c20` … and drop the other four for
  this change." It cannot be followed as written, and the two commits are not the same patch.]**
  *Condition 6 of the review — the one item here that is a correctness rule rather than a tidy-up.*

  **They differ on one line, and the difference suppresses headers.** Read by object:

  | | `Helpers/ServiceCollectionExtensions.cs`, default policy |
  |---|---|
  | `2a052800` | `.AllowAnyHeader().WithExposedHeaders("ETag")` |
  | `3c71b323` | `.AllowAnyHeader().WithExposedHeaders(BrowserReadableHeaders.All)` |

  `3c71b323`'s own doc-comment records why: *"moving the registration out of `Program` carried a
  hardcoded `"ETag"` across and dropped `Content-Disposition` and `X-Meals-Content-Hash` with no
  conflict to resolve and nothing red at the call site — every download would have arrived unnamed and
  every statement unverifiable."*

  **The older commit was not wrong when it was written, which is what makes this a trap.** At its own
  base `3579bbbc`, `Program.cs:102` exposed exactly `"ETag"` and `BrowserReadableHeaders` did not exist
  — so `2a052800` carried its base faithfully. At today's tip `8e2b57de`, `Program.cs:102` exposes
  `BrowserReadableHeaders.All`. Both states verified by object. **The commit only becomes wrong as a
  merge resolution against the tip**, and since it also *deletes* the `Program.cs` block it moved, the
  ordinary resolution — take the incoming side of a modify/delete — is the one that suppresses the
  headers. This is `F-CORS-EXPOSURE-REVERT`.

  **And `lane/gr-withdraw-origin` cannot be dropped**: it carries `2a052800` *and* it is the backend
  half of the pair this section exists to flag. Dropping it drops the consent-withdrawal fix.

  **The rule that replaces the advice — a resolution rule, not a dedup rule:**

  1. **Merge both** `lane/cors-followups` `17c12c20` and `lane/gr-withdraw-origin` `e0c2b02f`. The
     policy landing twice is not the hazard; the wrong side winning is.
  2. **On `Helpers/ServiceCollectionExtensions.cs`, resolve to `3c71b323`'s side —
     `WithExposedHeaders(BrowserReadableHeaders.All)`, never the hardcoded literal.** A merge that
     takes the older side restores a header suppression nobody would see, on the paths that download
     documents.
  3. **The check that catches it** is a download arriving with a readable filename
     (`Content-Disposition`), not a green CORS suite — the CORS lane's own 21 tests all stay green on
     the bad resolution.

  The three other branches carrying `2a052800` — `lane/growth-prefcentre`,
  `lane/cors-credentialed-origin`, `lane/meals-reachable-api` — add nothing beyond it for this change
  and may be dropped **for this change only**; check each for its own unrelated payload first.

### Also paired, both halves out, no quiet direction established

`lane/fe-wf-blind-bind-name` `c67df92a` ↔ `lane/wf-blind-bind-name` `3b593fef`;
`lane/fe-wf-link-deadend` `bed932e3` ↔ `lane/wf-link-deadend` `a3a526ae`;
`lane/fe-wf-correction-path` `b4dd5282` ↔ `lane/wf-correction-path` `182fa43e`;
`lane/fe-gr-exit-wire-the-mail` `814f04d6` ↔ `lane/gr-exit-wire-the-mail` `54a8bb51`;
`lane/fe-wf-bootstrap` `9264904d` ↔ `lane/wf-bootstrap` `9d1719df`;
`lane/ev-stale-cause` `818c48a9` ↔ `lane/ev-stale-cause` `e5de872d`;
`lane/statute-honesty` `f01886a0` ↔ `lane/statute-honesty` `485959ab`;
`lane/fe-meals-docsync` `7ac2f929` ↔ `lane/meals-docsync` `f7b30b2d` (documents both sides).

One further asymmetric pair, frontend in the candidate and backend out:
`lane/fe-ev-inquiry-gate` `f7695bcb` (IN candidate) ↔ `lane/ev-inquiry-gate` `8ecb47df` (out) —
the frontend's enquiry form withdraws on a module refusal the backend does not yet issue, so the
candidate's refusal card has no case that produces it. And `lane/fe-wf-contact-imported` `3583b9f1`
(IN candidate) ↔ `lane/wf-contact-imported` `0b28f601` (out) — the contact panel saves through
`PATCH staff/{id}/person/contact`, which does not exist on `8e2b57de`.

---

## What I could not classify

- **136 backend branches with tips dated 08-03 or earlier** in the neither column. They are listed
  with their containment in `appendix-backend.txt`; they are not described here and their
  content-level status is unresolved. Patch-id containment is not conclusive for them because the
  estate rebases before landing (proven by `2a052800`/`3c71b323`).
- **Whether any of the 43 frontend fix branches would still pass its own suite after the merge.**
  No suite was run — this is a read-only census, and **26 of the 30 heads now trial-merged conflict.**
  **[CORRECTED: read "45 … 19 of the 25 heads I trial-merged". Both numbers understated the work;
  the limitation itself was correctly stated and stands.]**
- **`refs/salvage/*` (8 dangling objects, frontend).** Not lane branches; not opened.
- **The nine refs created after the 03:08Z cut-off** — listed under *Cut-off and drift since*, not
  classified. **[CORRECTED: added — the census stated no cut-off at all.]**
- **What the corrections did not touch.** `L-MANIFEST-CONDITIONS` re-derived only the seven items the
  review named. It did **not** re-run the other 24 per-head trial merges, the 433-ref containment
  classification, or the money-chain ancestry — the review re-measured those by object and they held,
  including the `priceLabel` claim, which it verified more strongly than this document made it (the
  merged `CustomerInfoModal.vue` blob is byte-identical to the candidate's).
