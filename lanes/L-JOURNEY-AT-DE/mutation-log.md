# L-JOURNEY-AT-DE — one walk in the language the Swiss product ships

**Worktree** `/Users/svendaneel/okam/web-atde`, detached at `e34977a`, `core/` populated (10 entries),
`node_modules` symlinked. Nothing pushed, nothing committed, no container.
**Port 4010 was never bound and pid 73160 was never signalled** — it was read once, read-only, in the
pre-flight to confirm it is still held by a foreign `api-server`. Every run in this lane used the
private pair **3823/4823** behind a free-port precheck, with `CI=1` so
`reuseExistingServer: !process.env.CI` can never adopt a sibling's dev server.

Evidence is written **outside the tree it measures**: runs land in `lanes/L-JOURNEY-AT-DE/runs/`, and
the worktree's only modifications are the two files under test.

---

## 1. Which walk, and why that one

**`test/e2e/journeys/margin-statement-week.spec.js`, parameterised. No new journey was written.**

The walk was chosen by measuring how each of the 22 journeys at `e34977a` addresses the DOM, because that — not
its subject — decides whether it can be driven at another language at all:

| journey | text-based locators | `data-test` locators |
|---|---|---|
| **margin-statement-week** | **0** | **76** |
| margin-week-freeze | 0 | 57 |
| margin-supplier-to-plate | **41** — *this table shipped saying `21`; corrected below* | 64 |
| margin-recipe-to-margin | 12 — *undercounted the same way, not re-derived* | 44 |
| events-enquiry-to-settlement | 49 — *likewise not re-derived* | 6 |

**Correction, 2026-08-05 — `margin-supplier-to-plate` carries `41` text-based locator sites, not the
`21` this table was published with.** The `21` came from a raw grep for text-locator calls, and that is
the wrong instrument for this spec in three separately checkable ways:

* it **counted 2 helper definitions** as locator sites — `card()` at line 91 and `field()` at line 98
  are where a text locator is *built*, not a place one is used;
* it **counted 7 fixture filters** — `filter({ hasText: RECIPE | SUPPLIER | ARTICLE })` at lines 278,
  297, 304, 320, 355, 357 and 377 — which match seeded fixture data rather than UI copy, and so are
  locale-invariant for exactly the reason `margin-statement-week`'s lone
  `selectOption({ label: 'Bergen Storkjøkken AS' })` is;
* it **missed 29 call sites** that route Norwegian UI copy *through* those helpers — `card('Leverandører')`,
  `field(items, 'Innkjøpsenhet')`, `field(prices, 'Gjelder fra')`, `recipeField('Utbytte')` and so on.
  The literal is an **argument**, so no grep for `getByRole|getByText|hasText` can see it.

`21 − 2 − 7 = 12` direct sites, `+ 29` routed through helpers = **41** — which is the number §1's prose
already gave (`~41`) while the table beside it said `21`. **The rejection was therefore better justified
than its own table claimed, not worse**, and the direction is what matters: every correction here adds
text locators to the journey that was rejected *for having them*.

**The chosen walk's `0` was re-checked under the corrected method and holds.** `margin-statement-week`
defines no text helper at all, and its single raw match is the fixture `selectOption` at line 244 that
§1 already accounts for. `margin-week-freeze`'s `0` is the same shape (line 123). The selection stands.

**Two cells were *not* re-derived and should not be read as audited.** `margin-recipe-to-margin` defines
two `field` helpers (lines 130 and 289) of precisely the shape that hid 29 sites here, so its `12` is low
by an unmeasured amount; `events-enquiry-to-settlement` likewise builds locators through local `const`s.
Neither was re-measured — neither is a candidate — but both were produced by the instrument just shown
to undercount.

`margin-statement-week` finds **every** element by `data-test` and **none** by visible text, so
changing language moves the assertions and never the selectors. Its one non-`data-test` selection,
`selectOption({ label: 'Bergen Storkjøkken AS' })`, is fixture data rather than UI copy and is
locale-invariant. And it crosses the fiscal surface the brief asked for: a week's net food sales,
theoretical and actual ingredient cost, the covered/uncovered split, four ratios, a finalize, and the
forward-only correction.

**`margin-supplier-to-plate` was considered and rejected.** It carries ~41 Norwegian text-based
locator sites, including *anchored* regexes on card titles (`^\s*Leverandører\s*$`), anchored field
labels, nine `getByRole('button', { name: '<Norwegian>' })`, and
`selectOption({ label: 'kilo' })` — which resolves through `$i('mrg_unit_kilogram')` and is `'Kilo'`
in German. Porting it would have meant rewriting the walk, and the rewrite, not the product, would be
what the German run exercised.

## 2. How the locale is driven — the app resolves it, nothing is handed in

`OKAM_EDITION=ch` is set on the runner and on nothing else. The chain is the real build's:

```
runner env → playwright → webServer command → test/e2e/scripts/dev-server.js:45
  (env: Object.assign({}, process.env, {...}))          → nuxt-ts
  → nuxt.config.js:41  env: { EDITION: OKAM_EDITION }   → inlined into the CLIENT bundle
  → config/edition.js:7  process.env.OKAM_EDITION || process.env.EDITION
  → store/index.js:18   adminLocale: markets[EDITION].locale   → 'de'
  → plugins/i18n.js:24  $i resolves against that locale
```

**The spec sets no locale, seeds no `localStorage`, and passes no message catalogue.** It reads
`process.env.OKAM_EDITION` for one purpose only: to choose which column of *expected* sentences to
assert. If the app stopped deriving its language from the build flag, the German run would fail
rather than pass on the spec's own strings — which is the distinction arms **D2/D3** below exist to
make non-negotiable.

The expected sentences are **written out**, not looked up in `translations/`. A spec that resolved
`mrgs_state_finalized` from the dictionary would follow that dictionary wherever it went and could
never red on a wrong word — it would assert that the page uses the *key*, which is exactly what the
23 copy-blind unit mounts already assert.

## 3. The arms — 8 runs, `runs/<label>.txt` + `runs/<label>.who-answered.json`

**Read the spec-blob column before the verdict column: three different spec blobs ran these arms.**
The lane's own run headers say so and this table did not — `A` ran `820c8473`, `B` and `C` ran an
intermediate draft `7fa75c11`, and everything from `D1` onward ran the shipped blob `8ebe68bc`. Set
out explicitly because the table previously read as one artifact walking every arm, which it is not.

```
label                  edition  spec blob  verdict      what it establishes
A-baseline-no          no       820c8473   PASS         unmodified spec — the worktree and harness are sane
B-parameterised-no     no       7fa75c11   PASS         the parameter changes nothing at the Norwegian edition
C-parameterised-ch     ch       7fa75c11   PASS         15 German/CH literals asserted on the fiscal surface
D1-mutant-de-typo-ch   ch       8ebe68bc   FAIL-ASSERT  ← THE FALSIFICATION
D2-mutant-no-value-ch  ch       8ebe68bc   PASS         the German run does NOT read the Norwegian dictionary
D3-mutant-no-value-no  no       8ebe68bc   FAIL-ASSERT  …and that same mutation IS reachable on this surface
E-reverted-ch          ch       8ebe68bc   PASS         reverted, green again — the red was the mutation
B2-final-no            no       8ebe68bc   PASS         the SHIPPED blob is green at `no`  ← added 2026-08-05
```

### Why `B2-final-no` was added, and what was unproven without it

Until B2, spec blob `8ebe68bc` — the artifact that actually shipped — had run at the Norwegian edition
**exactly once**, as `D3`, which was **red by design**. The green Norwegian run, `B`, was an earlier
draft. So the claim that the parameterisation leaves the Norwegian walk undisturbed was established for
`7fa75c11` and silently carried over to a blob no green run covered; everything after the finalize step,
at `no`, on the shipped artifact, was unproven.

`B2-final-no` closes exactly that gap and nothing wider: same spec sha as arms D1–E, all three
dictionaries at their `e34977a` values (`de cc6e56d4` · `no 03fbae5b` · `en e2298392`), `1 passed
(22.1s)`, pid 70893 in this lane's own worktree on granted port 4823. Ports 3823/4823 as always —
4010 was not bound and pid 73160 was not signalled.

**The intermediate draft `7fa75c11` is gone and cannot be re-derived.** It was hashed with
`git hash-object` from a working tree that has since moved on, and nothing committed, stashed or copied
it. *What* changed between it and `8ebe68bc` is therefore unrecoverable from this repository — the two
shas establish only *that* they differ. That is precisely why B2 was run rather than argued: the gap
could not be closed by inspection.

### D1 — the falsification, in the defect class this floor exists for

`translations/de.ts`, one letter dropped from one word — the same shape as `MVA-samenstilling` for
*sammenstilling*:

```
- mrgs_state_finalized: 'Abgeschlossen',
+ mrgs_state_finalized: 'Abgeschlosen',
```

```
Error: expect(locator).toHaveText(expected) failed
  - locator resolved to <span data-test="state-badge" class="mst__badge mst__badge--open">Offen</span>
  33 × locator resolved to <span data-test="state-badge" class="mst__badge--finalized">Abgeschlosen</span>
```

The DOM is quoted in the failure, and it is German either way — the badge reads `Offen` before the
freeze and the mutated word after it. **No suite in this repository could previously red on that
edit.**

### D2 + D3 — the pair that kills the fallback confound

`utils/i18n.js` falls back `no → en → de`, so a German assertion satisfied by a Norwegian string is a
real failure mode. The same single mutation was run at both editions:

```
mrgs_state_finalized: 'Låst' → 'MUTANT-NO-VALUE'      (translations/no.ts)

  D2  edition=ch  PASS         → the ch run never reads translations/no
  D3  edition=no  FAIL-ASSERT  → …and the mutation is genuinely on this surface
```

D2 alone would have been worthless: a green run proves nothing if the string is unreachable. D3 is
what makes D2's green mean *the German render is sourced from the German dictionary*.

## 4. What is actually guarded now

**15 distinct CH literals across 19 assertion sites** — *this section shipped saying `21`; corrected
2026-08-05, see below* — all on the weekly margin settlement except `flagOn`, which is on the operator
switchboard the walk pulls its own levers from:

`Wöchentlicher Margenabschluss` · `Das Margin-Modul ist für diesen Betrieb nicht eingeschaltet.` ·
`Das Margin-Modul ist für diesen Betrieb an, aber Wochenabschlüsse sind noch nicht eingeschaltet. …` ·
`2026-07-20 verwenden` · `Abschluss öffnen` · `Nicht berechnet` · `Abgeschlossen` ·
`Korrektur öffnen` · `An` — and six money strings
(`40 000,00 NOK`, `12 000,00 NOK`, `14 000,00 NOK`, `36 000,00 NOK`, `4 000,00 NOK`, spend echo).

**Correction, 2026-08-05 — `19` assertion sites, not the `21` published above.** The enumerating pattern
also matched the two `not.toHaveText('—')` assertions, at spec lines 296 (`calculated-at`) and 330
(`finalized-at`). Those assert the **absence** of an em-dash placeholder, carry no CH literal, and are
green at both editions — they are evidence that a timestamp rendered, never evidence that a German word
did. The 19 that survive are the 17 `toHaveText(t.<key>)` sites in the spec (lines 160, 167, 180, 187,
202, 210, 215, 259, 276, 277, 278, 282, 283, 329, 355, 366, 371) plus the 2 `turnOn(page, FLAG, t.flagOn)`
call sites (lines 178 and 185), each of which drives `t.flagOn` into the badge assertion at
`test/e2e/support/flags.js:63`.

Beware a **second** route to `21` on this same spec: a `t\.` line grep also returns 21, because `t.net`
and `t.actual` are additionally interpolated into two step-detail *strings* (lines 269 and 298). Those
are recorded output, not assertions. Both routes overcount; the assertion count is **19**.

**This correction runs against the lane's own claim** — the floor guards two fewer sites than it said it
did — and is written down for that reason. The 15 distinct literals are unaffected.

The step detail the artifact records at ch is itself German, read off the DOM rather than declared:
*"Diese Woche hat bereits einen offenen Abschluss. Eine Woche hat immer nur einen…"*.

**The four ratios are deliberately not in the per-edition table.** `Intl.NumberFormat` renders 30 as
`30,00` in both `no` and `de`, so a per-edition column would have implied a difference that does not
exist.

**The money strings are ISO-coded, and that is the product being right.** `OKAM_EDITION=ch` moves the
market as well as the language, so `marketConfig.currency` is CHF while this fixture's world is still
priced in NOK. `utils/margin/money.js` then takes its cross-currency branch and renders
`40 000,00 NOK` rather than printing a franc symbol over a krone amount. **This walk therefore does
NOT exercise `formatChf`** (`CHF 40'000.00`), which is what a Swiss venue with CHF-priced data would
read. That path needs a CHF-priced fixture world and is not covered here.

## 5. Would this walk have caught the two findings it was calibrated against? **No — neither.**

Stated plainly, because the honest bound is the deliverable:

| finding | where it lives | covered here? |
|---|---|---|
| **receipt** — `receiptModal_orgNumber: 'USt-IdNr. {vat} MwSt'`, a German VAT id printed over a Norwegian organisasjonsnummer (`order.storeVAT`) | `components/molecules/ReceiptModal.vue:39`, reached from `/admin/ongoing` | **No.** This walk never opens `/admin/ongoing`. |
| **supplier** — `mrg_sup_org_number: 'Handelsregisternummer'`, a German register naming a Norwegian field | `translations/de.ts:3247`, rendered on `/admin/margin-suppliers` | **No.** That surface is `margin-supplier-to-plate`'s, the walk rejected in §1. |
| **`MVA-samenstilling`** (the calibration defect) | `translations/no.ts:1943`, printed on `XReportView.vue` | **No.** POS X report, a different surface — and a Norwegian string, not a German one. |

`receiptModal_companyRegistry: 'Handelsregister'` sits one line above the receipt finding, on the same
component, and is equally unguarded.

**So the floor is one fiscal surface out of the seven Tier-1 surfaces `L-IDENTITY-STUB-TESTS` ranks,
and it does not reach either defect that motivated it.** What it does establish is that a German
render can be driven from the build flag, asserted off the DOM, and made to red on a one-letter
change — which is the mechanism the remaining surfaces need, and which did not exist anywhere in this
repository before this lane.

## 6. Findings this lane did not go looking for

**F1 — the harness has no locale or edition concept, and two editions collide on one artifact.**
`journeyDetails()` accepts five keys and none of them is locale; not one field `JourneyRecorder.toJSON`
emits names the market or the language. Two runs of one journey at `no` and `de` would
have written the **same** `artifacts/journeys/<name>.playwright.json`, and the surviving file would
carry nothing a reader could use to tell which build produced it. **Closed here for this journey
only**, by naming the ch artifact `margin-statement-week-de`; the general gap is still open, and any
second journey ported to `de` will hit it again.

**F2 — the one journey that opens the receipt surface cannot run at `de` at all.**
`modal-estate-scroll-lock.spec.js:148` finds the receipt button with
`buttons.find(b => /Kvittering|Receipt/i.test(b.textContent))`. `orderCard_receipt` is `'Quittung'` in
German, so `find` returns `undefined` and `receipt.click()` throws a `TypeError` **inside
`page.evaluate`** — a crash, not an assertion failure. Anyone extending this floor to the receipt
finding must fix that first. Not fixed here: it is a different journey and outside this lane's diff.

**F3 — `setCurrencyFormat({ prefix: 'kr ', suffix: '' })` is unconditional** (`plugins/global-mixin.js:55`),
including on the Swiss build. It is harmless today only because the `isCh` branch at line 166 bypasses
core's formatter entirely — the hardcoded `kr ` is never reached at `ch`. It is a live trap for anyone
who adds a money path that calls core's `priceLabel` directly.

## 7. No copy was fixed, and that is deliberate

The diff is **two files**: `test/e2e/journeys/margin-statement-week.spec.js` and
`test/e2e/support/flags.js`. `translations/` is byte-clean at `e34977a` — verified by
`git status --porcelain` after arm E, and **re-verified by content hash** after `B2-final-no`, whose
header pins all three dictionaries (`de cc6e56d4` · `no 03fbae5b` · `en e2298392`) and prints the dirty
set verbatim as the two files under test and nothing else. Every mutation above was applied, measured
and reverted inside this lane's worktree.

`turnOn()` gained a third parameter, `onLabel`, defaulting to `'På'`. Every existing caller is
unchanged in behaviour; the badge is a **parameter** rather than a dictionary lookup for the same
reason the copy table is, and the header says so.

## 8. Who answered — all eight runs

Every run recorded two independent oracles for the granted port while the fixture was alive: the
server's own `/__fixture/health` testimony and, from outside, `lsof`. All eight agree, all eight name
**this lane's own worktree**, and each has a **different pid** — so no run reused another's server:

```
A 68769 · B 72040 · C 72899 · D1 74967 · D2 76282 · D3 76917 · E 77985 · B2 70893
cwd  /Users/svendaneel/okam/web-atde     health {"ok":true,"port":4823}    granted 4823
```

`B2`'s pid is numerically below the arms that preceded it in time; pids are reused by the OS and carry
no ordering. What matters is that it collides with none of the seven and names this worktree.

Nothing here was served by pid 73160 on 4010.

## 9. How to re-run

```
lanes/L-JOURNEY-AT-DE/run-journey.sh <label> ch      # the German walk
lanes/L-JOURNEY-AT-DE/run-journey.sh <label> no      # the Norwegian one, unchanged
```

The runner aborts if 3823 or 4823 is busy, if `core/` is empty, or if `node_modules` is missing, and
classifies the outcome as `PASS` / `FAIL-ASSERT` / `HARNESS` so a walk that never started can never be
read as a copy verdict.

**Provenance header, corrected 2026-08-05.** The runner used to hash `translations/de.ts` alone and
describe the working tree as a **count** — `"3 tracked path(s) modified"`. That is why arms D2 and D3,
which mutated `translations/no.ts`, could evidence their own mutation only by the count going `2 → 3`:
a cardinality names no file and pins no content, so the arm carrying the mutation and the arm without it
were separable only by trusting the label. And since `utils/i18n.js` falls back `no → en → de`, **all
three** dictionaries are inputs to any German assertion — a German render satisfied by an English or
Norwegian string cannot be ruled out of a record that hashes one of the three. The header now prints
`spec`, `flags`, `de.ts`, `no.ts` and `en.ts` shas and the **verbatim** `git status --porcelain --
':!core'` between `<<<` / `>>>` markers. `flags.js` was added alongside the three dictionaries the review
named, because it is the second of the two files under test and had no hash either. Runs A–E predate the
change; only `B2-final-no` carries the full header.
