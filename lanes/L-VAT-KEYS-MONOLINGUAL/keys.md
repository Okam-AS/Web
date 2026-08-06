# L-VAT-KEYS-MONOLINGUAL — the VAT sentences an English or German operator was reading in Norwegian

## The answer first

**Nineteen, not twenty.** The brief and `lanes/L-TRANSLATIONS-COLLISION/keys.md` §6 both say *twenty*
of the 35 monolingual keys are VAT-facing. Counted against the actual table, the split is
**19 VAT-facing + 16 `index_specialDays_*`**, and 19 + 16 = 35. The 16 are the admin dashboard's
special-opening-hours block (`pages/admin/index.vue`) — opening times, not tax. **All 19 were
translated; none qualified as deliberately Norwegian-only, and §4 argues why rather than assuming
it.** The gap is now **16**, all of it the specialDays block, which this lane's exit criteria do not
cover and which is left open in §7.

The 35-key figure itself is right, and so is the collision lane's baseline census: **4,817 / 4,782 /
4,782**. The brief's "4816 against 4781" is one low in each locale; the *gap* it describes is exact.

**The resolver runs `no → en → de`,** so a key missing from `en.ts` and `de.ts` is served the
Norwegian — verified at `utils/i18n.js:16`, `FALLBACK_ORDER = ['no', 'en', 'de']`, applied only
after the active locale misses. Not an error, not a blank: a sentence in the wrong language.
(A key missing from `no.ts` falls *forward* to English by the same list — the two directions are not
one rule, and only the second is this lane's.)

**This is what a German operator's goods-group screen actually said**, lifted verbatim from the
mutation run in `proof-red-at-baseline.txt` — German chrome, Norwegian tax copy:

> Warengruppen **Opprett standardgrupper** + Neue Warengruppe Warengruppen werden für die
> SAF-T-Gruppierung verwendet. … Name Code Sortierung Aktiv **MVA-profil (valgfri) Sett alle tre
> satsene for at gruppen skal styre MVA på produktene sine … Mat og drikke · 15/25/15 Standard ·
> 25/25/25 Avgiftsfri · 0/0/0 Ta med**

**Nothing here overwrites anyone.** A scan of **120 refs** (`refs/heads` + `refs/lanes`) plus the
dirty working tree found **no English or German version of any of the 19 anywhere**, and **no ref
rewords the Norwegian**: every claimant that holds one holds the byte-identical baseline value
(`rival-scan.txt`). These are keys with no second author, which is exactly the scope the brief drew,
and the 19/20/21 branch-vs-branch disagreements were not touched.

## As-of, and what was read

| | |
|---|---|
| repo | `/Users/svendaneel/okam/Web-modules` |
| baseline | `e34977acebd59b223584158c33451b6f1ffd82c1` (`feature/restaurant-modules`) |
| **as-of** | **2026-08-05T03:36Z** |
| worktree | `/Users/svendaneel/okam/web-vatkeys`, branch `lane/vat-keys-monolingual`, from `e34977ac` |
| dictionaries read | **from `e34977ac` by object**, because all three are ` M` in the shared checkout |
| `translations/no.ts` | `03fbae5be5671ee23cdb88f1829dfab1b94c4eb5` |
| `translations/en.ts` | `e2298392df775e8f68ec09171624abc8ecfe508e` |
| `translations/de.ts` | `cc6e56d4b4f89df4d03bef00d84bce081872d89e` |
| parse failures / duplicate keys | **0 / 0**, in all three, before and after |

The census was **re-derived, not inherited** — `parse.py` tokenises each line into (key, value) and
reports anything it cannot parse rather than dropping it. It reproduces the collision lane's counts
exactly and disagrees with the brief only on the 19-vs-20 split (`gap-census.txt`).

## 1. The nineteen, as they now stand

`posset_*` render on the goods-groups tab of **POS settings** (`components/admin/pos-settings/GoodsGroupsTab.vue`,
mounted from `pages/admin/pos-settings.vue` as tab `goods`). `products_*` render in the product
editor's VAT block (`pages/admin/products.vue:410-422`). Both surfaces are reachable today.

| key | `no` (unchanged) | `en` (added) | `de` (added) |
|---|---|---|---|
| `posset_goods_seed` | Opprett standardgrupper | Create default groups | Standardgruppen erstellen |
| `posset_goods_seeded` | Standardgrupper opprettet. | Default groups created. | Standardgruppen erstellt. |
| `posset_col_profile` | MVA-profil | VAT profile | MwSt.-Profil |
| `posset_goods_profile` | MVA-profil (valgfri) | VAT profile (optional) | MwSt.-Profil (optional) |
| `posset_goods_profile_hint` | Sett alle tre satsene for at gruppen skal styre MVA på produktene sine (sats følger av gruppe × kontekst). La stå tomme for en ren SAF-T-gruppe. | Set all three rates so the group governs VAT on its products (the rate follows from group × context). Leave them empty for a plain SAF-T group. | Setze alle drei Sätze, damit die Gruppe die MwSt. ihrer Produkte steuert (der Satz ergibt sich aus Gruppe × Kontext). Leer lassen für eine reine SAF-T-Gruppe. |
| `posset_goods_preset_food` | Mat og drikke · 15/25/15 | Food and drink · 15/25/15 | Speisen und Getränke · 15/25/15 |
| `posset_goods_preset_standard` | Standard · 25/25/25 | Standard · 25/25/25 | Standard · 25/25/25 |
| `posset_goods_preset_free` | Avgiftsfri · 0/0/0 | Zero-rated · 0/0/0 | Nullsatz · 0/0/0 |
| `posset_goods_takeaway` | Ta med | Takeaway | Zum Mitnehmen |
| `posset_goods_eatin` | Spis her | Eat in | Vor Ort |
| `posset_goods_delivery` | Levering | Delivery | Lieferung |
| `posset_goods_rate_none` | — | — | — |
| `posset_goods_profile_incomplete` | MVA-profilen må enten være helt tom eller ha alle tre satsene. | The VAT profile must be either completely empty or carry all three rates. | Das MwSt.-Profil muss entweder ganz leer sein oder alle drei Sätze enthalten. |
| `posset_goods_profile_reprice` | ⚠ Endring av satsene re-priser fremtidige salg for alle produkter i denne gruppen. | ⚠ Changing the rates re-prices future sales for every product in this group. | ⚠ Eine Änderung der Sätze berechnet die Preise künftiger Verkäufe für alle Produkte dieser Gruppe neu. |
| `products_goodsGroup` | Varegruppe | Goods group | Warengruppe |
| `products_goodsGroup_none` | Ingen varegruppe | No goods group | Keine Warengruppe |
| `products_goodsGroupVatNote` | MVA styres av varegruppen: `{takeaway}` % ta med · `{eatin}` % spis her · `{delivery}` % levering. | VAT is governed by the goods group: `{takeaway}`% takeaway · `{eatin}`% eat in · `{delivery}`% delivery. | Die MwSt. wird von der Warengruppe gesteuert: `{takeaway}` % zum Mitnehmen · `{eatin}` % vor Ort · `{delivery}` % Lieferung. |
| `products_vatAdvancedShow` | Vis råfelter | Show raw fields | Rohfelder anzeigen |
| `products_vatAdvancedHide` | Skjul råfelter | Hide raw fields | Rohfelder ausblenden |

Keys were inserted in `no.ts`'s own order so the three files diff line-for-line.

## 2. Why each sentence says what it says

**The warning.** `posset_goods_profile_reprice` is the one the brief singles out, and its load-bearing
word is **`fremtidige`**. Both translations keep it (`future` / `künftiger`) and both keep the scope
(`for every product in this group` / `für alle Produkte dieser Gruppe`). German uses
*berechnet … neu* rather than a paraphrase because *re-prise* here means the amount is recomputed —
which is what `pos_repriced_takeaway` already shows an operator at the till. A test asserts all three
locales still say *future*, so a later reword that drops it goes red.

**MVA → VAT / MwSt., not kept as "MVA".** The brief's instruction is to keep a legally loaded
Norwegian term and gloss it. **`MVA` is not that case, and the file already settled it**: `en.ts`
renders MVA as `VAT` and `de.ts` as `MwSt.` in 40+ existing keys, including printed receipts
(`receiptModal_*`), the X/Z report (`pos_report_vat_*`) and the product editor (`products_vat`).
Introducing `MVA` on these nineteen alone would be the inconsistency, and the tax is Norwegian either
way — the locale is the operator's reading language, not the venue's market.

**`SAF-T` stays untranslated** in both, matching `posset_goods_hint` and `posrep_tab_saft`.

**`Ta med` / `Spis her` / `Levering`** take the register's existing vocabulary — `Takeaway` / `Eat in`
and `Zum Mitnehmen` / `Vor Ort` are the words `pos_repriced_takeaway` and `pos_repriced_eatin`
already use, so the same context is not named two ways in one product.

**Two are identical by design.** `posset_goods_rate_none` is an em dash and
`posset_goods_preset_standard` is a rate triple with a word that is the same in all three languages.
They are **still added rather than left to the fallback**, because "resolves to the right string" and
"is authored in this locale" are different facts, and only the second survives a later reword of the
Norwegian. A test asserts they are own properties, not inherited.

**Register.** `de.ts` is mixed — the `posset_*` block is *du* (`Denke daran`, `Füge eines … hinzu`),
the `products_*` block is *Sie* (`Legen Sie fest`). The one added sentence that needs a pronoun
(`posset_goods_profile_hint`) sits in the `posset_*` block and uses *du*, matching its neighbours.

## 3. Flagged — these want a person, not another agent

**F1 · `posset_goods_preset_free` — "Avgiftsfri" is an umbrella, and both translations narrow it.**
Norwegian VAT law separates *unntatt* (outside the Act, mval ch. 3) from *fritatt* / zero-rated
(mval ch. 6). *Avgiftsfri* is colloquial and spans both. The preset writes a **0 % rate** into all
three fields, which is ch.-6-shaped, so `Zero-rated` / `Nullsatz` is the closer reading — but it is a
reading, and it is printed on a button that configures tax. **A Norwegian tax-literate person should
confirm, or the label should be neutralised to state only the rate** (`0 % VAT · 0/0/0`).

**F2 · The presets are Norway's rates whatever language the operator reads.** `15/25/15` is
næringsmidler-vs-servering; `posset_goods_seed` seeds the Norway default groups (the component says
so in its own comment). Nothing in any of the three labels says "Norwegian", and **nothing was added
saying so** — that would be a claim the source does not make. It is a market question, not a
translation one, and it is recorded here rather than decided.

**F3 · `råfelter` → `Rohfelder`.** A calque. Unambiguous in context (the link reveals the raw VAT-%
selects) but not idiomatic German. Meaning is safe; wording is a copy-editor's call.

## 4. Why none of the nineteen is deliberately Norwegian-only

The brief requires this be argued per key rather than waved through, and the honest answer is that
**no key qualifies**. The test is whether the sentence names something that has no meaningful
non-Norwegian rendering:

- **None of the 19 names a statute, forskrift or `§`** — read one by one off the table above.
  (The statutory string this estate does argue over, `wfpl_identity_gap` / bokføringsforskriften
  § 8-5-6, is a different lane's and is untouched here.) **C6 is therefore not engaged by anything
  added: no sentence written here claims a document.** The nearest thing
  to a statutory reference is `SAF-T`, which is a file format, already appears in `en.ts`/`de.ts`,
  and has a producer in-tree (`_saftService.Export`, `pages/admin/pos-reports.vue:381`).
- **The Norway-specific content is numeric** (`15/25/15`, `25/25/25`, `0/0/0`) and passes through
  every locale unchanged, so no rate is restated or converted.
- **The one term with a genuine legal edge is `Avgiftsfri`**, and it is flagged as F1 rather than
  exempted — an exemption would have hidden the decision instead of surfacing it.

A blanket "these are Norwegian tax strings, leave them" would have been the easy answer and would
have left a German operator reading a repricing warning in Norwegian.

## 5. Proof that it renders — not just that a key exists

`test/vat-goods-group-locales.test.js` (in the lane worktree), **20 tests, all green** —
`proof-green.txt`.

It drives the **real** components through the **real** resolver: `$i` is
`(key, params) => translate(locale, key, params)` from `~/utils/i18n`, not a stub bound to one
dictionary. A stub cannot tell a translated string from a fallen-back one, which is the whole defect.

- Six of the twenty are the **prefix parity block** for `posset_` and `products_`, written in the
  same shape as the estate's existing `mrg_` and `ev_` guards — see §8 for why that matters more
  than the nineteen individual strings.
- `GoodsGroupsTab.vue` is **fully mounted** in `no`, `en` and `de`, the editor opened with a complete
  profile, and the text read back off the DOM. Each foreign locale asserts both what it *does* say
  and that eight specific Norwegian strings are **absent** from the surface.
- The incomplete-profile refusal is driven into its state (two of three rates set) and read from
  `.gg-profile__warn`; the seeding confirmation is read from the emitted `notify` payload.
- **`pages/admin/products.vue` cannot be imported under this repo's vue-jest** — its template uses
  optional chaining (`product.image?.imageUrl`), which `vue-template-es2015-compiler`'s buble parser
  rejects, so the SFC fails to transform. Pre-existing and unrelated to VAT; it is why no test in the
  repo mounts that page. So the goods-group block is **sliced out of the page file verbatim at test
  time** and compiled with Vue's runtime compiler. Nothing is retyped; if the markup moves, the slice
  moves with it, and if the slice stops being findable the test throws rather than passing vacuously.
  Its `v-if` computeds are supplied by the harness — **that branch's condition is not what this lane
  proves**; the three `$i` calls, their parameters and their rendered output are.
- The interpolated note is asserted rendered, not raw: `15 % zum Mitnehmen · 25 % vor Ort · 15 %
  Lieferung`, with the rates coming from a group object — so `{takeaway}`, `{eatin}` and `{delivery}`
  are proven to have survived translation in all three locales.

**Mutation proof — `proof-red-at-baseline.txt`.** The same suite, with `en.ts` and `de.ts` reverted
to `e34977ac`: **16 of 20 fail**. The four that still pass are the two Norwegian render tests and the
two prefix-size checks, which is correct — they were never broken. A suite that cannot go red on the
defect is not evidence.

**Suite-wide:** `npx jest --coverage=false` in the lane worktree → **112 of 113 suites pass,
2601 of 2603 tests**. The one failure is `test/journey-artifact-store.test.js`, which pins the
checkout basename to `/^Web-modules@/` and fails in any worktree not named `Web-modules`.
**Proven pre-existing**: with this lane's three files stashed, the same two tests still fail.
It is the subject of `L-WORKTREE-BASENAME-PIN` / `L-WORKTREE-BASENAME-TAX`.

**And this is still not acceptance (C5).** A green suite is not a person reading a screen. The
journey a person should walk: sign in, set the admin locale to English or German, **POS settings →
Warengruppen / Goods groups → edit a group → set all three rates** — the repricing warning appears
under the rate selects — then **Products → a product in a profiled group**, where the VAT note and
the *Show raw fields* link sit under the goods-group picker.

## 6. Not fixed, and adjacent — `posset_goods_hint` is stale rather than missing

Same screen, one line above the block this lane touched:

| | |
|---|---|
| `no` | Varegrupper brukes til SAF-T-gruppering **og styrer MVA**. Åpen-pris-linjer krever en varegruppe. |
| `en` | Goods groups are used for SAF-T grouping. Open-price lines require a goods group. |
| `de` | Warengruppen werden für die SAF-T-Gruppierung verwendet. Zeilen mit offenem Preis erfordern eine Warengruppe. |

The Norwegian gained **"og styrer MVA"** — *and drive VAT* — when the profiles landed; `en` and `de`
did not. **This is worse than the fallback case**, because a present-but-stale key produces no visual
tell at all: the English operator is simply told goods groups are for SAF-T grouping, and is never
told they set the tax on his products.

**Deliberately not changed here.** The key is present in all three locales, so it is outside this
lane's criteria ("present in `no.ts` and absent from `en.ts` and `de.ts`"), and rewriting an already
authored sentence is the class of edit the brief fenced off. **No claimant rewords it either** — the
same 120-ref scan run for this one key returns zero divergent holders, so whoever fixes it is not
racing anyone. **It needs its own decision.**

## 7. Not fixed, and out of scope — the remaining 16

The gap is now 16, all `index_specialDays_*`, rendering on the admin dashboard's opening-hours block
(`pages/admin/index.vue:179-248`, plus two toasts at `:607/:610/:622/:625`). They degrade by the same
mechanism — a German operator adding a special opening day reads *Spesielle dager*, *Velg dager*,
*Kunne ikke lagre spesiell dag*. **They are not VAT-facing, so this lane's exit criteria do not reach
them, and nothing was written for them.** They are the natural second half of the same fix.

## 8. Why a 35-key hole survived this long — the guard exists, these prefixes were never enrolled

**The estate already tests exactly this, prefix by prefix.** `margin-cost-preview.test.js:410`
asserts `no`, `en` and `de` carry the same `mrg_` key set; `events-surface.test.js:569` does it for
`ev_`; `growth-guest-pages.test.js` for `gr_guest_`; `meals-claim-page.test.js` for `meals_claim_`.
**No one wrote one for `posset_`, `products_` or `index_`** — which is precisely where the 35 keys
are — so a partial addition was invisible to every green run. 37 suites import a dictionary and none
of them compared these blocks.

**And the one locale-aware test that does cover this screen is blind to this failure mode by
construction.** `admin-nav-access.test.js` mounts the sidebar against all three dictionaries and
fails any label that still looks like `nav_…` — the *fourth* fallback, where no dictionary has the
key at all. **A key that falls back to Norwegian yields a Norwegian label, which does not start with
`nav_`, so that test passes on this defect.** Only the key-set comparison catches it. Separately, no
test in the repo sets `adminLocale` to `en` or `de` (grepped, zero hits); the locale-aware ones pass
a dictionary in directly.

The new suite **enrols `posset_` and `products_`** in the house pattern — same shape as the `mrg_`
and `ev_` blocks — so these nineteen cannot silently regress and any future key added to one locale
of those surfaces goes red. **`index_` is deliberately not enrolled**: it would be red on arrival
because of the 16 in §7, and a knowingly-red test is not a guard. Enrolling it is the second half of
that fix. A parity guard over all 4,817 keys at once is a bigger call and is not this lane's to make.

## Reproduce

```
git -C /Users/svendaneel/okam/Web-modules worktree add -b lane/vat-keys-monolingual \
    /Users/svendaneel/okam/web-vatkeys e34977a
cd /Users/svendaneel/okam/web-vatkeys
ln -s /Users/svendaneel/okam/Web-modules/node_modules node_modules
git -c protocol.file.allow=always submodule update --init core

# the census, against the blobs rather than the dirty checkout
git cat-file -p "e34977a:translations/no.ts" | python3 <lane>/parse.py

# the render proof, and the same suite against the baseline dictionaries
npx jest test/vat-goods-group-locales.test.js --coverage=false
git checkout e34977a -- translations/en.ts translations/de.ts && \
  npx jest test/vat-goods-group-locales.test.js --coverage=false   # must go RED
```

## Files

| path | what |
|---|---|
| `parse.py` | the dictionary parser; reports unparsed lines rather than dropping them |
| `gap-census.txt` | key counts and the gap, before (`e34977ac` blobs) and after |
| `rival-scan.txt` | 120 refs + working tree: the 19 keys have no second author |
| `proof-green.txt` | 14/14 in the lane worktree |
| `proof-red-at-baseline.txt` | the same suite at baseline: 12/14 red |

**Committed at `686e3c5f7babe27c90b7d47b172271f7758b8f2f`** on `lane/vat-keys-monolingual`, parent
`e34977ac`, in `/Users/svendaneel/okam/web-vatkeys`. **Not pushed**; `feature/restaurant-modules` is
untouched and still at `e34977ac`.

Three files, staged by explicit pathspec: `translations/en.ts`, `translations/de.ts`,
`test/vat-goods-group-locales.test.js` — **358 insertions, 0 deletions, no line of either dictionary
modified in place.** The worktree was cut fresh from `e34977ac` and never carried the shared
checkout's uncommitted work, so those three files were the *only* thing dirty in it and there was
nothing of anyone else's to sweep in. The shared checkout's ` M` on all three dictionaries is
other lanes' and was left exactly as found.
