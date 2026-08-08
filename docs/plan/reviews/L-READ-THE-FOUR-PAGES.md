# L-READ-THE-FOUR-PAGES — the third instance of the thrice-found defect, read by someone who did not fix it

Review of `lane/the-last-four-pages-resume-after-sign-in` at `4622bb6` (one commit over trunk
`00d84d7`), against reviewer finding G1 in `docs/plan/reviews/L-READ-THE-UNREVIEWED-FRONTEND.md`
and the landed precedent `894a3b9`. Method: every claim re-measured, not re-read. All runs in a
dedicated detached worktree at `4622bb6` (core submodule at `9626a561`, fetched locally per the
safe order), every mutation applied alone and restored, `git status` clean between steps. The
branch itself was never checked out, moved, or written.

**VERDICT: CLEAN. Land it.** No page's starter falls short of a fresh mount, no recorded mutation
fails to red, the widened scan cannot go quiet on the five pages it names, the `wrapped.vue`
exclusion is factually and causally grounded, and the buble substitution renders identically in
both worlds. The fix does not repeat the assertion shape that let this class through twice: every
assertion in the new suite is on state and screen text, and I broke the fix four ways to check.
Non-blocking observations O1–O4 below. C5 remains deliberately unmet and the commit says so —
acceptance stays with Sven walking the journey named in the commit message.

## Claim 1 — the privilege bounce moved into the starter: TRUE, and it is not asked twice

Read on all four pages and on the shell, then exercised by suite.

- All four `mounted` hooks now hold exactly one question (`userIsLoggedIn` early-return) and one
  call (the starter). The KAM/PowerUser bounce is the first statement of each starter.
- The commit's "asked once, before anyone answers who are you, and never again" is literally right
  for the counterfactual: the old bounce sat in `mounted` *below* the who-are-you early-return, so
  for the in-page sign-in cohort it was never asked at all until reload — and `kam.vue`'s
  in-file comment nails the mechanism (`currentUser?.isPowerUser` is `undefined` for a visitor
  nobody has met).
- Not asked twice: `AdminPage` emits `login-success` **only** from `closeLoginModal` when the
  redirect target is the page the visitor is already on (or absent) — never at mount, never for an
  already-signed-in visitor, and the different-page redirect branch **navigates** instead of
  emitting (target page's own `mounted` runs its starter; the abandoned page's never does). So on
  every path the starter — and the bounce inside it — runs exactly once per identity answer:
  signed-in mount → `mounted`; in-page sign-in → `login-success`; different-page redirect → the
  target's `mounted`. The one repeatable path (`login-success` at an already-started page, today
  reachable by no route) re-asks a question whose answer has not changed and is insured against
  double-polling (see O1/O2).
- Starter vs old `mounted` body, compared line-by-line per page: **no page's starter falls short
  of a fresh mount.** overview carries bounce + `loadFiltersFromLocalStorage` + date-range
  default/apply + scroll indicators + both document click listeners; offers carries bounce + both
  fetches + the 10s poll; kam bounce + `fetchData` + 30s poll; goods bounce + `fetchOfferItems` +
  30s poll. The only additions are the clear-before-set poll guards. overview's localStorage read
  moved *inside* the starter with the orders-contrast reasoning stated in-file — correct: unlike
  orders, nothing had been read by the time a sign-in arrives.

## Claim 2 — the mutation numbers: REPRODUCED

Probe read (`lanes/L-THE-LAST-FOUR-PAGES-RESUME-AFTER-SIGN-IN/mutate-bindings.probe.js`): applies
one mutation at a time, restores from bytes read at start, reads both stdout and stderr, throws if
a mutation changes nothing. Sound. I re-applied three of the eight by hand (worktree, restored via
`git checkout` after each, clean status verified):

| mutation | recorded | measured | failing test names |
|---|---|---|---|
| baseline | 28 passed | **28 passed** | — |
| overview UNBOUND | 4 failed | **4 failed / 28** | entitled-data, privilege-refusal, fresh-mount-equivalence, saved-date-range |
| kam SHORT (`fetchData`) | 1 failed | **1 failed / 28** | privilege-refusal |
| offers SHORT (`fetchOfferProposals`) | 2 failed | **2 failed / 28** | privilege-refusal, fresh-mount-equivalence |
| restored | 28 passed | **28 passed** (and full tier re-run) | — |

Full tier on the clean worktree: **165 suites / 3903 tests / 0 failed** — the branch's claimed
tier, +1 suite / +29 tests over trunk's 164/3874 (28 new + the scan's vacuity guard = 29 ✓).

The assertion-shape check the brief ordered: the new suite asserts fake-recorded *requests*
(`page.asked`), page *data* (`readable()` equality against an already-signed-in reference mount,
with a negative control that the reference is not blank), and *screen text*
(contains/not-contains, including the empty-marker row that made the defect invisible). The
sign-in travels as the `login-success` **event on the shell stub**, through each page's template
binding — nothing asserts a handler fired. The one `toHaveBeenCalledWith` is `push('/admin')`, the
product's refusal navigation, and it is paired with sent-away-AND-not-served (`asked` empty, data
text absent). This fix does not repeat the shape that let the class through twice.

## Claim 3 — the widened source scan: TRUE, and it cannot go quiet on the pages it names

- The pre-widening scan (read from `00d84d7`) extracted the `mounted` hook **text** and had **no
  vacuity guard of any kind**. Measured against the fixed tree: none of the four pages carries a
  `push('/admin')` in `mounted` any more, so the old scan silently drops all four from
  consideration — permanently. The widening was load-bearing, not cosmetic.
- Guard deletion, on a **different page than the lane's own ninth mutation** (they used goods, I
  used kam): removed `if (!this.$store.getters.userIsLoggedIn) { return; }` from `kam.vue`'s
  `mounted` → widened scan reds `1 failed / 9` with offender list `["kam.vue"]` — reds **and
  names the page**. The old extraction, run against the same mutated file: no push in `mounted`,
  mutated page called clean. Restored → 9/9.
- Vacuity measured, not assumed: renamed `mounted`'s starter call so the bounce sits two levels
  deep → the reach test reds with `kam.vue` visibly missing from the received bouncer list.
  Restored → 9/9. Current reach on the clean tree: **15 bouncers** (floor is >10), all five named
  pages present, offenders empty, 70 admin pages total.
- **Can it still go quiet?** Not on the five pages it names — the vacuity guard converts silent
  scope-loss into a red, demonstrated above. Residual quiet modes, all requiring a NEW page in a
  shape the estate does not currently use: (a) a bounce ≥2 call levels below `mounted` (one level
  is deliberate and disclosed in-file); (b) a starter written as `name: function ()` or an arrow
  property, which `bodyOf`'s shorthand-method regex does not follow; (c) a page mounting the shell
  through a renamed wrapper, escaping the `<AdminPage` literal filter (today 68/70 admin pages
  carry the literal; the other two are the deliberate shell-less pair below); (d) ordering
  blindness — the scan is textual, so a mount-time body containing both the delegation guard and a
  push reachable *before* it would pass. (d) existed in the old scan too and no page has the
  shape. None of these is this lane's to close; recorded so the next widening knows its edges.

## wrapped.vue — the reasoning checked, not the exclusion

Factual: `wrapped.vue` contains zero occurrences of `AdminPage` (it and `reservation.vue` are the
only two shell-less admin pages — measured across all 70). Causal: its own `mounted` bounces a
signed-out visitor to `/admin` itself; with no shell there is no in-flight `?redirect=` for that
push to supersede (the racing defect cannot exist there), no `login-success` to bind (nothing
would ever fire it), and no modal to resume from — so delegation would remove the only door and
replace it with nothing, which is exactly what the front-door lane's browser walk recorded
(`walk-wrapped-delegation-regression.json`, cited in commit and test). The reasoning holds on its
own terms; the exclusion follows from it.

## offers.vue `(x || {}).clientName` — identical rendering in both worlds, harness reason real

- Harness reason measured: reverted both interpolations to `?.` → the whole suite **fails at
  transform time** (`SyntaxError: Unexpected token` from the buble pass behind vue-jest), before
  any assertion can run — confirming the page was untestable with optional chaining, which is why
  it alone had no test. Restored.
- Rendering equivalence proven by cases, not just for the reachable ones: `proposalToDelete` /
  `proposalToCancel` are only ever `null` or a proposal object (data defaults at offers.vue:468-9;
  all assignment sites read). Object → both spellings yield `.clientName`; `null`/`undefined` →
  both yield `undefined` → Vue renders the empty string. Even for unreachable falsy primitives
  (`0`, `''`, `false`, `NaN`) both yield `undefined` — `?.` short-circuits only on nullish, and no
  primitive wrapper has a `clientName`. There is no input on which the two spellings render
  differently.

## Observations — none blocking

- **O1** overview's starter comment claims add-listener idempotence for the two document click
  listeners — true (Vue 2 binds methods once; stable references; re-add is a DOM no-op) — but
  `setupTableScrollIndicators` (byte-identical to trunk, verified) adds *anonymous* scroll/resize
  arrow listeners each run, and `beforeDestroy` removes a resize reference that was never added.
  Pre-existing on every path; the only new exposure is the today-unreachable double-start, where
  the three poll pages got clear-before-set insurance and overview's listener accumulation got
  none. Effect if ever reached: duplicate idempotent indicator updates. Cosmetic; a future sweep
  could store and clear the handles the way the polls now do.
- **O2** the kam and goods SHORT mutants are caught by exactly one test each (privilege-refusal):
  their short handlers load everything `readable()` reads, and the poll handle is invisible to it,
  so the equivalence check cannot distinguish. They do red — the margin is one assertion, carried
  entirely by the privilege-inside-the-starter half of the fix. Worth knowing, not worth blocking.
- **O3** the poll-not-doubled tests are honestly labelled insurance ("no route reaches it today")
  and the label is correct: `AdminPage.openLogin` is called only by onboarding and wolt-menu, and
  a session that ends replaces to `/admin`, unmounting these pages.
- **O4** the eslint claim (errors unchanged 0/0/9/13, one new warning each) was not re-run —
  cosmetic, outside the exit criteria.

## Exit criteria, answered

- **Pages whose starter does not reproduce a fresh mount: none.** All four starters carry the
  whole of their old `mounted` body; the equivalence tests pin it per page against a live
  reference.
- **Mutations that would not red: none.** 8/8 recorded reds; 3 re-applied by hand with matching
  counts and sensible names; the ninth (scan) re-applied on a different page than the lane used.
- **Can the widened scan still go quiet: not on the five pages it names** (vacuity guard measured
  to red on scope-loss); residually yes for a new page written at depth ≥2, in non-shorthand
  method syntax, behind a renamed shell, or with a bounce textually above its guard — shapes no
  current page has, listed above for the next widening.

Not done here: no browser, no container, no C5 acceptance — the journey for Sven is spelled out in
the commit's final paragraph and remains the gate the landing lane holds for.
