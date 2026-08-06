# L-TRANSLATIONS-COLLISION — key-level collisions in `translations/{no,en,de}.ts`

**Read only. Nothing was resolved, and no sentence was chosen.** Every command was `git
for-each-ref`, `cat-file`, `merge-base`, `rev-list`, `merge-file -p` (stdout only) or `grep`.
No ref was written, no worktree created, no container started, nothing in the shared checkout
changed. The only files written are in this lane directory.

## The answer first

**Almost nothing collides.** The 46-lane / 43-variant figure is a *file*-level count and it does
not survive contact with the keys. Of **1,911 distinct keys added across all refs**, **1,321 are
added by exactly one ref**, and of the 590 added by two or more, **543 are byte-identical** —
the same lane's commits seen from several descendant branches. Genuine **branch-vs-branch**
disagreements number **47 in `no`, 44 in `en`, 48 in `de`**; a further **24 / 25 / 50** disagree
with the baseline rather than with another lane. And even those collapse into **19 / 20 / 21
distinct disagreements**, because the rivals differ in blocks — one lane reworded a whole
surface. `de` carries 25 extra baseline disagreements from `feature/swiss` alone, a long-lived
branch 146 commits behind, not a lane.

**And the sharp part is not in that list at all.** Nine of 87 simulated file merges produce
**no conflict and a duplicate key** — git auto-merges, the object literal ends up carrying the
key twice, and JavaScript takes the last one. That is the silent last-writer-wins, and §4 below
proves it mechanically rather than asserting it.

## As-of, denominator, and what was counted

| | |
|---|---|
| repo | `/Users/svendaneel/okam/Web-modules` |
| baseline `HEAD` | `e34977acebd59b223584158c33451b6f1ffd82c1` (`feature/restaurant-modules`) |
| **as-of** | **2026-08-05T03:06Z**, refs enumerated at `lanes/L-TRANSLATIONS-COLLISION/refs.txt` |
| refs enumerated | **117** = 108 `refs/heads` + 9 `refs/lanes` |
| claimants analysed | **118** = 117 refs + the **working tree**, counted and labelled `WORKING-TREE` |
| baseline key counts | `no` 4,817 · `en` 4,782 · `de` 4,782 |
| parse failures | **0** across 118 claimants × 3 files |

Both ref namespaces were enumerated. The count did move: the census that raised this lane saw
107 then 108 heads; at this lane's as-of it is **108 heads + 9 lanes = 117**. `refs/salvage` and
`refs/remotes` were *not* included — they are not lane work and the brief names lanes.

**The working tree was counted as a 47th claimant, not as the truth.** All three files are
` M` in the shared checkout. It authors 348 keys, 9–11 of them divergent, and it is named in
every table below exactly like a branch. `core/translations/{no,en,de}.ts` exist but are **clean**
and are a different, 406-key dictionary — out of scope, and not the files the census counted.

### Method, and why a file diff is the wrong instrument

Each file is a flat `export default { key: 'value', ... }` — one entry per line, no nesting, at
every ref. They were **parsed, not diffed**: `extract.py` tokenises each line into `(key, value
literal)` and normalises quoting and backslash escapes, so `'a'` and `"a"` are the same value.
Any line it cannot parse is reported, not dropped — **zero lines were unparsed anywhere**.

For each claimant the base is `merge-base(ref, e34977ac)`, so *added* means authored by that
branch rather than inherited. Baseline is then added as a claimant for keys it already holds, so
a lane that disagrees with the tip is visible alongside lanes that disagree with each other.

**Method validated on the known positive before any negative was reported.** `wfr_access_no_list`
resolves to exactly one remover — `lane/fe-wf-invite-list-revoke` — in all three locales, which is
the case the brief supplied. **Removal is carried as a third class throughout.**

## 1. Counts per locale

| | `no.ts` | `en.ts` | `de.ts` |
|---|---|---|---|
| keys **added** by ≥1 claimant | 1911 | 1911 | 1911 |
| …added by exactly one claimant | 1321 | 1321 | 1321 |
| …added by two or more | 590 | 590 | 590 |
| **DIVERGENT — branch vs branch** | 47 | 44 | 48 |
| **DIVERGENT — claimant vs baseline** | 24 | 25 | 50 |
| keys **modified** (value changed in place) | 9 | 9 | 34 |
| keys **removed** | 4 | 4 | 4 |

The added key **sets are identical across all three locales** — verified, not assumed: every
claimant that adds a key adds it to `no`, `en` and `de` in the same commit. **No branch makes a
partial addition.** The locale asymmetry in the divergent counts is entirely translation
wording, not missing keys.

## 2. The divergences, grouped by who disagrees

Rival groups, largest first. A group is one disagreement; the keys in it move together.
`behind` is commits behind the baseline tip.

### `translations/no.ts` — 71 divergent keys in 19 disagreements

| keys | side A | side B |
|---:|---|---|
| 31 | `candidate/fe-compose-2026-08-05` (behind 0)<br>`lane/collect-review-conditions` (behind 0)<br>`lane/fe-meals-reconcile-ui` (behind 2) | `lane/fe-training-meals-surfaces` (behind 49) |
| 7 | **WORKING-TREE**<br>`candidate/fe-compose-2026-08-05` (behind 0)<br>`lane/collect-review-conditions` (behind 0)<br>`lane/train-evidence-pack-ui` (behind 0)<br>`lane/wf-pubhist` (behind 0) | `lane/fe-training-meals-surfaces` (behind 49) |
| 5 | **BASELINE(e34977ac)** | `lane/growth-admin` (behind 99) |
| 4 | **BASELINE(e34977ac)** | `lane/events-admin` (behind 99) |
| 4 | **BASELINE(e34977ac)** | `lane/fe-wf-self` (behind 49) |
| 4 | **BASELINE(e34977ac)** | `lane/training-admin` (behind 88) |
| 3 | `lane/fe-wf-blind-bind-name` (behind 45)<br>`lane/fe-wf-link-deadend` (behind 45) | `lane/fe-wf-oplink` (behind 45) |
| 2 | `candidate/fe-compose-2026-08-05` (behind 0)<br>`lane/collect-review-conditions` (behind 0)<br>`lane/mrg-lag-visible` (behind 2) | `lane/fe-events-margin-surfaces` (behind 49) |
| 1 | **BASELINE(e34977ac)** | **WORKING-TREE**<br>`lane/train-readonly-visible` (behind 0)<br>`lane/wf-pubhist` (behind 0) |
| 1 | **BASELINE(e34977ac)** | `candidate/fe-compose-2026-08-05` (behind 0)<br>`lane/collect-review-conditions` (behind 0)<br>`lane/meals-reachable-web` (behind 14) |
| 1 | **BASELINE(e34977ac)** | `candidate/fe-compose-2026-08-05` (behind 0)<br>`lane/collect-review-conditions` (behind 0)<br>`lane/wf-idreg` (behind 50)<br>`lane/wf-kodeoversikt-ui` (behind 0) |
| 1 | **BASELINE(e34977ac)** | `lane/margin-recipes` (behind 99) |
| 1 | **BASELINE(e34977ac)** | `lane/mrg-waste-frontend` (behind 2) |
| 1 | **BASELINE(e34977ac)** | `lane/workforce-roster` (behind 99) |
| 1 | **BASELINE(e34977ac)**<br>`lane/training-admin` (behind 88) | `lane/fe-training-meals-surfaces` (behind 49) |
| 1 | **WORKING-TREE**<br>`candidate/fe-compose-2026-08-05` (behind 0)<br>`lane/collect-review-conditions` (behind 0)<br>`lane/fe-meals-statement-surface` (behind 2)<br>`lane/wf-pubhist` (behind 0) | `lane/fe-training-meals-surfaces` (behind 49) |
| 1 | `candidate/fe-compose-2026-08-05` (behind 0)<br>`lane/coercion-write-paths` (behind 2)<br>`lane/collect-review-conditions` (behind 0) | `lane/mrg-waste-frontend` (behind 2) |
| 1 | `candidate/fe-compose-2026-08-05` (behind 0)<br>`lane/collect-review-conditions` (behind 0)<br>`lane/fe-meals-journey-locator` (behind 2)<br>`lane/fe-meals-pretick-walked` (behind 2)<br>`lane/meals-enrol-pretick` (behind 2) | `lane/meals-enrol-ui` (behind 2) |
| 1 | `lane/fe-wf-blind-bind-name` (behind 45)<br>`lane/fe-wf-oplink` (behind 45) | `lane/fe-wf-link-deadend` (behind 45) |

### `translations/en.ts` — 69 divergent keys in 20 disagreements

| keys | side A | side B |
|---:|---|---|
| 26 | `candidate/fe-compose-2026-08-05` (behind 0)<br>`lane/collect-review-conditions` (behind 0)<br>`lane/fe-meals-reconcile-ui` (behind 2) | `lane/fe-training-meals-surfaces` (behind 49) |
| 8 | **WORKING-TREE**<br>`candidate/fe-compose-2026-08-05` (behind 0)<br>`lane/collect-review-conditions` (behind 0)<br>`lane/train-evidence-pack-ui` (behind 0)<br>`lane/wf-pubhist` (behind 0) | `lane/fe-training-meals-surfaces` (behind 49) |
| 5 | **BASELINE(e34977ac)** | `lane/events-admin` (behind 99) |
| 5 | **BASELINE(e34977ac)** | `lane/growth-admin` (behind 99) |
| 4 | **BASELINE(e34977ac)** | `lane/fe-wf-self` (behind 49) |
| 4 | **BASELINE(e34977ac)** | `lane/training-admin` (behind 88) |
| 3 | `lane/fe-wf-blind-bind-name` (behind 45)<br>`lane/fe-wf-link-deadend` (behind 45) | `lane/fe-wf-oplink` (behind 45) |
| 2 | `candidate/fe-compose-2026-08-05` (behind 0)<br>`lane/collect-review-conditions` (behind 0)<br>`lane/mrg-lag-visible` (behind 2) | `lane/fe-events-margin-surfaces` (behind 49) |
| 1 | **BASELINE(e34977ac)** | **WORKING-TREE**<br>`lane/train-readonly-visible` (behind 0)<br>`lane/wf-pubhist` (behind 0) |
| 1 | **BASELINE(e34977ac)** | `candidate/fe-compose-2026-08-05` (behind 0)<br>`lane/collect-review-conditions` (behind 0)<br>`lane/meals-reachable-web` (behind 14) |
| 1 | **BASELINE(e34977ac)** | `candidate/fe-compose-2026-08-05` (behind 0)<br>`lane/collect-review-conditions` (behind 0)<br>`lane/wf-idreg` (behind 50)<br>`lane/wf-kodeoversikt-ui` (behind 0) |
| 1 | **BASELINE(e34977ac)** | `lane/margin-recipes` (behind 99) |
| 1 | **BASELINE(e34977ac)** | `lane/mrg-waste-frontend` (behind 2) |
| 1 | **BASELINE(e34977ac)** | `lane/workforce-roster` (behind 99) |
| 1 | **BASELINE(e34977ac)**<br>`lane/training-admin` (behind 88) | `lane/fe-training-meals-surfaces` (behind 49) |
| 1 | **WORKING-TREE**<br>`candidate/fe-compose-2026-08-05` (behind 0)<br>`lane/collect-review-conditions` (behind 0)<br>`lane/fe-meals-statement-surface` (behind 2)<br>`lane/wf-pubhist` (behind 0) | `lane/fe-training-meals-surfaces` (behind 49) |
| 1 | **WORKING-TREE**<br>`lane/wf-pubhist` (behind 0) | `lane/fe-pos-clock` (behind 49)<br>`lane/fe-wf-blind-bind-name` (behind 45)<br>`lane/fe-wf-link-deadend` (behind 45)<br>`lane/fe-wf-oplink` (behind 45) |
| 1 | `candidate/fe-compose-2026-08-05` (behind 0)<br>`lane/coercion-write-paths` (behind 2)<br>`lane/collect-review-conditions` (behind 0) | `lane/mrg-waste-frontend` (behind 2) |
| 1 | `candidate/fe-compose-2026-08-05` (behind 0)<br>`lane/collect-review-conditions` (behind 0)<br>`lane/fe-meals-journey-locator` (behind 2)<br>`lane/fe-meals-pretick-walked` (behind 2)<br>`lane/meals-enrol-pretick` (behind 2) | `lane/meals-enrol-ui` (behind 2) |
| 1 | `lane/fe-wf-blind-bind-name` (behind 45)<br>`lane/fe-wf-oplink` (behind 45) | `lane/fe-wf-link-deadend` (behind 45) |

### `translations/de.ts` — 98 divergent keys in 21 disagreements

| keys | side A | side B |
|---:|---|---|
| 30 | `candidate/fe-compose-2026-08-05` (behind 0)<br>`lane/collect-review-conditions` (behind 0)<br>`lane/fe-meals-reconcile-ui` (behind 2) | `lane/fe-training-meals-surfaces` (behind 49) |
| 25 | **BASELINE(e34977ac)** | `feature/swiss` (behind 146) |
| 8 | **WORKING-TREE**<br>`candidate/fe-compose-2026-08-05` (behind 0)<br>`lane/collect-review-conditions` (behind 0)<br>`lane/train-evidence-pack-ui` (behind 0)<br>`lane/wf-pubhist` (behind 0) | `lane/fe-training-meals-surfaces` (behind 49) |
| 5 | **BASELINE(e34977ac)** | `lane/events-admin` (behind 99) |
| 5 | **BASELINE(e34977ac)** | `lane/growth-admin` (behind 99) |
| 4 | **BASELINE(e34977ac)** | `lane/fe-wf-self` (behind 49) |
| 4 | **BASELINE(e34977ac)** | `lane/training-admin` (behind 88) |
| 3 | `lane/fe-wf-blind-bind-name` (behind 45)<br>`lane/fe-wf-link-deadend` (behind 45) | `lane/fe-wf-oplink` (behind 45) |
| 2 | `candidate/fe-compose-2026-08-05` (behind 0)<br>`lane/collect-review-conditions` (behind 0)<br>`lane/mrg-lag-visible` (behind 2) | `lane/fe-events-margin-surfaces` (behind 49) |
| 1 | **BASELINE(e34977ac)** | **WORKING-TREE**<br>`lane/train-readonly-visible` (behind 0)<br>`lane/wf-pubhist` (behind 0) |
| 1 | **BASELINE(e34977ac)** | `candidate/fe-compose-2026-08-05` (behind 0)<br>`lane/collect-review-conditions` (behind 0)<br>`lane/meals-reachable-web` (behind 14) |
| 1 | **BASELINE(e34977ac)** | `candidate/fe-compose-2026-08-05` (behind 0)<br>`lane/collect-review-conditions` (behind 0)<br>`lane/wf-idreg` (behind 50)<br>`lane/wf-kodeoversikt-ui` (behind 0) |
| 1 | **BASELINE(e34977ac)** | `lane/margin-recipes` (behind 99) |
| 1 | **BASELINE(e34977ac)** | `lane/mrg-waste-frontend` (behind 2) |
| 1 | **BASELINE(e34977ac)** | `lane/workforce-roster` (behind 99) |
| 1 | **BASELINE(e34977ac)**<br>`lane/training-admin` (behind 88) | `lane/fe-training-meals-surfaces` (behind 49) |
| 1 | **WORKING-TREE**<br>`candidate/fe-compose-2026-08-05` (behind 0)<br>`lane/collect-review-conditions` (behind 0)<br>`lane/fe-meals-statement-surface` (behind 2)<br>`lane/wf-pubhist` (behind 0) | `lane/fe-training-meals-surfaces` (behind 49) |
| 1 | **WORKING-TREE**<br>`lane/wf-pubhist` (behind 0) | `lane/fe-pos-clock` (behind 49)<br>`lane/fe-wf-blind-bind-name` (behind 45)<br>`lane/fe-wf-link-deadend` (behind 45)<br>`lane/fe-wf-oplink` (behind 45) |
| 1 | `candidate/fe-compose-2026-08-05` (behind 0)<br>`lane/coercion-write-paths` (behind 2)<br>`lane/collect-review-conditions` (behind 0) | `lane/mrg-waste-frontend` (behind 2) |
| 1 | `candidate/fe-compose-2026-08-05` (behind 0)<br>`lane/collect-review-conditions` (behind 0)<br>`lane/fe-meals-journey-locator` (behind 2)<br>`lane/fe-meals-pretick-walked` (behind 2)<br>`lane/meals-enrol-pretick` (behind 2) | `lane/meals-enrol-ui` (behind 2) |
| 1 | `lane/fe-wf-blind-bind-name` (behind 45)<br>`lane/fe-wf-oplink` (behind 45) | `lane/fe-wf-link-deadend` (behind 45) |

## 3. Every divergent key, with both sentences

**Not resolved.** Which sentence wins is an authoring judgement and several of these are
money-facing or statutory. The list is the deliverable; the choice is not this lane's.

### `translations/no.ts` (71)

#### `ev_deposit_token`

- `lane/events-admin`
  > Depositumstoken
- **BASELINE(e34977ac)**
  > Depositumslenke

#### `ev_settlement_gate_note`

- `lane/events-admin`
  > Lukk, avstem og lukk oppgjør ligger bak Events.Settlement, som er hardkodet av på denne grenen. Knappene står her fordi serverens svar er det eneste som teller — de vil svare EVENTS_DISABLED.
- **BASELINE(e34977ac)**
  > Lukk, oppgjørslinjene, avstem og lukk oppgjør ligger bak Events.Settlement — en bryter per utsalgssted som er av til noen slår den på. Knappene står her fordi serverens svar er det eneste som teller: med bryteren av svarer de EVENTS_DISABLED.

#### `ev_settlement_gated`

- `lane/events-admin`
  > Oppgjørsmaskinen er ikke slått på for dette utsalgsstedet. På denne grenen finnes det ingen bryter som kan slå den på.
- **BASELINE(e34977ac)**
  > Oppgjørsmaskinen er ikke slått på for dette utsalgsstedet. Det er en bryter per utsalgssted (Events.Settlement), og den er av som standard.

#### `ev_version_token`

- `lane/events-admin`
  > Tilbudstoken
- **BASELINE(e34977ac)**
  > Tilbudslenke

#### `ff_page_intro`

- **WORKING-TREE**, `lane/train-readonly-visible`, `lane/wf-pubhist`
  > Bryterne som avgjør hva de seks modulene får lov til å skrive for denne butikken. Alt er avslått som utgangspunkt. Hva «av» gjør med lesingen, er ikke likt fra modul til modul — noen fortsetter å vise det som allerede er registrert, andre blir helt borte — så les raden før du slår av.
- **BASELINE(e34977ac)**
  > Bryterne som avgjør hva de seks modulene får lov til å skrive for denne butikken. Alt er avslått som utgangspunkt: en bryter som ikke står på, avviser skrivinger — lesing og eksport av det som allerede er registrert, fortsetter.

#### `ff_withheld_note`

- `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/meals-reachable-web`
  > Listen er katalogen tjenesten oppgir. En modul kan ha trinn som med vilje ikke tilbys her, av to ulike grunner. Noen styrer ingenting, og gir ingen effekt uansett hva de settes til — en bryter som ikke gjør noe er verre enn ingen bryter. Andre styrer reell oppførsel, men er ikke et valg per butikk og settes i serveroppsettet i stedet. At noe ikke tilbys her, betyr ikke at det er uvirksomt.
- **BASELINE(e34977ac)**
  > Listen er katalogen tjenesten oppgir. En modul kan ha trinn som med vilje ikke tilbys her — de gir ingen effekt uansett hva de settes til, og en bryter som ikke gjør noe er verre enn ingen bryter.

#### `growth_gate_dispatched_note`

- `lane/growth-admin`
  > Denne versjonen er allerede sendt. Å sende igjen ville ikke sende på nytt — det er én utsendelse per godkjent versjon.
- **BASELINE(e34977ac)**
  > Denne versjonen er allerede sendt inn. Å sende igjen ville ikke sende på nytt — det er én utsendelse per godkjent versjon.

#### `growth_gate_dispatched_toast`

- `lane/growth-admin`
  > Nyhetsbrevet ble sendt.
- **BASELINE(e34977ac)**
  > Utsendelsen er kjørt. Leverandøren tok imot {accepted} av {eligible} mottakere. Levering bekreftes først når leverandøren melder tilbake — se «Hva skjedde» under.

#### `growth_gate_state_dispatched`

- `lane/growth-admin`
  > Sendt
- **BASELINE(e34977ac)**
  > Sendt inn

#### `growth_gate_state_ready`

- `lane/growth-admin`
  > Klar
- **BASELINE(e34977ac)**
  > Vilkårene er oppfylt

#### `growth_test_intro`

- `lane/growth-admin`
  > Sender gjeldende versjon til én adresse du oppgir, gjennom leverandørens testrute. Den når ingen gjest og rører ingen samtykkelogg.
- **BASELINE(e34977ac)**
  > Sender gjeldende versjon til e-postadressen på din egen konto, gjennom leverandørens testrute. Den når ingen gjest og rører ingen samtykkelogg.

#### `meals_enrol_known_note`

- `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/fe-meals-journey-locator`, `lane/fe-meals-pretick-walked`, `lane/meals-enrol-pretick`
  > Påmeldt nå: {count}. Boksene under er huket av etter den avlesningen — fjern huken for å melde noen av.
- `lane/meals-enrol-ui`
  > Påmeldt nå: {count}. Dette er svaret på påmeldingen du nettopp lagret — det er ikke lest tilbake, og forsvinner når siden lastes på nytt.

#### `meals_rc_ack_still_blocks`

- `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/fe-meals-reconcile-ui`
  > Sperrer fortsatt måneden. Bare et lukket avvik slipper den fri.
- `lane/fe-training-meals-surfaces`
  > Blokkerer fortsatt oppgjøret.

#### `meals_rc_acknowledge`

- `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/fe-meals-reconcile-ui`
  > Ta tak i
- `lane/fe-training-meals-surfaces`
  > Kvitter

#### `meals_rc_blocking_many`

- `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/fe-meals-reconcile-ui`
  > {count} avvik må lukkes før måneden kan avsluttes.
- `lane/fe-training-meals-surfaces`
  > {count} avvik blokkerer oppgjør. Både åpne og kvitterte teller.

#### `meals_rc_blocking_one`

- `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/fe-meals-reconcile-ui`
  > Ett avvik må lukkes før måneden kan avsluttes.
- `lane/fe-training-meals-surfaces`
  > Ett avvik blokkerer et oppgjør. Både åpne og kvitterte teller.

#### `meals_rc_blocking_title`

- `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/fe-meals-reconcile-ui`
  > Månedsavslutningen er sperret
- `lane/fe-training-meals-surfaces`
  > Perioder er blokkert

#### `meals_rc_blocking_unknown`

- `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/fe-meals-reconcile-ui`
  > Vi vet ikke hvor mange avvik som står åpne.
- `lane/fe-training-meals-surfaces`
  > Vi vet ikke hvor mange avvik som blokkerer.

#### `meals_rc_clear_body`

- `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/fe-meals-reconcile-ui`
  > Ingen avvik står åpne ved dette utsalgsstedet.
- `lane/fe-training-meals-surfaces`
  > Ingen avvik i køen står i veien for et oppgjør.

#### `meals_rc_clear_title`

- `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/fe-meals-reconcile-ui`
  > Ingenting sperrer
- `lane/fe-training-meals-surfaces`
  > Ingenting blokkerer

#### `meals_rc_col_kind`

- `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/fe-meals-reconcile-ui`
  > Avvik
- `lane/fe-training-meals-surfaces`
  > Type

#### `meals_rc_drift_intro`

- `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/fe-meals-reconcile-ui`
  > Observasjoner, ikke saker. De regnes ut på nytt hver gang siden hentes, de kan ikke lukkes, og de sperrer ingen månedsavslutning.
- `lane/fe-training-meals-surfaces`
  > Beregnes på nytt ved hver lesing. De har ingen id, ingen tilstand og ingen avklaringsrute, og de blokkerer ingenting.

#### `meals_rc_drift_no_repair`

- `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/fe-meals-reconcile-ui`
  > Det finnes ingen reparasjon for dette i produktet i dag. Si fra til Okam.
- `lane/fe-training-meals-surfaces`
  > Det finnes ingen reparasjonsvei for disse i produktet. «Budsjettrad mangler» er det alvorligste: hovedboken har posteringer for perioden uten en budsjettrad bak seg, så neste tilbud starter på null og periodens forbruk slutter å telle mot beløpsgrensen.

#### `meals_rc_drift_title`

- `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/fe-meals-reconcile-ui`
  > Avvik i budsjettvaktene
- `lane/fe-training-meals-surfaces`
  > Budsjettavvik (kun observasjon)

#### `meals_rc_empty`

- `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/fe-meals-reconcile-ui`
  > Det er ikke meldt noe avvik her.
- `lane/fe-training-meals-surfaces`
  > Ingen avvik er ført på denne butikken.

#### `meals_rc_err_note_required`

- `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/fe-meals-reconcile-ui`
  > Skriv en begrunnelse. Den er den eneste dokumentasjonen på hvorfor dette avviket ble lukket.
- `lane/fe-training-meals-surfaces`
  > Skriv en begrunnelse. Serveren avviser en avklaring uten.

#### `meals_rc_forward_only`

- `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/fe-meals-reconcile-ui`
  > Dette går bare én vei. Et lukket avvik kan ikke åpnes igjen.
- `lane/fe-training-meals-surfaces`
  > Tilstandene går bare framover: åpent → kvittert → avklart. Det finnes ingen vei tilbake.

#### `meals_rc_guard_missing`

- `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/fe-meals-reconcile-ui`
  > Vakt mangler
- `lane/fe-training-meals-surfaces`
  > Budsjettrad mangler

#### `meals_rc_kind_apply_failed`

- `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/fe-meals-reconcile-ui`
  > Postering avvist
- `lane/fe-training-meals-surfaces`
  > Føring avvist av databasen

#### `meals_rc_kind_apply_failed_why`

- `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/fe-meals-reconcile-ui`
  > Databasen avviste posteringen, og den vil bli avvist likt hver gang. Den er satt til side i stedet for å prøves om igjen i det uendelige.
- `lane/fe-training-meals-surfaces`
  > Føringen mot hovedboken ble avvist på en måte som vil gjenta seg likt ved hvert forsøk, så kvitteringen ble satt til side i stedet for å blokkere alle senere.

#### `meals_rc_kind_expired`

- `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/fe-meals-reconcile-ui`
  > Utløpt reservasjon
- `lane/fe-training-meals-surfaces`
  > Utløpt binding

#### `meals_rc_kind_expired_why`

- `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/fe-meals-reconcile-ui`
  > En bundet reservasjon nådde utløp uten at det kom et salg på den, så beløpet ble frigjort for sikkerhets skyld.
- `lane/fe-training-meals-surfaces`
  > En bundet reservasjon nådde utløp uten at det kom en salgskvittering, så budsjettandelen ble frigitt defensivt.

#### `meals_rc_kind_unknown_why`

- `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/fe-meals-reconcile-ui`
  > Denne siden kjenner ikke denne avvikstypen. Den vises som den kom, uten å bli tolket.
- `lane/fe-training-meals-surfaces`
  > Serveren oppga en type denne siden ikke kjenner.

#### `meals_rc_kind_unmatched`

- `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/fe-meals-reconcile-ui`
  > Kvittering uten tilknytning
- `lane/fe-training-meals-surfaces`
  > Kvittering uten kobling

#### `meals_rc_kind_unmatched_why`

- `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/fe-meals-reconcile-ui`
  > Journalen har en kvittering på en bedriftsordre som ikke lot seg knytte til noen reservasjon, så beløpet er verken trukket eller reversert.
- `lane/fe-training-meals-surfaces`
  > Journalen viste en bedriftsordre uten en binding å koble den til, så trekket kunne ikke føres.

#### `meals_rc_owner_note`

- `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/fe-meals-reconcile-ui`
  > Hvorfor lukkes det?
- `lane/fe-training-meals-surfaces`
  > Begrunnelse

#### `meals_rc_queue_title`

- `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/fe-meals-reconcile-ui`
  > Avstemming
- `lane/fe-training-meals-surfaces`
  > Avvik

#### `meals_rc_resolve`

- `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/fe-meals-reconcile-ui`
  > Lukk
- `lane/fe-training-meals-surfaces`
  > Avklar

#### `meals_rc_resolve_action`

- `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/fe-meals-reconcile-ui`
  > Lukk avviket
- `lane/fe-training-meals-surfaces`
  > Avklar

#### `meals_rc_resolve_title`

- `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/fe-meals-reconcile-ui`
  > Lukk avviket
- `lane/fe-training-meals-surfaces`
  > Avklar avviket

#### `meals_rc_state_acknowledged`

- `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/fe-meals-reconcile-ui`
  > Tatt tak i
- `lane/fe-training-meals-surfaces`
  > Kvittert

#### `meals_rc_state_resolved`

- `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/fe-meals-reconcile-ui`
  > Lukket
- `lane/fe-training-meals-surfaces`
  > Avklart

#### `meals_rc_write_gate`

- `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/fe-meals-reconcile-ui`
  > Knappene her er styrt av en annen bryter enn listen. At listen vises, betyr ikke at du får lov til å lukke noe – da svarer serveren at modulen ikke finnes.
- `lane/fe-training-meals-surfaces`
  > Merk: at køen vises betyr ikke at knappene virker. Lesingen bruker butikkens egen «meals.module»-bryter, mens avklaringen ligger bak modulens konfigurasjonsbryter. De to kan være uenige, og da leser du køen uten å kunne endre en linje i den.

#### `mrg_err_stale`

- `lane/margin-recipes`
  > Noen andre endret dette mens du jobbet. Last siden på nytt og prøv igjen.
- **BASELINE(e34977ac)**
  > Noen andre lagret en endring her mens du hadde den åpen, så din ble ikke tatt med. Last siden på nytt for å hente deres versjon, og gjør endringen din en gang til.

#### `mrgs_err_projection_behind`

- `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/mrg-lag-visible`
  > Uken ble ikke fryst: salgsprojeksjonen ligger {lag} poster bak kassen, så tallene ville blitt frosset som et gulv. Oppgjøret står fortsatt åpent. Projeksjonen tar igjen av seg selv — beregn på nytt og frys om et par minutter.
- `lane/fe-events-margin-surfaces`
  > Salgsprojeksjonen ligger {lag} journalposter bak kassen, så ukens tall er et gulv — ekte, men for lave med et ukjent beløp. Ferdigstilling er avvist for ikke å fryse gulvet som ukens fasit. Projeksjonen henter seg inn av seg selv i løpet av et par minutter: beregn på nytt og ferdigstill da. Oppgjøret står åpent og redigerbart i mellomtiden.

#### `mrgs_err_projection_behind_unsized`

- `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/mrg-lag-visible`
  > Uken ble ikke fryst: salgsprojeksjonen ligger bak kassen, og serveren sa ikke hvor langt. Oppgjøret står fortsatt åpent. Projeksjonen tar igjen av seg selv — beregn på nytt og frys om et par minutter.
- `lane/fe-events-margin-surfaces`
  > Salgsprojeksjonen ligger bak kassen, så ukens tall er et gulv — ekte, men for lave med et ukjent beløp. Ferdigstilling er avvist. Projeksjonen henter seg inn av seg selv i løpet av et par minutter.

#### `mrgs_waste_err_quantity`

- `candidate/fe-compose-2026-08-05`, `lane/coercion-write-paths`, `lane/collect-review-conditions`
  > Mengden må være et tall. La feltet stå tomt om du ikke vil oppgi mengde.
- `lane/mrg-waste-frontend`
  > Mengden må være et tall større enn null, med opptil seks desimaler og uten enhet — for eksempel 2,5. Ingenting ble sendt.

#### `mrgs_waste_frozen`

- `lane/mrg-waste-frontend`
  > Denne uka har et ferdigstilt oppgjør, så ukas svinn er frosset sammen med tallene. Det gjelder hele uka, også når du står i en åpen retting av den: en ny revisjon åpner tallene, ikke svinnet.
- **BASELINE(e34977ac)**
  > Oppgjøret for denne uka er låst, så ukas svinn er frosset sammen med tallene. Rett det opp ved å åpne neste revisjon av uka.

#### `nav_meals_statements`

- **WORKING-TREE**, `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/fe-meals-statement-surface`, `lane/wf-pubhist`
  > Månedsoppgjør bedrift
- `lane/fe-training-meals-surfaces`
  > Månedsoppgjør

#### `nav_training_evidence`

- **WORKING-TREE**, `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/train-evidence-pack-ui`, `lane/wf-pubhist`
  > Dokumentasjon
- `lane/fe-training-meals-surfaces`
  > Kompetansebevis

#### `nav_workforce_roster`

- `lane/workforce-roster`
  > Ansatte
- **BASELINE(e34977ac)**
  > Bemanning

#### `trn_completion_grading_note`

- `lane/training-admin`
  > Bestått lagres nøyaktig slik det krysses av her. Serveren sammenligner det ikke med beståttgrensen på versjonen, og journalen kan ikke endres etterpå — så avkryssingen er lederens egen påstand, ikke en beregning.
- **BASELINE(e34977ac)**
  > Serveren avgjør bestått eller ikke. Den sammenligner poengsummen som føres her, med beståttgrensen på versjonen det føres mot — nøyaktig på grensen er bestått, og ingenting rundes av først. Det finnes ingen bestått-avkryssing, fordi journalen ikke kan endres etterpå og et bestått som poengsummen ikke dekker, aldri kunne blitt rettet.

#### `trn_ev_asof`

- **WORKING-TREE**, `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/train-evidence-pack-ui`, `lane/wf-pubhist`
  > Hentet {when}.
- `lane/fe-training-meals-surfaces`
  > Tidspunkter vises i butikkens tidssone ({zone}). Dokumentet ble satt sammen {asOf}.

#### `trn_ev_col_actor`

- **WORKING-TREE**, `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/train-evidence-pack-ui`, `lane/wf-pubhist`
  > Ført av
- `lane/fe-training-meals-surfaces`
  > Utført av

#### `trn_ev_page_intro`

- **WORKING-TREE**, `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/train-evidence-pack-ui`, `lane/wf-pubhist`
  > Én persons samlede opplæringsjournal, slik den kan legges fram ved tilsyn: gjennomføringene med det frosne innholdet de ble tatt mot, sertifikatene, og journalradene som sier hvem som førte hver av dem. Ingenting regnes ut på nytt her — dokumentet skriver ut serverens tall ved siden av det de ble regnet ut fra, slik at de kan etterprøves.
- `lane/fe-training-meals-surfaces`
  > Dokumentet et tilsyn får: hva én navngitt person er opplært i, med tallene beviset er utledet fra ved siden av påstanden.

#### `trn_ev_page_title`

- **WORKING-TREE**, `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/train-evidence-pack-ui`, `lane/wf-pubhist`
  > Opplæringsdokumentasjon
- `lane/fe-training-meals-surfaces`
  > Kompetansebevis

#### `trn_ev_refused`

- **WORKING-TREE**, `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/train-evidence-pack-ui`, `lane/wf-pubhist`
  > Serveren avviste oppslaget. Det betyr ikke at det ikke finnes dokumentasjon — det betyr at vi ikke fikk se den.
- `lane/fe-training-meals-surfaces`
  > Serveren avviste oppslaget og sier ikke hvorfor. Det er samme svar for en person som ikke finnes, en som hører til en annen arbeidsgiver, og en modul som ikke er slått på her — så vi gjetter ikke hvilken av dem det var.

#### `trn_ev_unknown`

- **WORKING-TREE**, `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/train-evidence-pack-ui`, `lane/wf-pubhist`
  > Serveren svarte ikke på en måte denne versjonen forstår. Da sies ingenting om hva butikken har ført på denne personen.
- `lane/fe-training-meals-surfaces`
  > Vi fikk ikke svar på oppslaget. Ingenting her er en påstand om personen.

#### `trn_footnote_scope`

- **BASELINE(e34977ac)**, `lane/training-admin`
  > Denne siden er journalen for kurs, tildelinger, gjennomføringer og sertifikater. Redigering av utkast, pensjonering av versjoner, retting av sertifikater og utløpsvarsel-listen er ikke koblet opp her.
- `lane/fe-training-meals-surfaces`
  > Denne siden er journalen for kurs, tildelinger, gjennomføringer og sertifikater, med utløpslisten. Redigering av utkast, pensjonering av versjoner og retting av sertifikater er ikke koblet opp her. Selve kompetansebeviset — dokumentet et tilsyn får — ligger på sin egen side.

#### `trn_page_title`

- `lane/training-admin`
  > Opplæring og internkontroll
- **BASELINE(e34977ac)**
  > Opplæring

#### `trn_reference_by_value`

- `lane/training-admin`
  > Referansen er en person- eller rolle-ID fra bemanningsmodulen, ført som en verdi. Opplæringsmodulen har ingen personliste og kontrollerer ikke at ID-en hører til noen som jobber her.
- **BASELINE(e34977ac)**
  > Referansen er en person- eller rolle-ID fra bemanningsmodulen, ført som en verdi. Ingenting kontrollerer den på en tildeling: en ID som ikke peker på noen, godtas nøyaktig som en som gjør det.

#### `trn_source_quiz`

- `lane/training-admin`
  > Quiz i appen
- **BASELINE(e34977ac)**
  > Quiz

#### `wfme_page_intro`

- `lane/fe-wf-self`
  > Vaktene du står på, vaktene du kan be om, det du har bedt om, og tiden du faktisk har stemplet.
- **BASELINE(e34977ac)**
  > Vaktene du står på, vaktene du kan be om, og det du har bedt om.

#### `wfme_pub_lede`

- `lane/fe-wf-self`
  > Lederen ser hvem som har lest planen.
- **BASELINE(e34977ac)**
  > Du har ikke åpnet denne ennå. Lederen ser hvem som har lest.

#### `wfme_pub_title_many`

- `lane/fe-wf-self`
  > {count} vaktplaner publisert til deg
- **BASELINE(e34977ac)**
  > {count} nye vaktplaner publisert

#### `wfme_pub_title_one`

- `lane/fe-wf-self`
  > Vaktplan publisert til deg
- **BASELINE(e34977ac)**
  > Ny vaktplan publisert

#### `wfoi_linked_to_ended`

- `lane/fe-wf-blind-bind-name`, `lane/fe-wf-oplink`
  > Koblet til {name}, men den ansettelsen er avsluttet. Kassa avviser stempling, og en ny kobling er ikke mulig.
- `lane/fe-wf-link-deadend`
  > Koblet til {name}, men den ansettelsen er avsluttet. Kassa avviser stempling. Fjern koblinga for å frigjøre operatøren.

#### `wfoi_person_unknown`

- `lane/fe-wf-blind-bind-name`, `lane/fe-wf-link-deadend`
  > Ukjent – vi fikk ikke svar på hvem
- `lane/fe-wf-oplink`
  > Kan tilhøre en person som alt finnes

#### `wfoi_review_permanence`

- `lane/fe-wf-blind-bind-name`, `lane/fe-wf-link-deadend`
  > Koblinga avgjør hvem lønna for hver stempling havner hos. Den kan fjernes etterpå, og det blir logget hvem som gjorde det, men den kan ikke flyttes til en annen person i ett steg. Les navnet på begge sider før du bekrefter.
- `lane/fe-wf-oplink`
  > Koblinga kan ikke fjernes eller flyttes etterpå. Les navnet på begge sider før du bekrefter.

#### `wfoi_side_existing_login`

- `lane/fe-wf-blind-bind-name`, `lane/fe-wf-link-deadend`
  > Denne operatøren har en innlogging, men skjermen fikk ikke svar på hvem den tilhører. Hvis innloggingen alt tilhører en person i Okam, blir ansettelsen knyttet til den personen og ikke til en ny. Prøv å åpne panelet på nytt før du bekrefter.
- `lane/fe-wf-oplink`
  > Denne operatøren har en innlogging. Hvis innloggingen alt tilhører en person i Okam, blir ansettelsen knyttet til den personen og ikke til en ny. Hvem det er, kan ikke vises her, og har personen alt en aktiv ansettelse hos arbeidsgiveren, blir linja avvist.

#### `wfpl_identity_gap`

- `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/wf-idreg`, `lane/wf-kodeoversikt-ui`
  > IDENTIFISERING: § 8-5-6 krever navn og fødselsnummer eller D-nummer for hver person. Numrene kan erstattes av unike koder, men bare dersom det føres en oversikt over kodene med tilhørende fødselsnummer eller D-nummer. Okam samler verken inn eller lagrer fødselsnummer, så kodene under kan ikke slås opp i et fødselsnummer i systemet. Kodeoversikten for denne dagen lastes ned fra personallistesiden — ferdig utfylt med kodene, navnene og fristen, med feltet for fødselsnummer åpent. Virksomheten fyller det inn og oppbevarer oversikten sammen med personallisten i tre år og seks måneder etter regnskapsårets slutt. Uten den utfylte oversikten er denne listen ikke fullstendig identifikasjon.
- **BASELINE(e34977ac)**
  > IDENTIFISERING: § 8-5-6 krever navn og fødselsnummer eller D-nummer for hver person. Numrene kan erstattes av unike koder, men bare dersom det utarbeides en oversikt over kodene med tilhørende fødselsnummer eller D-nummer. Okam samler verken inn eller lagrer fødselsnummer eller D-nummer, og fører ingen slik kodeoversikt. Kodene under kan derfor ikke slås opp i et fødselsnummer her. Listen dekker navn, tidspunkt og virksomhet, men ikke identifiseringskravet alene — virksomheten må selv føre kodeoversikten, eller listen må suppleres med fødselsnummer eller D-nummer.

### `translations/en.ts` (69)

#### `ev_deposit_heading`

- `lane/events-admin`
  > Deposit
- **BASELINE(e34977ac)**
  > Deposits

#### `ev_deposit_token`

- `lane/events-admin`
  > Deposit token
- **BASELINE(e34977ac)**
  > Deposit link

#### `ev_settlement_gate_note`

- `lane/events-admin`
  > Close, reconcile and close settlement sit behind Events.Settlement, which is hardcoded off on this branch. The buttons are here because only the server answer counts — they will answer EVENTS_DISABLED.
- **BASELINE(e34977ac)**
  > Close, the settlement lines, reconcile and close settlement sit behind Events.Settlement — a per-venue switch that is off until someone turns it on. The buttons are here because only the server answer counts: with the switch off they answer EVENTS_DISABLED.

#### `ev_settlement_gated`

- `lane/events-admin`
  > The settlement machine is not enabled for this venue. On this branch there is no switch that could enable it.
- **BASELINE(e34977ac)**
  > The settlement machine is not enabled for this venue. It is a per-venue switch (Events.Settlement) and it is off by default.

#### `ev_version_token`

- `lane/events-admin`
  > Proposal token
- **BASELINE(e34977ac)**
  > Proposal link

#### `ff_page_intro`

- **WORKING-TREE**, `lane/train-readonly-visible`, `lane/wf-pubhist`
  > The switches that decide what the six modules may write for this store. Everything is off to begin with. What "off" does to reading is not the same from one module to the next — some keep showing what is already recorded, others disappear entirely — so read the row before you switch it off.
- **BASELINE(e34977ac)**
  > The switches that decide what the six modules may write for this store. Everything is off to begin with: a switch that is not on refuses writes — reads and exports of what is already recorded keep working.

#### `ff_withheld_note`

- `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/meals-reachable-web`
  > The list is the catalogue the service reports. A module may have stages deliberately not offered here, for two different reasons. Some gate nothing at all, so a switch would have no effect whatever it was set to, and a switch that does nothing is worse than no switch. Others do gate real behaviour, but are not a per-store decision and are set in the server configuration instead. Not offered here does not mean inert.
- **BASELINE(e34977ac)**
  > The list is the catalogue the service reports. A module may have stages deliberately not offered here — they would have no effect whatever they were set to, and a switch that does nothing is worse than no switch.

#### `growth_gate_dispatched_note`

- `lane/growth-admin`
  > This version has already been sent. Sending again would not send a second time — there is one send per approved version.
- **BASELINE(e34977ac)**
  > This version has already been submitted. Sending again would not send a second time — there is one send per approved version.

#### `growth_gate_dispatched_toast`

- `lane/growth-admin`
  > The newsletter was sent.
- **BASELINE(e34977ac)**
  > The send ran. The provider accepted {accepted} of {eligible} recipients. Delivery is only confirmed once the provider reports back — see “What happened” below.

#### `growth_gate_state_dispatched`

- `lane/growth-admin`
  > Sent
- **BASELINE(e34977ac)**
  > Submitted

#### `growth_gate_state_ready`

- `lane/growth-admin`
  > Ready
- **BASELINE(e34977ac)**
  > Conditions met

#### `growth_test_intro`

- `lane/growth-admin`
  > Sends the current version to one address you name, through the provider's test route. It reaches no guest and touches no consent record.
- **BASELINE(e34977ac)**
  > Sends the current version to the email address on your own account, through the provider's test route. It reaches no guest and touches no consent record.

#### `meals_enrol_known_note`

- `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/fe-meals-journey-locator`, `lane/fe-meals-pretick-walked`, `lane/meals-enrol-pretick`
  > Enrolled right now: {count}. The boxes below are ticked from that reading — untick somebody to un-enrol them.
- `lane/meals-enrol-ui`
  > Enrolled now: {count}. This is the answer to the enrolment you just saved — it was not read back, and it goes when the page reloads.

#### `meals_rc_ack_still_blocks`

- `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/fe-meals-reconcile-ui`
  > Still blocks the month. Only a resolved exception clears it.
- `lane/fe-training-meals-surfaces`
  > Still blocks the statement.

#### `meals_rc_blocking_many`

- `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/fe-meals-reconcile-ui`
  > {count} exceptions have to be closed before the month can be.
- `lane/fe-training-meals-surfaces`
  > {count} exceptions block statements. Open and acknowledged both count.

#### `meals_rc_blocking_one`

- `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/fe-meals-reconcile-ui`
  > One exception has to be closed before the month can be.
- `lane/fe-training-meals-surfaces`
  > One exception blocks a statement. Open and acknowledged both count.

#### `meals_rc_blocking_title`

- `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/fe-meals-reconcile-ui`
  > The month close is blocked
- `lane/fe-training-meals-surfaces`
  > Periods are blocked

#### `meals_rc_blocking_unknown`

- `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/fe-meals-reconcile-ui`
  > We do not know how many exceptions are open.
- `lane/fe-training-meals-surfaces`
  > We do not know how many exceptions are blocking.

#### `meals_rc_clear_body`

- `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/fe-meals-reconcile-ui`
  > No exception is open at this venue.
- `lane/fe-training-meals-surfaces`
  > No exception in this queue stands between a period and a statement.

#### `meals_rc_col_kind`

- `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/fe-meals-reconcile-ui`
  > Exception
- `lane/fe-training-meals-surfaces`
  > Kind

#### `meals_rc_col_note`

- `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/fe-meals-reconcile-ui`
  > Reason
- `lane/fe-training-meals-surfaces`
  > Owner note

#### `meals_rc_drift_intro`

- `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/fe-meals-reconcile-ui`
  > Observations, not cases. They are derived afresh on every read, they cannot be resolved, and they block no month close.
- `lane/fe-training-meals-surfaces`
  > Recomputed on every read. They have no id, no state and no resolve route, and they block nothing.

#### `meals_rc_drift_no_repair`

- `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/fe-meals-reconcile-ui`
  > There is no repair for this in the product today. Tell Okam.
- `lane/fe-training-meals-surfaces`
  > There is no repair path for these anywhere in the product. "Guard row missing" is the worst of them: the ledger holds allocations for the period with no guard row behind them, so the next quote starts from zero and that period's spend stops counting against the allowance.

#### `meals_rc_drift_title`

- `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/fe-meals-reconcile-ui`
  > Budget guard drift
- `lane/fe-training-meals-surfaces`
  > Budget guard drift (observation only)

#### `meals_rc_empty`

- `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/fe-meals-reconcile-ui`
  > No exception has ever been filed here.
- `lane/fe-training-meals-surfaces`
  > No exceptions are filed at this store.

#### `meals_rc_err_note_required`

- `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/fe-meals-reconcile-ui`
  > Write a reason. It is the only record of why this exception was closed.
- `lane/fe-training-meals-surfaces`
  > Write an owner note. The server refuses a resolve without one.

#### `meals_rc_forward_only`

- `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/fe-meals-reconcile-ui`
  > This goes one way only. A resolved exception cannot be reopened.
- `lane/fe-training-meals-surfaces`
  > The states move forward only: open → acknowledged → resolved. There is no way back.

#### `meals_rc_guard_missing`

- `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/fe-meals-reconcile-ui`
  > Guard missing
- `lane/fe-training-meals-surfaces`
  > Guard row missing

#### `meals_rc_kind_apply_failed`

- `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/fe-meals-reconcile-ui`
  > Posting refused
- `lane/fe-training-meals-surfaces`
  > Write refused by the database

#### `meals_rc_kind_apply_failed_why`

- `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/fe-meals-reconcile-ui`
  > The database refused the posting and will refuse it identically every time. It is set aside rather than retried forever.
- `lane/fe-training-meals-surfaces`
  > Applying it to the ledger was refused in a way that will fail identically on every retry, so the receipt was set aside rather than blocking every later one.

#### `meals_rc_kind_expired`

- `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/fe-meals-reconcile-ui`
  > Expired reservation
- `lane/fe-training-meals-surfaces`
  > Expired binding

#### `meals_rc_kind_expired_why`

- `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/fe-meals-reconcile-ui`
  > A bound reservation reached expiry with no sale against it, so the amount was released defensively.
- `lane/fe-training-meals-surfaces`
  > A bound reservation reached expiry with no matching sale receipt, so its budget strand was released defensively.

#### `meals_rc_kind_unknown_why`

- `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/fe-meals-reconcile-ui`
  > This screen does not recognise this kind. It is shown as it arrived rather than interpreted.
- `lane/fe-training-meals-surfaces`
  > The server reported a kind this page does not recognise.

#### `meals_rc_kind_unmatched`

- `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/fe-meals-reconcile-ui`
  > Unattributed receipt
- `lane/fe-training-meals-surfaces`
  > Receipt with no attribution

#### `meals_rc_kind_unmatched_why`

- `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/fe-meals-reconcile-ui`
  > The journal holds a company-order receipt that could not be matched to any reservation, so nothing was captured or reversed for it.
- `lane/fe-training-meals-surfaces`
  > The journal showed a company order with no binding to attach it to, so the capture could not be applied.

#### `meals_rc_owner_note`

- `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/fe-meals-reconcile-ui`
  > Why is it being closed?
- `lane/fe-training-meals-surfaces`
  > Owner note

#### `meals_rc_queue_title`

- `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/fe-meals-reconcile-ui`
  > Reconciliation
- `lane/fe-training-meals-surfaces`
  > Exceptions

#### `meals_rc_resolve_action`

- `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/fe-meals-reconcile-ui`
  > Resolve the exception
- `lane/fe-training-meals-surfaces`
  > Resolve

#### `meals_rc_write_gate`

- `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/fe-meals-reconcile-ui`
  > These buttons are governed by a different switch from the list. The list being here does not mean you may resolve anything - the server would answer that the module does not exist.
- `lane/fe-training-meals-surfaces`
  > Note: this queue being on screen does not mean the buttons work. The read resolves the store's own "meals.module" switch, while resolving sits behind the module-wide configuration switch. The two can disagree, and then you can read the queue without being able to change a row of it.

#### `mrg_err_stale`

- `lane/margin-recipes`
  > Somebody else changed this while you were working. Reload the page and try again.
- **BASELINE(e34977ac)**
  > Somebody else saved a change here while you had it open, so yours was not applied. Reload to pick up their version, then make your change again.

#### `mrgs_err_projection_behind`

- `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/mrg-lag-visible`
  > The week was not frozen: the sales projection is {lag} entries behind the till, so the figures would have frozen as a floor. The statement is still open. The projection catches up on its own — recalculate and freeze in a couple of minutes.
- `lane/fe-events-margin-surfaces`
  > The sales projection is {lag} journal entries behind the till, so this week figures are a floor — real, and short by an unknown amount. Finalizing was refused rather than freezing that floor as the week record. The projector catches up on its own within a couple of minutes: recalculate and finalize then. The statement stays open and editable meanwhile.

#### `mrgs_err_projection_behind_unsized`

- `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/mrg-lag-visible`
  > The week was not frozen: the sales projection is behind the till, and the server did not say how far. The statement is still open. The projection catches up on its own — recalculate and freeze in a couple of minutes.
- `lane/fe-events-margin-surfaces`
  > The sales projection is behind the till, so this week figures are a floor — real, and short by an unknown amount. Finalizing was refused. The projector catches up on its own within a couple of minutes.

#### `mrgs_waste_err_quantity`

- `candidate/fe-compose-2026-08-05`, `lane/coercion-write-paths`, `lane/collect-review-conditions`
  > The quantity must be a number. Leave the field empty to state no quantity.
- `lane/mrg-waste-frontend`
  > A quantity must be a number greater than zero, with at most six decimals and no unit — for example 2.5. Nothing was sent.

#### `mrgs_waste_frozen`

- `lane/mrg-waste-frontend`
  > This week has a finalized statement, so its waste is frozen with the figures. That holds for the whole week, including while you are in an open correction of it: a new revision reopens the figures, not the waste.
- **BASELINE(e34977ac)**
  > This week's statement is finalized, so its waste is frozen with the figures. Correct it by opening the next revision of the week.

#### `nav_meals_statements`

- **WORKING-TREE**, `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/fe-meals-statement-surface`, `lane/wf-pubhist`
  > Company monthly statement
- `lane/fe-training-meals-surfaces`
  > Monthly statements

#### `nav_training_evidence`

- **WORKING-TREE**, `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/train-evidence-pack-ui`, `lane/wf-pubhist`
  > Training record
- `lane/fe-training-meals-surfaces`
  > Evidence of competence

#### `nav_workforce_roster`

- `lane/workforce-roster`
  > Staff
- **BASELINE(e34977ac)**
  > Roster

#### `pos_mode_clock`

- `lane/fe-pos-clock`, `lane/fe-wf-blind-bind-name`, `lane/fe-wf-link-deadend`, `lane/fe-wf-oplink`
  > Clock
- **WORKING-TREE**, `lane/wf-pubhist`
  > Time clock

#### `trn_completion_grading_note`

- `lane/training-admin`
  > Passed is stored exactly as ticked here. The server does not compare it against the version's pass threshold, and the record cannot be changed afterwards — so the tick is the manager's own assertion, not a calculation.
- **BASELINE(e34977ac)**
  > The server decides pass or fail. It compares the score entered here against the pass threshold of the version filed against — exactly at the threshold passes, and nothing is rounded first. There is no pass box because the record cannot be changed afterwards, and a pass the score does not support could never be corrected.

#### `trn_ev_asof`

- **WORKING-TREE**, `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/train-evidence-pack-ui`, `lane/wf-pubhist`
  > Read {when}.
- `lane/fe-training-meals-surfaces`
  > Times are shown in the store's timezone ({zone}). The document was assembled {asOf}.

#### `trn_ev_col_actor`

- **WORKING-TREE**, `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/train-evidence-pack-ui`, `lane/wf-pubhist`
  > Filed by
- `lane/fe-training-meals-surfaces`
  > Actor

#### `trn_ev_col_leg`

- **WORKING-TREE**, `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/train-evidence-pack-ui`, `lane/wf-pubhist`
  > Concerns
- `lane/fe-training-meals-surfaces`
  > Belongs to

#### `trn_ev_page_intro`

- **WORKING-TREE**, `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/train-evidence-pack-ui`, `lane/wf-pubhist`
  > One person's assembled training record, in the form it can be produced for an inspection: the completions with the frozen material they were taken against, the certificates, and the ledger rows naming who filed each one. Nothing is recomputed here — the document prints the server's figures beside the values they were computed from, so both can be re-checked.
- `lane/fe-training-meals-surfaces`
  > The document an inspection is handed: what one named person was trained on, with the figures each claim was derived from printed beside it.

#### `trn_ev_page_title`

- **WORKING-TREE**, `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/train-evidence-pack-ui`, `lane/wf-pubhist`
  > Training record
- `lane/fe-training-meals-surfaces`
  > Evidence of competence

#### `trn_ev_refused`

- **WORKING-TREE**, `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/train-evidence-pack-ui`, `lane/wf-pubhist`
  > The server refused the read. That does not mean there is no record — it means we were not shown it.
- `lane/fe-training-meals-surfaces`
  > The server refused the read and does not say why. It is the same answer for a person who is not there, one who belongs to another employer, and a module that was never switched on here — so we do not guess which.

#### `trn_ev_unknown`

- **WORKING-TREE**, `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/train-evidence-pack-ui`, `lane/wf-pubhist`
  > The server did not answer in a way this build understands. Nothing is claimed about what the store holds for this person.
- `lane/fe-training-meals-surfaces`
  > We got no answer. Nothing here is a claim about the person.

#### `trn_footnote_scope`

- **BASELINE(e34977ac)**, `lane/training-admin`
  > This page is the record of courses, assignments, completions and certificates. Editing drafts, retiring versions, correcting certificates and the expiry feed are not wired up here.
- `lane/fe-training-meals-surfaces`
  > This page is the record of courses, assignments, completions and certificates, with the expiry worklist. Editing drafts, retiring versions and correcting certificates are not wired up here. The evidence document itself — what an inspection is handed — has a page of its own.

#### `trn_page_title`

- `lane/training-admin`
  > Training and internal control
- **BASELINE(e34977ac)**
  > Training

#### `trn_reference_by_value`

- `lane/training-admin`
  > The reference is a Workforce person or role id, carried as a value. Training holds no directory of people and does not check that the id belongs to anyone who works here.
- **BASELINE(e34977ac)**
  > The reference is a Workforce person or role id, carried as a value. Nothing checks it on an assignment: an id naming nobody is accepted exactly as one that names somebody.

#### `trn_source_quiz`

- `lane/training-admin`
  > Quiz in the app
- **BASELINE(e34977ac)**
  > Quiz

#### `wfme_page_intro`

- `lane/fe-wf-self`
  > The shifts you are on, the shifts you can ask for, what you have asked for, and the time you actually clocked.
- **BASELINE(e34977ac)**
  > The shifts you are on, the shifts you can ask for, and what you have asked for.

#### `wfme_pub_lede`

- `lane/fe-wf-self`
  > Your manager can see who has read the schedule.
- **BASELINE(e34977ac)**
  > You have not opened this yet. Your manager can see who has read it.

#### `wfme_pub_title_many`

- `lane/fe-wf-self`
  > {count} schedules were published to you
- **BASELINE(e34977ac)**
  > {count} new schedules published

#### `wfme_pub_title_one`

- `lane/fe-wf-self`
  > A schedule was published to you
- **BASELINE(e34977ac)**
  > New schedule published

#### `wfoi_linked_to_ended`

- `lane/fe-wf-blind-bind-name`, `lane/fe-wf-oplink`
  > Linked to {name}, but that engagement has ended. The register refuses the punch, and a new link is not possible.
- `lane/fe-wf-link-deadend`
  > Linked to {name}, but that engagement has ended. The register refuses the punch. Withdraw the link to free the operator.

#### `wfoi_person_unknown`

- `lane/fe-wf-blind-bind-name`, `lane/fe-wf-link-deadend`
  > Unknown – we got no answer about who
- `lane/fe-wf-oplink`
  > May belong to a person who already exists

#### `wfoi_review_permanence`

- `lane/fe-wf-blind-bind-name`, `lane/fe-wf-link-deadend`
  > The link decides whose pay every punch becomes. It can be withdrawn afterwards, and who withdrew it is recorded, but it cannot be moved to another person in one step. Read the name on both sides before you confirm.
- `lane/fe-wf-oplink`
  > The link cannot be removed or moved afterwards. Read the name on both sides before you confirm.

#### `wfoi_side_existing_login`

- `lane/fe-wf-blind-bind-name`, `lane/fe-wf-link-deadend`
  > This operator carries a login, but the screen got no answer about who it belongs to. If that login already belongs to a person in Okam, the engagement attaches to THAT person rather than to a new one. Try reopening the panel before you confirm.
- `lane/fe-wf-oplink`
  > This operator carries a login. If that login already belongs to a person in Okam, the engagement attaches to THAT person rather than to a new one. Who it is cannot be shown here, and if the person already holds an active engagement under this employer the line is refused.

#### `wfpl_identity_gap`

- `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/wf-idreg`, `lane/wf-kodeoversikt-ui`
  > IDENTIFICATION: § 8-5-6 requires each person's name and fødselsnummer (Norwegian national identity number) or D-number. Those numbers may be replaced by unique codes, but only where an overview of the codes with the corresponding national identity number or D-number is kept. Okam neither collects nor stores national identity numbers, so the codes below cannot be resolved to one inside the system. The code overview for this day is downloaded from the personnel-list page — pre-filled with the codes, the names and the retention deadline, with the national-id field left open. The business fills it in and keeps the overview with the personnel list for three years and six months after the end of the accounting year. Without that completed overview this list is not full identification.
- **BASELINE(e34977ac)**
  > IDENTIFICATION: § 8-5-6 requires each person's name and fødselsnummer (Norwegian national identity number) or D-number. Those numbers may be replaced by unique codes, but only if an overview of the codes used, with the corresponding national identity number or D-number, is kept. Okam neither collects nor stores national identity numbers, and keeps no such code overview. The codes below therefore cannot be resolved to a national identity number here. The list covers names, times and business identity, but not the identification requirement on its own — the business must keep the code overview itself, or the list must be supplemented with the national identity numbers.

### `translations/de.ts` (98)

#### `aIQueryBox_example3`

- `feature/swiss`
  > Wie hoch ist die durchschnittliche Bestellgrösse pro Liefertyp?
- **BASELINE(e34977ac)**
  > Wie hoch ist die durchschnittliche Bestellgröße pro Liefertyp?

#### `categoryEditor_toastFileTooLarge`

- `feature/swiss`
  > Die Dateigrösse muss kleiner als 5MB sein
- **BASELINE(e34977ac)**
  > Die Dateigröße muss kleiner als 5MB sein

#### `delivery_kmMustBeGreaterThan`

- `feature/swiss`
  > Anzahl der km muss grösser als {minimumKm} sein
- **BASELINE(e34977ac)**
  > Anzahl der km muss größer als {minimumKm} sein

#### `discount_errorAmountPositive`

- `feature/swiss`
  > Der Rabattbetrag muss grösser als 0 sein
- **BASELINE(e34977ac)**
  > Der Rabattbetrag muss größer als 0 sein

#### `ev_deposit_heading`

- `lane/events-admin`
  > Anzahlung
- **BASELINE(e34977ac)**
  > Anzahlungen

#### `ev_deposit_token`

- `lane/events-admin`
  > Anzahlungs-Token
- **BASELINE(e34977ac)**
  > Anzahlungs-Link

#### `ev_settlement_gate_note`

- `lane/events-admin`
  > Schliessen, Abstimmen und Abrechnung schliessen liegen hinter Events.Settlement, das auf diesem Branch fest deaktiviert ist. Die Schaltflächen stehen hier, weil nur die Antwort des Servers zählt — sie werden EVENTS_DISABLED antworten.
- **BASELINE(e34977ac)**
  > Schliessen, die Abrechnungspositionen, Abstimmen und Abrechnung schliessen liegen hinter Events.Settlement — einem Schalter pro Standort, der aus ist, bis ihn jemand einschaltet. Die Schaltflächen stehen hier, weil nur die Antwort des Servers zählt: mit ausgeschaltetem Schalter antworten sie EVENTS_DISABLED.

#### `ev_settlement_gated`

- `lane/events-admin`
  > Die Abrechnungsmaschine ist für diesen Standort nicht aktiviert. Auf diesem Branch gibt es keinen Schalter, der sie aktivieren könnte.
- **BASELINE(e34977ac)**
  > Die Abrechnungsmaschine ist für diesen Standort nicht aktiviert. Es ist ein Schalter pro Standort (Events.Settlement), und er ist standardmässig aus.

#### `ev_version_token`

- `lane/events-admin`
  > Angebots-Token
- **BASELINE(e34977ac)**
  > Angebots-Link

#### `ff_page_intro`

- **WORKING-TREE**, `lane/train-readonly-visible`, `lane/wf-pubhist`
  > Die Schalter, die bestimmen, was die sechs Module für dieses Lokal schreiben dürfen. Alles ist zunächst aus. Was «aus» für das Lesen bedeutet, ist von Modul zu Modul verschieden — manche zeigen bereits Erfasstes weiter an, andere verschwinden ganz — lesen Sie deshalb die Zeile, bevor Sie abschalten.
- **BASELINE(e34977ac)**
  > Die Schalter, die bestimmen, was die sechs Module für dieses Lokal schreiben dürfen. Alles ist zunächst aus: ein Schalter, der nicht an ist, lehnt Schreibvorgänge ab — Lesen und Exportieren von bereits Erfasstem läuft weiter.

#### `ff_withheld_note`

- `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/meals-reachable-web`
  > Die Liste ist der Katalog, den der Dienst meldet. Ein Modul kann Stufen haben, die hier bewusst nicht angeboten werden, aus zwei verschiedenen Gründen. Manche steuern gar nichts und hätten keinerlei Wirkung — ein Schalter ohne Wirkung ist schlimmer als kein Schalter. Andere steuern echtes Verhalten, sind aber keine Entscheidung pro Standort und werden stattdessen in der Serverkonfiguration gesetzt. Hier nicht angeboten heisst nicht wirkungslos.
- **BASELINE(e34977ac)**
  > Die Liste ist der Katalog, den der Dienst meldet. Ein Modul kann Stufen haben, die hier bewusst nicht angeboten werden — sie hätten keinerlei Wirkung, und ein Schalter ohne Wirkung ist schlimmer als kein Schalter.

#### `growth_gate_dispatched_note`

- `lane/growth-admin`
  > Diese Version wurde bereits versendet. Ein erneuter Versand würde nicht doppelt senden — es gibt einen Versand pro freigegebener Version.
- **BASELINE(e34977ac)**
  > Diese Version wurde bereits übermittelt. Ein erneuter Versand würde nicht doppelt senden — es gibt einen Versand pro freigegebener Version.

#### `growth_gate_dispatched_toast`

- `lane/growth-admin`
  > Der Newsletter wurde versendet.
- **BASELINE(e34977ac)**
  > Der Versand wurde ausgeführt. Der Anbieter hat {accepted} von {eligible} Empfängern angenommen. Die Zustellung ist erst bestätigt, wenn der Anbieter zurückmeldet — siehe „Was geschehen ist“ unten.

#### `growth_gate_state_dispatched`

- `lane/growth-admin`
  > Versendet
- **BASELINE(e34977ac)**
  > Übermittelt

#### `growth_gate_state_ready`

- `lane/growth-admin`
  > Bereit
- **BASELINE(e34977ac)**
  > Bedingungen erfüllt

#### `growth_test_intro`

- `lane/growth-admin`
  > Sendet die aktuelle Version an eine von dir genannte Adresse über die Testroute des Anbieters. Sie erreicht keinen Gast und berührt kein Einwilligungsprotokoll.
- **BASELINE(e34977ac)**
  > Sendet die aktuelle Version an die E-Mail-Adresse deines eigenen Kontos über die Testroute des Anbieters. Sie erreicht keinen Gast und berührt kein Einwilligungsprotokoll.

#### `import_fieldsError`

- `feature/swiss`
  > Es scheint, dass einige Felder fehlerhaft sind. Schliessen Sie dieses Fenster, um die rot markierten Felder zu überprüfen
- **BASELINE(e34977ac)**
  > Es scheint, dass einige Felder fehlerhaft sind. Schließen Sie dieses Fenster, um die rot markierten Felder zu überprüfen

#### `kraviaInvoice_confirmManual`

- `feature/swiss`
  > Eine Bestellung über <strong>{amount}</strong> wird für <strong>{company}</strong> als manuelle Bestellung erstellt. Die Zahlung wird ausserhalb des Okam-Systems abgewickelt.
- **BASELINE(e34977ac)**
  > Eine Bestellung über <strong>{amount}</strong> wird für <strong>{company}</strong> als manuelle Bestellung erstellt. Die Zahlung wird außerhalb des Okam-Systems abgewickelt.

#### `kraviaInvoice_manualInvoiceDescription`

- `feature/swiss`
  > Die Bestellung wird als 'An der Kasse bezahlen' aufgegeben und die Zahlung wird ausserhalb des Okam-Systems abgewickelt
- **BASELINE(e34977ac)**
  > Die Bestellung wird als 'An der Kasse bezahlen' aufgegeben und die Zahlung wird außerhalb des Okam-Systems abgewickelt

#### `kraviaInvoice_validationLineAmount`

- `feature/swiss`
  > Position {line} muss einen Betrag grösser als 0 haben
- **BASELINE(e34977ac)**
  > Position {line} muss einen Betrag größer als 0 haben

#### `kraviaInvoice_validationLineQuantity`

- `feature/swiss`
  > Position {line} muss eine Anzahl grösser als 0 haben
- **BASELINE(e34977ac)**
  > Position {line} muss eine Anzahl größer als 0 haben

#### `meals_enrol_known_note`

- `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/fe-meals-journey-locator`, `lane/fe-meals-pretick-walked`, `lane/meals-enrol-pretick`
  > Jetzt angemeldet: {count}. Die Kästchen unten sind aus dieser Lesung angehakt — Haken entfernen meldet die Person ab.
- `lane/meals-enrol-ui`
  > Jetzt angemeldet: {count}. Das ist die Antwort auf die Anmeldung, die Sie gerade gespeichert haben — sie wurde nicht zurückgelesen und verschwindet beim Neuladen.

#### `meals_rc_ack_still_blocks`

- `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/fe-meals-reconcile-ui`
  > Blockiert den Monat weiterhin. Nur eine geschlossene Abweichung gibt ihn frei.
- `lane/fe-training-meals-surfaces`
  > Blockiert die Abrechnung weiterhin.

#### `meals_rc_acknowledge`

- `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/fe-meals-reconcile-ui`
  > Übernehmen
- `lane/fe-training-meals-surfaces`
  > Quittieren

#### `meals_rc_blocking_many`

- `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/fe-meals-reconcile-ui`
  > {count} Abweichungen müssen geschlossen werden, bevor der Monat abgeschlossen werden kann.
- `lane/fe-training-meals-surfaces`
  > {count} Abweichungen blockieren Abrechnungen. Offen und quittiert zählen beide.

#### `meals_rc_blocking_one`

- `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/fe-meals-reconcile-ui`
  > Eine Abweichung muss geschlossen werden, bevor der Monat abgeschlossen werden kann.
- `lane/fe-training-meals-surfaces`
  > Eine Abweichung blockiert eine Abrechnung. Offen und quittiert zählen beide.

#### `meals_rc_blocking_title`

- `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/fe-meals-reconcile-ui`
  > Der Monatsabschluss ist blockiert
- `lane/fe-training-meals-surfaces`
  > Zeiträume sind blockiert

#### `meals_rc_blocking_unknown`

- `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/fe-meals-reconcile-ui`
  > Wir wissen nicht, wie viele Abweichungen offen sind.
- `lane/fe-training-meals-surfaces`
  > Wir wissen nicht, wie viele Abweichungen blockieren.

#### `meals_rc_clear_body`

- `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/fe-meals-reconcile-ui`
  > An diesem Standort ist keine Abweichung offen.
- `lane/fe-training-meals-surfaces`
  > Keine Abweichung in dieser Warteschlange steht zwischen einem Zeitraum und einer Abrechnung.

#### `meals_rc_col_kind`

- `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/fe-meals-reconcile-ui`
  > Abweichung
- `lane/fe-training-meals-surfaces`
  > Art

#### `meals_rc_col_period`

- `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/fe-meals-reconcile-ui`
  > Periode
- `lane/fe-training-meals-surfaces`
  > Zeitraum

#### `meals_rc_drift_intro`

- `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/fe-meals-reconcile-ui`
  > Beobachtungen, keine Fälle. Sie werden bei jedem Abruf neu berechnet, sie lassen sich nicht schliessen, und sie blockieren keinen Monatsabschluss.
- `lane/fe-training-meals-surfaces`
  > Wird bei jeder Abfrage neu berechnet. Sie haben keine ID, keinen Zustand und keine Klärungsroute, und sie blockieren nichts.

#### `meals_rc_drift_no_repair`

- `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/fe-meals-reconcile-ui`
  > Im Produkt gibt es dafür heute keine Reparatur. Melden Sie es Okam.
- `lane/fe-training-meals-surfaces`
  > Für diese gibt es im Produkt nirgends einen Reparaturweg. «Budgetzeile fehlt» ist der schlimmste Fall: das Hauptbuch führt Buchungen für den Zeitraum ohne Budgetzeile dahinter, das nächste Angebot startet also bei null und der Verbrauch dieses Zeitraums zählt nicht mehr gegen den Höchstbetrag.

#### `meals_rc_drift_title`

- `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/fe-meals-reconcile-ui`
  > Abweichung der Budgetwächter
- `lane/fe-training-meals-surfaces`
  > Budgetabweichung (nur Beobachtung)

#### `meals_rc_empty`

- `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/fe-meals-reconcile-ui`
  > Hier wurde noch nie eine Abweichung gemeldet.
- `lane/fe-training-meals-surfaces`
  > Für diesen Betrieb sind keine Abweichungen erfasst.

#### `meals_rc_err_note_required`

- `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/fe-meals-reconcile-ui`
  > Schreiben Sie eine Begründung. Sie ist der einzige Nachweis dafür, warum diese Abweichung geschlossen wurde.
- `lane/fe-training-meals-surfaces`
  > Schreiben Sie eine Begründung. Der Server lehnt eine Klärung ohne sie ab.

#### `meals_rc_forward_only`

- `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/fe-meals-reconcile-ui`
  > Das geht nur in eine Richtung. Eine geschlossene Abweichung kann nicht wieder geöffnet werden.
- `lane/fe-training-meals-surfaces`
  > Die Zustände laufen nur vorwärts: offen → quittiert → geklärt. Es gibt keinen Weg zurück.

#### `meals_rc_guard_missing`

- `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/fe-meals-reconcile-ui`
  > Wächter fehlt
- `lane/fe-training-meals-surfaces`
  > Budgetzeile fehlt

#### `meals_rc_kind_apply_failed`

- `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/fe-meals-reconcile-ui`
  > Buchung abgelehnt
- `lane/fe-training-meals-surfaces`
  > Buchung von der Datenbank abgelehnt

#### `meals_rc_kind_apply_failed_why`

- `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/fe-meals-reconcile-ui`
  > Die Datenbank hat die Buchung abgelehnt und wird sie jedes Mal gleich ablehnen. Sie wurde beiseitegelegt, statt endlos wiederholt zu werden.
- `lane/fe-training-meals-surfaces`
  > Die Buchung ins Hauptbuch wurde so abgelehnt, dass sie bei jedem Versuch gleich scheitert; der Beleg wurde deshalb zurückgestellt, statt alle folgenden zu blockieren.

#### `meals_rc_kind_expired`

- `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/fe-meals-reconcile-ui`
  > Abgelaufene Reservierung
- `lane/fe-training-meals-surfaces`
  > Abgelaufene Bindung

#### `meals_rc_kind_expired_why`

- `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/fe-meals-reconcile-ui`
  > Eine gebundene Reservierung lief ab, ohne dass ein Verkauf dazu kam, deshalb wurde der Betrag vorsorglich freigegeben.
- `lane/fe-training-meals-surfaces`
  > Eine gebundene Reservation lief ab, ohne dass ein Verkaufsbeleg kam, ihr Budgetanteil wurde daher vorsorglich freigegeben.

#### `meals_rc_kind_unknown_why`

- `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/fe-meals-reconcile-ui`
  > Diese Ansicht kennt diese Art nicht. Sie wird unverändert angezeigt und nicht gedeutet.
- `lane/fe-training-meals-surfaces`
  > Der Server meldete eine Art, die diese Seite nicht kennt.

#### `meals_rc_kind_unmatched_why`

- `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/fe-meals-reconcile-ui`
  > Das Journal enthält einen Beleg zu einer Firmenbestellung, der keiner Reservierung zugeordnet werden konnte; es wurde weder belastet noch storniert.
- `lane/fe-training-meals-surfaces`
  > Das Journal zeigte eine Firmenbestellung ohne Bindung, an die sie anzuhängen wäre, die Belastung konnte also nicht gebucht werden.

#### `meals_rc_owner_note`

- `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/fe-meals-reconcile-ui`
  > Warum wird sie geschlossen?
- `lane/fe-training-meals-surfaces`
  > Begründung

#### `meals_rc_queue_title`

- `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/fe-meals-reconcile-ui`
  > Abstimmung
- `lane/fe-training-meals-surfaces`
  > Abweichungen

#### `meals_rc_resolve`

- `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/fe-meals-reconcile-ui`
  > Schliessen
- `lane/fe-training-meals-surfaces`
  > Klären

#### `meals_rc_resolve_action`

- `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/fe-meals-reconcile-ui`
  > Abweichung schliessen
- `lane/fe-training-meals-surfaces`
  > Klären

#### `meals_rc_resolve_title`

- `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/fe-meals-reconcile-ui`
  > Abweichung schliessen
- `lane/fe-training-meals-surfaces`
  > Abweichung klären

#### `meals_rc_state_acknowledged`

- `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/fe-meals-reconcile-ui`
  > Übernommen
- `lane/fe-training-meals-surfaces`
  > Quittiert

#### `meals_rc_state_resolved`

- `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/fe-meals-reconcile-ui`
  > Geschlossen
- `lane/fe-training-meals-surfaces`
  > Geklärt

#### `meals_rc_write_gate`

- `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/fe-meals-reconcile-ui`
  > Diese Schaltflächen hängen an einem anderen Schalter als die Liste. Dass die Liste hier steht, heisst nicht, dass Sie etwas schliessen dürfen - der Server würde antworten, dass es das Modul nicht gibt.
- `lane/fe-training-meals-surfaces`
  > Hinweis: dass die Warteschlange angezeigt wird, heisst nicht, dass die Schaltflächen wirken. Das Lesen nutzt den betriebseigenen Schalter «meals.module», das Klären liegt hinter dem modulweiten Konfigurationsschalter. Beide können auseinanderlaufen, und dann lesen Sie die Warteschlange, ohne eine Zeile darin ändern zu können.

#### `mrg_err_stale`

- `lane/margin-recipes`
  > Jemand anderes hat das geändert, während du gearbeitet hast. Lade die Seite neu und versuche es erneut.
- **BASELINE(e34977ac)**
  > Jemand anderes hat hier gespeichert, während du es offen hattest, deshalb wurde deine Änderung nicht übernommen. Lade die Seite neu, um die neuere Fassung zu holen, und nimm deine Änderung erneut vor.

#### `mrgs_err_projection_behind`

- `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/mrg-lag-visible`
  > Die Woche wurde nicht eingefroren: Die Verkaufsprojektion liegt {lag} Einträge hinter der Kasse, die Zahlen wären also als Untergrenze eingefroren. Der Abschluss bleibt offen. Die Projektion holt von selbst auf — in ein paar Minuten neu berechnen und einfrieren.
- `lane/fe-events-margin-surfaces`
  > Die Umsatzprojektion liegt {lag} Journaleinträge hinter der Kasse, die Zahlen dieser Woche sind also eine Untergrenze — echt, aber um einen unbekannten Betrag zu niedrig. Die Finalisierung wurde abgelehnt, statt diese Untergrenze als Wochenergebnis einzufrieren. Die Projektion holt innerhalb weniger Minuten von selbst auf: dann neu berechnen und finalisieren. Der Abschluss bleibt derweil offen und bearbeitbar.

#### `mrgs_err_projection_behind_unsized`

- `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/mrg-lag-visible`
  > Die Woche wurde nicht eingefroren: Die Verkaufsprojektion liegt hinter der Kasse, und der Server hat nicht gesagt, wie weit. Der Abschluss bleibt offen. Die Projektion holt von selbst auf — in ein paar Minuten neu berechnen und einfrieren.
- `lane/fe-events-margin-surfaces`
  > Die Umsatzprojektion liegt hinter der Kasse, die Zahlen dieser Woche sind also eine Untergrenze — echt, aber um einen unbekannten Betrag zu niedrig. Die Finalisierung wurde abgelehnt. Die Projektion holt innerhalb weniger Minuten von selbst auf.

#### `mrgs_waste_err_quantity`

- `candidate/fe-compose-2026-08-05`, `lane/coercion-write-paths`, `lane/collect-review-conditions`
  > Die Menge muss eine Zahl sein. Feld leer lassen, wenn keine Menge angegeben wird.
- `lane/mrg-waste-frontend`
  > Eine Menge muss eine Zahl grösser als null sein, mit höchstens sechs Dezimalstellen und ohne Einheit — zum Beispiel 2,5. Es wurde nichts gesendet.

#### `mrgs_waste_frozen`

- `lane/mrg-waste-frontend`
  > Diese Woche hat eine abgeschlossene Abrechnung, der Schwund ist mit den Zahlen eingefroren. Das gilt für die ganze Woche, auch wenn Sie in einer offenen Korrektur davon stehen: eine neue Revision öffnet die Zahlen, nicht den Schwund.
- **BASELINE(e34977ac)**
  > Die Abrechnung dieser Woche ist abgeschlossen, der Schwund ist mit den Zahlen eingefroren. Korrigieren Sie ihn mit der nächsten Revision der Woche.

#### `nav_meals_statements`

- **WORKING-TREE**, `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/fe-meals-statement-surface`, `lane/wf-pubhist`
  > Monatsabrechnung Firma
- `lane/fe-training-meals-surfaces`
  > Monatsabrechnungen

#### `nav_training_evidence`

- **WORKING-TREE**, `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/train-evidence-pack-ui`, `lane/wf-pubhist`
  > Schulungsnachweis
- `lane/fe-training-meals-surfaces`
  > Kompetenznachweis

#### `nav_workforce_roster`

- `lane/workforce-roster`
  > Mitarbeitende
- **BASELINE(e34977ac)**
  > Personaleinsatz

#### `ongoing_actionComplete`

- `feature/swiss`
  > Abschliessen
- **BASELINE(e34977ac)**
  > Abschließen

#### `ongoing_confirmComplete`

- `feature/swiss`
  > Bestellung #{orderId} abschliessen?
- **BASELINE(e34977ac)**
  > Bestellung #{orderId} abschließen?

#### `ongoing_errorComplete`

- `feature/swiss`
  > Fehler beim Abschliessen: {error}
- **BASELINE(e34977ac)**
  > Fehler beim Abschließen: {error}

#### `orders_tooManyResultsHint`

- `feature/swiss`
  > Die Datei wird zu gross. Bitte grenzen Sie die Ergebnisse für den Export ein (max. 20 Seiten).
- **BASELINE(e34977ac)**
  > Die Datei wird zu groß. Bitte grenzen Sie die Ergebnisse für den Export ein (max. 20 Seiten).

#### `payouts_completePayout`

- `feature/swiss`
  > Auszahlung abschliessen
- **BASELINE(e34977ac)**
  > Auszahlung abschließen

#### `pos_mode_clock`

- `lane/fe-pos-clock`, `lane/fe-wf-blind-bind-name`, `lane/fe-wf-link-deadend`, `lane/fe-wf-oplink`
  > Stempeln
- **WORKING-TREE**, `lane/wf-pubhist`
  > Zeiterfassung

#### `productSelectorModal_unsavedChangesConfirm`

- `feature/swiss`
  > Sie haben ungespeicherte Änderungen. Möchten Sie wirklich schliessen?
- **BASELINE(e34977ac)**
  > Sie haben ungespeicherte Änderungen. Möchten Sie wirklich schließen?

#### `products_alertFileTooLarge`

- `feature/swiss`
  > Die Dateigrösse muss kleiner als 5 MB sein
- **BASELINE(e34977ac)**
  > Die Dateigröße muss kleiner als 5 MB sein

#### `products_alertResizeUploadFailed`

- `feature/swiss`
  > Grösse konnte nicht geändert und Bild nicht hochgeladen werden
- **BASELINE(e34977ac)**
  > Größe konnte nicht geändert und Bild nicht hochgeladen werden

#### `rewards_fromAmountValidation`

- `feature/swiss`
  > Der Ab-Betrag muss grösser als 0 sein
- **BASELINE(e34977ac)**
  > Der Ab-Betrag muss größer als 0 sein

#### `trn_completion_grading_note`

- `lane/training-admin`
  > Bestanden wird genau so gespeichert, wie es hier angekreuzt wird. Der Server vergleicht es nicht mit der Bestehensgrenze der Version, und der Eintrag lässt sich danach nicht mehr ändern — das Kreuz ist also die eigene Aussage der Führungskraft, keine Berechnung.
- **BASELINE(e34977ac)**
  > Über bestanden oder nicht entscheidet der Server. Er vergleicht die hier erfassten Punkte mit der Bestehensgrenze der Version, gegen die erfasst wird — genau auf der Grenze ist bestanden, und es wird vorher nichts gerundet. Es gibt kein Bestanden-Kreuz, weil der Eintrag danach nicht mehr änderbar ist und ein Bestanden, das die Punkte nicht decken, nie korrigiert werden könnte.

#### `trn_ev_asof`

- **WORKING-TREE**, `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/train-evidence-pack-ui`, `lane/wf-pubhist`
  > Abgerufen {when}.
- `lane/fe-training-meals-surfaces`
  > Zeiten werden in der Zeitzone des Betriebs ({zone}) angezeigt. Das Dokument wurde {asOf} zusammengestellt.

#### `trn_ev_col_actor`

- **WORKING-TREE**, `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/train-evidence-pack-ui`, `lane/wf-pubhist`
  > Erfasst von
- `lane/fe-training-meals-surfaces`
  > Ausgeführt von

#### `trn_ev_col_leg`

- **WORKING-TREE**, `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/train-evidence-pack-ui`, `lane/wf-pubhist`
  > Betrifft
- `lane/fe-training-meals-surfaces`
  > Gehört zu

#### `trn_ev_page_intro`

- **WORKING-TREE**, `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/train-evidence-pack-ui`, `lane/wf-pubhist`
  > Der gesammelte Schulungsnachweis einer Person, so wie er bei einer Prüfung vorgelegt werden kann: die Abschlüsse mit dem eingefrorenen Inhalt, gegen den sie abgelegt wurden, die Zertifikate und die Journalzeilen, die sagen, wer sie jeweils erfasst hat. Hier wird nichts neu berechnet — das Dokument druckt die Werte des Servers neben den Angaben, aus denen sie berechnet wurden, damit beides nachgeprüft werden kann.
- `lane/fe-training-meals-surfaces`
  > Das Dokument, das eine Kontrolle erhält: worin eine namentlich genannte Person geschult wurde, mit den Zahlen daneben, aus denen jede Aussage abgeleitet ist.

#### `trn_ev_page_title`

- **WORKING-TREE**, `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/train-evidence-pack-ui`, `lane/wf-pubhist`
  > Schulungsnachweis
- `lane/fe-training-meals-surfaces`
  > Kompetenznachweis

#### `trn_ev_refused`

- **WORKING-TREE**, `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/train-evidence-pack-ui`, `lane/wf-pubhist`
  > Der Server hat den Abruf abgelehnt. Das heißt nicht, dass es keinen Nachweis gibt — es heißt, dass er uns nicht gezeigt wurde.
- `lane/fe-training-meals-surfaces`
  > Der Server hat die Abfrage abgelehnt und sagt nicht warum. Es ist dieselbe Antwort für eine Person, die es nicht gibt, eine bei einem anderen Arbeitgeber, und ein Modul, das hier nie eingeschaltet wurde — wir raten nicht, welche davon zutrifft.

#### `trn_ev_unknown`

- **WORKING-TREE**, `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/train-evidence-pack-ui`, `lane/wf-pubhist`
  > Der Server hat nicht so geantwortet, wie dieser Stand es versteht. Damit wird nichts darüber gesagt, was das Geschäft für diese Person erfasst hat.
- `lane/fe-training-meals-surfaces`
  > Wir haben keine Antwort erhalten. Nichts hier ist eine Aussage über die Person.

#### `trn_footnote_scope`

- **BASELINE(e34977ac)**, `lane/training-admin`
  > Diese Seite ist der Nachweis über Kurse, Zuweisungen, Abschlüsse und Zertifikate. Entwürfe bearbeiten, Versionen stilllegen, Zertifikate korrigieren und die Ablaufliste sind hier nicht angebunden.
- `lane/fe-training-meals-surfaces`
  > Diese Seite ist der Nachweis über Kurse, Zuweisungen, Abschlüsse und Zertifikate, samt Ablaufliste. Entwürfe bearbeiten, Versionen stilllegen und Zertifikate korrigieren sind hier nicht angebunden. Der Kompetenznachweis selbst — was eine Kontrolle erhält — hat eine eigene Seite.

#### `trn_page_title`

- `lane/training-admin`
  > Schulung und Eigenkontrolle
- **BASELINE(e34977ac)**
  > Schulung

#### `trn_reference_by_value`

- `lane/training-admin`
  > Die Referenz ist eine Personen- oder Rollen-ID aus der Personalplanung, als Wert geführt. Das Schulungsmodul führt kein Personenverzeichnis und prüft nicht, ob die ID zu jemandem gehört, der hier arbeitet.
- **BASELINE(e34977ac)**
  > Die Referenz ist eine Personen- oder Rollen-ID aus der Personalplanung, als Wert geführt. Bei einer Zuweisung prüft sie nichts: eine ID, die niemanden bezeichnet, wird genauso angenommen wie eine, die jemanden bezeichnet.

#### `trn_source_quiz`

- `lane/training-admin`
  > Quiz in der App
- **BASELINE(e34977ac)**
  > Quiz

#### `variantEditorModal_suggestionSauce`

- `feature/swiss`
  > Sosse
- **BASELINE(e34977ac)**
  > Soße

#### `variantEditorModal_suggestionSize`

- `feature/swiss`
  > Grösse
- **BASELINE(e34977ac)**
  > Größe

#### `variantEditorModal_unsavedChangesConfirm`

- `feature/swiss`
  > Sie haben ungespeicherte Änderungen. Möchten Sie wirklich schliessen?
- **BASELINE(e34977ac)**
  > Sie haben ungespeicherte Änderungen. Möchten Sie wirklich schließen?

#### `wfme_page_intro`

- `lane/fe-wf-self`
  > Die Schichten, auf denen du stehst, die du anfragen kannst, das, was du angefragt hast, und die Zeit, die du tatsächlich gestempelt hast.
- **BASELINE(e34977ac)**
  > Die Schichten, auf denen du stehst, die du anfragen kannst, und das, was du angefragt hast.

#### `wfme_pub_lede`

- `lane/fe-wf-self`
  > Die Leitung sieht, wer den Plan gelesen hat.
- **BASELINE(e34977ac)**
  > Du hast ihn noch nicht geöffnet. Die Leitung sieht, wer gelesen hat.

#### `wfme_pub_title_many`

- `lane/fe-wf-self`
  > {count} Dienstpläne wurden für dich veröffentlicht
- **BASELINE(e34977ac)**
  > {count} neue Dienstpläne veröffentlicht

#### `wfme_pub_title_one`

- `lane/fe-wf-self`
  > Ein Dienstplan wurde für dich veröffentlicht
- **BASELINE(e34977ac)**
  > Neuer Dienstplan veröffentlicht

#### `wfoi_linked_to_ended`

- `lane/fe-wf-blind-bind-name`, `lane/fe-wf-oplink`
  > Verknüpft mit {name}, doch diese Anstellung ist beendet. Die Kasse weist die Stempelung ab, und eine neue Verknüpfung ist nicht möglich.
- `lane/fe-wf-link-deadend`
  > Verknüpft mit {name}, doch diese Anstellung ist beendet. Die Kasse weist die Stempelung ab. Entfernen Sie die Verknüpfung, um den Bediener freizugeben.

#### `wfoi_person_unknown`

- `lane/fe-wf-blind-bind-name`, `lane/fe-wf-link-deadend`
  > Unbekannt – keine Antwort erhalten, zu wem
- `lane/fe-wf-oplink`
  > Kann zu einer bereits vorhandenen Person gehören

#### `wfoi_review_permanence`

- `lane/fe-wf-blind-bind-name`, `lane/fe-wf-link-deadend`
  > Die Verknüpfung entscheidet, auf wessen Lohn jede Stempelung läuft. Sie lässt sich nachträglich entfernen – wer das getan hat, wird protokolliert –, aber nicht in einem Schritt auf eine andere Person verschieben. Lesen Sie beide Seiten, bevor Sie bestätigen.
- `lane/fe-wf-oplink`
  > Die Verknüpfung lässt sich nachträglich weder entfernen noch verschieben. Lesen Sie beide Seiten, bevor Sie bestätigen.

#### `wfoi_side_existing_login`

- `lane/fe-wf-blind-bind-name`, `lane/fe-wf-link-deadend`
  > Dieser Bediener hat eine Anmeldung, aber der Bildschirm hat keine Antwort erhalten, zu wem sie gehört. Gehört diese Anmeldung bereits zu einer Person in Okam, wird die Anstellung DIESER Person zugeordnet und nicht einer neuen. Öffnen Sie das Panel erneut, bevor Sie bestätigen.
- `lane/fe-wf-oplink`
  > Dieser Bediener hat eine Anmeldung. Gehört diese Anmeldung bereits zu einer Person in Okam, wird die Anstellung DIESER Person zugeordnet und nicht einer neuen. Wer das ist, lässt sich hier nicht anzeigen; hat die Person beim Arbeitgeber bereits eine aktive Anstellung, wird die Zeile abgewiesen.

#### `wfpl_identity_gap`

- `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/wf-idreg`, `lane/wf-kodeoversikt-ui`
  > IDENTIFIZIERUNG: § 8-5-6 verlangt Name und fødselsnummer (norwegische Geburtsnummer) bzw. D-Nummer jeder Person. Diese Nummern dürfen durch eindeutige Codes ersetzt werden, jedoch nur, wenn eine Übersicht der Codes mit den zugehörigen Geburts- bzw. D-Nummern geführt wird. Okam erhebt und speichert keine Geburtsnummern, die Codes unten lassen sich im System daher keiner zuordnen. Die Code-Übersicht dieses Tages wird auf der Personallisten-Seite heruntergeladen — vorausgefüllt mit Codes, Namen und Aufbewahrungsfrist, das Feld für die Geburtsnummer bleibt offen. Der Betrieb trägt sie ein und bewahrt die Übersicht zusammen mit der Personalliste drei Jahre und sechs Monate nach Ende des Geschäftsjahres auf. Ohne diese ausgefüllte Übersicht ist diese Liste keine vollständige Identifizierung.
- **BASELINE(e34977ac)**
  > IDENTIFIZIERUNG: § 8-5-6 verlangt Name und fødselsnummer (norwegische Geburtsnummer) bzw. D-Nummer jeder Person. Diese Nummern dürfen durch eindeutige Codes ersetzt werden, jedoch nur, wenn eine Übersicht der verwendeten Codes mit den zugehörigen Geburts- bzw. D-Nummern geführt wird. Okam erhebt und speichert keine Geburts- oder D-Nummern und führt keine solche Code-Übersicht. Die Codes unten lassen sich hier daher keiner Geburtsnummer zuordnen. Die Liste deckt Namen, Zeitpunkte und Unternehmensangaben ab, nicht jedoch die Identifizierungsanforderung für sich allein — der Betrieb muss die Code-Übersicht selbst führen, oder die Liste ist um die Geburts- bzw. D-Nummern zu ergänzen.

#### `woltMenu_closingDay`

- `feature/swiss`
  > Schliesstag
- **BASELINE(e34977ac)**
  > Schließtag

#### `woltMenu_closingTime`

- `feature/swiss`
  > Schliesszeit
- **BASELINE(e34977ac)**
  > Schließzeit

#### `wolt_closingDay`

- `feature/swiss`
  > Schliesstag
- **BASELINE(e34977ac)**
  > Schließtag

#### `wolt_closingTime`

- `feature/swiss`
  > Schliesszeit
- **BASELINE(e34977ac)**
  > Schließzeit

## 4. The silent case, proven: merges with no conflict and a duplicate key

Each unmerged lane holding a divergent key was merged against the composition tip
`candidate/fe-compose-2026-08-05` using `git merge-file -p --diff3` on the three blobs — the
same file-level algorithm git uses, run to stdout, writing nothing. **87 file merges: 33
conflict (loud, and therefore safe), 45 merge clean with no duplicate, and 9 merge clean while
leaving the key in the object literal twice.** In a JS object literal the *later* entry wins at
runtime, and there is no conflict, no error and no signal.

**Which side wins is decided by line position, not by which side is incoming** — and the two
money-facing cases go opposite ways. For `fe-events-margin-surfaces` the incoming lane's
sentence lands later and wins; for `mrg-waste-frontend` the composition's sentence lands later
and the incoming lane's is the one that dies. Nothing about the merge expresses a preference:
the surviving sentence is whichever the alphabetical slot happened to put second.

Validated on a positive before reporting: the merged output for
`fe-events-margin-surfaces × no.ts` contains `mrgs_err_projection_behind` at **lines 3680 and
3692**, zero `<<<<<<<` markers, and a control key (`aIQueryBox_title`) exactly once.

| lane | locale | key | value that LOSES (earlier) | value that WINS (later) |
|---|---|---|---|---|
| `lane/fe-events-margin-surfaces` | `no` | `mrgs_err_projection_behind` | 'Uken ble ikke fryst: salgsprojeksjonen ligger {lag} poster bak kassen, så tallene ville blitt frosset som et gulv. Oppgjøret står fortsatt åpent. Pro | 'Salgsprojeksjonen ligger {lag} journalposter bak kassen, så ukens tall er et gulv — ekte, men for lave med et ukjent beløp. Ferdigstilling er avvist  |
| `lane/fe-events-margin-surfaces` | `no` | `mrgs_err_projection_behind_unsized` | 'Uken ble ikke fryst: salgsprojeksjonen ligger bak kassen, og serveren sa ikke hvor langt. Oppgjøret står fortsatt åpent. Projeksjonen tar igjen av se | 'Salgsprojeksjonen ligger bak kassen, så ukens tall er et gulv — ekte, men for lave med et ukjent beløp. Ferdigstilling er avvist. Projeksjonen henter |
| `lane/fe-events-margin-surfaces` | `en` | `mrgs_err_projection_behind` | 'The week was not frozen: the sales projection is {lag} entries behind the till, so the figures would have frozen as a floor. The statement is still o | 'The sales projection is {lag} journal entries behind the till, so this week figures are a floor — real, and short by an unknown amount. Finalizing wa |
| `lane/fe-events-margin-surfaces` | `en` | `mrgs_err_projection_behind_unsized` | 'The week was not frozen: the sales projection is behind the till, and the server did not say how far. The statement is still open. The projection cat | 'The sales projection is behind the till, so this week figures are a floor — real, and short by an unknown amount. Finalizing was refused. The project |
| `lane/fe-events-margin-surfaces` | `de` | `mrgs_err_projection_behind` | 'Die Woche wurde nicht eingefroren: Die Verkaufsprojektion liegt {lag} Einträge hinter der Kasse, die Zahlen wären also als Untergrenze eingefroren. D | 'Die Umsatzprojektion liegt {lag} Journaleinträge hinter der Kasse, die Zahlen dieser Woche sind also eine Untergrenze — echt, aber um einen unbekannt |
| `lane/fe-events-margin-surfaces` | `de` | `mrgs_err_projection_behind_unsized` | 'Die Woche wurde nicht eingefroren: Die Verkaufsprojektion liegt hinter der Kasse, und der Server hat nicht gesagt, wie weit. Der Abschluss bleibt off | 'Die Umsatzprojektion liegt hinter der Kasse, die Zahlen dieser Woche sind also eine Untergrenze — echt, aber um einen unbekannten Betrag zu niedrig.  |
| `lane/fe-wf-self` | `no` | `nav_growth_privacy` | 'Personvern' | 'Personvern' |
| `lane/fe-wf-self` | `en` | `nav_growth_privacy` | 'Privacy' | 'Privacy' |
| `lane/fe-wf-self` | `de` | `nav_growth_privacy` | 'Datenschutz' | 'Datenschutz' |
| `lane/mrg-waste-frontend` | `no` | `mrgs_waste_err_quantity` | 'Mengden må være et tall større enn null, med opptil seks desimaler og uten enhet — for eksempel 2,5. Ingenting ble sendt.' | 'Mengden må være et tall. La feltet stå tomt om du ikke vil oppgi mengde.' |
| `lane/mrg-waste-frontend` | `en` | `mrgs_waste_err_quantity` | 'A quantity must be a number greater than zero, with at most six decimals and no unit — for example 2.5. Nothing was sent.' | 'The quantity must be a number. Leave the field empty to state no quantity.' |
| `lane/mrg-waste-frontend` | `de` | `mrgs_waste_err_quantity` | 'Eine Menge muss eine Zahl grösser als null sein, mit höchstens sechs Dezimalstellen und ohne Einheit — zum Beispiel 2,5. Es wurde nichts gesendet.' | 'Die Menge muss eine Zahl sein. Feld leer lassen, wenn keine Menge angegeben wird.' |

Three lanes, four keys, all three locales:

- **`lane/fe-events-margin-surfaces`** — `mrgs_err_projection_behind` and
  `mrgs_err_projection_behind_unsized`. The two variants are not paraphrases: one says the week
  **was not frozen**, the other says the figures **are a floor, real but short by an unknown
  amount**. Those describe different outcomes of the same money path, and the merge picks one
  without anyone deciding.
- **`lane/mrg-waste-frontend`** — `mrgs_waste_err_quantity`. One variant tells the operator a
  quantity must be **greater than zero, at most six decimals, no unit**; the other tells them
  the field may be **left empty**. A validation contract, stated two ways.
- **`lane/fe-wf-self`** — `nav_growth_privacy`. Duplicate key, **identical value** in all three
  locales. Harmless to the sentence; still a duplicate entry in the literal.

**No ref currently carries a duplicate key.** All 118 claimants × 3 files were scanned: zero
duplicates anywhere today. The mechanism is latent, not fired.

## 5. Removals

| key | locales | removed by |
|---|---|---|
| `mrg_margin_label` | no en de | `lane/margin-menu-margin-ui` |
| `mrg_margin_unavailable` | no en de | `lane/margin-menu-margin-ui` |
| `wfr_access_no_list` | no en de | `lane/fe-wf-invite-list-revoke` |
| `wfrt_att_no_correction_ui` | no en de | `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/journey-workforce`, `lane/wf-adjust-address` |

Each key is removed from all three locales together, by the claimants named on its row.

**Three of the four are re-added by a different lane, so removal is a live collision class, not
bookkeeping.** This is the case the brief flagged, and the control key turns out to be in it:

| key | removed by | re-added by | value vs the removed one |
|---|---|---|---|
| `mrg_margin_label` | `lane/margin-menu-margin-ui` | `lane/margin-recipes` | absent from baseline — a **resurrection** |
| `mrg_margin_unavailable` | `lane/margin-menu-margin-ui` | `lane/margin-recipes` | absent from baseline — a **resurrection** |
| `wfr_access_no_list` | `lane/fe-wf-invite-list-revoke` | `lane/fe-wf-onboard`, `lane/fe-wf-self` | **identical** to the baseline value |
| `wfrt_att_no_correction_ui` | `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/journey-workforce`, `lane/wf-adjust-address` | — | no re-adder |

**All four remove/add races conflict rather than resolving silently** — simulated the same way
as §4: `margin-menu-margin-ui × margin-recipes`, `fe-wf-invite-list-revoke × fe-wf-onboard`,
`fe-wf-invite-list-revoke × fe-wf-self` and `fe-compose × margin-recipes` each return a conflict.
Whoever resolves them still has to decide whether the key comes back, but git will stop and ask.
`mrg_margin_label` and `mrg_margin_unavailable` are gone from the baseline (last touched by
`0768750`), so `lane/margin-recipes` merging would reintroduce two keys mainline no longer has.

## 6. The partial-addition finding — 35 keys already degrade to Norwegian

No *branch* makes a partial addition (§1). **The baseline does.** At `e34977ac`, `no.ts` holds
**4817** keys and `en.ts`/`de.ts` hold **4782** each: **35 keys exist in
Norwegian only**, and the `en` and `de` key sets are identical to each other.

`utils/i18n.js` resolves `active locale → no → en → de → the key itself`. So a key missing from
`en.ts` does not error and does not show the key — **an English or German operator is served the
Norwegian sentence**, silently. `plugins/i18n.js` states the same order in its header comment.

Twenty of the 35 are VAT-facing (`posset_goods_*`, `products_vat*`, `products_goodsGroup*`),
including `posset_goods_profile_reprice`, which warns that changing rates **re-prices future
sales**. That warning currently reaches a German operator in Norwegian.

| key | Norwegian value |
|---|---|
| `index_specialDays` | 'Spesielle dager' |
| `index_specialDays_add` | 'Legg til' |
| `index_specialDays_addTitle` | 'Legg til spesiell åpningstid' |
| `index_specialDays_added` | 'Spesiell dag lagt til' |
| `index_specialDays_date` | 'Dato' |
| `index_specialDays_empty` | 'Ingen spesielle dager satt opp' |
| `index_specialDays_failed` | 'Kunne ikke lagre spesiell dag' |
| `index_specialDays_from` | 'Fra' |
| `index_specialDays_note` | 'Notat' |
| `index_specialDays_note_ph` | 'F.eks. Julaften' |
| `index_specialDays_openLabel` | 'Åpent' |
| `index_specialDays_pickDates` | 'Velg dager' |
| `index_specialDays_removed` | 'Spesiell dag fjernet' |
| `index_specialDays_selectedCount` | '{count} dager valgt' |
| `index_specialDays_status` | 'Status' |
| `index_specialDays_to` | 'Til' |
| `posset_col_profile` | 'MVA-profil' |
| `posset_goods_delivery` | 'Levering' |
| `posset_goods_eatin` | 'Spis her' |
| `posset_goods_preset_food` | 'Mat og drikke · 15/25/15' |
| `posset_goods_preset_free` | 'Avgiftsfri · 0/0/0' |
| `posset_goods_preset_standard` | 'Standard · 25/25/25' |
| `posset_goods_profile` | 'MVA-profil (valgfri)' |
| `posset_goods_profile_hint` | 'Sett alle tre satsene for at gruppen skal styre MVA på produktene sine (sats følger av gruppe × kontekst). La stå tomme for en ren SAF-T-gruppe.' |
| `posset_goods_profile_incomplete` | 'MVA-profilen må enten være helt tom eller ha alle tre satsene.' |
| `posset_goods_profile_reprice` | '⚠ Endring av satsene re-priser fremtidige salg for alle produkter i denne gruppen.' |
| `posset_goods_rate_none` | '—' |
| `posset_goods_seed` | 'Opprett standardgrupper' |
| `posset_goods_seeded` | 'Standardgrupper opprettet.' |
| `posset_goods_takeaway` | 'Ta med' |
| `products_goodsGroup` | 'Varegruppe' |
| `products_goodsGroupVatNote` | 'MVA styres av varegruppen: {takeaway} % ta med · {eatin} % spis her · {delivery} % levering.' |
| `products_goodsGroup_none` | 'Ingen varegruppe' |
| `products_vatAdvancedHide` | 'Skjul råfelter' |
| `products_vatAdvancedShow` | 'Vis råfelter' |

## 7. The statutory string, and why it is not a C6 flag

`wfpl_identity_gap` names **bokføringsforskriften § 8-5-6** on screen and is divergent:
`lane/wf-idreg`, `lane/wf-kodeoversikt-ui` and both composition branches assert the code register
**is downloaded from the personalliste page, pre-filled**, where the baseline asserts Okam
**keeps no such register** and the venue must produce it. Those are opposite claims about the
product, not wording.

**The claiming side is backed.** On `lane/wf-kodeoversikt-ui` and
`candidate/fe-compose-2026-08-05` the artifact has a producer:
`pages/admin/workforce-personnel-list.vue`, `utils/workforce/personnel-list-client.js` and
`utils/workforce/api-client.js`. C6 is satisfied on that branch. **The hazard is the reverse**:
if the baseline sentence wins the merge, a venue that *can* download the register is told it
cannot. Either way this is an authoring decision with a statutory consequence and is left open.

## 8. Full index — every key added by any claimant

All 1,911 added keys. `verdict` is over the three locales jointly: **DIVERGENT** if any locale
diverges, **identical** if two or more claimants agree, **sole** if only one claimant adds it
and the baseline does not hold it. `n` is the number of authoring claimants.

| key | n | verdict | claimants |
|---|---:|---|---|
| `adminFooter_close` | 1 | sole | `feature/swiss` |
| `adminFooter_logout` | 1 | sole | `feature/swiss` |
| `allmx_author` | 1 | sole | `lane/menu-allergen-matrix` |
| `allmx_author_unknown` | 1 | sole | `lane/menu-allergen-matrix` |
| `allmx_blank_means` | 1 | sole | `lane/menu-allergen-matrix` |
| `allmx_cell_contains` | 1 | sole | `lane/menu-allergen-matrix` |
| `allmx_cell_unregistered` | 1 | sole | `lane/menu-allergen-matrix` |
| `allmx_col_dish` | 1 | sole | `lane/menu-allergen-matrix` |
| `allmx_f_address` | 1 | sole | `lane/menu-allergen-matrix` |
| `allmx_f_orgnr` | 1 | sole | `lane/menu-allergen-matrix` |
| `allmx_f_venue` | 1 | sole | `lane/menu-allergen-matrix` |
| `allmx_foot_hidden` | 1 | sole | `lane/menu-allergen-matrix` |
| `allmx_foot_readat` | 1 | sole | `lane/menu-allergen-matrix` |
| `allmx_incomplete` | 1 | sole | `lane/menu-allergen-matrix` |
| `allmx_legend_deactivated` | 1 | sole | `lane/menu-allergen-matrix` |
| `allmx_legend_unused` | 1 | sole | `lane/menu-allergen-matrix` |
| `allmx_links_partial` | 1 | sole | `lane/menu-allergen-matrix` |
| `allmx_loading` | 1 | sole | `lane/menu-allergen-matrix` |
| `allmx_loading_links` | 1 | sole | `lane/menu-allergen-matrix` |
| `allmx_no_catalogue` | 1 | sole | `lane/menu-allergen-matrix` |
| `allmx_no_products` | 1 | sole | `lane/menu-allergen-matrix` |
| `allmx_nudge_catalogue` | 1 | sole | `lane/menu-allergen-matrix` |
| `allmx_nudge_catalogue_link` | 1 | sole | `lane/menu-allergen-matrix` |
| `allmx_nudge_unlabelled` | 1 | sole | `lane/menu-allergen-matrix` |
| `allmx_nudge_unlabelled_link` | 1 | sole | `lane/menu-allergen-matrix` |
| `allmx_orphan_links` | 1 | sole | `lane/menu-allergen-matrix` |
| `allmx_page_intro` | 1 | sole | `lane/menu-allergen-matrix` |
| `allmx_page_title` | 1 | sole | `lane/menu-allergen-matrix` |
| `allmx_print` | 1 | sole | `lane/menu-allergen-matrix` |
| `allmx_print_unavailable` | 1 | sole | `lane/menu-allergen-matrix` |
| `allmx_read_failed` | 1 | sole | `lane/menu-allergen-matrix` |
| `allmx_reload` | 1 | sole | `lane/menu-allergen-matrix` |
| `allmx_row_hidden` | 1 | sole | `lane/menu-allergen-matrix` |
| `allmx_row_soldout` | 1 | sole | `lane/menu-allergen-matrix` |
| `allmx_row_unlabelled` | 1 | sole | `lane/menu-allergen-matrix` |
| `allmx_row_unnamed` | 1 | sole | `lane/menu-allergen-matrix` |
| `allmx_row_unread` | 1 | sole | `lane/menu-allergen-matrix` |
| `allmx_sheet_title` | 1 | sole | `lane/menu-allergen-matrix` |
| `allmx_summary` | 1 | sole | `lane/menu-allergen-matrix` |
| `allmx_unknown` | 1 | sole | `lane/menu-allergen-matrix` |
| `allmx_unread_rows` | 1 | sole | `lane/menu-allergen-matrix` |
| `autocompleteInput_errorMustStartUppercase` | 1 | sole | `feature/swiss` |
| `autocompleteInput_errorNoLeadingTrailingSpace` | 1 | sole | `feature/swiss` |
| `autocompleteInput_errorTooLong` | 1 | sole | `feature/swiss` |
| `autocompleteInput_errorTooShort` | 1 | sole | `feature/swiss` |
| `ev_accept_note` | 1 | identical | `lane/events-admin` |
| `ev_action_add_line` | 1 | identical | `lane/events-admin` |
| `ev_action_cancel_deposit` | 1 | identical | `lane/events-admin` |
| `ev_action_close` | 1 | identical | `lane/events-admin` |
| `ev_action_close_settlement` | 1 | identical | `lane/events-admin` |
| `ev_action_create` | 1 | identical | `lane/events-admin` |
| `ev_action_create_submit` | 1 | identical | `lane/events-admin` |
| `ev_action_draft` | 1 | identical | `lane/events-admin` |
| `ev_action_draft_submit` | 1 | identical | `lane/events-admin` |
| `ev_action_edit_draft` | 1 | sole | `lane/fe-events-margin-surfaces` |
| `ev_action_edit_draft_submit` | 1 | sole | `lane/fe-events-margin-surfaces` |
| `ev_action_issue_deposit` | 1 | identical | `lane/events-admin` |
| `ev_action_mark_lost` | 1 | identical | `lane/events-admin` |
| `ev_action_note` | 1 | sole | `lane/fe-events-margin-surfaces` |
| `ev_action_note_submit` | 1 | sole | `lane/fe-events-margin-surfaces` |
| `ev_action_pos_link` | 1 | sole | `lane/fe-events-margin-surfaces` |
| `ev_action_pos_link_submit` | 1 | sole | `lane/fe-events-margin-surfaces` |
| `ev_action_reconcile` | 1 | identical | `lane/events-admin` |
| `ev_action_runsheet` | 1 | identical | `lane/events-admin` |
| `ev_action_send` | 1 | identical | `lane/events-admin` |
| `ev_action_start_service` | 1 | identical | `lane/events-admin` |
| `ev_actions_heading` | 1 | identical | `lane/events-admin` |
| `ev_activity_from_none` | 1 | identical | `lane/events-admin` |
| `ev_activity_heading` | 1 | identical | `lane/events-admin` |
| `ev_activity_none` | 1 | identical | `lane/events-admin` |
| `ev_author_none` | 1 | identical | `lane/events-admin` |
| `ev_author_reference` | 1 | identical | `lane/events-admin` |
| `ev_availability_conflict_unstated` | 1 | sole | `lane/fe-events-margin-surfaces` |
| `ev_availability_date` | 1 | sole | `lane/fe-events-margin-surfaces` |
| `ev_availability_gated` | 1 | sole | `lane/fe-events-margin-surfaces` |
| `ev_availability_heading` | 1 | sole | `lane/fe-events-margin-surfaces` |
| `ev_availability_holds` | 1 | sole | `lane/fe-events-margin-surfaces` |
| `ev_availability_load` | 1 | sole | `lane/fe-events-margin-surfaces` |
| `ev_availability_no_conflicts` | 1 | sole | `lane/fe-events-margin-surfaces` |
| `ev_availability_no_holds` | 1 | sole | `lane/fe-events-margin-surfaces` |
| `ev_availability_no_reservations` | 1 | sole | `lane/fe-events-margin-surfaces` |
| `ev_availability_reservations` | 1 | sole | `lane/fe-events-margin-surfaces` |
| `ev_availability_today_note` | 1 | sole | `lane/fe-events-margin-surfaces` |
| `ev_availability_unknown` | 1 | sole | `lane/fe-events-margin-surfaces` |
| `ev_col_contact` | 1 | identical | `lane/events-admin` |
| `ev_col_date` | 1 | identical | `lane/events-admin` |
| `ev_col_guests` | 1 | identical | `lane/events-admin` |
| `ev_col_status` | 1 | identical | `lane/events-admin` |
| `ev_col_title` | 1 | identical | `lane/events-admin` |
| `ev_col_version` | 1 | identical | `lane/events-admin` |
| `ev_create_heading` | 1 | identical | `lane/events-admin` |
| `ev_create_hint` | 1 | identical | `lane/events-admin` |
| `ev_deposit_amount` | 1 | identical | `lane/events-admin` |
| `ev_deposit_expires` | 1 | identical | `lane/events-admin` |
| `ev_deposit_gated` | 1 | identical | `lane/events-admin` |
| `ev_deposit_heading` | 1 | **DIVERGENT** | `lane/events-admin` |
| `ev_deposit_no_net` | 1 | identical | `lane/events-admin` |
| `ev_deposit_no_read` | 1 | sole | `lane/events-admin` |
| `ev_deposit_paid` | 1 | identical | `lane/events-admin` |
| `ev_deposit_rail` | 1 | identical | `lane/events-admin` |
| `ev_deposit_rail_note` | 1 | identical | `lane/events-admin` |
| `ev_deposit_refunded` | 1 | identical | `lane/events-admin` |
| `ev_deposit_risk_awaiting_recovery` | 1 | sole | `lane/fe-events-margin-surfaces` |
| `ev_deposit_risk_awaiting_recovery_detail` | 1 | sole | `lane/fe-events-margin-surfaces` |
| `ev_deposit_risk_late_paid` | 1 | sole | `lane/fe-events-margin-surfaces` |
| `ev_deposit_risk_late_paid_detail` | 1 | sole | `lane/fe-events-margin-surfaces` |
| `ev_deposit_risk_quarantined` | 1 | sole | `lane/fe-events-margin-surfaces` |
| `ev_deposit_risk_quarantined_detail` | 1 | sole | `lane/fe-events-margin-surfaces` |
| `ev_deposit_status` | 1 | identical | `lane/events-admin` |
| `ev_deposit_token` | 1 | **DIVERGENT** | `lane/events-admin` |
| `ev_deposit_unknown` | 1 | identical | `lane/events-admin` |
| `ev_detail_unknown` | 1 | identical | `lane/events-admin` |
| `ev_dismiss` | 1 | identical | `lane/events-admin` |
| `ev_error_generic` | 1 | identical | `lane/events-admin` |
| `ev_field_company` | 1 | identical | `lane/events-admin` |
| `ev_field_contact` | 1 | identical | `lane/events-admin` |
| `ev_field_contact_email` | 1 | identical | `lane/events-admin` |
| `ev_field_contact_name` | 1 | identical | `lane/events-admin` |
| `ev_field_contact_phone` | 1 | identical | `lane/events-admin` |
| `ev_field_created` | 1 | identical | `lane/events-admin` |
| `ev_field_currency` | 1 | identical | `lane/events-admin` |
| `ev_field_date` | 1 | identical | `lane/events-admin` |
| `ev_field_end` | 1 | identical | `lane/events-admin` |
| `ev_field_expiry_day` | 1 | identical | `lane/events-admin` |
| `ev_field_expiry_hint` | 1 | identical | `lane/events-admin` |
| `ev_field_guests` | 1 | identical | `lane/events-admin` |
| `ev_field_source` | 1 | identical | `lane/events-admin` |
| `ev_field_start` | 1 | identical | `lane/events-admin` |
| `ev_field_terms` | 1 | identical | `lane/events-admin` |
| `ev_field_time` | 1 | identical | `lane/events-admin` |
| `ev_field_title` | 1 | identical | `lane/events-admin` |
| `ev_field_zone` | 1 | identical | `lane/events-admin` |
| `ev_filter_from` | 1 | identical | `lane/events-admin` |
| `ev_filter_status_all` | 1 | identical | `lane/events-admin` |
| `ev_filter_to` | 1 | identical | `lane/events-admin` |
| `ev_handover_note` | 1 | identical | `lane/events-admin` |
| `ev_journey_heading` | 1 | identical | `lane/events-admin` |
| `ev_line_amount` | 1 | identical | `lane/events-admin` |
| `ev_line_desc` | 1 | identical | `lane/events-admin` |
| `ev_line_kind` | 1 | identical | `lane/events-admin` |
| `ev_line_no` | 1 | identical | `lane/events-admin` |
| `ev_line_qty` | 1 | identical | `lane/events-admin` |
| `ev_line_unit` | 1 | identical | `lane/events-admin` |
| `ev_line_vat` | 1 | identical | `lane/events-admin` |
| `ev_money_rejected` | 1 | identical | `lane/events-admin` |
| `ev_note_append_only` | 1 | sole | `lane/fe-events-margin-surfaces` |
| `ev_note_body` | 1 | sole | `lane/fe-events-margin-surfaces` |
| `ev_note_heading` | 1 | sole | `lane/fe-events-margin-surfaces` |
| `ev_notes_heading` | 1 | sole | `lane/fe-events-margin-surfaces` |
| `ev_notes_none` | 1 | sole | `lane/fe-events-margin-surfaces` |
| `ev_page_intro` | 1 | identical | `lane/events-admin` |
| `ev_page_title` | 1 | identical | `lane/events-admin` |
| `ev_pipeline_disabled` | 1 | identical | `lane/events-admin` |
| `ev_pipeline_empty` | 1 | identical | `lane/events-admin` |
| `ev_pipeline_forbidden` | 1 | identical | `lane/events-admin` |
| `ev_pipeline_heading` | 1 | identical | `lane/events-admin` |
| `ev_pipeline_unknown` | 1 | identical | `lane/events-admin` |
| `ev_pos_link_amount` | 1 | sole | `lane/fe-events-margin-surfaces` |
| `ev_pos_link_amount_needed` | 1 | sole | `lane/fe-events-margin-surfaces` |
| `ev_pos_link_heading` | 1 | sole | `lane/fe-events-margin-surfaces` |
| `ev_pos_link_note` | 1 | sole | `lane/fe-events-margin-surfaces` |
| `ev_pos_link_reference` | 1 | sole | `lane/fe-events-margin-surfaces` |
| `ev_pos_link_reference_needed` | 1 | sole | `lane/fe-events-margin-surfaces` |
| `ev_pos_link_source_kind` | 1 | sole | `lane/fe-events-margin-surfaces` |
| `ev_pos_link_vat_journal` | 1 | sole | `lane/fe-events-margin-surfaces` |
| `ev_pos_link_vat_order` | 1 | sole | `lane/fe-events-margin-surfaces` |
| `ev_pos_source_JournalRef` | 1 | sole | `lane/fe-events-margin-surfaces` |
| `ev_pos_source_OrderRef` | 1 | sole | `lane/fe-events-margin-surfaces` |
| `ev_proposal_edit_heading` | 1 | sole | `lane/fe-events-margin-surfaces` |
| `ev_proposal_edit_replace_note` | 1 | sole | `lane/fe-events-margin-surfaces` |
| `ev_proposal_heading` | 1 | identical | `lane/events-admin` |
| `ev_receipt_amount` | 1 | identical | `lane/events-admin` |
| `ev_receipt_at` | 1 | identical | `lane/events-admin` |
| `ev_receipt_kind` | 1 | identical | `lane/events-admin` |
| `ev_receipt_ref` | 1 | identical | `lane/events-admin` |
| `ev_refusal_current` | 1 | identical | `lane/events-admin` |
| `ev_refusal_disabled` | 1 | identical | `lane/events-admin` |
| `ev_refusal_other` | 1 | identical | `lane/events-admin` |
| `ev_refusal_permitted` | 1 | identical | `lane/events-admin` |
| `ev_refusal_permitted_none` | 1 | identical | `lane/events-admin` |
| `ev_refusal_pos_ref` | 1 | sole | `lane/fe-events-margin-surfaces` |
| `ev_refusal_proposal_immutable` | 1 | sole | `lane/fe-events-margin-surfaces` |
| `ev_refusal_state` | 1 | identical | `lane/events-admin` |
| `ev_reload` | 1 | identical | `lane/events-admin` |
| `ev_runsheet_composed` | 3 | identical | `lane/ev-stale-cause`, `lane/statute-evidence-world`, `lane/statute-honesty` |
| `ev_runsheet_from` | 1 | identical | `lane/events-admin` |
| `ev_runsheet_gated` | 1 | identical | `lane/events-admin` |
| `ev_runsheet_heading` | 1 | identical | `lane/events-admin` |
| `ev_runsheet_issued_at` | 1 | identical | `lane/events-admin` |
| `ev_runsheet_issued_by` | 1 | identical | `lane/events-admin` |
| `ev_runsheet_none` | 1 | identical | `lane/events-admin` |
| `ev_runsheet_stale` | 1 | identical | `lane/events-admin` |
| `ev_runsheet_stale_dietary` | 3 | identical | `lane/ev-stale-cause`, `lane/statute-evidence-world`, `lane/statute-honesty` |
| `ev_runsheet_stale_dietary_unplaced` | 1 | sole | `lane/ev-stale-cause` |
| `ev_runsheet_stale_no_operative` | 1 | sole | `lane/ev-stale-cause` |
| `ev_runsheet_stale_note` | 3 | identical | `lane/ev-stale-cause`, `lane/statute-evidence-world`, `lane/statute-honesty` |
| `ev_runsheet_stale_superseded` | 1 | sole | `lane/ev-stale-cause` |
| `ev_runsheet_stale_unnamed` | 1 | sole | `lane/ev-stale-cause` |
| `ev_runsheet_status` | 1 | identical | `lane/events-admin` |
| `ev_runsheet_unknown` | 1 | identical | `lane/events-admin` |
| `ev_runsheet_version` | 1 | identical | `lane/events-admin` |
| `ev_settings_add_space` | 1 | sole | `lane/fe-events-margin-surfaces` |
| `ev_settings_gated` | 1 | sole | `lane/fe-events-margin-surfaces` |
| `ev_settings_heading` | 1 | sole | `lane/fe-events-margin-surfaces` |
| `ev_settings_hide` | 1 | sole | `lane/fe-events-margin-surfaces` |
| `ev_settings_no_delete_note` | 1 | sole | `lane/fe-events-margin-surfaces` |
| `ev_settings_none` | 1 | sole | `lane/fe-events-margin-surfaces` |
| `ev_settings_save` | 1 | sole | `lane/fe-events-margin-surfaces` |
| `ev_settings_scope_note` | 1 | sole | `lane/fe-events-margin-surfaces` |
| `ev_settings_show` | 1 | sole | `lane/fe-events-margin-surfaces` |
| `ev_settings_unknown` | 1 | sole | `lane/fe-events-margin-surfaces` |
| `ev_settlement_closed` | 1 | identical | `lane/events-admin` |
| `ev_settlement_closed_by` | 1 | identical | `lane/events-admin` |
| `ev_settlement_gate_note` | 1 | **DIVERGENT** | `lane/events-admin` |
| `ev_settlement_gated` | 1 | **DIVERGENT** | `lane/events-admin` |
| `ev_settlement_heading` | 1 | identical | `lane/events-admin` |
| `ev_settlement_match` | 1 | identical | `lane/events-admin` |
| `ev_settlement_no_balance` | 1 | identical | `lane/events-admin` |
| `ev_settlement_no_read` | 1 | sole | `lane/events-admin` |
| `ev_settlement_reconciled` | 1 | identical | `lane/events-admin` |
| `ev_settlement_recorded` | 1 | identical | `lane/events-admin` |
| `ev_settlement_source` | 1 | identical | `lane/events-admin` |
| `ev_settlement_status` | 1 | identical | `lane/events-admin` |
| `ev_settlement_total` | 1 | identical | `lane/events-admin` |
| `ev_settlement_truth` | 1 | identical | `lane/events-admin` |
| `ev_settlement_unknown` | 1 | identical | `lane/events-admin` |
| `ev_space_active` | 1 | sole | `lane/fe-events-margin-surfaces` |
| `ev_space_capacity` | 1 | sole | `lane/fe-events-margin-surfaces` |
| `ev_space_name` | 1 | sole | `lane/fe-events-margin-surfaces` |
| `ev_space_notes` | 1 | sole | `lane/fe-events-margin-surfaces` |
| `ev_status_Accepted` | 1 | identical | `lane/events-admin` |
| `ev_status_Cancelled` | 1 | identical | `lane/events-admin` |
| `ev_status_Confirmed` | 1 | identical | `lane/events-admin` |
| `ev_status_DepositPending` | 1 | identical | `lane/events-admin` |
| `ev_status_InService` | 1 | identical | `lane/events-admin` |
| `ev_status_Inquiry` | 1 | identical | `lane/events-admin` |
| `ev_status_Lost` | 1 | identical | `lane/events-admin` |
| `ev_status_ProposalSent` | 1 | identical | `lane/events-admin` |
| `ev_status_Proposing` | 1 | identical | `lane/events-admin` |
| `ev_status_Settled` | 1 | identical | `lane/events-admin` |
| `ev_status_Settling` | 1 | identical | `lane/events-admin` |
| `ev_status_absent` | 1 | identical | `lane/events-admin` |
| `ev_status_absent_note` | 1 | identical | `lane/events-admin` |
| `ev_status_offramp` | 1 | identical | `lane/events-admin` |
| `ev_status_unrecognised` | 1 | identical | `lane/events-admin` |
| `ev_toast_closed` | 1 | identical | `lane/events-admin` |
| `ev_toast_created` | 1 | identical | `lane/events-admin` |
| `ev_toast_deposit` | 1 | identical | `lane/events-admin` |
| `ev_toast_deposit_cancelled` | 1 | identical | `lane/events-admin` |
| `ev_toast_draft_edited` | 1 | sole | `lane/fe-events-margin-surfaces` |
| `ev_toast_drafted` | 1 | identical | `lane/events-admin` |
| `ev_toast_in_service` | 1 | identical | `lane/events-admin` |
| `ev_toast_lost` | 1 | identical | `lane/events-admin` |
| `ev_toast_note_added` | 1 | sole | `lane/fe-events-margin-surfaces` |
| `ev_toast_pos_linked` | 1 | sole | `lane/fe-events-margin-surfaces` |
| `ev_toast_reconciled` | 1 | identical | `lane/events-admin` |
| `ev_toast_runsheet` | 1 | identical | `lane/events-admin` |
| `ev_toast_sent` | 1 | identical | `lane/events-admin` |
| `ev_toast_settings_saved` | 1 | sole | `lane/fe-events-margin-surfaces` |
| `ev_toast_settled` | 1 | identical | `lane/events-admin` |
| `ev_vat_absent` | 1 | sole | `lane/fe-events-margin-surfaces` |
| `ev_vat_code` | 1 | sole | `lane/fe-events-margin-surfaces` |
| `ev_vat_covered` | 1 | sole | `lane/fe-events-margin-surfaces` |
| `ev_vat_gross` | 1 | sole | `lane/fe-events-margin-surfaces` |
| `ev_vat_heading` | 1 | sole | `lane/fe-events-margin-surfaces` |
| `ev_vat_net` | 1 | sole | `lane/fe-events-margin-surfaces` |
| `ev_vat_no_rates` | 1 | sole | `lane/fe-events-margin-surfaces` |
| `ev_vat_rate` | 1 | sole | `lane/fe-events-margin-surfaces` |
| `ev_vat_reason_DepositPrepaymentTreatmentUnconfigured` | 1 | sole | `lane/fe-events-margin-surfaces` |
| `ev_vat_reason_FiscalTruthCarriesNoTaxLines` | 1 | sole | `lane/fe-events-margin-surfaces` |
| `ev_vat_reason_NoVatRateOnLine` | 1 | sole | `lane/fe-events-margin-surfaces` |
| `ev_vat_reason_NotReconciledAgainstFiscalTruth` | 1 | sole | `lane/fe-events-margin-surfaces` |
| `ev_vat_reason_SourceCarriesNoVatBreakdown` | 1 | sole | `lane/fe-events-margin-surfaces` |
| `ev_vat_reason_UnsupportedVatRate` | 1 | sole | `lane/fe-events-margin-surfaces` |
| `ev_vat_reason_ZeroRateIndistinguishableFromUnset` | 1 | sole | `lane/fe-events-margin-surfaces` |
| `ev_vat_reason_unknown` | 1 | sole | `lane/fe-events-margin-surfaces` |
| `ev_vat_reason_unstated` | 1 | sole | `lane/fe-events-margin-surfaces` |
| `ev_vat_total` | 1 | sole | `lane/fe-events-margin-surfaces` |
| `ev_vat_vat` | 1 | sole | `lane/fe-events-margin-surfaces` |
| `ev_vat_withheld` | 1 | sole | `lane/fe-events-margin-surfaces` |
| `ev_vat_withheld_heading` | 1 | sole | `lane/fe-events-margin-surfaces` |
| `ev_version_deposit` | 1 | identical | `lane/events-admin` |
| `ev_version_expires` | 1 | identical | `lane/events-admin` |
| `ev_version_minimum` | 1 | identical | `lane/events-admin` |
| `ev_version_no` | 1 | identical | `lane/events-admin` |
| `ev_version_operative` | 1 | identical | `lane/events-admin` |
| `ev_version_roomfee` | 1 | identical | `lane/events-admin` |
| `ev_version_sent` | 1 | identical | `lane/events-admin` |
| `ev_version_token` | 1 | **DIVERGENT** | `lane/events-admin` |
| `ev_version_total` | 1 | identical | `lane/events-admin` |
| `ev_versions_heading` | 1 | identical | `lane/events-admin` |
| `ev_versions_none` | 1 | identical | `lane/events-admin` |
| `ff_off_training_assignments` | 3 | identical | `WORKING-TREE`, `lane/train-readonly-visible`, `lane/wf-pubhist` |
| `ff_off_training_setup` | 3 | identical | `WORKING-TREE`, `lane/train-readonly-visible`, `lane/wf-pubhist` |
| `ff_withheld_deployment_note` | 3 | identical | `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/meals-reachable-web` |
| `growth_approval_approve` | 1 | identical | `lane/growth-admin` |
| `growth_approval_approved_at` | 1 | identical | `lane/growth-admin` |
| `growth_approval_approving` | 1 | identical | `lane/growth-admin` |
| `growth_approval_done` | 1 | identical | `lane/growth-admin` |
| `growth_approval_intro` | 1 | identical | `lane/growth-admin` |
| `growth_approval_state_live` | 1 | identical | `lane/growth-admin` |
| `growth_approval_state_none` | 1 | identical | `lane/growth-admin` |
| `growth_approval_state_superseded` | 1 | identical | `lane/growth-admin` |
| `growth_approval_state_unknown` | 1 | identical | `lane/growth-admin` |
| `growth_approval_title` | 1 | identical | `lane/growth-admin` |
| `growth_audience_compute` | 1 | identical | `lane/growth-admin` |
| `growth_audience_computed` | 1 | identical | `lane/growth-admin` |
| `growth_audience_computed_at` | 1 | identical | `lane/growth-admin` |
| `growth_audience_computing` | 1 | identical | `lane/growth-admin` |
| `growth_audience_excluded` | 1 | identical | `lane/growth-admin` |
| `growth_audience_exclusions` | 1 | identical | `lane/growth-admin` |
| `growth_audience_immutable_note` | 1 | identical | `lane/growth-admin` |
| `growth_audience_included` | 1 | identical | `lane/growth-admin` |
| `growth_audience_intro` | 1 | identical | `lane/growth-admin` |
| `growth_audience_none` | 1 | identical | `lane/growth-admin` |
| `growth_audience_title` | 1 | identical | `lane/growth-admin` |
| `growth_audience_watermark` | 1 | identical | `lane/growth-admin` |
| `growth_block_approval_superseded` | 1 | identical | `lane/growth-admin` |
| `growth_block_consent_unreadable` | 1 | identical | `lane/growth-admin` |
| `growth_block_empty_audience` | 1 | identical | `lane/growth-admin` |
| `growth_block_no_audience` | 1 | identical | `lane/growth-admin` |
| `growth_block_no_content` | 1 | identical | `lane/growth-admin` |
| `growth_block_no_unsubscribe` | 1 | identical | `lane/growth-admin` |
| `growth_block_not_approved` | 1 | identical | `lane/growth-admin` |
| `growth_draft_content` | 1 | identical | `lane/growth-admin` |
| `growth_draft_create` | 1 | identical | `lane/growth-admin` |
| `growth_draft_intro` | 1 | identical | `lane/growth-admin` |
| `growth_draft_needs_audience` | 1 | identical | `lane/growth-admin` |
| `growth_draft_new` | 1 | identical | `lane/growth-admin` |
| `growth_draft_plain` | 1 | identical | `lane/growth-admin` |
| `growth_draft_save` | 1 | identical | `lane/growth-admin` |
| `growth_draft_saved` | 1 | identical | `lane/growth-admin` |
| `growth_draft_subject` | 1 | identical | `lane/growth-admin` |
| `growth_draft_title` | 1 | identical | `lane/growth-admin` |
| `growth_draft_version` | 1 | identical | `lane/growth-admin` |
| `growth_error_approval_stale` | 1 | identical | `lane/growth-admin` |
| `growth_error_content_required` | 1 | identical | `lane/growth-admin` |
| `growth_error_forbidden` | 1 | identical | `lane/growth-admin` |
| `growth_error_generic` | 1 | identical | `lane/growth-admin` |
| `growth_error_newsletter_not_approvable` | 1 | identical | `lane/growth-admin` |
| `growth_error_newsletter_not_editable` | 1 | identical | `lane/growth-admin` |
| `growth_error_no_live_approval` | 1 | identical | `lane/growth-admin` |
| `growth_error_not_found` | 1 | identical | `lane/growth-admin` |
| `growth_error_stale_version` | 1 | identical | `lane/growth-admin` |
| `growth_error_subject_required` | 1 | identical | `lane/growth-admin` |
| `growth_error_test_address_required` | 1 | identical | `lane/growth-admin` |
| `growth_error_test_address_suppressed` | 1 | sole | `lane/fe-growth-suppressed-key` |
| `growth_error_unattributed` | 1 | identical | `lane/growth-admin` |
| `growth_gate_blocking_send` | 1 | sole | `lane/fe-wf-self` |
| `growth_gate_dispatched_note` | 1 | **DIVERGENT** | `lane/growth-admin` |
| `growth_gate_dispatched_toast` | 1 | **DIVERGENT** | `lane/growth-admin` |
| `growth_gate_intro` | 1 | identical | `lane/growth-admin` |
| `growth_gate_recipients` | 1 | identical | `lane/growth-admin` |
| `growth_gate_send` | 1 | identical | `lane/growth-admin` |
| `growth_gate_sending` | 1 | identical | `lane/growth-admin` |
| `growth_gate_sending_note` | 1 | sole | `lane/fe-wf-self` |
| `growth_gate_state_blocked` | 1 | identical | `lane/growth-admin` |
| `growth_gate_state_dispatched` | 1 | **DIVERGENT** | `lane/growth-admin` |
| `growth_gate_state_ready` | 1 | **DIVERGENT** | `lane/growth-admin` |
| `growth_gate_state_unknown` | 1 | identical | `lane/growth-admin` |
| `growth_gate_title` | 1 | identical | `lane/growth-admin` |
| `growth_page_intro` | 1 | identical | `lane/growth-admin` |
| `growth_page_title` | 1 | identical | `lane/growth-admin` |
| `growth_privacy_cancel` | 1 | sole | `lane/fe-wf-self` |
| `growth_privacy_confirm_fulfil` | 1 | sole | `lane/fe-wf-self` |
| `growth_privacy_confirm_prompt` | 1 | sole | `lane/fe-wf-self` |
| `growth_privacy_confirm_reject` | 1 | sole | `lane/fe-wf-self` |
| `growth_privacy_contact` | 1 | sole | `lane/fe-wf-self` |
| `growth_privacy_error_generic` | 1 | sole | `lane/fe-wf-self` |
| `growth_privacy_error_gone` | 1 | sole | `lane/fe-wf-self` |
| `growth_privacy_error_invalid` | 1 | sole | `lane/fe-wf-self` |
| `growth_privacy_error_notice_undeliverable` | 1 | sole | `lane/fe-wf-self` |
| `growth_privacy_error_reason_required` | 1 | sole | `lane/fe-wf-self` |
| `growth_privacy_error_unattributed` | 1 | sole | `lane/fe-wf-self` |
| `growth_privacy_fulfil` | 1 | sole | `lane/fe-wf-self` |
| `growth_privacy_fulfil_access_note` | 1 | sole | `lane/fe-wf-self` |
| `growth_privacy_fulfil_erasure_note` | 1 | sole | `lane/fe-wf-self` |
| `growth_privacy_inbox_intro` | 1 | sole | `lane/fe-wf-self` |
| `growth_privacy_inbox_title` | 1 | sole | `lane/fe-wf-self` |
| `growth_privacy_intro` | 1 | sole | `lane/fe-wf-self` |
| `growth_privacy_none` | 1 | sole | `lane/fe-wf-self` |
| `growth_privacy_notice_failed` | 1 | sole | `lane/fe-wf-self` |
| `growth_privacy_notice_failed_detail` | 1 | sole | `lane/fe-wf-self` |
| `growth_privacy_notice_label` | 1 | sole | `lane/fe-wf-self` |
| `growth_privacy_notice_not_attempted` | 1 | sole | `lane/fe-wf-self` |
| `growth_privacy_notice_not_attempted_detail` | 1 | sole | `lane/fe-wf-self` |
| `growth_privacy_notice_not_reported` | 1 | sole | `lane/fe-wf-self` |
| `growth_privacy_notice_not_reported_detail` | 1 | sole | `lane/fe-wf-self` |
| `growth_privacy_notice_submitted` | 1 | sole | `lane/fe-wf-self` |
| `growth_privacy_notice_submitted_detail` | 1 | sole | `lane/fe-wf-self` |
| `growth_privacy_notice_unavailable` | 1 | sole | `lane/fe-wf-self` |
| `growth_privacy_open_label` | 1 | sole | `lane/fe-wf-self` |
| `growth_privacy_prefcentre_body` | 1 | sole | `lane/fe-wf-self` |
| `growth_privacy_prefcentre_title` | 1 | sole | `lane/fe-wf-self` |
| `growth_privacy_reason` | 1 | sole | `lane/fe-wf-self` |
| `growth_privacy_reason_placeholder` | 1 | sole | `lane/fe-wf-self` |
| `growth_privacy_received` | 1 | sole | `lane/fe-wf-self` |
| `growth_privacy_record` | 1 | sole | `lane/fe-wf-self` |
| `growth_privacy_recorded` | 1 | sole | `lane/fe-wf-self` |
| `growth_privacy_reject` | 1 | sole | `lane/fe-wf-self` |
| `growth_privacy_resolved` | 1 | sole | `lane/fe-wf-self` |
| `growth_privacy_resolving` | 1 | sole | `lane/fe-wf-self` |
| `growth_privacy_state_fulfilled` | 1 | sole | `lane/fe-wf-self` |
| `growth_privacy_state_in_progress` | 1 | sole | `lane/fe-wf-self` |
| `growth_privacy_state_received` | 1 | sole | `lane/fe-wf-self` |
| `growth_privacy_state_rejected` | 1 | sole | `lane/fe-wf-self` |
| `growth_privacy_state_unknown` | 1 | sole | `lane/fe-wf-self` |
| `growth_privacy_title` | 1 | sole | `lane/fe-wf-self` |
| `growth_privacy_type_access` | 1 | sole | `lane/fe-wf-self` |
| `growth_privacy_type_erasure` | 1 | sole | `lane/fe-wf-self` |
| `growth_privacy_type_unknown` | 1 | sole | `lane/fe-wf-self` |
| `growth_privacy_unknown` | 1 | sole | `lane/fe-wf-self` |
| `growth_run_accepted` | 1 | identical | `lane/growth-admin` |
| `growth_run_ambiguous` | 1 | identical | `lane/growth-admin` |
| `growth_run_completed` | 1 | identical | `lane/growth-admin` |
| `growth_run_delivered` | 1 | identical | `lane/growth-admin` |
| `growth_run_failed` | 1 | identical | `lane/growth-admin` |
| `growth_run_final_eligible` | 1 | identical | `lane/growth-admin` |
| `growth_run_open_rate` | 1 | identical | `lane/growth-admin` |
| `growth_run_opened` | 1 | identical | `lane/growth-admin` |
| `growth_run_started` | 1 | identical | `lane/growth-admin` |
| `growth_run_suppressed` | 1 | identical | `lane/growth-admin` |
| `growth_run_title` | 1 | identical | `lane/growth-admin` |
| `growth_run_truth_note` | 1 | identical | `lane/growth-admin` |
| `growth_standing_consented` | 1 | identical | `lane/growth-admin` |
| `growth_standing_intro` | 1 | identical | `lane/growth-admin` |
| `growth_standing_no_grant_note` | 1 | identical | `lane/growth-admin` |
| `growth_standing_no_suppressions` | 1 | identical | `lane/growth-admin` |
| `growth_standing_pending` | 1 | identical | `lane/growth-admin` |
| `growth_standing_reasons` | 1 | identical | `lane/growth-admin` |
| `growth_standing_scope_note` | 1 | identical | `lane/growth-admin` |
| `growth_standing_suppressed` | 1 | identical | `lane/growth-admin` |
| `growth_standing_title` | 1 | identical | `lane/growth-admin` |
| `growth_standing_unknown` | 1 | identical | `lane/growth-admin` |
| `growth_standing_withdrawn` | 1 | identical | `lane/growth-admin` |
| `growth_test_address` | 1 | identical | `lane/growth-admin` |
| `growth_test_intro` | 1 | **DIVERGENT** | `lane/growth-admin` |
| `growth_test_result` | 1 | identical | `lane/growth-admin` |
| `growth_test_send` | 1 | identical | `lane/growth-admin` |
| `growth_test_sending` | 1 | identical | `lane/growth-admin` |
| `growth_test_title` | 1 | identical | `lane/growth-admin` |
| `loginModal_editPhone` | 1 | sole | `feature/swiss` |
| `loginModal_invalidCode` | 1 | sole | `feature/swiss` |
| `loginModal_invalidPhone` | 1 | sole | `feature/swiss` |
| `logo_cardTitle` | 1 | sole | `feature/swiss` |
| `logo_dropHint` | 1 | sole | `feature/swiss` |
| `logo_errorFormat` | 1 | sole | `feature/swiss` |
| `logo_errorTooLarge` | 1 | sole | `feature/swiss` |
| `logo_errorUpload` | 1 | sole | `feature/swiss` |
| `logo_tipFormats` | 1 | sole | `feature/swiss` |
| `logo_tipMaxSize` | 1 | sole | `feature/swiss` |
| `logo_tipSquare` | 1 | sole | `feature/swiss` |
| `logo_updated` | 1 | sole | `feature/swiss` |
| `logo_uploading` | 1 | sole | `feature/swiss` |
| `meals_agreement_active` | 1 | identical | `lane/meals-admin` |
| `meals_agreement_ended` | 1 | identical | `lane/meals-admin` |
| `meals_agreements_none` | 1 | identical | `lane/meals-admin` |
| `meals_agreements_title` | 1 | identical | `lane/meals-admin` |
| `meals_capture_none` | 1 | identical | `lane/meals-admin` |
| `meals_capture_unknown` | 1 | identical | `lane/meals-admin` |
| `meals_claim_ref_from_company` | 3 | identical | `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/fe-meals-claim-receipt` |
| `meals_col_agreement` | 1 | identical | `lane/meals-admin` |
| `meals_col_bound` | 1 | identical | `lane/meals-admin` |
| `meals_col_bound_at` | 1 | identical | `lane/meals-admin` |
| `meals_col_cap` | 1 | identical | `lane/meals-admin` |
| `meals_col_captured` | 1 | identical | `lane/meals-admin` |
| `meals_col_captured_at` | 1 | identical | `lane/meals-admin` |
| `meals_col_company` | 1 | identical | `lane/meals-admin` |
| `meals_col_currency` | 1 | identical | `lane/meals-admin` |
| `meals_col_members` | 1 | identical | `lane/meals-admin` |
| `meals_col_order` | 1 | identical | `lane/meals-admin` |
| `meals_col_orders` | 1 | identical | `lane/meals-admin` |
| `meals_col_orgnr` | 1 | identical | `lane/meals-admin` |
| `meals_col_state` | 1 | identical | `lane/meals-admin` |
| `meals_company_archived` | 1 | identical | `lane/meals-admin` |
| `meals_enrol_action` | 6 | identical | `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/fe-meals-journey-locator`, `lane/fe-meals-pretick-walked`, `lane/meals-enrol-pretick`, `lane/meals-enrol-ui` |
| `meals_enrol_intro` | 6 | identical | `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/fe-meals-journey-locator`, `lane/fe-meals-pretick-walked`, `lane/meals-enrol-pretick`, `lane/meals-enrol-ui` |
| `meals_enrol_known_note` | 6 | **DIVERGENT** | `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/fe-meals-journey-locator`, `lane/fe-meals-pretick-walked`, `lane/meals-enrol-pretick`, `lane/meals-enrol-ui` |
| `meals_enrol_no_read_note` | 1 | sole | `lane/meals-enrol-ui` |
| `meals_enrol_none` | 6 | identical | `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/fe-meals-journey-locator`, `lane/fe-meals-pretick-walked`, `lane/meals-enrol-pretick`, `lane/meals-enrol-ui` |
| `meals_enrol_replaces_note` | 6 | identical | `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/fe-meals-journey-locator`, `lane/fe-meals-pretick-walked`, `lane/meals-enrol-pretick`, `lane/meals-enrol-ui` |
| `meals_enrol_revoked` | 6 | identical | `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/fe-meals-journey-locator`, `lane/fe-meals-pretick-walked`, `lane/meals-enrol-pretick`, `lane/meals-enrol-ui` |
| `meals_enrol_title` | 6 | identical | `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/fe-meals-journey-locator`, `lane/fe-meals-pretick-walked`, `lane/meals-enrol-pretick`, `lane/meals-enrol-ui` |
| `meals_enrol_unread_note` | 5 | identical | `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/fe-meals-journey-locator`, `lane/fe-meals-pretick-walked`, `lane/meals-enrol-pretick` |
| `meals_footnote_no_totals` | 1 | identical | `lane/meals-admin` |
| `meals_mc_ack` | 3 | identical | `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/fe-meals-reconcile-ui` |
| `meals_mc_blocked_many` | 3 | identical | `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/fe-meals-reconcile-ui` |
| `meals_mc_blocked_one` | 3 | identical | `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/fe-meals-reconcile-ui` |
| `meals_mc_blocked_partial` | 3 | identical | `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/fe-meals-reconcile-ui` |
| `meals_mc_blocked_some` | 3 | identical | `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/fe-meals-reconcile-ui` |
| `meals_mc_blocked_title` | 3 | identical | `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/fe-meals-reconcile-ui` |
| `meals_mc_cannot_finalize` | 3 | identical | `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/fe-meals-reconcile-ui` |
| `meals_mc_currency` | 3 | identical | `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/fe-meals-reconcile-ui` |
| `meals_mc_currency_unknown` | 3 | identical | `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/fe-meals-reconcile-ui` |
| `meals_mc_draft` | 3 | identical | `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/fe-meals-reconcile-ui` |
| `meals_mc_fact_lines` | 3 | identical | `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/fe-meals-reconcile-ui` |
| `meals_mc_fact_status` | 3 | identical | `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/fe-meals-reconcile-ui` |
| `meals_mc_fact_total` | 3 | identical | `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/fe-meals-reconcile-ui` |
| `meals_mc_finalize` | 3 | identical | `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/fe-meals-reconcile-ui` |
| `meals_mc_finalized` | 3 | identical | `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/fe-meals-reconcile-ui` |
| `meals_mc_irreversible` | 3 | identical | `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/fe-meals-reconcile-ui` |
| `meals_mc_no_funded_orders` | 3 | identical | `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/fe-meals-reconcile-ui` |
| `meals_mc_period_month` | 3 | identical | `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/fe-meals-reconcile-ui` |
| `meals_mc_period_year` | 3 | identical | `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/fe-meals-reconcile-ui` |
| `meals_mc_pick_company` | 3 | identical | `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/fe-meals-reconcile-ui` |
| `meals_mc_status_draft` | 3 | identical | `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/fe-meals-reconcile-ui` |
| `meals_mc_status_finalized` | 3 | identical | `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/fe-meals-reconcile-ui` |
| `meals_mc_subject` | 3 | identical | `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/fe-meals-reconcile-ui` |
| `meals_mc_title` | 3 | identical | `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/fe-meals-reconcile-ui` |
| `meals_orders_none` | 1 | identical | `lane/meals-admin` |
| `meals_orders_pick` | 1 | identical | `lane/meals-admin` |
| `meals_orders_title` | 1 | identical | `lane/meals-admin` |
| `meals_orders_title_for` | 1 | identical | `lane/meals-admin` |
| `meals_page_intro` | 1 | identical | `lane/meals-admin` |
| `meals_page_title` | 1 | identical | `lane/meals-admin` |
| `meals_rc_ack_still_blocks` | 4 | **DIVERGENT** | `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/fe-meals-reconcile-ui`, `lane/fe-training-meals-surfaces` |
| `meals_rc_acknowledge` | 4 | **DIVERGENT** | `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/fe-meals-reconcile-ui`, `lane/fe-training-meals-surfaces` |
| `meals_rc_blocking_many` | 4 | **DIVERGENT** | `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/fe-meals-reconcile-ui`, `lane/fe-training-meals-surfaces` |
| `meals_rc_blocking_one` | 4 | **DIVERGENT** | `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/fe-meals-reconcile-ui`, `lane/fe-training-meals-surfaces` |
| `meals_rc_blocking_title` | 4 | **DIVERGENT** | `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/fe-meals-reconcile-ui`, `lane/fe-training-meals-surfaces` |
| `meals_rc_blocking_unknown` | 4 | **DIVERGENT** | `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/fe-meals-reconcile-ui`, `lane/fe-training-meals-surfaces` |
| `meals_rc_cancel` | 4 | identical | `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/fe-meals-reconcile-ui`, `lane/fe-training-meals-surfaces` |
| `meals_rc_clear_body` | 4 | **DIVERGENT** | `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/fe-meals-reconcile-ui`, `lane/fe-training-meals-surfaces` |
| `meals_rc_clear_title` | 4 | **DIVERGENT** | `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/fe-meals-reconcile-ui`, `lane/fe-training-meals-surfaces` |
| `meals_rc_col_captured_drift` | 4 | identical | `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/fe-meals-reconcile-ui`, `lane/fe-training-meals-surfaces` |
| `meals_rc_col_kind` | 4 | **DIVERGENT** | `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/fe-meals-reconcile-ui`, `lane/fe-training-meals-surfaces` |
| `meals_rc_col_member` | 4 | identical | `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/fe-meals-reconcile-ui`, `lane/fe-training-meals-surfaces` |
| `meals_rc_col_note` | 4 | **DIVERGENT** | `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/fe-meals-reconcile-ui`, `lane/fe-training-meals-surfaces` |
| `meals_rc_col_period` | 4 | **DIVERGENT** | `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/fe-meals-reconcile-ui`, `lane/fe-training-meals-surfaces` |
| `meals_rc_col_reserved_drift` | 4 | identical | `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/fe-meals-reconcile-ui`, `lane/fe-training-meals-surfaces` |
| `meals_rc_col_source` | 4 | identical | `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/fe-meals-reconcile-ui`, `lane/fe-training-meals-surfaces` |
| `meals_rc_drift_intro` | 4 | **DIVERGENT** | `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/fe-meals-reconcile-ui`, `lane/fe-training-meals-surfaces` |
| `meals_rc_drift_no_repair` | 4 | **DIVERGENT** | `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/fe-meals-reconcile-ui`, `lane/fe-training-meals-surfaces` |
| `meals_rc_drift_none` | 1 | sole | `lane/fe-training-meals-surfaces` |
| `meals_rc_drift_title` | 4 | **DIVERGENT** | `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/fe-meals-reconcile-ui`, `lane/fe-training-meals-surfaces` |
| `meals_rc_empty` | 4 | **DIVERGENT** | `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/fe-meals-reconcile-ui`, `lane/fe-training-meals-surfaces` |
| `meals_rc_err_note_required` | 4 | **DIVERGENT** | `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/fe-meals-reconcile-ui`, `lane/fe-training-meals-surfaces` |
| `meals_rc_forward_only` | 4 | **DIVERGENT** | `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/fe-meals-reconcile-ui`, `lane/fe-training-meals-surfaces` |
| `meals_rc_guard_missing` | 4 | **DIVERGENT** | `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/fe-meals-reconcile-ui`, `lane/fe-training-meals-surfaces` |
| `meals_rc_kind_apply_failed` | 4 | **DIVERGENT** | `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/fe-meals-reconcile-ui`, `lane/fe-training-meals-surfaces` |
| `meals_rc_kind_apply_failed_why` | 4 | **DIVERGENT** | `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/fe-meals-reconcile-ui`, `lane/fe-training-meals-surfaces` |
| `meals_rc_kind_expired` | 4 | **DIVERGENT** | `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/fe-meals-reconcile-ui`, `lane/fe-training-meals-surfaces` |
| `meals_rc_kind_expired_why` | 4 | **DIVERGENT** | `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/fe-meals-reconcile-ui`, `lane/fe-training-meals-surfaces` |
| `meals_rc_kind_unknown` | 4 | identical | `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/fe-meals-reconcile-ui`, `lane/fe-training-meals-surfaces` |
| `meals_rc_kind_unknown_why` | 4 | **DIVERGENT** | `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/fe-meals-reconcile-ui`, `lane/fe-training-meals-surfaces` |
| `meals_rc_kind_unmatched` | 4 | **DIVERGENT** | `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/fe-meals-reconcile-ui`, `lane/fe-training-meals-surfaces` |
| `meals_rc_kind_unmatched_why` | 4 | **DIVERGENT** | `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/fe-meals-reconcile-ui`, `lane/fe-training-meals-surfaces` |
| `meals_rc_owner_note` | 4 | **DIVERGENT** | `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/fe-meals-reconcile-ui`, `lane/fe-training-meals-surfaces` |
| `meals_rc_page_intro` | 1 | sole | `lane/fe-training-meals-surfaces` |
| `meals_rc_page_title` | 1 | sole | `lane/fe-training-meals-surfaces` |
| `meals_rc_queue_title` | 4 | **DIVERGENT** | `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/fe-meals-reconcile-ui`, `lane/fe-training-meals-surfaces` |
| `meals_rc_resolve` | 4 | **DIVERGENT** | `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/fe-meals-reconcile-ui`, `lane/fe-training-meals-surfaces` |
| `meals_rc_resolve_action` | 4 | **DIVERGENT** | `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/fe-meals-reconcile-ui`, `lane/fe-training-meals-surfaces` |
| `meals_rc_resolve_intro` | 1 | sole | `lane/fe-training-meals-surfaces` |
| `meals_rc_resolve_subject` | 3 | identical | `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/fe-meals-reconcile-ui` |
| `meals_rc_resolve_title` | 4 | **DIVERGENT** | `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/fe-meals-reconcile-ui`, `lane/fe-training-meals-surfaces` |
| `meals_rc_state_acknowledged` | 4 | **DIVERGENT** | `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/fe-meals-reconcile-ui`, `lane/fe-training-meals-surfaces` |
| `meals_rc_state_open` | 4 | identical | `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/fe-meals-reconcile-ui`, `lane/fe-training-meals-surfaces` |
| `meals_rc_state_resolved` | 4 | **DIVERGENT** | `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/fe-meals-reconcile-ui`, `lane/fe-training-meals-surfaces` |
| `meals_rc_state_unknown` | 4 | identical | `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/fe-meals-reconcile-ui`, `lane/fe-training-meals-surfaces` |
| `meals_rc_statements_link` | 1 | sole | `lane/fe-training-meals-surfaces` |
| `meals_rc_write_gate` | 4 | **DIVERGENT** | `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/fe-meals-reconcile-ui`, `lane/fe-training-meals-surfaces` |
| `meals_refusal_absent` | 1 | identical | `lane/meals-admin` |
| `meals_refusal_dark` | 1 | identical | `lane/meals-admin` |
| `meals_refusal_forbidden` | 1 | identical | `lane/meals-admin` |
| `meals_refusal_not_read` | 1 | identical | `lane/meals-admin` |
| `meals_refusal_unauthenticated` | 1 | identical | `lane/meals-admin` |
| `meals_refusal_unknown` | 1 | identical | `lane/meals-admin` |
| `meals_reload` | 1 | identical | `lane/meals-admin` |
| `meals_st_carried_forward` | 1 | sole | `lane/fe-training-meals-surfaces` |
| `meals_st_col_gross` | 1 | sole | `lane/fe-training-meals-surfaces` |
| `meals_st_col_kind` | 1 | sole | `lane/fe-training-meals-surfaces` |
| `meals_st_col_lines` | 1 | sole | `lane/fe-training-meals-surfaces` |
| `meals_st_col_member` | 1 | sole | `lane/fe-training-meals-surfaces` |
| `meals_st_col_net` | 1 | sole | `lane/fe-training-meals-surfaces` |
| `meals_st_col_order` | 1 | sole | `lane/fe-training-meals-surfaces` |
| `meals_st_col_period` | 1 | sole | `lane/fe-training-meals-surfaces` |
| `meals_st_col_vat` | 1 | sole | `lane/fe-training-meals-surfaces` |
| `meals_st_content_hash` | 1 | sole | `lane/fe-training-meals-surfaces` |
| `meals_st_currency` | 1 | sole | `lane/fe-training-meals-surfaces` |
| `meals_st_currency_hint` | 1 | sole | `lane/fe-training-meals-surfaces` |
| `meals_st_dark_body` | 1 | sole | `lane/fe-training-meals-surfaces` |
| `meals_st_dark_title` | 1 | sole | `lane/fe-training-meals-surfaces` |
| `meals_st_detail_idle` | 1 | sole | `lane/fe-training-meals-surfaces` |
| `meals_st_draft_action` | 1 | sole | `lane/fe-training-meals-surfaces` |
| `meals_st_draft_intro` | 1 | sole | `lane/fe-training-meals-surfaces` |
| `meals_st_draft_title` | 1 | sole | `lane/fe-training-meals-surfaces` |
| `meals_st_err_currency` | 1 | sole | `lane/fe-training-meals-surfaces` |
| `meals_st_err_month` | 1 | sole | `lane/fe-training-meals-surfaces` |
| `meals_st_err_year` | 1 | sole | `lane/fe-training-meals-surfaces` |
| `meals_st_export_action` | 1 | sole | `lane/fe-training-meals-surfaces` |
| `meals_st_export_done` | 1 | sole | `lane/fe-training-meals-surfaces` |
| `meals_st_export_done_no_hash` | 1 | sole | `lane/fe-training-meals-surfaces` |
| `meals_st_export_unnamed` | 1 | sole | `lane/fe-training-meals-surfaces` |
| `meals_st_finalize_ack` | 1 | sole | `lane/fe-training-meals-surfaces` |
| `meals_st_finalize_action` | 1 | sole | `lane/fe-training-meals-surfaces` |
| `meals_st_finalize_intro` | 1 | sole | `lane/fe-training-meals-surfaces` |
| `meals_st_finalize_irreversible` | 1 | sole | `lane/fe-training-meals-surfaces` |
| `meals_st_finalize_no_precondition` | 1 | sole | `lane/fe-training-meals-surfaces` |
| `meals_st_finalize_title` | 1 | sole | `lane/fe-training-meals-surfaces` |
| `meals_st_frozen_body` | 1 | sole | `lane/fe-training-meals-surfaces` |
| `meals_st_frozen_body_unknown` | 1 | sole | `lane/fe-training-meals-surfaces` |
| `meals_st_frozen_title` | 1 | sole | `lane/fe-training-meals-surfaces` |
| `meals_st_kind_capture` | 1 | sole | `lane/fe-training-meals-surfaces` |
| `meals_st_kind_reversal` | 1 | sole | `lane/fe-training-meals-surfaces` |
| `meals_st_lever_body` | 1 | sole | `lane/fe-training-meals-surfaces` |
| `meals_st_lever_title` | 1 | sole | `lane/fe-training-meals-surfaces` |
| `meals_st_line_count` | 1 | sole | `lane/fe-training-meals-surfaces` |
| `meals_st_lines_none` | 1 | sole | `lane/fe-training-meals-surfaces` |
| `meals_st_lines_title` | 1 | sole | `lane/fe-training-meals-surfaces` |
| `meals_st_list_empty` | 1 | sole | `lane/fe-training-meals-surfaces` |
| `meals_st_list_idle` | 1 | sole | `lane/fe-training-meals-surfaces` |
| `meals_st_list_title` | 1 | sole | `lane/fe-training-meals-surfaces` |
| `meals_st_month` | 1 | sole | `lane/fe-training-meals-surfaces` |
| `meals_st_no_funded_orders_note` | 1 | sole | `lane/fe-training-meals-surfaces` |
| `meals_st_open_exceptions_link` | 1 | sole | `lane/fe-training-meals-surfaces` |
| `meals_st_open_exceptions_many` | 1 | sole | `lane/fe-training-meals-surfaces` |
| `meals_st_open_exceptions_one` | 1 | sole | `lane/fe-training-meals-surfaces` |
| `meals_st_open_exceptions_some` | 1 | sole | `lane/fe-training-meals-surfaces` |
| `meals_st_open_exceptions_title` | 1 | sole | `lane/fe-training-meals-surfaces` |
| `meals_st_page_intro` | 1 | sole | `lane/fe-training-meals-surfaces` |
| `meals_st_page_title` | 1 | sole | `lane/fe-training-meals-surfaces` |
| `meals_st_period_title` | 1 | sole | `lane/fe-training-meals-surfaces` |
| `meals_st_pick_company` | 1 | sole | `lane/fe-training-meals-surfaces` |
| `meals_st_redraft_note` | 1 | sole | `lane/fe-training-meals-surfaces` |
| `meals_st_reversal_note` | 1 | sole | `lane/fe-training-meals-surfaces` |
| `meals_st_revision` | 1 | sole | `lane/fe-training-meals-surfaces` |
| `meals_st_status_draft` | 1 | sole | `lane/fe-training-meals-surfaces` |
| `meals_st_status_finalized` | 1 | sole | `lane/fe-training-meals-surfaces` |
| `meals_st_total_gross` | 1 | sole | `lane/fe-training-meals-surfaces` |
| `meals_st_total_net` | 1 | sole | `lane/fe-training-meals-surfaces` |
| `meals_st_total_vat` | 1 | sole | `lane/fe-training-meals-surfaces` |
| `meals_st_totals_note` | 1 | sole | `lane/fe-training-meals-surfaces` |
| `meals_st_vat_rates` | 1 | sole | `lane/fe-training-meals-surfaces` |
| `meals_st_year` | 1 | sole | `lane/fe-training-meals-surfaces` |
| `meals_state_bound` | 1 | identical | `lane/meals-admin` |
| `meals_state_captured` | 1 | identical | `lane/meals-admin` |
| `meals_state_released` | 1 | identical | `lane/meals-admin` |
| `meals_state_reserved` | 1 | identical | `lane/meals-admin` |
| `meals_unlisted_company` | 1 | identical | `lane/meals-admin` |
| `meals_unlisted_company_one` | 1 | identical | `lane/meals-admin` |
| `mlst_col_gross` | 5 | identical | `WORKING-TREE`, `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/fe-meals-statement-surface`, `lane/wf-pubhist` |
| `mlst_col_kind` | 5 | identical | `WORKING-TREE`, `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/fe-meals-statement-surface`, `lane/wf-pubhist` |
| `mlst_col_member` | 5 | identical | `WORKING-TREE`, `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/fe-meals-statement-surface`, `lane/wf-pubhist` |
| `mlst_col_net` | 5 | identical | `WORKING-TREE`, `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/fe-meals-statement-surface`, `lane/wf-pubhist` |
| `mlst_col_occurred` | 5 | identical | `WORKING-TREE`, `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/fe-meals-statement-surface`, `lane/wf-pubhist` |
| `mlst_col_receipt` | 5 | identical | `WORKING-TREE`, `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/fe-meals-statement-surface`, `lane/wf-pubhist` |
| `mlst_col_vat` | 5 | identical | `WORKING-TREE`, `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/fe-meals-statement-surface`, `lane/wf-pubhist` |
| `mlst_count_mismatch` | 5 | identical | `WORKING-TREE`, `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/fe-meals-statement-surface`, `lane/wf-pubhist` |
| `mlst_directory_unknown` | 5 | identical | `WORKING-TREE`, `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/fe-meals-statement-surface`, `lane/wf-pubhist` |
| `mlst_download_action` | 5 | identical | `WORKING-TREE`, `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/fe-meals-statement-surface`, `lane/wf-pubhist` |
| `mlst_draft_note` | 5 | identical | `WORKING-TREE`, `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/fe-meals-statement-surface`, `lane/wf-pubhist` |
| `mlst_err_download_unavailable` | 5 | identical | `WORKING-TREE`, `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/fe-meals-statement-surface`, `lane/wf-pubhist` |
| `mlst_export_action` | 5 | identical | `WORKING-TREE`, `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/fe-meals-statement-surface`, `lane/wf-pubhist` |
| `mlst_export_hash` | 5 | identical | `WORKING-TREE`, `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/fe-meals-statement-surface`, `lane/wf-pubhist` |
| `mlst_export_named_here` | 5 | identical | `WORKING-TREE`, `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/fe-meals-statement-surface`, `lane/wf-pubhist` |
| `mlst_export_ready` | 5 | identical | `WORKING-TREE`, `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/fe-meals-statement-surface`, `lane/wf-pubhist` |
| `mlst_exporting` | 5 | identical | `WORKING-TREE`, `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/fe-meals-statement-surface`, `lane/wf-pubhist` |
| `mlst_fact_content_hash` | 5 | identical | `WORKING-TREE`, `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/fe-meals-statement-surface`, `lane/wf-pubhist` |
| `mlst_fact_finalized_at` | 5 | identical | `WORKING-TREE`, `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/fe-meals-statement-surface`, `lane/wf-pubhist` |
| `mlst_fact_gross` | 5 | identical | `WORKING-TREE`, `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/fe-meals-statement-surface`, `lane/wf-pubhist` |
| `mlst_fact_lines` | 5 | identical | `WORKING-TREE`, `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/fe-meals-statement-surface`, `lane/wf-pubhist` |
| `mlst_fact_net` | 5 | identical | `WORKING-TREE`, `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/fe-meals-statement-surface`, `lane/wf-pubhist` |
| `mlst_fact_period` | 5 | identical | `WORKING-TREE`, `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/fe-meals-statement-surface`, `lane/wf-pubhist` |
| `mlst_fact_revision` | 5 | identical | `WORKING-TREE`, `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/fe-meals-statement-surface`, `lane/wf-pubhist` |
| `mlst_fact_run` | 5 | identical | `WORKING-TREE`, `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/fe-meals-statement-surface`, `lane/wf-pubhist` |
| `mlst_fact_status` | 5 | identical | `WORKING-TREE`, `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/fe-meals-statement-surface`, `lane/wf-pubhist` |
| `mlst_fact_vat` | 5 | identical | `WORKING-TREE`, `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/fe-meals-statement-surface`, `lane/wf-pubhist` |
| `mlst_field_run` | 5 | identical | `WORKING-TREE`, `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/fe-meals-statement-surface`, `lane/wf-pubhist` |
| `mlst_frozen_note` | 5 | identical | `WORKING-TREE`, `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/fe-meals-statement-surface`, `lane/wf-pubhist` |
| `mlst_history_forbidden` | 5 | identical | `WORKING-TREE`, `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/fe-meals-statement-surface`, `lane/wf-pubhist` |
| `mlst_history_none` | 5 | identical | `WORKING-TREE`, `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/fe-meals-statement-surface`, `lane/wf-pubhist` |
| `mlst_history_title` | 5 | identical | `WORKING-TREE`, `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/fe-meals-statement-surface`, `lane/wf-pubhist` |
| `mlst_kind_capture` | 5 | identical | `WORKING-TREE`, `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/fe-meals-statement-surface`, `lane/wf-pubhist` |
| `mlst_kind_reversal` | 5 | identical | `WORKING-TREE`, `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/fe-meals-statement-surface`, `lane/wf-pubhist` |
| `mlst_lines_none` | 5 | identical | `WORKING-TREE`, `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/fe-meals-statement-surface`, `lane/wf-pubhist` |
| `mlst_member_ref_note` | 5 | identical | `WORKING-TREE`, `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/fe-meals-statement-surface`, `lane/wf-pubhist` |
| `mlst_no_companies` | 5 | identical | `WORKING-TREE`, `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/fe-meals-statement-surface`, `lane/wf-pubhist` |
| `mlst_open_action` | 5 | identical | `WORKING-TREE`, `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/fe-meals-statement-surface`, `lane/wf-pubhist` |
| `mlst_open_title` | 5 | identical | `WORKING-TREE`, `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/fe-meals-statement-surface`, `lane/wf-pubhist` |
| `mlst_opening` | 5 | identical | `WORKING-TREE`, `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/fe-meals-statement-surface`, `lane/wf-pubhist` |
| `mlst_owner_note` | 5 | identical | `WORKING-TREE`, `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/fe-meals-statement-surface`, `lane/wf-pubhist` |
| `mlst_page_intro` | 5 | identical | `WORKING-TREE`, `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/fe-meals-statement-surface`, `lane/wf-pubhist` |
| `mlst_page_title` | 5 | identical | `WORKING-TREE`, `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/fe-meals-statement-surface`, `lane/wf-pubhist` |
| `mlst_refusal_export_format` | 5 | identical | `WORKING-TREE`, `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/fe-meals-statement-surface`, `lane/wf-pubhist` |
| `mlst_refusal_forbidden` | 5 | identical | `WORKING-TREE`, `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/fe-meals-statement-surface`, `lane/wf-pubhist` |
| `mlst_refusal_not_found` | 5 | identical | `WORKING-TREE`, `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/fe-meals-statement-surface`, `lane/wf-pubhist` |
| `mlst_refusal_unauthenticated` | 5 | identical | `WORKING-TREE`, `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/fe-meals-statement-surface`, `lane/wf-pubhist` |
| `mlst_refusal_unknown` | 5 | identical | `WORKING-TREE`, `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/fe-meals-statement-surface`, `lane/wf-pubhist` |
| `mlst_refusal_validation` | 5 | identical | `WORKING-TREE`, `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/fe-meals-statement-surface`, `lane/wf-pubhist` |
| `mlst_reread_action` | 5 | identical | `WORKING-TREE`, `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/fe-meals-statement-surface`, `lane/wf-pubhist` |
| `mlst_run_placeholder` | 5 | identical | `WORKING-TREE`, `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/fe-meals-statement-surface`, `lane/wf-pubhist` |
| `mlst_run_title` | 5 | identical | `WORKING-TREE`, `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/fe-meals-statement-surface`, `lane/wf-pubhist` |
| `mlst_status_draft` | 5 | identical | `WORKING-TREE`, `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/fe-meals-statement-surface`, `lane/wf-pubhist` |
| `mlst_status_finalized` | 5 | identical | `WORKING-TREE`, `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/fe-meals-statement-surface`, `lane/wf-pubhist` |
| `mrg_activate` | 1 | identical | `lane/margin-recipes` |
| `mrg_activate_lede` | 1 | identical | `lane/margin-recipes` |
| `mrg_activate_no_revision` | 1 | identical | `lane/margin-recipes` |
| `mrg_activate_running` | 1 | identical | `lane/margin-recipes` |
| `mrg_component_add` | 1 | identical | `lane/margin-recipes` |
| `mrg_component_pick` | 1 | identical | `lane/margin-recipes` |
| `mrg_components_blocked_empty` | 1 | identical | `lane/margin-recipes` |
| `mrg_components_blocked_unknown` | 1 | identical | `lane/margin-recipes` |
| `mrg_cost_at_least` | 1 | identical | `lane/margin-recipes` |
| `mrg_cost_batch` | 1 | identical | `lane/margin-recipes` |
| `mrg_cost_floor_notice` | 1 | identical | `lane/margin-recipes` |
| `mrg_cost_no_sum_caveat` | 1 | identical | `lane/margin-recipes` |
| `mrg_cost_none_priced` | 1 | identical | `lane/margin-recipes` |
| `mrg_cost_not_costed` | 1 | identical | `lane/margin-recipes` |
| `mrg_cost_nothing_selected` | 1 | identical | `lane/margin-recipes` |
| `mrg_cost_per_portion` | 1 | identical | `lane/margin-recipes` |
| `mrg_cost_portions` | 1 | identical | `lane/margin-recipes` |
| `mrg_cost_priced_at` | 1 | identical | `lane/margin-recipes` |
| `mrg_cost_title` | 1 | identical | `lane/margin-recipes` |
| `mrg_cost_unknown` | 1 | identical | `lane/margin-recipes` |
| `mrg_cost_yield` | 1 | identical | `lane/margin-recipes` |
| `mrg_err_component` | 1 | identical | `lane/margin-recipes` |
| `mrg_err_cycle` | 1 | identical | `lane/margin-recipes` |
| `mrg_err_depth` | 1 | identical | `lane/margin-recipes` |
| `mrg_err_forbidden` | 1 | identical | `lane/margin-recipes` |
| `mrg_err_generic` | 1 | identical | `lane/margin-recipes` |
| `mrg_err_missing_revision` | 1 | identical | `lane/margin-recipes` |
| `mrg_err_name_conflict` | 1 | identical | `lane/margin-recipes` |
| `mrg_err_no_active` | 1 | identical | `lane/margin-recipes` |
| `mrg_err_not_draft` | 1 | identical | `lane/margin-recipes` |
| `mrg_err_not_found` | 1 | identical | `lane/margin-recipes` |
| `mrg_err_product_link` | 1 | identical | `lane/margin-menu-margin-ui` |
| `mrg_err_stale` | 1 | **DIVERGENT** | `lane/margin-recipes` |
| `mrg_err_too_many` | 1 | identical | `lane/margin-recipes` |
| `mrg_err_version_input` | 1 | identical | `lane/margin-recipes` |
| `mrg_form_components` | 1 | identical | `lane/margin-recipes` |
| `mrg_form_name` | 1 | identical | `lane/margin-recipes` |
| `mrg_form_portions` | 1 | identical | `lane/margin-recipes` |
| `mrg_form_saving` | 1 | identical | `lane/margin-recipes` |
| `mrg_form_submit` | 1 | identical | `lane/margin-recipes` |
| `mrg_form_title` | 1 | identical | `lane/margin-recipes` |
| `mrg_form_yield` | 1 | identical | `lane/margin-recipes` |
| `mrg_form_yield_unit` | 1 | identical | `lane/margin-recipes` |
| `mrg_ingredients_count` | 1 | identical | `lane/margin-recipes` |
| `mrg_ingredients_empty` | 1 | identical | `lane/margin-recipes` |
| `mrg_ingredients_title` | 1 | identical | `lane/margin-recipes` |
| `mrg_ingredients_unknown` | 1 | identical | `lane/margin-recipes` |
| `mrg_line_component` | 1 | identical | `lane/margin-recipes` |
| `mrg_line_cost` | 1 | identical | `lane/margin-recipes` |
| `mrg_line_flag_no_price` | 1 | identical | `lane/margin-recipes` |
| `mrg_line_flag_orphan` | 1 | identical | `lane/margin-recipes` |
| `mrg_line_flag_sub_recipe` | 1 | identical | `lane/margin-recipes` |
| `mrg_line_ingredient_gone` | 1 | identical | `lane/margin-recipes` |
| `mrg_line_ingredient_unknown` | 1 | identical | `lane/margin-recipes` |
| `mrg_line_orphan` | 1 | identical | `lane/margin-recipes` |
| `mrg_line_quantity` | 1 | identical | `lane/margin-recipes` |
| `mrg_line_sub_recipe` | 1 | identical | `lane/margin-recipes` |
| `mrg_line_unnamed` | 1 | identical | `lane/margin-recipes` |
| `mrg_links_add` | 1 | identical | `lane/margin-menu-margin-ui` |
| `mrg_links_empty` | 1 | identical | `lane/margin-menu-margin-ui` |
| `mrg_links_err_duplicate` | 1 | identical | `lane/margin-menu-margin-ui` |
| `mrg_links_err_product` | 1 | identical | `lane/margin-menu-margin-ui` |
| `mrg_links_err_quantity` | 1 | identical | `lane/margin-menu-margin-ui` |
| `mrg_links_lede` | 1 | identical | `lane/margin-menu-margin-ui` |
| `mrg_links_option_taken` | 1 | identical | `lane/margin-menu-margin-ui` |
| `mrg_links_pick` | 1 | identical | `lane/margin-menu-margin-ui` |
| `mrg_links_product_gone` | 1 | identical | `lane/margin-menu-margin-ui` |
| `mrg_links_replace_caveat` | 1 | identical | `lane/margin-menu-margin-ui` |
| `mrg_links_save` | 1 | identical | `lane/margin-menu-margin-ui` |
| `mrg_links_saving` | 1 | identical | `lane/margin-menu-margin-ui` |
| `mrg_links_title` | 1 | identical | `lane/margin-menu-margin-ui` |
| `mrg_links_unknown` | 1 | identical | `lane/margin-menu-margin-ui` |
| `mrg_list_empty` | 1 | identical | `lane/margin-recipes` |
| `mrg_list_title` | 1 | identical | `lane/margin-recipes` |
| `mrg_list_unknown` | 1 | identical | `lane/margin-recipes` |
| `mrg_margin_basis_base` | 1 | identical | `lane/margin-menu-margin-ui` |
| `mrg_margin_basis_delivery` | 1 | identical | `lane/margin-menu-margin-ui` |
| `mrg_margin_basis_table` | 1 | identical | `lane/margin-menu-margin-ui` |
| `mrg_margin_col_basis` | 1 | identical | `lane/margin-menu-margin-ui` |
| `mrg_margin_col_contribution` | 1 | identical | `lane/margin-menu-margin-ui` |
| `mrg_margin_col_food_cost` | 1 | identical | `lane/margin-menu-margin-ui` |
| `mrg_margin_col_net` | 1 | identical | `lane/margin-menu-margin-ui` |
| `mrg_margin_col_plate` | 1 | identical | `lane/margin-menu-margin-ui` |
| `mrg_margin_deposit` | 1 | identical | `lane/margin-menu-margin-ui` |
| `mrg_margin_label` | 1 | sole | `lane/margin-recipes` |
| `mrg_margin_link_broken` | 1 | identical | `lane/margin-menu-margin-ui` |
| `mrg_margin_no_rows` | 1 | identical | `lane/margin-menu-margin-ui` |
| `mrg_margin_percent` | 1 | identical | `lane/margin-menu-margin-ui` |
| `mrg_margin_product_hidden` | 1 | identical | `lane/margin-menu-margin-ui` |
| `mrg_margin_product_unnamed` | 1 | identical | `lane/margin-menu-margin-ui` |
| `mrg_margin_qty_per_unit` | 1 | identical | `lane/margin-menu-margin-ui` |
| `mrg_margin_read_unknown` | 1 | identical | `lane/margin-menu-margin-ui` |
| `mrg_margin_sub_recipe` | 1 | identical | `lane/margin-menu-margin-ui` |
| `mrg_margin_title` | 1 | identical | `lane/margin-menu-margin-ui` |
| `mrg_margin_unavailable` | 1 | sole | `lane/margin-recipes` |
| `mrg_margin_unsold` | 1 | identical | `lane/margin-menu-margin-ui` |
| `mrg_margin_vat` | 1 | identical | `lane/margin-menu-margin-ui` |
| `mrg_margin_why_incomplete` | 1 | identical | `lane/margin-menu-margin-ui` |
| `mrg_margin_why_no_cost` | 1 | identical | `lane/margin-menu-margin-ui` |
| `mrg_margin_why_no_price` | 1 | identical | `lane/margin-menu-margin-ui` |
| `mrg_margin_withheld` | 1 | identical | `lane/margin-menu-margin-ui` |
| `mrg_module_off` | 1 | identical | `lane/margin-recipes` |
| `mrg_page_intro` | 1 | identical | `lane/margin-recipes` |
| `mrg_page_title` | 1 | identical | `lane/margin-recipes` |
| `mrg_revise_active` | 5 | identical | `WORKING-TREE`, `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/mrg-recipe-revise-ui`, `lane/wf-pubhist` |
| `mrg_revise_active_unknown` | 5 | identical | `WORKING-TREE`, `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/mrg-recipe-revise-ui`, `lane/wf-pubhist` |
| `mrg_revise_edit_title` | 5 | identical | `WORKING-TREE`, `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/mrg-recipe-revise-ui`, `lane/wf-pubhist` |
| `mrg_revise_new` | 5 | identical | `WORKING-TREE`, `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/mrg-recipe-revise-ui`, `lane/wf-pubhist` |
| `mrg_revise_new_running` | 5 | identical | `WORKING-TREE`, `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/mrg-recipe-revise-ui`, `lane/wf-pubhist` |
| `mrg_revise_no_active` | 5 | identical | `WORKING-TREE`, `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/mrg-recipe-revise-ui`, `lane/wf-pubhist` |
| `mrg_revise_retire` | 5 | identical | `WORKING-TREE`, `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/mrg-recipe-revise-ui`, `lane/wf-pubhist` |
| `mrg_revise_retire_lede` | 5 | identical | `WORKING-TREE`, `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/mrg-recipe-revise-ui`, `lane/wf-pubhist` |
| `mrg_revise_retire_no_revision` | 5 | identical | `WORKING-TREE`, `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/mrg-recipe-revise-ui`, `lane/wf-pubhist` |
| `mrg_revise_retiring` | 5 | identical | `WORKING-TREE`, `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/mrg-recipe-revise-ui`, `lane/wf-pubhist` |
| `mrg_revise_save` | 5 | identical | `WORKING-TREE`, `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/mrg-recipe-revise-ui`, `lane/wf-pubhist` |
| `mrg_revise_saving` | 5 | identical | `WORKING-TREE`, `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/mrg-recipe-revise-ui`, `lane/wf-pubhist` |
| `mrg_revise_sub_recipe` | 5 | identical | `WORKING-TREE`, `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/mrg-recipe-revise-ui`, `lane/wf-pubhist` |
| `mrg_revise_title` | 5 | identical | `WORKING-TREE`, `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/mrg-recipe-revise-ui`, `lane/wf-pubhist` |
| `mrg_row_active` | 1 | identical | `lane/margin-recipes` |
| `mrg_row_drafts` | 1 | identical | `lane/margin-recipes` |
| `mrg_row_linked` | 1 | identical | `lane/margin-recipes` |
| `mrg_row_no_active` | 1 | identical | `lane/margin-recipes` |
| `mrg_row_unlinked` | 1 | identical | `lane/margin-recipes` |
| `mrg_starters_lede` | 1 | identical | `lane/margin-recipes` |
| `mrg_status_unknown` | 1 | identical | `lane/margin-recipes` |
| `mrg_unit_gram` | 1 | identical | `lane/margin-recipes` |
| `mrg_unit_kilogram` | 1 | identical | `lane/margin-recipes` |
| `mrg_unit_liter` | 1 | identical | `lane/margin-recipes` |
| `mrg_unit_milliliter` | 1 | identical | `lane/margin-recipes` |
| `mrg_unit_piece` | 1 | identical | `lane/margin-recipes` |
| `mrg_version_active` | 1 | identical | `lane/margin-recipes` |
| `mrg_version_draft` | 1 | identical | `lane/margin-recipes` |
| `mrg_version_unknown` | 1 | identical | `lane/margin-recipes` |
| `mrgs_err_already_open` | 1 | sole | `lane/fe-events-margin-surfaces` |
| `mrgs_err_currency_mixed` | 1 | sole | `lane/fe-events-margin-surfaces` |
| `mrgs_err_input_invalid` | 1 | sole | `lane/fe-events-margin-surfaces` |
| `mrgs_err_no_store_currency` | 1 | sole | `lane/fe-events-margin-surfaces` |
| `mrgs_err_not_open` | 1 | sole | `lane/fe-events-margin-surfaces` |
| `mrgs_err_projection_behind` | 4 | **DIVERGENT** | `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/fe-events-margin-surfaces`, `lane/mrg-lag-visible` |
| `mrgs_err_projection_behind_unsized` | 4 | **DIVERGENT** | `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/fe-events-margin-surfaces`, `lane/mrg-lag-visible` |
| `mrgs_err_spend_negative` | 1 | sole | `lane/fe-events-margin-surfaces` |
| `mrgs_err_waste_frozen` | 1 | sole | `lane/mrg-waste-frontend` |
| `mrgs_err_waste_input_invalid` | 1 | sole | `lane/mrg-waste-frontend` |
| `mrgs_err_waste_reason` | 1 | sole | `lane/mrg-waste-frontend` |
| `mrgs_err_waste_value_negative` | 1 | sole | `lane/mrg-waste-frontend` |
| `mrgs_err_week_not_monday` | 1 | sole | `lane/fe-events-margin-surfaces` |
| `mrgs_projection_behind_consequence` | 1 | sole | `lane/fe-events-margin-surfaces` |
| `mrgs_projection_gate_behind` | 3 | identical | `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/mrg-lag-visible` |
| `mrgs_projection_gate_current` | 3 | identical | `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/mrg-lag-visible` |
| `mrgs_projection_gate_unknown` | 3 | identical | `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/mrg-lag-visible` |
| `mrgs_projection_poweruser_only` | 1 | sole | `lane/fe-events-margin-surfaces` |
| `mrgs_prov_lag` | 1 | sole | `lane/fe-events-margin-surfaces` |
| `mrgs_prov_lag_floor` | 1 | sole | `lane/fe-events-margin-surfaces` |
| `mrgs_prov_lag_value` | 1 | sole | `lane/fe-events-margin-surfaces` |
| `mrgs_ratio_coverage_basis_statement` | 1 | sole | `lane/fe-events-margin-surfaces` |
| `mrgs_ratio_coverage_basis_window` | 1 | sole | `lane/fe-events-margin-surfaces` |
| `mrgs_waste_coverage_unknown` | 6 | identical | `WORKING-TREE`, `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/fe-meals-statement-surface`, `lane/mrg-coverage-unknown`, `lane/wf-pubhist` |
| `mrgs_waste_err_quantity` | 4 | **DIVERGENT** | `candidate/fe-compose-2026-08-05`, `lane/coercion-write-paths`, `lane/collect-review-conditions`, `lane/mrg-waste-frontend` |
| `nav_closeMenu` | 1 | sole | `feature/swiss` |
| `nav_collapseMenu` | 1 | sole | `feature/swiss` |
| `nav_growth_newsletter` | 1 | identical | `lane/growth-admin` |
| `nav_growth_privacy` | 1 | identical | `lane/fe-wf-self` |
| `nav_meals` | 1 | identical | `lane/meals-admin` |
| `nav_meals_reconciliation` | 1 | sole | `lane/fe-training-meals-surfaces` |
| `nav_meals_statements` | 6 | **DIVERGENT** | `WORKING-TREE`, `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/fe-meals-statement-surface`, `lane/fe-training-meals-surfaces`, `lane/wf-pubhist` |
| `nav_menu_allergens` | 1 | sole | `lane/menu-allergen-matrix` |
| `nav_openMenu` | 1 | sole | `feature/swiss` |
| `nav_showMenu` | 1 | sole | `feature/swiss` |
| `nav_training_evidence` | 6 | **DIVERGENT** | `WORKING-TREE`, `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/fe-training-meals-surfaces`, `lane/train-evidence-pack-ui`, `lane/wf-pubhist` |
| `nav_workforce_delivery` | 2 | identical | `WORKING-TREE`, `lane/wf-pubhist` |
| `nav_workforce_publications` | 2 | identical | `WORKING-TREE`, `lane/wf-pubhist` |
| `nav_workforce_roles` | 4 | identical | `WORKING-TREE`, `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/wf-roles-ui` |
| `nav_workforce_roster` | 1 | **DIVERGENT** | `lane/workforce-roster` |
| `nav_workforce_timesheets` | 1 | sole | `WORKING-TREE` |
| `onboardingAI_addMoreProducts` | 1 | sole | `feature/swiss` |
| `onboardingAI_deleteExistingAddNew` | 1 | sole | `feature/swiss` |
| `onboardingAI_existingProductsQuestion` | 1 | sole | `feature/swiss` |
| `onboardingAI_existingProductsTitle` | 1 | sole | `feature/swiss` |
| `onboardingAI_extraInstructionsPlaceholder` | 1 | sole | `feature/swiss` |
| `onboardingAI_foundProducts` | 1 | sole | `feature/swiss` |
| `onboardingAI_importPartialError` | 1 | sole | `feature/swiss` |
| `onboardingAI_importToStore` | 1 | sole | `feature/swiss` |
| `onboardingAI_importWithAI` | 1 | sole | `feature/swiss` |
| `onboardingAI_importing` | 1 | sole | `feature/swiss` |
| `onboardingAI_importingProducts` | 1 | sole | `feature/swiss` |
| `onboardingAI_keepExistingAddNew` | 1 | sole | `feature/swiss` |
| `onboardingAI_menuPlaceholder` | 1 | sole | `feature/swiss` |
| `onboardingAI_startOver` | 1 | sole | `feature/swiss` |
| `onboardingAI_storeIdMissing` | 1 | sole | `feature/swiss` |
| `onboardingAI_tableCategory` | 1 | sole | `feature/swiss` |
| `onboardingAI_tableDescription` | 1 | sole | `feature/swiss` |
| `onboardingAI_tableProduct` | 1 | sole | `feature/swiss` |
| `onboardingNotification_continueSetup` | 1 | sole | `feature/swiss` |
| `onboardingNotification_defaultStoreName` | 1 | sole | `feature/swiss` |
| `onboardingNotification_dismiss` | 1 | sole | `feature/swiss` |
| `onboardingNotification_parseError` | 1 | sole | `feature/swiss` |
| `onboardingNotification_progressIntro` | 1 | sole | `feature/swiss` |
| `onboardingNotification_progressStep` | 1 | sole | `feature/swiss` |
| `onboarding_defaultStoreName` | 1 | sole | `feature/swiss` |
| `onboarding_logoUpload_clickToSelect` | 1 | sole | `feature/swiss` |
| `onboarding_logoUpload_dragHere` | 1 | sole | `feature/swiss` |
| `onboarding_logoUpload_errorLoadingImage` | 1 | sole | `feature/swiss` |
| `onboarding_logoUpload_errorProcessingImage` | 1 | sole | `feature/swiss` |
| `onboarding_logoUpload_errorReadingFile` | 1 | sole | `feature/swiss` |
| `onboarding_logoUpload_errorReadingImage` | 1 | sole | `feature/swiss` |
| `onboarding_logoUpload_errorReadingImageRetry` | 1 | sole | `feature/swiss` |
| `onboarding_logoUpload_fileTooLarge` | 1 | sole | `feature/swiss` |
| `onboarding_logoUpload_invalidFormat` | 1 | sole | `feature/swiss` |
| `onboarding_logoUpload_tipFormats` | 1 | sole | `feature/swiss` |
| `onboarding_logoUpload_tipMaxSize` | 1 | sole | `feature/swiss` |
| `onboarding_logoUpload_tipShape` | 1 | sole | `feature/swiss` |
| `onboarding_logoUpload_tipSize` | 1 | sole | `feature/swiss` |
| `onboarding_logoUpload_tipsTitle` | 1 | sole | `feature/swiss` |
| `onboarding_logoUpload_uploadError` | 1 | sole | `feature/swiss` |
| `onboarding_logoUpload_uploading` | 1 | sole | `feature/swiss` |
| `onboarding_productImages_clearFilter` | 1 | sole | `feature/swiss` |
| `onboarding_productImages_dropHint` | 1 | sole | `feature/swiss` |
| `onboarding_productImages_filterPlaceholder` | 1 | sole | `feature/swiss` |
| `onboarding_productImages_invalidImageFormat` | 1 | sole | `feature/swiss` |
| `onboarding_productImages_loading` | 1 | sole | `feature/swiss` |
| `onboarding_productImages_noDescription` | 1 | sole | `feature/swiss` |
| `onboarding_productImages_noProducts` | 1 | sole | `feature/swiss` |
| `onboarding_productImages_processImageError` | 1 | sole | `feature/swiss` |
| `onboarding_productImages_showingCount` | 1 | sole | `feature/swiss` |
| `onboarding_productImages_uploadFailed` | 1 | sole | `feature/swiss` |
| `orderReceipt_awaitingApproval` | 1 | sole | `feature/swiss` |
| `orderReceipt_basis` | 1 | sole | `feature/swiss` |
| `orderReceipt_close` | 1 | sole | `feature/swiss` |
| `orderReceipt_comment` | 1 | sole | `feature/swiss` |
| `orderReceipt_deliveryMethod` | 1 | sole | `feature/swiss` |
| `orderReceipt_heading` | 1 | sole | `feature/swiss` |
| `orderReceipt_itemColumn` | 1 | sole | `feature/swiss` |
| `orderReceipt_itemVat` | 1 | sole | `feature/swiss` |
| `orderReceipt_orderNumber` | 1 | sole | `feature/swiss` |
| `orderReceipt_ordered` | 1 | sole | `feature/swiss` |
| `orderReceipt_orgNumber` | 1 | sole | `feature/swiss` |
| `orderReceipt_payment` | 1 | sole | `feature/swiss` |
| `orderReceipt_pickupCode` | 1 | sole | `feature/swiss` |
| `orderReceipt_priceColumn` | 1 | sole | `feature/swiss` |
| `orderReceipt_pushPrompt` | 1 | sole | `feature/swiss` |
| `orderReceipt_readyBy` | 1 | sole | `feature/swiss` |
| `orderReceipt_status` | 1 | sole | `feature/swiss` |
| `orderReceipt_tableSuffix` | 1 | sole | `feature/swiss` |
| `orderReceipt_total` | 1 | sole | `feature/swiss` |
| `orderReceipt_vatColumn` | 1 | sole | `feature/swiss` |
| `pos_mode_clock` | 6 | **DIVERGENT** | `WORKING-TREE`, `lane/fe-pos-clock`, `lane/fe-wf-blind-bind-name`, `lane/fe-wf-link-deadend`, `lane/fe-wf-oplink`, `lane/wf-pubhist` |
| `pos_mode_personnel` | 4 | identical | `lane/fe-pos-clock`, `lane/fe-wf-blind-bind-name`, `lane/fe-wf-link-deadend`, `lane/fe-wf-oplink` |
| `pos_negative_sale_unpriceable` | 2 | identical | `lane/check-lineamount-ungated-sum`, `lanes/L-CHECK-LINEAMOUNT-UNGATED-SUM` |
| `posclk_col_from` | 2 | identical | `WORKING-TREE`, `lane/wf-pubhist` |
| `posclk_col_name` | 2 | identical | `WORKING-TREE`, `lane/wf-pubhist` |
| `posclk_col_to` | 2 | identical | `WORKING-TREE`, `lane/wf-pubhist` |
| `posclk_err_already_in` | 2 | identical | `WORKING-TREE`, `lane/wf-pubhist` |
| `posclk_err_clock_off` | 2 | identical | `WORKING-TREE`, `lane/wf-pubhist` |
| `posclk_err_dst` | 2 | identical | `WORKING-TREE`, `lane/wf-pubhist` |
| `posclk_err_mismatch` | 2 | identical | `WORKING-TREE`, `lane/wf-pubhist` |
| `posclk_err_module_off` | 2 | identical | `WORKING-TREE`, `lane/wf-pubhist` |
| `posclk_err_no_engagement` | 2 | identical | `WORKING-TREE`, `lane/wf-pubhist` |
| `posclk_err_not_linked` | 2 | identical | `WORKING-TREE`, `lane/wf-pubhist` |
| `posclk_err_verification` | 2 | identical | `WORKING-TREE`, `lane/wf-pubhist` |
| `posclk_in` | 2 | identical | `WORKING-TREE`, `lane/wf-pubhist` |
| `posclk_list_empty` | 2 | identical | `WORKING-TREE`, `lane/wf-pubhist` |
| `posclk_list_title` | 2 | identical | `WORKING-TREE`, `lane/wf-pubhist` |
| `posclk_note_in` | 2 | identical | `WORKING-TREE`, `lane/wf-pubhist` |
| `posclk_note_no_session` | 2 | identical | `WORKING-TREE`, `lane/wf-pubhist` |
| `posclk_note_nothing_open` | 2 | identical | `WORKING-TREE`, `lane/wf-pubhist` |
| `posclk_note_out` | 2 | identical | `WORKING-TREE`, `lane/wf-pubhist` |
| `posclk_out` | 2 | identical | `WORKING-TREE`, `lane/wf-pubhist` |
| `posclk_present_count` | 2 | identical | `WORKING-TREE`, `lane/wf-pubhist` |
| `posclk_state_exception` | 2 | identical | `WORKING-TREE`, `lane/wf-pubhist` |
| `posclk_state_in` | 2 | identical | `WORKING-TREE`, `lane/wf-pubhist` |
| `posclk_state_out` | 2 | identical | `WORKING-TREE`, `lane/wf-pubhist` |
| `posclk_state_unknown` | 2 | identical | `WORKING-TREE`, `lane/wf-pubhist` |
| `posclk_still_in` | 2 | identical | `WORKING-TREE`, `lane/wf-pubhist` |
| `poweruserGrowth_firstOrderEvent` | 1 | sole | `feature/swiss` |
| `registerComplete_completed` | 1 | sole | `feature/swiss` |
| `registerComplete_downloadApp` | 1 | sole | `feature/swiss` |
| `registerComplete_goToAdmin` | 1 | sole | `feature/swiss` |
| `registerComplete_subText` | 1 | sole | `feature/swiss` |
| `register_alreadyRegisteredText` | 1 | sole | `feature/swiss` |
| `register_alreadyRegisteredTitle` | 1 | sole | `feature/swiss` |
| `register_changeNumber` | 1 | sole | `feature/swiss` |
| `register_changePhoneNumber` | 1 | sole | `feature/swiss` |
| `register_cityPlaceholder` | 1 | sole | `feature/swiss` |
| `register_continue` | 1 | sole | `feature/swiss` |
| `register_continueAnyway` | 1 | sole | `feature/swiss` |
| `register_customerPrompt` | 1 | sole | `feature/swiss` |
| `register_displayNameLabel` | 1 | sole | `feature/swiss` |
| `register_goToAdminPanel` | 1 | sole | `feature/swiss` |
| `register_goToStoreOverview` | 1 | sole | `feature/swiss` |
| `register_invalidCode` | 1 | sole | `feature/swiss` |
| `register_invalidPhoneNumber` | 1 | sole | `feature/swiss` |
| `register_legalNameLabel` | 1 | sole | `feature/swiss` |
| `register_loggedInAs` | 1 | sole | `feature/swiss` |
| `register_logout` | 1 | sole | `feature/swiss` |
| `register_logoutConfirm` | 1 | sole | `feature/swiss` |
| `register_otpLabel` | 1 | sole | `feature/swiss` |
| `register_otpSentTo` | 1 | sole | `feature/swiss` |
| `register_pageSubtitle` | 1 | sole | `feature/swiss` |
| `register_pageTitle` | 1 | sole | `feature/swiss` |
| `register_phoneNumberLabel` | 1 | sole | `feature/swiss` |
| `register_phoneNumberPlaceholder` | 1 | sole | `feature/swiss` |
| `register_pickupLabel` | 1 | sole | `feature/swiss` |
| `register_registeringStore` | 1 | sole | `feature/swiss` |
| `register_registrationError` | 1 | sole | `feature/swiss` |
| `register_sendOtp` | 1 | sole | `feature/swiss` |
| `register_smsSendError` | 1 | sole | `feature/swiss` |
| `register_streetAddressPlaceholder` | 1 | sole | `feature/swiss` |
| `register_submitButton` | 1 | sole | `feature/swiss` |
| `register_termsError` | 1 | sole | `feature/swiss` |
| `register_termsLink` | 1 | sole | `feature/swiss` |
| `register_termsPrefix` | 1 | sole | `feature/swiss` |
| `register_vatError` | 1 | sole | `feature/swiss` |
| `register_vatExistsRegisteredWith` | 1 | sole | `feature/swiss` |
| `register_vatExistsText` | 1 | sole | `feature/swiss` |
| `register_vatExistsTitle` | 1 | sole | `feature/swiss` |
| `register_vatHelp` | 1 | sole | `feature/swiss` |
| `register_vatLabel` | 1 | sole | `feature/swiss` |
| `register_vatValidationError` | 1 | sole | `feature/swiss` |
| `register_zipCodePlaceholder` | 1 | sole | `feature/swiss` |
| `trn_assign_due` | 1 | identical | `lane/training-admin` |
| `trn_assign_empty` | 1 | identical | `lane/training-admin` |
| `trn_assign_new_title` | 1 | identical | `lane/training-admin` |
| `trn_assign_no_published` | 1 | identical | `lane/training-admin` |
| `trn_assign_person_ref` | 1 | identical | `lane/training-admin` |
| `trn_assign_refused` | 1 | identical | `lane/training-admin` |
| `trn_assign_revoke` | 1 | identical | `lane/training-admin` |
| `trn_assign_role_ref` | 1 | identical | `lane/training-admin` |
| `trn_assign_scope` | 1 | identical | `lane/training-admin` |
| `trn_assign_scope_person` | 1 | identical | `lane/training-admin` |
| `trn_assign_scope_role` | 1 | identical | `lane/training-admin` |
| `trn_assign_submit` | 1 | identical | `lane/training-admin` |
| `trn_assign_title` | 1 | identical | `lane/training-admin` |
| `trn_assign_unknown` | 1 | identical | `lane/training-admin` |
| `trn_assign_version` | 1 | identical | `lane/training-admin` |
| `trn_assign_version_pick` | 1 | identical | `lane/training-admin` |
| `trn_cert_document` | 1 | identical | `lane/training-admin` |
| `trn_cert_expiry` | 1 | identical | `lane/training-admin` |
| `trn_cert_expiry_hint` | 1 | identical | `lane/training-admin` |
| `trn_cert_issue` | 1 | identical | `lane/training-admin` |
| `trn_cert_issuer` | 1 | identical | `lane/training-admin` |
| `trn_cert_new_title` | 1 | identical | `lane/training-admin` |
| `trn_cert_no_expiry` | 1 | identical | `lane/training-admin` |
| `trn_cert_person` | 1 | identical | `lane/training-admin` |
| `trn_cert_person_unchecked` | 1 | sole | `lane/training-admin` |
| `trn_cert_submit` | 1 | identical | `lane/training-admin` |
| `trn_cert_type` | 1 | identical | `lane/training-admin` |
| `trn_cert_type_hint` | 1 | identical | `lane/training-admin` |
| `trn_certs_empty` | 1 | identical | `lane/training-admin` |
| `trn_certs_refused` | 1 | identical | `lane/training-admin` |
| `trn_certs_status_asof` | 1 | identical | `lane/training-admin` |
| `trn_certs_status_asof_unknown` | 1 | identical | `lane/training-admin` |
| `trn_certs_title` | 1 | identical | `lane/training-admin` |
| `trn_certs_unknown` | 1 | identical | `lane/training-admin` |
| `trn_col_category` | 1 | identical | `lane/training-admin` |
| `trn_col_competency` | 1 | identical | `lane/training-admin` |
| `trn_col_completed` | 1 | identical | `lane/training-admin` |
| `trn_col_course` | 1 | identical | `lane/training-admin` |
| `trn_col_created` | 1 | identical | `lane/training-admin` |
| `trn_col_due` | 1 | identical | `lane/training-admin` |
| `trn_col_expiry` | 1 | identical | `lane/training-admin` |
| `trn_col_hash` | 1 | identical | `lane/training-admin` |
| `trn_col_issue` | 1 | identical | `lane/training-admin` |
| `trn_col_issuer` | 1 | identical | `lane/training-admin` |
| `trn_col_person` | 1 | identical | `lane/training-admin` |
| `trn_col_published` | 1 | identical | `lane/training-admin` |
| `trn_col_reference` | 1 | identical | `lane/training-admin` |
| `trn_col_result` | 1 | identical | `lane/training-admin` |
| `trn_col_scope` | 1 | identical | `lane/training-admin` |
| `trn_col_score` | 1 | identical | `lane/training-admin` |
| `trn_col_source` | 1 | identical | `lane/training-admin` |
| `trn_col_state` | 1 | identical | `lane/training-admin` |
| `trn_col_status` | 1 | identical | `lane/training-admin` |
| `trn_col_threshold` | 1 | identical | `lane/training-admin` |
| `trn_col_title` | 1 | identical | `lane/training-admin` |
| `trn_col_type` | 1 | identical | `lane/training-admin` |
| `trn_col_version` | 1 | identical | `lane/training-admin` |
| `trn_col_versions` | 1 | identical | `lane/training-admin` |
| `trn_completion_grading_note` | 1 | **DIVERGENT** | `lane/training-admin` |
| `trn_completion_new_title` | 1 | identical | `lane/training-admin` |
| `trn_completion_no_frozen` | 1 | identical | `lane/training-admin` |
| `trn_completion_passed` | 1 | sole | `lane/training-admin` |
| `trn_completion_person` | 1 | identical | `lane/training-admin` |
| `trn_completion_score` | 1 | identical | `lane/training-admin` |
| `trn_completion_submit` | 1 | identical | `lane/training-admin` |
| `trn_completion_version` | 1 | identical | `lane/training-admin` |
| `trn_completions_empty` | 1 | identical | `lane/training-admin` |
| `trn_completions_refused` | 1 | identical | `lane/training-admin` |
| `trn_completions_title` | 1 | identical | `lane/training-admin` |
| `trn_completions_unknown` | 1 | identical | `lane/training-admin` |
| `trn_context_capabilities` | 1 | identical | `lane/training-admin` |
| `trn_context_seam` | 1 | identical | `lane/training-admin` |
| `trn_context_title` | 1 | identical | `lane/training-admin` |
| `trn_context_zone` | 1 | identical | `lane/training-admin` |
| `trn_context_zone_fallback` | 1 | identical | `lane/training-admin` |
| `trn_course_competency_hint` | 1 | identical | `lane/training-admin` |
| `trn_course_has_published` | 1 | identical | `lane/training-admin` |
| `trn_course_inactive` | 1 | identical | `lane/training-admin` |
| `trn_course_new_category` | 1 | identical | `lane/training-admin` |
| `trn_course_new_competency` | 1 | identical | `lane/training-admin` |
| `trn_course_new_submit` | 1 | identical | `lane/training-admin` |
| `trn_course_new_title` | 1 | identical | `lane/training-admin` |
| `trn_course_new_title_label` | 1 | identical | `lane/training-admin` |
| `trn_course_no_competency` | 1 | identical | `lane/training-admin` |
| `trn_courses_empty` | 1 | identical | `lane/training-admin` |
| `trn_courses_refused` | 1 | identical | `lane/training-admin` |
| `trn_courses_title` | 1 | identical | `lane/training-admin` |
| `trn_courses_unknown` | 1 | identical | `lane/training-admin` |
| `trn_err_flag_off` | 1 | identical | `lane/training-admin` |
| `trn_err_forbidden` | 1 | identical | `lane/training-admin` |
| `trn_err_idem_inflight` | 1 | identical | `lane/training-admin` |
| `trn_err_idem_mismatch` | 1 | identical | `lane/training-admin` |
| `trn_err_immutable` | 1 | identical | `lane/training-admin` |
| `trn_err_not_found` | 1 | identical | `lane/training-admin` |
| `trn_err_unknown` | 1 | identical | `lane/training-admin` |
| `trn_err_validation` | 1 | identical | `lane/training-admin` |
| `trn_ev_ask_action` | 1 | sole | `lane/fe-training-meals-surfaces` |
| `trn_ev_ask_busy` | 1 | sole | `lane/fe-training-meals-surfaces` |
| `trn_ev_ask_note` | 1 | sole | `lane/fe-training-meals-surfaces` |
| `trn_ev_ask_person` | 1 | sole | `lane/fe-training-meals-surfaces` |
| `trn_ev_ask_title` | 1 | sole | `lane/fe-training-meals-surfaces` |
| `trn_ev_asof` | 6 | **DIVERGENT** | `WORKING-TREE`, `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/fe-training-meals-surfaces`, `lane/train-evidence-pack-ui`, `lane/wf-pubhist` |
| `trn_ev_asof_fallback` | 1 | sole | `lane/fe-training-meals-surfaces` |
| `trn_ev_asof_unknown` | 1 | sole | `lane/fe-training-meals-surfaces` |
| `trn_ev_asof_utc` | 1 | sole | `lane/fe-training-meals-surfaces` |
| `trn_ev_audit_gap_many` | 1 | sole | `lane/fe-training-meals-surfaces` |
| `trn_ev_audit_gap_none` | 1 | sole | `lane/fe-training-meals-surfaces` |
| `trn_ev_audit_gap_one` | 1 | sole | `lane/fe-training-meals-surfaces` |
| `trn_ev_audit_gap_unknown` | 1 | sole | `lane/fe-training-meals-surfaces` |
| `trn_ev_audit_none` | 1 | sole | `lane/fe-training-meals-surfaces` |
| `trn_ev_audit_title` | 1 | sole | `lane/fe-training-meals-surfaces` |
| `trn_ev_certificates_empty` | 5 | identical | `WORKING-TREE`, `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/train-evidence-pack-ui`, `lane/wf-pubhist` |
| `trn_ev_certificates_none` | 1 | sole | `lane/fe-training-meals-surfaces` |
| `trn_ev_certificates_title` | 6 | identical | `WORKING-TREE`, `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/fe-training-meals-surfaces`, `lane/train-evidence-pack-ui`, `lane/wf-pubhist` |
| `trn_ev_chain_empty` | 5 | identical | `WORKING-TREE`, `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/train-evidence-pack-ui`, `lane/wf-pubhist` |
| `trn_ev_chain_not_access_log` | 5 | identical | `WORKING-TREE`, `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/train-evidence-pack-ui`, `lane/wf-pubhist` |
| `trn_ev_chain_title` | 5 | identical | `WORKING-TREE`, `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/train-evidence-pack-ui`, `lane/wf-pubhist` |
| `trn_ev_col_actor` | 6 | **DIVERGENT** | `WORKING-TREE`, `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/fe-training-meals-surfaces`, `lane/train-evidence-pack-ui`, `lane/wf-pubhist` |
| `trn_ev_col_course` | 1 | sole | `lane/fe-training-meals-surfaces` |
| `trn_ev_col_delta` | 5 | identical | `WORKING-TREE`, `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/train-evidence-pack-ui`, `lane/wf-pubhist` |
| `trn_ev_col_document` | 1 | sole | `lane/fe-training-meals-surfaces` |
| `trn_ev_col_event` | 6 | identical | `WORKING-TREE`, `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/fe-training-meals-surfaces`, `lane/train-evidence-pack-ui`, `lane/wf-pubhist` |
| `trn_ev_col_leg` | 6 | **DIVERGENT** | `WORKING-TREE`, `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/fe-training-meals-surfaces`, `lane/train-evidence-pack-ui`, `lane/wf-pubhist` |
| `trn_ev_col_linkage` | 1 | sole | `lane/fe-training-meals-surfaces` |
| `trn_ev_col_material` | 5 | identical | `WORKING-TREE`, `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/train-evidence-pack-ui`, `lane/wf-pubhist` |
| `trn_ev_col_provenance` | 5 | identical | `WORKING-TREE`, `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/train-evidence-pack-ui`, `lane/wf-pubhist` |
| `trn_ev_col_recorded_at` | 1 | sole | `lane/fe-training-meals-surfaces` |
| `trn_ev_col_recorded_by` | 1 | sole | `lane/fe-training-meals-surfaces` |
| `trn_ev_col_score` | 1 | sole | `lane/fe-training-meals-surfaces` |
| `trn_ev_col_threshold` | 1 | sole | `lane/fe-training-meals-surfaces` |
| `trn_ev_col_verdict` | 1 | sole | `lane/fe-training-meals-surfaces` |
| `trn_ev_col_when` | 1 | sole | `lane/fe-training-meals-surfaces` |
| `trn_ev_completions_empty` | 5 | identical | `WORKING-TREE`, `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/train-evidence-pack-ui`, `lane/wf-pubhist` |
| `trn_ev_completions_none` | 1 | sole | `lane/fe-training-meals-surfaces` |
| `trn_ev_completions_title` | 6 | identical | `WORKING-TREE`, `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/fe-training-meals-surfaces`, `lane/train-evidence-pack-ui`, `lane/wf-pubhist` |
| `trn_ev_coverage_absent` | 5 | identical | `WORKING-TREE`, `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/train-evidence-pack-ui`, `lane/wf-pubhist` |
| `trn_ev_coverage_covered` | 5 | identical | `WORKING-TREE`, `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/train-evidence-pack-ui`, `lane/wf-pubhist` |
| `trn_ev_disclosure_body` | 1 | sole | `lane/fe-training-meals-surfaces` |
| `trn_ev_disclosure_notice` | 5 | identical | `WORKING-TREE`, `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/train-evidence-pack-ui`, `lane/wf-pubhist` |
| `trn_ev_disclosure_title` | 1 | sole | `lane/fe-training-meals-surfaces` |
| `trn_ev_disclosure_unreadable` | 1 | sole | `lane/fe-training-meals-surfaces` |
| `trn_ev_footnote_scope` | 5 | identical | `WORKING-TREE`, `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/train-evidence-pack-ui`, `lane/wf-pubhist` |
| `trn_ev_frozen_hash` | 1 | sole | `lane/fe-training-meals-surfaces` |
| `trn_ev_frozen_note` | 1 | sole | `lane/fe-training-meals-surfaces` |
| `trn_ev_frozen_pages` | 1 | sole | `lane/fe-training-meals-surfaces` |
| `trn_ev_frozen_quiz` | 1 | sole | `lane/fe-training-meals-surfaces` |
| `trn_ev_frozen_summary` | 1 | sole | `lane/fe-training-meals-surfaces` |
| `trn_ev_frozen_threshold` | 1 | sole | `lane/fe-training-meals-surfaces` |
| `trn_ev_idle` | 1 | sole | `lane/fe-training-meals-surfaces` |
| `trn_ev_integrity_clean` | 5 | identical | `WORKING-TREE`, `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/train-evidence-pack-ui`, `lane/wf-pubhist` |
| `trn_ev_integrity_finding` | 5 | identical | `WORKING-TREE`, `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/train-evidence-pack-ui`, `lane/wf-pubhist` |
| `trn_ev_integrity_title` | 1 | sole | `lane/fe-training-meals-surfaces` |
| `trn_ev_integrity_unknown` | 5 | identical | `WORKING-TREE`, `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/train-evidence-pack-ui`, `lane/wf-pubhist` |
| `trn_ev_leg_certificate` | 6 | identical | `WORKING-TREE`, `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/fe-training-meals-surfaces`, `lane/train-evidence-pack-ui`, `lane/wf-pubhist` |
| `trn_ev_leg_completion` | 6 | identical | `WORKING-TREE`, `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/fe-training-meals-surfaces`, `lane/train-evidence-pack-ui`, `lane/wf-pubhist` |
| `trn_ev_linkage_broken` | 5 | identical | `WORKING-TREE`, `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/train-evidence-pack-ui`, `lane/wf-pubhist` |
| `trn_ev_linkage_broken_body` | 1 | sole | `lane/fe-training-meals-surfaces` |
| `trn_ev_linkage_broken_short` | 1 | sole | `lane/fe-training-meals-surfaces` |
| `trn_ev_linkage_broken_title` | 1 | sole | `lane/fe-training-meals-surfaces` |
| `trn_ev_linkage_intact` | 5 | identical | `WORKING-TREE`, `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/train-evidence-pack-ui`, `lane/wf-pubhist` |
| `trn_ev_linkage_intact_body` | 1 | sole | `lane/fe-training-meals-surfaces` |
| `trn_ev_linkage_intact_short` | 1 | sole | `lane/fe-training-meals-surfaces` |
| `trn_ev_linkage_intact_title` | 1 | sole | `lane/fe-training-meals-surfaces` |
| `trn_ev_linkage_unknown` | 5 | identical | `WORKING-TREE`, `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/train-evidence-pack-ui`, `lane/wf-pubhist` |
| `trn_ev_linkage_unknown_body` | 1 | sole | `lane/fe-training-meals-surfaces` |
| `trn_ev_linkage_unknown_short` | 1 | sole | `lane/fe-training-meals-surfaces` |
| `trn_ev_linkage_unknown_title` | 1 | sole | `lane/fe-training-meals-surfaces` |
| `trn_ev_linkage_unresolvable` | 5 | identical | `WORKING-TREE`, `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/train-evidence-pack-ui`, `lane/wf-pubhist` |
| `trn_ev_linkage_unresolvable_body` | 1 | sole | `lane/fe-training-meals-surfaces` |
| `trn_ev_linkage_unresolvable_short` | 1 | sole | `lane/fe-training-meals-surfaces` |
| `trn_ev_linkage_unresolvable_title` | 1 | sole | `lane/fe-training-meals-surfaces` |
| `trn_ev_material_open` | 5 | identical | `WORKING-TREE`, `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/train-evidence-pack-ui`, `lane/wf-pubhist` |
| `trn_ev_material_pages` | 5 | identical | `WORKING-TREE`, `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/train-evidence-pack-ui`, `lane/wf-pubhist` |
| `trn_ev_material_quiz` | 5 | identical | `WORKING-TREE`, `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/train-evidence-pack-ui`, `lane/wf-pubhist` |
| `trn_ev_material_quiz_absent` | 5 | identical | `WORKING-TREE`, `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/train-evidence-pack-ui`, `lane/wf-pubhist` |
| `trn_ev_material_threshold` | 5 | identical | `WORKING-TREE`, `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/train-evidence-pack-ui`, `lane/wf-pubhist` |
| `trn_ev_material_threshold_unknown` | 5 | identical | `WORKING-TREE`, `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/train-evidence-pack-ui`, `lane/wf-pubhist` |
| `trn_ev_no_expiry` | 6 | identical | `WORKING-TREE`, `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/fe-training-meals-surfaces`, `lane/train-evidence-pack-ui`, `lane/wf-pubhist` |
| `trn_ev_no_names` | 5 | identical | `WORKING-TREE`, `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/train-evidence-pack-ui`, `lane/wf-pubhist` |
| `trn_ev_not_verifiable_body` | 1 | sole | `lane/fe-training-meals-surfaces` |
| `trn_ev_not_verifiable_title` | 1 | sole | `lane/fe-training-meals-surfaces` |
| `trn_ev_nothing_to_check` | 1 | sole | `lane/fe-training-meals-surfaces` |
| `trn_ev_open` | 5 | identical | `WORKING-TREE`, `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/train-evidence-pack-ui`, `lane/wf-pubhist` |
| `trn_ev_page_intro` | 6 | **DIVERGENT** | `WORKING-TREE`, `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/fe-training-meals-surfaces`, `lane/train-evidence-pack-ui`, `lane/wf-pubhist` |
| `trn_ev_page_title` | 6 | **DIVERGENT** | `WORKING-TREE`, `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/fe-training-meals-surfaces`, `lane/train-evidence-pack-ui`, `lane/wf-pubhist` |
| `trn_ev_person_absent` | 5 | identical | `WORKING-TREE`, `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/train-evidence-pack-ui`, `lane/wf-pubhist` |
| `trn_ev_person_label` | 5 | identical | `WORKING-TREE`, `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/train-evidence-pack-ui`, `lane/wf-pubhist` |
| `trn_ev_person_unnamed` | 5 | identical | `WORKING-TREE`, `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/train-evidence-pack-ui`, `lane/wf-pubhist` |
| `trn_ev_prompt` | 5 | identical | `WORKING-TREE`, `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/train-evidence-pack-ui`, `lane/wf-pubhist` |
| `trn_ev_recorded_by` | 5 | identical | `WORKING-TREE`, `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/train-evidence-pack-ui`, `lane/wf-pubhist` |
| `trn_ev_recorded_by_absent` | 5 | identical | `WORKING-TREE`, `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/train-evidence-pack-ui`, `lane/wf-pubhist` |
| `trn_ev_recorder_unknown` | 1 | sole | `lane/fe-training-meals-surfaces` |
| `trn_ev_recording_instant_note` | 1 | sole | `lane/fe-training-meals-surfaces` |
| `trn_ev_refused` | 6 | **DIVERGENT** | `WORKING-TREE`, `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/fe-training-meals-surfaces`, `lane/train-evidence-pack-ui`, `lane/wf-pubhist` |
| `trn_ev_state_no_pass` | 5 | identical | `WORKING-TREE`, `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/train-evidence-pack-ui`, `lane/wf-pubhist` |
| `trn_ev_state_none` | 5 | identical | `WORKING-TREE`, `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/train-evidence-pack-ui`, `lane/wf-pubhist` |
| `trn_ev_state_none_body` | 1 | sole | `lane/fe-training-meals-surfaces` |
| `trn_ev_state_none_title` | 1 | sole | `lane/fe-training-meals-surfaces` |
| `trn_ev_state_nopass_body` | 1 | sole | `lane/fe-training-meals-surfaces` |
| `trn_ev_state_nopass_title` | 1 | sole | `lane/fe-training-meals-surfaces` |
| `trn_ev_state_passed` | 5 | identical | `WORKING-TREE`, `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/train-evidence-pack-ui`, `lane/wf-pubhist` |
| `trn_ev_state_passed_body` | 1 | sole | `lane/fe-training-meals-surfaces` |
| `trn_ev_state_passed_title` | 1 | sole | `lane/fe-training-meals-surfaces` |
| `trn_ev_state_unknown` | 5 | identical | `WORKING-TREE`, `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/train-evidence-pack-ui`, `lane/wf-pubhist` |
| `trn_ev_state_unknown_body` | 1 | sole | `lane/fe-training-meals-surfaces` |
| `trn_ev_state_unknown_title` | 1 | sole | `lane/fe-training-meals-surfaces` |
| `trn_ev_subject_not_on_file` | 1 | sole | `lane/fe-training-meals-surfaces` |
| `trn_ev_subject_not_on_file_heading` | 1 | sole | `lane/fe-training-meals-surfaces` |
| `trn_ev_subject_unnamed` | 1 | sole | `lane/fe-training-meals-surfaces` |
| `trn_ev_subject_unnamed_heading` | 1 | sole | `lane/fe-training-meals-surfaces` |
| `trn_ev_threshold` | 5 | identical | `WORKING-TREE`, `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/train-evidence-pack-ui`, `lane/wf-pubhist` |
| `trn_ev_threshold_unknown` | 5 | identical | `WORKING-TREE`, `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/train-evidence-pack-ui`, `lane/wf-pubhist` |
| `trn_ev_unknown` | 6 | **DIVERGENT** | `WORKING-TREE`, `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/fe-training-meals-surfaces`, `lane/train-evidence-pack-ui`, `lane/wf-pubhist` |
| `trn_ev_unrouted` | 1 | sole | `lane/fe-training-meals-surfaces` |
| `trn_ev_verdict_disagrees` | 1 | sole | `lane/fe-training-meals-surfaces` |
| `trn_ev_verdict_not_passed` | 1 | sole | `lane/fe-training-meals-surfaces` |
| `trn_ev_verdict_passed` | 1 | sole | `lane/fe-training-meals-surfaces` |
| `trn_ev_verdict_unknown` | 1 | sole | `lane/fe-training-meals-surfaces` |
| `trn_ev_version` | 1 | sole | `lane/fe-training-meals-surfaces` |
| `trn_ev_version_unknown` | 1 | sole | `lane/fe-training-meals-surfaces` |
| `trn_exp_action` | 1 | sole | `lane/fe-training-meals-surfaces` |
| `trn_exp_empty` | 1 | sole | `lane/fe-training-meals-surfaces` |
| `trn_exp_horizon` | 1 | sole | `lane/fe-training-meals-surfaces` |
| `trn_exp_horizon_unknown` | 1 | sole | `lane/fe-training-meals-surfaces` |
| `trn_exp_horizon_utc` | 1 | sole | `lane/fe-training-meals-surfaces` |
| `trn_exp_idle` | 1 | sole | `lane/fe-training-meals-surfaces` |
| `trn_exp_includes_expired` | 1 | sole | `lane/fe-training-meals-surfaces` |
| `trn_exp_intro` | 1 | sole | `lane/fe-training-meals-surfaces` |
| `trn_exp_no_expiry_note` | 1 | sole | `lane/fe-training-meals-surfaces` |
| `trn_exp_refused` | 1 | sole | `lane/fe-training-meals-surfaces` |
| `trn_exp_title` | 1 | sole | `lane/fe-training-meals-surfaces` |
| `trn_exp_unknown` | 1 | sole | `lane/fe-training-meals-surfaces` |
| `trn_exp_within` | 1 | sole | `lane/fe-training-meals-surfaces` |
| `trn_exp_within_days` | 1 | sole | `lane/fe-training-meals-surfaces` |
| `trn_exp_within_today` | 1 | sole | `lane/fe-training-meals-surfaces` |
| `trn_flag_assignments` | 1 | identical | `lane/training-admin` |
| `trn_flag_checklists` | 1 | identical | `lane/training-admin` |
| `trn_flag_competency_seam` | 1 | identical | `lane/training-admin` |
| `trn_flag_deviations` | 1 | identical | `lane/training-admin` |
| `trn_flag_off` | 1 | identical | `lane/training-admin` |
| `trn_flag_on` | 1 | identical | `lane/training-admin` |
| `trn_flag_onboarding` | 1 | identical | `lane/training-admin` |
| `trn_flag_reminders` | 1 | identical | `lane/training-admin` |
| `trn_flag_setup` | 1 | identical | `lane/training-admin` |
| `trn_flag_unknown` | 1 | identical | `lane/training-admin` |
| `trn_flags_note` | 1 | identical | `lane/training-admin` |
| `trn_flags_title` | 1 | identical | `lane/training-admin` |
| `trn_footnote_scope` | 1 | **DIVERGENT** | `lane/training-admin` |
| `trn_footnote_zone` | 1 | identical | `lane/training-admin` |
| `trn_footnote_zone_fallback` | 1 | identical | `lane/training-admin` |
| `trn_footnote_zone_utc` | 1 | identical | `lane/training-admin` |
| `trn_gate_forbidden` | 1 | identical | `lane/training-admin` |
| `trn_gate_invisible` | 1 | identical | `lane/training-admin` |
| `trn_gate_unauthenticated` | 1 | identical | `lane/training-admin` |
| `trn_gate_unknown` | 1 | identical | `lane/training-admin` |
| `trn_gate_unreachable` | 1 | identical | `lane/training-admin` |
| `trn_holdings_asof` | 1 | identical | `lane/training-admin` |
| `trn_holdings_asof_unknown` | 1 | identical | `lane/training-admin` |
| `trn_holdings_certs_title` | 1 | identical | `lane/training-admin` |
| `trn_holdings_intro` | 1 | identical | `lane/training-admin` |
| `trn_holdings_keys_title` | 1 | identical | `lane/training-admin` |
| `trn_holdings_lookup` | 1 | identical | `lane/training-admin` |
| `trn_holdings_no_certs` | 1 | identical | `lane/training-admin` |
| `trn_holdings_no_keys` | 1 | identical | `lane/training-admin` |
| `trn_holdings_not_a_verdict` | 1 | identical | `lane/training-admin` |
| `trn_holdings_person` | 1 | identical | `lane/training-admin` |
| `trn_holdings_prompt` | 1 | identical | `lane/training-admin` |
| `trn_holdings_refused` | 1 | identical | `lane/training-admin` |
| `trn_holdings_title` | 1 | identical | `lane/training-admin` |
| `trn_holdings_unknown` | 1 | identical | `lane/training-admin` |
| `trn_page_intro` | 1 | identical | `lane/training-admin` |
| `trn_page_title` | 1 | **DIVERGENT** | `lane/training-admin` |
| `trn_reference_by_value` | 1 | **DIVERGENT** | `lane/training-admin` |
| `trn_reload` | 1 | identical | `lane/training-admin` |
| `trn_result_failed` | 1 | identical | `lane/training-admin` |
| `trn_result_passed` | 1 | identical | `lane/training-admin` |
| `trn_result_unknown` | 1 | identical | `lane/training-admin` |
| `trn_seam_bound` | 1 | identical | `lane/training-admin` |
| `trn_seam_unbound` | 1 | identical | `lane/training-admin` |
| `trn_source_manager` | 1 | identical | `lane/training-admin` |
| `trn_source_quiz` | 1 | **DIVERGENT** | `lane/training-admin` |
| `trn_state_draft` | 1 | identical | `lane/training-admin` |
| `trn_state_published` | 1 | identical | `lane/training-admin` |
| `trn_state_retired` | 1 | identical | `lane/training-admin` |
| `trn_status_expired` | 1 | identical | `lane/training-admin` |
| `trn_status_expiring` | 1 | identical | `lane/training-admin` |
| `trn_status_unknown` | 1 | identical | `lane/training-admin` |
| `trn_status_valid` | 1 | identical | `lane/training-admin` |
| `trn_version_content` | 1 | identical | `lane/training-admin` |
| `trn_version_new_submit` | 1 | identical | `lane/training-admin` |
| `trn_version_new_title` | 1 | identical | `lane/training-admin` |
| `trn_version_publish` | 1 | identical | `lane/training-admin` |
| `trn_version_publish_note` | 1 | identical | `lane/training-admin` |
| `trn_version_quiz` | 1 | sole | `lane/training-admin` |
| `trn_version_threshold` | 1 | identical | `lane/training-admin` |
| `trn_versions_empty` | 1 | identical | `lane/training-admin` |
| `trn_versions_pick_course` | 1 | identical | `lane/training-admin` |
| `trn_versions_refused` | 1 | identical | `lane/training-admin` |
| `trn_versions_title` | 1 | identical | `lane/training-admin` |
| `trn_versions_unknown` | 1 | identical | `lane/training-admin` |
| `trn_writes_blocked_assignments` | 1 | identical | `lane/training-admin` |
| `trn_writes_blocked_setup` | 1 | identical | `lane/training-admin` |
| `vatAutocomplete_label` | 1 | sole | `feature/swiss` |
| `vatAutocomplete_placeholder` | 1 | sole | `feature/swiss` |
| `wf_delivery_attempts` | 2 | identical | `WORKING-TREE`, `lane/wf-pubhist` |
| `wf_delivery_clean_body` | 2 | identical | `WORKING-TREE`, `lane/wf-pubhist` |
| `wf_delivery_clean_title` | 2 | identical | `WORKING-TREE`, `lane/wf-pubhist` |
| `wf_delivery_gaveup_at` | 2 | identical | `WORKING-TREE`, `lane/wf-pubhist` |
| `wf_delivery_gaveup_body` | 2 | identical | `WORKING-TREE`, `lane/wf-pubhist` |
| `wf_delivery_gaveup_title` | 2 | identical | `WORKING-TREE`, `lane/wf-pubhist` |
| `wf_delivery_intro` | 2 | identical | `WORKING-TREE`, `lane/wf-pubhist` |
| `wf_delivery_link` | 2 | identical | `WORKING-TREE`, `lane/wf-pubhist` |
| `wf_delivery_loading` | 2 | identical | `WORKING-TREE`, `lane/wf-pubhist` |
| `wf_delivery_next_attempt` | 2 | identical | `WORKING-TREE`, `lane/wf-pubhist` |
| `wf_delivery_no_address` | 2 | identical | `WORKING-TREE`, `lane/wf-pubhist` |
| `wf_delivery_reason_no_email_target` | 2 | identical | `WORKING-TREE`, `lane/wf-pubhist` |
| `wf_delivery_reason_no_push_registration` | 2 | identical | `WORKING-TREE`, `lane/wf-pubhist` |
| `wf_delivery_reason_no_push_target` | 2 | identical | `WORKING-TREE`, `lane/wf-pubhist` |
| `wf_delivery_reason_no_sms_target` | 2 | identical | `WORKING-TREE`, `lane/wf-pubhist` |
| `wf_delivery_reason_push_not_configured` | 2 | identical | `WORKING-TREE`, `lane/wf-pubhist` |
| `wf_delivery_reason_sms_rejected` | 2 | identical | `WORKING-TREE`, `lane/wf-pubhist` |
| `wf_delivery_reason_unrecognised` | 2 | identical | `WORKING-TREE`, `lane/wf-pubhist` |
| `wf_delivery_refresh` | 2 | identical | `WORKING-TREE`, `lane/wf-pubhist` |
| `wf_delivery_retrying_body` | 2 | identical | `WORKING-TREE`, `lane/wf-pubhist` |
| `wf_delivery_retrying_title` | 2 | identical | `WORKING-TREE`, `lane/wf-pubhist` |
| `wf_delivery_title` | 2 | identical | `WORKING-TREE`, `lane/wf-pubhist` |
| `wf_delivery_unknown_body` | 2 | identical | `WORKING-TREE`, `lane/wf-pubhist` |
| `wf_delivery_unknown_title` | 2 | identical | `WORKING-TREE`, `lane/wf-pubhist` |
| `wf_delivery_unnamed` | 2 | identical | `WORKING-TREE`, `lane/wf-pubhist` |
| `wf_delivery_unrecognised_body` | 2 | identical | `WORKING-TREE`, `lane/wf-pubhist` |
| `wf_delivery_unrecognised_title` | 2 | identical | `WORKING-TREE`, `lane/wf-pubhist` |
| `wf_delivery_waiting_body` | 2 | identical | `WORKING-TREE`, `lane/wf-pubhist` |
| `wf_delivery_waiting_title` | 2 | identical | `WORKING-TREE`, `lane/wf-pubhist` |
| `wf_pub_addressed` | 2 | identical | `WORKING-TREE`, `lane/wf-pubhist` |
| `wf_pub_addressed_unknown` | 2 | identical | `WORKING-TREE`, `lane/wf-pubhist` |
| `wf_pub_by` | 2 | identical | `WORKING-TREE`, `lane/wf-pubhist` |
| `wf_pub_by_nobody` | 2 | identical | `WORKING-TREE`, `lane/wf-pubhist` |
| `wf_pub_current` | 2 | identical | `WORKING-TREE`, `lane/wf-pubhist` |
| `wf_pub_empty_body` | 2 | identical | `WORKING-TREE`, `lane/wf-pubhist` |
| `wf_pub_empty_title` | 2 | identical | `WORKING-TREE`, `lane/wf-pubhist` |
| `wf_pub_list_intro` | 2 | identical | `WORKING-TREE`, `lane/wf-pubhist` |
| `wf_pub_list_title` | 2 | identical | `WORKING-TREE`, `lane/wf-pubhist` |
| `wf_pub_loading` | 2 | identical | `WORKING-TREE`, `lane/wf-pubhist` |
| `wf_pub_number` | 2 | identical | `WORKING-TREE`, `lane/wf-pubhist` |
| `wf_pub_published` | 2 | identical | `WORKING-TREE`, `lane/wf-pubhist` |
| `wf_pub_published_unknown` | 2 | identical | `WORKING-TREE`, `lane/wf-pubhist` |
| `wf_pub_range_unknown` | 2 | identical | `WORKING-TREE`, `lane/wf-pubhist` |
| `wf_pub_rec_byhand_body` | 2 | identical | `WORKING-TREE`, `lane/wf-pubhist` |
| `wf_pub_rec_byhand_title` | 2 | identical | `WORKING-TREE`, `lane/wf-pubhist` |
| `wf_pub_rec_confirmed_body` | 2 | identical | `WORKING-TREE`, `lane/wf-pubhist` |
| `wf_pub_rec_confirmed_title` | 2 | identical | `WORKING-TREE`, `lane/wf-pubhist` |
| `wf_pub_rec_empty_body` | 2 | identical | `WORKING-TREE`, `lane/wf-pubhist` |
| `wf_pub_rec_empty_title` | 2 | identical | `WORKING-TREE`, `lane/wf-pubhist` |
| `wf_pub_rec_for` | 2 | identical | `WORKING-TREE`, `lane/wf-pubhist` |
| `wf_pub_rec_idle_body` | 2 | identical | `WORKING-TREE`, `lane/wf-pubhist` |
| `wf_pub_rec_idle_title` | 2 | identical | `WORKING-TREE`, `lane/wf-pubhist` |
| `wf_pub_rec_none_body` | 2 | identical | `WORKING-TREE`, `lane/wf-pubhist` |
| `wf_pub_rec_none_title` | 2 | identical | `WORKING-TREE`, `lane/wf-pubhist` |
| `wf_pub_rec_opened_body` | 2 | identical | `WORKING-TREE`, `lane/wf-pubhist` |
| `wf_pub_rec_opened_title` | 2 | identical | `WORKING-TREE`, `lane/wf-pubhist` |
| `wf_pub_rec_send` | 2 | identical | `WORKING-TREE`, `lane/wf-pubhist` |
| `wf_pub_rec_send_delivered` | 2 | identical | `WORKING-TREE`, `lane/wf-pubhist` |
| `wf_pub_rec_send_failed` | 2 | identical | `WORKING-TREE`, `lane/wf-pubhist` |
| `wf_pub_rec_send_manual` | 2 | identical | `WORKING-TREE`, `lane/wf-pubhist` |
| `wf_pub_rec_send_pending` | 2 | identical | `WORKING-TREE`, `lane/wf-pubhist` |
| `wf_pub_rec_send_unrecognised` | 2 | identical | `WORKING-TREE`, `lane/wf-pubhist` |
| `wf_pub_rec_short_a` | 2 | identical | `WORKING-TREE`, `lane/wf-pubhist` |
| `wf_pub_rec_short_b` | 2 | identical | `WORKING-TREE`, `lane/wf-pubhist` |
| `wf_pub_rec_short_c` | 2 | identical | `WORKING-TREE`, `lane/wf-pubhist` |
| `wf_pub_rec_superseded` | 2 | identical | `WORKING-TREE`, `lane/wf-pubhist` |
| `wf_pub_rec_title` | 2 | identical | `WORKING-TREE`, `lane/wf-pubhist` |
| `wf_pub_rec_unclaimed` | 2 | identical | `WORKING-TREE`, `lane/wf-pubhist` |
| `wf_pub_rec_unknown_body` | 2 | identical | `WORKING-TREE`, `lane/wf-pubhist` |
| `wf_pub_rec_unknown_title` | 2 | identical | `WORKING-TREE`, `lane/wf-pubhist` |
| `wf_pub_rec_unnamed` | 2 | identical | `WORKING-TREE`, `lane/wf-pubhist` |
| `wf_pub_refresh` | 2 | identical | `WORKING-TREE`, `lane/wf-pubhist` |
| `wf_pub_superseded` | 2 | identical | `WORKING-TREE`, `lane/wf-pubhist` |
| `wf_pub_unknown_body` | 2 | identical | `WORKING-TREE`, `lane/wf-pubhist` |
| `wf_pub_unknown_title` | 2 | identical | `WORKING-TREE`, `lane/wf-pubhist` |
| `wf_pub_unknown_value` | 2 | identical | `WORKING-TREE`, `lane/wf-pubhist` |
| `wfclock_break_end` | 4 | identical | `lane/fe-pos-clock`, `lane/fe-wf-blind-bind-name`, `lane/fe-wf-link-deadend`, `lane/fe-wf-oplink` |
| `wfclock_break_paid` | 4 | identical | `lane/fe-pos-clock`, `lane/fe-wf-blind-bind-name`, `lane/fe-wf-link-deadend`, `lane/fe-wf-oplink` |
| `wfclock_break_start` | 4 | identical | `lane/fe-pos-clock`, `lane/fe-wf-blind-bind-name`, `lane/fe-wf-link-deadend`, `lane/fe-wf-oplink` |
| `wfclock_dismiss` | 4 | identical | `lane/fe-pos-clock`, `lane/fe-wf-blind-bind-name`, `lane/fe-wf-link-deadend`, `lane/fe-wf-oplink` |
| `wfclock_err_clock_disabled` | 4 | identical | `lane/fe-pos-clock`, `lane/fe-wf-blind-bind-name`, `lane/fe-wf-link-deadend`, `lane/fe-wf-oplink` |
| `wfclock_err_dst` | 4 | identical | `lane/fe-pos-clock`, `lane/fe-wf-blind-bind-name`, `lane/fe-wf-link-deadend`, `lane/fe-wf-oplink` |
| `wfclock_err_forbidden` | 4 | identical | `lane/fe-pos-clock`, `lane/fe-wf-blind-bind-name`, `lane/fe-wf-link-deadend`, `lane/fe-wf-oplink` |
| `wfclock_err_module` | 4 | identical | `lane/fe-pos-clock`, `lane/fe-wf-blind-bind-name`, `lane/fe-wf-link-deadend`, `lane/fe-wf-oplink` |
| `wfclock_err_not_linked` | 4 | identical | `lane/fe-pos-clock`, `lane/fe-wf-blind-bind-name`, `lane/fe-wf-link-deadend`, `lane/fe-wf-oplink` |
| `wfclock_err_offline` | 4 | identical | `lane/fe-pos-clock`, `lane/fe-wf-blind-bind-name`, `lane/fe-wf-link-deadend`, `lane/fe-wf-oplink` |
| `wfclock_err_open_shift` | 4 | identical | `lane/fe-pos-clock`, `lane/fe-wf-blind-bind-name`, `lane/fe-wf-link-deadend`, `lane/fe-wf-oplink` |
| `wfclock_err_open_shift_out` | 4 | identical | `lane/fe-pos-clock`, `lane/fe-wf-blind-bind-name`, `lane/fe-wf-link-deadend`, `lane/fe-wf-oplink` |
| `wfclock_err_payload` | 4 | identical | `lane/fe-pos-clock`, `lane/fe-wf-blind-bind-name`, `lane/fe-wf-link-deadend`, `lane/fe-wf-oplink` |
| `wfclock_err_session` | 4 | identical | `lane/fe-pos-clock`, `lane/fe-wf-blind-bind-name`, `lane/fe-wf-link-deadend`, `lane/fe-wf-oplink` |
| `wfclock_err_unknown` | 4 | identical | `lane/fe-pos-clock`, `lane/fe-wf-blind-bind-name`, `lane/fe-wf-link-deadend`, `lane/fe-wf-oplink` |
| `wfclock_err_verification` | 4 | identical | `lane/fe-pos-clock`, `lane/fe-wf-blind-bind-name`, `lane/fe-wf-link-deadend`, `lane/fe-wf-oplink` |
| `wfclock_ev_break_end` | 4 | identical | `lane/fe-pos-clock`, `lane/fe-wf-blind-bind-name`, `lane/fe-wf-link-deadend`, `lane/fe-wf-oplink` |
| `wfclock_ev_break_start` | 4 | identical | `lane/fe-pos-clock`, `lane/fe-wf-blind-bind-name`, `lane/fe-wf-link-deadend`, `lane/fe-wf-oplink` |
| `wfclock_ev_in` | 4 | identical | `lane/fe-pos-clock`, `lane/fe-wf-blind-bind-name`, `lane/fe-wf-link-deadend`, `lane/fe-wf-oplink` |
| `wfclock_ev_out` | 4 | identical | `lane/fe-pos-clock`, `lane/fe-wf-blind-bind-name`, `lane/fe-wf-link-deadend`, `lane/fe-wf-oplink` |
| `wfclock_ev_unknown` | 4 | identical | `lane/fe-pos-clock`, `lane/fe-wf-blind-bind-name`, `lane/fe-wf-link-deadend`, `lane/fe-wf-oplink` |
| `wfclock_identity_note` | 4 | identical | `lane/fe-pos-clock`, `lane/fe-wf-blind-bind-name`, `lane/fe-wf-link-deadend`, `lane/fe-wf-oplink` |
| `wfclock_in` | 4 | identical | `lane/fe-pos-clock`, `lane/fe-wf-blind-bind-name`, `lane/fe-wf-link-deadend`, `lane/fe-wf-oplink` |
| `wfclock_last_on_device` | 4 | identical | `lane/fe-pos-clock`, `lane/fe-wf-blind-bind-name`, `lane/fe-wf-link-deadend`, `lane/fe-wf-oplink` |
| `wfclock_last_on_device_no_session` | 4 | identical | `lane/fe-pos-clock`, `lane/fe-wf-blind-bind-name`, `lane/fe-wf-link-deadend`, `lane/fe-wf-oplink` |
| `wfclock_no_correction` | 4 | identical | `lane/fe-pos-clock`, `lane/fe-wf-blind-bind-name`, `lane/fe-wf-link-deadend`, `lane/fe-wf-oplink` |
| `wfclock_no_session_other` | 4 | identical | `lane/fe-pos-clock`, `lane/fe-wf-blind-bind-name`, `lane/fe-wf-link-deadend`, `lane/fe-wf-oplink` |
| `wfclock_no_session_out` | 4 | identical | `lane/fe-pos-clock`, `lane/fe-wf-blind-bind-name`, `lane/fe-wf-link-deadend`, `lane/fe-wf-oplink` |
| `wfclock_not_me` | 4 | identical | `lane/fe-pos-clock`, `lane/fe-wf-blind-bind-name`, `lane/fe-wf-link-deadend`, `lane/fe-wf-oplink` |
| `wfclock_open_list` | 4 | identical | `lane/fe-pos-clock`, `lane/fe-wf-blind-bind-name`, `lane/fe-wf-link-deadend`, `lane/fe-wf-oplink` |
| `wfclock_out` | 4 | identical | `lane/fe-pos-clock`, `lane/fe-wf-blind-bind-name`, `lane/fe-wf-link-deadend`, `lane/fe-wf-oplink` |
| `wfclock_present_now` | 4 | identical | `lane/fe-pos-clock`, `lane/fe-wf-blind-bind-name`, `lane/fe-wf-link-deadend`, `lane/fe-wf-oplink` |
| `wfclock_present_unknown` | 4 | identical | `lane/fe-pos-clock`, `lane/fe-wf-blind-bind-name`, `lane/fe-wf-link-deadend`, `lane/fe-wf-oplink` |
| `wfclock_received` | 4 | identical | `lane/fe-pos-clock`, `lane/fe-wf-blind-bind-name`, `lane/fe-wf-link-deadend`, `lane/fe-wf-oplink` |
| `wfclock_recorded` | 4 | identical | `lane/fe-pos-clock`, `lane/fe-wf-blind-bind-name`, `lane/fe-wf-link-deadend`, `lane/fe-wf-oplink` |
| `wfclock_recorded_no_session` | 4 | identical | `lane/fe-pos-clock`, `lane/fe-wf-blind-bind-name`, `lane/fe-wf-link-deadend`, `lane/fe-wf-oplink` |
| `wfclock_refused` | 4 | identical | `lane/fe-pos-clock`, `lane/fe-wf-blind-bind-name`, `lane/fe-wf-link-deadend`, `lane/fe-wf-oplink` |
| `wfclock_result_closed` | 4 | identical | `lane/fe-pos-clock`, `lane/fe-wf-blind-bind-name`, `lane/fe-wf-link-deadend`, `lane/fe-wf-oplink` |
| `wfclock_result_open_still` | 4 | identical | `lane/fe-pos-clock`, `lane/fe-wf-blind-bind-name`, `lane/fe-wf-link-deadend`, `lane/fe-wf-oplink` |
| `wfclock_result_opened` | 4 | identical | `lane/fe-pos-clock`, `lane/fe-wf-blind-bind-name`, `lane/fe-wf-link-deadend`, `lane/fe-wf-oplink` |
| `wfclock_retry` | 4 | identical | `lane/fe-pos-clock`, `lane/fe-wf-blind-bind-name`, `lane/fe-wf-link-deadend`, `lane/fe-wf-oplink` |
| `wfclock_state_unknown` | 4 | identical | `lane/fe-pos-clock`, `lane/fe-wf-blind-bind-name`, `lane/fe-wf-link-deadend`, `lane/fe-wf-oplink` |
| `wfclock_verified_by` | 4 | identical | `lane/fe-pos-clock`, `lane/fe-wf-blind-bind-name`, `lane/fe-wf-link-deadend`, `lane/fe-wf-oplink` |
| `wfclock_who_label` | 4 | identical | `lane/fe-pos-clock`, `lane/fe-wf-blind-bind-name`, `lane/fe-wf-link-deadend`, `lane/fe-wf-oplink` |
| `wfclock_working` | 4 | identical | `lane/fe-pos-clock`, `lane/fe-wf-blind-bind-name`, `lane/fe-wf-link-deadend`, `lane/fe-wf-oplink` |
| `wfclock_zone_device` | 4 | identical | `lane/fe-pos-clock`, `lane/fe-wf-blind-bind-name`, `lane/fe-wf-link-deadend`, `lane/fe-wf-oplink` |
| `wfclock_zone_device_short` | 4 | identical | `lane/fe-pos-clock`, `lane/fe-wf-blind-bind-name`, `lane/fe-wf-link-deadend`, `lane/fe-wf-oplink` |
| `wfd_back_to_schedule` | 2 | identical | `WORKING-TREE`, `lane/wf-pubhist` |
| `wfd_context_failed` | 2 | identical | `WORKING-TREE`, `lane/wf-pubhist` |
| `wfd_no_capability` | 2 | identical | `WORKING-TREE`, `lane/wf-pubhist` |
| `wfd_page_intro` | 2 | identical | `WORKING-TREE`, `lane/wf-pubhist` |
| `wfd_page_title` | 2 | identical | `WORKING-TREE`, `lane/wf-pubhist` |
| `wfjoin_button` | 2 | identical | `lane/fe-wf-onboard`, `lane/fe-wf-self` |
| `wfjoin_button_busy` | 2 | identical | `lane/fe-wf-onboard`, `lane/fe-wf-self` |
| `wfjoin_confirm_body` | 2 | identical | `lane/fe-wf-onboard`, `lane/fe-wf-self` |
| `wfjoin_confirm_title` | 2 | identical | `lane/fe-wf-onboard`, `lane/fe-wf-self` |
| `wfjoin_done_body` | 2 | identical | `lane/fe-wf-onboard`, `lane/fe-wf-self` |
| `wfjoin_done_go` | 2 | identical | `lane/fe-wf-onboard`, `lane/fe-wf-self` |
| `wfjoin_done_no_selfservice` | 2 | identical | `lane/fe-wf-onboard`, `lane/fe-wf-self` |
| `wfjoin_done_title` | 2 | identical | `lane/fe-wf-onboard`, `lane/fe-wf-self` |
| `wfjoin_existing_body` | 2 | identical | `lane/fe-wf-onboard`, `lane/fe-wf-self` |
| `wfjoin_existing_title` | 2 | identical | `lane/fe-wf-onboard`, `lane/fe-wf-self` |
| `wfjoin_eyebrow` | 2 | identical | `lane/fe-wf-onboard`, `lane/fe-wf-self` |
| `wfjoin_field_grants` | 2 | identical | `lane/fe-wf-onboard`, `lane/fe-wf-self` |
| `wfjoin_field_store` | 2 | identical | `lane/fe-wf-onboard`, `lane/fe-wf-self` |
| `wfjoin_footer_help` | 2 | identical | `lane/fe-wf-onboard`, `lane/fe-wf-self` |
| `wfjoin_footer_mark` | 2 | identical | `lane/fe-wf-onboard`, `lane/fe-wf-self` |
| `wfjoin_grants_none` | 2 | identical | `lane/fe-wf-onboard`, `lane/fe-wf-self` |
| `wfjoin_lang_de` | 2 | identical | `lane/fe-wf-onboard`, `lane/fe-wf-self` |
| `wfjoin_lang_en` | 2 | identical | `lane/fe-wf-onboard`, `lane/fe-wf-self` |
| `wfjoin_lang_label` | 2 | identical | `lane/fe-wf-onboard`, `lane/fe-wf-self` |
| `wfjoin_lang_no` | 2 | identical | `lane/fe-wf-onboard`, `lane/fe-wf-self` |
| `wfjoin_login_subtitle` | 2 | identical | `lane/fe-wf-onboard`, `lane/fe-wf-self` |
| `wfjoin_meta_title` | 2 | identical | `lane/fe-wf-onboard`, `lane/fe-wf-self` |
| `wfjoin_other_code` | 2 | identical | `lane/fe-wf-onboard`, `lane/fe-wf-self` |
| `wfjoin_paste_button` | 2 | identical | `lane/fe-wf-onboard`, `lane/fe-wf-self` |
| `wfjoin_paste_empty` | 2 | identical | `lane/fe-wf-onboard`, `lane/fe-wf-self` |
| `wfjoin_paste_help` | 2 | identical | `lane/fe-wf-onboard`, `lane/fe-wf-self` |
| `wfjoin_paste_intro` | 2 | identical | `lane/fe-wf-onboard`, `lane/fe-wf-self` |
| `wfjoin_paste_label` | 2 | identical | `lane/fe-wf-onboard`, `lane/fe-wf-self` |
| `wfjoin_paste_placeholder` | 2 | identical | `lane/fe-wf-onboard`, `lane/fe-wf-self` |
| `wfjoin_paste_title` | 2 | identical | `lane/fe-wf-onboard`, `lane/fe-wf-self` |
| `wfjoin_platform_words` | 2 | identical | `lane/fe-wf-onboard`, `lane/fe-wf-self` |
| `wfjoin_private_note` | 2 | identical | `lane/fe-wf-onboard`, `lane/fe-wf-self` |
| `wfjoin_refuse_attach_body` | 2 | identical | `lane/fe-wf-onboard`, `lane/fe-wf-self` |
| `wfjoin_refuse_attach_title` | 2 | identical | `lane/fe-wf-onboard`, `lane/fe-wf-self` |
| `wfjoin_refuse_conflict_body` | 2 | identical | `lane/fe-wf-onboard`, `lane/fe-wf-self` |
| `wfjoin_refuse_conflict_title` | 2 | identical | `lane/fe-wf-onboard`, `lane/fe-wf-self` |
| `wfjoin_refuse_inflight_body` | 2 | identical | `lane/fe-wf-onboard`, `lane/fe-wf-self` |
| `wfjoin_refuse_inflight_title` | 2 | identical | `lane/fe-wf-onboard`, `lane/fe-wf-self` |
| `wfjoin_refuse_invalid_body` | 2 | identical | `lane/fe-wf-onboard`, `lane/fe-wf-self` |
| `wfjoin_refuse_invalid_title` | 2 | identical | `lane/fe-wf-onboard`, `lane/fe-wf-self` |
| `wfjoin_refuse_nomodule_body` | 2 | identical | `lane/fe-wf-onboard`, `lane/fe-wf-self` |
| `wfjoin_refuse_nomodule_title` | 2 | identical | `lane/fe-wf-onboard`, `lane/fe-wf-self` |
| `wfjoin_refuse_offline_body` | 2 | identical | `lane/fe-wf-onboard`, `lane/fe-wf-self` |
| `wfjoin_refuse_offline_title` | 2 | identical | `lane/fe-wf-onboard`, `lane/fe-wf-self` |
| `wfjoin_refuse_signedout_body` | 2 | identical | `lane/fe-wf-onboard`, `lane/fe-wf-self` |
| `wfjoin_refuse_signedout_title` | 2 | identical | `lane/fe-wf-onboard`, `lane/fe-wf-self` |
| `wfjoin_retry` | 2 | identical | `lane/fe-wf-onboard`, `lane/fe-wf-self` |
| `wfjoin_signin_body` | 2 | identical | `lane/fe-wf-onboard`, `lane/fe-wf-self` |
| `wfjoin_signin_button` | 2 | identical | `lane/fe-wf-onboard`, `lane/fe-wf-self` |
| `wfjoin_signin_kept` | 2 | identical | `lane/fe-wf-onboard`, `lane/fe-wf-self` |
| `wfjoin_signin_title` | 2 | identical | `lane/fe-wf-onboard`, `lane/fe-wf-self` |
| `wfjoin_unknowns_body` | 2 | identical | `lane/fe-wf-onboard`, `lane/fe-wf-self` |
| `wfjoin_unknowns_title` | 2 | identical | `lane/fe-wf-onboard`, `lane/fe-wf-self` |
| `wfjoin_working` | 2 | identical | `lane/fe-wf-onboard`, `lane/fe-wf-self` |
| `wfme_inapp_only` | 1 | sole | `lane/fe-wf-self` |
| `wfme_pub_acknowledge_again` | 1 | sole | `lane/fe-wf-self` |
| `wfme_pub_inapp_only` | 1 | sole | `lane/fe-wf-self` |
| `wfme_pub_read_at` | 1 | sole | `lane/fe-wf-self` |
| `wfme_pub_recall` | 1 | sole | `lane/fe-wf-self` |
| `wfme_tab_time` | 1 | sole | `lane/fe-wf-self` |
| `wfme_time_breaks` | 1 | sole | `lane/fe-wf-self` |
| `wfme_time_correction_approved` | 1 | sole | `lane/fe-wf-self` |
| `wfme_time_correction_change` | 1 | sole | `lane/fe-wf-self` |
| `wfme_time_correction_pending` | 1 | sole | `lane/fe-wf-self` |
| `wfme_time_correction_rejected` | 1 | sole | `lane/fe-wf-self` |
| `wfme_time_correction_unknown` | 1 | sole | `lane/fe-wf-self` |
| `wfme_time_none` | 1 | sole | `lane/fe-wf-self` |
| `wfme_time_open` | 1 | sole | `lane/fe-wf-self` |
| `wfme_time_punch_only` | 1 | sole | `lane/fe-wf-self` |
| `wfme_time_total_corrected` | 1 | sole | `lane/fe-wf-self` |
| `wfme_time_total_label` | 1 | sole | `lane/fe-wf-self` |
| `wfme_time_total_open` | 1 | sole | `lane/fe-wf-self` |
| `wfme_time_total_open_and_corrected` | 1 | sole | `lane/fe-wf-self` |
| `wfme_time_total_punch` | 1 | sole | `lane/fe-wf-self` |
| `wfme_time_unknown` | 1 | sole | `lane/fe-wf-self` |
| `wfme_time_visible_only` | 1 | sole | `lane/fe-wf-self` |
| `wfme_time_window` | 1 | sole | `lane/fe-wf-self` |
| `wfoi_can_clock` | 3 | identical | `lane/fe-wf-blind-bind-name`, `lane/fe-wf-link-deadend`, `lane/fe-wf-oplink` |
| `wfoi_cannot_clock` | 3 | identical | `lane/fe-wf-blind-bind-name`, `lane/fe-wf-link-deadend`, `lane/fe-wf-oplink` |
| `wfoi_clock_unknown` | 3 | identical | `lane/fe-wf-blind-bind-name`, `lane/fe-wf-link-deadend`, `lane/fe-wf-oplink` |
| `wfoi_close` | 3 | identical | `lane/fe-wf-blind-bind-name`, `lane/fe-wf-link-deadend`, `lane/fe-wf-oplink` |
| `wfoi_correct` | 2 | identical | `lane/fe-wf-blind-bind-name`, `lane/fe-wf-link-deadend` |
| `wfoi_correct_confirm` | 2 | identical | `lane/fe-wf-blind-bind-name`, `lane/fe-wf-link-deadend` |
| `wfoi_correct_confirm_ended` | 1 | sole | `lane/fe-wf-link-deadend` |
| `wfoi_correct_done` | 2 | identical | `lane/fe-wf-blind-bind-name`, `lane/fe-wf-link-deadend` |
| `wfoi_correct_yes` | 2 | identical | `lane/fe-wf-blind-bind-name`, `lane/fe-wf-link-deadend` |
| `wfoi_done` | 3 | identical | `lane/fe-wf-blind-bind-name`, `lane/fe-wf-link-deadend`, `lane/fe-wf-oplink` |
| `wfoi_done_one` | 3 | identical | `lane/fe-wf-blind-bind-name`, `lane/fe-wf-link-deadend`, `lane/fe-wf-oplink` |
| `wfoi_employer` | 3 | identical | `lane/fe-wf-blind-bind-name`, `lane/fe-wf-link-deadend`, `lane/fe-wf-oplink` |
| `wfoi_hide` | 3 | identical | `lane/fe-wf-blind-bind-name`, `lane/fe-wf-link-deadend`, `lane/fe-wf-oplink` |
| `wfoi_intro` | 3 | identical | `lane/fe-wf-blind-bind-name`, `lane/fe-wf-link-deadend`, `lane/fe-wf-oplink` |
| `wfoi_linked_to_ended` | 3 | **DIVERGENT** | `lane/fe-wf-blind-bind-name`, `lane/fe-wf-link-deadend`, `lane/fe-wf-oplink` |
| `wfoi_links_unknown` | 3 | identical | `lane/fe-wf-blind-bind-name`, `lane/fe-wf-link-deadend`, `lane/fe-wf-oplink` |
| `wfoi_no_employer` | 3 | identical | `lane/fe-wf-blind-bind-name`, `lane/fe-wf-link-deadend`, `lane/fe-wf-oplink` |
| `wfoi_no_engagement` | 3 | identical | `lane/fe-wf-blind-bind-name`, `lane/fe-wf-link-deadend`, `lane/fe-wf-oplink` |
| `wfoi_open` | 3 | identical | `lane/fe-wf-blind-bind-name`, `lane/fe-wf-link-deadend`, `lane/fe-wf-oplink` |
| `wfoi_operator_inactive` | 3 | identical | `lane/fe-wf-blind-bind-name`, `lane/fe-wf-link-deadend`, `lane/fe-wf-oplink` |
| `wfoi_operator_locked` | 3 | identical | `lane/fe-wf-blind-bind-name`, `lane/fe-wf-link-deadend`, `lane/fe-wf-oplink` |
| `wfoi_operator_no_pin` | 3 | identical | `lane/fe-wf-blind-bind-name`, `lane/fe-wf-link-deadend`, `lane/fe-wf-oplink` |
| `wfoi_operator_unnamed` | 3 | identical | `lane/fe-wf-blind-bind-name`, `lane/fe-wf-link-deadend`, `lane/fe-wf-oplink` |
| `wfoi_operators_empty` | 3 | identical | `lane/fe-wf-blind-bind-name`, `lane/fe-wf-link-deadend`, `lane/fe-wf-oplink` |
| `wfoi_operators_unknown` | 3 | identical | `lane/fe-wf-blind-bind-name`, `lane/fe-wf-link-deadend`, `lane/fe-wf-oplink` |
| `wfoi_outcome_alreadyimported` | 3 | identical | `lane/fe-wf-blind-bind-name`, `lane/fe-wf-link-deadend`, `lane/fe-wf-oplink` |
| `wfoi_outcome_conflict` | 3 | identical | `lane/fe-wf-blind-bind-name`, `lane/fe-wf-link-deadend`, `lane/fe-wf-oplink` |
| `wfoi_outcome_hiddenconflict` | 3 | identical | `lane/fe-wf-blind-bind-name`, `lane/fe-wf-link-deadend`, `lane/fe-wf-oplink` |
| `wfoi_outcome_imported` | 3 | identical | `lane/fe-wf-blind-bind-name`, `lane/fe-wf-link-deadend`, `lane/fe-wf-oplink` |
| `wfoi_outcome_operatornotfound` | 3 | identical | `lane/fe-wf-blind-bind-name`, `lane/fe-wf-link-deadend`, `lane/fe-wf-oplink` |
| `wfoi_outcome_storeadminskipped` | 3 | identical | `lane/fe-wf-blind-bind-name`, `lane/fe-wf-link-deadend`, `lane/fe-wf-oplink` |
| `wfoi_outcome_unknown` | 3 | identical | `lane/fe-wf-blind-bind-name`, `lane/fe-wf-link-deadend`, `lane/fe-wf-oplink` |
| `wfoi_person_unknown` | 3 | **DIVERGENT** | `lane/fe-wf-blind-bind-name`, `lane/fe-wf-link-deadend`, `lane/fe-wf-oplink` |
| `wfoi_result_head` | 3 | identical | `lane/fe-wf-blind-bind-name`, `lane/fe-wf-link-deadend`, `lane/fe-wf-oplink` |
| `wfoi_result_unlinked` | 3 | identical | `lane/fe-wf-blind-bind-name`, `lane/fe-wf-link-deadend`, `lane/fe-wf-oplink` |
| `wfoi_result_unlinked_one` | 3 | identical | `lane/fe-wf-blind-bind-name`, `lane/fe-wf-link-deadend`, `lane/fe-wf-oplink` |
| `wfoi_review_inactive` | 3 | identical | `lane/fe-wf-blind-bind-name`, `lane/fe-wf-link-deadend`, `lane/fe-wf-oplink` |
| `wfoi_review_no_pin` | 3 | identical | `lane/fe-wf-blind-bind-name`, `lane/fe-wf-link-deadend`, `lane/fe-wf-oplink` |
| `wfoi_review_permanence` | 3 | **DIVERGENT** | `lane/fe-wf-blind-bind-name`, `lane/fe-wf-link-deadend`, `lane/fe-wf-oplink` |
| `wfoi_review_title` | 3 | identical | `lane/fe-wf-blind-bind-name`, `lane/fe-wf-link-deadend`, `lane/fe-wf-oplink` |
| `wfoi_review_title_one` | 3 | identical | `lane/fe-wf-blind-bind-name`, `lane/fe-wf-link-deadend`, `lane/fe-wf-oplink` |
| `wfoi_show_engagement` | 3 | identical | `lane/fe-wf-blind-bind-name`, `lane/fe-wf-link-deadend`, `lane/fe-wf-oplink` |
| `wfoi_side_existing_login` | 3 | **DIVERGENT** | `lane/fe-wf-blind-bind-name`, `lane/fe-wf-link-deadend`, `lane/fe-wf-oplink` |
| `wfoi_side_existing_person` | 2 | identical | `lane/fe-wf-blind-bind-name`, `lane/fe-wf-link-deadend` |
| `wfoi_side_new_person` | 3 | identical | `lane/fe-wf-blind-bind-name`, `lane/fe-wf-link-deadend`, `lane/fe-wf-oplink` |
| `wfoi_side_operator` | 3 | identical | `lane/fe-wf-blind-bind-name`, `lane/fe-wf-link-deadend`, `lane/fe-wf-oplink` |
| `wfoi_side_person` | 3 | identical | `lane/fe-wf-blind-bind-name`, `lane/fe-wf-link-deadend`, `lane/fe-wf-oplink` |
| `wfoi_submit` | 3 | identical | `lane/fe-wf-blind-bind-name`, `lane/fe-wf-link-deadend`, `lane/fe-wf-oplink` |
| `wfoi_submit_none` | 3 | identical | `lane/fe-wf-blind-bind-name`, `lane/fe-wf-link-deadend`, `lane/fe-wf-oplink` |
| `wfoi_submit_one` | 3 | identical | `lane/fe-wf-blind-bind-name`, `lane/fe-wf-link-deadend`, `lane/fe-wf-oplink` |
| `wfoi_title` | 3 | identical | `lane/fe-wf-blind-bind-name`, `lane/fe-wf-link-deadend`, `lane/fe-wf-oplink` |
| `wfp_back_to_schedule` | 2 | identical | `WORKING-TREE`, `lane/wf-pubhist` |
| `wfp_context_failed` | 2 | identical | `WORKING-TREE`, `lane/wf-pubhist` |
| `wfp_delivery_link` | 2 | identical | `WORKING-TREE`, `lane/wf-pubhist` |
| `wfp_manager_only` | 2 | identical | `WORKING-TREE`, `lane/wf-pubhist` |
| `wfp_no_capability` | 2 | identical | `WORKING-TREE`, `lane/wf-pubhist` |
| `wfp_page_intro` | 2 | identical | `WORKING-TREE`, `lane/wf-pubhist` |
| `wfp_page_title` | 2 | identical | `WORKING-TREE`, `lane/wf-pubhist` |
| `wfpl_category_gap` | 3 | identical | `lane/ev-stale-cause`, `lane/statute-evidence-world`, `lane/statute-honesty` |
| `wfpl_coderegister` | 4 | identical | `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/wf-idreg`, `lane/wf-kodeoversikt-ui` |
| `wfpl_coderegister_done` | 4 | identical | `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/wf-idreg`, `lane/wf-kodeoversikt-ui` |
| `wfpl_coderegister_failed` | 4 | identical | `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/wf-idreg`, `lane/wf-kodeoversikt-ui` |
| `wfpl_coderegister_procedure` | 4 | identical | `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/wf-idreg`, `lane/wf-kodeoversikt-ui` |
| `wfpl_coderegister_unavailable` | 4 | identical | `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/wf-idreg`, `lane/wf-kodeoversikt-ui` |
| `wfpl_coderegister_working` | 4 | identical | `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/wf-idreg`, `lane/wf-kodeoversikt-ui` |
| `wfpl_correct` | 1 | sole | `lane/fe-wf-correction-path` |
| `wfpl_correct_cancel` | 1 | sole | `lane/fe-wf-correction-path` |
| `wfpl_correct_end` | 1 | sole | `lane/fe-wf-correction-path` |
| `wfpl_correct_end_invalid` | 1 | sole | `lane/fe-wf-correction-path` |
| `wfpl_correct_failed` | 1 | sole | `lane/fe-wf-correction-path` |
| `wfpl_correct_no_departure` | 1 | sole | `lane/fe-wf-correction-path` |
| `wfpl_correct_note` | 1 | sole | `lane/fe-wf-correction-path` |
| `wfpl_correct_order_invalid` | 1 | sole | `lane/fe-wf-correction-path` |
| `wfpl_correct_save` | 1 | sole | `lane/fe-wf-correction-path` |
| `wfpl_correct_saved` | 1 | sole | `lane/fe-wf-correction-path` |
| `wfpl_correct_saving` | 1 | sole | `lane/fe-wf-correction-path` |
| `wfpl_correct_start` | 1 | sole | `lane/fe-wf-correction-path` |
| `wfpl_correct_start_invalid` | 1 | sole | `lane/fe-wf-correction-path` |
| `wfpl_correct_title` | 1 | sole | `lane/fe-wf-correction-path` |
| `wfpos_err_read` | 4 | identical | `lane/fe-pos-clock`, `lane/fe-wf-blind-bind-name`, `lane/fe-wf-link-deadend`, `lane/fe-wf-oplink` |
| `wfpos_err_session` | 4 | identical | `lane/fe-pos-clock`, `lane/fe-wf-blind-bind-name`, `lane/fe-wf-link-deadend`, `lane/fe-wf-oplink` |
| `wfpos_loading` | 4 | identical | `lane/fe-pos-clock`, `lane/fe-wf-blind-bind-name`, `lane/fe-wf-link-deadend`, `lane/fe-wf-oplink` |
| `wfpos_no_correction` | 4 | identical | `lane/fe-pos-clock`, `lane/fe-wf-blind-bind-name`, `lane/fe-wf-link-deadend`, `lane/fe-wf-oplink` |
| `wfpos_present_now` | 4 | identical | `lane/fe-pos-clock`, `lane/fe-wf-blind-bind-name`, `lane/fe-wf-link-deadend`, `lane/fe-wf-oplink` |
| `wfpos_print` | 4 | identical | `lane/fe-pos-clock`, `lane/fe-wf-blind-bind-name`, `lane/fe-wf-link-deadend`, `lane/fe-wf-oplink` |
| `wfpos_print_unavailable` | 4 | identical | `lane/fe-pos-clock`, `lane/fe-wf-blind-bind-name`, `lane/fe-wf-link-deadend`, `lane/fe-wf-oplink` |
| `wfpos_reload` | 4 | identical | `lane/fe-pos-clock`, `lane/fe-wf-blind-bind-name`, `lane/fe-wf-link-deadend`, `lane/fe-wf-oplink` |
| `wfpos_sub` | 4 | identical | `lane/fe-pos-clock`, `lane/fe-wf-blind-bind-name`, `lane/fe-wf-link-deadend`, `lane/fe-wf-oplink` |
| `wfpos_title` | 4 | identical | `lane/fe-pos-clock`, `lane/fe-wf-blind-bind-name`, `lane/fe-wf-link-deadend`, `lane/fe-wf-oplink` |
| `wfr_access_ended` | 2 | identical | `lane/fe-wf-onboard`, `lane/fe-wf-self` |
| `wfr_access_expires_hint` | 2 | identical | `lane/fe-wf-onboard`, `lane/fe-wf-self` |
| `wfr_access_expires_label` | 2 | identical | `lane/fe-wf-onboard`, `lane/fe-wf-self` |
| `wfr_access_expiry_unknown` | 2 | identical | `lane/fe-wf-onboard`, `lane/fe-wf-self` |
| `wfr_access_issue` | 2 | identical | `lane/fe-wf-onboard`, `lane/fe-wf-self` |
| `wfr_access_list_note` | 1 | sole | `lane/fe-wf-invite-list-revoke` |
| `wfr_access_live_heading` | 1 | sole | `lane/fe-wf-invite-list-revoke` |
| `wfr_access_live_lapsed` | 1 | sole | `lane/fe-wf-invite-list-revoke` |
| `wfr_access_live_none` | 1 | sole | `lane/fe-wf-invite-list-revoke` |
| `wfr_access_live_state` | 1 | sole | `lane/fe-wf-invite-list-revoke` |
| `wfr_access_live_unknown` | 1 | sole | `lane/fe-wf-invite-list-revoke` |
| `wfr_access_no_list` | 2 | identical | `lane/fe-wf-onboard`, `lane/fe-wf-self` |
| `wfr_access_not_sent_body` | 2 | identical | `lane/fe-wf-onboard`, `lane/fe-wf-self` |
| `wfr_access_not_sent_title` | 2 | identical | `lane/fe-wf-onboard`, `lane/fe-wf-self` |
| `wfr_access_reissue` | 2 | identical | `lane/fe-wf-onboard`, `lane/fe-wf-self` |
| `wfr_access_reissue_hint` | 2 | identical | `lane/fe-wf-onboard`, `lane/fe-wf-self` |
| `wfr_access_revoke` | 1 | sole | `lane/fe-wf-invite-list-revoke` |
| `wfr_access_revoke_hint` | 1 | sole | `lane/fe-wf-invite-list-revoke` |
| `wfr_access_revoke_lapsed` | 1 | sole | `lane/fe-wf-invite-list-revoke` |
| `wfr_access_revoke_lapsed_hint` | 1 | sole | `lane/fe-wf-invite-list-revoke` |
| `wfr_access_revoked_ok` | 1 | sole | `lane/fe-wf-invite-list-revoke` |
| `wfr_access_state_archived` | 2 | identical | `lane/fe-wf-onboard`, `lane/fe-wf-self` |
| `wfr_access_state_claimed` | 2 | identical | `lane/fe-wf-onboard`, `lane/fe-wf-self` |
| `wfr_access_state_invited` | 2 | identical | `lane/fe-wf-onboard`, `lane/fe-wf-self` |
| `wfr_access_state_unknown` | 2 | identical | `lane/fe-wf-onboard`, `lane/fe-wf-self` |
| `wfr_access_token_copied` | 2 | identical | `lane/fe-wf-onboard`, `lane/fe-wf-self` |
| `wfr_access_token_copy` | 2 | identical | `lane/fe-wf-onboard`, `lane/fe-wf-self` |
| `wfr_access_token_copy_failed` | 2 | identical | `lane/fe-wf-onboard`, `lane/fe-wf-self` |
| `wfr_access_token_done` | 2 | identical | `lane/fe-wf-onboard`, `lane/fe-wf-self` |
| `wfr_access_token_expires` | 2 | identical | `lane/fe-wf-onboard`, `lane/fe-wf-self` |
| `wfr_access_token_label` | 2 | identical | `lane/fe-wf-onboard`, `lane/fe-wf-self` |
| `wfr_access_token_once` | 2 | identical | `lane/fe-wf-onboard`, `lane/fe-wf-self` |
| `wfr_access_token_replayed` | 2 | identical | `lane/fe-wf-onboard`, `lane/fe-wf-self` |
| `wfr_access_token_where` | 2 | identical | `lane/fe-wf-onboard`, `lane/fe-wf-self` |
| `wfr_add_active_from` | 1 | identical | `lane/workforce-roster` |
| `wfr_add_capabilities` | 1 | identical | `lane/workforce-roster` |
| `wfr_add_display_name` | 1 | identical | `lane/workforce-roster` |
| `wfr_add_email` | 1 | identical | `lane/workforce-roster` |
| `wfr_add_employer` | 1 | identical | `lane/workforce-roster` |
| `wfr_add_employer_count` | 1 | identical | `lane/workforce-roster` |
| `wfr_add_employer_hint` | 1 | identical | `lane/workforce-roster` |
| `wfr_add_employment_number` | 1 | identical | `lane/workforce-roster` |
| `wfr_add_mode_existing` | 1 | identical | `lane/workforce-roster` |
| `wfr_add_mode_existing_hint` | 1 | identical | `lane/workforce-roster` |
| `wfr_add_mode_new` | 1 | identical | `lane/workforce-roster` |
| `wfr_add_mode_new_hint` | 1 | identical | `lane/workforce-roster` |
| `wfr_add_no_employer` | 1 | identical | `lane/workforce-roster` |
| `wfr_add_open` | 1 | identical | `lane/workforce-roster` |
| `wfr_add_payroll_number` | 1 | identical | `lane/workforce-roster` |
| `wfr_add_person` | 1 | identical | `lane/workforce-roster` |
| `wfr_add_person_blocked` | 1 | identical | `lane/workforce-roster` |
| `wfr_add_person_choose` | 1 | identical | `lane/workforce-roster` |
| `wfr_add_phone` | 1 | identical | `lane/workforce-roster` |
| `wfr_add_submit` | 1 | identical | `lane/workforce-roster` |
| `wfr_add_title` | 1 | identical | `lane/workforce-roster` |
| `wfr_added_ok` | 1 | identical | `lane/workforce-roster` |
| `wfr_bootstrap_display_name` | 1 | sole | `lane/fe-wf-bootstrap` |
| `wfr_bootstrap_employer_name` | 1 | sole | `lane/fe-wf-bootstrap` |
| `wfr_bootstrap_failed` | 1 | sole | `lane/fe-wf-bootstrap` |
| `wfr_bootstrap_intro` | 1 | sole | `lane/fe-wf-bootstrap` |
| `wfr_bootstrap_module_off` | 1 | sole | `lane/fe-wf-bootstrap` |
| `wfr_bootstrap_not_admin` | 1 | sole | `lane/fe-wf-bootstrap` |
| `wfr_bootstrap_note` | 1 | sole | `lane/fe-wf-bootstrap` |
| `wfr_bootstrap_org_number` | 1 | sole | `lane/fe-wf-bootstrap` |
| `wfr_bootstrap_submit` | 1 | sole | `lane/fe-wf-bootstrap` |
| `wfr_bootstrap_title` | 1 | sole | `lane/fe-wf-bootstrap` |
| `wfr_cancel` | 1 | identical | `lane/workforce-roster` |
| `wfr_cap_desc_manager` | 1 | identical | `lane/workforce-roster` |
| `wfr_cap_desc_payrollapprover` | 1 | identical | `lane/workforce-roster` |
| `wfr_cap_desc_scheduler` | 1 | identical | `lane/workforce-roster` |
| `wfr_cap_desc_self` | 1 | identical | `lane/workforce-roster` |
| `wfr_cap_manager` | 1 | identical | `lane/workforce-roster` |
| `wfr_cap_none` | 1 | identical | `lane/workforce-roster` |
| `wfr_cap_payrollapprover` | 1 | identical | `lane/workforce-roster` |
| `wfr_cap_scheduler` | 1 | identical | `lane/workforce-roster` |
| `wfr_cap_self` | 1 | identical | `lane/workforce-roster` |
| `wfr_cap_unknown` | 1 | identical | `lane/workforce-roster` |
| `wfr_col_capabilities` | 1 | identical | `lane/workforce-roster` |
| `wfr_col_employment_number` | 1 | identical | `lane/workforce-roster` |
| `wfr_col_from` | 1 | identical | `lane/workforce-roster` |
| `wfr_col_person` | 1 | identical | `lane/workforce-roster` |
| `wfr_col_status` | 1 | identical | `lane/workforce-roster` |
| `wfr_col_to` | 1 | identical | `lane/workforce-roster` |
| `wfr_conflict_cross_store_caveat` | 1 | identical | `lane/workforce-roster` |
| `wfr_conflict_generic_title` | 1 | identical | `lane/workforce-roster` |
| `wfr_conflict_hidden` | 1 | identical | `lane/workforce-roster` |
| `wfr_conflict_hidden_title` | 1 | identical | `lane/workforce-roster` |
| `wfr_conflict_invitation` | 2 | identical | `lane/fe-wf-onboard`, `lane/fe-wf-self` |
| `wfr_conflict_invitation_title` | 2 | identical | `lane/fe-wf-onboard`, `lane/fe-wf-self` |
| `wfr_conflict_revoke_claimed` | 1 | sole | `lane/fe-wf-invite-list-revoke` |
| `wfr_conflict_revoke_claimed_title` | 1 | sole | `lane/fe-wf-invite-list-revoke` |
| `wfr_conflict_revoke_stale` | 1 | sole | `lane/fe-wf-invite-list-revoke` |
| `wfr_conflict_revoke_stale_title` | 1 | sole | `lane/fe-wf-invite-list-revoke` |
| `wfr_conflict_same_store` | 1 | identical | `lane/workforce-roster` |
| `wfr_conflict_same_store_title` | 1 | identical | `lane/workforce-roster` |
| `wfr_conflict_stale` | 1 | identical | `lane/workforce-roster` |
| `wfr_conflict_stale_title` | 1 | identical | `lane/workforce-roster` |
| `wfr_contact_clearing` | 3 | identical | `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/fe-wf-contact-imported` |
| `wfr_contact_email` | 3 | identical | `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/fe-wf-contact-imported` |
| `wfr_contact_email_placeholder` | 3 | identical | `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/fe-wf-contact-imported` |
| `wfr_contact_person_scope` | 3 | identical | `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/fe-wf-contact-imported` |
| `wfr_contact_phone` | 3 | identical | `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/fe-wf-contact-imported` |
| `wfr_contact_phone_placeholder` | 3 | identical | `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/fe-wf-contact-imported` |
| `wfr_context_failed` | 1 | identical | `lane/workforce-roster` |
| `wfr_end_date_one_way` | 1 | identical | `lane/workforce-roster` |
| `wfr_end_effect_personnel_list` | 1 | identical | `lane/workforce-roster` |
| `wfr_end_effect_punches_clear` | 1 | identical | `lane/workforce-roster` |
| `wfr_end_effect_punches_open` | 1 | identical | `lane/workforce-roster` |
| `wfr_end_effect_punches_unknown` | 1 | identical | `lane/workforce-roster` |
| `wfr_end_effect_selfservice` | 1 | identical | `lane/workforce-roster` |
| `wfr_end_effect_shifts` | 1 | identical | `lane/workforce-roster` |
| `wfr_end_record_date` | 1 | identical | `lane/workforce-roster` |
| `wfr_end_submit` | 1 | identical | `lane/workforce-roster` |
| `wfr_ended_ok` | 1 | identical | `lane/workforce-roster` |
| `wfr_generic_error` | 1 | identical | `lane/workforce-roster` |
| `wfr_invitation_issued` | 2 | identical | `lane/fe-wf-onboard`, `lane/fe-wf-self` |
| `wfr_last_manager_warning` | 1 | identical | `lane/workforce-roster` |
| `wfr_multi_engagement` | 1 | identical | `lane/workforce-roster` |
| `wfr_no_capability` | 1 | identical | `lane/workforce-roster` |
| `wfr_no_manager_left` | 1 | identical | `lane/workforce-roster` |
| `wfr_no_revision` | 1 | identical | `lane/workforce-roster` |
| `wfr_page_intro` | 1 | identical | `lane/workforce-roster` |
| `wfr_page_title` | 1 | identical | `lane/workforce-roster` |
| `wfr_panel_access` | 2 | identical | `lane/fe-wf-onboard`, `lane/fe-wf-self` |
| `wfr_panel_active_window` | 1 | identical | `lane/workforce-roster` |
| `wfr_panel_capabilities` | 1 | identical | `lane/workforce-roster` |
| `wfr_panel_capabilities_hint` | 1 | identical | `lane/workforce-roster` |
| `wfr_panel_contact` | 1 | identical | `lane/workforce-roster` |
| `wfr_panel_contact_edit` | 3 | identical | `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/fe-wf-contact-imported` |
| `wfr_panel_detail_unknown` | 1 | identical | `lane/workforce-roster` |
| `wfr_panel_employer` | 1 | identical | `lane/workforce-roster` |
| `wfr_panel_end` | 1 | identical | `lane/workforce-roster` |
| `wfr_panel_engagement_of` | 1 | identical | `lane/workforce-roster` |
| `wfr_panel_multi_engagement` | 1 | identical | `lane/workforce-roster` |
| `wfr_panel_numbers` | 1 | identical | `lane/workforce-roster` |
| `wfr_panel_operator` | 3 | identical | `lane/fe-wf-blind-bind-name`, `lane/fe-wf-link-deadend`, `lane/fe-wf-oplink` |
| `wfr_panel_operator_linked` | 3 | identical | `lane/fe-wf-blind-bind-name`, `lane/fe-wf-link-deadend`, `lane/fe-wf-oplink` |
| `wfr_panel_operator_none` | 3 | identical | `lane/fe-wf-blind-bind-name`, `lane/fe-wf-link-deadend`, `lane/fe-wf-oplink` |
| `wfr_panel_operator_unknown` | 3 | identical | `lane/fe-wf-blind-bind-name`, `lane/fe-wf-link-deadend`, `lane/fe-wf-oplink` |
| `wfr_panel_person_state` | 1 | identical | `lane/workforce-roster` |
| `wfr_panel_reactivate` | 1 | identical | `lane/workforce-roster` |
| `wfr_panel_roles` | 1 | identical | `lane/workforce-roster` |
| `wfr_panel_roles_hint` | 1 | identical | `lane/workforce-roster` |
| `wfr_panel_roles_none_defined` | 1 | identical | `lane/workforce-roster` |
| `wfr_panel_roles_unknown` | 1 | identical | `lane/workforce-roster` |
| `wfr_panel_staff_roles_unknown` | 1 | identical | `lane/workforce-roster` |
| `wfr_panel_terms` | 1 | identical | `lane/workforce-roster` |
| `wfr_panel_terms_none` | 1 | identical | `lane/workforce-roster` |
| `wfr_panel_terms_unknown` | 1 | identical | `lane/workforce-roster` |
| `wfr_person_archived` | 1 | identical | `lane/workforce-roster` |
| `wfr_person_claimed` | 1 | identical | `lane/workforce-roster` |
| `wfr_person_invited` | 1 | identical | `lane/workforce-roster` |
| `wfr_person_unknown` | 1 | identical | `lane/workforce-roster` |
| `wfr_reactivate_capped` | 1 | identical | `lane/workforce-roster` |
| `wfr_reactivate_hint` | 1 | identical | `lane/workforce-roster` |
| `wfr_reactivate_submit` | 1 | identical | `lane/workforce-roster` |
| `wfr_reactivated_ok` | 1 | identical | `lane/workforce-roster` |
| `wfr_read_only` | 1 | identical | `lane/workforce-roster` |
| `wfr_reload` | 1 | identical | `lane/workforce-roster` |
| `wfr_role_retired` | 1 | identical | `lane/workforce-roster` |
| `wfr_roster_empty` | 1 | identical | `lane/workforce-roster` |
| `wfr_roster_unknown` | 1 | identical | `lane/workforce-roster` |
| `wfr_save` | 1 | identical | `lane/workforce-roster` |
| `wfr_saved_ok` | 1 | identical | `lane/workforce-roster` |
| `wfr_status_active` | 1 | identical | `lane/workforce-roster` |
| `wfr_status_ended` | 1 | identical | `lane/workforce-roster` |
| `wfr_term_add` | 1 | identical | `lane/workforce-roster` |
| `wfr_term_category` | 1 | identical | `lane/workforce-roster` |
| `wfr_term_contract` | 1 | identical | `lane/workforce-roster` |
| `wfr_term_hours` | 1 | identical | `lane/workforce-roster` |
| `wfr_term_hours_placeholder` | 1 | identical | `lane/workforce-roster` |
| `wfr_term_new` | 1 | identical | `lane/workforce-roster` |
| `wfr_term_wage` | 1 | identical | `lane/workforce-roster` |
| `wfr_term_wage_currency` | 1 | identical | `lane/workforce-roster` |
| `wfr_term_wage_interval` | 1 | identical | `lane/workforce-roster` |
| `wfr_term_wage_none` | 1 | identical | `lane/workforce-roster` |
| `wfr_term_wage_withheld` | 1 | identical | `lane/workforce-roster` |
| `wfrl_action_cancel` | 4 | identical | `WORKING-TREE`, `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/wf-roles-ui` |
| `wfrl_action_create` | 4 | identical | `WORKING-TREE`, `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/wf-roles-ui` |
| `wfrl_action_edit` | 4 | identical | `WORKING-TREE`, `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/wf-roles-ui` |
| `wfrl_action_reinstate` | 4 | identical | `WORKING-TREE`, `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/wf-roles-ui` |
| `wfrl_action_retire` | 4 | identical | `WORKING-TREE`, `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/wf-roles-ui` |
| `wfrl_action_save` | 4 | identical | `WORKING-TREE`, `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/wf-roles-ui` |
| `wfrl_col_name` | 4 | identical | `WORKING-TREE`, `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/wf-roles-ui` |
| `wfrl_col_sort` | 4 | identical | `WORKING-TREE`, `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/wf-roles-ui` |
| `wfrl_col_station` | 4 | identical | `WORKING-TREE`, `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/wf-roles-ui` |
| `wfrl_col_status` | 4 | identical | `WORKING-TREE`, `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/wf-roles-ui` |
| `wfrl_context_failed` | 4 | identical | `WORKING-TREE`, `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/wf-roles-ui` |
| `wfrl_error_name_required` | 4 | identical | `WORKING-TREE`, `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/wf-roles-ui` |
| `wfrl_field_color` | 4 | identical | `WORKING-TREE`, `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/wf-roles-ui` |
| `wfrl_field_name` | 4 | identical | `WORKING-TREE`, `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/wf-roles-ui` |
| `wfrl_field_sort` | 4 | identical | `WORKING-TREE`, `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/wf-roles-ui` |
| `wfrl_field_station` | 4 | identical | `WORKING-TREE`, `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/wf-roles-ui` |
| `wfrl_form_hint` | 4 | identical | `WORKING-TREE`, `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/wf-roles-ui` |
| `wfrl_form_title_edit` | 4 | identical | `WORKING-TREE`, `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/wf-roles-ui` |
| `wfrl_form_title_new` | 4 | identical | `WORKING-TREE`, `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/wf-roles-ui` |
| `wfrl_list_empty` | 4 | identical | `WORKING-TREE`, `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/wf-roles-ui` |
| `wfrl_list_failed` | 4 | identical | `WORKING-TREE`, `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/wf-roles-ui` |
| `wfrl_list_title` | 4 | identical | `WORKING-TREE`, `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/wf-roles-ui` |
| `wfrl_list_unknown` | 4 | identical | `WORKING-TREE`, `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/wf-roles-ui` |
| `wfrl_no_authority_note` | 4 | identical | `WORKING-TREE`, `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/wf-roles-ui` |
| `wfrl_no_capability` | 4 | identical | `WORKING-TREE`, `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/wf-roles-ui` |
| `wfrl_no_workforce_access` | 4 | identical | `WORKING-TREE`, `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/wf-roles-ui` |
| `wfrl_page_intro` | 4 | identical | `WORKING-TREE`, `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/wf-roles-ui` |
| `wfrl_page_title` | 4 | identical | `WORKING-TREE`, `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/wf-roles-ui` |
| `wfrl_role_unnamed` | 4 | identical | `WORKING-TREE`, `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/wf-roles-ui` |
| `wfrl_save_failed` | 4 | identical | `WORKING-TREE`, `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/wf-roles-ui` |
| `wfrl_saving` | 4 | identical | `WORKING-TREE`, `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/wf-roles-ui` |
| `wfrl_status_active` | 4 | identical | `WORKING-TREE`, `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/wf-roles-ui` |
| `wfrl_status_retired` | 4 | identical | `WORKING-TREE`, `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/wf-roles-ui` |
| `wfrl_toast_created` | 4 | identical | `WORKING-TREE`, `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/wf-roles-ui` |
| `wfrl_toast_reinstated` | 4 | identical | `WORKING-TREE`, `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/wf-roles-ui` |
| `wfrl_toast_retired` | 4 | identical | `WORKING-TREE`, `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/wf-roles-ui` |
| `wfrl_toast_saved` | 4 | identical | `WORKING-TREE`, `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/wf-roles-ui` |
| `wfrt_att_correct` | 4 | identical | `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/journey-workforce`, `lane/wf-adjust-address` |
| `wfrt_att_correct_cancel` | 4 | identical | `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/journey-workforce`, `lane/wf-adjust-address` |
| `wfrt_att_correct_corrected` | 4 | identical | `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/journey-workforce`, `lane/wf-adjust-address` |
| `wfrt_att_correct_done` | 4 | identical | `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/journey-workforce`, `lane/wf-adjust-address` |
| `wfrt_att_correct_failed` | 4 | identical | `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/journey-workforce`, `lane/wf-adjust-address` |
| `wfrt_att_correct_field` | 4 | identical | `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/journey-workforce`, `lane/wf-adjust-address` |
| `wfrt_att_correct_field_break` | 4 | identical | `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/journey-workforce`, `lane/wf-adjust-address` |
| `wfrt_att_correct_field_end` | 4 | identical | `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/journey-workforce`, `lane/wf-adjust-address` |
| `wfrt_att_correct_field_start` | 4 | identical | `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/journey-workforce`, `lane/wf-adjust-address` |
| `wfrt_att_correct_law` | 4 | identical | `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/journey-workforce`, `lane/wf-adjust-address` |
| `wfrt_att_correct_original` | 4 | identical | `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/journey-workforce`, `lane/wf-adjust-address` |
| `wfrt_att_correct_reason` | 4 | identical | `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/journey-workforce`, `lane/wf-adjust-address` |
| `wfrt_att_correct_reason_hint` | 4 | identical | `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/journey-workforce`, `lane/wf-adjust-address` |
| `wfrt_att_correct_saving` | 4 | identical | `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/journey-workforce`, `lane/wf-adjust-address` |
| `wfrt_att_correct_submit` | 4 | identical | `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/journey-workforce`, `lane/wf-adjust-address` |
| `wfrt_att_correct_title` | 4 | identical | `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/journey-workforce`, `lane/wf-adjust-address` |
| `wfrt_att_correct_worker_visible` | 4 | identical | `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/journey-workforce`, `lane/wf-adjust-address` |
| `wfrt_att_punch_unpaid_break` | 4 | identical | `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/journey-workforce`, `lane/wf-adjust-address` |
| `wft_allow_incomplete` | 1 | sole | `WORKING-TREE` |
| `wft_approve` | 1 | sole | `WORKING-TREE` |
| `wft_approve_failed` | 1 | sole | `WORKING-TREE` |
| `wft_approved_notice` | 1 | sole | `WORKING-TREE` |
| `wft_approving` | 1 | sole | `WORKING-TREE` |
| `wft_back_to_rates` | 1 | sole | `WORKING-TREE` |
| `wft_batch_digest` | 1 | sole | `WORKING-TREE` |
| `wft_batch_provider` | 1 | sole | `WORKING-TREE` |
| `wft_batch_rows` | 1 | sole | `WORKING-TREE` |
| `wft_batch_sent_at` | 1 | sole | `WORKING-TREE` |
| `wft_batch_sent_by` | 1 | sole | `WORKING-TREE` |
| `wft_batches_empty` | 1 | sole | `WORKING-TREE` |
| `wft_batches_title` | 1 | sole | `WORKING-TREE` |
| `wft_batches_unknown` | 1 | sole | `WORKING-TREE` |
| `wft_context_failed` | 1 | sole | `WORKING-TREE` |
| `wft_download` | 1 | sole | `WORKING-TREE` |
| `wft_download_failed` | 1 | sole | `WORKING-TREE` |
| `wft_download_unavailable` | 1 | sole | `WORKING-TREE` |
| `wft_downloaded_notice` | 1 | sole | `WORKING-TREE` |
| `wft_downloading` | 1 | sole | `WORKING-TREE` |
| `wft_export` | 1 | sole | `WORKING-TREE` |
| `wft_export_failed` | 1 | sole | `WORKING-TREE` |
| `wft_exported_notice` | 1 | sole | `WORKING-TREE` |
| `wft_exporting` | 1 | sole | `WORKING-TREE` |
| `wft_fact_paid_hours` | 1 | sole | `WORKING-TREE` |
| `wft_fact_rows` | 1 | sole | `WORKING-TREE` |
| `wft_fact_unknown_rows` | 1 | sole | `WORKING-TREE` |
| `wft_fact_unpaid_break` | 1 | sole | `WORKING-TREE` |
| `wft_flag_off_notice` | 1 | sole | `WORKING-TREE` |
| `wft_from` | 1 | sole | `WORKING-TREE` |
| `wft_frozen_at` | 1 | sole | `WORKING-TREE` |
| `wft_frozen_by` | 1 | sole | `WORKING-TREE` |
| `wft_frozen_note` | 1 | sole | `WORKING-TREE` |
| `wft_gate_already_approved` | 1 | sole | `WORKING-TREE` |
| `wft_gate_empty` | 1 | sole | `WORKING-TREE` |
| `wft_gate_flag_off` | 1 | sole | `WORKING-TREE` |
| `wft_gate_no_payroll_capability` | 1 | sole | `WORKING-TREE` |
| `wft_gate_no_period` | 1 | sole | `WORKING-TREE` |
| `wft_gate_not_approved` | 1 | sole | `WORKING-TREE` |
| `wft_load` | 1 | sole | `WORKING-TREE` |
| `wft_load_failed` | 1 | sole | `WORKING-TREE` |
| `wft_loading` | 1 | sole | `WORKING-TREE` |
| `wft_no_payroll_capability` | 1 | sole | `WORKING-TREE` |
| `wft_outcome_failed` | 1 | sole | `WORKING-TREE` |
| `wft_outcome_succeeded` | 1 | sole | `WORKING-TREE` |
| `wft_page_intro` | 1 | sole | `WORKING-TREE` |
| `wft_page_title` | 1 | sole | `WORKING-TREE` |
| `wft_period_title` | 1 | sole | `WORKING-TREE` |
| `wft_period_unknown` | 1 | sole | `WORKING-TREE` |
| `wft_refusal_already_approved` | 1 | sole | `WORKING-TREE` |
| `wft_refusal_empty` | 1 | sole | `WORKING-TREE` |
| `wft_refusal_export_failed` | 1 | sole | `WORKING-TREE` |
| `wft_refusal_flag_disabled` | 1 | sole | `WORKING-TREE` |
| `wft_refusal_id_mismatch` | 1 | sole | `WORKING-TREE` |
| `wft_refusal_in_progress` | 1 | sole | `WORKING-TREE` |
| `wft_refusal_incomplete` | 1 | sole | `WORKING-TREE` |
| `wft_refusal_not_approved` | 1 | sole | `WORKING-TREE` |
| `wft_refusal_nothing_to_reconcile` | 1 | sole | `WORKING-TREE` |
| `wft_refusal_provider_unknown` | 1 | sole | `WORKING-TREE` |
| `wft_refusal_unknown` | 1 | sole | `WORKING-TREE` |
| `wft_refused` | 1 | sole | `WORKING-TREE` |
| `wft_snapshot_digest` | 1 | sole | `WORKING-TREE` |
| `wft_status_approved` | 1 | sole | `WORKING-TREE` |
| `wft_status_exported` | 1 | sole | `WORKING-TREE` |
| `wft_status_open` | 1 | sole | `WORKING-TREE` |
| `wft_status_unknown` | 1 | sole | `WORKING-TREE` |
| `wft_to` | 1 | sole | `WORKING-TREE` |

## Reproduce

```
python3 lanes/L-TRANSLATIONS-COLLISION/extract.py    # parse every ref, emit keys.json
python3 lanes/L-TRANSLATIONS-COLLISION/analyse.py    # classify, emit verdict.json
python3 lanes/L-TRANSLATIONS-COLLISION/mergesim.py   # merge simulation, emit mergesim.json
python3 lanes/L-TRANSLATIONS-COLLISION/emit.py       # this document
```

`refs.txt` pins the 117 refs and their tips at the as-of moment. A later run at a newer tip that
disagrees with this document is not thereby wrong — re-derive rather than trust it.
