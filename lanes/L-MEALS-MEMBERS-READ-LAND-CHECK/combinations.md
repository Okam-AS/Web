# L-MEALS-MEMBERS-READ-LAND-CHECK — what an operator sees in each landing combination

Read-only. Nothing landed, nothing restored, no branch edited. Every figure below is re-derived by
`derive.sh` into `derive.txt`; each claim cites the section (F1–F11) that produces it. Everything is
read **by object** (`git show <ref>:<path>`), never from a working tree — the api checkout sits on
`lane/meals-grace-pins` and is divergent.

The operator throughout is a **company admin on `/admin/meals-companies`** who has selected a
programme. That is the only caller of either endpoint (fixture `meals.js:505`).

---

## 1. This one is a real pair (the two earlier "pairs" were not)

| | ahead of `feature/restaurant-modules` | behind | fast-forward? |
|---|---|---|---|
| backend `lane/meals-members-read` `086ac34f` | **1** | **0** | yes, clean (F2) |
| frontend `lane/fe-meals-pretick-walked` `9fbed80` | **4** | 2 | no (F2) |

Neither half is an ancestor of the merge candidate and neither is production-identical to it, so
unlike the two pairs measured earlier tonight this is a genuine two-repo dependency (F2, F3).

`GET /v1/meals/programs/{programId}/members` is **absent from `feature/restaurant-modules`** —
`MealsProgramController` there binds four verbs, and the GET is the fifth, present only on
`lane/meals-members-read` (F3). Across every ref in both namespaces of the api repo, exactly one
carries `ListProgramMembersAsync` (F3). The brief's premise holds.

The frontend chain, oldest last (F2):

```
9fbed80  the journey walks the pretick            (lane/fe-meals-pretick-walked)
d320105  the policy assertion names its sentence  (lane/fe-meals-journey-locator)
2e3f39d  the panel arrives showing who is enrolled (lane/meals-enrol-pretick)  <-- deletes the note
802041a  an employee can be enrolled              (lane/meals-enrol-ui)        <-- adds the control
```

---

## 2. The four combinations collapse to **three** — and not on the axis that was expected

The brief anticipated that *frontend alone* and *neither* might be the same world. **They are not.**
What actually collapses is **neither ≡ backend alone.**

The reason is `802041a`. The enrolment control does not exist on the merge candidate *at all* — it
arrives with the same unmerged chain that later deletes the note. Counting enrolment test-hooks in
the panel (F5):

| ref | `data-test="enrol…"` hits |
|---|---|
| `feature/restaurant-modules` | **0** |
| `lane/fe-meals-pretick-walked` | 8 |
| `candidate/fe-compose-2026-08-05` | 8 |

So "neither lands" is not *a panel with a protective note*. It is **no enrolment section on the page
whatsoever** — and the note that was deleted was never on the merge candidate either. Both
`meals_enrol_no_read_note` and its replacement are absent from `feature/restaurant-modules` (F6). The
deleted note only ever protected the unmerged chain.

---

## 3. What an operator sees

### A — neither lands, and B — backend alone: **the same screen**

The manager opens `/admin/meals-companies`, picks a company, sees the programmes table with its
**Påmeldt** (Enrolled) column showing a number, and can create a programme and publish a policy
version. There is **no enrolment control, and no sentence anywhere saying enrolment exists or is
missing**. The count is the only thing on screen about who is enrolled, and there is no way to change
it. An employee who has claimed an invitation is refused at the till.

Landing the backend alone changes **nothing a person can see, in either surface**. The route answers
and no code calls it: no ref in the web repo that is a landing candidate references
`ListProgramMembers` except the unmerged meals chain itself (F9). The backend half also adds the
`MEALS_NOT_ENROLLED` reason code — but **no web ref renders it**, on the merge candidate or on either
frontend branch (F11-adjacent check), so the employee's refusal at the till is equally bare with it
and without it.

**B is a dead route and a dead reason code.** It is invisible, and it is harmless.

### C — frontend alone: the control is permanently withheld, and all three sentences on screen are wrong

This is the world that matters, and **it is the one already staged** (§4).

Twelve of the thirteen routes `admin-client.js` calls exist on `feature/restaurant-modules`; only the
GET is missing (F4). So the page does **not** look broken. The company loads, the member list loads,
the invitation list loads, the programmes table fills with Company Meals data. Then, in the
enrolment section directly beneath that populated table, the manager reads three sentences:

> **1.** "The list you submit is the WHOLE enrolment, not an addition: anyone left unticked is
> un-enrolled. **Tick everybody who should be enrolled afterwards.**"

Rendered unconditionally — no `v-if` (F7). It instructs the manager to tick boxes that are not on the
page.

> **2.** "We could not read who is enrolled right now, so the control is withheld. Saving a list we
> cannot compare against would un-enrol people without ever showing them. **Reload and try again.**"

This is the replacement note. It is **not** missing — the brief's "nothing on screen saying why" is
wrong on the facts (F6). The defect is worse than silence: the sentence it replaced stated a
*permanent* property of the product, and this one states a *transient* failure and issues a retry
instruction. The manager reloads. It never works. Nothing tells them it never will.

> **3.** "**This server did not answer as Company Meals. We do not know whether the module is here.**"

This is `meals_refusal_absent`, and it fires for a precise reason: a *dark* Meals route answers 404
with `application/problem+json`, while an **unrouted path answers 404 with an empty body**, and the
client keys the split on the problem code (F8). A route that does not exist is indistinguishable from
a server that is not Meals. On the merge candidate Meals **is** deployed and answering — the
programmes table immediately above is populated by it.

**So the screen contradicts itself.** A manager is told the module may not be installed while looking
at that module's data, and is pointed at the wrong remedy (reload) and the wrong cause (a missing
deployment) for what is actually one missing route. The plausible next action is escalating "Company
Meals isn't deployed at this venue" about an installation where four of its five programme routes
answer.

This is the same defect class the workforce invite lane fixed by looking at a screenshot rather than
at selectors — "the panel still said 'no login is attached' directly above a band explaining that
somebody had just signed in."

**What C is not:** it is not a data-loss risk. The control is genuinely withheld — `enrol-known`, the
candidate boxes and `enrol-submit` are all absent, and `submitEnrol` returns early on
`enrolledUnknown` (F7). The design's refusal to offer an unticked control is correct and holds. C
costs an operator's time and trust, not anybody's lunch.

### D — both land

The panel reads the enrolled set back, preticks from that read and from nothing else, and submits the
revision that read answered with. The capability works.

---

## 4. C is not hypothetical — it is already composed

`lane/meals-enrol-pretick` (`2e3f39d`) — the commit that deletes the note **and** adds the
`ListProgramMembers` call — **is already merged into `candidate/fe-compose-2026-08-05`** (`9f7d8df`),
which carries 103 commits ahead of the merge candidate (F9). The walk lane `9fbed80` is not in it, but
that changes nothing an operator sees: everything above `2e3f39d` adds journey steps and a test-hook
rename, and the composed candidate shows the same 8 enrolment hooks and the same replacement note
(F5, F6).

`lane/meals-members-read` is merged into nothing.

**As things stand, combination C is what ships.**

---

## 5. No guard catches it

- **The fixture-divergence check cannot.** Both endpoints are deliberately **unanchored**, and
  `fixture/meals.js:511` states why in prose: the GET "is on `lane/meals-members-read` and not on
  `feature/restaurant-modules`, so an anchor would red the divergence check against the branch most
  lanes point at." The guard is green *because* the route is missing (F10).
- **The e2e journey cannot.** It runs `@fixture` only with `E2E_API_BASE_URL` unset, and the fixture's
  `E2E_MEALS_PROGRAM_MEMBERS_READ` knob defaults to `answered` — so by default the harness serves a
  route the merge candidate does not have. The mutation log's "the journey's default arm reds" is
  true of a run against a real backend, which this harness does not perform.
- **The unit suites cannot** — 130 tests over 5 suites all pass on the frontend branch alone.

C is **green in CI and self-contradicting on screen**. That is C5 in its literal form, and C3 in the
form its own text anticipates: *"a frontend that reads a route the branch does not have… arriving
through a merge rather than through a diff."*

---

## 6. Symmetry with the workforce invite/revoke pair: **no — inverted**

Same shape on the refs: both workforce halves are 1 ahead, 0 behind (F11). Same substitution in the
copy: both frontends replaced a permanent-absence note with a transient-failure note.

But **the quiet direction is opposite**, and that is what the sequencing turns on.

| | quiet half-landing | loud half-landing |
|---|---|---|
| **workforce invite** | **frontend alone** — `loadInvitations` catches every error and sets the list to `null`; deliberately **"Silent rather than a toast"** (F11). No banner, no notification. | backend alone — the panel keeps asserting in three locales that "the API has no such routes" while they exist: a false claim, but one that *understates* capability. |
| **meals enrolment** | **backend alone** — a route with no caller and a reason code no surface renders. Invisible **and harmless**. | **frontend alone** — three warn banners, one naming a cause that is false. |

So each pair's dangerous direction is the other's safe one:

- The invite pair's frontend can ride ahead relatively cheaply. It fails quietly, but it fails
  *honestly by construction* — the null-never-empty rule means the one answer a manager acts on
  ("no code is outstanding") cannot be manufactured by a failed read, and the panel names no cause it
  cannot support.
- **The meals pair's frontend riding ahead is the expensive direction.** It is loud, but the loudness
  misdirects: it names a cause (the module may not be deployed) that is false on the merge candidate,
  and a remedy (reload) that can never work.

**The meals half-landing is the more dangerous of the two — and it is the one already staged.**

---

## 7. Answer to the exit question

**Can `lane/fe-meals-pretick-walked` land without `lane/meals-members-read`?**

Physically yes — it composes and every suite is green. What it costs is stated above and is not a
suite fact: **a manager gets an enrolment panel that instructs them to tick boxes that are not there,
tells them to reload for a route that will never exist, and tells them Company Meals may not be
installed on a screen already full of Company Meals data.** The backend half landing alone costs
nothing and shows nothing.

**Sequencing is Sven's call.** This lane names the costs and makes no recommendation. Two things
belong with the decision:

1. **C is the default today.** Not deciding is deciding for C, because `2e3f39d` is already in
   `candidate/fe-compose-2026-08-05` and the api half is merged nowhere.
2. **If C is chosen deliberately**, the third sentence is the one to change — `meals_refusal_absent`
   is honest about an empty-bodied 404 in general but false about *this* one, where the module
   demonstrably answered four other routes on the same page load. Not this lane's edit to make.

## Evidence

- `derive.sh` / `derive.txt` — every figure, re-runnable (F1–F11).
- `../L-MEALS-PRETICK-NEVER-WALKED/mutation-log.md` — the two arms, eleven runs, no harness-shape
  failure; the withheld pair caught in real mounted DOM at `2e3f39d`.
- `refs/heads/lane/meals-members-read` `086ac34f` (api) · `refs/heads/lane/fe-meals-pretick-walked`
  `9fbed80` and `refs/heads/candidate/fe-compose-2026-08-05` `9f7d8df` (web).
