# L-LAND-THE-EVENING-WORK — evidence

## What reached the trunk

| repo | trunk before | trunk after | merged |
|---|---|---|---|
| Web-modules | `6b98839` | `7a378e4` | `lane/the-guest-exit-is-finished` @ `fe9fccd` |
| OkamAPI-modules | `81d06c10a` | `057c390ad` | `lane/the-guest-exit-is-finished` @ `a65d9ab70` |
| Web-modules | `7a378e4` | `78ed84f` | `lane/the-acknowledge-button-cannot-confirm-the-wrong-week` @ `acafde6` |

All three are `--no-ff` merges. Nothing pushed; every branch remains local.

The wrong-week fix was held at first: `L-READ-THE-WRONG-WEEK-FIX` read `state: running` with no return
file, which the brief names the expected outcome, so the guest-exit pair landed alone and the tier was
recorded at `7a378e4`. The review then returned **CLEAN — land it**, and the coordinator cleared it
during this lane. It was merged onto the already-advanced trunk, and the frontend tier was re-run at
`78ed84f`. Both frontend tier results are kept, because the second is only interpretable against the
first.

## Conflicts

**Zero textual conflicts.** `git merge --no-ff --no-commit` reported *Automatic merge went well* in both
repos. Only one file was touched on both sides since the merge-base — `Services/Growth/GrowthNewsletterService.cs`
— and git combined the two hunks correctly: the trunk's non-empty-body refusal (`GrowthNewsletterBody.Inspect`
plus its two fault-message helpers, from `2b926adab`) and the lane's widened `AppendHtml`/`AppendPlainText`
call on the test-send path both survive in the merged file. Verified by diffing the result against each
side separately, not by reading the merge output.

**One semantic conflict git could not see, and it did not compile.**

`WebApi.Tests/Growth/GrowthNewsletterBodyTests.cs` is a trunk-only file (added by the newsletter-refusal
lane). `Services/Growth/GrowthMarketingFooter.cs` is a lane-only file, and the lane widened

```
AppendHtml(string htmlBody, string preferenceCentreUri)
  -> AppendHtml(string htmlBody, string preferenceCentreUri, string unsubscribePageUri)
```

with **no default value** on the new parameter. Because neither side touched the other's file, git had
nothing to conflict on — and the merged tree had two 2-argument call sites (lines 181 and 192) against a
3-argument method. This is the failure mode a clean merge output actively hides; it was found by grepping
every call site's arity after the merge and confirmed by `dotnet build` (2 × CS7036 before the fix).

The wrong-week merge had **no conflict of either kind**. It touches four files in
`components/admin/workforce-me/`, `utils/workforce-me/`, `test/` and `translations/`, none of which the
guest-exit pair touches, and it changes no exported signature — `arrivedAt` and `noticeOrder` are new
module-private helpers behind the existing `publicationsForNotice`. The one added translation key,
`wfme_pub_acknowledge_again`, was checked for a collision in all three of `no.ts`/`en.ts`/`de.ts` (none,
and no duplicate key anywhere in those files after the merge) because a duplicate key in a translations
file is a defect this estate has already had a lane for.

Resolved by passing a real unsubscribe URI rather than `null`. `null` also compiles, and it was the
smaller edit, but it renders the *test-send stand-in notice* instead of a live link — and the test is
named `The_refused_body_really_does_swallow_the_footer_the_dispatcher_appends`, while the dispatcher
(`GrowthDispatchService.cs:522`) passes both links. Passing `null` would have quietly converted an arm
the trunk lane had just landed into one that measures a footer the dispatcher never emits. No assertion
was added, removed or changed. After the fix: `0 Error(s)`.

## Tiers at the new tips

**Backend** — `suites/backend-tier.txt`. Run from `WebApi.Tests/` with `--filter "Database!=SqlServer"`,
exit 0, no abort line above the summary, no `Failed <FQN>` line.

```
Passed! - Failed: 0, Passed: 4949, Skipped: 11, Total: 4960
baseline 81d06c10a:      0 /       4937 /      10 /       4947
delta                   +0        +12          +1         +13
```

Every test accounted for:

- **+12 passed**, all from the lane, none from the merge fix:
  - 4 in `WebApi.Tests/Wire/GrowthOneClickUnsubscribeWireTests.cs` — `A_browser_GET_on_the_one_click_uri_redirects_to_the_unsubscribe_page_instead_of_405`, `The_browser_GET_changes_nothing_which_is_what_makes_it_safe_against_mail_scanners`, `A_browser_GET_with_no_token_lands_on_the_bare_page_rather_than_a_dead_end`, `The_GET_landing_never_writes_the_token_to_a_log_sink`.
  - 8 in the new `WebApi.Tests/Growth/GrowthUnsubscribeExitReachabilityTests.cs` — 5 `[Fact]` plus one `[Theory]` with 3 `[InlineData]` (the non-https redirect bases: downgraded scheme, no scheme, protocol-relative).
- **+1 skipped**: `GrowthGuestExitWorldTests.The_guest_exit_world_serves_the_real_api_on_its_own_origin_until_a_browser_has_walked_it`, a `[SkippableFact]` in the lane's new `GrowthGuestExitWorld.cs` that `Skip.If`s itself when no run directory is set. The other 10 skips are byte-identical to the baseline list and to the list the lane recorded at `a65d9ab70`.

**Frontend** — `suites/frontend-jest.txt`. `npx jest --ci`, exit 0, no `FAIL` line, no suite that failed
to run, at both tips.

```
7a378e4  guest exit only     166 suites / 3939 passed / 0
78ed84f  + the wrong-week fix 166 suites / 3950 passed / 0
baseline 6b98839:            166 suites / 3939 passed / 0
```

The guest exit's frontend half adds no jest test, and the count at `7a378e4` confirms the lane's claim:
it is a Playwright config, a Playwright spec, two e2e scripts, the lane evidence directories, and a
comment-only rewrite of the header block in `pages/preferences/unsubscribe.vue` (verified by reading the
staged diff — no executable line changed). jest runs none of those.

The wrong-week fix is **+11 tests and no new suite**, which is what the lane and the reviewer both
recorded at `acafde6`. Reproduced from the diff rather than taken on trust:

- `test/workforce-me-inbox-filter.test.js` — 9 `test(` added, 1 removed, net **+8**. The removed one is a
  rename in place: *the kept row is appended once, after what is still unread* became *the kept row is
  carried once, and stays where it was*, because the fix changed what that row's position must be.
- `test/workforce-me-components.test.js` — 3 `test(` added, none removed, net **+3**.

8 + 3 = 11, matching 3939 → 3950 with no suite count change.

The `core` submodule was pinned before the run. `git submodule update --init core` fails as documented
(*not our ref*), so it was completed from inside `core` with
`git -c protocol.file.allow=always fetch /Users/svendaneel/okam/Web-modules/core 9626a561bb0442b0aed026be75b7f9419337ac6d`
and a checkout of that SHA. Without the pin the tier would have reported failing suites with zero tests red.

## The deploy-ordering constraint still stands

`F-LANDING-THE-BACKEND-HALF-FIRST-BREAKS-A-7-3-PROMISE-ON-EVERY-SEND` is not discharged by this landing
and was never a reason to refuse it. `UnsubscribePageBaseUrl` is printed into the footer of every
dispatched message (`GrowthDispatchService.cs:490` → `GrowthMarketingFooter.AppendHtml`), so the consumer
surface carrying `pages/preferences/unsubscribe.vue` must be deployed **before or with** the backend, or
mail already sent carries a link to a page that is not there. The trunk is not a deployment and both
halves landed in the same pass, so nothing is exposed now — **the constraint binds at deploy time**, and
is the deployer's to honour. The lane's own return also records that Growth is absent from every deploy
branch today (`D-PREFCENTRE-DEPLOY`), so neither half is live.

## Worktrees

Created and removed by this lane:

- `/Users/svendaneel/okam/Web-modules-wt/L-LAND-THE-EVENING-WORK`
- `/Users/svendaneel/okam/OkamAPI-modules-wt/L-LAND-THE-EVENING-WORK`

Both were detached off `feature/restaurant-modules` first, so the trunk ref was free before teardown;
then `rm -rf` plus `git worktree prune` in each repo. No worktree in either repo now holds the trunk
branch. `web-livewalk` was not touched — it carries the wrong-week lane's diff for its owner to walk.
No container was started, nothing was pushed, and `:3971`/`:5971` were never bound.

## Carried forward from the review, recorded but deliberately not acted on

The reviewer's verdict was CLEAN — land it, and named three things that are **not** blockers. The
coordinator is flagging them; this lane did not fix any of them, and the merge is `acafde6` unaltered.

1. A latent second ordering — a confirmed row that a successful re-read omits is appended after the
   reported rows. Unreachable today: `GetInboxAsync` returns every row for active engagements, and a
   failed re-read nulls the inbox.
2. The section-lede adjacency was **introduced by this reorder** — a confirmed row now sits under
   *Du har ikke åpnet denne ennå*.
3. No two-publication e2e pin exists; the reviewer agreed the lane was right to refuse rewriting that
   journey without a world it was forbidden to stand up.

One correction the reviewer made to the lane's own numbers, which does not change the landing: **M1 reds
nine tests, not the eight the lane claimed**. The inverted case also reds. The mis-count is in the safe
direction and the union of the eight mutations still covers all twelve new-or-changed tests.

## Reverts

```
git -C /Users/svendaneel/okam/Web-modules     branch -f feature/restaurant-modules 6b98839
git -C /Users/svendaneel/okam/OkamAPI-modules branch -f feature/restaurant-modules 81d06c10a
```

To drop only the wrong-week fix and keep the guest-exit pair, reset the frontend to `7a378e4` instead.
