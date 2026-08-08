# L-A-WORKER-SEES-WHAT-SHE-CONFIRMED — pressing Bekreft stops showing nothing at all

brief 29d08ee0 · exit: *a worker who acknowledges a published week is shown the receipt, pinned by the
workforce week-run journey rather than by a component test*

## What was branched from

- Frontend trunk **`00d84d7`** ("Land lane/the-guard-stops-crashing-on-the-case-it-guards…"), read fresh.
  Branch `lane/a-worker-sees-what-she-confirmed`, worktree `/Users/svendaneel/okam/web-ackseen`,
  `core` submodule at `9626a561bb0442b0aed026be75b7f9419337ac6d` (matches the trunk gitlink).
- The owner checkout is on `wip/session-2026-08-06-all-work` (`0c1e4f9`), which is **not** a descendant of
  `00d84d7`. Nothing was branched from it and nothing in it was touched.
- Backend trunk **`9fb057d00`** read and confirmed present in `OkamAPI-modules`. **No backend change** was
  made, so no backend tier was run. (The `OkamAPI-modules` working tree is on
  `wip/rescue-2026-08-06-open-shifts-lineage` @ `5243c06a7` and was left alone.)

## The defect, and why the fix is not a render

`acknowledge()` stored the receipt in `ackReceipts` and then reloaded the inbox. Acknowledging **implies
seen**, so the row came back `isRead: true`, `unreadPublications()` dropped it, and
`WorkforcePublicationNotice`'s `v-if="items && items.length"` took the whole section away — with the
receipt line, which is rendered **on** that row. The receipt renderer needed a row that was **both unread
and acknowledged**, and the product cannot produce one: the act that fills `receipts` is the act that
makes the row read. No template change could have fixed it.

The repair is in what the page **feeds** the notice. `publicationsForNotice(items, acknowledged)` keeps a
row this session acknowledged — preferring the server's copy (which now says `isRead: true`) and falling
back to the row as it was pressed, so a failed inbox re-read cannot take the receipt with it. The notice
then stops calling that row new: the heading, the lede, the unread dot and the mark-as-read button all go
with the unread state they were claims about.

## The pin is the journey, not a component test

`test/e2e/journeys/workforce-week-run-two-humans.spec.js` — the week-run journey — asserted the absence
on purpose so that repairing it would red the walk. **That step is inverted rather than deleted** and
keeps the mechanism it used to pin. It now asserts, on the worker's own screen:

- the notice is still visible after the press, with exactly one row;
- `.wfme-pub__receipt` exists once, contains `Bekreftet mottatt`, and carries a clock (`/\d{2}:\d{2}/`);
- the title is `Vaktplanen er bekreftet`, and the lede and the unread dot are gone;
- the disclaimer is on screen with the receipt, so this is still not called approval of the roster;
- no error toast.

Two assertions **before** the press (`title = 'Ny vaktplan publisert'`, `receiptCount = 0`) were added so
the four claims above are a change this step caused rather than a state the page happened to be in.

A **new** step follows it: the idempotent replay, which was unreachable while the first press removed the
button that calls it. It presses again, reads `alreadyAcknowledged: true` off the #44 response, and
asserts the notice says `Allerede bekreftet`.

The journey's header section is rewritten from *"one defect this walk routes around"* to what it now pins,
and the finding it records changes from a `defect` to the `gap` that is still true: the receipt is page
state, `GET /workforce/me/inbox` carries no acknowledgement field and #44 has no GET sibling, so a worker
who reloads cannot re-read what she confirmed. That is a sibling lane's exit, not this one's.

## Walked live, both arms, same publication, two humans

Web `:3971` (`web-livewalk`, whose three source files were **byte-identical to `00d84d7`** before this
lane touched them), API `:5971`. Nothing was restarted, no port was bound, no container was touched. The
walk drove its own chromium — `walk.js` in this directory; raw results in `before-walk.json` /
`after-walk.json`; screenshots alongside.

Publication `0d8ef70d-02bd-4583-9044-b32ae12bce75` has three recipients. Two of them have accounts, and
they are the two humans the journey is about:

**ARM `before` — the defect, live, on unmodified trunk code.** Manager Ingrid Moen
(`6ba6dd27-…`, `99681931`) had two unread publications. She pressed `Bekreft mottatt`; the write landed
(`200`, `alreadyAcknowledged: false`, `occurredAtUtc 2026-08-07T11:57:33Z`). Then:

    after.receiptCount = 0      after.anyToastCount = 0     after.errorToastCount = 0

She pressed again — which reached the *other* publication, not a replay — and acknowledged a second week,
still with a receipt count of 0. **Two acknowledgements written, nothing on screen either time.**
`before-3-after-replay.png` is her final screen: no notice, no receipt, no toast.

**ARM `after` — the fix, live.** The three source files and one translation key were applied into
`web-livewalk` and picked up by HMR (no restart). Worker Astrid Vik (`b719056b-…`, `99999999`) — a
**different** account, which is the journey's own premise — pressed `Bekreft mottatt`:

    before.title = "Ny vaktplan publisert"   before.receiptCount = 0
    press.status = 200   press.alreadyAcknowledged = false
    after.noticeCount = 1        after.itemCount = 1
    after.receiptCount = 1       after.receiptText = "Bekreftet mottatt 7. aug., 13:58."
    after.title = "Vaktplanen er bekreftet"
    after.ledeCount = 0          after.dotCount = 0      after.markReadButtonCount = 0
    after.disclaimerVisible = true                       after.errorToastCount = 0
    replay.buttonCount = 1  replay.status = 200  replay.alreadyAcknowledged = true
    replay.receiptText = "Allerede bekreftet 7. aug., 13:58."

`after-2-after-press.png` is the screen the exit criterion asks for. Every assertion the inverted journey
step and the new replay step make is satisfied by these two arms.

## Tier and delta

`TZ=Europe/Oslo npx jest` in the lane worktree: **164 suites / 3889 tests / 0 failed**. Trunk was
**164 / 3874 / 0**, so the delta is **+15 tests and no new suite** — both new `describe` blocks went into
files that already existed.

Nine in `test/workforce-me-inbox-filter.test.js` (*an acknowledged publication stays on screen with its
receipt*): an acknowledged row is kept even though acknowledging marked it read · a read row nobody
acknowledged is still dropped · with nothing acknowledged it is exactly the unread list · the receipt
survives an inbox re-read that failed · an acknowledged row the server stops reporting is not lost · the
kept row is appended once, after what is still unread · a row the server has NOT marked read is kept once,
in its unread position · the row carried forward is the SERVER's, so it reports itself as read · not
loaded with nothing acknowledged is still null, never an empty inbox.

Six in `test/workforce-me-components.test.js` (*WorkforcePublicationNotice stops calling a confirmed row
new*): an acknowledged row still renders its receipt · the heading names the confirmation rather than
announcing a new plan · "you have not opened this yet" is withheld once nothing is unread · the unread dot
and the mark-as-read button go with the unread state · the acknowledge button stays, so the idempotent
replay has a caller · the count in the heading is the unread ones, not the ones on screen.

## Every new test red under a mutation actually applied

Seven mutations were written into the source, run, and reverted. All fifteen new tests are covered.

| mutation | applied to | reds |
|---|---|---|
| M1 acknowledged rows no longer kept (`ids.forEach` → `[].forEach`) | inbox-filter.js | 5 |
| M2 `unreadPublications` widened to `state: 'all'` | inbox-filter.js | 3 (2 new) |
| M3 the dedupe guard removed | inbox-filter.js | 1 |
| M4 not-loaded collapses to `[]` instead of `null` | inbox-filter.js | 1 |
| C1 heading always announces a new plan | Notice.vue | 1 |
| C2 lede unconditional again | Notice.vue | 1 |
| C3 unread dot / mark-read unconditional again | Notice.vue | 1 |
| C4 heading counts the rows on screen, not the unread ones | Notice.vue | 1 |
| C5 receipt renders only for an unread row (the original contradiction) | Notice.vue | 1 |
| C6 acknowledge button goes with the unread state too | Notice.vue | 1 |

Distinct tests red: **15 of 15**. The tree was restored from byte copies taken before the first mutation
and the full tier re-run green afterwards; `git diff` carries no mutation residue.

The **journey** step's own mutation is ARM `before` above: the identical selectors, driven against the
identical code path with the fix absent, produce `receiptCount = 0` and no toast.

## Constraints

- **C1** — no UPDATE or DELETE against an append-only table. The two acknowledgements written during the
  walk went through `POST /workforce/me/publications/{id}/acknowledgements`, the documented append path,
  by the recipients themselves; the replay answered `alreadyAcknowledged: true` and wrote no second row.
- **C2** — no migration, no `OnModelCreating` change.
- **C3** — the change is reachable and was reached: it is on a page the sidebar already links to, wired
  through the page's own `noticePublicationItems`, and walked in a browser by two real accounts.
- **C4** — no money-path write.
- **C5** — the exit is a person completing the journey. Both arms were walked in a browser against the
  live world; the suite result is reported as a tier, never as the reason the capability exists. The fix
  is **left applied in `web-livewalk`** so Sven can walk it himself (see below).
- **C6** — no statutory claim added or changed. The `Bekreftelsen er ikke en godkjenning av vaktene`
  disclaimer is untouched and is now asserted to be on screen *with* the receipt.
- **C7** — no credential in any log, artifact, screenshot or JSON here. The demo/power-user codes are in
  the plan's own brief and are not reproduced in the walk output.

## State the owner's world was left in

`web-livewalk` **carries this lane's diff, applied via HMR, unrestarted** — four files:
`components/admin/workforce-me/WorkforcePublicationNotice.vue`, `pages/admin/workforce-me.vue`,
`utils/workforce-me/inbox-filter.js`, and one inserted line in each of `translations/{no,en,de}.ts`.

That tree already carried **another lane's uncommitted diff** (`TrainingEvidenceDocument.vue`,
`training-evidence.vue`, and edits inside the same three translation files). It was **not** clobbered: the
three source files were copied, and the translation key was inserted next to its neighbour by line rather
than by copying the file. Undo for this lane's part only:

    git -C ~/okam/web-livewalk checkout -- components/admin/workforce-me pages/admin/workforce-me.vue utils/workforce-me
    # then delete the three `wfme_pub_title_confirmed:` lines from translations/{no,en,de}.ts by hand —
    # `git checkout -- translations` would also discard the training lane's uncommitted work.

Nothing else was touched: `:3971` and `:5971` were never bound, nothing was restarted or killed, no
container was started or stopped, and no `npm install` was run (the lane worktree symlinks the owner's
`node_modules`).
