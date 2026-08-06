# L-MIXIN-LABELS-TRANSLATE — the receipt's three values, routed, and made to red on a corrupted key

**Worktree** `/Users/svendaneel/okam/web-mixinlabels`, branch `lane/mixin-labels-translate`, HEAD
**`627e34a`**, tree clean (`git status --porcelain -- ':!core'` = 0 paths). `core/` populated (10
entries), `node_modules` symlinked. Nothing pushed, no shared branch touched, no container started,
no container of anyone else's signalled.

**Base is `4465d02`**, the sibling payment lane's `built` commit, not `e34977a`. §1 gives the reason.

**Ports: 3853 / 4853 — this lane's own pair, and NOT 3847/4847.** Port **4010 was never bound and
pid 73160 never signalled**; it is still held by that foreign `api-server.js`, and every run header
records `web=3853 fixture=4853`. 3847/4847 belong to `L-RECEIPT-JOURNEY-AT-DE`, whose runner is
still on disk with a documented re-run recipe — two lanes sharing one pair is the same failure the
4010 rule exists to prevent, one level up. 3853/4853 appear in no runner under `lanes/*/` (the
claimed set is 3061 3071 3777-3779 3823 3841 3847 3889 3971 4010 4061 4071 4777-4779 4823 4841 4847
4889 4971) and were free at start, behind a precheck, with `CI=1` so `reuseExistingServer: !CI` can
never adopt another lane's server.

**EVERY NUMBER BELOW NAMES THE COMMIT IT CAME FROM**, and every suite number was taken in this
worktree with **0 modified paths**, so none of them can be describing another lane's untracked files.

Evidence is written **outside the tree it measures**: `lanes/L-MIXIN-LABELS-TRANSLATE/`.

---

## 0. THE DEFECT, AND WHY THERE WAS NOTHING TO REPAIR

`plugins/global-mixin.js` — `deliveryTypeLabel` (:97) and `orderStatusLabel` (:134) were `switch`
statements returning Norwegian string **literals**. Not a broken lookup: **no lookup**, no `$i`, no
key. `nuxt.config.js` serves `locales: isCh ? ['de'] : ['en','no']`, so German is not a third
language on the Norwegian product — it is the entire Swiss product. Rendered on the receipt at
`OKAM_EDITION=ch`, arm **A**, before any change on this lane:

```json
[{"label":"Bestellnummer:","value":"1004 (order-4)"},
 {"label":"Kunde:","value":"Gjest 4"},
 {"label":"Zahlung:","value":"Unbekannt"},
 {"label":"Liefermethode:","value":"Hent selv"},
 {"label":"Bestellt:","value":"01.08.26 11:03"},
 {"label":"Status:","value":"Forespurt"}]
```

German labels, Norwegian values, on a document the product prints as a fiscal artifact. **C6.**

## 1. WHY THE BASE IS THE SIBLING'S COMMIT

The brief names all three functions. `paymentTypeLabel` was already routed by
`L-PAYMENT-LABEL-UKJENT` at `4465d02`, whose parent is `e34977a` — committed on its own lane branch,
returned `built`, unmerged. Branching off `e34977a` and fixing all three would have re-typed that
lane's work into a guaranteed conflict on one file. Branching off `4465d02` makes the exit criterion
true of one tree and the merge a descendant. `Zahlung: Unbekannt` above is that lane's fix already
working — German, with only the fixture's missing `paymentType` keeping it on the fallback (§4).

**The brief's ordering instruction was followed and it mattered.** Routing first, then asking what
was missing: `Enums/DeliveryType.cs` declares seven members and all seven are mapped;
`Enums/OrderStatus.cs` declares eight and the switch already carried all eight. Nothing was missing,
so nothing had to be translated — had coverage been widened first, every added member would have
been another Norwegian literal arriving on a German receipt.

## 2. The diff — two commits, kept separable

```
fff21f6  the receipt floor, INHERITED VERBATIM   OrderCard.vue +8 · world.js +10 · spec +198 -6
627e34a  this lane's work                        7 files, +536 -33
```

`L-RECEIPT-JOURNEY-AT-DE` returned `built` but **committed nothing** — its three files exist only as
working-tree modifications in `/Users/svendaneel/okam/web-rcptde`. They are taken here byte-exact
(`OrderCard.vue 548e4267…`, `world.js 5e5ccd06…`, `spec 2a1a23cf…`, the last being the sha that
lane's own log names as its shipping arm), in their own commit, so a reviewer can see which bytes
are this lane's. If that lane lands its files separately the content is identical.

This lane's own commit, `git show --numstat 627e34a`:

```
+88  -21   plugins/global-mixin.js                              two maps, both methods, two exports
+11   -0   test/e2e/fixture/world.js                            paymentType on the ongoing orders
+78  -12   test/e2e/journeys/modal-estate-scroll-lock.spec.js   the six VALUES asserted
+347  -0   test/order-label-dictionaries.test.js                new, 120 assertions
+4    -0   translations/no.ts · en.ts · de.ts                   four new keys per dictionary
```

## 3. ZERO NORWEGIAN DRIFT, MEASURED RATHER THAN ASSERTED

`measure.py` reads the **pre-lane switches out of the git object `e34977a:plugins/global-mixin.js`**,
the **maps out of the shipped file**, and the **words out of `translations/no.ts`**, then compares.
Neither side is hand-written. `measured.json`, re-run at `627e34a`:

```
norwegian_drift_count            : 0        (15 cases + both defaults)
old_switch_case_count            : delivery 7, status 8
delivery_backend_members_unmapped: []       status_backend_members_unmapped: []
delivery_mapped_non_members      : ["GroupedHomeDelivery"]
status_mapped_non_members        : []
keys_missing_from_a_dictionary   : []       duplicate_keys: {no: [], en: [], de: []}
german_equals_norwegian          : ["orders_deliveryWoltDrive","orders_deliveryWoltMarketplace"]
```

**Sixteen distinct keys are involved; twelve already existed** in all three dictionaries, **and
`pages/admin/orders.vue:550-567` already builds the status and delivery FILTERS on the same page out
of exactly those keys** — so the board's filter answered in German while the card beside it answered
in Norwegian, from two copies of one vocabulary. Four keys are new and carry the switch's own words,
placed alphabetically inside the existing blocks because a large translation merge is pending on the
shared checkout.

**The key counts, taken with ONE counter along the whole chain**
(`measured.json.dictionary_key_counts_along_the_chain`), because a count is comparable only to
another count taken the same way:

```
e34977a  no 4816  en 4781  de 4781
4465d02  no 4821  en 4786  de 4786      +5, the parent lane
627e34a  no 4825  en 4790  de 4790      +4, this lane
```

The brief quotes 4817/4782/4782 at the base where this counter reads 4816/4781/4781 — **a uniform
off-by-one in the method, not a missing key**; the two agree on every delta. `duplicate_keys` is
empty in all three at every point, which is the claim that actually matters.

`german_equals_norwegian` is stated rather than hidden: **`Wolt Drive` and `Wolt Marketplace` are
proper nouns, identical in both dictionaries**, so those two members prove nothing about language
and their German arms pass against the old switch too (§6).

## 4. WHY THE FIXTURE GAINED A `paymentType`

The fourteen ongoing orders carried no `paymentType`, so `paymentTypeLabel` missed every member of
its map and the receipt's payment row could only ever exercise the **unknown fallback** — a walk
asserting `Unbekannt` would say nothing about whether the seventeen mapped members reach the
dictionary. Exactly the reasoning that put `storeVAT` on the same fixture. `PayInStore`, because
these are live orders awaiting pickup and it is one of the ten the pre-existing switch already
carried, so the Norwegian arm pins a word this change did not move either.

## 5. The arms — 9 runs, `runs/<label>.txt` + `runs/<label>.who-answered.json`

Read back from the files on disk, not from a transcript:

```
A-baseline-ch     ch  PASS         the defect, measured: Hent selv / Forespurt under German labels
B-fixed-ch        ch  PASS         6 values asserted; the 3 routed read German
C-fixed-no        no  PASS         no Norwegian regression
D1-mutant-de-ch   ch  FAIL-ASSERT  ← THE FALSIFICATION
D2-mutant-no-ch   ch  PASS         the German run does NOT read the Norwegian dictionary
D3-mutant-no-no   no  FAIL-ASSERT  …and that same mutation IS reachable on this surface
E-oldswitch-ch    ch  FAIL-ASSERT  ← THE NEGATIVE CONTROL
F-final-ch        ch  PASS         reverted, green again — the reds were the mutations
G-final-no        no  PASS         the shipping tree, still green at the Norwegian edition
```

Every arm is readable back from **content**: each run header hashes the spec, the mixin, all three
dictionaries and the fixture, so this table is `grep`-able out of `runs/*.txt` and no arm has to be
taken on trust. Re-derived from those files, not from memory:

| arm | mixin | de.ts | no.ts | spec |
|---|---|---|---|---|
| A-baseline-ch | `78befd758` | `1ab0e46db` | `e696175c9` | `2a1a23cf8` |
| B-fixed-ch / C-fixed-no | `23eafd4bb` | `1a5e2f8f2` | `bac24ce17` | `28b9c0177` |
| D1-mutant-de-ch | `23eafd4bb` | **`be88dcc0e`** | `bac24ce17` | `28b9c0177` |
| D2-mutant-no-ch / D3-mutant-no-no | `23eafd4bb` | `1a5e2f8f2` | **`23807e9ab`** | `28b9c0177` |
| E-oldswitch-ch | **`a33d815fb`** | `1a5e2f8f2` | `bac24ce17` | `28b9c0177` |
| F-final-ch / G-final-no | `23eafd4bb` | `1a5e2f8f2` | `bac24ce17` | `28b9c0177` |

**`23eafd4bb` is the mixin committed at `627e34a`** — checked with `git hash-object` after the
commit, so the green arms measured the shipping bytes and not a working copy that has since moved.

### D1 — the falsification the brief asks for

`translations/de.ts`, one letter of one word — the `MVA-samenstilling` class:

```
- orders_deliverySelfPickup: 'Selbstabholung',
+ orders_deliverySelfPickup: 'Selbstabholunk',
```

```
Error: expect(locator).toHaveText(expected) failed
  Locator: locator('.modal-backdrop').locator('.order-details .detail-row .value')
    "Im Geschäft bezahlen",
  -   "Selbstabholung",
  +   "Selbstabholunk",
    "01.08.26 11:03",
```

**A rendered-string green could not have shown this.** Assert `Selbstabholung` renders and the walk
goes green the moment somebody writes German literals into the switch beside the Norwegian ones —
the defect passing its own test. Only corrupting the KEY and watching it red says the word came out
of the dictionary.

### D2 + D3 — the fallback confound, killed

`utils/i18n.js` falls back `no → en → de`, so a German assertion satisfied by a Norwegian string is a
real failure mode. One mutation, `orders_deliverySelfPickup: 'Hent selv' → 'MUTANT-NO-VALUE'` in
`translations/no.ts`, run at both editions over **byte-identical trees** (the sha row above is equal
on every file; only `OKAM_EDITION` differs):

```
D2  ch  PASS         → the ch run never reads translations/no
D3  no  FAIL-ASSERT  → …and the mutation is genuinely on this surface
```

D2 alone would be worthless — a green run proves nothing about a string nothing reaches. D3 is what
makes D2's green mean *the German receipt is sourced from the German dictionary*.

### E — the negative control, which is what names this lane's work

The pre-lane `switch` restored verbatim for delivery and status, spec unchanged, at `ch`:

```
  "Im Geschäft bezahlen",
-   "Selbstabholung",
+   "Hent selv",
  "01.08.26 11:03",
-   "Angefragt",
+   "Forespurt",
```

Red on **exactly the two rows this lane routed**, and the payment row stays German — the sibling's.
Three rows, three attributions, one screen.

All three reds are quoted expected/received pairs, deliberately: `L-RECEIPT-JOURNEY-AT-DE`'s **F2**
is inherited — a `TypeError` inside `page.evaluate` also surfaces as `1 failed`, so `FAIL-ASSERT`
alone is not evidence that an *assertion* is what failed.

### The Material Icons trap, inherited and honoured

`orderCard_receipt` is reached by `[data-test="order-action-receipt"]`, never by text, because the
button's `textContent` is `"receipt\n Quittung"` — the icon name is a live text node. Every run
records it: `"oldRegexMatches":true, "oldRegexMatchesLabelAlone":false`. **No locator in this lane
matches on a label**; the words are only ever *asserted*, never used to find anything.

## 6. The unit net, and what it cannot see

`test/order-label-dictionaries.test.js` — **120 assertions, all passing at `627e34a`**
(`unit-net-at-head.txt`), **73 of them red against the prior switch** (`negative-control-jest.txt`).
Both plugins are imported for their `Vue.mixin` side effect, so what mounts render is the shipped
label function and the shipped `$i`, not a stand-in. Three surfaces: `OrderCard`,
`organisms/OrderModal`, `molecules/OrderModal`. `readRow` throws unless it finds exactly one matching
row — the payment lane's first draft mounted a card collapsed and read an empty page.

**The jest negative control and journey arm E ran the same mutated file**, `a33d815fb`, recorded in
both headers. One mutation, two instruments, two reds.

The **fourth** surface, `components/molecules/ReceiptModal.vue` — the receipt itself, the one a
bokføring inspector reads — **cannot be mounted by this toolchain at all**: its template uses `?.`,
vue-jest compiles through buble, buble cannot parse it, and the import fails the suite before an
assertion runs. Pre-existing, recorded by the sibling, unchanged here. **That is precisely why the
DOM-level evidence for the receipt is a Playwright walk and not a mount.**

47 of the 120 pass against the old switch. That is not slack: they are the fifteen Norwegian arms
(unchanged by design), the two Wolt members whose German equals their Norwegian, and the map and
dictionary structural arms.

**Suite at `627e34a`, tree clean: `Tests: 2 failed, 2833 passed, 2835 total` ·
`Test Suites: 1 failed, 113 passed, 114 total`** (`full-suite-at-head.txt`). The two reds are the
**worktree-basename tax**: `journey-artifact-store.test.js` pins `/^Web-modules@…/` and receives
`web-mixinlabels@627e34a…` — with **no `+dirty` suffix**, which is itself the proof the tree was
clean. Unrelated to this lane; `basename-tax-baseline.txt` quotes both.

**eslint at `627e34a`: 0 errors** over all seven changed files (`eslint-at-head.txt`); the 3
remaining warnings are pre-existing indentation at `translations` 698/698/715, confirmed present at
base by stashing.

## 7. Recorded, not fixed — with the reason each was left

**`GroupedHomeDelivery` is a member of nothing.** It appears in no backend enum, in no `core/enums`
enum and at **no other call site in this repository** — the switch's own case was its only occurrence
in the estate. Carried into the map rather than deleted, because this is a routing change and
deleting a case is a behaviour change. `measured.json.delivery_mapped_non_members` names it, and the
unit test pins it as the *only* permitted extra so a second invented member cannot slip in.

**`core/enums/order-status.ts` declares `OpenCheck`; `Enums/OrderStatus.cs` does not.** An order
carrying it would read the not-set fallback. Not mapped: inventing a word for a state the API cannot
send would put a guess on a receipt. It is in the unit test's not-a-member list, so the day the
mirror stops being a mirror the fallback is at least deliberate.

**The unrecognised branch answers the same words as `NotSet`,** which is what the switch's `default`
did, so no rendered string moves. `PAYMENT_TYPE_LABEL_KEYS` instead keeps a distinct "Ukjent" so the
next backend member stays visible. Whether a receipt should say "not set" or "unknown" for a value
nobody recognises is a decision about a printed document, not a routing one, and is left open.

**`molecules/OrderModal.vue` labels its rows with hardcoded Norwegian `<dt>`s** — `Betaling`,
`Leveringsmetode`, `Status`, no `$i` at all — so at `ch` it now reads "Leveringsmetode:
Selbstabholung". The sibling recorded the same thing one row above. This lane fixed the VALUES; the
LABELS on that component are a separate omission and are not this lane's diff.

**The two German org-number findings stand unasserted** on the ch artifact, inherited unchanged: a
literal floor reds when copy *drifts* and cannot red on a string *wrong at birth*, and pinning
today's `USt-IdNr.` / `Handelsregister` would red on the correction landing elsewhere.

## 8. Who answered — all nine runs

Two independent oracles per run, captured while the fixture was alive: the server's own
`/__fixture/health` and, from outside, `lsof`. All nine agree, all nine name **this lane's own
worktree**, and each has a **different pid** — no run reused another's server.

```
A 10603 · B 20701 · C 21575 · D1 24116 · D2 38541 · D3 48303 · E 50697 · F 59991 · G 64295
cwd  /Users/svendaneel/okam/web-mixinlabels   health {"ok":true,"port":4853}   granted 4853
```

Nothing here was served by pid 73160 on 4010, and nothing here bound 3847 or 4847.

## 9. THE INTERRUPTION, AND WHAT IT COST

An infrastructure fault at ~08:20 killed this lane's process while this log was being written.
**No measurement was lost** — all nine run files, both `who-answered` sets, `measured.json` and the
branch survived on disk, and §5's table is re-derived from those files rather than from the dead
session's transcript. Nothing here is reconstructed from memory.

**It also caught four real errors, every one of them a claim that outran its evidence.** Re-checking
from files rather than from the transcript is what surfaced them:

1. **"eslint: 0 errors on every changed file" was false.** That check had been run **before**
   `test/order-label-dictionaries.test.js` existed. Re-run over the seven files actually committed:
   **2 errors** (`object-curly-newline`) in that file. Fixed and `--amend`ed, `c75c28e` → `cb2d000`.
2. **Two sha values in §5's table were typed from memory and were wrong** — D1's `de.ts` and E's
   mixin. Both re-derived above from the run headers.
3. **The commit message said "Eight Playwright arms"; there are nine.** Corrected.
4. **The commit message said the basename-tax reds were "reproduced with this lane's work absent" —
   a run that was never performed.** Replaced with what was actually observed: the assertion pins
   `/^Web-modules@/` and receives this worktree's own basename, which no diff of this lane's could
   move. A weaker sentence about a real observation beats a stronger one about an imagined run.

Corrections 3 and 4 required a second `--amend`, `cb2d000` → **`627e34a`**, with the tree byte
identical (`plugins/global-mixin.js` is `23eafd4bb` before and after). Because a header naming a
commit is a provenance claim, the five attested evidence files were then **re-run**, not edited:
`eslint-at-head.txt`, `unit-net-at-head.txt`, `negative-control-jest.txt`, `basename-tax-baseline.txt`
and `full-suite-at-head.txt` all now name `627e34a` and their own modified-path count. Every number
reproduced exactly. The nine journey arms were **not** re-run and did not need to be: they pin the
mixin by content, and `23eafd4bb` is still the committed byte.

## 10. How to re-run

```
lanes/L-MIXIN-LABELS-TRANSLATE/run-journey.sh <label> ch      # the German walk
lanes/L-MIXIN-LABELS-TRANSLATE/run-journey.sh <label> no      # the Norwegian one
python3 lanes/L-MIXIN-LABELS-TRANSLATE/measure.py             # drift + coverage + the chain counts
npx jest test/order-label-dictionaries.test.js                # the 120-assertion net
```

The runner aborts if 3853 or 4853 is busy, if `core/` is empty or if `node_modules` is missing, and
classifies each outcome `PASS` / `FAIL-ASSERT` / `HARNESS`.

## 11. What is still owed, and it is not a suite

**C5.** Every result above is a suite result, and a suite result is never evidence that a capability
exists. What this lane closes is a document a Swiss operator reads: `/admin/ongoing`, expand an
order, press the receipt button. The walk to hand Sven is that one, at the CH build.
