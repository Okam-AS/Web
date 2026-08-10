# L-GR-APPROVAL-STATE — the wire-tier proof, rescued off the worktree

Reason shape hit: **(1) the record existed but not anywhere durable.** `instrumentless-exits.md` Batch 6
ruled it *"substantively proven, in a place that dies"* — the three files lived only inside
`/Users/svendaneel/okam/wt-gr-approval/lanes/L-GR-APPROVAL-STATE/`, and
`evidence-off-the-worktrees.md` had already ruled a worktree path inadmissible as a citation. That batch
named the remedy exactly: **copy them under `docs/plan/evidence/<LANE-ID>/`**. Done here, with `mutate.sh`
carried along so the runs are re-executable rather than merely readable.

## The evidence line as it stood before `plan verify` overwrote it

```
evidence: OkamAPI-modules lane/gr-approval-state @ 3ea531f5 (worktree ../wt-gr-approval, off feature/restaurant-modules de1e5c5e, local only); fast tier 4361 passed / 0 failed / 12 skipped; lanes/L-GR-APPROVAL-STATE/{red-1-projection.txt,mutations.txt,fast-tier.txt}
```

Verified this pass: `lane/gr-approval-state` still resolves at
`3ea531f596c19d82e60b9d1c00b49dc95df9fdb2` in `OkamAPI-modules`, so the bytes survive a
`git worktree prune`; only the citation was dying.

## Files beside this one

| file | what it records |
|---|---|
| `red-1-projection.txt` | the defect at the **wire tier**, before any production change |
| `mutations.txt` | ten mutations, each red by name, on the shipped projection |
| `fast-tier.txt` | full non-SQL tier, 4361 passed / 0 failed / 12 skipped |
| `mutate.sh` | the script that produced `mutations.txt` |

## Why these establish the exit

The exit is *the detail read distinguishes never-approved from approval-revoked-by-edit, **shown at the
wire tier***. Both clauses are in the captures, and the wire tier is the tier that ran:

**The distinction did not exist, measured over HTTP.**
`WebApi.Tests.Wire.GrowthApprovalStateWireTests.An_edit_revoked_sign_off_is_not_the_answer_given_for_one_that_never_existed`
failed `Assert.NotEqual` because the two blocks were byte-identical:

```
{"state":"None","approvalId":null,"newsletterVersionId":null,"approvedAt":null,"invalidatedAt":null}
```

with the cause read off the EF command log in the same run — both approval queries issued against the
**current** version's id, so the "last invalidated" lookup could never return a row. `invalidatedAt` was
dead on the wire, not merely wrong after an edit. Red 1 is `Failed: 3, Passed: 0, Total: 3`.

**The distinction now exists and is falsifiable.** `mutations.txt` records ten mutations of the shipped
projection, every one red by name with its expected/actual printed, each run executing 21 tests:

- **M3** collapses `Revoked` back into `None` → `Expected: Revoked / Actual: None` on both wire facts
  **and** on `GrowthNewsletterLifecycleTests.GRW_VERSION_001…` (4 red of 21). This is the exit's
  distinction, failing when it is removed.
- **M4** collapses `Live` into `Revoked` → the mirror, 2 red.
- **M7** restores the original scoping (approval history read against the **current** version) → 4 red,
  including `GRW_IJ03` and the `Assert.NotEqual` from Red 1. This is the defect itself re-introduced.
- **M1** (chain order reversed), **M2** (approver/revoker swapped), **M5/M6** (approved version and
  wording reported as the current ones), **M8** (revocation time dropped), **M9/M10** (a standing
  approval given a withdrawal time / a revoker it never had) red 1–3 each, by name.

The mutation runs are targeted (21 tests); `fast-tier.txt` is the whole non-SQL tier at the lane tip —
`Failed: 0, Passed: 4361, Skipped: 12, Total: 4373` — with the count derived rather than asserted:
4357 baseline at `de1e5c5e` + 3 new wire facts + 1 new fixture theory case.

## What these do not claim

`fast-tier.txt` says it in its own words: **no SQL tier** — Docker's VM was down estate-wide that day.
The lane changes one read projection and one response DTO (no entity, no index, no migration, no raw SQL),
so nothing in it waits on the SQL tier for correctness, but that is a reason, not a run.

And this is not C5. No operator has read a `Revoked` state on a screen; nothing of this lane reached the
trunk — there is no `newsletter-detail-revoked.json` fixture and no trunk wire test naming `Revoked`.
**A verified exit and a landed capability remain different facts, and this is only the first.**
