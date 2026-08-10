# Evidence recovered to the trunk

Twenty-two lanes whose evidence path resolved nowhere. Backend trunk moved `28e60e6b8` -> `6d5328004`;
no frontend trunk moved. Exits were left alone throughout — that is a sibling's authority.

**This lane used the corrected list, not the committed census.** `docs/plan/artifacts/exits-that-name-their-file.md`
still says seven are destroyed; that is wrong and is mine. Its regex dropped the leading `/`, so absolute
paths were tested as relative and filed as nowhere. **One is destroyed, not seven.**

| disposition | count |
|---|---:|
| recovered onto the backend trunk | 9 |
| held pending a ruling — see below | 2 |
| already on a trunk, no recovery needed | 4 |
| on disk all along (my classifier's error) | 5 |
| genuinely destroyed | 1 |
| evidence line unparseable (brace expansion) | 1 |
| **accepted by `plan verify`** | **0** |

## Recovered — 9, one commit each

| lane | file | from | commit |
|---|---|---|---|
| `L-EV-URI-RELATIVE` | `artifacts/lanes/L-EV-URI-RELATIVE/RUN.md` | `6a7bf75b6` | see log |
| `L-HOSTED-SERVICE-FLOOR` | `lanes/L-HOSTED-SERVICE-FLOOR/mutation-log.md` | `6dcc15030` | see log |
| `L-LANES-OUT-OF-THE-ASSEMBLY` | `lanes/L-LANES-OUT-OF-THE-ASSEMBLY/mutation-log.md` | `2c1eebafb` | see log |
| `L-MEALS-LEVER-WITHHOLD` | `lanes/L-MEALS-LEVER-WITHHOLD/retitle-and-pin.md` | `2d0eab539` | see log |
| `L-MEALS-MEMBERS-READ` | `lanes/L-MEALS-MEMBERS-READ/mutation-log.md` | `086ac34f4` | see log |
| `L-ROUTE-GUARD-GAPS` | `lanes/L-ROUTE-GUARD-GAPS/mutation-log.md` | `a5b9e28ba` | see log |
| `L-TELEMETRY-INITIALIZER-FLOOR` | `lanes/L-TELEMETRY-INITIALIZER-FLOOR/mutation-log.md` | `78a59ed6c` | see log |
| `L-TRAIN-DISCLOSURE` | `artifacts/tests/L-TRAIN-DISCLOSURE/after.trx` | `06b8b582c` | see log |
| `L-WOLT-SYNC` | `lanes/L-WOLT-SYNC/evidence.md` | `3c7b28ee0` | see log |

Each was read before committing. No credential; the only 40-hex strings were two git commit objects
(verified by `cat-file -t`) and the SHA-256 of the empty string (recomputed).

## Held — 2, and this is the finding

`L-EV-OUTBOX-GUID-SUBSTRING` (`.lane/base-3579bbbc.trx`) and `L-FLAGS-EFFECTIVE-RESOLVERS`
(`lanes/L-FLAGS-EFFECTIVE-RESOLVERS/fast-tier.trx`) each contain **`01010112377`** twice — eleven digits
that **pass the MOD-11 fødselsnummer checksum** and carry a plausible birth date.

It is almost certainly a constructed test value: a suite exercising identity-code validation needs a
number that passes validation. But *checksum-valid* is the shape Datatilsynet cares about, and moving one
from a stale branch onto the trunk is an escalation of reach, not a clerical act. **So it is a ruling, not
a recovery**, and I did not make it. Both files stay where they are.

A second value, `00000000000`, also passes the checksum arithmetically but has no valid birth date — a
false positive of the check rather than an identifier.

## Destroyed — 1, and it stays destroyed

`L-WF-OPLINK` — `artifacts/journeys/wf-operator-import-clock.playwright.json` is on no ref in either repo
and on no disk. Re-manufacturing it would produce a record that looks like proof and is a reconstruction.

## Why `plan verify` accepted none of them

All twelve attempts returned **evidence inadmissible**. The file is now on the trunk and readable; the
refusal is that the lane's `exit:` does not *name* it. Five name the unprefixed form
(`recorded in lanes/X/…`), which is exactly the prefix class a sibling lane amended earlier tonight.
**Amending them is that lane's authority, so recovery and admissibility are two different jobs and only
the first was mine.** The evidence is no longer missing; it is merely uncited.

## Not missing at all — 5

`L-CANONICAL-SLOT-SURVIVES-A-RERUN`, `L-THE-CREDIT-SALE-SUITE-REACHES-THE-TRUNK`,
`L-THE-EVIDENCE-RECORD-CAN-BE-HANDED-OVER`, `L-THE-LIVE-WORLD-CATCHES-UP`, `L-THE-LIVE-WORLD-RUNS-THE-BRANCH`.

## Already on a trunk — 4

`L-PRINT-HOST` and `L-STATUTE-EVIDENCE-WORLD` arrived via `2ee3fd76f`, landed by an earlier lane of mine;
`L-WF-KODEOVERSIKT-UI` via `3def25837`; `L-TRAIN-EVID-LAND` was already present at identical content.

## Unparseable — 1

`L-THE-END-OF-DAY-CLOSE-COUNTS-ONLY-MONEY-THAT-ARRIVED` writes its evidence as
`lanes/X/{before-arm.trx,tier.trx,after-arm-by-name.txt}`. **No path regex expands a brace**, so it reads as
pathless in every sweep. Its four files exist, uncommitted, on no ref. That form wants a rule, not a fix.

## Method

Recovery was `git checkout <sha> -- <path>` then a single commit per lane, on the checked-out trunk, so no
`branch -f` and no fast-forward was needed. Every file was scanned for credential and PII shapes and every
hit was resolved individually rather than waved past. The two 6 MB `.trx` files were pattern-scanned
exhaustively rather than read line by line, which is stated here because it is the one place *scan* stood in
for *read*.
