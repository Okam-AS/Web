# L-MANIFEST-CONDITIONS — the seven conditions, applied

Target document: `../L-FIX-BRANCH-MANIFEST/manifest.md`, the branch manifest a composition ruling
rests on. Source: the Fable review of `L-FIX-BRANCH-MANIFEST`, recorded in the plan and in the clerk
log at 2026-08-05T04:08Z.

**Verdict: seven of seven applied. None refused.** Every one was re-measured by object before it was
written in, and all seven survived that check — which is the reason none was refused. Where a
condition's *conclusion* survived a wrong premise (the backend diagram) or a number's *meaning*
survived its arithmetic (the 28-file merge), that is said at the line rather than buried.

**Editing standard.** This is another lane's evidence. Corrections **qualify, correct and add**; they
do not compress, and **nothing the census said about its own limits was removed.** Every changed line
carries `[CORRECTED: …]` with what it said before, so the ruling can see what moved. Two of the
census's self-criticisms were *strengthened* rather than trimmed: its "no suite was run" limit now
carries the corrected census number, and a fourth limit was added for the refs it could not have seen.

---

## The seven

### 1 — the fix count is 43, or 44 if a comment-only change counts. Not 45. **APPLIED**

Where: `## What the frontend "neither" column actually contains`, the fourth bullet.

The census had already written the exclusion rule three bullets earlier — *"counting content already
applied as pending work is the same error this lane was opened to fix"* — and applied it to three
branches, then not to two more that fail it in a different way.

| branch | oid | payload | verdict |
|---|---|---|---|
| `lane/fixture-divergence-receipt` | `0dbec34b` | 1 file, `lanes/L-FIXTURE-DIVERGENCE-RECEIPT/receipt.md`, +273, **0 code files** | not a fix under any reading → **44** |
| `lane/collect-review-conditions` | `808d5095` | 5 files, 4 under `lanes/`; only non-evidence file `jest.config.js` **+9/-4, every changed line inside a `//` comment block** | a real correction, but comment-only → **43** |

Measured: `git show --numstat 0dbec34b`; `git show 808d5095 -- jest.config.js` — the
`testPathIgnorePatterns` array is byte-for-byte what `82127eb` shipped, which the commit message also
states. The table in the manifest **already admitted** `0dbec34b` as "(evidence only, 0 code files)"
while the count above it kept it — the review's phrasing, that the manifest admits it while the
summary counts it, is exactly what the document does.

Written in as **43, or 44 if a comment correction counts**, with which of the two is arguable said
plainly rather than averaged away.

### 2 — the conflict census reads 26 of 30, not 19 of 25. **APPLIED — this is the one that resizes the work**

Where: a new `### FRONTEND — conflict census` block, plus the `e8b58ec1` row and the five older lanes.

The old sentence failed on its own arithmetic: **19 + 4 ≠ 25.** Three faults at once.

1. **One low.** The census's own tables carry 24 verdicts: 9 chain heads (8 conflict / 1 clean) and 15
   independent branches (12 / 3) = **20 conflict, 4 clean**, not 19.
2. **A head inside the denominator that was never run.** `e8b58ec1` `lane/fe-events-margin-surfaces`
   is listed `not run` in the merge-tree column while being counted in the 25. Re-run:
   **CONFLICT, 8 files.**
3. **Five heads never trial-merged at all** — the older lanes listed as prose with no verdict. Re-run,
   **all five conflict**: `319ec253` ×10, `7890f691` ×10, `c3974fdb` ×11, `f866024a` ×13,
   `6790589e` ×11.

**20 + 1 + 5 = 26 conflict; 4 clean; 30 heads.** A landing plan sized on 19 is short by **seven
authored merges**.

Added while measuring, and not part of the condition: **one of the four "clean" heads is a
fast-forward.** `808d5095`'s parent *is* the candidate tip `9f7d8df`, so its clean verdict reconciled
nothing; `merge-base --is-ancestor 9f7d8dfc 808d5095` is true, and false for the other three.

Method: `git merge-tree --write-tree --name-only 9f7d8dfc <head>`, candidate re-checked as unmoved at
`9f7d8dfc` at measurement time. Full output with per-file conflict lists: `census-recheck.txt`.

### 3 — one file count is 28, not 29. **APPLIED**

Where: the CHAIN D–H trial-merge line.

`20693381` `lane/fe-training-meals-surfaces` × candidate `9f7d8dfc` → **28 conflicted paths**, not 29.
The claim the number carried — that this is the worst merge on the frontend — is unchanged; the
next-worst is `5886ba30` at 13. Paths listed in `census-recheck.txt`.

### 4 — the backend idempotency diagram has a false edge. **APPLIED**

Where: the `### Backend chains among the 08-04+ set` block.

Drawn: `a1d57208 lane/wf-idempotency-refusal` joining at `4bbf34a5 lane/meals-agreement-pin-inverts`.
Measured: **`a1d57208` is not an ancestor of `4bbf34a5`.** It joins the family two commits later, at
the merge `887f0512`, and the two branches are siblings that never touched each other — both merged
separately onto the modules tip `8e2b57de` (which is what "the replay-pin base" is):

```
54714dd6 → 4bbf34a5 → 4e87d0f9 ─┐
a1d57208 ──────────→ 887f0512 ──┴→ 6278f0b5 → a6583a02 lane/replay-pins-close
```

**The conclusion the false edge supported is nevertheless true**, and was re-checked rather than
assumed: `a1d57208`, `54714dd6` and `4bbf34a5` are all ancestors of `a6583a02`, so merging the deepest
head still lands all three. What changes is that a resolution author expecting one line of history
finds two.

Added, because the old drawing invited a reader to miss it: **`02684ecc`
`lane/wf-idempotency-refusal-rest` carries `a1d57208` but is NOT an ancestor of `a6583a02`** — the
deepest head does not land it — and **`01cd5eee` `lane/train-idempotency-refusal` is an ancestor of
neither**. Three independent heads in this family, not one.

Method: `merge-base --is-ancestor` on nine pairs, plus `log --graph`. Output: `backend-recheck.txt`.

### 5 — "no test reds either way" must carry its provenance. **APPLIED**

Where: pair 3, first bullet.

The sentence was stated as flat fact by a document that **ran no suite** — which the census says about
itself in its closing section, so the correction is a consistency fix, not a new criticism. Its two
supports are now named and weighed:

- **Inherited, and half-quoted.** `80493321`'s commit message says reverting `API_BASE_URL` "reddened
  nothing" — about the state **before** that commit, as its reason for **adding** a pin. The same
  message records a mutation that *does* red (`Expected okam.no, Received azurewebsites.net`).
- **A mechanism argument, which is the part that holds.** A credentialed preflight is refused by the
  browser: no request reaches the API, and no jsdom test performs a preflight. **The pin that would
  red is inside the missing half** — both CORS commits add
  `WebApi.Tests/Wire/GrowthPreferenceCentreCorsWireTests.cs`, +162 lines, verified by diffstat, which
  cannot red while the branch carrying it is unmerged.

Added: **both lanes did run suites** — L-GR-WITHDRAW-ORIGIN frontend 2432/2433 (Δ+5) and backend
4394/0/12 (Δ+4); L-GROWTH-PREFCENTRE 21 new backend tests with a mutation reddening 3 of 11 — and
**every one is a run of the fixed state on a lane branch, not of the composed candidate.** That is why
the claim survives: C5 applies literally, and a person walking the withdrawal is the only instrument
that sees this.

### 6 — the CORS item needs a resolution rule, not a dedup rule. **APPLIED**

Where: pair 3, the DUPLICATE-FIX HAZARD bullet.

The advice read *"Take `lane/cors-followups` … and drop the other four for this change."* It cannot be
followed, for two independent reasons, both verified by object.

**They are not the same patch.** In `Helpers/ServiceCollectionExtensions.cs`:

| | default policy |
|---|---|
| `2a052800` | `.AllowAnyHeader().WithExposedHeaders("ETag")` |
| `3c71b323` | `.AllowAnyHeader().WithExposedHeaders(BrowserReadableHeaders.All)` |

and `3c71b323`'s own doc-comment records that the literal *"dropped `Content-Disposition` and
`X-Meals-Content-Hash` with no conflict to resolve and nothing red at the call site."*

**And the branch it told you to drop is the pair's backend half.** `lane/gr-withdraw-origin` carries
`2a052800` *and* is the consent-withdrawal fix; dropping it drops the capability.

Added — the older commit was **not wrong when written**, which is what makes this a trap rather than a
mistake: at its base `3579bbbc`, `Program.cs:102` exposed exactly `"ETag"` and
`Helpers/BrowserReadableHeaders.cs` **did not exist**; at the tip `8e2b57de` the same line exposes
`BrowserReadableHeaders.All`. Both verified. The commit becomes wrong only *as a resolution against
today's tip*, and because it deletes the `Program.cs` block it moved, the ordinary modify/delete
resolution is the one that suppresses the headers. That is `F-CORS-EXPOSURE-REVERT`.

Also added: **a dedup by date finds neither**. The two share an **author** timestamp to the second
(2026-08-03 11:22:27 +0200, preserved across the rebase) and differ by a day in **commit** timestamp
(08-04 20:24). Both statements about this pair are true; which one a reader looks at decides whether
they see a duplicate at all.

Written in as a three-step rule: merge both; resolve `ServiceCollectionExtensions.cs` to `3c71b323`'s
side, never the literal; and check it with a download arriving under a readable filename — because the
CORS lane's own 21 tests stay green on the bad resolution.

### 7 — state the cut-off and what has arrived since. **APPLIED**

Where: a new `## Cut-off and drift since` section, a banner at the top, and a fourth limitation in the
closing section.

**Cut-off: 2026-08-05T03:08Z.** The census stated none, which let a reader take it as current.

| | at 03:08Z | at 04:21Z | added | gone |
|---|---:|---:|---:|---:|
| frontend `refs/heads` + `refs/lanes` | 116 | **125** | 9 | 0 |
| backend `refs/heads` + `refs/lanes` | 317 | **317** | **0** | 0 |

**Backend drift is zero**, by `comm` against `appendix-backend.txt` rather than by counting.

The nine frontend refs are listed by name and oid and **not classified** — the exit asked for the
cut-off, not a second census. Two facts about them were cheap and are recorded:
`lane/vat-keys-monolingual` points at `feature/restaurant-modules` itself, so it carries no commit
either anchor lacks; `lane/consent-reason-vocabulary` and `lane/fixture-rendered-values` share one oid.

**The count moved during this pass**, which is written into the document rather than smoothed over:
the review named **seven**, this lane measured **eight** at 04:12Z and **nine** at 04:21Z. Nine
minutes, one more ref. The clerk's brief to the review said `refs/heads` held 111 when the census had
measured 107. **A ref count without a timestamp is already wrong.**

---

## Refusals

**None.** All seven conditions were re-measured before being applied and all seven held. Three came
close enough to a refusal to be worth recording:

- **Condition 4** rests on a false *edge*, but the *conclusion* drawn from it ("merging `a6583a02`
  lands all three") is true. Refusing the condition on that ground would have been wrong — the diagram
  is what a migration author reads under C2, and a false parent edge is exactly the thing that must
  not be in it. Applied, with the surviving conclusion preserved and re-verified.
- **Condition 3** changes 29 to 28 without changing anything the number was used for. Applied anyway:
  a document being ruled on should not carry a number that disagrees with the command that produced it.
- **Condition 5** could be read as asking for the sentence to be withdrawn. It is not withdrawn — the
  mechanism argument holds and is now stated as the load-bearing half. Removing the claim would have
  deleted a real, invisible defect from a document whose job is to surface it.

## What was not done

- **The census was not re-derived.** 24 of 24 per-head verdicts were re-measured by the review and
  matched; only the seven named items were re-measured here, plus the three new trial-merge groups the
  correction required.
- **No suite was run, no merge performed, no branch checked out, no ref moved, no container touched.**
  Read-only git in both repositories, plus edits to the manifest and this lane directory.
- **The nine new refs are not classified.** Containment and payload for them is a second census.

## Evidence in this directory

| file | what it holds |
|---|---|
| `census-recheck.txt` | 11 trial merges at `9f7d8dfc` with per-file conflict lists — the 6 new measurements and the 4 clean heads re-confirmed |
| `backend-recheck.txt` | 9 ancestry tests on the idempotency family, its graph, and the CORS pair by object (both `WithExposedHeaders` lines, both base states, the wire-test diffstat) |
| `frontend-drift.txt` | three ref-count readings with timestamps, the 9 new refs, the backend zero-drift `comm` |
