# Review — the three tranches on the trunk, read by a second reader

Under review: `feature/restaurant-modules` `c6c04c7` → `ee82e40` → `bb22728` → `3807e90` (T2, T3,
T4). Reviewer: agent:L-READ-THE-THREE-TRANCHES-ON-THE-TRUNK · 2026-08-08 · read-only; one throwaway
worktree (`Web-modules-wt/L-READ-TRANCHES`), checked out per trunk state, removed after.

## Verdict

**APPROVE the trunk from `c6c04c7` to `3807e90`.** The T3 merge destroyed neither intent — both
survive in the merged file and each parent's diff against the tip shows exactly and only the other's
contribution. The T4 submodule pin move is sound and load-bearing, verified in both directions. The
deliberate red went green by page change alone (59/0 reproduced). The knowingly-led T3 backend half
is demo-seed-only, verified — the trunk promises nothing the backend does not already deliver.
Tier reproduction: §5.

## 1. T3 — the shared file, read line by line; no intent destroyed

`pages/admin/workforce-timesheets.vue` at `3807e90` carries **both** intents in their own regions:

- **`8d4d1b0` (export-flag-unread)**: `exportEnabled()` (`:205-208`) returns **`null` when
  `listResult` is unread** and `!!listResult.exportEnabled` only after an answer; the flag-off
  banner gates on **`v-if="exportEnabled === false"`** (`:67`) with the three-state comment at
  `:63` — an unread flag is no answer, not "off".
- **`2ce83f6` (module-off refusal)**: `contextRefusalKey` imported (`:116`) and the context error
  routed through it (`:239-242`) with the `{noCapability, failed}` key map — the 2-argument call
  matching the util's signature.

Mechanical corroboration, which is stronger than reading: `git diff 8d4d1b0 3807e90 --` on the file
is **exactly 2ce83f6's hunk** (+5/−3: the `contextRefusalKey` routing replacing the inline
403 ternary), and `git diff 2ce83f6 3807e90 --` is **exactly 8d4d1b0's** (+16/−4: the three-state
computed and the banner). T4 does not touch the file. A wholesale take of either side would have
shown one of those diffs empty and the other doubled; neither is. **The merge interleaved; nothing
was silently destroyed.**

## 2. T4 — the pin move is sound, and load-bearing exactly as argued

- Committed gitlinks: `c6c04c7` and `bb22728` pin `9626a561…`; **`3807e90` pins
  `a6ae24127b895e536cc600053f1cc25b1cc79f5f`** — only T4 moved it.
- In a fresh checkout of the tip, `git -C core rev-parse HEAD` = `a6ae241…` = the gitlink.
  (The main `Web-modules` checkout reads `9626a561` — **not drift**: that working tree sits on
  `wip/session-2026-08-06-all-work`, whose own gitlink is `9626a561`; it agrees with its branch.)
- `hasBackendMessage` in `core/services/request-service.ts`: **0** occurrences at `9626a561`, **1**
  at `a6ae241` — reproduced by reading both blobs.
- The app reads the field at `utils/request-failure.js:30` and `:32`, and **four pages** consume it
  through `describeRequestFailure` — `poweruser-growth.vue`, `settlements.vue`, `statistics.vue`,
  `wolt-drive-invoice.vue` — matching the lane's "4 places".
- The load-bearing claim is exact, and worth restating sharply: at the old pin the field is never
  written, so **every** failure takes the `:32` absence branch and returns the raw
  `error.message` — the untranslated axios transport string, the precise defect the report-read
  chain exists to remove. Jest stays green because the suites construct their error objects
  themselves. **Frontend-alone would have been green in jest and wrong in a browser; the pin move
  had to ride T4.** Sound.

## 3. The deliberate red went green by code — reproduced

`git diff --numstat aff616d 8d4d1b0 -- test/workforce-timesheets-page.test.js` → **`59 0`**.
Zero deletions: the deliberately failing arm
(*"does not tell a manager the export flag is off when the flag was never read"*) was not edited,
weakened, or removed; the page change is what turned it. This matches what my own tranche-audit
measured at `aff616d` (the arm was the suite's one deliberate red) and the T3 tier's green.

## 4. The knowingly-led branch — verified demo-only, ruling below

`2ce83f6`'s backend half `8357c8a33` is **not** on the backend trunk, and its entire content is
`Scripts/demo/seed-workforce-demo.sh` (+19/−3) and
`WebApi.Tests/Workforce/WorkforceDemoSeedFlagTests.cs` (+110). **No production code rides in it.**
The contract the frontend now depends on is already landed backend-side:
`workforce.module-disabled` is documented on `IWorkforceModuleGate.cs:47` and answered via
`WorkforceSelfService.cs:507`; the frontend maps that exact code
(`utils/workforce/context-refusal.js:29,50`). So the trunk promises nothing the backend does not
deliver; the only divergence is a demo world seeded by the old script writing a flag the catalog
refuses.

**Ruling on the knowing lead:** engineering consequence nil (verified above); governance
consequence real and already recorded against the unruled decision. The residue worth keeping: when
that decision is ruled, the demo-seed half either lands or the decision's "do not land either" is
formally amended — the frontend half being on the trunk makes "neither" no longer available as an
outcome. Nothing for this lane to fix.

## 5. Tier reproduction

Run from the throwaway worktree at each trunk state, `npx jest --ci`, core re-pinned per state's
gitlink, load-gated separately:

| trunk state | claimed | measured |
|---|---|---|
| `c6c04c7` (T2 end, core `9626a561`) | 173 / 4200 / 0 | **173 / 4200 / 0** |
| `bb22728` (T3 end, core `9626a561`) | 179 / 4318 / 0 | **179 / 4318 / 0** |
| `3807e90` (T4 end, core `a6ae241`) | 182 / 4414 / 0 | **182 / 4414 / 0** |

All three reproduce exactly. One process slip of my own, owned here: the `bb22728` run's gate was
bundled into the same command as the tier and read 43.3 — the decaying burst of my own previous
run — instead of being a separate check I stopped on. The run itself was 11 s and green; the
`c6c04c7` run was gated separately at 1.83 after the session reset, and the `3807e90` run at 10.79.

Timing note for later readers: this review covers `c6c04c7` → `3807e90` and its measurements were
taken at those SHAs; the trunk had already moved past `3807e90` (T5 and later work) while the review
was in flight, which does not affect the range read here.

## 6. Notes that cost nothing but are worth keeping

- **T2 contains `5ed9664`** (meals) alongside the runner fix — the seam-1 pairing the landing plan
  required, landed as prescribed; the T2 arithmetic (170/4080 + 3 suites/115 meals + the runner
  fix's pin additions = 173/4200) is coherent.
- The fixed runner at the tip (`test/support/mutate.js`) carries the executed-test-count judgment
  and `INVALID-RUN` ("never a kill and never a survivor"), with jest **and** vstest
  (`Total tests:`/`Total:`) parsing — the exact change my tranche-one review named, now hardened
  beyond it.

## Constraints

C1/C2/C4/C6/C7: not in play — no migrations, no money writes, no statutes, no secrets in the three
tranches' diffs (frontend tests, pages, one util, dictionaries, submodule pin). C3: the module-off
refusal keys, their consumers and the backend contract are all reachable and landed (§4). C5:
nothing moved to accepted here; this is a code-and-tier review.

## Hygiene

Worktree `Web-modules-wt/L-READ-TRANCHES` (detached per trunk state, core re-pinned per gitlink via
the full-SHA file-protocol fetch), removed with `rm -rf` + `git worktree prune`. No commit, merge,
rebase, push or branch move; `web-livewalk`, containers and ports untouched; load gated separately
before every tier.
