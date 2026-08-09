# Branches still wanted

**Read-only.** No ref was created, deleted, moved, pruned, fetched, merged or pushed. Trunk `6d5328004`,
unmoved. Supersession was **measured, not judged**: no branch was read for whether its idea is still a good
one.

## The classes

| class | count | what decided it |
|---|---:|---|
| **undecidable** | **33** | the diff refuses to apply, and a refusal is equally a superseded hunk and a merely stale one |
| wanted-and-unmerged | 13 | the diff applies cleanly to the trunk — the work is absent and still fits |
| superseded | **1** | `git cherry` finds every patch already upstream |

**`undecidable` is the largest class, and that is the answer.** The question was whether we have 47 losses
or 3. Measured: **one** branch is provably superseded, **thirteen** provably are not, and **thirty-three**
cannot be decided by any test that does not build them.

## Where the tests disagreed: nowhere, and that is not reassuring

`git cherry` split its verdict on **zero** branches — no branch had some patches upstream and some not. The
three cheap tests never contradicted each other, so no verdict here rests on a preference between them.

But agreement is not confirmation. On the 33, the tests do not disagree — **they are all silent in the same
way.** A refusing diff is the same observation whether the trunk already contains the change or has merely
moved around it, and none of the three can separate those.

## The test that would decide the 33, and why it was not run

**Does it compile at the trunk.** Three lanes tonight found branches that do not — one could not compile
because a method signature had gained an argument, which is exactly the shape a stale-but-wanted branch has
and a superseded one does not.

It was not run because it costs a build per branch: 33 builds, each one to two minutes on a host that spent
the night above its own load gate. **That is the whole remaining cost of this question**, and it is a
measurement somebody can schedule rather than a judgement somebody must make.

## Which of my tests could call a branch superseded when it is not

This runs the opposite way from the four errors I caught tonight — those all under-reported. **This one
throws work away.**

**1. `git cherry` — the reverted-upstream hole.** It matches by patch-id. If a patch landed on the trunk and
was later **reverted**, cherry still reports it upstream and I classify the branch superseded, when in fact
the trunk no longer has the change and the branch is the only copy. That is the single test I used to award
the one `superseded` verdict, so **that verdict carries this exact risk**.

**2. "the changed files still exist on the trunk".** A file existing says nothing about its contents. I did
not classify on this test alone for that reason, and it should never be used alone.

**3. A cleanly applying diff cannot over-report supersession** — it can only place a branch in
`wanted-and-unmerged`, and its failure direction is to leave a superseded branch looking wanted. That is the
safe direction, which is why the 13 are the most trustworthy verdicts here.

## The one superseded branch

`lane/wf-idreg` — 1 commit(s), all found upstream by `git cherry`; cited by `L-WF-IDREG`.

Before anyone acts on that word: confirm the patch was not landed and later reverted. That check is one
`git log --all --grep=revert` away and I did not run it, because acting on this verdict is not this
lane's job and the check belongs with the action.

## The 13 that still fit

| branch | cited by |
|---|---|
| `lane/ef-index-shadow-sweep` | `L-EF-INDEX-SHADOW-SWEEP` |
| `lane/ev-inquiry-gate` | `L-EV-INQUIRY-GATE` |
| `lane/fe-ev-inquiry-gate` | `L-EV-INQUIRY-GATE` |
| `lane/gr-approval-state` | `L-GR-APPROVAL-STATE` |
| `lane/gr-deadline-statute` | `L-GR-DEADLINE-STATUTE` |
| `lane/gr-postmark-webhook` | `L-GR-POSTMARK-WEBHOOK` |
| `lane/growth-newsletter-wire` | `L-GROWTH-NEWSLETTER-WIRE` |
| `lane/meals-grace-pins` | `L-EV-ACCEPT-GATE` |
| `lane/review-residuals-rezone` | `L-REVIEW-RESIDUALS` |
| `lane/utlkvit-reprint-kind` | `L-UTLKVIT-REPRINT-KIND` |
| `lane/wf-digest-tautology` | `L-WF-DIGEST-TAUTOLOGY` |
| `lane/wf-push-still-lies` | `L-WF-PUSH-STILL-LIES` |
| `lane/wf-timesheet-race` | `L-WF-TIMESHEET-RACE` |

## The 33 undecidable

| branch | files changed | still on trunk |
|---|---:|---:|
| `lane/ev-accept-receipt` | 18 | 10 |
| `lane/ev-extdep` | 23 | 17 |
| `lane/ev-journey-timebomb` | 12 | 5 |
| `lane/ev-outbox-flake` | 1 | 1 |
| `lane/ev-outbox-guid-substring` | 1 | 1 |
| `lane/ev-uri-relative` | 9 | 4 |
| `lane/ev-vipps-fallback-2` | 12 | 12 |
| `lane/fe-wf-blind-bind-name` | 25 | 13 |
| `lane/fe-wf-bootstrap` | 6 | 6 |
| `lane/fe-wf-contact-imported` | 7 | 6 |
| `lane/fe-wf-link-deadend` | 25 | 13 |
| `lane/fe-wf-oplink` | 24 | 13 |
| `lane/flags-effective-resolvers` | 11 | 3 |
| `lane/growth-health-honest` | 16 | 15 |
| `lane/journey-workforce` | 32 | 12 |
| `lane/meals-reachable-api` | 11 | 8 |
| `lane/meals-reachable-web` | 5 | 5 |
| `lane/price-crosscurrency` | 15 | 9 |
| `lane/review-residuals-provider` | 17 | 15 |
| `lane/train-disclosure` | 16 | 10 |
| `lane/train-evidence-pack-ui` | 12 | 12 |
| `lane/train-publish-unclickable` | 19 | 9 |
| `lane/train-readonly-visible` | 17 | 5 |
| `lane/trn-evidence-names` | 10 | 5 |
| `lane/wf-blind-bind-name` | 11 | 7 |
| `lane/wf-bootstrap` | 11 | 5 |
| `lane/wf-clock-wire` | 15 | 12 |
| `lane/wf-contact-imported` | 8 | 7 |
| `lane/wf-demo-presence` | 2 | 2 |
| `lane/wf-link-deadend` | 12 | 7 |
| `lane/wf-onboard-claim` | 1 | 1 |
| `lane/wf-roles-ui` | 12 | 11 |
| `lane/wf-timesheet-ui` | 27 | 10 |
