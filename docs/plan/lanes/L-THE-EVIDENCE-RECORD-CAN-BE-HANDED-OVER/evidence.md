# L-THE-EVIDENCE-RECORD-CAN-BE-HANDED-OVER — what was built and what was measured

The page said the training record was one that could be *«lagt fram ved tilsyn»* and the product had
no way to hand it over: no PDF, no CSV, no `download` attribute, not one `@media print` block, and a
single JSON action on the backend. A manager asked for it on the day could show an inspector a
browser tab. **A person can now open the page, press one control and walk away with the document.**

## The route taken, and why the other one was not

**A print path, not a generated file** — and the deciding argument was not size, it was honesty.

* The record is append-only statutory evidence whose whole design rule is that the browser *asserts
  nothing*: it prints the server's figures beside the values they were computed from and never
  recomputes a verdict, a hash or an expiry. A client-built CSV or PDF would be a **second rendering
  of that record, assembled by the browser** — the exact thing `TrainingEvidenceDocument.vue`'s
  header forbids, and the exact way `WorkforcePersonnelListSheet.vue` says a statutory sheet ends up
  carrying something the screen never did.
* A **server**-generated file is the stronger artifact, and it is the right long-term answer. It is
  also a new controller action on `OkamAPI-modules`, which needs the API at `:5971` rebuilt and
  restarted — which this brief forbids. Building half of it would have left a control wired to
  nothing.
* The estate's own precedent for «a record an inspector is handed on the day» is a print stylesheet
  (`workforce-personnel-list.vue`, `events-pipeline.vue`). `window.print()` → *Save as PDF* yields a
  file from the same pipeline, so «as a file or a printed document» is satisfied either way.

**The page's sentence was not touched.** It named no statute before and names none now — `OD-6` keeps
`internkontroll` off every UI surface until TR8/TR-B6 — and the promise that needed making good was
the *presentable record*, not a citation. C6's letter was never breached; its spirit was, and the fix
was to build the document rather than to withdraw the sentence.

## What landed

| file | what |
|---|---|
| `pages/admin/training-evidence.vue` | the print control (disabled until a record answered), a paper-only heading, `printDocument()`, and the page half of the print path — default-deny, scoped |
| `components/admin/training/TrainingEvidenceDocument.vue` | the document half: black on white, repeated table headings, rows that never split across sheets, outlined badges, and the `<details>` material forced open on paper |
| `translations/{no,en,de}.ts` | `trn_ev_print`, `trn_ev_print_hint`, `trn_ev_print_unavailable` — no statute, no `§` |
| `test/training-evidence-print.test.js` | 11 jsdom arms for the CONTROL: what it calls, when it is offered, and that pressing it never issues a second read |
| `test/e2e/journeys/training-evidence-document.spec.js` | four new steps for the PAPER: the press, the cascade under emulated print media, the produced PDF, and the file read back with `pdftotext` |

No body class and no `head()` anywhere: every print rule is **scoped**, so it carries the component's
own `data-v-` attribute and cannot reach a screen this page did not render. That is deliberate — the
estate has already shipped a print stylesheet guarded by a class `vue-meta` rebuilt away, which left
the rules in the file and the admin shell on the paper for as long as nobody looked.

## What the file said, and the two defects reading it caught

The artifact was produced against the **owner's live world** (web `:3971`, API `:5971`), signed in as
`99681931`, for **Selma Haug** at *Two Humans Kafé* — 1 completion, 2 certificates, 18 ledger rows.
See `walk.log`, `training-evidence.pdf`, `pdf-text.txt` and the three screenshots.

The first stylesheet passed **every** DOM assertion and produced a broken document. Both defects were
found by reading the PDF, not the page, and `BEFORE-clipped-and-blank-first-page.pdf` is that file:

1. **A blank first sheet.** `.trn-ev-page` is not the first box in the printed flow, so claiming a
   named `@page` box part-way through forced a break: the record began on sheet two.
2. **The right-hand edge cut off.** `Opphav` printed as `Opp`, `I journalen` as `I journa`, the
   ledger's delta column stopped mid-JSON, and a whole sentence lost fifteen characters out of its
   middle. The document *looked* complete and was missing the column naming who filed each row.

Fixed by dropping the named `@page` box entirely and by making the tables `table-layout: fixed` with
declared per-column widths and `overflow-wrap: anywhere`. A guaranteed 14 mm margin is worth less
than a page that carries all of its columns.

Third finding, fixed before the file was ever read: `.trn-ev__scroll` is `overflow-x: auto`, which is
right on screen and **clips** on paper — a printer cannot scroll. Without `overflow: visible` the
missing columns would have been the actor and the delta.

## The measurements

* **live browser walk** — the control is on the page and disabled before any read; pressing it after
  the read reaches `window.print`; under emulated print media the title, the subject, the id, the
  frozen threshold and the material are on the paper and the intro, the disclosure notice, the lookup
  form and both buttons are not. 0 failed requests.
* **the produced file** — 2 pages, A4, first sheet starts with the document's own heading, and
  `pdftotext` finds `Opphav`, `I journalen`, the full integrity sentence, `Beståttgrense: 80%`,
  `Varmebehandling ≥ 75 °C`, the closing brace of a ledger delta and the sha256 — and finds none of
  the page's controls.
* **jest tier** — `154 suites / 3605 tests / 0 failed` (trunk was 153 / 3594).
* **mutation checks on the new suite** — collapsing `canPrint` to `!this.busy` reds 5 arms;
  unbinding `@click="printDocument"` reds 1. Neither is vacuous.
* **geometry** — measured at the printable width under print media: `.admin__content` and every box
  inside it are exactly the page width with `scrollWidth === clientWidth`. There is no shell gutter
  left to correct, which is why no unscoped rule reaches the shell.

## Residue, honestly

* **A server-rendered, server-signed export is still the stronger artifact** and is not built. What
  ships here is the browser's rendering of the server's own JSON — the same tree the screen shows,
  which is the property that makes it trustworthy, but it carries no server signature or content
  hash of its own the way the meals statement CSV does (`X-Meals-Content-Hash`). If Training's
  evidence is ever to be handed over as a signed file, that is a backend lane.
* **The onboarding banner** prints for a store still in onboarding. Inherited from the run-sheet
  lane's finding rather than papered over with an unscoped rule here.
* The e2e journey steps were **written but not run** — the Playwright config starts its own nuxt and
  its own fixture backend, and this lane may start neither. Every assertion in them was first run
  against the live world by `walk.js`, which is in this directory.
