# L-WF-ACKNOWLEDGE-RECEIPT-VISIBLE — a worker who confirms a published week is shown the receipt

## Provenance of every number and file state below

| | |
|---|---|
| worktree | `/Users/svendaneel/okam/web-wfack` (created for this lane) |
| branch | `lane/wf-acknowledge-receipt-visible`, **never pushed** |
| base | `candidate/fe-compose-2026-08-05` @ `9f7d8df` — chosen because it is the only branch in the estate carrying **both** `test/e2e/journeys/workforce-week-run.spec.js` and `components/admin/workforce-me/WorkforcePublicationNotice.vue`. The shared checkout `/Users/svendaneel/okam/Web-modules` is on `lane/focustrap-teardown` @ `8ac6f63`, which **does not contain the journey at all** (`git grep -l workforce-week-run HEAD -- test/` is empty there) |
| fix commit | `8539b3f` — every source claim, every jest number and every journey run below is that tree |
| evidence commit | the tip of `lane/wf-acknowledge-receipt-visible`, whose parent is `8539b3f` — this file, the four run logs and the re-recorded journey artifact. Deliberately not quoted as a sha: a file cannot name the commit that contains it, and every sibling receipt in this program that tried has been wrong by one amend. |
| working tree at the time the numbers were taken | clean apart from untracked `lanes/L-WF-ACKNOWLEDGE-RECEIPT-VISIBLE/` and the regenerated `artifacts/journeys/workforce-week-run*`. **No other lane's untracked files are in this worktree** — it was created from a branch tip, not shared. |
| ports | `E2E_WEB_PORT=3931`, `E2E_FIXTURE_PORT=4931`. **4010 was never bound**: it was already held by a foreign fixture (pid 73160), which was never signalled and never touched. No container was started or stopped. |
| suite concurrency | one at a time throughout; no children spawned |

## The defect, and why the render was never the place to fix it

`acknowledge()` stored the #44 receipt in `ackReceipts` and then reloaded the inbox. Acknowledging
*implies seen*, so the row came back `isRead: true`, `unreadPublications()` dropped it, and the whole
`WorkforcePublicationNotice` section — `v-if="items && items.length"` — was removed, **taking the
receipt line rendered inside it**. The receipt renderer therefore required a row that was both
**unread and acknowledged**, and the product cannot produce one: the act that fills `receipts` is the
act that makes the row read.

Proven, not asserted — see run 3 below: with the receipt render **fully intact** and only the feed
reverted to unread-only, the journey still reds. Fixing the template alone would have changed nothing.

## The fix

| file | change |
|---|---|
| `utils/workforce-me/inbox-filter.js` | new `publicationsForNotice(items, acknowledged)` — the unread rows, then any row this session acknowledged. Prefers the server's copy of that row (the one saying `isRead: true`), falling back to the row **as it was pressed**, so a failed inbox re-read cannot take the receipt with it. `null` still means *not loaded*. Built on the existing `unreadPublications`, which stays live rather than being orphaned. |
| `pages/admin/workforce-me.vue` | `ackItems` alongside `ackReceipts`; `acknowledge()` keeps the row it pressed; the notice is fed `noticePublicationItems`. |
| `components/admin/workforce-me/WorkforcePublicationNotice.vue` | a kept row must not lie about being unopened: heading becomes `wfme_pub_title_confirmed` once nothing is unread, the "du har ikke åpnet denne ennå" lede is withheld, and the unread dot and *Marker som lest* button go with the unread state. The receipt line itself is **unchanged** — it was always correct. |
| `translations/{no,en,de}.ts` | `wfme_pub_title_confirmed`, all three dictionaries. |

The acknowledge button survives, so the idempotent replay (`alreadyAcknowledged: true`) and the
`wfme_pub_receipt_already` string now have a caller a browser can reach. That was recorded as a gap by
the finding lane and is closed as a consequence of the same repair, not as a separate change.

## Exit criterion, evidenced

**"the workforce week-run journey asserts the receipt is visible after Bekreft, replacing the
assertion that currently pins its absence, and reds when the receipt render is removed"**

The finding lane asserted the defect in two steps. Both are **inverted, not deleted**, and each keeps
the mechanism it used to pin in a comment above it, so the record of what was once wrong survives.

| step | was | is |
|---|---|---|
| 12 | `...and the confirmation vanishes without a trace on screen` — asserted `.wfme-pub` count 0 and `.wfme-pub__receipt` count 0, and raised a `defect` finding | `...and the receipt is on screen, naming when it happened` — asserts the receipt is present, visible, reads *Bekreftet mottatt*, carries a `\d{2}:\d{2}` clock, and that the heading stops calling the row new |
| 13 | `the idempotent replay has no caller a worker can reach` — asserted `.wfme-pub__btn` count 0, raised a `gap` | `the idempotent replay is reachable, and says it is a replay` — presses again, asserts the wire answers `alreadyAcknowledged: true` and the screen says *Allerede bekreftet* |

### The four runs, in order

| # | tree | result | log |
|---|---|---|---|
| 1 | fix as committed at `8539b3f` | **PASS**, 15/15 steps, 38.4s | `01-green-after-fix.txt` |
| 2 | `8539b3f` **minus the receipt render** (the `<p class="wfme-pub__receipt">` block deleted from the final committed component, not from a draft) | **FAIL** at spec line 295, `.wfme-pub__receipt` resolved to 0 elements 24× | `02-red-when-receipt-render-removed.txt` |
| 3 | `8539b3f` with the render intact and the **condition** reverted (`publicationsForNotice(..., {})`) | **FAIL** at spec line 292, `.wfme-pub` not found | `03-red-when-condition-reverted.txt` |
| 4 | restored to `8539b3f` exactly (`git diff` over `pages components utils translations test` empty) | **PASS**, 25.7s — the artifact left committed is this run | `04-green-final.txt` |

Run 2 is the exit's mutation. Run 3 is the brief's claim that fixing the render without the condition
changes nothing, measured rather than repeated.

### What a person is actually shown

`artifacts/journeys/workforce-week-run/fixture/04-after-confirming-the-receipt-is-on-screen.png`:
heading **Vaktplanen er bekreftet**, the row, **Bekreftet mottatt 5. aug., 09:45.** in green, the
disclaimer that this is a receipt and not approval of the shifts, and no unread dot. The old capture
`04-after-confirming-the-notice-is-simply-gone.png` was **tracked**, so it was `git rm`'d in the same
commit rather than left behind asserting a state the product no longer produces.

## Suites

`TZ=Europe/Oslo npx jest` at `8539b3f`, with `core/` borrowed: **126 suites, 2974 tests, 0 failures.**

Without borrowing `core/`, 6 suites fail to *run* (`Configuration error`, empty submodule mount in a
lane worktree — `price-*`, `core-*`) with 0 test failures. That is the worktree, not this change: the
journey harness borrows `core/` for exactly this reason (`test/e2e/scripts/dev-server.js`). Borrowed
read-only from `/Users/svendaneel/okam/Web-modules/core` and released afterwards; `core/` is empty
again.

Lint: `eslint` clean on all six changed source files.

## Constraints

- **C5 — this is not acceptance.** Four browser runs against the in-repo fixture are a record that the
  code behaves, never evidence that a person completed the journey. **Nobody has walked this by hand.**
  The screenshot above is what Sven should be shown; his acceptance is the gate, not these runs.
- **C1/C2/C4** — untouched: no migration, no SQL, no append-only table, no money-path write. Frontend only.
- **C3** — no new service, route, page or flag; the repair makes an *existing* renderer reachable, which
  is the constraint's own direction of travel.
- **C6** — no statutory claim added or changed. The disclaimer already on screen ("kvittering på at du
  har sett planen … ikke en godkjenning") is preserved and now asserted in step 12.
- **C7** — no logging added.

## Left open, honestly

The receipt is **session-scoped**: after a reload the notice is gone, because `GET /workforce/me/inbox`
carries `isRead` and no acknowledgement field, and #44 has no GET sibling. Step 13 records this as a
`gap` finding rather than asserting it as a defect — closing it needs a worker-side read of the
acknowledgement, which is a backend change and not this surface's to invent. The pre-existing finding
that a **manager** cannot see who acknowledged a week is untouched and still recorded.

The three `browser error` findings in the artifact (two navigation-cancelled, one 409 from the R2
refusal) are present in the finding lane's own recording of this journey and are not from this change.
