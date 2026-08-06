# L-EV-ONBOARD-PRINT-BLEED — evidence

## 1. The brief was verified before anything was built, and it was right

Run against the UNFIXED tree, the banner was on the paper — not merely in the viewport. The
distinction matters because the sibling lane's 264px sidebar gutter looked identical in a print-media
screenshot and turned out never to reach the A4 document. So this was asked of the PDF.

`pdftotext -layout` over the produced `before.pdf`, first 400 characters:

```
Du har en pågående oppsett-prosess for Fixture Kafé. Du er på steg 2 av 4.   Fortsett oppsett   Lukk
Kjøreplan

Kjøreplan for kjøkkenet
Julebord for Nordane AS · lørdag 12. desember 2026 · 18:00–23:30 · Gjester: 40

Registrert opplysning: To gjester har cøliaki. Én gjest har alvorlig nøtteallergi — ingen nøtter på
noen tallerken.
```

The first line of the kitchen's run sheet was a nag to finish onboarding, with both of its buttons.

DOM-level, under emulated print media: `.onboarding-notification` computed `display: block`.

## 2. The fix does not need the mechanism the brief warned about

`OnboardingNotification.vue` now carries its own scoped `@media print { display: none !important }`.

- No `document.body` class. That mechanism is measured inert on this branch
  (`wfpl-print-host`, wiped by vue-meta).
- No `vue-meta` `bodyAttrs`. Not needed, so the string-vs-array merge question in
  `layouts/default.vue` — and the `okam-ch` strip it would risk on the Swiss market — is not touched
  and stays open for whoever settles it.
- No unscoped rule, and no reach into an ancestor. The premise that the fix required reaching an
  ancestor is what dissolved: the page cannot reach the banner, but **the banner can hide itself**.
  `scoped` puts the component's own attribute on its own root, so the rule cannot apply anywhere else.

`.admin-nav` (AdminPageHeader.vue) has done exactly this since before this lane, which is why the
sidebar has never printed down the side of a kitchen sheet. This is that precedent, applied.

## 3. The absence assertion has three live positive controls

An absence assertion is the shape that passes vacuously, so nothing is asserted absent until
something is asserted present, at the same level of the instrument:

1. on screen, the banner IS rendered (else the run proves nothing about an onboarding store);
2. on screen, the dietary requirement IS rendered;
3. **in the PDF**, the dietary requirement IS present (else "no banner" is true of an empty file).

`pdftotext` is a HARD requirement in this journey, unlike the sibling's optional read-back: this
journey's only claim is about the artifact, so a run that silently downgraded to the screen would be
reporting evidence it did not gather.

## 4. A geometry assertion was written, measured, and thrown away

The first version asserted the sheet's first line sat above a pt threshold, reasoning that a banner
above the slot must push the sheet down the page. Measured, that is false:

| document | topmost text |
|---|---|
| before the fix (banner first) | **56.0 pt** |
| after the fix (sheet first)   | **56.0 pt** |

The banner does not push the sheet down — it takes the top of the page and displaces the sheet onto
later lines. **No threshold on that number could have discriminated**: it would have been green
against the defect and green against the fix. It was replaced with the question that does
discriminate — *which* line is first — and the reasoning is recorded in the spec so it is not
re-derived wrongly later.

## 5. Mutation: the test reds

| run | change | result |
|---|---|---|
| unfixed tree | none | **FAILED** — `display` expected `none`, received `block` |
| fixed tree | none | passed |
| fixed tree | `@media print` → `@media speech` | **FAILED** — `display` expected `none`, received `block` |
| fixed tree, inverted spec asserting the banner IS on the paper | none | **FAILED** at `expect(text).toContain('oppsett-prosess')` |

The last row is the one that proves the *PDF-level* assertions discriminate rather than only the DOM
one: identical assertions over the produced file, opposite outcomes before and after the fix.

## 6. Final state

- `npx playwright test` — **6 passed** (all journeys, incl. the sibling `events-runsheet-print`)
- `npx jest` — **98 suites, 2257 tests, all passed**
- PDF first line is now `Kjøreplan`; `grep oppsett` over the printed text returns nothing.
- `core/` intact after teardown (10 entries).
- Console errors in the artifact (2) are the same router `Navigation cancelled` pair the sibling
  journey records; not introduced here.

Artifacts (gitignored, regenerated per run):
`artifacts/journeys/events-runsheet-onboarding.playwright.json`,
`artifacts/journeys/events-runsheet-onboarding/run-sheet-onboarding.pdf` (+2 screenshots).

## 7. Left alone deliberately

`pages/admin/workforce-personnel-list.vue:358` carries `body.wfpl-print-host .onboarding-notification
{ display: none !important }` — the same intent through the inert body-class mechanism. It is now
redundant, and it belongs to the § 8-5-6 print path another lane owns. Not touched; flagged.

`layouts/default.vue`'s string-valued `bodyAttrs.class` is untouched and the estate-wide body-class
question is still open. This lane no longer depends on it.
