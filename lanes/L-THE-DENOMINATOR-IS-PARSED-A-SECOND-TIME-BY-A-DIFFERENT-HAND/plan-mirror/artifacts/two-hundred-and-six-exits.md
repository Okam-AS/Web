# The 206: exits that never named their own evidence

Input: `docs/plan/artifacts/why-verification-is-refused.md` and `lanes/L-WHY-469/`. The classification
was not re-derived. One line changed per lane — the `exit:` line only — appending the artifact the lane
was already discharged by. `plan verify` decided every case. No `--override`, no `plan accept`.

## Result

| | count |
|---|---:|
| candidates from the measurement | 206 |
| **edited and ACCEPTED by the tool** | **177** |
| still refused after my edit | 0 |
| left untouched — exit and artifact genuinely disagree | 8 |
| left untouched — artifact committed nowhere | 21 |

Lane `verified` moved **145 → 322**; `built-unverified` **381 → 205**. The +177 is exactly this pass.

## What I did not touch, and why

**8 genuine disagreements.** The exit demands a capture *in a browser* or *under
`artifacts/journeys/`*, and the recorded evidence is an `evidence.md`, not a journey artifact. Naming it
would have made the exit cite something that does not show what the exit asks for. These stay refused:

- `L-WF-PUNCH-UI` — exit demands a browser capture; evidence is not a journey artifact
- `L-FIXTURE-FLAG-STORE` — exit demands a browser capture; evidence is not a journey artifact
- `L-CANONICAL-SLOT-SURVIVES-A-RERUN` — exit demands a browser capture; evidence is not a journey artifact
- `L-EVERY-MODULE-CAN-BE-TURNED-ON-FROM-A-SCREEN` — exit demands a browser capture; evidence is not a journey artifact
- `L-THE-EVIDENCE-RECORD-CAN-BE-HANDED-OVER` — exit demands a browser capture; evidence is not a journey artifact
- `L-EVENTS-DISPATCH-GETS-A-SCREEN-REDO` — exit demands a browser capture; evidence is not a journey artifact
- `L-THE-LIVE-WORLD-CATCHES-UP` — exit demands a browser capture; evidence is not a journey artifact
- `L-THE-ACKNOWLEDGE-BUTTON-CANNOT-CONFIRM-THE-WRONG-WEEK` — exit demands a browser capture; evidence is not a journey artifact

**21 artifacts committed nowhere.** The file exists on this disk but is untracked, or sits
outside any repository. The objective's bar is *"an artifact a stranger can open"*; verifying against an
uncommitted file in a worktree would rest a true-looking claim on something no stranger can reach — and
the prior measurement found 60 lanes whose evidence evaporated in exactly that way. These stay refused:

- `L-FIXTURE-VOCABULARY-SWEEP` — untracked-in-repo
- `L-FIXTURE-RENDERED-VALUES-FIX` — untracked-in-repo
- `L-MEALS-ENROLMENT-HAS-A-BUTTON` — untracked-in-repo
- `L-ADMINPAGE-EMITS-INSTEAD-OF-NAVIGATING` — untracked-in-repo
- `L-EF-DECLARES-EVERY-TRIGGER` — not-a-repo
- `L-SECRETS-READ-FROM-CONFIG` — untracked-in-repo
- `L-CI-RUNS-THE-FAST-TIER` — untracked-in-repo
- `L-COMPANY-REFUND-IS-NOT-A-CASH-PAYOUT` — untracked-in-repo
- `L-A-PUBLISHED-CATEGORY-REACHES-THE-SHOP` — untracked-in-repo
- `L-LAND-THE-FRONTEND-ON-THE-TRUNK` — untracked-in-repo
- `L-THE-LIVE-WORLD-RUNS-THE-BRANCH` — untracked-in-repo
- `L-ARTIFACT-STORE-TEST-IS-WORKTREE-FREE` — untracked-in-repo
- `L-SECOND-WAVE-LANDS-ON-BOTH-TRUNKS` — not-a-repo
- `L-TRAIN-DEMO-SEED-COMPLETES` — untracked-in-repo
- `L-THE-TOP-RANKED-FIXES-REACH-THE-TRUNK` — not-a-repo
- `L-A-LOGIN-TOKEN-EXPIRES-WITHIN-A-SESSION` — untracked-in-repo
- `L-EVERY-MODULE-HAS-DATA-A-PERSON-CAN-WALK` — untracked-in-repo
- `L-THE-COVERAGE-INSTRUMENT-MEASURES-WHAT-IT-CLAIMS` — untracked-in-repo
- `L-THE-TESTED-WORK-REACHES-THE-TRUNK` — not-a-repo
- `L-THE-PRODUCT-LINK-ROUTE-SAYS-WHAT-IT-WANTS` — untracked-in-repo
- `L-ADMIN-LOGOUT-RETURNS-TO-SIGN-IN` — untracked-in-repo

## Discipline

The exit was made to name the artifact that already proves it, never the reverse. No criterion was
weakened, no evidence chosen, nothing rephrased: a diff of the plan against its backup shows **only**
`exit:` lines (mine, 177) and `state:` lines (the tool's own transitions). Every other byte is identical.

**0 lanes had their refusal reason change rather than clear** — the tool accepted every lane I edited, so
no edit moved a problem instead of solving it.
