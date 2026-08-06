# L-TRANSLATION-STALE-SWEEP — keys present in all three locales whose Norwegian says more

**Read only. Nothing was fixed and no sentence was chosen.** Every command was `git cat-file`,
`git grep`, `git rev-parse` or `git show` against `e34977ac`. No ref was written, no worktree
created, no container started, nothing in the shared checkout changed. The only files written are
in this lane directory.

## The answer first

**One key, and it is the one already named.** Of the **4,782 keys present in all three locales**,
exactly **one** has a Norwegian value carrying meaning that the English *or* the German value does
not carry, and it is `posset_goods_hint` — the tax sentence the brief supplied. It is stale in
**both** targets, and **something renders it**: `components/admin/pos-settings/GoodsGroupsTab.vue:10`.

**Here is the sharpest way to say it.** **46** tri-present keys name MVA in Norwegian. **45** have
an English value naming VAT and a German value naming MwSt. **One does not, in either language**:

| | |
|---|---|
| `no` | Varegrupper brukes til SAF-T-gruppering **og styrer MVA**. Åpen-pris-linjer krever en varegruppe. |
| `en` | Goods groups are used for SAF-T grouping. Open-price lines require a goods group. |
| `de` | Warengruppen werden für die SAF-T-Gruppierung verwendet. Zeilen mit offenem Preis erfordern eine Warengruppe. |

Both targets keep the SAF-T half and the open-price half and drop the clause in the middle. An
English or German operator reads a fluent, complete-looking sentence that tells them goods groups
are a *reporting* grouping, and is never told they **set the tax rate**. Nothing in the tree can see
this: the key exists 1/1/1, so parity is silent; no ref rewords it, so no merge surfaces it; and
every sentence involved is grammatical, so nothing looks wrong.

**Two counts that correct the brief, both downward in scope.**

1. **The sixteen `index_specialDays_*` keys are not this shape.** They are **present only in
   `no` — 16 / 0 / 0**. They are the *missing* shape, already inside the sibling lanes' 35-key gap,
   and they fall back to Norwegian, which is visibly wrong rather than silently incomplete. They are
   **not in this lane's population** and are not counted below.
2. **No statutory claim diverges.** **Ten** tri-present keys name a statute, forskrift or `§`
   (`§ 8-5-6`, `§ 8-5`, GDPR/DSGVO art. 12/15/17, `bokføringsforskriften`, SAF-T Kassasystem). **All
   ten carry the reference in all three locales**, including `wfpl_identity_gap`, which keeps
   `fødselsnummer` untranslated and glosses it in both targets. **C6 is not engaged by this lane.**

## As-of, and what was read

| | |
|---|---|
| repo | `/Users/svendaneel/okam/Web-modules` |
| tree read | **`e34977ac`, by object** — all three files are ` M` in the shared checkout, so the working tree was **not** read |
| **as-of** | **2026-08-05T04:05Z** |
| `translations/no.ts` | `03fbae5be5671ee23cdb88f1829dfab1b94c4eb5` |
| `translations/en.ts` | `e2298392df775e8f68ec09171624abc8ecfe508e` |
| `translations/de.ts` | `cc6e56d4b4f89df4d03bef00d84bce081872d89e` |

The three blob ids are **byte-identical to the ones `L-VAT-KEYS-MONOLINGUAL/keys.md` reports**, so
this lane and that one measured the same tree. **The nineteen VAT sisters added an hour ago on
`lane/vat-keys-monolingual` are therefore NOT in what I read** — at `e34977ac` those keys are still
`no`-only, outside the tri-present population, and they cannot be stale because they do not yet
exist in `en.ts` or `de.ts`.

**Counts re-derived, not inherited**, with the sibling's parser (`L-VAT-KEYS-MONOLINGUAL/parse.py`),
which tokenises every line and reports what it cannot parse rather than dropping it:

| file | keys | unparsed | duplicate keys |
|---|---|---|---|
| `no.ts` | **4,817** | 0 | 0 |
| `en.ts` | **4,782** | 0 | 0 |
| `de.ts` | **4,782** | 0 | 0 |

**4,817 / 4,782 / 4,782 confirms the orchestrator's correction of its own 4,816 / 4,781.** A parse
was used, not a grep; the key sets of `en` and `de` are *identical*, and `no ⊃ en = de`, so the
tri-present population is exactly `en`'s 4,782 and the gap is exactly 35.

## The denominator: how many were compared, and how many were not

| | `→ en` | `→ de` |
|---|---|---|
| tri-present keys | 4,782 | 4,782 |
| **every content word comparable** | **3,315** | **3,329** |
| some content words comparable | 1,058 | 1,052 |
| **no content word comparable** | **352** | **344** |
| no content word at all (numerals, `—`, `%`) | 57 | 57 |

"Comparable" means the aligner in §2 had learned a translation for the word from the corpus, so
its absence in the target is evidence rather than ignorance.

**The uncomparable residue is 366 keys in union across both targets, and it cannot hide this
defect: the longest of them is 37 characters and the median is 10.** They are one- and two-word UI
labels (`Ons`, `Lav`, `Angre`, `Flervalg`). A dropped clause about tax needs a clause to be dropped
from; there is not room. That is the closure argument for the 366, and it is the only part of the
population no instrument judged.

**454 distinct keys — 9.5% of the population — were read by hand**, in 542 flag rows, across the
five instruments below. Every flag any instrument raised was read; none was triaged away by rank.

## 1. The instrument that does not work, reported first because it is the obvious one

The obvious sweep is structural: length ratio, sentence count, numerals, `§` and statute regex,
placeholder sets, clause-separator counts. **It is worthless here, on both axes, and I measured
both before reporting anything.**

`signals.py` flagged **25 keys**. I read all 25. **Zero are keys where the Norwegian carries meaning
a target lacks.** They decompose into exactly four artifact families:

- **abbreviation full-stops read as sentence ends** — `Ant.` / `Omsetn.` / `Mnd.` / `mva.` /
  `17. mai` (6 keys);
- **decimal separators** — `49,90` → `49.90`, `235,50` → `235.50`; the "missing numeral" is a
  locale convention (4 keys);
- **comma and clause counts**, which differ between any two faithful translations (8 keys);
- **`personopplysninger`**, which my statute regex matched in Norwegian while `personal data` and
  `personenbezogene Daten` sat plainly in the targets (3 keys).

**Precision for this lane's question: 0 / 25.**

**And its recall is 0 / 1 — it does not find the key we already know is stale.** `posset_goods_hint`
scores **zero on every structural signal**: sentence delta 0, clause delta 0, no numerals, no
placeholders, statute term present in *all three* (SAF-T), and an English length ratio of **1.148**,
which sits at roughly the 78th percentile of a corpus whose 99th percentile is 2.00. A threshold
loose enough to catch it flags a quarter of the dictionary.

**So: comparing meaning across languages is not a length comparison, and a sweep built on one would
have returned "nothing found" with a clean-looking table.** The rest of this report uses instruments
that are shown to catch the known positive *before* any negative is claimed.

## 2. The instrument that works: a lexicon mined from the dictionary itself

The 4,782 aligned triples **are a parallel corpus**. `align.py` builds, per target language, a Dice
co-occurrence lexicon over it — for each Norwegian word, the target words that habitually accompany
it — then asks one narrow question per key:

> Is there a Norwegian word here for which we learned a confident translation, where **none** of
> that translation set appears in the target value?

That is the mechanical shape of "the Norwegian names something the target never names". A word we
never learned a translation for is reported **uncomparable**, not skipped silently — that is where
the 352 / 344 above come from.

`MINC = 3` (a word must occur three times before its statistics are trusted); **`θ = 0.07`**, chosen
as the *loosest* threshold at which the known positive still survives on **both** targets — at
θ = 0.05 the German flag disappears, and at θ = 0.28 the noise triples. Norwegian tokens that are
themselves target vocabulary (`Okam`, `Wolt`, `SAF-T`, `IANA`, numerals) are their own translation.

`filter.py` then drops **closed-class positional words** — prepositions, pronouns, articles,
copulas, conjunctions — which have no 1:1 mapping between these three languages and produced most
of the noise (`til`, `på`, `inn`, `av`, `med`). **Negation, modality and quantifiers are explicitly
kept** (`ikke`, `aldri`, `bare`, `kun`, `alltid`, `må`, `kan`, `ingen`, `alle`): those are exactly
where a control's meaning lives, and dropping them would have been the same mistake as §1.

**Result: 333 distinct keys, 381 (key, target) rows. All 381 were read.**

- **1 key is the finding** (`posset_goods_hint`, on both targets).
- **3 keys are a different, adjacent shape** — §4.
- **329 keys are false positives**, and they are all one thing: **synonym choice the small corpus
  did not learn**. `Angre` → `Recall`; `Klar bong` → `Bump ticket`; `Levert av Okam` →
  `Powered by Okam`; `Pensjonert` → `Stillgelegt`. Faithful translations that happen not to use the
  word the corpus statistics expected.

**Precision at key level: 1 / 333 ≈ 0.3%. Recall on the known positive: 1 / 1.**

**That number is the honest characterisation of this instrument: it is a recall instrument with a
hand-read tail, not a precision instrument.** It is worth running only because 333 keys out of 4,782
is a set a person can actually finish, and because the one thing it finds is the one thing that
matters. A sweep that flagged 1,647 keys — which is what θ = 0.28 does — would not be.

## 3. The instrument that names the consequence: a curated term probe

The aligner is undirected. `glossary.py` asks the same counterpart question for **25 named term
families chosen by consequence** — VAT, zero-rating, SAF-T, excl./incl. VAT, rates, `§`,
bookkeeping duty, bookkeeping, retention, organisation number, personal data, statutory
requirement, authorities; and the control verbs: *governs, overwrites, deletes, irreversible,
never, always, only, automatic, required, blocks, cannot*.

**136 hits over 112 keys. All read.** 1 finding, 1 needing a person (§5), 2 adjacent (§4),
**108 false positives — precision 1 / 112 ≈ 0.9%**.

The false positives here are **entirely German and English inflection gaps in my own patterns**,
and they are worth naming because they are the trap this probe carries:

- `lässt sich nicht ändern`, `darf nicht`, `nicht änderbar`, `unveränderlich` — 19 of 19
  "irreversible" hits were German idioms my `kann nicht …` alternation did not cover;
- `can no longer be approved` — English, where my pattern required `cannot` or `can't`;
- `aufzubewahren` — the infixed `zu` breaks a match on `aufbewahr`;
- `überschrieben` vs. my pattern's `überschreib` — German ablaut, `ie` not `ei`.

**I checked the last one for a Unicode cause before reporting it and there is none.** All three
files are pure NFC, zero combining marks anywhere, and the pattern source is NFC too. It was an
ordinary spelling error in my regex, and it is recorded here because "the umlaut didn't match" is
the plausible wrong answer I nearly wrote down.

**What this probe is actually good for is its negatives, which are sharp because the population is
small and named:** 46 MVA keys, one divergence; 10 statute keys, none.

## 4. Three keys of a different shape: the target says something *else*, not something *less*

These are **not** this lane's exit criterion — nothing is missing, a different thing is asserted —
so they are named separately rather than folded into the count. All three are German, all render.

| key | `no` | `de` | renders at |
|---|---|---|---|
| `receiptModal_orgNumber` | `Org.nr {vat} MVA` | **`USt-IdNr.`** `{vat} MwSt` | `components/molecules/ReceiptModal.vue:39` |
| `mrg_sup_org_number` | `Organisasjonsnummer` | **`Handelsregisternummer`** | `pages/admin/margin-suppliers.vue:86` |
| `meals_field_employee_ref_hint` | `Aldri fødselsnummer` | **`Nie eine Sozialversicherungsnummer`** | `components/admin/meals/MealsPeoplePanel.vue:128` |

A Norwegian **organisasjonsnummer** is not a German **USt-IdNr.** (a VAT identification number) and
not a **Handelsregisternummer** (a commercial-register number); a **fødselsnummer** is a national
identity number, not a **Sozialversicherungsnummer**. **In each case the English value is faithful**
— `Org. no. {vat} VAT`, `Organisation number`, and `Never a fødselsnummer`, which keeps the
Norwegian term exactly as `wfpl_identity_gap` does — so the house convention is visible, and only
German departs from it. The first of the three prints on a receipt.

**One more, smaller:** `wfrt_rate_amount_placeholder` and `wfrt_rate_amount_nan` render `235.50` in
German, with a full stop, while `mrg_price_amount_hint` renders `49,90` in German with a comma. Both
are money-entry hints; German uses the comma. **`de.ts` contradicts itself about the decimal mark**,
in the field where an hourly rate is typed
(`components/admin/workforce-rates/WorkforceRateTimeline.vue:80,210`).

## 5. Needing a person, not another agent

**F1 · `wfpl_business_mixed` [en] — `bokføringspliktige` → "accounting entities".**

> `no` … er ført under {count} ulike **bokføringspliktige**.
> `en` … were recorded under {count} different **accounting entities**.
> `de` … wurden unter {count} verschiedenen **buchführungspflichtigen Unternehmen** erfasst.

`Bokføringspliktig` is a defined status under bokføringsloven — *an entity under a statutory duty to
keep books* — not a description of what an entity does. **German keeps the duty (`-pflichtig`);
English drops it.** That asymmetry is the reason I will not rule it idiom: if "accounting entities"
were adequate, the German would not have needed the word.

It renders at `components/admin/workforce/WorkforcePersonnelListSheet.vue:42`, on the **personnel
list**, whose own heading key cites `bokføringsforskriften § 8-5-6`. **Whether "accounting entities"
is an acceptable rendering of a statutory status on that surface is a judgement for someone who
knows what the personnel list has to prove, and I cannot make it.**

**F2 · `wfq_outcome_not_awardable` [en] — `funksjon` → "role". Checked, and I rule it NOT a
divergence**, on corpus-internal evidence rather than on my ear: `funksjon` → `role` / `Funktion` is
the settled convention across **25 `wf*` / `wfq*` / `wfr*` keys** (`wf_col_role`, `wf_field_role`,
`wf_pivot_roles`, `wfr_panel_roles_hint`, …). It is consistent, not stale.

But it costs English something worth writing down: **Norwegian distinguishes `funksjon` (a station —
kokk, bar, vakt; 27 keys, 25 of them Workforce, the other two `mrg_*` and `trn_*`) from `rolle` (a
membership or access role; 22 keys, in `meals_*`, `posset_*`, `trn_*`, `wfjoin_*`, `wfme_*`,
`wfrt_*`). German keeps both — `Funktion` and `Rolle`. English renders
both as "role", and `trn_*` uses both.** No single key is wrong. **Nothing in this lane's scope
turns on it, and it is recorded as an observation, not a finding.**

## 6. Two more angles, both negative, both worth the sentences

**Multiplicity.** Presence-based alignment is blind to a repeated clause dropped once — Norwegian
saying a word twice while the target says it once still counts as "present". Re-run counting
occurrences: **12 hits, 0 findings.** `wfpl_identity_gap` says `fødselsnummer` five times and English
once — because English glosses it once and then says "national identity number", which is more
careful, not less.

**The residual length tail.** The top 12 keys by `no`/target length ratio that **neither** §2 nor §3
flagged, read for both targets: **0 findings**. The largest, `offers_confirmCancelPrefix` at 1.63,
is the trap below.

## 7. The blind spot this method keeps, stated plainly

**Everything above compares a key against a key. Meaning that moves *between* keys is invisible to
all of it,** and this dictionary does that:

```
offers_confirmDeletePrefix   no 'Er du sikker på at du vil slette avtalen for'
                             de 'Möchten Sie den Vertrag für'
offers_confirmDeleteSuffix   no '?'
                             de 'wirklich löschen?'
```

Read alone, the German prefix has lost "are you sure", "delete", and the whole point of a delete
confirmation. Read as `pages/admin/offers.vue:384` actually assembles it —
`prefix + clientName + suffix` — the German is correct, and its word order is *why* the verb sits in
the suffix. **Both `offers_confirmDelete*` and `offers_confirmCancel*` do this**, and both were
flagged and both are fine.

I found this pair because they surfaced in two instruments and I opened the template. **I did not
enumerate every multi-key composition in the tree, so I cannot say how many others exist, and a
composed sentence whose Norwegian half carries an extra clause would not appear anywhere in this
report.** That is the honest edge of this sweep.

## 8. What was produced

| file | what it is |
|---|---|
| `no.json` `en.json` `de.json` | the three dictionaries parsed from `e34977ac`, 0 unparsed, 0 duplicates |
| `signals.py` `signals.json` | §1, the refuted structural battery |
| `align.py` `align.json` | §2, the Dice aligner |
| `filter.py` `filtered.json` | §2, closed-class filter; the 381 rows read by hand |
| `glossary.py` `glossary-hits.json` | §3, the 25 consequence-ranked term families |
| `coverage.py` `coverage.json` | the per-key comparability table |
| `uncomparable.json` | the 366 keys no instrument judged, longest 39 chars |

**Nothing was fixed. Which sentence is right for `posset_goods_hint` is an authoring judgement, and
it is about VAT.**
