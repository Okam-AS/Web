# L-GERMAN-IDENTIFIER-LABELS — mutation log

brief: d3547a7d · verdict: built

## Trees used

| what | where | ref |
|---|---|---|
| work tree (all edits, all runs) | `/private/tmp/claude-501/-Users-svendaneel-okam/766072d3-8965-4c45-be67-76b407d86aaf/scratchpad/wt-german-ids` | detached at `e34977ac` |
| strings read by object | `git show e34977ac:translations/<lang>.ts` | `e34977ac` |
| backend, identifier types | `/Users/svendaneel/okam/wt-wiretier` | `lane/wire-tier-rowversion` |
| backend, Meals employee-ref | `/Users/svendaneel/okam/OkamAPI-censusfloors` | see caveat below |

`translations/{de,en,no}.ts` were **already dirty in the shared checkout** when this lane started, as
the brief warned. Every string quoted below was read by object from `e34977ac`, never from the
working tree. `components/molecules/ReceiptModal.vue`, `pages/admin/margin-suppliers.vue` and
`utils/i18n.js` were **clean** in the shared checkout — no collision with the two lanes editing the
dictionaries.

## First: is the German actually wrong?

The brief required this be settled from the code that fills `{vat}`, not from the key name, because
if the value really were a VAT number the German would be right and the other two wrong. It is not.

- `ReceiptModal.vue:39` — `$i('receiptModal_orgNumber', { vat: order.storeVAT })`.
- `core/models/order/order.ts:50` — `storeVAT: string`, from `Order.StoreVAT`.
- `Entities/Order/Order.cs:77` — `public long StoreVAT`, copied from `Store.VAT`
  (`Entities/Store/Store.cs:17`, also `long`) at `Services/CartService.cs:623`,
  `Services/Kassa/OpenCheckService.cs:112`, `Services/WoltService.cs:785`.

**A `long` cannot hold a German USt-IdNr.** That identifier is `DE` followed by nine digits; the
country prefix is part of it. The column is numeric-only, so the value is a nine-digit Norwegian
organisasjonsnummer — which is what the backend's own POS fixtures put there (`StoreVAT = 912345678`,
six occurrences under `WebApi.Tests/Kassa/`), and what a second surface already calls it in a
hardcoded label: `components/molecules/OrderModal.vue:95`, `Org.nummer: {{ order.storeVAT }}`.

Norwegian and English were right. **The German was a substitution, not a translation.**

## What was found — five strings, not three

The brief named three. Two more of the same defect class were adjacent, one of them on the same
two-line block of the same receipt.

| key | no | en | de (before) |
|---|---|---|---|
| `receiptModal_orgNumber` | `Org.nr {vat} MVA` | `Org. no. {vat} VAT` | `USt-IdNr. {vat} MwSt` |
| `receiptModal_companyRegistry` **(+1)** | `Foretaksregisteret` | `Register of Business Enterprises` | `Handelsregister` |
| `mrg_sup_org_number` | `Organisasjonsnummer` | `Organisation number` | `Handelsregisternummer` |
| `wfr_add_employer_hint` **(+1)** | `organisasjonsnummer` | `organization number` | `Handelsregisternummer` |
| `meals_field_employee_ref_hint` | `fødselsnummer` | `fødselsnummer` | `Sozialversicherungsnummer` |

`receiptModal_companyRegistry` renders one line **below** the org number inside the same
`.store-vat` block (`ReceiptModal.vue:36-41`). Correcting the identifier and leaving the register
would have left a German institution printed on a Norwegian fiscal document, one line down.

## The rule applied

Not invented for this lane — it is stated in `de.ts` itself, above the personalliste block
(`translations/de.ts:4710-4712`):

> Die Vorschrift ist norwegisch, und ihre Begriffe sind die massgeblichen (personalliste,
> arbeidssted, organisasjonsnummer, fødselsnummer). […] wo ein norwegischer Rechtsbegriff keine
> deckungsgleiche Entsprechung hat, steht das norwegische Wort daneben.

The existing gloss `fødselsnummer (norwegische Geburtsnummer)` in `wfpl_identity_gap` is the house
pattern. All five corrections follow it: Norwegian term kept, German gloss in parentheses. **No
German identifier means "Norwegian organisasjonsnummer", so none was reached for.**

## The mutation

`translations/de.ts` — 5 strings, 5 lines. Plus `components/molecules/ReceiptModal.vue` — 2 lines,
see the harness note below.

```
- receiptModal_companyRegistry: 'Handelsregister',
+ receiptModal_companyRegistry: 'Foretaksregisteret (norwegisches Unternehmensregister)',
- receiptModal_orgNumber: 'USt-IdNr. {vat} MwSt',
+ receiptModal_orgNumber: 'Org.nr {vat} MVA (norwegische Organisationsnummer)',
- mrg_sup_org_number: 'Handelsregisternummer',
+ mrg_sup_org_number: 'Organisasjonsnummer (norwegische Organisationsnummer)',
- wfr_add_employer_hint: '… weder Name noch Handelsregisternummer rechtlicher Arbeitgeber …'
+ wfr_add_employer_hint: '… weder Name noch organisasjonsnummer (norwegische Organisationsnummer) rechtlicher Arbeitgeber …'
- meals_field_employee_ref_hint: '… Nie eine Sozialversicherungsnummer; der Server weist sie ab. …'
+ meals_field_employee_ref_hint: '… Nie eine fødselsnummer (norwegische Geburtsnummer); der Server weist sie ab. …'
```

The receipt keeps printing the identifier in the statutory Norwegian form — the organisasjonsnummer
followed by the letters MVA — and glosses it, rather than renaming it.

## The proof — mounted, and falsifiable

`test/german-identifier-labels.test.js`, 7 assertions, all through the **real** `translate()` from
`utils/i18n.js` at locale `de`, all reading text back off the rendered DOM.

This mattered concretely. `test/margin-suppliers-page.test.js` mounts the very same page with
`$i: key => key` (line 113) — it renders the literal string `mrg_sup_org_number` and **would pass
identically whether the label said Organisasjonsnummer or Handelsregisternummer**. That is the trap
the brief named, and it is live in the repo today.

```
PASS test/german-identifier-labels.test.js
  the receipt surface, rendered in German
    ✓ the receipt names the number as a Norwegian organisasjonsnummer, not as a German VAT id
    ✓ the register printed beneath it is Foretaksregisteret, not the German Handelsregister
    ✓ no German institution survives anywhere on the rendered receipt
  the supplier surface, rendered in German
    ✓ the supplier field is labelled Organisasjonsnummer, not Handelsregisternummer
    ✓ no German institution survives anywhere on the rendered supplier page
  the employee-reference warning
    ✓ warns against the number the server actually refuses
    ✓ the legal-employer hint names the organisasjonsnummer the service does not expose
Tests: 7 passed, 7 total
```

**Mutation proof** — `git checkout translations/de.ts` (restoring only the German strings, leaving
the tests and the template fix in place), then re-run:

```
✕ ×7          Tests: 7 failed, 7 total     exit 1
```

All seven are load-bearing; none passes on the old dictionary. Fix restored, re-run green.

Neighbouring suites re-run green after the change: `margin-suppliers-page` +
`margin-supplier-panels.component` (50), `workforce-roster-components` +
`modal-scroll-lock-estate` (61).

## `MwSt` was deliberately left alone

`MwSt` is **not** in the test's refused-terms list. It names a *tax*, not an issuing authority, and
`de.ts` uses it on ~40 keys including three on this same receipt (`receiptModal_totalInclVat`,
`_vatColumn`, `_vatRate`). Whether a Norwegian receipt's merverdiavgift should read MVA rather than
MwSt in German is a real question — but it is the VAT lane's question, a different defect class, and
folding it in here would have failed this suite on strings this lane did not touch. Flagged, not
acted on.

## The fødselsnummer case — checked before touching, as the brief required

**There is no second problem, and the surface should keep the string.** It does not *display* a
fødselsnummer; it is the input hint on `components/admin/meals/MealsPeoplePanel.vue:128` that
*forbids* one being typed into the employee-reference field. It is a control, not a disclosure.

Correcting it strengthens that control, and the German version was actively dangerous:

`Services/Meals/MealsEmployeeReference.cs` refuses a value of eleven digits **whose two mod-11
control digits both check out** — i.e. specifically a Norwegian fødselsnummer, both weightings
verified so ordinary eleven-digit payroll numbers pass. A German *Sozialversicherungsnummer* is
twelve characters with a letter inside; it fails that check and **sails straight through**, then gets
copied verbatim onto every statement line and into the CSV handed to the buying company's
accountant. The service's own comment says the lines of a finalized run are frozen by trigger and
nothing downstream can take it back.

So the German string warned an operator against the one number the server does *not* refuse, in the
field whose whole purpose is to keep a personal identity number out of a frozen accounting record.

C7 holds: no logging or telemetry call was added or altered by this lane.

## Flags for a person

1. **(+2 strings beyond the brief.)** `receiptModal_companyRegistry` and `wfr_add_employer_hint` were
   the same defect and are fixed here. If the lane was meant to be exactly the three named, these two
   are the ones to back out — but `receiptModal_companyRegistry` is on the receipt, one line under
   the org number, and backing it out leaves "Handelsregister" printed on a Norwegian fiscal
   document.

2. **`ReceiptModal.vue` could not be mounted in jest at all, and this lane changed 2 template lines
   to make it possible.** Its template used `order.user?.phoneNumber`; `vue-template-es2015-compiler`
   (buble, behind `vue-jest@3.0.7`) cannot parse optional chaining and the whole suite failed to
   compile. Rewritten to `(order.user || {}).phoneNumber`, which is equivalent for every value
   `order.user` can hold. **This is a needed ruling: a translation lane edited a fiscal-document
   component.** It was the only way to satisfy the brief's own exit criterion, since that criterion
   demands a mounted assertion on the receipt surface. Three other templates have the same problem
   and remain unmountable: `pages/admin/products.vue` (3), `pages/admin/wolt-menu.vue` (1),
   `components/onboarding/OnboardingProductImages.vue` (1).

3. **The receipt had no unit test of any kind before this lane** — the only prior reference to
   `ReceiptModal` under `test/` is a Playwright scroll-lock journey that reads a page flag, never the
   component. A fiscal-document surface with no mounted coverage is why a wrong identifier label
   survived on it.

4. **English says `VAT` where the Norwegian says `MVA`** in `receiptModal_orgNumber`. `MVA` is a
   literal letter-suffix a Norwegian sales document must carry after the organisasjonsnummer; it is
   arguably not translatable at all. Out of scope here, and English was treated as faithful per the
   brief, but it is the same question one notch down. VAT lane / a person.

5. **Backend caveat.** The first backend tree searched (`wt-wiretier`, on `lane/wire-tier-rowversion`)
   contains no `EmployeeReference` at all, which would have read as a claim-with-no-code gap. It is
   simply an older branch — the code is in `OkamAPI-censusfloors` with migration
   `20260731215452_Meals_MembershipEmployeeReference`. **No backend checkout in the estate is on
   `feature/restaurant-modules`**, so no tree here is the exact counterpart of this frontend branch;
   the finding in the fødselsnummer section is reported against `OkamAPI-censusfloors`.

## Constraints

C1, C2, C4 — not engaged; this lane writes no SQL, adds no migration, and touches no money-path
write. C3 — no capability added; both surfaces are already reachable (`ReceiptModal` from
`pages/admin/ongoing.vue:166`, the supplier field from `pages/admin/margin-suppliers.vue:86`).
C5 — nothing is marked accepted here; the suite is evidence the strings render, not that a person
completed the journey. **A person still has to open the receipt in German.** C6 — no string added
names a statute, forskrift or § reference. C7 — see above.
