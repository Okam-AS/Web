# L-PATH-EVIDENCE-IS-READ — census: an exit is not satisfied by a file that fails

**Class: analysis. Nothing was changed.** No file outside this lane directory was written, no
suite run, no container started, no checker repaired. The instrument is left exactly as found so
the count below is reproducible against it.

Read with the plan tool's own parser (`plan` at `/Users/svendaneel/.local/bin/plan`, imported as a
module, no verb invoked) so this census counts what the instrument counts, not what a regex thinks
it counts.

Reproduce: `python3 lanes/L-PATH-EVIDENCE-IS-READ/full_census.py`, `verified.py`, `probe_checker.py`.
Raw output in `full_census.txt`, `full_census.json`, `verified.json`, `probe_checker.txt`.

---

## 0. The defect, measured against the live predicate

`names_the_instrument()` (plan:8678-8702) ends:

```python
for tok in paths:
    if ev.startswith(tok) or tok.startswith(ev):
        return True, ""
```

Prefix, and in **both directions**. `_evidence_kind_ok()` (plan:8717-8760) then asks of a path only
`os.path.exists()` and "is this a suite probe's artifact" — **it never opens the file.** The status
check on the branch above it (`if f.status != "ok"`, and `f.content.strip() != want`) exists only for
`fact:` evidence. A path is admitted for being a string that resolves.

Asked of the six Features as `cmd_verify` asks it — `evidence_admissible(p, X, ent=FT)`:

| evidence offered | FT-WORKFORCE … FT-GROWTH | what the artifact says |
|---|---|---|
| `artifacts` | **ADMITTED** ×6 | a directory, 6 entries |
| `artifacts/` | **ADMITTED** ×6 | a directory |
| `artifacts/journeys/` | **ADMITTED** ×6 | a directory, 78 entries |
| `artifacts/journeys/modal-scroll-lock.playwright.json` | **ADMITTED** ×6 | `status: passed` — a scroll-lock capture |
| `artifacts/journeys/growth-newsletter-send-gate.playwright.json` | **ADMITTED** ×6 | **`status: failed`** |
| `artifacts/journeys/training-course-to-evidence.playwright.json` | **ADMITTED** ×6 | **`status: failed`** |

36 of 36 admitted. All six Feature exits end "captured under `artifacts/journeys/`", and
`"artifacts/journeys/".startswith("artifacts")` is true, so the *bare word* satisfies them by the
reverse arm of the same `or`. FT-MEALS would be verified by a failed Training run.

## 1. Population

| | count |
|---|---|
| entities carrying `evidence:` | 348 |
| …`fact:`-shaped (status IS checked) | 10 |
| …path-shaped (status is NEVER checked) | **338** |
| path-shaped, state `verified` — the checker ran | 54 |
| path-shaped, state `built-unverified` — **the checker never ran** | 284 |
| entities whose `exit:` names a **directory** token, so any file under it satisfies | **55** (6 Features, 7 verified, 32 built-unverified, 14 open, 2 retracted) |
| recorded evidence resolving to a directory | 1 |
| verified entries admitted by **prefix**, not by naming the exit's artifact | 6 |
| evidence strings resolving to **no path at all** (prose) | 149, all built-unverified |

**`built` does not check evidence at all.** `cmd_built` (plan:8646-8667) calls `set_evidence` with no
`evidence_admissible` call anywhere in it. 284 of the 338 path-shaped pointers have therefore never
been measured by anything — including the 149 that are prose and resolve to nothing. They are not
false claims yet, because `built-unverified` claims nothing; they become the problem at `verify`.

---

## STATE 3 — the artifact RECORDS ITS OWN FAILURE

*Listed first: this is what turns a green board into a false one.*

### 3.1 `L-JOURNEY-COVERAGE-THREE` — **verified** — exit **NOT demonstrated**

```
exit:     Margin, Training and Growth each hold one journey walking their stated exit,
          captured under artifacts/journeys/
evidence: artifacts/journeys/
```

The recorded evidence is **the directory itself** — the only entity in the plan of which that is
true. It names no artifact, so nothing about any run can be read from it.

Its own return (log.md:360, 2026-08-02T09:28Z) named the three artifacts:
`margin-recipe-to-margin`, `training-course-to-evidence`, `growth-newsletter-send-gate`. Between
returning and verifying, the pointer was widened from those three files to the bare directory. On
disk today:

| the exit's three modules | artifact | status |
|---|---|---|
| Margin | `margin-recipe-to-margin.playwright.json` | passed |
| **Training** | `training-course-to-evidence.playwright.json` | **failed** — step 9 "the publish control is reachable BY POINTER at this viewport", `locator.click` timeout |
| **Growth** | `growth-newsletter-send-gate.playwright.json` | **failed** — step 1 "sign in and open the newsletter screen", `page.waitForURL` timeout, `backendServed: 0` |

**Two of the three modules the exit names hold a failed run.** The Growth artifact finished
**2026-08-03T16:14:28Z** and the entity was verified at **2026-08-03T22:07Z** (log.md:734) — it was
already on disk, already reading `failed`, about six hours before the verification that the
directory prefix waved through. The Training artifact went red the next day and nothing noticed,
because the pointer cannot see a file.

The Training artifact's own `findings` block additionally records: *"Training's stated exit — 'a
worker passes the quiz' — names a step no shipped screen offers … there is no worker-facing surface
at all."*

Neither failed artifact is tracked (`artifacts/` is gitignored; `git ls-files artifacts/` = 16 files,
all force-added, and these are not among them). So "captured under `artifacts/journeys/`" is, for two
of the three, satisfied by an untracked file recording a failure.

### 3.2 `L-TRAIN-EVIDENCE-NAMES-COURSE` — built-unverified — evidence **contradicts its own artifact**

```
evidence: … Web-modules cff41c8 . artifacts/journeys/training-course-to-evidence.playwright.json
          (19 steps, passed)
```

The file it names reads **`status: failed`, 9 steps, 1 failed**. The parenthetical "(19 steps,
passed)" describes a run that is not the file on disk. The state is `built-unverified`, so no claim
has been made yet — but the pointer is one `plan verify` away from being admitted, and the admission
would read the parenthetical from the plan and never the status from the file. Its `exit:` (component
test + wire test on the completion row) is a different subject from this journey altogether.

### 3.3 Checked and CLEARED — `L-LIVE-WORLD-STAFF`

`lanes/L-LIVE-WORLD-STAFF/live-world-run.txt` self-declares `status=failed` twice, which a keyword
scan reds. **Reading it clears it.** Both failures are the deliberate red halves of proofs: §1 "GUARD
PROOF (expected RED, and red)" drives the browser at :5952 while declaring :5951 to show the guard
re-throws; §3 "MUTATION PROOF … (expected RED, and red)" inverts a selector to prove the feature-flag
flip is load-bearing. The two runs that are the lane's actual subject (§2, §4) are `status=passed`
against the live backend. **Exit demonstrated.** Recorded because a status-word check on artifact text
would have produced a false red here, and the repair to the checker must not be a grep.

---

## STATE 2 — the artifact EXISTS but shows SOMETHING ELSE

### 2.1 `L-GR-DEADLINE-ONWIRE` — **verified** — exit **partly** demonstrated

```
exit:     the privacy request read carries the deadline the venue is held to, and the page renders
          it rather than deriving it, pinned by a wire test, captured at
          `artifacts/journeys/growth-privacy-queue.playwright.json`
evidence: artifacts/journeys/growth-privacy-queue.playwright.json
```

Exact match on the token, so this is not prefix abuse — it is the *other* half of the defect: the
artifact is never read, so nobody notices it belongs to a different lane. That file is
`L-GR-PRIVACY-VENUE`'s journey (`journey: growth-privacy-queue`, title "a venue sees a guest's
erasure request on its privacy queue and resolves it"), and **both lanes are verified against the one
capture.**

Of the three things the exit demands: the deadline appears once, as the *detail* line of step 4
("request 9101 is first, art. 17, and past its one-month deadline") whose *subject* is the sibling
lane's claim; "the page renders it rather than deriving it" is not distinguishable from anything in
the artifact; "pinned by a wire test" is not in the artifact at all — and a suite result would be
inadmissible as evidence anyway (guard 1). `L-GR-PRIVACY-VENUE`'s own exit **is** demonstrated by the
16 steps.

The artifact on disk (`startedAtUtc` 2026-08-02T09:26Z) is also a later re-run than the one this lane
returned (2026-08-01T19:45Z, "16 steps, 0 failed requests, 0 defects"). The pointer cannot tell the
two apart.

### 2.2 `L-JOURNEY-MARGIN` — **verified** — exit demonstrated, but **not by the recorded evidence**

```
exit:     artifacts/journeys/margin-supplier-to-plate.playwright.json and
          margin-week-freeze.playwright.json each capture a completed walk, and the freeze walk
          reds when the frozen week accepts an edit
evidence: artifacts/journeys/margin-supplier-to-plate.playwright.json
```

The exit names two artifacts and a mutation demand; the evidence names one. It was admitted on the
first token and the rest went unmeasured. On the substance the lane is fine — `margin-week-freeze`
exists, `status: passed`, and its ARM 1/2/3 structure (open week takes the edit → same call refused
on the frozen week → correction takes it) is exactly the mutation the exit asks for. **The claim is
true and the record does not carry it.**

### 2.3 `L-MODAL-LAND` — **verified** — exit demonstrated, but **not by the recorded evidence**

```
exit:     artifacts/journeys/modal-scroll-lock.playwright.json and
          modal-estate-scroll-lock.playwright.json both exist on feature/restaurant-modules and the
          frontend suite is green at that tip
evidence: artifacts/journeys/modal-scroll-lock.playwright.json
```

`modal-estate-scroll-lock.playwright.json` carries no `/`, so `exit_tokens()` does not see it as a
path at all and it could never have been matched. Checked directly: both files **are** force-added and
tracked on `feature/restaurant-modules` (`git ls-tree -r feature/restaurant-modules -- artifacts/`),
both `status: passed`. The "frontend suite is green" half is unmeasured and is inadmissible as
evidence by guard 1 in any case.

### 2.4 Six more verified entries whose exit names something the evidence never records

Same shape, lower stakes — each is a land-lane whose exit names a branch or route the merge receipt
alone cannot show, and the receipt was admitted on the first token:

| lane | recorded | unrecorded part of the exit |
|---|---|---|
| `L-COMPROOT-FAMILY-LAND` | `lanes/…/merge-receipt.md` | `feature/restaurant-modules` |
| `L-EV-FAMILY-LAND` | `lanes/…/merge-receipt.md` | `feature/restaurant-modules` |
| `L-MEALS-POSREL-LAND` | `lanes/…/merge-receipt.md` | `feature/restaurant-modules` |
| `L-WF-PUSH-LAND` | `lanes/…/merge-receipt.md` | `feature/restaurant-modules` |
| `L-PDF-FAMILY-LAND` | `lanes/…/merge-receipt.md` | `feature/restaurant-modules`, `pdf/download`, `download/pdf` |
| `L-MRG-REVISE-LAND` | `lanes/…/evidence.md` | `lane/mrg-recipe-revise-ui` |
| `L-JOURNEY-PROXY-BLINDSPOT` | `lanes/…/guard-proof.txt` | `/okam-api` |

These are **not** claimed false — the receipts are real files with real content. They are recorded
here because the instrument stopped at the first token and no one can tell from the record whether
the rest was checked.

---

## STATE 1 — the artifact DEMONSTRATES the exit

The remaining 44 of the 54 verified entries point at a file whose content is on the subject of its
exit. Four of them were admitted **by prefix** (exit says `artifacts/journeys/`, evidence names a file
under it) and are nonetheless sound on reading:

| lane | evidence | verdict |
|---|---|---|
| `L-CONFIRM-ADMIN-SURFACE` | `account-email-confirm.playwright.json` | passed, 14/14, subject matches |
| `L-EV-RUNSHEET-PRINT` | `events-runsheet-print.playwright.json` | passed, 12/12, subject matches |
| `L-MEALS-STALE-TOKEN` | `meals-stale-token-requote.playwright.json` | passed, 6/6, subject matches |
| `L-MODAL-SCROLLLOCK` | `modal-scroll-lock.playwright.json` | passed, 8/8; steps 1-3 are the real login redirect flow the exit names |

They are right by the author's care, not by the instrument: each would have been admitted just as
readily by any of the other 74 files in that directory.

---

## COULD NOT CLASSIFY

### `L-GROWTH-MAIL` — verified — **the artifact has no status field to read**

```
exit:     fact:growth.mail.provider is present AND one double-opt-in confirmation is accepted by the
          ruled provider's sandbox, recorded under artifacts/journeys/
evidence: artifacts/journeys/growth-doi-postmark-sandbox.json
```

Admitted by prefix (`artifacts/journeys/`). Unlike every other file in that directory it is **not a
Playwright journey** — it is a hand-authored record with no `status` key at all. Its keys are
`decision`, `accepted: true`, `submissionStatus: "Accepted"`, `providerMessageId`,
`clientIdempotencyKey`, and a `note` that reads *"Accepted is submission-time truth only, never
Delivered."*

I am not calling this pass or fail. On its own terms it neither passes nor fails: it asserts a
submission was accepted and explicitly declines to assert delivery, which is a defensible reading of
its exit ("accepted by the ruled provider's sandbox") — but there is no status field, so **any repair
that classifies path evidence by reading a `status` key will classify this one as unknown, and must
decide what to do with it rather than default it to green.** It is the one artifact in the census
whose subject is genuinely undecidable from its own contents.

Checked and clear: `serverToken` in that file is `"POSTMARK_API_TEST (Postmark's documented public
sandbox token; delivers to nobody)"` — not a credential, no C7 exposure.

---

## What the count decides

This is **not** a handful of corrections and **not** a re-verification of the whole board.

- **One verified entity is materially false**: `L-JOURNEY-COVERAGE-THREE`, resting on a directory in
  which two of its three named journeys record their own failure, one of them already red at the
  moment of verification.
- **One verified entity is unsupported by the artifact it names**: `L-GR-DEADLINE-ONWIRE`, whose
  distinct claim is not what its (borrowed) capture was written to show.
- **Nine verified entities are true but under-recorded** — the artifact was never opened, so the
  record cannot distinguish them from the two above without doing what this census did.
- **The exposure is structural and larger than the damage**: 55 exits name a directory, 338 pointers
  are never read, and 284 of those were never checked by anything at all. The board is not
  wholesale false; it is *unfalsifiable*, which is why one genuinely false row survived on it for
  two days.

## Consequences for the repair (NOT done here, deliberately)

Recorded so the fix knows what it invalidates — changing the instrument mid-census would make this
count unreproducible.

1. Tightening `names_the_instrument` to reject prefix matches invalidates the admission of **6**
   verified entries (§2.1 is exact-match and survives; the four in State 1 and
   `L-JOURNEY-COVERAGE-THREE` do not). Four of those six are sound on reading and would need
   re-recording against a named artifact, not re-doing.
2. Teaching `_evidence_kind_ok` to open the file and read `status` reds
   `L-JOURNEY-COVERAGE-THREE` immediately and would have refused it on 2026-08-03.
3. It also hits `L-GROWTH-MAIL`, which has no status field, and would **falsely** red
   `L-LIVE-WORLD-STAFF` if the reader greps text for the word `failed` rather than parsing a field.
   Both are named above so the repair is written against them.
4. It does **not** touch the 284 built-unverified pointers, because `built` never calls the checker.
   149 of them are prose and will be refused the moment they reach `verify`. That is a separate
   defect of the same shape and is the larger number.
