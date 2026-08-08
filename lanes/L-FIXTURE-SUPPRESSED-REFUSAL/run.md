# Run — the fixture learns the refusal the backend throws

`F-FIXTURE-BEHIND-BACKEND`. The sibling lane found one live divergence at the integration tip and
left it unfixed. This lane closes it, and the closing is the easy half — **the controls are the
deliverable.**

**Headline: `test:e2e:fixture-divergence` is GREEN at backend `8e2b57de`, exit 0, and the green is
load-bearing — a comparator broken in one line produces a byte-identical green.**

---

## 1. The choice: TAUGHT, not exempted. Nothing was exempted.

The brief offered two closes and warned against picking the one that goes green fastest. **The fast
one was the exemption** — four lines of comment, no logic, instantly green — and it is wrong here.

**Why teaching is right, on the exemption grammar's own terms.** The five `@backend-unmodelled`
declarations already in this file each name a state that **cannot exist** in the fixture world: no
resolvable identity (auth is answered upstream in `api-server.js`), no deployment configuration to be
absent, no way to pause a provider account, a version-id scheme under which approval-drift is
unconstructible. That is the bar. A suppressed address is **not** such a state — the file's own
`CONSENT_SUMMARY` already asserts `suppressedContacts: 7` and an `AUDIENCE` excluding 4 of them, so
this world already claims a suppression ledger exists. It had no *lever* onto the caller's own
address. **A missing lever is not an impossible state.**

**And the exemption's honesty test fails outright.** An exemption asserts *something else covers this
path*. Measured: nothing does. `pages/admin/growth-newsletter.vue`'s `ERROR_KEYS` has **no entry for
`growth.test_address_suppressed`**, and the code appears in no translation file — `grep` over
`pages/ utils/ translations/ components/` returns empty. The backend's own
`GrowthTestSendReachabilityTests` cover the backend, not the journey world. The honest answer to
"what still covers that path" is **nothing**, which the brief names as the case where an exemption is
the wrong choice.

---

## 2. What changed — one shape, zero anchors

| | before | after |
|---|---|---|
| anchored routes (whole fixture) | 12 | **12 — unchanged** |
| shapes on `POST …/test-sends` | 3 | **4** |

```
400 growth.test_address_required
403 growth.test_address_not_own
404 growth.not_found
409 growth.test_address_suppressed   <- added
```

**No anchor was added.** The change is one refusal on an anchor that already existed, so it does not
move the scope caveat in §6 by a single route.

Placed at the backend's own position in the order — after the ownership 403, on the address the
ACCOUNT holds, never the one the request typed. `GrowthNewsletterService.cs:274` says why in as many
words: asked earlier, or asked about the requested address, the route becomes a channel-wide oracle
over other people's bounces, complaints and erasures.

**The lever, so this is a door and not a dead branch (C3).** `/admin/account-email` sets and confirms
the acting administrator's own address and `api-server.js` accepts any address, so a journey can point
an account at a suppressed mailbox and confirm it — **confirmed AND suppressed at once**, which is
precisely the state the backend guards, because `EmailConfirmed` is written once and nothing ever
re-reads the mailbox. `api-server.js:619` already says these two routes are "what makes the Growth
test-send refusal a door rather than a wall." `marit@example.test` is deliberately absent from the
ledger: she is who `growth-newsletter-send-gate` test-sends to, and a ledger that caught the happy
path would have swapped one unwalkable branch for another.

---

## 3. The six probe cases — and the two where the PRODUCT DOES NOT REFUSE

**A correction worth making precisely: there was ONE divergence, not six.** The six below are cases in
a behavioural probe of my own rule, not six findings. **One thing was changed and nothing was
exempted.**

The divergence check compares `(status, code)` **shapes**. It is structurally blind to whether the
*rule* behind the shape is right — and that blindness is where the temptation the brief warned about
actually lives. **A fixture that refused on ANY suppression row would carry the identical `409`
shape, pass this check green, and be refusing where the API serves.** So the rule was driven directly
through `route()` (a pure function; no server, no port, no socket):

```
  ok  200 -                                the happy path the send-gate journey walks — untouched
  ok  409 growth.test_address_suppressed   HardBounce, channel-global — refuses
  ok  409 growth.test_address_suppressed   AdminBlock scoped to THIS store — refuses
  ok  200 -                                AdminBlock scoped to the NEIGHBOUR's store — must NOT refuse here
  ok  200 -                                Unsubscribe — GB4-liftable, must NOT refuse a preview to her own mailbox
  ok  409 growth.test_address_suppressed   the ledger is case-insensitive, as the API comparison is
```

**Rows 4 and 5 are the ones that matter, and they are NOT divergences — they never were.** They are
cases where a suppression row exists and the backend **still serves 200**:

- **Row 4 — the neighbour's store-scoped block.** `SuppressionCoversTarget` (`GrowthConsentProjection.cs:211`)
  makes scope directional: channel-global reaches everywhere, store-scoped binds only its own venue.
  Refusing here would also leak another controller's ledger state through a status code.
- **Row 5 — GB4.** `GrowthSuppressionLiftPolicy` rules `Unsubscribe`/`Objection` liftable by a fresh
  confirmed opt-in. An administrator who unsubscribed from her own venue's newsletter has not lost the
  right to preview a draft in her own mailbox; a test-send is not marketing to a third party.

**The divergence check says nothing about either.** Both answer 200, and 200s are not compared. They
are pinned here because they are exactly what a shape-satisfying fix would have got wrong while going
green. The never-lift set is written as the **liftable** pair (`LIFTABLE_REASONS`) rather than as a
never-lift list, mirroring `CanBeLiftedByFreshConsent` failing closed on a reason it does not know — a
never-lift list would fail **open** on an unclassified reason.

---

## 4. The controls — the comparator broken, not the subject

Every measurement in this file was **re-run from scratch after a session kill**; nothing here rests on
a pre-kill result. Each control reverted with `git checkout --`; `git status --porcelain` and
`git diff HEAD` are both empty afterwards, and all four baselines were **re-measured after the
controls** and matched the pre-control results byte-for-byte.

### S1 — blind `compare()` to `fixture-behind` (THE control)

One line into `refusal-shapes.js`, disabling the emission of the exact class this lane closed:

```js
for (const theirs of [...backendShapes].sort()) {
  if (true) { continue; }   // SABOTAGE
```

| run | honest | under sabotage |
|---|---|---|
| `--prove` | 7/7 `ok`, exit 0 | **`FAIL removed green`** — "the proof itself is broken: removed: expected fixture-behind, got green", exit **1** |
| live vs `8e2b57de` | GREEN, exit 0 | **GREEN, exit 0 — `diff` reports the output IDENTICAL, byte for byte** |

**This is the whole point, and it is sharper for a green subject than it was for the sibling's red
one.** My live green output carries, on its own, **zero information**: a comparator that has stopped
looking at `fixture-behind` prints the same 5 lines and the same exit 0. The only thing that
distinguishes "the fixture is level" from "nobody is looking" is `--prove`, and `--prove` reds on that
breakage by name. A green here means something *only* because the arms were measured beside it.

### S2 — restatus my own refusal 409 → 422 (subject break)

```
  ANSWERED AT THE WRONG STATUS — the same code, a different number
    growth-newsletter.js:404  code growth.test_address_suppressed —
                              fixture answers 422, GrowthNewslettersController.cs answers 409
```
exit 1. **Proves the comparator is reading MY line** — the green is caused by the refusal I added, not
by this route having quietly fallen out of the compared set.

### S3 — delete my refusal (subject break)

```
  THE FIXTURE IS BEHIND — the API refuses and the fixture does not
    growth-newsletter.js:404  … can answer 409 growth.test_address_suppressed and the fixture never does
```
exit 1 — **the sibling's original finding, reproduced exactly.** Green is reachable only with the
change; it is not a stuck green.

---

## 5. The measurements

Backend read **by object at the tip**, in a private detached `--shared` clone. The shared checkout at
`/Users/svendaneel/okam/OkamAPI-modules` is **divergent — 1 ahead, 63 behind** (`34c6c103`), and the
same check against it returns `fixture-ahead`, the opposite verdict. It was neither moved nor
measured.

```sh
git clone --shared --no-checkout /Users/svendaneel/okam/OkamAPI-modules <scratch>/be-tip
git -C <scratch>/be-tip checkout --detach 8e2b57de     # clean; `git status --porcelain` empty
cd /Users/svendaneel/okam/web-suppressed               # own worktree, branch lane/fixture-suppressed-refusal
OKAM_API_REPO=<scratch>/be-tip npm run test:e2e:fixture-divergence
```

| what | result |
|---|---|
| `test:e2e:fixture-divergence` @ `8e2b57de` | **GREEN — "12 anchored routes refuse exactly what that checkout refuses", exit 0** |
| `--prove` (seven arms) | 7/7 `ok`, exit 0 |
| `npx jest test/fixture-refusal-divergence.test.js` | **1 suite, 8 tests passed** |
| behavioural probe (6 cases) | 6/6, exit 0 |
| fixture commit | `1824a94` on `lane/fixture-suppressed-refusal`, off `e34977a` |
| backend commit | `8e2b57de` |

**No server was started and no port was bound.** Both sides are static source reads; the probe calls
`route()` as a function. `pid 73160` / port 4010 was neither contacted nor touched.

---

## 6. What this run does NOT cover

1. **Still 12 of 642 backend routes anchored — 1.9%**, across **5 of 102** controllers. This change
   added **no anchors**, so that number is exactly where the sibling left it. A green run means *no
   divergence among the anchored routes*, not that the fixture matches the backend.
2. **Four fixture files answer refusals with zero anchors** — `api-server.js`, `consumer-api-server.js`,
   `growth.js`, `training.js`. Their refusals are never compared. Unchanged by this lane.
3. **The probe is not pinned.** The six behavioural cases were measured, not committed as a suite. The
   *shape* is pinned (§below); the *rule* is not. A future edit that made the fixture refuse on every
   suppression row would pass every committed check in this repo.
4. **Nothing here is a journey.** No browser ran. This is a static comparison plus a function-level
   probe; it says the fixture can now produce the refusal, not that any screen renders it well — see
   the finding below, which says it does not.
5. **Still no CI.** The arms are gated by `test/fixture-refusal-divergence.test.js`; the live
   comparison is in no suite; and nothing automatic runs either. This recorded run is the only
   evidence that exists.

**One pin was added**, to the suite that does exist: the reachability assertion in
`test/fixture-refusal-divergence.test.js` now also requires `409 growth.test_address_suppressed` among
the shapes the walk reads. Without it, a later edit could drop the refusal and only the un-run live
comparison would notice.

---

## 7. Findings for the orchestrator

1. **PRODUCT GAP, pre-existing, now visible — the operator cannot be told why.**
   `growth.test_address_suppressed` is thrown by the backend **today** at `8e2b57de` and appears
   **nowhere** in the frontend: no `ERROR_KEYS` entry in `pages/admin/growth-newsletter.vue`, no
   translation key. That file's own comment says an unlisted code "falls to the generic message", so an
   administrator whose mailbox has hard-bounced meets «Something went wrong. Nothing was sent.» — a
   sentence telling them to retry — while the server explained precisely. This is the same class the
   comment describes having already fixed for four dispatch codes. **Not created by this lane, and not
   fixed here** (it needs a key across the locale files). **Exempting instead of teaching would have
   hidden it permanently** — this is the concrete return on the choice in §1.
2. **Reason vocabulary drift, outside this check's reach.** The fixture's `CONSENT_SUMMARY` reports
   `suppressionsByReason: { HardBounce, SpamComplaint, ManualSuppression }`. The backend enum members
   are `HardBounce`, **`Complaint`**, **`AdminBlock`** — `SpamComplaint` and `ManualSuppression` exist
   nowhere in it. The divergence check compares refusal shapes only and is blind to response bodies, so
   this is invisible to it. The new ledger uses the real enum spellings; the pre-existing counters were
   left alone as out of lane.
3. **The sibling worktree has no `node_modules`.** `/Users/svendaneel/okam/web-fixdiv/node_modules`
   does not exist, yet that receipt reports `npx jest … 1 suite passed, 8 tests passed, 4.1 s`. That
   suite cannot have run from that directory. Worth a check against the wrong-working-directory trap
   the brief lists — it does not touch that receipt's headline, which came from the two node scripts.
   (This lane ran jest with the shared `node_modules` symlinked read-only into its own worktree.)
