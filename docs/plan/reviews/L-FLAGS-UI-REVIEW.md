# Fable review — L-WF-FLAGS-UI, the flag switchboard (2026-08-01)

Read-only review of commit `6b02462`. No file was edited, no suite re-run. Census read from the backend
catalog contributors, gates, resolvers and controller; the frontend screen, board, client, tests and
journeys; and the two neighbouring commits.

## 1. Verdict — sound-with-conditions

**The screen itself is honestly built.** It reaches both routes nothing in the frontend ever wrote, has a
real nav entry walked by clicking, and **refuses to invent values**: unknown is not off, a 403 is not a
missing store, a non-catalog key gets no toggle, and the write response is adopted whole. Its authority
surface exactly matches the API's. The lane's return is accurate in every claim that could be checked,
including the hazard it reported against itself.

**The conditions.** The screen's standing reliability claim — *"effective: off can be relied on"* — is
**false for the one Meals row it draws**; and `meals.module` is presented like every other module master
while it reaches four admin routes and no guest. Both are backend-rooted, but the screen states the false
guarantee on screen **in three languages**, so it owns a share.

Neither bites on shipped configuration today. **The first Meals pilot is the day both go live** — because
the backend's own reach test says a pilot is enabled by exactly the config key that causes the divergence.

## 2. The census — all 18 catalog flags

**Eleven MATCH.** All seven Workforce flags (including the one default-ON, whose reason is recorded), all
three Margin flags — the best-instrumented rows on the screen, whose overruled warning is truthful — and
both Training flags. The publication flag is proven end to end in the lane's own browser journey.

**Six PARTIAL**, all the same cause: Events and Growth are ANDed under a **deployment switch that is not on
this screen** — absent or false in shipped configuration — and neither module registers an effective
resolver. So a flipped-on row can print *Effective: on* while every route answers 404. The screen's cover is
one generic intro sentence, which does exist and does state the right asymmetry. Adequate disclosure, wrong
per-row data.

**One MISMATCH — `meals.module`.** Four store-addressable admin routes only. Quotes and checkout funding read
a **config-only gate and never the row**. Off stops no guest; on enables none. Pinned by the backend's own
reach test, whose name says it: *the store lever lights the store-addressable surface and leaves the rest
dark*.

**Withheld and absent, correctly:** two Workforce, five Training, three Meals money-path flags — each with a
written reason, none on the screen. Every count the six module reviews claimed checks out.

## 3. Defects, most severe first

1. **The standing guarantee is false for Meals.** The client's own comment says an effective-false means the
   gate *will* refuse and a caller may act on it; the on-screen note says the same in three languages. For
   `meals.module` the store-backed flag falls back to **config, not the advertised default**, and Meals
   registers no resolver — so with the module config on and no row, the controller reports effective-false
   while the gate answers on. **That is character-for-character the divergence Margin's resolver was written
   to close**, and its source comment says so.
2. **`meals.module` is the defect class restated.** The screen built to end advertised-but-inert flags offers
   one. Not fixable client-side — the API carries no reach metadata — but the row reads identically to a
   Margin master, which really is one.
3. **Events and Growth chips can print on while the module is deployment-dark**, and the overruled warning
   cannot fire because no resolver contradicts the row.
4. **Risk: the deposits flag is now one click.** The API already granted the write; the screen makes an
   **unenforced money-path precondition** operationally trivial — the backend's own words call arming it
   without proven merchant configuration *a procedural failure* — and no precondition note appears on the row.
5. **Merge hazard confirmed, and worse than reported.** The Events print commit carries **all** of this
   lane's translation keys across three locales, the nav key, the conflict keys, and the entire fixture flag
   store including all eighteen catalog keys. **Reverting it would strip this screen's every visible sentence
   and the journeys' fixture.** A revert must be surgical.
6. Minor: the 403 branch hides the reload control, so a transient 403 offers no retry short of a page reload.

## 4. Assertions that could pass against broken code

- The three-locale note test asserts only that the strings are truthy. **It passes if the note is reworded to
  claim the opposite**, and it never touches the wrapper, so it also passes if the page stops rendering it.
  The note's current content is the thing defect 1 indicts.
- The flag-lever journey counts rows and **never asserts the count**. Six module titles are pinned; the
  eighteen flags are not. A catalog that shrank to one flag per module stays green.

**The three judged items.**
*Client consolidation* — behaviour-identical: same transport chain, same routes; the only observable change
is the thrown error type, which the sole Growth caller swallows untyped and no branch anywhere receives. The
new type is **more** correct: this controller's message body read through the old type became "HTTP 400".
*Fixture change* — the right shape **where the product holds the lever**, and the sweep copied it for Events;
it does not generalise to config-gated surfaces, and the sweep correctly used a standing dark journey for
Meals instead. Cost worth naming: **every gated journey's setup now depends on the switchboard page**, so a
switchboard regression fails many journeys at their first step.
*The strengthened assertion* — genuinely falsifiable: deleting the guard makes the synthetic body yield a
non-null value, failing two assertions. The body is synthetic precisely to make the guard load-bearing, and
the test documents why.

## 5. What could not be determined

- **The seven-mutation record.** The lane directory preserves only e2e logs; no mutation log survives, so
  "7 mutations, 6 red" rests on the return text. The survivor's fix is verifiable in the committed test and
  is sound; the other six are not independently checkable.
- Suite counts — not re-run; nothing read contradicts them.
- **Live deployment configuration.** Only the repository's settings were read, so "latent" is a repo-truth
  claim, not a fleet claim.
- Real-backend journey behaviour: the browser proof runs against the fixture, whose effective value for one
  flag diverges from the real resolver. Harmless to this journey, which exercises a different flag — but the
  fixture is not evidence about resolver-backed rows.
