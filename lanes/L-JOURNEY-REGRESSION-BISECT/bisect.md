# L-JOURNEY-REGRESSION-BISECT — which merge stopped `meals-admin-setup` completing

**Answer: `55b2dcd`** — `Merge branch 'lane/meals-enrol-pretick' into candidate/fe-compose-2026-08-05`
(step **F1.16** in the composition order; index 7 of the 35 landed heads).

- **last passing step (commit):** `9bc40c6` — `Merge branch 'lane/wf-roles-ui'` (index 6) — **PASS**
- **first failing step (commit):** `55b2dcd` — `Merge branch 'lane/meals-enrol-pretick'` (index 7) — **FAIL**

Both sides were run twice. Both reproduced.

---

## The two endpoints, verified in this lane's own runs

The composition lane's claim was taken as a hypothesis, not as a fact, and re-measured here.

| commit | what | result | receipt |
|---|---|---|---|
| `e34977ac` | tip (baseline) | **PASS** (34.4s) | `runs/A-tip.txt` |
| `9f7d8df` | candidate tip | **FAIL** | `runs/B-cand.txt` |

Both agree with `L-COMPOSE-FE-CANDIDATE`. The regression is genuine and the bisect is meaningful.

## The bisect

Halving over **landed heads**, not commits. `dc6560a` (index 34) was already known red from the
composition lane's own checkpoint receipt, which bounded the search at ≤34 before any run here.

| # | commit | index | head merged | shape | receipt |
|---|---|---|---|---|---|
| 0 | `e34977ac` | — | tip / baseline | **PASS** | `runs/A-tip.txt` |
| 0 | `9f7d8df` | 37 | candidate tip | **FAIL-ASSERT** | `runs/B-cand.txt` |
| 1 | `8341892` | 17 | `lane/wf-idreg` | **FAIL-ASSERT** | `runs/S1-idx17.txt` |
| 2 | `55b2dcd` | 7 | `lane/meals-enrol-pretick` | **FAIL-ASSERT** | `runs/S2-idx07.txt` |
| 3 | `9bc40c6` | 6 | `lane/wf-roles-ui` | **PASS** | `runs/S3-idx06.txt` |
| 4 | `55b2dcd` | 7 | *(reproduction)* | **FAIL-ASSERT** | `runs/S4-idx07-repeat.txt` |
| 5 | `9bc40c6` | 6 | *(reproduction)* | **PASS** | `runs/S5-idx06-repeat.txt` |
| 6 | `2e3f39d` | — | `lane/meals-enrol-pretick` **unmerged branch tip** | **FAIL-ASSERT** | `runs/S6-branch-alone.txt` |

Step 2 was aimed rather than blind: `git log -S` attributed the intruding markup to `2e3f39d` and
`802041a`, both of which reach the candidate only through F1.16. The boundary was then **proved by
running the journey on both sides**, which is what makes it checkable — steps 2–5 stand on their own
whether or not the hypothesis that aimed them was any good.

## Where the walk stops

- **last passing journey step:** `create a programme under it` (spec line 109)
- **first failing journey step:** `issue its first immutable policy version` (spec line 122)
- **failing assertion:** spec line 131

```
Error: strict mode violation: locator('.meals-programs .mls-note--warn') resolved to 4 elements
  2) <p data-test="enrol-replaces"        class="mls-note mls-note--warn">Listen du sender inn er hele påmeldingen…
  3) <p data-test="enrol-unread"          class="mls-note mls-note--warn">Vi fikk ikke lest hvem som står påmeld…
  4) <p data-test="enrol-unread-refusal"  class="mls-note mls-note--warn">Denne serveren svarte ikke som Company…
```

The assertion wants the one warn-note that says the module never reads a policy version back. F1.16
adds an enrolment panel inside `.meals-programs` carrying three more `.mls-note--warn` paragraphs, so
a locator that resolved to 1 element now resolves to 4 and Playwright refuses it under strict mode.

**The journey did not change.** `test/e2e/journeys/meals-admin-setup.spec.js` is byte-identical
(blob `24078760`) at the tip, at the branch tip and on the candidate. The instrument is fixed across
every step of this bisect; only the product moved.

This is the collision the spec's own header predicted: *"SELECTORS HERE RIDE ON CLASSES AND NORWEGIAN
LABEL TEXT, because this surface carries no `data-test` attributes… it makes these selectors the most
brittle in the suite."* The new markup does carry `data-test` attributes; the assertion it broke does not.

## It is not a merge interaction

`lane/meals-enrol-pretick` **fails this journey unmerged**, at its own tip `2e3f39d`, with the same
4-element violation (`runs/S6-branch-alone.txt`) — and the spec is present and identical there, so the
branch could have measured this at any time.

So no merge order and no rebase avoids it: the head carries the regression on its own terms, and this
is another instance of *a branch's green not transferring* — here the green never existed for this
journey. Input to `D-REBASE-CONFLICTING-HEADS`, which is Sven's. **Nothing was fixed by this lane.**

## How the runs were made honest

Three named harness failure modes were closed before any red was trusted:

- **`F-SURVIVING-FIXTURE-SERVES-STALE-CODE` / `F-DEV-SERVERS-SHARE-BUILD`** — `playwright.config.js`
  sets `reuseExistingServer: !process.env.CI`. Port **4010 is held by a foreign `api-server.js`** from
  another checkout (pid 73160), so a default-port run here would have silently reused another lane's
  fixture. Every run sets **`CI=1`** (never reuse; port-in-use becomes a loud error) and unique ports
  **3777/4777**, and asserts both are free before starting.
- **`F-CORE-PIN-ON-NO-REMOTE`** — `core/` was pre-populated in this lane's worktree, so `ensureCore()`
  returns `borrowed:false` and mutates nothing in any other checkout.
- **stale build** — `.nuxt` is removed before every step. The 406 MB shared `node_modules/.cache` was
  **not** touched: it is content-hash keyed (babel-loader) and `build.cache` is off, and five other
  lanes are using it.

`E2E_API_BASE_URL` is deliberately never set — setting it flips the config to live mode, which
grep-inverts `@fixture` and would have run **nothing** while reporting success.

**The three shapes were told apart at every step**, since only the middle one is bisect signal:
`PASS` (walk completes) · `FAIL-ASSERT` (walk ran, assertion failed) · `HARNESS` (walk never started).
**Every step above is PASS or FAIL-ASSERT; no step in this bisect was a harness failure.**

Work was done in a dedicated worktree `/Users/svendaneel/okam/web-jrbisect` (detached HEAD
throughout). Nothing was committed, nothing pushed, no container started, and neither
`feature/restaurant-modules` nor the candidate branch was touched. Runner: `run-step.sh`.
