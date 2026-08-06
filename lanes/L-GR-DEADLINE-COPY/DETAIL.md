# L-GR-DEADLINE-COPY — detail

Brief `82c11e98`. Commits: frontend `7a2c789` (feature/restaurant-modules), backend `3b42da1d`
(`lane/gr-deadline-onwire`, worktree `/Users/svendaneel/okam/wt-gr-deadline`).

## The four findings, each verified before it was changed

| # | Claim in the brief | Verified how | Verdict |
|---|---|---|---|
| 1 | `gp_due_unknown` misdiagnoses in all three locales | `readRow` sets `daysLeft: null` only when `toDate(item.dueAt)` is null (`utils/growth/privacy-queue.js:80,109`); `receivedAt` is parsed separately and printed by `gp_reference`. So the null case is «the response carried no deadline», and the receipt time is untouched by it. | REAL |
| 2 | Template comment asserts the inverse architecture | `git show 6b1412b -- pages/admin/growth-privacy.vue` changes ONLY the script comment at 252-261. The template comment at 30-33 is untouched and says the opposite. | REAL |
| 3 | `GrowthPrivacyDeadlineTests` overclaims | Computed both rules over all six rows (see below). Two agree. The summary was also backwards about what the second column holds. | REAL, and worse than stated |
| 4 | Locale guard greps one language | The loop read `translations.no` only. The old pattern `/adressen er slettet\|adressen ble slettet/i` returns false for `The address was deleted.` — checked. | REAL |

### Finding 3, computed rather than eyeballed

| receivedAt | + one calendar month (= the expected column) | + thirty days | |
|---|---|---|---|
| 2026-01-31 | 2026-02-28 | 2026-03-02 | discriminates |
| 2028-01-31 | 2028-02-29 | 2028-03-01 | discriminates |
| 2026-03-31 | 2026-04-30 | 2026-04-30 | **agrees** |
| 2026-12-31 | 2027-01-31 | 2027-01-30 | discriminates |
| 2026-01-15 | 2026-02-15 | 2026-02-14 | discriminates |
| 2026-05-31 | 2026-06-30 | 2026-06-30 | **agrees** |

Every expected column matches the calendar-month rule, so the summary's «the second column is what a
thirty-day window would have answered» was inverted as well as overclaimed.

## Changed

- `translations/{en,no,de}.ts` — `gp_due_unknown` rewritten, by hand, one key at a time. Names the
  cause (the service sent no deadline), says this page works none out, and tells the operator what to
  do meanwhile. No statute named, so no new C6 surface.
- `translations/{en,no,de}.ts` — the header comment above each `gp_*` block said the copy holds «a
  deadline we DERIVED from the receipt time rather than were told». Three more instances of the same
  stale claim, not in the brief; found while placing the key.
- `pages/admin/growth-privacy.vue:30-34` — template comment, inverted → corrected.
- `pages/admin/growth-privacy.vue` — `clockLabel`'s doc said «a deadline we could not derive». Also
  not in the brief; same claim, same commit missed it.
- `test/growth-privacy-page.test.js` — locale guard widened to three locales with controls; one new
  rendering test; one new copy test.
- `WebApi.Tests/Growth/GrowthPrivacyDeadlineTests.cs` — class summary, `ClampCases` summary, the 31
  May row comment, and the discriminator test's summary. Comments only; no assertion or expected
  value touched. `dotnet build WebApi.Tests` → 0 errors, no warning in this file.

## Left alone deliberately

- The three refusals (no address, no delivery, no destruction) and the four further candidates.
- The two viewer's-clock fixes (trunc-towards-zero, the `+ 0` negative-zero normalisation).
- `gp_deadline_note`. The Norwegian says the deadline «er regnet ut som én kalendermåned fra
  mottakstiden» — passive, and still true: the service computes it exactly that way. It asserts no
  location, so changing it would be editing a C6-scoped statutory sentence for no gain.
- `test/e2e/journeys/growth-privacy-queue.spec.js:124-127` — its comment already names `dueAt` as the
  server's answer. Correct as it stands.
- `test/e2e/fixture/world.js` — not touched, not read for edit; `git status` shows it unmodified.

## Mutation ledger

Each mutation applied to the working tree, suite run, file restored from a pristine copy held OUTSIDE
the repo (`scratchpad/pristine/`) and `cmp`-verified byte-exact. All nine killed exactly one test.

| # | Mutation | Killed |
|---|---|---|
| M1 | EN `gp_due_unknown` reverted to the old sentence | copy test |
| M2 | NO `gp_due_unknown` reverted | copy test |
| M3 | DE `gp_due_unknown` reverted | copy test |
| M4 | `privacy-queue`: local fallback `toDate(item.dueAt) \|\| toDate(item.receivedAt)` restored | rendering test |
| M5 | `The address was deleted.` injected into an English key | destruction guard |
| M6 | guard's key scan pointed at a prefix matching nothing | destruction guard |
| M7 | EN pattern narrowed until it no longer matches its own control | destruction guard |
| M8 | EN pattern widened until it fires on `gp_notice_notattempted`'s legitimate sentence | destruction guard |
| M9 | `v-if="row.dueAt"` dropped from the due fact | rendering test |

M1–M3 kill on separate lines of the same test, so no locale rides on another's assertion. M5 is the
one that proves finding 4: the old Norwegian-only guard returns false for that string.

## Suites

`npx jest` — 100 suites, 2323 tests, 0 failed (privacy page suite 25, was 23).
`npx eslint` on the five changed files — 0 errors; 3 pre-existing indent warnings at
`translations/*.ts:698/715`, ~4000 lines from any edit.
`dotnet build WebApi.Tests/WebApi.Tests.csproj` — 0 errors. The C# suite itself was not run: no SQL
slot in this brief, and the change is comment-only.

## Note for the plan, not fixed here

The brief's own point stands: with the backend half unmerged, `gp_due_unknown` prints on every open
row on the integration branch. It now prints a true sentence instead of a false one, but that is
mitigation, not a fix — the sequencing gap is its own lane.
