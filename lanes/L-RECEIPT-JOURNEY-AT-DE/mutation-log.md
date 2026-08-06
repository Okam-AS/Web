# L-RECEIPT-JOURNEY-AT-DE — the receipt, read in German, and made to red

**Worktree** `/Users/svendaneel/okam/web-rcptde`, detached at `e34977a`, `core/` populated (10 entries),
`node_modules` symlinked. Nothing pushed, nothing committed, no container.
**Port 4010 was never bound and pid 73160 was never signalled** — read once, read-only, in the
pre-flight, which confirmed it is still held by a foreign `node test/e2e/fixture/api-server.js`.
Every run in this lane used the private pair **3847/4847** (the sibling holds 3823/4823) behind a
free-port precheck, with `CI=1` so `reuseExistingServer: !process.env.CI` can never adopt another
lane's server.

Evidence is written **outside the tree it measures**: runs land in
`lanes/L-RECEIPT-JOURNEY-AT-DE/runs/`, and the worktree's only modifications are the three files
under test.

The edition chain, the three-arm falsification shape, the private-port discipline and the
who-answered receipt are **inherited from `lanes/L-JOURNEY-AT-DE/mutation-log.md`**, not re-derived.

---

## 0. THE BRIEF'S PREMISE IS FALSE, AND THE MEASUREMENT IS ARM F

The brief states that `modal-estate-scroll-lock.spec.js:148` cannot open the receipt at `de` — that
`buttons.find(b => /Kvittering|Receipt/i.test(b.textContent))` returns `undefined` against
`orderCard_receipt: 'Quittung'` and `receipt.click()` throws a `TypeError` inside `page.evaluate`.

**It does not. That regex was run at `OKAM_EDITION=ch`, unchanged, and the walk passed** — arm **F**,
`runs/F-oldlocator-ch.txt`, `RESULT F-oldlocator-ch edition=ch PASS rc=0`, with the artifact
confirming the run really was German (`heading "Quittung"`).

`b.textContent` is not the label. The button is

```html
<button class="action-btn"><span class="material-icons">receipt</span> {{ $i('orderCard_receipt') }}</button>
```

and a Material Icons glyph is a **ligature** — the icon's own name is a live text node. Captured off
the DOM at `ch` and recorded in every run's step-3 detail:

```json
{"textContent":"\"receipt\n        Quittung\n      \"","label":"Quittung","icon":"receipt",
 "oldRegexMatches":true,"oldRegexMatchesLabelAlone":false}
```

`oldRegexMatches: true` · `oldRegexMatchesLabelAlone: false`. The selector matched the **icon**, in
every language there will ever be. At `no` the same capture reads
`"oldRegexMatchesLabelAlone":true` — which is why nobody could have told the two apart by running it.

**This retires `F2` in the sibling's log**, which recorded the TypeError as fact and told the next
lane to fix it first. It was a reading of the source, not a run of it.

**The locator is still replaced**, for the sharper reason: it resolved for a cause unrelated to what
it claims to match. Rename the icon and it stops resolving **in every language at once**, with a
`TypeError` naming neither copy nor icons. A third alternative in the regex would not have helped.
`[data-test="order-action-receipt"]` is neither copy nor decoration.

**The exit criterion is unaffected and is met.** It asks for a walk that completes at the CH locale,
asserts a rendered German literal on the receipt, and reds when that string is replaced. Arms C, D1,
D2, D3, E do exactly that.

## 1. The diff — three files, no copy fixed

```
components/molecules/OrderCard.vue                   +8    data-test="order-action-receipt"
test/e2e/fixture/world.js                            +10   storeVAT on the ongoing orders
test/e2e/journeys/modal-estate-scroll-lock.spec.js   +204  parameterised by edition; the receipt step
```

`translations/` is **byte-clean at `e34977a`** — `git status --porcelain -- translations/` returns
zero lines after arm E. Every mutation below was applied, measured and reverted inside this worktree.

**`storeVAT` is why the receipt has a statutory header at all.** `ReceiptModal.vue:36` puts the
org-number line and the register name behind `v-if="order.storeVAT"`, and the fixture's fourteen
ongoing orders carried no such field — so a journey opening the receipt would have reported a clean
German surface while saying nothing about the two lines the findings are about.
`core/models/order/order.ts:50` declares `storeVAT` on the order, so this is the field the API
supplies, not a prop invented for a test. The value is a **Norwegian** organisasjonsnummer
(`912345678`), because that is what the wrong German label is printed over.

## 2. How the locale is driven — the app resolves it, nothing is handed in

`OKAM_EDITION=ch` is set on the runner and on nothing else:

```
runner env → playwright → webServer command → test/e2e/scripts/dev-server.js
  (env: Object.assign({}, process.env, {...}))          → nuxt-ts
  → nuxt.config.js:41  env: { EDITION: OKAM_EDITION }   → inlined into the CLIENT bundle
  → config/edition.js:7  process.env.OKAM_EDITION || process.env.EDITION
  → store/index.js:18   adminLocale: markets[EDITION].locale   → 'de'
  → plugins/i18n.js     $i resolves against that locale
```

The spec sets no locale, seeds no `localStorage` and passes no catalogue. Playwright's per-test
context is a fresh profile, so `store/index.js:93`'s persisted `adminLocale` is absent and the
edition default is what the app resolves. The expected words are **written out**, not looked up in
`translations/` — a spec that resolved `receiptModal_title` from the dictionary would follow that
dictionary wherever it went.

## 3. The arms — 9 runs, `runs/<label>.txt` + `runs/<label>.who-answered.json`

```
A-baseline-no          edition=no  PASS         unmodified spec at HEAD — worktree and harness sane
B-parameterised-no     edition=no  PASS         the parameter changes nothing at the Norwegian edition
C-parameterised-ch     edition=ch  PASS         12 receipt labels asserted in German
D1-mutant-de-typo-ch   edition=ch  FAIL-ASSERT  ← THE FALSIFICATION
D2-mutant-no-value-ch  edition=ch  PASS         the German run does NOT read the Norwegian dictionary
D3-mutant-no-value-no  edition=no  FAIL-ASSERT  …and that same mutation IS reachable on this surface
F-oldlocator-ch        edition=ch  PASS         ← the brief's premise, measured; see §0
E-reverted-ch          edition=ch  PASS         reverted, green again — the red was the mutation
G-final-no             edition=no  PASS         the shipping spec, still green at the Norwegian edition
```

**Every arm is readable back from CONTENT, not from its label.** Each run header hashes the spec and
both dictionaries, so the table below is `awk`-able out of `runs/*.txt` and no arm has to be taken on
trust:

| arm | spec | de.ts | no.ts |
|---|---|---|---|
| C-parameterised-ch | `6a726ab9a` | `cc6e56d4b` | `03fbae5be` |
| D1-mutant-de-typo-ch | `6a726ab9a` | **`b8274f207`** | `03fbae5be` |
| D2-mutant-no-value-ch | `6a726ab9a` | `cc6e56d4b` | **`3f341f27f`** |
| D3-mutant-no-value-no | `6a726ab9a` | `cc6e56d4b` | **`3f341f27f`** |
| F-oldlocator-ch | **`1f1f3d727`** | `cc6e56d4b` | `03fbae5be` |
| E-reverted-ch / G-final-no | `2a1a23cf8` | `cc6e56d4b` | `03fbae5be` |

D2 and D3 are **byte-identical inputs** and differ only in `OKAM_EDITION` — which is what makes their
opposite outcomes mean something about the build flag rather than about two different trees.

### D1 — the falsification, in the defect class this floor exists for

`translations/de.ts:1231`, one letter dropped from one word — the same shape as `MVA-samenstilling`
for *sammenstilling*:

```
- receiptModal_orderNumber: 'Bestellnummer:',
+ receiptModal_orderNumber: 'Bestelnummer:',
```

```
Error: expect(locator).toHaveText(expected) failed
    - Expected  - 1
    + Received  + 1
    -   "Bestellnummer:",
    +   "Bestelnummer:",
        "Bestellt:",
    24 × locator resolved to 6 elements
```

The DOM is quoted in the failure and it is German either way. **No suite in this repository could
previously red on that edit.**

### D2 + D3 — the pair that kills the fallback confound

`utils/i18n.js` falls back `no → en → de`, so a German assertion satisfied by a Norwegian string is a
real failure mode. The same single mutation was run at both editions:

```
receiptModal_orderNumber: 'Bestillingsnummer:' → 'MUTANT-NO-VALUE'   (translations/no.ts:1253)

  D2  edition=ch  PASS         → the ch run never reads translations/no
  D3  edition=no  FAIL-ASSERT  → …and the mutation is genuinely on this surface
```

D2 alone would have been worthless: a green run proves nothing if the string is unreachable. D3 is
what makes D2's green mean *the German receipt is sourced from the German dictionary*.

## 4. What is actually guarded now

**12 receipt labels, of which 10 are language-distinguishing**, all inside the receipt modal:

| | ch | no |
|---|---|---|
| heading | `Quittung` | `Kvittering` |
| detail labels | `Bestellnummer:` `Kunde:`\* `Zahlung:` `Liefermethode:` `Bestellt:` `Status:`\* | `Bestillingsnummer:` `Kunde:`\* `Betaling:` `Leveringsmåte:` `Bestilt:` `Status:`\* |
| item columns | `Artikel` `Anz.` `MwSt` `Preis` | `Vare` `Ant.` `Mva` `Pris` |
| total | `Gesamt` | `Totalt` |

\* `receiptModal_customer` and `common_status` are the **same word in both dictionaries**. They stay
in the list because the list is the receipt's whole label row and a partial list stops guarding the
rows it drops — but they distinguish nothing about language and are not counted as German coverage.

The detail labels are asserted as an **ordered complete list**, so a row that disappears is a failure
too. The org NUMBER is asserted (`toContainText('912345678')`); the words beside it are not — see §5.

## 5. Would this floor have caught the two German findings? **No — and the reason is structural**

| finding | rendered at ch, off the DOM | caught? |
|---|---|---|
| `receiptModal_orgNumber: 'USt-IdNr. {vat} MwSt'` | `USt-IdNr. 912345678 MwSt` | **No** |
| `receiptModal_companyRegistry: 'Handelsregister'` | `Handelsregister` | **No** |

A rendered-literal floor reds when a string **drifts**. It cannot red on a string that is **wrong at
birth**, because whoever writes the assertion copies what the page says — both of these are
well-formed German, and a floor author would have written them down verbatim. Catching them needs an
instrument that ties the label to the *jurisdiction of the number beside it*, which is a different
check from this one.

So they are **recorded, not asserted**, as `defect` findings on the ch artifact with the DOM quoted.
Pinning today's literal would make this floor **red on the correction** that is landing on another
branch — a floor must red when copy drifts and must not fight a fix.

**What the ch run did find, unprompted, is a third defect on the same surface**, and it is larger
than either:

> `plugins/global-mixin.js` — `paymentTypeLabel` (:82), `deliveryTypeLabel` (:97) and
> `orderStatusLabel` (:134) are `switch` statements returning **hardcoded Norwegian string literals
> with no `$i` and no dictionary key**, so no translation can reach them in any language.

Three of the Swiss receipt's six values are therefore Norwegian, under German labels. Rendered at
`ch` in arm E:

```json
[{"label":"Bestellnummer:","value":"1004 (order-4)"},
 {"label":"Kunde:","value":"Gjest 4"},
 {"label":"Zahlung:","value":"Ukjent"},
 {"label":"Liefermethode:","value":"Hent selv"},
 {"label":"Bestellt:","value":"01.08.26 11:03"},
 {"label":"Status:","value":"Forespurt"}]
```

Also recorded rather than asserted, for the same reason: asserting `Hent selv` at `ch` would pin a
defect. `components/molecules/OrderModal.vue:95` carries the same shape (`Org.nummer: {{ … }}`,
untranslated in the template).

## 6. Findings this lane did not go looking for

**F1 — the harness still has no locale or edition concept.** `journeyDetails()` accepts five keys and
none is locale; nothing `JourneyRecorder.toJSON` emits names the market or the language. Two runs of
one journey at `no` and `de` would overwrite one artifact. Closed here for this journey only, by
naming the ch artifact `modal-estate-scroll-lock-de` — the same local workaround the sibling applied,
and the same general gap. **This is now two journeys deep; it should be fixed in the recorder.**

**F2 — the shape classifier cannot tell a crash from a red.** A `TypeError` inside `page.evaluate`
and a failed `expect` both surface as `1 failed`, so the runner's `FAIL-ASSERT` label would have been
applied to arm F had the premise held. `HARNESS` only catches a run that never started. Stated here
because it is exactly the class of misreading that produced the premise in §0.

**F3 — `test/e2e/support/admin.js:33` signs in with a text locator**,
`getByRole('button', { name: /Send kode|Send|senden/i })`. It carries a German alternative today, so
it works at `ch`; it is the same allowlist pattern this lane replaced on the receipt button, one
language from breaking, and it sits on the door every admin journey walks through.

## 7. Who answered — all nine runs

Two independent oracles per run for the granted port, captured while the fixture was alive: the
server's own `/__fixture/health` testimony and, from outside, `lsof`. All nine agree, all nine name
**this lane's own worktree**, and each has a **different pid** — no run reused another's server:

```
A 31950 · B 37922 · C 50531 · D1 55207 · D2 56356 · D3 57974 · F 60297 · E 63599 · G 65274
cwd  /Users/svendaneel/okam/web-rcptde    health {"ok":true,"port":4847}    granted 4847
```

Nothing here was served by pid 73160 on 4010.

## 8. How to re-run

```
lanes/L-RECEIPT-JOURNEY-AT-DE/run-journey.sh <label> ch      # the German walk
lanes/L-RECEIPT-JOURNEY-AT-DE/run-journey.sh <label> no      # the Norwegian one
```

The runner aborts if 3847 or 4847 is busy, if `core/` is empty, or if `node_modules` is missing, and
classifies the outcome as `PASS` / `FAIL-ASSERT` / `HARNESS` — subject to F2 above.
