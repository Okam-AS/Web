# L-EV-OUTBOX-GUID-SUBSTRING — detail

Worktree: /Users/svendaneel/okam/wt-evoutboxguid
Branch: lane/ev-outbox-guid-substring, base feature/restaurant-modules 3579bbbc (local, not pushed)
Repo: OkamAPI-modules. Container-free tier only; no container started, none touched.

## 1. Verify first — the defect is real, and the brief's rate is overstated

`WebApi.Tests/Events/EventsOutboxDeliveryTests.cs` blob 62c0a61e is byte-identical on
`feature/restaurant-modules`, `integration/mig-stack-land`, `integration/confirm-family` and
`lane/meals-grace-pins`. The defect is present on all of them.

Shape confirmed exactly as briefed. `The_message_carries_the_link_and_no_other_guest_data` did
`Assert.DoesNotContain("250", body)` / `Assert.DoesNotContain("2000", body)` over the whole HTML body,
which contains `https://guest.example.test/events/proposal/<PublicToken:D>` — 32 random hex digits.
Nothing else in the body carries a digit.

Measured with a throwaway probe that composed 200,000 real bodies through the real
`EventsEmailNotificationDelivery`, each with a fresh `Guid.NewGuid()` token:

    runs=200000  hit250=963  hit2000=49  hitEither=1012   -> 1 in 197.6
    first example token: 74ed9e07-f792-488f-9d1b-077a2ce7d250

**The brief says "roughly once in a hundred and thirty runs"; the measured rate is 1 in ~198.** That
matches the arithmetic: 22 three-char windows inside a `D`-format GUID at 16^-3 plus 17 four-char
windows at 16^-4 = 1/177. Still a merge-reddener, ~1.5x rarer than briefed.

Sweep for the same shape elsewhere: `grep 'DoesNotContain("[0-9+]{2,6}"'` finds five other sites
(Tripletex x4, Workforce rate authoring x1). All scan either a `List<string>` of account numbers
(equality, not substring) or a fixed problem-detail string. None can match inside a random identifier.
Only this one had the defect.

## 2. The fix

One test file, `WebApi.Tests/Events/EventsOutboxDeliveryTests.cs`. No production code changed.

`AssertNoGuestDataBeyondTheLink(body, publicToken)` replaces the expected token with the digit-free
placeholder `[link-token]` and runs the absence checks over the remainder. Only the token is masked,
not the whole link — an amount planted anywhere else in the URL still fails.

Three things keep this from being a weakening:

- **A stray-identifier guard.** Masking one known value is sound only while it is the body's only
  random text, so any other identifier-shaped run in the masked body is itself a failure. Without
  this, a future second token would silently reopen the same hole.
- **Amounts derived, not spelled.** The checks use `DepositRequiredMinor / 100` and
  `MinimumSpendMinor / 100` rather than the literals "250"/"2000", and the main test now pins that the
  seeded proposal really carries those amounts (`Assert.Equal(250_00, version.DepositRequiredMinor)`).
  A fixture that changed the amounts used to leave the check hunting for digits no leak could produce.
  The major-form check also covers the minor rendering, since 25000 and 200000 begin with them.
- **A negative-control theory** asserting the check still THROWS for every refused value planted
  outside the token, including in a body whose token spells both amounts.

## 3. Proof

**Deterministic, not lucky.** `A_link_token_that_spells_an_amount_is_not_read_as_a_leaked_amount` is a
6-case theory over tokens drawn to contain the digits in each GUID segment, plus the real token the
measurement drew (`74ed9e07-...-077a2ce7d250`). Bodies are composed by the real
`EventsEmailNotificationDelivery.DeliverAsync`.

**Mutation 1 — revert the identifier-aware form** (scan the raw `body` instead of `scanned`):

    Failed: 6, Passed: 23, Total: 29
    all six seeded-token cases red

**Mutation 2 — remove the two amount checks** (the "make it deterministic by checking less" failure
mode the brief forbids):

    Failed: 4, Passed: 25, Total: 29
    The_guest_data_check_still_fails_a_leak_that_is_outside_the_token: "250" "2000" "25000" "200000" all red

Both mutations recompiled (assembly mtime > source mtime checked each time; no `--no-build` was used
for a mutation run).

**Random-token sweep against the FIXED assertion**, same 200,000-body probe, now calling
`AssertNoGuestDataBeyondTheLink`:

    runs=200000  failures=0  first=none

versus 1,012 before. Both probes were throwaway and are not in the commit.

**Repeated runs.** `EventsOutboxDeliveryTests` run 40 consecutive times: 40/40 Passed, 29/29 each.
See `.lane/repeat-runs.txt`.

## 4. Tier

    base  3579bbbc clean checkout: 4369 passed / 0 failed / 12 skipped / 4381   .lane/base-3579bbbc.trx
    after lane head:               4383 passed / 0 failed / 12 skipped / 4395   .lane/after-lane.trx

+14 tests, +14 passing, 0 failing — exactly the 6 + 7 + 1 cases added. Filter `Database!=SqlServer`
both times. The base number matches the 4369/0/12 other lanes have recorded for 3579bbbc.

The wire tier dirtied `artifacts/journeys/ev-dietary/run-sheet.json` and `run-sheet.md` as warned;
both restored with `git checkout --`, neither committed.

## 5. Constraints

- C1 untouched: no table is written, backfilled or repaired. The seeded tokens are set on detached
  entity objects that are never attached to a context or saved.
- C7 clear: every value in the fixture is synthetic (`example.test`, `+4790000000`, a made-up name)
  and already present in the file before this lane.
- No migration authored. No container started. No push. Committed by pathspec.
