# Review — L-READ-THE-PRINT-PATH

Lane under review: `lane/evidence-record-handed-over` at **`ab6e7e1`** ("The training evidence record
can be handed over"). Reviewer: agent:L-READ-THE-PRINT-PATH, brief c44ad34f. Method: the produced
PDFs were read with `pdftotext`/`pdfinfo` before any stylesheet was; every claim below is a
measurement, not a restatement of the lane's evidence.

## Verdict: BUILT — the sheet is the record, no print rule escapes its scope, and the PDF is one an inspector can be handed

## 1. The good PDF against the screen — nothing the screen shows is dropped

`docs/plan/lanes/L-THE-EVIDENCE-RECORD-CAN-BE-HANDED-OVER/training-evidence.pdf`: **2 pages, A4**
(595.92 × 842.88 pt), first sheet begins `Opplæringsdokumentasjon / Selma Haug / 4dc94bb7-…`.
Read out of the file itself:

- the course (`Næringsmiddelhygiene og temperaturkontroll`, `v1`), `07.08.2026, 09:59`, **85% beside
  `Grense 80%`**, `Bestått`, `Koblet`;
- the **full 64-hex sha256** `db69110e…0d9d0` (wrapped, complete — counted), **beside the material it
  was taken over**: `Innholdssider` JSON (`Håndhygiene`, `Kjølekjede 0–4 °C`, `Varmebehandling ≥ 75 °C`),
  the `Quiz` JSON, `Beståttgrense: 80%`;
- **both certificates** with type, issuer, dates, `Gyldig`, `I journalen`;
- **all 18 ledger rows**, same order as the screen (10 × 09:59, 2 × 10:05, 2 × 10:13, 4 × 10:28),
  each with actor `6ba6dd27-…f2f` and a delta that closes its brace; the column header row repeats on
  sheet 2;
- the `Opphav` triple (`Ført av <id>`, `I journalen`, `Ført av leder`) and all three footnotes
  (journal names nobody / Europe/Oslo / one person, one store).

Compared cell-for-cell against `record-on-screen.png` (captured at the same `Hentet 07.08.2026,
12:57` state): **nothing the screen's document shows is missing from the sheet**. The one screen/paper
difference is by design: the collapsed `<details>` summary on screen becomes the opened material on
paper. The missing `Z` in the `certificate.update` deltas is on the screen too — server data
faithfully rendered, not clipping.

**Both halves of the lane's hardest claim verified**: `pdftotext` finds the record (all strings
above) and finds **none of the controls** — not `Hent dokumentasjonen`, not `Skriv ut
dokumentasjonen`, not the disclosure notice (`Å hente dette dokumentet…`), not the intro (`slik den
kan legges fram…`), not the summary label (`Vis det frosne innholdet…`), not `Person`, no nav items.
The only `utlevering` hit is the document's own journal footnote — part of the record, not a control.

The BEFORE artifact proves the defect narrative rather than asserting it: **3 pages, page 1 carries
0 non-whitespace characters** (truly blank), and its text shows the right edge cut — `I journa`,
`Ført av 6b`, every delta stopped mid-JSON. The defect class the lane exists to prevent is real,
was produced by a stylesheet that passed every `getComputedStyle` assertion, and is gone from the
shipped file.

## 2. Print-rule scope — no rule escapes, and the vue-meta failure cannot recur here

- Both files carry exactly **one** `<style lang="scss" scoped>` block; every added `@media print`
  rule sits inside it and therefore carries a `data-v-` attribute. Selector sweep: page half touches
  only `.trn-ev-page*` and `.trn-ev-page > .trn-ev` (the child component's root, which legitimately
  carries the page's scope id); component half touches only `.trn-ev__*`, `.trn-table*`,
  `.trn-badge*`, `.trn-note*`, `.trn-form__hint`, `.trn-ref`, `summary` — all inside the component.
  **No selector reaches `body`, `.admin__content`, `.admin__main` or any ancestor.**
- **No `head()`, no `bodyAttrs`, no imperative class on `document.body`** anywhere in the diff — the
  exact mechanism vue-meta wiped on the personalliste is absent, so there is no guard for a rebuild
  to remove. The default-deny (`.trn-ev-page > * { display:none !important }`) with three named
  re-entries also covers whatever a later lane adds to the page.
- The shell's own print rules the page relies on are **present on the lane branch, its parent
  `780d405`, and trunk `00d84d7`** (verified per-ref): `AdminPageHeader.vue` hides `.admin-nav`,
  `OnboardingNotification.vue` hides its banner, each in its own scoped block. (An earlier reading
  of mine that they were missing at `ab6e7e1` was a zsh `$ref:c` expansion artifact — re-measured
  with braced expansion, they are there.)
- Cascade check on the re-entries: `.trn-ev-page__sheet-head`/`__footnote` tie the default-deny on
  specificity and win on order; `> .trn-ev` outranks it. Correct.

## 3. The details material is genuinely forced open

Two mechanisms in the component (`> *:not(summary) { display:block !important }` for engines that
suppress children of a closed `<details>`, `::details-content { content-visibility: visible }` for
current engines), and — decisively — **the produced PDF carries the material** (Innholdssider, Quiz,
Beståttgrense) while the screen shows the widget closed. The summary label is off the paper, rightly:
it is a control. The hash on the sheet is checkable, not merely believable.

## 4. The lane's suite, re-run at ab6e7e1

In a detached scratch worktree at `ab6e7e1`: `test/training-evidence-print.test.js` = **1 suite /
11 tests / 0 failed**. Non-vacuity re-proven, not taken on trust: collapsing `canPrint` to
`!this.busy` reds **exactly 5 arms**, as the lane claimed. The e2e journey steps are written but were
not run by the lane (its container ban) — honestly declared, and each assertion was first executed
against the live world by the committed `walk.js`/`walk.log`.

## 5. Ruling on the deliberate non-action (the sentence, C6)

**Building the document instead of withdrawing the promise was the correct call.**
`trn_ev_page_intro` names **no statute, no forskrift, no §** — C6's letter was never engaged, and
OD-6's `internkontroll` ban (translations/no.ts, «BANNLYST … til TR8/TR-B6») is respected: the three
new keys in no/en/de carry no legal citation. What was broken was the substantive promise «slik den
kan legges fram ved tilsyn» — a claim about producibility, and the honest repairs are produce-it or
unsay-it. Unsaying it would have left the module's central artifact unproducible and hidden that
fact; producing it makes the sentence true. The statute-naming question stays where OD-6 put it.

## 6. Ruling on the residue (no content hash of its own)

**The print path is defensible on its own on the day.** The sheet is the browser's rendering of the
server's JSON — the same tree the screen shows, recomputing nothing — and it is corroborable: it
carries the server-computed sha256 beside its material, an actor for every row, the `Hentet`
timestamp, and the fetch itself is journaled server-side as a disclosure row, so a doubted paper can
be checked against the journal on demand. What it is not is self-authenticating; a server-signed
export (the meals `X-Meals-Content-Hash` shape) is the stronger successor and is correctly a backend
lane, not a browser-side hash — which would be the browser asserting something, the one thing this
document's design forbids.

## Findings (none blocking)

1. **Blank sheet in the gated state via the browser's own menu.** When `gate !== 'open'` the
   default-deny hides the gate sentence and the paper heading never renders (it sits in the
   `v-else`), so browser-menu print yields a fully blank page — the exact shape the lane's own
   principle («a blank sheet reads as a clean file») rejects for the document's three states.
   Unreachable from the first-class control (disabled in that state). Exact change if wanted: add
   `.trn-ev-page__gate { display: block !important; }` to the page's print block.
2. **One wording slip in the lane's own evidence.md**: «The onboarding banner prints for a store
   still in onboarding» — measured false at `ab6e7e1`; the inherited scoped rule in
   `OnboardingNotification.vue` hides it on paper. The in-code comment in `training-evidence.vue`
   is the accurate one. Doc-only; no code change.
3. The `certificate.update` deltas' `expiryDateUtc` lacks the trailing `Z` the `register` deltas
   carry — present on screen and paper alike; server serialization, out of this lane's scope, noted
   so nobody later mistakes it for print clipping.

## Files
- Lane diff: `pages/admin/training-evidence.vue`, `components/admin/training/TrainingEvidenceDocument.vue`,
  `test/training-evidence-print.test.js`, `test/e2e/journeys/training-evidence-document.spec.js`,
  `translations/{no,en,de}.ts` (+6 lines each, no statute).
- Artifacts read: `docs/plan/lanes/L-THE-EVIDENCE-RECORD-CAN-BE-HANDED-OVER/{training-evidence.pdf,
  BEFORE-clipped-and-blank-first-page.pdf,record-on-screen.png,record-under-print-media.png,walk.log,evidence.md}`.
- Live world untouched: nothing restarted, nothing bound on :3971/:5971, no containers, no read
  performed against the owner's world (a fetch would have written a disclosure row mid-walk; the
  committed same-state captures carry the screen truth for the 12:57 record).
