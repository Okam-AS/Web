# Exits that name their file

Read-only census plus eight amendments, at plan.md as of this run. Trunk `28e60e6b8`, unmoved.
Only `exit:` lines inside `## Lanes` were edited — no lane body, no `state:`, no decision, no flag.

## The census, re-measured

The brief's figures (133 / 73 / 34) predate several merges. These are current and supersede them.

| class | count |
|---|---:|
| `built-unverified` after this lane | 124 |
| evidence resolves on disk now | 63 |
| evidence names no path at all | 40 |
| evidence names a path that is nowhere | 21 |

## Amended — 8, and `plan verify` accepted all 8

Two legitimate shapes. Neither changed what a lane must be true for.

**Shape 1 — the exit already named the artifact, in a form the tool cannot open.** The designation
predates the work; only the prefix was clerically wrong. A path resolves relative to the plan repo, so
`lanes/X/y.md` refuses while `../OkamAPI-modules/lanes/X/y.md` is found.

| lane | path named in the exit | amendment |
|---|---|---|
| `L-GROWTH-FAMILY-LAND` | `lanes/L-GROWTH-FAMILY-LAND/merge-receipt.md` | prefixed `../OkamAPI-modules/` |
| `L-PHONE-IN-PATH` | `artifacts/security/L-VIPPS-LOG-mutation.md` | prefixed `../OkamAPI-modules/` |
| `L-INVOICE-AUTHORIZE-LAND` | `lanes/L-INVOICE-AUTHORIZE-LAND/merge-receipt.md` | prefixed `../OkamAPI-modules/` |
| `L-VIOLATION-EXACT-LAND` | `lanes/L-VIOLATION-EXACT-LAND/merge-receipt.md` | prefixed `../OkamAPI-modules/` |
| `L-PUSH-TOKEN-IN-PATH` | `lanes/L-PUSH-TOKEN-IN-PATH/mutation-log.md` | prefixed `../OkamAPI-modules/` |

**Shape 2 — the lane body said "Write to `<path>`" and the exit only described the artifact.**
Each body carries that directive verbatim, written before the work began.

| lane | path the body designated | amendment |
|---|---|---|
| `L-READ-THE-THREE-TRANCHES-ON-THE-TRUNK` | `docs/plan/reviews/L-READ-THE-THREE-TRANCHES-ON-THE-TRUNK.md` | appended `, recorded in docs/plan/reviews/L-READ-THE-THREE-TRANCHES-ON-THE-TRUNK.md` |
| `L-READ-WHAT-REACHED-BOTH-TRUNKS-TODAY` | `docs/plan/reviews/L-READ-WHAT-REACHED-BOTH-TRUNKS-TODAY.md` | appended `, recorded in docs/plan/reviews/L-READ-WHAT-REACHED-BOTH-TRUNKS-TODAY.md` |
| `L-WHY-FOUR-HUNDRED-AND-SIXTY-NINE-LANES-CANNOT-VERIFY` | `docs/plan/artifacts/why-verification-is-refused.md` | appended `, recorded in docs/plan/artifacts/why-verification-is-refused.md` |

Each was followed immediately by `plan verify <ID> --evidence <path>`; all eight printed
`built-unverified -> verified` and exited 0.

## Declined — 63, which is the more important number

Every one of these has its evidence sitting on disk right now. Amending them would be the exact failure
this lane exists to prevent: **the exit names no path, and the lane body never designated one, so the
artifact was chosen by the agent after the work.** An exit rewritten to match the evidence it received
proves nothing, so these keep their exits and stay `built-unverified`.

They are not lost — each has a reachable file and a recorded evidence line. They need the lane that
designated an artifact, or a human ruling that the artifact they produced is the right one.

<details><summary>All declined lane ids</summary>

- `L-AI-MIDDLEWARE-DELETE`
- `L-COMPOSITION-ROOT-CHECK`
- `L-COMPROOT-PIN-OVERDETERMINED`
- `L-CONFIRM-CONAT-RETIRE`
- `L-CONFIRM-SERVER-HALVES`
- `L-CRYPTO-PIN-BYFORM`
- `L-DOWNLOAD-HEADERS`
- `L-DOWNLOAD-PDF-WIRE`
- `L-EF-INDEX-SHADOW-SWEEP`
- `L-EV-ACCEPT-GATE`
- `L-EV-ACCEPT-RECEIPT`
- `L-EV-EXTDEP`
- `L-EV-GUEST-ORIGIN`
- `L-EV-VIPPS-FALLBACK`
- `L-EVENTS-DISPATCH-GETS-A-SCREEN-REDO`
- `L-EVERY-MODULE-CAN-BE-TURNED-ON-FROM-A-SCREEN`
- `L-FE-WF-ONBOARD-WALK`
- `L-FIXTURE-FLAG-STORE`
- `L-GR-CONFIRM-STALE`
- `L-GR-CONFIRMED-EMAIL`
- `L-GR-CONFIRMED-PIN-FIX`
- `L-GR-DEADLINE-STATUTE`
- `L-GR-DISPATCH-ACTOR`
- `L-GR-TESTSEND-GUARD`
- `L-GR-TESTSEND-RATELIMIT`
- `L-GROWTH-HEALTH-HONEST`
- `L-GROWTH-NEWSLETTER-WIRE`
- `L-INVOICE-AUTHORIZE`
- `L-INVOICE-RETRY-RETIREMENT`
- `L-JOURNEY-COVERAGE-THREE`
- `L-JOURNEY-WORKFORCE`
- `L-LIVE-WORLD-SECOND-HUMAN`
- `L-LIVE-WORLD-SEED`
- `L-MEALS-POS-TENDER-WIRE`
- `L-MEALS-RELEASE`
- `L-MIG-COMPANY-RECEIVABLE`
- `L-PDF-NULLDEREF`
- `L-PRICE-CROSSCURRENCY`
- `L-REVIEW-RESIDUALS`
- `L-THE-ACKNOWLEDGE-BUTTON-CANNOT-CONFIRM-THE-WRONG-WEEK`
- `L-THE-EIGHTY-TWO-MECHANICAL-REFUSALS-ARE-CLEARED`
- `L-THE-EVIDENCE-A-STRANGER-CANNOT-REACH-IS-COMMITTED`
- `L-THE-SIGN-IN-FRONT-DOOR-IS-HONEST`
- `L-TRAIN-EVIDENCE-NAMES-COURSE`
- `L-TRAIN-EVIDENCE-PACK-UI`
- `L-TRAIN-W3-SCHEMA`
- `L-TWENTY-THREE-BRANCHES-GET-AN-ARTIFACT-A-STRANGER-CAN-OPEN`
- `L-TWO-HUNDRED-AND-SIX-EXITS-NAME-THEIR-OWN-EVIDENCE`
- `L-UTLKVIT-SALE-ROW`
- `L-WF-BLIND-BIND-NAME`
- `L-WF-CONTACT-IMPORTED`
- `L-WF-CORRECTION-PATH`
- `L-WF-DEMO-PRESENCE`
- `L-WF-IDEMPOTENCY-REFUSAL`
- `L-WF-IDREG`
- `L-WF-LINK-DEADEND`
- `L-WF-ONBOARD`
- `L-WF-PUNCH-UI`
- `L-WF-PUSH-SILENT`
- `L-WF-PUSH-STILL-LIES`
- `L-WF-ROLES-UI`
- `L-WF-TIMESHEET-UI`
- `L-WF-WITHHELD-BOUND`

</details>

### One near-miss worth recording

`L-EVENTS-DISPATCH-GETS-A-SCREEN-REDO` passed a first, looser test that matched an artifact's **basename**
in the body. The body does contain `evidence.md` — but it belongs to a *different* lane, cited as prior
reading ("read `docs/plan/lanes/L-EVERY-MODULE-CAN-BE-TURNED-ON-FROM-A-SCREEN/evidence.md` first").
Re-running on **exact full paths** dropped it. Basename matching would have amended an exit on a citation
of somebody else's file.

## Not this lane's to touch

- **21** name a path that resolves nowhere on disk. Some are recoverable from a git ref, some are
  destroyed. Bringing a file onto a trunk is a landing, it races other lanes, and it earns its own lane.
- **40** name no path at all — a `fact:` key or prose. Nothing to point an exit at.

<details><summary>Lane ids naming a path that is nowhere</summary>

- `L-CANONICAL-SLOT-SURVIVES-A-RERUN`
- `L-EV-OUTBOX-GUID-SUBSTRING`
- `L-EV-URI-RELATIVE`
- `L-FLAGS-EFFECTIVE-RESOLVERS`
- `L-HOSTED-SERVICE-FLOOR`
- `L-LANES-OUT-OF-THE-ASSEMBLY`
- `L-MEALS-LEVER-WITHHOLD`
- `L-MEALS-MEMBERS-READ`
- `L-PRINT-HOST`
- `L-ROUTE-GUARD-GAPS`
- `L-STATUTE-EVIDENCE-WORLD`
- `L-TELEMETRY-INITIALIZER-FLOOR`
- `L-THE-CREDIT-SALE-SUITE-REACHES-THE-TRUNK`
- `L-THE-EVIDENCE-RECORD-CAN-BE-HANDED-OVER`
- `L-THE-LIVE-WORLD-CATCHES-UP`
- `L-THE-LIVE-WORLD-RUNS-THE-BRANCH`
- `L-TRAIN-DISCLOSURE`
- `L-TRAIN-EVID-LAND`
- `L-WF-KODEOVERSIKT-UI`
- `L-WF-OPLINK`
- `L-WOLT-SYNC`

</details>

## Method, and what it does not cover

Paths were extracted from `evidence:` and `exit:` lines by regex and resolved against the plan repo and
`../OkamAPI-modules`. Body designation was tested by **exact full-path** containment in the lane body,
after the looser basename test produced the false positive above. Lanes in states other than
`built-unverified` were not examined. `plan.md` was being written concurrently by the clerk while this ran,
so the totals are a snapshot; the eight amendments and their verify results are not.
