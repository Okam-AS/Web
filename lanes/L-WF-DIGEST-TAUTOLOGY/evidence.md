# L-WF-DIGEST-TAUTOLOGY — evidence

## Where it actually was

The brief's operating notes said repo `Web-modules`, branch `feature/restaurant-modules`, class `node`.
**The defect is not in that repo.** I swept `Web-modules` for it first — every `digest|sha256|checksum|
contentHash|hash` hit under `test/e2e/journeys/`, `test/e2e/support/`, `test/`, `components/`, `pages/` —
and no assertion of this shape exists there. The download-bearing journey in that repo
(`test/e2e/journeys/meals-statement-month.spec.js`) is a different and non-tautological step.

The source of the finding is `docs/plan/reviews/L-WF-W5-REVIEW.md` **D3**, a read-only review of
`lane/wf-w5-timesheet @ 9e82b286` in the **backend** repo (`OkamAPI-modules`). One line, one file:

    WebApi.Tests/Workforce/WorkforceEndToEndJourneyTests.cs:889
    Assert.Equal(sent.PayloadSha256, file.FileDownloadName == null ? null : sent.PayloadSha256);

`Assert.Equal(expected, actual)`: when the download carries a file name, `actual` **is** `expected`. It
cannot fail for any payload. When the name is absent it degenerates to `Equal(digest, null)`, so the only
thing the line has ever been able to detect is a missing file name — never a byte.

A sweep for the same shape across the whole test project found **exactly one** instance:
`grep -rn "== null ? null :" --include=*.cs WebApi.Tests/ | grep -i assert` → this line alone.

## Worktree

Never wrote in the sibling's checkout. `git worktree add /Users/svendaneel/okam/wt-wfdigest -b
lane/wf-digest-tautology lane/wf-w5-timesheet`, baseline `9e82b286`, fix committed at **`4b911917`**,
reachable from `lane/wf-digest-tautology` (`git branch --contains` confirms). Nothing pushed.
Host SDK 8.0.110 matches `global.json` exactly — no container, no Docker, no rollForward shim.

## The four states, plus a control

The mutation is in production code, not in the test: `WorkforceTimesheetService.DownloadBatchAsync`
appends one `0x20` byte to the payload it serves, so the **served bytes diverge from the recorded
digest** — precisely the property the sentence claims to guard.

| # | assertion | production code | WFJ-15 result |
|---|-----------|-----------------|---------------|
| 1 | as shipped | unmutated | **GREEN** |
| 2 | as shipped | **byte appended** | **GREEN** ← cannot fail |
| 3 | fixed | **byte appended** | **RED**, line 893 |
| 4 | fixed | restored | **GREEN** |

**Control — the mutation is live, not inert.** Under state 2 the real check elsewhere,
`WorkforceTimesheetTests.Exporting_renders_the_frozen_snapshot_and_the_stored_bytes_are_what_the_download_serves`
(`Assert.Equal(batch.PayloadSha256, Sha256Hex(file.FileContents))`), went **RED** on the same mutated
binary in which the journey step stayed green. Without this control, state 2's green would be
indistinguishable from a mutation that never reached the download path.

## It reds for the reason claimed, not an adjacent one

The sibling hazard was a guard that reddened on the right file and the wrong region. State 3's failure:

    Assert.Equal() Failure
              ↓ (pos 0)
    Expected: 5b689ebbcb72f2d877ea46d011b64de1bedef3677···
    Actual:   220bc3117beef1abaee0cca97e6b4939af07ba2d6···
    WorkforceEndToEndJourneyTests.cs(893,0)

Line 893 is `Assert.Equal(sent.PayloadSha256, Sha256Hex(file.FileContents));` — two diverging 64-hex
digests, at the digest comparison, not at an adjacent line.

## Not a second tautology

The old line hinged on `FileDownloadName`, so the replacement's name assertion needed its own proof.
**Mutation B** (`FileName = null` in `DownloadBatchAsync`) reds `Assert.False(string.IsNullOrWhiteSpace(
file.FileDownloadName))` at **line 894**, `Assert.False() Failure / Expected: False / Actual: True`.
Both new lines are independently falsifiable, each at its own line.

## Why strengthened rather than deleted

The brief invited deletion if the real check already covered this path. It does not. The sibling check
covers the **ordinary** download with the flag ON. WFJ-15's sentence is the §9.2 kill-switch law: with
`workforce.export` turned OFF after a batch has left, the artifact stays **byte-identical**, not merely
still downloadable. No other test in the suite states that. Deleting the line would have removed the only
place that sentence is written down; strengthening it makes the words and the behaviour agree.

## The change

`WebApi.Tests/Workforce/WorkforceEndToEndJourneyTests.cs`, +9 −1, one file:

- the tautology replaced by `Assert.Equal(sent.PayloadSha256, Sha256Hex(file.FileContents));`
- `Assert.False(string.IsNullOrWhiteSpace(file.FileDownloadName));` — the name claim, made real
- a private `Sha256Hex` helper mirroring `WorkforceTimesheetTests.cs:563` verbatim
- a comment carrying the gotcha (recomputed **here**, never read back off the same response)

Final green: `WorkforceEndToEndJourneyTests` + `WorkforceTimesheetTests` = **33 passed / 0 failed /
1 skipped**. The skip is WFJ-11, another lane's declared `JOURNEY-GAP`, untouched here.

## Constraints

C1 no append-only write. C2 no migration. C3 no new capability. C4 no money path. C6 no statutory string.
C7 nothing logged. C5: this is a suite-level correction to a test's honesty, and is **not** offered as
acceptance of anything — WFJ-15 remains backend-only, and the W5 return's own "NO DOOR" stands: no
frontend screen calls endpoints 27–29.
