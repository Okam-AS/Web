# Which suites cannot see a wrong sentence

Lane L-IDENTITY-STUB-TESTS. Read-only. No test was edited.

**Tree read:** `/Users/svendaneel/okam/Web-modules`, branch `feature/restaurant-modules`, HEAD
`e34977acebd59b223584158c33451b6f1ffd82c1`, **working tree dirty** — `translations/no.ts`, `en.ts`
and `de.ts` are all modified relative to HEAD by lanes running concurrently. Every dictionary string
quoted below is the **working-tree** value, not HEAD's. The test files themselves are read at
working-tree state too; none of the 23 in the population is currently modified.

---

## 1. The denominator, and why it is not fifteen

The orchestrator's regex matched `$i:` followed by an arrow returning its argument, and found 15.
That shape is real but it is not the population. Two corrections, both of which move the number.

**Correction A — the echo shape is equally blind.** Nine suites stub
`$i: (key, params) => key + ':' + JSON.stringify(params)`. That returns the key name with the params
appended. It never returns a sentence, so it is exactly as blind to wrong copy as `key => key`, and
it does not match the identity regex.

**Correction B — most multi-line `$i` stubs are NOT stubs.** The shape
`const $i = (key, params) => { ... }` reads as a stub and is the majority shape in the tree, but 26
of them resolve the **real** dictionary (`translations.no[key]`, or a throwing
`translations[locale][key]`). Counting by shape rather than by body would have inflated the
population by more than it deflated it.

Derived population, over all 128 non-e2e Jest files in `test/` (`test/e2e/` is Playwright, run
separately; `jest.config.js` excludes it and `lanes/`):

| class | count | meaning |
|---|---|---|
| Jest test files, non-e2e | 128 | the universe |
| …that exercise `$i` | 60 | the relevant universe |
| **Real-dictionary resolver** | **26** | `$i` reads `translations`; a missing key fails the test |
| **Real resolver, no stub at all** | **4** | guest surfaces mounted with `$i18n: { locale }` |
| **Mixed** — blind mount **+** dictionary assertions in the same file | **7** | copy is guarded, but not through the DOM |
| **COPY-BLIND** — blind mount, no copy assertion of any kind | **23** | ← **the population** |

23, not 15. Counting files with *at least one* copy-blind mount (the 23 plus the 7 mixed) gives 30.

Stub shape within the 23: **14 identity** (`key => key`), **9 echo** (`key + ':' + JSON.stringify(params)`).

No other blinding mechanism exists. There is no `setupFiles`/`globalSetup` in `jest.config.js`, no
`jest.mock` of `plugins/i18n.js` or `utils/i18n.js` anywhere in `test/`, and no test installs a
`Vue.mixin`/`Vue.prototype.$i` stub. Every blind `$i` in this repo is a per-mount `mocks: { $i }`.

### The two patterns that do work, for calibration

- **Real resolver at a real locale, literal sentence off the DOM.**
  `test/margin-supplier-panels.component.test.js` (imports `~/translations/no`, mounts the real
  panels) and `test/workforce-pos-clock.test.js` / `test/workforce-personnel-list-components.test.js`
  (a `translator(locale)` that **throws** on a missing key, driven at `no`/`en`/`de`).
- **Two-step: record the key at the mount, assert the sentence against the dictionary.** The 7 mixed
  files. Weaker — it proves key→sentence and surface→key separately, never that the right sentence
  lands in the right place — but it is a genuine copy guard and the cheapest one.

---

## 2. What "covered elsewhere" was measured as

For each surface: extract every `$i('key')` literal from the `.vue`, resolve it in all three
dictionaries, take the longest static fragment (≥16 chars, `{token}` splits discarded), and search
for that fragment as a literal in (a) all 128 Jest files, (b) all 37 `test/e2e/journeys/*.spec.js`.
A hit means some test would go red if that sentence changed.

**The locale ceiling.** Every e2e journey asserts **Norwegian only**. No journey sets `adminLocale`
or drives a non-`no` locale; there is not one German or English literal assertion in
`test/e2e/journeys/`. Since `de` is the **CH build** (`nuxt.config.js:147` — `locales: isCh ? ['de'] : ['en','no']`),
**the entire Swiss-market copy has no DOM-level guard anywhere in this repo.** That ceiling sits
above the whole table below, and it is why an e2e hit is recorded as `e2e(no)` and never as coverage
of German.

---

## 3. The 23, ranked by consequence

`keys` = distinct `$i` keys on the surface(s) the suite mounts. `jestLit`/`e2e(no)` = how many of
those keys have a literal-sentence assertion anywhere.

### Tier 1 — fiscal or money surfaces, effectively zero copy coverage

| # | test | surface(s) mounted | stub | keys | jestLit | e2e(no) | what it asserts |
|---|---|---|---|---|---|---|---|
| 1 | `test/price-bypass-legacy.test.js` | `components/admin/pos/XReportView.vue`, `pages/admin/kravia-invoice.vue`, `pages/admin/reward-members.vue`, `pages/admin/settlements.vue` | identity | **179** | **0** | **0** | that a total is withheld rather than invented when a term is absent (`|| 0` removal); `statedSum` arithmetic |
| 2 | `test/xz-negated-absence.test.js` | `components/admin/pos/XReportView.vue` | identity | 48 | **0** | **0** | that an absent amount renders the unknown mark unsigned, and a real zero renders as a figure |
| 3 | `test/margin-statement-components.test.js` | `MarginStatementFiguresPanel.vue`, `MarginSpendPanel.vue`, `MarginCoveragePanel.vue` | echo | 89 | 3 | **0** | that dashes are shown for an uncalculated statement, `kr 0` for a calculated empty one; typographic minus |
| 4 | `test/margin-suppliers-page.test.js` | `pages/admin/margin-suppliers.vue` | identity | 30 | **0** | 4 | which reads the module gate issues; that a failed status read is *unknown*, not *off* |
| 5 | `test/margin-waste.test.js` | `MarginWastePanel.vue`, `MarginCoveragePanel.vue` | echo | 53 | 3 | **0** | that an unvalued entry stays NULL and is never coerced to zero |
| 6 | `test/price-gate-shadow.test.js` | `components/molecules/CustomerInfoModal.vue` | identity | 18 | **0** | **0** | that no component takes a silent exit from the money gate (a static extractor) |
| 7 | `test/price-absence.test.js` | `components/admin/pos/CardTerminalStatus.vue`, `components/shared/OfferDocument.vue` | identity | 10 | **0** | **0** | that an unstated amount is withheld rather than rendered as zero, NO and CH |

`price-bypass-legacy` is the single worst row in the tree: **179 keys across four money surfaces,
not one of which has a sentence assertion in any suite, Jest or Playwright.**
`pages/admin/kravia-invoice.vue` alone carries 94 keys and 6 statutory/VAT strings with zero
coverage of any kind.

Statutory strings reachable through these blind mounts and asserted nowhere — `XReportView.vue`:
`pos_report_excl_vat`, `pos_report_vat_pct`, `pos_report_vat_total`, `pos_report_vat_summary`,
`pos_report_receipt_count`, `pos_report_receipt_copies`, `pos_report_proforma`,
`pos_report_training` (10 in total); `kravia-invoice.vue`: `kraviaInvoice_vat`,
`kraviaInvoice_vatRate`, `kraviaInvoice_amountInclVat`, `kraviaInvoice_unitPriceExVat`,
`kraviaInvoice_priceInclVatSuffix`, `kraviaInvoice_validationLineVatRate`.

**A defect visible from here, on the X report, today:** `pos_report_vat_summary` reads
`'MVA-samenstilling'` in `no` — a misspelling of *sammenstilling*. It is printed on the X report.
Both suites that mount `XReportView.vue` (#1 and #2) are green over it, and would be green over any
replacement wording, because both stub `$i` with identity and neither asserts a sentence.

### Tier 2 — operational surfaces, no copy coverage

| # | test | surface | stub | keys | jestLit | e2e(no) | what it asserts |
|---|---|---|---|---|---|---|---|
| 8 | `test/workforce-schedule-page.test.js` | `pages/admin/workforce-schedule.vue` | identity | 81 | 4 | 0 | that three pivots are offered; that the month is N week reads, never one range call |
| 9 | `test/workforce-schedule-flag-refusal.test.js` | `pages/admin/workforce-schedule.vue` | echo | 81 | 4 | 0 | that a flag-down publish renders the typed refusal and links to the lever |
| 10 | `test/workforce-roles-page.test.js` | `pages/admin/workforce-roles.vue` | identity | 31 | **0** | **0** | read ordering; that a failed role read is UNKNOWN, never empty |
| 11 | `test/workforce-rates-page.test.js` | `pages/admin/workforce-rates.vue` | echo | 20 | **0** | **0** | the capability gate; that no read fires behind a refusal |
| 12 | `test/workforce-roster-page.test.js` | `pages/admin/workforce-roster.vue` | identity | 22 | 1 | 1 | that without a store timezone it renders nothing rather than the viewer's |
| 13 | `test/workforce-personnel-list-page.test.js` | `pages/admin/workforce-personnel-list.vue` | echo | 13 | **0** | **0** | that a 403 blocks the page and never asks for the register |
| 14 | `test/pos-clock-reserved-key.test.js` | `components/admin/pos/ClockScreen.vue` | identity | 28 | **0** | **0** | that `data()` declares no key Vue refuses to proxy; ticker lifecycle |
| 15 | `test/events-page.test.js` | `pages/admin/events-pipeline.vue` | echo | 126 | 1 | 14 | which reads the pipeline issues; the deposit rail |
| 16 | `test/training-page.test.js` | `pages/admin/training-courses.vue` | echo | 8 | **0** | **0** | call ordering and independent read failure |
| 17 | `test/margin-price-imports-page.test.js` | `pages/admin/margin-price-imports.vue` | identity | 29 | **0** | 1 | that two flags produce two different sentences from one 404 |
| 18 | `test/meals-admin-components.test.js` | 4 × `components/admin/meals/*Panel.vue` | echo | 120 | 1 | 8 | that the create form is withheld without the role; edit withheld without a revision |
| 19 | `test/meals-admin-picker.test.js` | `MealsCompanyPicker.vue` | echo | 16 | **0** | **0** | that an unanswered directory is a caveat, never an empty venue |
| 20 | `test/meals-companies-page.test.js` | `pages/admin/meals-companies.vue` | identity | 5 | **0** | **0** | which reads fire per store/company |
| 21 | `test/meals-page.test.js` | `pages/admin/meals-agreements.vue` | identity | 6 | **0** | **0** | exactly two store-scoped reads, once each |

Rows 8/9 and 15/18 are the least bad in the tier: sibling suites with a real resolver
(`workforce-schedule-authoring-page`, `workforce-week-grid.component`, `events-surface`,
`meals-components`) mount the same or adjacent surfaces, and the e2e journeys assert Norwegian
button and toast text. That is partial cover for `no` only.
Rows 10, 11, 13, 14, 16, 19, 20, 21 have **no copy guard at all in any locale.**

### Tier 3 — bookkeeping; the stub is the right call

| # | test | surface | stub | note |
|---|---|---|---|---|
| 22 | `test/modal-scroll-lock-estate.test.js` | `Modal.vue`, `TermsModal.vue`, `SmsDriverModal.vue`, `TransferOrderModal.vue`, `PageHeader.vue` | identity | Asserts scroll-lock composition across modals. Three of the five surfaces call `$i` zero times; the stub exists only to let them mount. Nothing to cover. |
| 23 | `test/admin-nav-access.test.js` | `components/organisms/AdminPageHeader.vue` | identity **by default** | **Genuinely mixed and the best of the 23.** `mountNav(user, dictionary)` defaults to identity for the 20 path-and-access tests, then runs 6 label tests against the **real** `no`/`en`/`de` dictionaries asserting no label is a raw `nav_…` and no two labels in one sidebar collide. That catches a raw key and a duplicate; it does **not** catch a wrong-but-distinct label. |

---

## 4. Stubbed is not the worst case. Uncovered is.

`components/molecules/ReceiptModal.vue` — **23 `$i` keys, and no test of any kind.** Grepped
repo-wide: the only reference outside the component is `pages/admin/ongoing.vue` (which mounts it at
line 166) and `test/e2e/journeys/modal-estate-scroll-lock.spec.js`, which toggles the
`showReceiptModal` boolean and never reads the modal's text. It appears in no Jest file. It is
therefore not in the population above — the correct classification is **uncovered**, not **stubbed**,
and it is the highest-consequence surface in this map because it prints a receipt.

Two of its strings are wrong now, and nothing in the estate can raise the question:

| key | `no` | `en` | `de` (= the **CH** build) |
|---|---|---|---|
| `receiptModal_orgNumber` | `Org.nr {vat} MVA` | `Org. no. {vat} VAT` | **`USt-IdNr. {vat} MwSt`** |
| `receiptModal_companyRegistry` | `Foretaksregisteret` | `Register of Business Enterprises` | `Handelsregister` |

`USt-IdNr.` is the **German** VAT identification number. The `de` locale is the Swiss build, where
the identifier is the UID / MWST-Nummer — and the value interpolated into `{vat}` is a Norwegian
organisasjonsnummer in the first place, which is not a VAT-ID in any jurisdiction. This is the same
defect class as the supplier-page finding one line above (`mrg_sup_org_number` `de` =
`Handelsregisternummer` for a field labelled `Organisasjonsnummer` in `no`), on a **fiscal document**
rather than a settings field, and with strictly less coverage: the supplier page at least has four
Norwegian e2e literals; the receipt has none.

Flagged against **C6**: a receipt is the artifact a statutory VAT claim is printed on. Naming this
does not assert a live prod exposure — that ruling needs the receipt's actual deployment and the CH
go-live state, neither of which this lane read. What it does assert is that **no test in this repo
would notice either way.**

---

## 5. Answer to the exit question, per surface

Copy defect could reach a user with every suite green — **yes** for all of:
`XReportView.vue`, `kravia-invoice.vue`, `settlements.vue`, `reward-members.vue`,
`MarginStatementFiguresPanel.vue`, `MarginSpendPanel.vue`, `MarginWastePanel.vue`,
`margin-suppliers.vue` (de/en), `margin-price-imports.vue`, `CustomerInfoModal.vue`,
`CardTerminalStatus.vue`, `ClockScreen.vue`, `workforce-roles.vue`, `workforce-rates.vue`,
`workforce-personnel-list.vue`, `workforce-roster.vue` (de/en), `workforce-schedule.vue` (de/en),
`training-courses.vue`, `meals-agreements.vue`, `meals-companies.vue`, `MealsCompanyPicker.vue`,
all four `components/admin/meals/*Panel.vue` (de/en), `events-pipeline.vue` (de/en),
`SmsDriverModal.vue`, `TransferOrderModal.vue`, and **`ReceiptModal.vue`, which is uncovered
outright**.

**No** for: `Modal.vue`, `TermsModal.vue`, `PageHeader.vue`, `OfferDocument.vue` — they call `$i`
zero times, so there is no copy on them to get wrong through this path.

**Partly** for `AdminPageHeader.vue` — raw keys and duplicate labels are caught in all three
locales; wrong wording is not.

---

## 6. Where the real-resolver pattern is worth the cost, and where it is not

**Worth it — convert (7):** rows 1, 2, 3, 5 and 7 (the fiscal and money surfaces), plus a first Jest
test for `ReceiptModal.vue`, plus the German half of row 4. These print statutory claims, and the
conversion is cheap: swap the stub body for `translations.no[key] || key` and assert the literal
sentence, which is exactly what `test/margin-supplier-panels.component.test.js` already does two
directories away. For the CH surfaces use the throwing `translator(locale)` from
`test/workforce-pos-clock.test.js`, driven at `de`, because a missing CH key currently degrades to
Norwegian rather than failing.

**Not worth it — leave the stub (2):** rows 22 and 23. Row 22's subject is scroll-lock composition
and three of its five surfaces have no copy at all; row 23 already runs the real dictionaries where
it matters and reads better with keys everywhere else.

**Cheapest broad fix, and it is not a per-test conversion.** The gap that produced this map is
structural: `de` and `en` have no DOM assertion anywhere in the estate, and 23 suites hide that.
One locale-parameterised journey — an existing e2e journey re-run with `adminLocale: 'de'`, asserting
the same literals from the CH dictionary — would put a floor under every Tier-1 and Tier-2 surface at
once, and would have caught both the receipt and the supplier string. Recommend that before
converting rows 8–21 individually.

---

## 7. Method, so the numbers can be re-derived or refuted

Population, coverage and dictionary parsing were computed by scripts held **outside** the measured
tree, in this session's scratchpad
(`/private/tmp/claude-501/-Users-svendaneel-okam/766072d3-8965-4c45-be67-76b407d86aaf/scratchpad/`:
`dicts.json` 5163/5128/5128 keys, `detail.json`, `rows.json`, `coverage.json`), so nothing this lane
wrote can be matched by a search this lane ran. Classification is on comment-stripped source, so a
comment naming `$i` cannot be counted as a stub. No count in this document was accepted at zero
without also printing the non-zero control beside it — the coverage sweep reports `jestLit` and
`e2e(no)` from the same corpus in the same pass, and the corpus is non-empty for other rows in every
table where a zero appears. zsh parameter-modifier and glob traps were avoided by running all
analysis through `python3` heredocs and quoting every `--include` pattern.

Known limits, stated rather than buried:

- The literal-fragment search can **overcount** coverage: a ≥16-char fragment shared between two keys
  credits both. Every Tier-1 zero was therefore also checked by hand against the covering-test list,
  and all four `margin-suppliers` e2e hits were read at their call sites and confirmed to be
  Norwegian `getByRole`/`toHaveText` assertions.
- It can **undercount**: a test asserting a short fragment (<16 chars) of a long string is missed.
  This would only add coverage to rows already recorded as low, never remove it from a zero.
- Child components rendered by a mounted page were not walked transitively; `keys` counts the
  surface's own `$i` literals plus, where a suite mounts panels directly, each panel's. Real
  exposure through the Tier-1 pages is therefore **at least** the figure shown.
