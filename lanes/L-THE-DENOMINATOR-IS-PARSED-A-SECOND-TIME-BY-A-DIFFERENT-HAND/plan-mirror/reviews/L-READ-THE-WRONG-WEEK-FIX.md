# Review — L-READ-THE-WRONG-WEEK-FIX

Lane under review: `lane/the-acknowledge-button-cannot-confirm-the-wrong-week` at `acafde6`
(one commit on trunk `6b98839`; diff = 7 files: `utils/workforce-me/inbox-filter.js`,
`components/admin/workforce-me/WorkforcePublicationNotice.vue`, two test files, three translation
files). Reviewer worktree stood up at `acafde6` with `core` pinned to `9626a561`, torn down after.

## VERDICT: CLEAN — land it

One factual correction to the evidence (M1 reds nine, not eight — safe direction), two named
orderings the fix does not stabilise (one latent in-code, one inherent to newest-first), both
non-blocking. The design call holds. Both residuals are correctly scoped. Details and the exact
changes named below.

## 1. The before arm — verified by state, independently

I re-read the manager's own recipients endpoint (`GET /workforce/stores/1/schedules/publications/
{id}/recipients`, manager token from the program scratchpad, live API :5971 — connected as a client,
nothing bound, nothing restarted):

| publication | seenAtUtc | acknowledgedAtUtc |
|---|---|---|
| `0dc2e2c3` (week B) | 2026-08-07T16:02:28.188382 | 2026-08-07T16:02:28.188382 |
| `74de15a1` (week A) | 2026-08-07T16:02:29.778514 | 2026-08-07T16:02:29.778514 |

Both before-arm publications carry `acknowledgedAtUtc`, to the microsecond the evidence claims.
`before-walk.json` shows the wire truth: press1 POSTed to `0dc2e2c3` (`alreadyAcknowledged:false`),
press2 POSTed to `74de15a1` (`alreadyAcknowledged:false`) — two different weeks confirmed by two
presses performed as one act, zero error toasts. Claim 1 VERIFIED.

## 2. The after arm — verified by state, including the half that matters most

Same endpoint, same independent read:

| publication | seenAtUtc | acknowledgedAtUtc |
|---|---|---|
| `cf05ec7d` (week D) | 2026-08-07T16:09:40.292264 | 2026-08-07T16:09:40.292264 |
| `fb618f71` (week C) | **null** | **null** |

`after-walk.json`: both presses POSTed to `cf05ec7d`; the second answered
`alreadyAcknowledged: TRUE`; `acknowledgementPostsMade = 2`, `pressedTheSamePublicationTwice = true`.
The untouched week C keeps its unread dot, a null receipt, and **its own live `Bekreft mottatt`
button** (`afterPress2.rows[1]`, and `after-2/3-*.png`) — and the walk deliberately left C unconfirmed
in the live world, so the act remains performable. The fix did NOT make the second week unconfirmable;
a worker rostered on both weeks confirms the second by pressing its own row. Claim 2 VERIFIED, both
halves.

## 3. The mutations — all eight re-applied by me

Reconstructed from their descriptions in my own worktree at `acafde6`, one at a time, suites
(`test/workforce-me-inbox-filter.test.js` + `test/workforce-me-components.test.js`, 53 tests)
restored to green between each. M1 was `git show 6b98839:utils/workforce-me/inbox-filter.js` — the
trunk's own file, byte-identical, the strongest form.

| mutation | claimed reds | observed | verdict |
|---|---|---|---|
| M1 trunk ordering restored | 8 | **9** | MIS-STATED by one, safe direction |
| M2 no client ordering on reported rows | 4 | 4 | exact |
| M3 tie-break removed | 1 | 1 | exact |
| M4 bare stamp read as local | 1 | 1 | exact |
| M5 unreadable instant sorts first | 1 | 1 | exact |
| M6 carried rows left in object order | 1 | 1 | exact |
| M7 every control reads the same again | 2 | 2 | exact |
| M8 wording keyed on isRead | 1 | 1 | exact |

M1 reds all EIGHT new ordering cases — including both exit-criterion cases (*the control at the top
addresses the same publication before and after a press*, *a second press at the top would replay*) —
**plus the inverted case** *the kept row is carried once, and stays where it was*, which the lane's
table apparently forgot to count. No mutation under-kills; no test in the twelve is red under none
(M1 covers the nine filter cases, M7 two component cases, M8 the third). The union claim "all twelve
red under one" holds. The count "8" in evidence §6 is wrong by one in the direction that strengthens
the fix.

Tier at tip, my run: **166 suites / 3950 tests / 0 failed, exit 0**, no abort/segfault/kill line
above the summary. Trunk is 166/3939/0, so +11 tests, no new suite — matches. ESLint clean on all
four touched source/test files. Worktree diff-free after restore.

## 4. Is the reorder the whole mechanism? Yes in-session — with two orderings named

Confirmed the claimed mechanism is real and was the operative one: `noticePublicationItems` is the
only feed into the notice; `v-for :key="item.inboxItemId"` hands the handler the row's own item (no
mis-delivered press); the page has **no poll** (the only timer is a toast `setTimeout`); the
handler's `loadInbox()` refetch was only dangerous through the sort key, which the fix removes. A
wholesale failed refetch nulls the inbox, so only carried rows render and no other week is on screen
to mis-press.

Two orderings the fix does **not** stabilise:

1. **The concat seam (latent, in the fix's own code).** A row confirmed this session that a
   *successful* re-read no longer reports is appended after ALL reported rows
   (`return shown.concat(noticeOrder(missing))`) instead of merged. My probe test: before press
   `['newer','older']`; press `newer`, re-read reports only `older` → `['older','newer']` — the
   confirmed row drops to the bottom and the other week rises into the pressed position, the
   defect's exact shape. Unreachable today: `WorkforceSelfService.GetInboxAsync`
   (OkamAPI-restaurant-control, lines 199–202) returns every inbox row for active engagements — no
   read filter, no window, no Take — so a successful re-read cannot omit a row unless an engagement
   deactivates between presses or a future backend adds inbox trimming. The code's own comment
   ("position is a function of the ROW SET and of nothing else") overstates: position is currently a
   function of the row set AND of whether the server reported each row. **Exact change, when taken:**
   in `publicationsForNotice`, replace the final line with one merged ordering —
   `return noticeOrder(shown.concat(missing));` — and add the mixed carried+reported case to the
   ordering tests. Do not fix in this lane's landing; it is a named follow-up, not a defect any
   caller can reach.
2. **Newest-first puts a NEW arrival in the pressed position.** A publication published between the
   two presses enters the refetched list at the top wearing `Bekreft mottatt`. This is a row-set
   change, not a reorder — no ordering avoids all movement when the set changes — but newest-first
   specifically inserts the new week exactly where the finger is. Mitigated by the label (the
   confirmed row alone reads `Bekreft på nytt`); requires a manager publishing within the seconds
   between presses. Named for the record, not actionable against this fix.

A third vector, **reload**, re-targets by resetting `ackItems`: the confirmed row leaves the notice
and the remaining unread week becomes the top row reading `Bekreft mottatt`. That is the sibling
flag `F-THE-ACKNOWLEDGEMENT-RECEIPT-IS-ONLY-PAGE-STATE`, correctly attributed by the lane. The
deeper gap underneath all three vectors: **a row never names the week it confirms** — rows render
only `Kom {arrival}`, and in both recorded walks the two rows' labels were identical to the minute.
Week identity on the row (or in the pressed affordance) is the disambiguation that would close the
human side of every vector at once. Out of this lane's scope; worth a flag of its own.

## 5. The design call — re-target over refuse HOLDS

The lane's reasoning is correct on both grounds and on a third it implies: (a) any refusal keyed on
"something was confirmed this session" blocks the legitimate FIRST confirmation of the second week
for a worker rostered on both — the very world this defect lives in; (b) dropping or disabling the
control on a confirmed row deletes the idempotent-replay caller that a landed test pins (*the
acknowledge button stays, so the idempotent replay has a caller*); (c) a handler-level guard would
have been theatre, since every press genuinely targets the row it sits on. Refusal prevents the
accident by preventing a legitimate act; re-targeting removes the accident and keeps the act. The
right complement is disambiguation, which the label provides in weak (session-scoped) form.

## 6. The residuals — both correctly scoped, one under-described

- **The lede.** Correctly left, with one thing the evidence does not say: the fix itself created the
  visible adjacency. Pre-fix the confirmed row sank to the bottom, so *"Du har ikke åpnet denne
  ennå"* sat above unread rows (true); post-fix a confirmed newest row sits directly beneath it
  (`after-2-after-first-press.png`). It cannot cause a wrong acknowledgement — the stable order and
  the label stand between it and any write — but it is a false claim above a row that disproves it,
  introduced by this reorder. Should carry its own flag; not a landing blocker.
- **The e2e refusal.** RIGHT. `workforce-week-run-two-humans.spec.js` publishes one week and stands
  its world up via `live-world.sh`, which restarts servers the lane's brief forbade; shipping an
  unrun rewrite of the estate's only two-human e2e pin would be an unfalsifiable test — the exact
  failure shape this estate keeps paying for, inverted. The regression pin (eight ordering cases +
  M1) plus the recorded walks and `build-world.py` make the future rewrite mechanical. The gap — no
  e2e pin holds two unread publications — must be tracked as a follow-up, and the lane says so.

## 7. Constraints and handoff

C1 all four acknowledgements went through the documented POST append path by the recipient herself
(the before-arm pair is the negative control and cannot exist without being written); C2 no backend
or migration change; C3 the page is sidebar-linked and was walked; C4 no money-path write; C5 both
arms walked by a person in a browser, diff left applied for Sven; C6 disclaimer untouched; C7 no
token or code in the lane directory or artifacts (note: `build-world.py` read `mgr.token` from the
lane directory itself at build time — inside the repo tree, untracked, since removed, never
committed or logged; the "outside the repository" phrasing in evidence §7 is strictly accurate only
for `walk.js`). `web-livewalk` verified read-only: detached at `6b98839`, exactly the five files
modified, each byte-identical to the `acafde6` blobs — the owner walks precisely what would land.

## Reviewer hygiene

Worktree `scratchpad/wt-ackreview` created at `acafde6` (core pinned `9626a561`, node_modules
symlinked, no install), used for the tier, the eight mutations and the seam probe, then `rm -rf` +
`git worktree prune` — REMOVED; `git worktree list` carries no trace. `web-livewalk` untouched
(reads only). No port bound, no container touched, no `pkill`, no push, no lane file edited.
